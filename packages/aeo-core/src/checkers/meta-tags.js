import * as cheerio from 'cheerio';
import { readFileSafe, getHtmlFiles, getContentDir, finding, checkerResult, getScannedPages } from '../utils.js';

const ID = 'meta-tags';
const NAME = 'AI-Friendly Meta Tags';
const CATEGORY = 'token-economics';
const MAX_SCORE = 10;

/**
 * Check for AI/agent-friendly meta tags in HTML pages.
 *
 * Scoring:
 * - Token count in meta tags: +3
 * - Description meta tags present: +2
 * - Page type/category meta tags: +2
 * - Clean title tags (not just brand): +2
 * - Canonical URLs: +1
 */
export async function check(context) {
  const findings_list = [];
  let score = 0;
  const crawledPages = getScannedPages(context).filter((page) => page.contentType.includes('html'));

  if (crawledPages.length > 0) {
    const sampled = crawledPages.slice(0, 20);
    const total = sampled.length;
    const hasTokenMeta = sampled.filter((page) => Boolean(page.meta?.tokenCountMeta)).length;
    const hasDescription = sampled.filter((page) => (page.meta?.description || '').length > 20).length;
    const hasPageType = sampled.filter((page) => Boolean(page.meta?.pageType)).length;
    const hasCleanTitle = sampled.filter((page) => (page.meta?.title || '').length > 5 && (page.meta?.title || '').length < 100).length;
    const hasCanonical = sampled.filter((page) => Boolean(page.meta?.canonical)).length;
    return scoreMetaPages({ sampled, total, hasTokenMeta, hasDescription, hasPageType, hasCleanTitle, hasCanonical, findings_list, score });
  }

  const scanDir = getContentDir(context);
  if (!scanDir) {
    findings_list.push(finding('warning', 'No local directory available to analyze meta tags.'));
    return checkerResult(ID, NAME, CATEGORY, 0, MAX_SCORE, 'warn', findings_list);
  }

  const htmlFiles = await getHtmlFiles(scanDir);
  if (htmlFiles.length === 0) {
    findings_list.push(finding('warning', 'No HTML files found to analyze meta tags.'));
    return checkerResult(ID, NAME, CATEGORY, 0, MAX_SCORE, 'warn', findings_list);
  }

  const sampled = htmlFiles.slice(0, 20);
  let hasTokenMeta = 0;
  let hasDescription = 0;
  let hasPageType = 0;
  let hasCleanTitle = 0;
  let hasCanonical = 0;

  for (const file of sampled) {
    const content = await readFileSafe(file);
    if (!content) continue;

    const $ = cheerio.load(content);

    // Check for token count meta
    const tokenMeta = $('meta[name="token-count"], meta[name="tokens"], meta[name="ai:token-count"], meta[property="ai:tokens"]');
    if (tokenMeta.length > 0) hasTokenMeta++;

    // Check for description
    const desc = $('meta[name="description"]');
    if (desc.length > 0 && desc.attr('content')?.trim().length > 20) {
      hasDescription++;
    }

    // Check for page type/category
    const pageType = $('meta[name="page-type"], meta[name="doc-type"], meta[property="og:type"], meta[name="ai:page-type"]');
    if (pageType.length > 0) hasPageType++;

    // Check for clean title
    const title = $('title').text().trim();
    if (title && title.length > 5 && title.length < 100) hasCleanTitle++;

    // Check for canonical
    const canonical = $('link[rel="canonical"]');
    if (canonical.length > 0) hasCanonical++;
  }

  const total = sampled.length;
  return scoreMetaPages({ sampled, total, hasTokenMeta, hasDescription, hasPageType, hasCleanTitle, hasCanonical, findings_list, score });
}

function scoreMetaPages({ total, hasTokenMeta, hasDescription, hasPageType, hasCleanTitle, hasCanonical, findings_list, score = 0 }) {
  // Token meta tags
  if (hasTokenMeta > 0) {
    score += 3;
    findings_list.push(finding('info', `${hasTokenMeta} of ${total} pages include token count meta tags.`));
  } else {
    findings_list.push(
      finding('warning', 'No pages include token count meta tags.',
        'Add <meta name="ai:token-count" content="12500"> to help agents estimate context cost.\nAlternatively, expose token count as an X-Token-Count HTTP header.')
    );
  }

  // Description meta tags
  if (hasDescription >= total * 0.7) {
    score += 2;
    findings_list.push(finding('info', `${hasDescription} of ${total} pages have meaningful meta descriptions.`));
  } else if (hasDescription > 0) {
    score += 1;
    findings_list.push(
      finding('warning', `Only ${hasDescription} of ${total} pages have meta descriptions.`,
        'Add descriptive meta descriptions to all documentation pages. These help agents understand page content before fetching.')
    );
  } else {
    findings_list.push(
      finding('error', 'No pages have meta description tags.',
        'Add <meta name="description" content="..."> with a clear summary of what each page covers.')
    );
  }

  // Page type meta
  if (hasPageType >= total * 0.5) {
    score += 2;
    findings_list.push(finding('info', `${hasPageType} of ${total} pages have page type metadata.`));
  } else {
    score += hasPageType > 0 ? 1 : 0;
    findings_list.push(
      finding('info', `${hasPageType} of ${total} pages have page type metadata.`,
        'Consider adding <meta name="ai:page-type" content="api-reference|guide|tutorial|quickstart"> to categorize pages for agents.')
    );
  }

  // Clean titles
  if (hasCleanTitle >= total * 0.8) {
    score += 2;
    findings_list.push(finding('info', 'Pages have clean, descriptive title tags.'));
  } else {
    score += 1;
    findings_list.push(
      finding('warning', `${total - hasCleanTitle} pages have missing or poor title tags.`,
        'Ensure every page has a clear, descriptive <title> tag.')
    );
  }

  // Canonical URLs
  if (hasCanonical >= total * 0.5) {
    score += 1;
    findings_list.push(finding('info', `${hasCanonical} of ${total} pages have canonical URLs.`));
  } else {
    findings_list.push(
      finding('info', 'Consider adding canonical URLs to help agents avoid duplicate content.')
    );
  }

  const status = score >= 8 ? 'pass' : score >= 5 ? 'warn' : 'fail';
  return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, status, findings_list);
}

export const meta = { id: ID, name: NAME, category: CATEGORY, maxScore: MAX_SCORE };
