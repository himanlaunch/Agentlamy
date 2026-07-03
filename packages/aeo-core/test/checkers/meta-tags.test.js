import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../../src/checkers/meta-tags.js';
import { join } from 'node:path';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

describe('meta-tags checker', () => {
  it('should score well for good-site with proper meta tags', async () => {
    const result = await check({ dir: join(FIXTURES, 'good-site'), projectDir: join(FIXTURES, 'good-site') });
    assert.equal(result.id, 'meta-tags');
    assert.ok(result.score >= 6, `Expected score >= 6, got ${result.score}`);
  });

  it('should score poorly for bad-site missing meta tags', async () => {
    const result = await check({ dir: join(FIXTURES, 'bad-site'), projectDir: join(FIXTURES, 'bad-site') });
    assert.ok(result.score <= 5, `Expected score <= 5, got ${result.score}`);
  });
});
