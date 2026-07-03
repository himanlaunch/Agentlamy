import { finding, checkerResult } from '../utils.js';

const ID = 'crawl-depth-summary';
const NAME = 'Crawl Depth Summary';
const CATEGORY = 'content-structure';
const MAX_SCORE = 5;

export async function check(context) {
  const findings = [];
  let score = 0;
  const summary = context.crawlSummary;

  if (!summary) {
    findings.push(finding('warning', 'No crawl summary available.'));
    return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, 'warn', findings);
  }

  findings.push(finding('info', `Fetched ${summary.pagesFetched} page(s) with a budget of ${summary.pageBudget}.`));

  if (summary.pagesFetched >= Math.min(summary.pageBudget, 5)) {
    score += 2;
  } else {
    findings.push(
      finding('warning', 'The crawl reached only a small number of pages.',
        'Expose more documentation links from the root page, llms.txt, or sitemap.xml.')
    );
  }

  if ((summary.fetchErrors?.length || 0) === 0) {
    score += 1;
    findings.push(finding('info', 'No crawl fetch errors were recorded.'));
  } else {
    findings.push(
      finding('warning', `${summary.fetchErrors.length} crawl fetch error(s) occurred.`,
        'Check for 4xx/5xx responses, bot mitigation, or redirects that block agents from documentation pages.')
    );
  }

  if ((summary.missedImportantPages?.length || 0) === 0) {
    score += 2;
  } else {
    findings.push(
      finding('warning', `Potentially relevant pages were missed: ${summary.missedImportantPages.slice(0, 5).join(', ')}`,
        'Make these pages reachable from discovery surfaces like the root docs page, llms.txt, or sitemap.xml.')
    );
  }

  const status = score >= 4 ? 'pass' : score >= 2 ? 'warn' : 'fail';
  return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, status, findings);
}

export const meta = { id: ID, name: NAME, category: CATEGORY, maxScore: MAX_SCORE };
