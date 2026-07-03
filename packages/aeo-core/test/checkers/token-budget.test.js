import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../../src/checkers/token-budget.js';
import { join } from 'node:path';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

describe('token-budget checker', () => {
  it('should pass for good-site with small pages', async () => {
    const result = await check({ dir: join(FIXTURES, 'good-site'), projectDir: join(FIXTURES, 'good-site') });
    assert.equal(result.id, 'token-budget');
    assert.equal(result.category, 'token-economics');
    assert.ok(result.score >= 10, `Expected score >= 10, got ${result.score}`);
  });

  it('should analyze bad-site pages', async () => {
    const result = await check({ dir: join(FIXTURES, 'bad-site'), projectDir: join(FIXTURES, 'bad-site') });
    assert.ok(result.score >= 0);
    assert.ok(result.findings.length > 0, 'Should have findings');
  });

  it('should handle empty directory gracefully', async () => {
    const result = await check({ dir: '/tmp/nonexistent-aeo-test', projectDir: '/tmp/nonexistent-aeo-test' });
    assert.equal(result.status, 'warn');
  });
});
