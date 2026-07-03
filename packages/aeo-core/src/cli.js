import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { resolve } from 'node:path';
import ora from 'ora';
import chalk from 'chalk';
import { runAudit } from './runner.js';
import { printReport, formatJson, printScore } from './reporter.js';
import { findOutputDir, detectFramework } from './detector.js';
import { startServer } from './server.js';
import { loadConfig } from './utils.js';
import { scaffold } from './scaffolder.js';
import { auditLiveSite } from './index.js';

export async function run(argv) {
  const cli = yargs(argv)
    .scriptName('agentic-seo')
    .usage('$0 [dir]', 'Audit a site for Agentic Engine Optimization', (yargs) => {
      yargs.positional('dir', {
        describe: 'Directory to audit (auto-detects framework and build output)',
        type: 'string',
        default: '.',
      });
    })
    .command('init [dir]', 'Scaffold missing AEO files (llms.txt, AGENTS.md, skill.md)', (yargs) => {
      yargs.positional('dir', {
        describe: 'Directory to scaffold into',
        type: 'string',
        default: '.',
      });
    })
    .command('score [dir]', 'Print just the score (for CI)', (yargs) => {
      yargs.positional('dir', {
        describe: 'Directory to audit',
        type: 'string',
        default: '.',
      });
    })
    .option('url', {
      alias: 'u',
      describe: 'Audit a live URL instead of a local directory',
      type: 'string',
    })
    .option('serve', {
      alias: 's',
      describe: 'Start a local server and audit via HTTP',
      type: 'boolean',
      default: false,
    })
    .option('json', {
      describe: 'Output results as JSON',
      type: 'boolean',
      default: false,
    })
    .option('verbose', {
      alias: 'v',
      describe: 'Show all findings including info messages',
      type: 'boolean',
      default: false,
    })
    .option('threshold', {
      alias: 't',
      describe: 'Minimum score percentage to pass (exit code 1 if below)',
      type: 'number',
    })
    .option('checks', {
      describe: 'Comma-separated list of checker IDs to run',
      type: 'string',
    })
    .option('output-dir', {
      describe: 'Explicitly specify the build output directory',
      type: 'string',
    })
    .example('$0', 'Audit current directory')
    .example('$0 ./my-docs-site', 'Audit a specific directory')
    .example('$0 --url https://docs.example.com', 'Audit a live URL')
    .example('$0 --serve ./build', 'Start server and audit')
    .example('$0 --json --threshold 60', 'CI mode with minimum score')
    .example('$0 init', 'Create missing AEO files')
    .example('$0 score', 'Quick score check')
    .help()
    .version()
    .parse();

  const command = cli._[0];

  try {
    if (command === 'init') {
      await handleInit(cli);
    } else if (command === 'score') {
      await handleScore(cli);
    } else {
      await handleAudit(cli);
    }
  } catch (err) {
    if (!cli.json) {
      console.error(chalk.red(`\n  Error: ${err.message}\n`));
    } else {
      console.log(JSON.stringify({ error: err.message }));
    }
    process.exit(2);
  }
}

async function handleAudit(cli) {
  const dir = resolve(cli.dir || '.');
  const config = await loadConfig(dir);
  const isJson = cli.json;

  let spinner;
  if (!isJson) {
    spinner = ora('Detecting framework...').start();
  }

  // Determine the directory to audit
  let auditDir;
  let frameworkName;

  if (cli.url) {
    if (spinner) spinner = ora('Running AEO checks...').start();
    const report = await auditLiveSite(cli.url, {
      checks: cli.checks?.split(','),
      pageBudget: config.pageBudget || 20,
      onProgress: spinner ? (p) => { spinner.text = `Checking: ${p.checker}`; } : undefined,
    });

    if (spinner) spinner.stop();
    outputResults(report, cli);
    return;
  }

  if (cli.outputDir) {
    auditDir = resolve(cli.outputDir);
    frameworkName = 'Custom';
  } else {
    const detection = await findOutputDir(dir);
    frameworkName = detection.framework;
    auditDir = detection.dir;

    if (!auditDir) {
      // Maybe the directory itself is the site
      auditDir = dir;
      if (spinner) {
        spinner.warn(
          frameworkName
            ? `Detected ${frameworkName} but no build output found. Auditing project directory directly.`
            : 'No framework detected. Auditing directory directly.'
        );
      }
    } else if (spinner) {
      spinner.succeed(
        frameworkName
          ? `Detected ${chalk.bold(frameworkName)} → ${chalk.dim(auditDir)}`
          : `Auditing ${chalk.dim(auditDir)}`
      );
    }
  }

  // Serve mode
  let server;
  if (cli.serve) {
    if (!isJson) {
      spinner = ora('Starting local server...').start();
    }
    server = await startServer(auditDir);
    if (spinner) spinner.succeed(`Server running at ${chalk.cyan(server.url)}`);
  }

  // Build context
  const context = {
    dir: auditDir,
    projectDir: dir,
    url: server?.url || null,
    config: { ...config, ...cli },
  };

  if (!isJson) {
    spinner = ora('Running AEO checks...').start();
  }

  const report = await runAudit(context, {
    checkerIds: cli.checks?.split(','),
    onProgress: spinner ? (p) => { spinner.text = `Checking: ${p.checker} (${p.current + 1}/${p.total})`; } : undefined,
  });

  if (spinner) spinner.stop();

  // Cleanup server
  if (server) {
    await server.close();
  }

  outputResults(report, cli);
}

async function handleInit(cli) {
  const dir = resolve(cli.dir || '.');
  const spinner = ora('Scaffolding AEO files...').start();

  const created = await scaffold(dir);

  spinner.stop();

  if (created.length === 0) {
    console.log(chalk.green('\n  All AEO files already exist. Nothing to create.\n'));
  } else {
    console.log(chalk.green(`\n  Created ${created.length} file(s):\n`));
    for (const file of created) {
      console.log(`  ${chalk.green('+')} ${file}`);
    }
    console.log('');
    console.log(chalk.dim('  Edit these files to match your project. Then run agentic-seo to check your score.\n'));
  }
}

async function handleScore(cli) {
  const dir = resolve(cli.dir || '.');
  const config = await loadConfig(dir);
  const detection = await findOutputDir(dir);
  const auditDir = detection.dir || dir;

  const context = {
    dir: auditDir,
    projectDir: dir,
    url: cli.url || null,
    config,
  };

  const report = await runAudit(context, {
    checkerIds: cli.checks?.split(','),
  });

  if (cli.json) {
    console.log(JSON.stringify({ score: report.score, maxScore: report.maxScore, percentage: report.percentage, grade: report.grade }));
  } else {
    printScore(report);
  }

  if (cli.threshold && report.percentage < cli.threshold) {
    process.exit(1);
  }
}

function outputResults(report, cli) {
  if (cli.json) {
    console.log(formatJson(report));
  } else {
    printReport(report, { verbose: cli.verbose });
  }

  if (cli.threshold && report.percentage < cli.threshold) {
    if (!cli.json) {
      console.log(chalk.red(`  Score ${report.percentage}% is below threshold ${cli.threshold}%\n`));
    }
    process.exit(1);
  }
}
