import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../../src/checkers/content-structure.js';
import { join } from 'node:path';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

describe('content-structure checker', () => {
  it('should score well for good-site with proper structure', async () => {
    const result = await check({ dir: join(FIXTURES, 'good-site'), projectDir: join(FIXTURES, 'good-site') });
    assert.equal(result.id, 'content-structure');
    assert.equal(result.category, 'content-structure');
    assert.ok(result.score >= 8, `Expected score >= 8, got ${result.score}`);
  });

  it('should score poorly for bad-site with broken hierarchy', async () => {
    const result = await check({ dir: join(FIXTURES, 'bad-site'), projectDir: join(FIXTURES, 'bad-site') });
    assert.ok(result.score <= 8, `Expected score <= 8, got ${result.score}`);
  });
});
