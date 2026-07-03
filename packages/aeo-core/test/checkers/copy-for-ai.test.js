import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../../src/checkers/copy-for-ai.js';
import { join } from 'node:path';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

describe('copy-for-ai checker', () => {
  it('should score well for good-site with copy buttons', async () => {
    const result = await check({ dir: join(FIXTURES, 'good-site'), projectDir: join(FIXTURES, 'good-site') });
    assert.equal(result.id, 'copy-for-ai');
    assert.ok(result.score >= 4, `Expected score >= 4, got ${result.score}`);
  });

  it('should score poorly for bad-site without copy buttons', async () => {
    const result = await check({ dir: join(FIXTURES, 'bad-site'), projectDir: join(FIXTURES, 'bad-site') });
    assert.ok(result.score <= 3, `Expected score <= 3, got ${result.score}`);
  });
});
