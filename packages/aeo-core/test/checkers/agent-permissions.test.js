import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../../src/checkers/agent-permissions.js';
import { join } from 'node:path';

const FIXTURES = join(import.meta.dirname, '..', 'fixtures');

describe('agent-permissions checker', () => {
  it('should pass for good-site with agent-permissions.json', async () => {
    const result = await check({ dir: join(FIXTURES, 'good-site'), projectDir: join(FIXTURES, 'good-site') });
    assert.equal(result.id, 'agent-permissions');
    assert.ok(result.score >= 3, `Expected score >= 3, got ${result.score}`);
  });

  it('should warn for bad-site without agent-permissions.json', async () => {
    const result = await check({ dir: join(FIXTURES, 'bad-site'), projectDir: join(FIXTURES, 'bad-site') });
    assert.equal(result.status, 'warn');
  });
});
