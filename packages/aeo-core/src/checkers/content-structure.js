import * as cheerio from 'cheerio';
import { readFileSafe, getHtmlFiles, getMarkdownFiles, getContentDir, finding, checkerResult, getScannedPages } from '../utils.js';

const ID = 'content-structure';
const NAME = 'Content Structure Quality';
const CATEGORY = 'content-structure';
const MAX_SCORE = 15;

/**
 * Analyze HTML content structure for agent-readability.
 *
 * Scoring:
 * - Consistent heading hierarchy (no skipping): +4
 * - Sections lead with outcomes/descriptions: +3
 * - Code examples present and properly placed: +3
 * - Tables used for structured data: +2
 * - Semantic HTML (main, article, section): +3
 */
export async function check(context) {
  const findings_list = [];
  let score = 0;
  const pages = getScannedPages(context);

  if (pages.length > 0) {
    const sampled = pages.slice(0, 20);
    const totalPages = sampled.length;
    const totalHeadingIssues = sampled.filter((page) => page.headingStats?.hasSkip).length;
    const pagesWithCode = sampled.filter((page) => page.hasCodeExamples).length;
    const pagesWithTables = sampled.filter((page) => page.hasTables).length;
    const pagesWithSemanticHtml = sampled.filter((page) => page.hasSemanticStructure).length;
    const pagesWithGoodLeadIn = sampled.filter((page) => page.hasGoodIntro).length;
    return scoreStructuredPages({ totalPages, totalHeadingIssues, pagesWithCode, pagesWithTables, pagesWithSemanticHtml, pagesWithGoodLeadIn, findings_list, score });
  }

  const scanDir = getContentDir(context);
  if (!scanDir) {
    findings_list.push(finding('warning', 'No local directory available to analyze content structure.'));
    return checkerResult(ID, NAME, CATEGORY, 0, MAX_SCORE, 'warn', findings_list);
  }

  const htmlFiles = await getHtmlFiles(scanDir);
  const mdFiles = htmlFiles.length === 0 ? await getMarkdownFiles(scanDir) : [];
  const useMarkdown = htmlFiles.length === 0 && mdFiles.length > 0;
  const sourceFiles = useMarkdown ? mdFiles : htmlFiles;

  if (sourceFiles.length === 0) {
    findings_list.push(finding('warning', 'No HTML or Markdown files found to analyze content structure.'));
    return checkerResult(ID, NAME, CATEGORY, 0, MAX_SCORE, 'warn', findings_list);
  }

  if (useMarkdown) {
    findings_list.push(finding('info', `Analyzing ${mdFiles.length} Markdown files (no HTML build output found).`));
  }

  // Sample up to 20 pages
  const sampled = sourceFiles.slice(0, 20);
  let totalHeadingIssues = 0;
  let pagesWithCode = 0;
  let pagesWithTables = 0;
  let pagesWithSemanticHtml = 0;
  let pagesWithGoodLeadIn = 0;

  for (const file of sampled) {
    const content = await readFileSafe(file);
    if (!content) continue;

    if (useMarkdown) {
      // Markdown analysis
      const headings = [...content.matchAll(/^(#{1,6})\s/gm)].map((m) => m[1].length);
      let hasSkip = false;
      for (let i = 1; i < headings.length; i++) {
        if (headings[i] - headings[i - 1] > 1) { hasSkip = true; break; }
      }
      if (hasSkip) totalHeadingIssues++;

      if (/```[\s\S]*?```/m.test(content)) pagesWithCode++;
      if (/\|.*\|.*\|/m.test(content)) pagesWithTables++;

      // Markdown is inherently semantic (no nav/footer noise)
      pagesWithSemanticHtml++;

      // Check first non-frontmatter, non-heading paragraph
      const bodyContent = content.replace(/^---[\s\S]*?---\n*/m, '');
      const firstPara = bodyContent.split('\n\n').find(
        (p) => p.trim() && !p.trim().startsWith('#') && !p.trim().startsWith('---')
      );
      if (firstPara && firstPara.trim().length > 50) pagesWithGoodLeadIn++;
    } else {
      // HTML analysis
      const $ = cheerio.load(content);

      const headings = [];
      $('h1, h2, h3, h4, h5, h6').each((_, el) => {
        headings.push(parseInt(el.tagName[1]));
      });

      let hasSkip = false;
      for (let i = 1; i < headings.length; i++) {
        if (headings[i] - headings[i - 1] > 1) { hasSkip = true; break; }
      }
      if (hasSkip) totalHeadingIssues++;

      if ($('pre code, pre, .highlight').length > 0) pagesWithCode++;
      if ($('table').length > 0) pagesWithTables++;

      const hasMain = $('main').length > 0;
      const hasArticle = $('article').length > 0;
      const hasSection = $('section').length > 0;
      if (hasMain || hasArticle || hasSection) pagesWithSemanticHtml++;

      const mainContent = $('main').length > 0 ? $('main') : $('body');
      const firstPara = mainContent.find('p').first().text().trim();
      if (firstPara && firstPara.length > 50) pagesWithGoodLeadIn++;
    }
  }

  const totalPages = sampled.length;
  return scoreStructuredPages({ totalPages, totalHeadingIssues, pagesWithCode, pagesWithTables, pagesWithSemanticHtml, pagesWithGoodLeadIn, findings_list, score, useMarkdown });
}

function scoreStructuredPages({ totalPages, totalHeadingIssues, pagesWithCode, pagesWithTables, pagesWithSemanticHtml, pagesWithGoodLeadIn, findings_list, score = 0, useMarkdown = false }) {
  // Heading hierarchy
  const headingIssueRate = totalHeadingIssues / totalPages;
  if (headingIssueRate < 0.1) {
    score += 4;
    findings_list.push(finding('info', 'Heading hierarchy is consistent across pages.'));
  } else if (headingIssueRate < 0.3) {
    score += 2;
    findings_list.push(
      finding('warning',
        `${totalHeadingIssues} of ${totalPages} sampled pages have heading hierarchy issues (skipped levels).`,
        'Ensure headings follow H1 → H2 → H3 without skipping levels. Agents rely on heading structure for navigation.')
    );
  } else {
    findings_list.push(
      finding('error',
        `${totalHeadingIssues} of ${totalPages} sampled pages have broken heading hierarchy.`,
        'Fix heading levels to be sequential (H1 → H2 → H3). This is critical for agent parsing.')
    );
  }

  // Code examples
  const codeRate = pagesWithCode / totalPages;
  if (codeRate >= 0.5) {
    score += 3;
    findings_list.push(finding('info', `${pagesWithCode} of ${totalPages} pages include code examples.`));
  } else if (codeRate >= 0.2) {
    score += 1;
    findings_list.push(
      finding('warning', `Only ${pagesWithCode} of ${totalPages} pages have code examples.`,
        'Add code examples to documentation pages. Place them immediately after the concept they illustrate.')
    );
  } else {
    findings_list.push(
      finding('warning', `Few pages (${pagesWithCode}/${totalPages}) contain code examples.`,
        'Code examples are critical for agents. Add runnable examples for key operations.')
    );
  }

  // Tables for structured data
  const tableRate = pagesWithTables / totalPages;
  if (tableRate >= 0.2) {
    score += 2;
    findings_list.push(finding('info', `${pagesWithTables} of ${totalPages} pages use tables for structured data.`));
  } else {
    score += 1;
    findings_list.push(
      finding('info', `${pagesWithTables} of ${totalPages} pages use tables.`,
        'Consider using tables for parameter references and comparison data. Tables compress better than prose lists for agents.')
    );
  }

  // Semantic structure (HTML tags or Markdown inherent structure)
  const semanticRate = pagesWithSemanticHtml / totalPages;
  if (semanticRate >= 0.7) {
    score += 3;
    const label = useMarkdown
      ? 'Markdown source provides clean semantic structure (no navigation noise).'
      : 'Good use of semantic HTML elements (main, article, section).';
    findings_list.push(finding('info', label));
  } else if (semanticRate >= 0.3) {
    score += 1;
    findings_list.push(
      finding('warning',
        `Only ${pagesWithSemanticHtml} of ${totalPages} pages use semantic HTML.`,
        'Wrap main content in <main> or <article> tags. This helps agents identify the relevant content area.')
    );
  } else {
    findings_list.push(
      finding('warning', 'Most pages lack semantic HTML structure.',
        'Add <main>, <article>, and <section> elements to help agents extract relevant content from navigation noise.')
    );
  }

  // Lead-in quality
  if (pagesWithGoodLeadIn >= totalPages * 0.6) {
    findings_list.push(finding('info', 'Pages generally lead with descriptive content.'));
  } else {
    findings_list.push(
      finding('warning',
        'Many pages lack a strong opening paragraph.',
        'Start each page with a clear statement of what the page covers and what the reader/agent will learn.')
    );
  }

  const status = score >= 12 ? 'pass' : score >= 8 ? 'warn' : 'fail';
  return checkerResult(ID, NAME, CATEGORY, score, MAX_SCORE, status, findings_list);
}

export const meta = { id: ID, name: NAME, category: CATEGORY, maxScore: MAX_SCORE };
