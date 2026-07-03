import { readFileSafe, getHtmlFiles, getMarkdownFiles, getContentDir, stripHtml, relativePath, finding, checkerResult, getScannedPages } from '../utils.js';
import { countTokens, classifyTokenCount, TOKEN_THRESHOLDS } from '../tokenizer.js';

const ID = 'token-budget';
const NAME = 'Token Budget Analysis';
const CATEGORY = 'token-economics';
const MAX_SCORE = 15;

/**
 * Analyze token counts across all documentation pages.
 *
 * Scoring:
 * - Average page under 25K tokens: +5
 * - No page over 50K tokens: +4
 * - 80%+ pages under 30K tokens: +3
 * - Provides per-page analysis: +3
 */
export async function check(context) {
  const findings_list = [];
  let score = 0;
  const crawledPages = getScannedPages(context);

  if (crawledPages.length > 0) {
    const pageStats = crawledPages.map((page) => ({
      path: page.path || page.url,
      tokens: page.tokenCount,
      classification: page.tokenClassification?.level || classifyTokenCount(page.tokenCount).level,
    }));
    return scorePages(pageStats, findings_list, score);
  }

  const scanDir = getContentDir(context);
  if (!scanDir) {
    findings_list.push(finding('warning', 'No local directory available to analyze token counts.'));
    return checkerResult(ID, NAME, CATEGORY, 0, MAX_SCORE, 'warn', findings_list);
  }

  const htmlFiles = await getHtmlFiles(scanDir);
  const mdFiles = await getMarkdownFiles(scanDir);
  const allFiles = [...htmlFiles, ...mdFiles];

  if (allFiles.length === 0) {
    findings_list.push(finding('warning', 'No HTML or Markdown files found to analyze.'));
    return checkerResult(ID, NAME, CATEGORY, 0, MAX_SCORE, 'warn', findings_list);
  }

  const pageStats = [];
  let totalTokens = 0;
  let oversizedPages = 0;
  let criticalPages = 0;

  // Analyze up to 100 pages (sample for large sites)
  const sampled = allFiles.slice(0, 100);

  for (const file of sampled) {
    const content = await readFileSafe(file);
    if (!content) continue;

    const isHtml = file.endsWith('.html') || file.endsWith('.htm');
    const text = isHtml ? stripHtml(content) : content;
    const tokens = countTokens(text);
    const classification = classifyTokenCount(tokens);

    pageStats.push({
      path: relativePath(scanDir, file),
      tokens,
      classification: classification.level,
    });

    totalTokens += tokens;

    if (tokens > TOKEN_THRESHOLDS.general) oversizedPages++;
    if (tokens > TOKEN_THRESHOLDS.critical) criticalPages++;
  }

  return scorePages(pageStats, findings_list, score, totalTokens);
}

function scorePages(pageStats, findings_list, score = 0, explicitTotalTokens = null) {
  const totalTokens = explicitTotalTokens ?? pageStats.reduce((sum, page) => sum + page.tokens, 0);
  const avgTokens = Math.round(totalTokens / pageStats.length);
  const pagesUnder30K = pageStats.filter((p) => p.tokens <= TOKEN_THRESHOLDS.general).length;
  const percentUnder30K = Math.round((pagesUnder30K / pageStats.length) * 100);
  const oversizedPages = pageStats.filter((p) => p.tokens > TOKEN_THRESHOLDS.general).length;
  const criticalPages = pageStats.filter((p) => p.tokens > TOKEN_THRESHOLDS.critical).length;

  // Score: average page under 25K
  if (avgTokens <= TOKEN_THRESHOLDS.apiReference) {
    score += 5;
    findings_list.push(finding('info', `Average page size: ${avgTokens.toLocaleString()} tokens (excellent).`));
  } else if (avgTokens <= TOKEN_THRESHOLDS.general) {
    score += 3;
    findings_list.push(finding('warning', `Average page size: ${avgTokens.toLocaleString()} tokens (consider reducing).`));
  } else {
    findings_list.push(
      finding('error', `Average page size: ${avgTokens.toLocaleString()} tokens (too large for most agents).`,
        'Break large pages into smaller, focused topics. Aim for under 25K tokens per page.')
    );
  }

  // Score: no pages over 50K
  if (criticalPages === 0) {
    score += 4;
    findings_list.push(finding('info', 'No pages exceed 50K tokens.'));
  } else {
    const critical = pageStats
      .filter((p) => p.tokens > TOKEN_THRESHOLDS.critical)
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5);
    findings_list.push(
      finding('error',
        `${criticalPages} page(s) exceed 50K tokens and will likely be truncated or skipped by agents.`,
        `Largest pages:\n${critical.map((p) => `  ${p.path}: ${p.tokens.toLocaleString()} tokens`).join('\n')}`)
    );
  }

  // Score: 80%+ pages under 30K
  if (percentUnder30K >= 80) {
    score += 3;
    findings_list.push(finding('info', `${percentUnder30K}% of pages are under 30K tokens.`));
  } else {
    findings_list.push(
      finding('warning', `Only ${percentUnder30K}% of pages are under 30K tokens (target: 80%+).`,
        'Identify and split the largest pages. Use links to connect related content instead of embedding everything.')
    );
  }

  // Provide top oversized pages
  if (oversizedPages > 0) {
    const top = pageStats
      .filter((p) => p.tokens > TOKEN_THRESHOLDS.general)
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 5);
    findings_list.push(
      finding('warning',
        `${oversizedPages} page(s) over 30K tokens:\n${top.map((p) => `  ${p.path}: ${p.tokens.toLocaleString()} tokens`).join('\n')}`)
    );
  }

  // Summary stats
  score += 3; // Base points for having analyzable content
  findings_list.push(
    finding('info', `Analyzed ${pageStats.length} pages. Total: ${totalTokens.toLocaleString()} tokens.`)
  );

  const status = score >= 12 ? 'pass' : score >= 8 ? 'warn' : 'fail';
  return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, status, findings_list);
}

export const meta = { id: ID, name: NAME, category: CATEGORY, maxScore: MAX_SCORE };
