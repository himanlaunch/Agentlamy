import chalk from 'chalk';

/**
 * Format and print audit results to the terminal.
 */
export function printReport(report, options = {}) {
  const { verbose = false } = options;

  console.log('');
  printHeader(report);
  console.log('');
  printCategoryBreakdown(report);
  console.log('');
  printFindings(report, verbose);
  console.log('');
  printFooter(report);
  console.log('');
}

function printHeader(report) {
  const gradeColors = {
    A: chalk.green,
    B: chalk.greenBright,
    C: chalk.yellow,
    D: chalk.hex('#FFA500'),
    F: chalk.red,
  };

  const gradeColor = gradeColors[report.grade] || chalk.white;
  const bar = progressBar(report.percentage, 40);

  console.log(chalk.bold('  AEO Audit Report'));
  console.log(chalk.dim('  Agentic Engine Optimization Score'));
  console.log('');
  console.log(`  ${bar}  ${gradeColor.bold(report.grade)} ${chalk.dim(`${report.score}/${report.maxScore}`)} ${chalk.dim(`(${report.percentage}%)`)}`);
}

function printCategoryBreakdown(report) {
  console.log(chalk.bold('  Category Breakdown'));
  console.log('');

  for (const [, cat] of Object.entries(report.categories)) {
    const bar = progressBar(cat.percentage, 20);
    const statusIcon = cat.percentage >= 75 ? chalk.green('✓') : cat.percentage >= 50 ? chalk.yellow('◑') : chalk.red('✗');

    console.log(`  ${statusIcon} ${cat.name.padEnd(22)} ${bar} ${String(cat.score).padStart(3)}/${cat.maxScore} ${chalk.dim(`(${cat.percentage}%)`)}`);
  }
}

function printFindings(report, verbose) {
  const { errors, warnings } = report.findings;

  if (errors.length > 0) {
    console.log(chalk.red.bold(`  Errors (${errors.length})`));
    console.log('');
    for (const f of errors) {
      console.log(`  ${chalk.red('✗')} ${chalk.dim(`[${f.checkerName}]`)} ${f.message}`);
      if (f.fix) {
        console.log(chalk.dim(`    Fix: ${f.fix.split('\n')[0]}`));
      }
    }
    console.log('');
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow.bold(`  Warnings (${warnings.length})`));
    console.log('');
    for (const f of warnings) {
      console.log(`  ${chalk.yellow('△')} ${chalk.dim(`[${f.checkerName}]`)} ${f.message}`);
      if (verbose && f.fix) {
        console.log(chalk.dim(`    Fix: ${f.fix.split('\n')[0]}`));
      }
    }
    console.log('');
  }

  if (verbose && report.findings.infos.length > 0) {
    console.log(chalk.blue.bold(`  Info (${report.findings.infos.length})`));
    console.log('');
    for (const f of report.findings.infos) {
      console.log(`  ${chalk.blue('ℹ')} ${chalk.dim(`[${f.checkerName}]`)} ${f.message}`);
    }
    console.log('');
  }
}

function printFooter(report) {
  const { passed, warned, failed } = report.summary;

  console.log(
    chalk.dim('  ') +
    chalk.green(`${passed} passed`) + chalk.dim(' · ') +
    chalk.yellow(`${warned} warnings`) + chalk.dim(' · ') +
    chalk.red(`${failed} failed`) + chalk.dim(' · ') +
    chalk.dim(`${passed + warned + failed} checks total`)
  );
  console.log('');
  console.log(chalk.dim('  Run with --verbose for full details, or --json for CI output.'));
}

/**
 * Format a simple ASCII progress bar.
 */
function progressBar(percentage, width) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  const color = percentage >= 75 ? chalk.green : percentage >= 50 ? chalk.yellow : chalk.red;

  return color('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
}

/**
 * Format audit results as JSON.
 */
export function formatJson(report) {
  return JSON.stringify(report, null, 2);
}

/**
 * Print a compact score line for CI usage.
 */
export function printScore(report) {
  const gradeEmoji = { A: '🟢', B: '🟡', C: '🟠', D: '🔴', F: '⛔' };
  console.log(`AEO Score: ${report.grade} (${report.percentage}%) ${report.score}/${report.maxScore}`);
}
