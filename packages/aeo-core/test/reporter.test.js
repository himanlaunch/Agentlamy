import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatJson } from '../src/reporter.js';

describe('reporter', () => {
  it('should format report as valid JSON', () => {
    const report = {
      score: 75,
      maxScore: 100,
      percentage: 75,
      grade: 'B',
      categories: {},
      results: [],
      summary: { errors: 1, warnings: 2, infos: 5, passed: 7, warned: 2, failed: 1, errored: 0 },
      findings: { errors: [], warnings: [], infos: [] },
    };

    const json = formatJson(report);
    const parsed = JSON.parse(json);
    assert.equal(parsed.score, 75);
    assert.equal(parsed.grade, 'B');
    assert.equal(parsed.percentage, 75);
  });

  it('should produce valid JSON even with special characters in findings', () => {
    const report = {
      score: 50,
      maxScore: 100,
      percentage: 50,
      grade: 'C',
      categories: {},
      results: [],
      summary: { errors: 0, warnings: 0, infos: 0, passed: 0, warned: 0, failed: 0, errored: 0 },
      findings: {
        errors: [{ severity: 'error', message: 'Found "quotes" and <tags>' }],
        warnings: [],
        infos: [],
      },
    };

    const json = formatJson(report);
    const parsed = JSON.parse(json);
    assert.ok(parsed.findings.errors[0].message.includes('"quotes"'));
  });
});
