import * as cheerio from 'cheerio';
import { readFileSafe, getHtmlFiles, getContentDir, finding, checkerResult, getScannedPages } from '../utils.js';

const ID = 'copy-for-ai';
const NAME = 'Copy for AI UX';
const CATEGORY = 'ux-bridge';
const MAX_SCORE = 10;

/**
 * Check for "Copy for AI" buttons or equivalent affordances.
 *
 * Scoring:
 * - Has copy-for-ai buttons/affordances: +4
 * - Has copy-to-clipboard for code blocks: +3
 * - Has raw/markdown view links: +3
 */
export async function check(context) {
  const findings_list = [];
  let score = 0;
  const crawledPages = getScannedPages(context);

  if (crawledPages.length > 0) {
    const sampled = crawledPages.slice(0, 20);
    const total = sampled.length;
    const hasCopyForAi = sampled.filter((page) => page.hasCopyForAi).length;
    const hasCopyCode = sampled.filter((page) => page.hasCopyCode).length;
    const hasRawView = sampled.filter((page) => page.hasRawView).length;
    return scoreCopyFeatures({ total, hasCopyForAi, hasCopyCode, hasRawView, findings_list, score });
  }

  const scanDir = getContentDir(context);
  if (!scanDir) {
    findings_list.push(finding('warning', 'No local directory available to analyze copy-for-AI affordances.'));
    return checkerResult(ID, NAME, CATEGORY, 0, MAX_SCORE, 'warn', findings_list);
  }

  const htmlFiles = await getHtmlFiles(scanDir);
  if (htmlFiles.length === 0) {
    findings_list.push(finding('warning', 'No HTML files found to analyze copy-for-AI affordances.'));
    return checkerResult(ID, NAME, CATEGORY, 0, MAX_SCORE, 'warn', findings_list);
  }

  const sampled = htmlFiles.slice(0, 20);
  let hasCopyForAi = 0;
  let hasCopyCode = 0;
  let hasRawView = 0;

  for (const file of sampled) {
    const content = await readFileSafe(file);
    if (!content) continue;

    const $ = cheerio.load(content);
    const bodyHtml = $('body').html() || '';
    const lower = bodyHtml.toLowerCase();

    // Check for "Copy for AI" or similar buttons
    const copyForAiPatterns = [
      'copy for ai',
      'copy as markdown',
      'copy for llm',
      'copy for agent',
      'copy-for-ai',
      'copy-as-markdown',
      'data-copy-ai',
      'data-ai-copy',
    ];

    if (copyForAiPatterns.some((p) => lower.includes(p))) {
      hasCopyForAi++;
    }

    // Check for copy-to-clipboard on code blocks
    const copyButtons = $(
      'button[data-copy], button.copy-button, button.copy-code, .copy-to-clipboard, [data-clipboard-target], button[aria-label*="copy" i], button[title*="copy" i]'
    );
    if (copyButtons.length > 0) {
      hasCopyCode++;
    }

    // Check for raw/markdown view links
    const rawLinks = $('a[href$=".md"], a[href*="format=md"], a[href*="raw=true"], a[href*="/raw/"]');
    const viewSourceLinks = lower.includes('view source') || lower.includes('edit on github') || lower.includes('view raw');
    if (rawLinks.length > 0 || viewSourceLinks) {
      hasRawView++;
    }
  }

  const total = sampled.length;
  return scoreCopyFeatures({ total, hasCopyForAi, hasCopyCode, hasRawView, findings_list, score });
}

function scoreCopyFeatures({ total, hasCopyForAi, hasCopyCode, hasRawView, findings_list, score = 0 }) {
  // Copy for AI buttons
  if (hasCopyForAi > 0) {
    score += 4;
    findings_list.push(finding('info', `${hasCopyForAi} of ${total} pages have "Copy for AI" affordances.`));
  } else {
    findings_list.push(
      finding('warning', 'No "Copy for AI" buttons found.',
        'Add a "Copy for AI" button that copies clean Markdown or plain text to clipboard.\nThis bridges human and agent workflows when developers work inside AI assistants.')
    );
  }

  // Copy code buttons
  if (hasCopyCode > total * 0.3) {
    score += 3;
    findings_list.push(finding('info', `${hasCopyCode} of ${total} pages have copy-to-clipboard for code blocks.`));
  } else if (hasCopyCode > 0) {
    score += 1;
    findings_list.push(
      finding('info', `${hasCopyCode} of ${total} pages have copy-to-clipboard for code.`,
        'Consider adding copy buttons to all code blocks across your documentation.')
    );
  } else {
    findings_list.push(
      finding('warning', 'No copy-to-clipboard buttons found for code blocks.',
        'Add copy buttons to code blocks. This is standard in modern documentation and helps both human and agent workflows.')
    );
  }

  // Raw/markdown view
  if (hasRawView > total * 0.3) {
    score += 3;
    findings_list.push(finding('info', `${hasRawView} of ${total} pages link to raw or Markdown views.`));
  } else if (hasRawView > 0) {
    score += 1;
    findings_list.push(
      finding('info', `${hasRawView} of ${total} pages link to raw or source views.`,
        'Make Markdown source discoverable by adding "View source" or "View as Markdown" links.')
    );
  } else {
    findings_list.push(
      finding('warning', 'No links to raw or Markdown views found.',
        'Add links to Markdown source or "Edit on GitHub" links. These help agents and developers access clean, parseable content.')
    );
  }

  const status = score >= 7 ? 'pass' : score >= 4 ? 'warn' : 'fail';
  return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, status, findings_list);
}

export const meta = { id: ID, name: NAME, category: CATEGORY, maxScore: MAX_SCORE };
