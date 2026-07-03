import { finding, checkerResult } from '../utils.js';

const ID = 'sitemap-discovery';
const NAME = 'Sitemap Discovery';
const CATEGORY = 'discovery';
const MAX_SCORE = 7;

export async function check(context) {
  const findings = [];
  let score = 0;
  const sitemap = context.resources?.['sitemap.xml'];
  const pageCount = context.pages?.length || 0;
  const sitemapCount = context.crawlSummary?.sitemapUrlsDiscovered || 0;

  if (!sitemap?.content) {
    findings.push(
      finding('warning', 'No sitemap.xml discovered at the site root.',
        'Publish a sitemap.xml that covers the key documentation pages so agents can discover content without relying on navigation.')
    );
    return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, 'warn', findings);
  }

  score += 3;
  findings.push(finding('info', `sitemap.xml found with ${sitemapCount} URL(s) discovered.`));

  if (sitemapCount >= Math.max(pageCount, 3)) {
    score += 2;
    findings.push(finding('info', 'Sitemap coverage is strong relative to the crawled page set.'));
  } else {
    findings.push(
      finding('warning', 'Sitemap coverage looks thin compared with the crawled documentation pages.',
        'Expand sitemap.xml so it includes the main docs, guides, API references, and onboarding pages.')
    );
  }

  if ((context.crawlSummary?.missedImportantPages?.length || 0) === 0) {
    score += 2;
    findings.push(finding('info', 'No high-priority documentation pages were missed during crawl.'));
  } else {
    findings.push(
      finding('warning', `Some likely-important pages were not fetched: ${context.crawlSummary.missedImportantPages.slice(0, 5).join(', ')}`,
        'Link these pages from the root docs, sitemap.xml, or llms.txt so agent crawlers can reach them more reliably.')
    );
  }

  const status = score >= 5 ? 'pass' : score >= 3 ? 'warn' : 'fail';
  return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, status, findings);
}

export const meta = { id: ID, name: NAME, category: CATEGORY, maxScore: MAX_SCORE };
