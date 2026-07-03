import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../../src/checkers/robots-txt.js';
import { join } from 'node:path';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

describe('robots-txt checker', () => {
  it('should pass for good-site with AI crawler permissions', async () => {
    const result = await check({ dir: join(FIXTURES, 'good-site'), projectDir: join(FIXTURES, 'good-site') });
    assert.equal(result.id, 'robots-txt');
    assert.equal(result.category, 'discovery');
    assert.ok(result.score >= 7, `Expected score >= 7, got ${result.score}`);
    assert.ok(result.status === 'pass' || result.status === 'warn');
  });

  it('should fail for bad-site that blocks AI crawlers', async () => {
    const result = await check({ dir: join(FIXTURES, 'bad-site'), projectDir: join(FIXTURES, 'bad-site') });
    assert.ok(result.score <= 5, `Expected score <= 5, got ${result.score}`);
    const hasBlockError = result.findings.some((f) => f.severity === 'error');
    assert.ok(hasBlockError, 'Should report blocking as an error');
  });

  it('should warn for site with no robots.txt', async () => {
    const result = await check({ dir: '/tmp/nonexistent-aeo-test', projectDir: '/tmp/nonexistent-aeo-test' });
    assert.equal(result.status, 'warn');
    assert.equal(result.score, 5);
  });

  it('should return correct metadata shape', async () => {
    const result = await check({ dir: join(FIXTURES, 'good-site'), projectDir: join(FIXTURES, 'good-site') });
    assert.ok(typeof result.id === 'string');
    assert.ok(typeof result.name === 'string');
    assert.ok(typeof result.category === 'string');
    assert.ok(typeof result.score === 'number');
    assert.ok(typeof result.maxScore === 'number');
    assert.ok(Array.isArray(result.findings));
    assert.ok(['pass', 'warn', 'fail', 'error'].includes(result.status));
  });
});
