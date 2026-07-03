import { checkers, categories } from './checkers/index.js';

/**
 * Run all AEO checks against a given context.
 *
 * @param {object} context - { dir, projectDir, url, config }
 * @param {object} options - { checkerIds, onProgress }
 * @returns {object} Full audit result
 */
export async function runAudit(context, options = {}) {
  const { checkerIds, onProgress } = options;

  // Filter checkers if specific IDs requested
  const activeCheckers = checkerIds
    ? checkers.filter((c) => checkerIds.includes(c.meta.id))
    : checkers;

  const results = [];
  let completed = 0;

  for (const checker of activeCheckers) {
    if (onProgress) {
      onProgress({
        phase: 'checking',
        checker: checker.meta.name,
        current: completed,
        total: activeCheckers.length,
      });
    }

    try {
      const result = await checker.check(context);
      results.push(result);
    } catch (err) {
      results.push({
        id: checker.meta.id,
        name: checker.meta.name,
        category: checker.meta.category,
        score: 0,
        maxScore: checker.meta.maxScore,
        status: 'error',
        findings: [
          {
            severity: 'error',
            message: `Checker failed: ${err.message}`,
          },
        ],
      });
    }

    completed++;
  }

  return buildReport(results);
}

/**
 * Build a structured report from checker results.
 */
function buildReport(results) {
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const maxScore = results.reduce((sum, r) => sum + r.maxScore, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  // Calculate category scores
  const categoryScores = {};
  for (const [key, cat] of Object.entries(categories)) {
    const catResults = results.filter((r) => r.category === key);
    const catScore = catResults.reduce((sum, r) => sum + r.score, 0);
    const catMax = catResults.reduce((sum, r) => sum + r.maxScore, 0);
    categoryScores[key] = {
      name: cat.name,
      description: cat.description,
      score: catScore,
      maxScore: catMax,
      percentage: catMax > 0 ? Math.round((catScore / catMax) * 100) : 0,
      results: catResults,
    };
  }

  // Determine grade
  const grade = getGrade(percentage);

  // Collect all findings by severity
  const allFindings = results.flatMap((r) =>
    r.findings.map((f) => ({ ...f, checker: r.id, checkerName: r.name }))
  );

  const errors = allFindings.filter((f) => f.severity === 'error');
  const warnings = allFindings.filter((f) => f.severity === 'warning');
  const infos = allFindings.filter((f) => f.severity === 'info');

  return {
    score: totalScore,
    maxScore,
    percentage,
    grade,
    categories: categoryScores,
    results,
    summary: {
      errors: errors.length,
      warnings: warnings.length,
      infos: infos.length,
      passed: results.filter((r) => r.status === 'pass').length,
      warned: results.filter((r) => r.status === 'warn').length,
      failed: results.filter((r) => r.status === 'fail').length,
      errored: results.filter((r) => r.status === 'error').length,
    },
    findings: { errors, warnings, infos },
  };
}

/**
 * Convert a percentage score to a letter grade.
 */
function getGrade(percentage) {
  if (percentage >= 90) return 'A';
  if (percentage >= 75) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}
