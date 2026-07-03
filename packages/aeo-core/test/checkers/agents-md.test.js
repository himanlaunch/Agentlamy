import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../../src/checkers/agents-md.js';
import { join } from 'node:path';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

describe('agents-md checker', () => {
  it('should pass for good-site with AGENTS.md', async () => {
    const result = await check({ dir: join(FIXTURES, 'good-site'), projectDir: join(FIXTURES, 'good-site') });
    assert.equal(result.id, 'agents-md');
    assert.ok(result.score >= 3, `Expected score >= 3, got ${result.score}`);
  });

  it('should fail for bad-site with no agent files', async () => {
    const result = await check({ dir: join(FIXTURES, 'bad-site'), projectDir: join(FIXTURES, 'bad-site') });
    assert.equal(result.score, 0);
    assert.equal(result.status, 'fail');
  });
});
