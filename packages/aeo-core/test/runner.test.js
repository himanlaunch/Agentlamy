import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runAudit } from '../src/runner.js';
import { checkers } from '../src/checkers/index.js';
import { join } from 'node:path';

const FIXTURES = join(import.meta.dirname, 'fixtures');

describe('runner', () => {
  it('should run all checks and return a complete report for good-site', async () => {
    const context = {
      dir: join(FIXTURES, 'good-site'),
      projectDir: join(FIXTURES, 'good-site'),
      url: null,
      config: {},
    };

    const report = await runAudit(context);

    assert.ok(typeof report.score === 'number');
    assert.ok(typeof report.maxScore === 'number');
    assert.ok(typeof report.percentage === 'number');
    assert.ok(typeof report.grade === 'string');
    assert.ok(report.results.length === checkers.length, `Expected ${checkers.length} results, got ${report.results.length}`);
    assert.ok(report.categories);
    assert.ok(report.summary);
    assert.ok(report.findings);
  });

  it('should score good-site significantly higher than bad-site', async () => {
    const goodReport = await runAudit({
      dir: join(FIXTURES, 'good-site'),
      projectDir: join(FIXTURES, 'good-site'),
      url: null,
      config: {},
    });

    const badReport = await runAudit({
      dir: join(FIXTURES, 'bad-site'),
      projectDir: join(FIXTURES, 'bad-site'),
      url: null,
      config: {},
    });

    assert.ok(
      goodReport.percentage > badReport.percentage + 20,
      `Good site (${goodReport.percentage}%) should score much higher than bad site (${badReport.percentage}%)`
    );
  });

  it('should filter checkers by ID', async () => {
    const context = {
      dir: join(FIXTURES, 'good-site'),
      projectDir: join(FIXTURES, 'good-site'),
      url: null,
      config: {},
    };

    const report = await runAudit(context, { checkerIds: ['robots-txt', 'llms-txt'] });
    assert.equal(report.results.length, 2);
    assert.ok(report.results.every((r) => ['robots-txt', 'llms-txt'].includes(r.id)));
  });

  it('should call onProgress callback', async () => {
    const progress = [];
    const context = {
      dir: join(FIXTURES, 'good-site'),
      projectDir: join(FIXTURES, 'good-site'),
      url: null,
      config: {},
    };

    await runAudit(context, {
      onProgress: (p) => progress.push(p),
    });

    assert.ok(progress.length === checkers.length, `Expected ${checkers.length} progress updates, got ${progress.length}`);
    assert.equal(progress[0].phase, 'checking');
    assert.equal(progress[0].current, 0);
  });

  it('should assign letter grades correctly', async () => {
    const goodReport = await runAudit({
      dir: join(FIXTURES, 'good-site'),
      projectDir: join(FIXTURES, 'good-site'),
      url: null,
      config: {},
    });

    assert.ok(
      ['A', 'B', 'C'].includes(goodReport.grade),
      `Good site should get A, B, or C grade, got ${goodReport.grade}`
    );

    const badReport = await runAudit({
      dir: join(FIXTURES, 'bad-site'),
      projectDir: join(FIXTURES, 'bad-site'),
      url: null,
      config: {},
    });

    assert.ok(
      ['D', 'F'].includes(badReport.grade),
      `Bad site should get D or F grade, got ${badReport.grade}`
    );
  });
});
