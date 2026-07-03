import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../../src/checkers/markdown-availability.js';
import { join } from 'node:path';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

describe('markdown-availability checker', () => {
  it('should pass for good-site with markdown files', async () => {
    const result = await check({ dir: join(FIXTURES, 'good-site'), projectDir: join(FIXTURES, 'good-site') });
    assert.equal(result.id, 'markdown-availability');
    assert.ok(result.score >= 5, `Expected score >= 5, got ${result.score}`);
  });

  it('should warn for bad-site with no markdown', async () => {
    const result = await check({ dir: join(FIXTURES, 'bad-site'), projectDir: join(FIXTURES, 'bad-site') });
    assert.ok(result.score <= 6, `Expected score <= 6, got ${result.score}`);
    // Bad site has no markdown files, should not get full marks
    assert.ok(result.score < 10, `Expected score < 10, got ${result.score}`);
  });
});
