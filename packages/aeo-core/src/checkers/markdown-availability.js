import { getHtmlFiles, getMarkdownFiles, getContentDir, finding, checkerResult, readFileSafe, getScannedPages } from '../utils.js';
import * as cheerio from 'cheerio';

const ID = 'markdown-availability';
const NAME = 'Markdown Content Availability';
const CATEGORY = 'content-structure';
const MAX_SCORE = 10;

/**
 * Check if documentation is available as clean Markdown.
 *
 * Scoring:
 * - Markdown source files exist alongside HTML: +4
 * - HTML pages have low tag-to-content ratio: +3
 * - Content is accessible without JavaScript rendering: +3
 */
export async function check(context) {
  const findings_list = [];
  let score = 0;
  const crawledPages = getScannedPages(context);

  if (crawledPages.length > 0) {
    const total = crawledPages.length;
    const pagesWithMarkdown = crawledPages.filter((page) => page.markdownAvailable).length;
    const lowNoiseCount = crawledPages.filter((page) => page.tagRatio < 3 || page.contentType.includes('markdown')).length;
    const jsRequiredCount = crawledPages.filter((page) => page.jsRequired).length;

    if (pagesWithMarkdown > 0) {
      const ratio = pagesWithMarkdown / Math.max(total, 1);
      if (ratio >= 0.5) {
        score += 4;
        findings_list.push(finding('info', `${pagesWithMarkdown} Markdown or raw-text alternatives detected across ${total} crawled pages.`));
      } else {
        score += 2;
        findings_list.push(
          finding('warning', `Only ${pagesWithMarkdown} of ${total} crawled pages expose Markdown alternatives.`,
            'Expose Markdown or raw text variants for more documentation pages.')
        );
      }
    } else {
      findings_list.push(
        finding('warning', 'No Markdown alternatives were detected during the crawl.',
          'Serve Markdown versions of documentation pages or add raw-source links that agents can consume efficiently.')
      );
    }

    if (lowNoiseCount / total >= 0.7) {
      score += 3;
      findings_list.push(finding('info', 'Crawled pages have a strong content-to-markup ratio.'));
    } else if (lowNoiseCount / total >= 0.4) {
      score += 1;
      findings_list.push(finding('warning', 'Some crawled pages still carry a lot of markup or template noise.'));
    } else {
      findings_list.push(finding('error', 'Most crawled pages are high-noise HTML without low-overhead alternatives.'));
    }

    if (jsRequiredCount === 0) {
      score += 3;
      findings_list.push(finding('info', 'Crawled pages appear accessible without JavaScript rendering.'));
    } else {
      findings_list.push(
        finding('error', `${jsRequiredCount} crawled page(s) appear JS-dependent.`,
          'Ensure key documentation pages render fully in the initial HTML response.')
      );
    }

    const status = score >= 8 ? 'pass' : score >= 5 ? 'warn' : 'fail';
    return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, status, findings_list);
  }

  const scanDir = getContentDir(context);
  if (!scanDir) {
    findings_list.push(finding('warning', 'No local directory available to analyze Markdown availability.'));
    return checkerResult(ID, NAME, CATEGORY, 0, MAX_SCORE, 'warn', findings_list);
  }

  const htmlFiles = await getHtmlFiles(scanDir);
  const mdFiles = await getMarkdownFiles(scanDir);

  // Check for Markdown source availability
  if (mdFiles.length > 0) {
    const ratio = mdFiles.length / Math.max(htmlFiles.length, 1);
    if (ratio >= 0.5) {
      score += 4;
      findings_list.push(
        finding('info', `${mdFiles.length} Markdown files available alongside ${htmlFiles.length} HTML files.`)
      );
    } else {
      score += 2;
      findings_list.push(
        finding('warning',
          `Only ${mdFiles.length} Markdown files for ${htmlFiles.length} HTML pages.`,
          'Make Markdown source available for documentation pages. Agents process Markdown with dramatically lower token overhead than HTML.')
      );
    }
  } else if (htmlFiles.length > 0) {
    findings_list.push(
      finding('warning', 'No Markdown files found. Only HTML is available.',
        'Serve Markdown versions of documentation pages. Many static site generators can output .md files alongside .html.\nConsider adding a ?format=md query parameter or .md URL suffix support.')
    );
  } else {
    findings_list.push(finding('warning', 'No HTML or Markdown files found.'));
    return checkerResult(ID, NAME, CATEGORY, 0, MAX_SCORE, 'warn', findings_list);
  }

  // Sample HTML pages for content quality
  const sampled = htmlFiles.slice(0, 15);
  let lowNoiseCount = 0;
  let jsRequiredCount = 0;

  for (const file of sampled) {
    const content = await readFileSafe(file);
    if (!content) continue;

    const $ = cheerio.load(content);

    // Check tag-to-content ratio (lower is better for agents)
    const bodyText = $('body').text().trim();
    const bodyHtml = $('body').html() || '';
    const tagRatio = bodyHtml.length / Math.max(bodyText.length, 1);

    if (tagRatio < 3) {
      lowNoiseCount++;
    }

    // Check for JS-required rendering (common SPA indicators)
    const hasReactRoot = $('#root, #__next, #app, #__nuxt').length > 0;
    const bodyTextLength = bodyText.replace(/\s/g, '').length;
    const hasMinimalContent = bodyTextLength < 200;

    if (hasReactRoot && hasMinimalContent) {
      jsRequiredCount++;
    }
  }

  // HTML noise level
  if (sampled.length > 0) {
    const cleanRate = lowNoiseCount / sampled.length;
    if (cleanRate >= 0.7) {
      score += 3;
      findings_list.push(finding('info', 'HTML pages have good content-to-markup ratio.'));
    } else if (cleanRate >= 0.4) {
      score += 1;
      findings_list.push(
        finding('warning', 'Some HTML pages have high tag-to-content ratio.',
          'Reduce navigation chrome, sidebar, and footer content in the parseable content path. Consider serving clean Markdown as an alternative.')
      );
    } else {
      findings_list.push(
        finding('error', 'HTML pages are heavily marked up with low content-to-tag ratio.',
          'Agents waste tokens parsing HTML tags. Provide Markdown alternatives or reduce HTML complexity.')
      );
    }
  }

  // JavaScript dependency
  if (jsRequiredCount > 0) {
    findings_list.push(
      finding('error',
        `${jsRequiredCount} page(s) appear to require JavaScript to render content.`,
        'Agents cannot execute JavaScript. Ensure all documentation is server-rendered or statically generated with full content in the HTML.')
    );
  } else if (sampled.length > 0) {
    score += 3;
    findings_list.push(finding('info', 'Content is accessible without JavaScript rendering.'));
  }

  const status = score >= 8 ? 'pass' : score >= 5 ? 'warn' : 'fail';
  return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, status, findings_list);
}

export const meta = { id: ID, name: NAME, category: CATEGORY, maxScore: MAX_SCORE };
