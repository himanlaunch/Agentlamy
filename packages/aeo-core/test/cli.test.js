import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const exec = promisify(execFile);
const BIN = join(import.meta.dirname, '..', 'bin', 'aeo.js');
const FIXTURES = join(import.meta.dirname, 'fixtures');

describe('CLI', () => {
  it('should output JSON when --json flag is used', async () => {
    const { stdout } = await exec('node', [BIN, join(FIXTURES, 'good-site'), '--json']);
    const report = JSON.parse(stdout);
    assert.ok(typeof report.score === 'number');
    assert.ok(typeof report.grade === 'string');
    assert.ok(typeof report.percentage === 'number');
    assert.ok(Array.isArray(report.results));
  });

  it('should exit with code 1 when score is below threshold', async () => {
    try {
      await exec('node', [BIN, join(FIXTURES, 'bad-site'), '--json', '--threshold', '90']);
      assert.fail('Should have exited with code 1');
    } catch (err) {
      assert.equal(err.code, 1);
    }
  });

  it('should run score command', async () => {
    const { stdout } = await exec('node', [BIN, 'score', join(FIXTURES, 'good-site'), '--json']);
    const result = JSON.parse(stdout);
    assert.ok(typeof result.score === 'number');
    assert.ok(typeof result.grade === 'string');
  });

  it('should run init command and create files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aeo-init-'));
    try {
      const { stdout } = await exec('node', [BIN, 'init', dir]);
      assert.ok(stdout.includes('Created') || stdout.includes('created'));
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('should filter checks with --checks flag', async () => {
    const { stdout } = await exec('node', [BIN, join(FIXTURES, 'good-site'), '--json', '--checks', 'robots-txt,llms-txt']);
    const report = JSON.parse(stdout);
    assert.equal(report.results.length, 2);
  });
});
