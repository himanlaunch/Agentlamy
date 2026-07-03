import { XMLParser } from 'fast-xml-parser';
import { countTokens, classifyTokenCount } from './tokenizer.js';
import {
  analyzePage,
  extractInternalLinks,
  isSameOrigin,
  looksLikeDocumentationUrl,
  normalizeUrl,
} from './utils.js';

const DEFAULT_PAGE_BUDGET = 20;
const SPECIAL_RESOURCES = [
  'robots.txt',
  'llms.txt',
  'llms-full.txt',
  'agent-permissions.json',
  '.well-known/agent-permissions.json',
  'AGENTS.md',
  'CLAUDE.md',
  'skill.md',
  'skills.md',
  'sitemap.xml',
];

async function fetchResource(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'agentic-seo/2.0 (+https://github.com/AEO-Audit/agentic-seo)',
        Accept: 'text/html, text/plain, text/markdown, application/xml;q=0.9, */*;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    });

    const contentType = response.headers.get('content-type') || 'text/plain';
    const content = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      url,
      content,
      contentType,
      headers: Object.fromEntries(response.headers.entries()),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      url,
      content: '',
      contentType: 'text/plain',
      headers: {},
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function probeMarkdownVariant(pageUrl) {
  const url = new URL(pageUrl);
  const variants = new Set();

  if (!url.pathname.endsWith('.md')) {
    variants.add(`${pageUrl.replace(/\/$/, '')}.md`);
    variants.add(new URL(`${url.pathname}.md${url.search}`, url.origin).href);
    if (url.pathname.endsWith('.html')) {
      variants.add(new URL(url.pathname.replace(/\.html?$/i, '.md'), url.origin).href);
    }
  }

  for (const candidate of variants) {
    const result = await fetchResource(candidate);
    if (!result.ok) continue;
    if (result.contentType.includes('markdown') || result.content.trim().startsWith('#')) {
      return result;
    }
  }

  return null;
}

function parseSitemapUrls(baseUrl, xml) {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      removeNSPrefix: true,
    });
    const parsed = parser.parse(xml);
    const urls = [];

    const urlset = parsed.urlset?.url || [];
    const sitemapEntries = Array.isArray(urlset) ? urlset : [urlset];
    for (const entry of sitemapEntries) {
      if (entry?.loc) urls.push(normalizeUrl(entry.loc));
    }

    const sitemapIndex = parsed.sitemapindex?.sitemap || [];
    const indexEntries = Array.isArray(sitemapIndex) ? sitemapIndex : [sitemapIndex];
    for (const entry of indexEntries) {
      if (entry?.loc && isSameOrigin(entry.loc, baseUrl)) {
        urls.push(normalizeUrl(entry.loc));
      }
    }

    return [...new Set(urls)];
  } catch {
    return [];
  }
}

function chooseCandidateLinks(rootLinks, sitemapUrls, baseUrl) {
  const candidates = new Set();
  for (const url of [...sitemapUrls, ...rootLinks]) {
    if (!isSameOrigin(url, baseUrl)) continue;
    if (!looksLikeDocumentationUrl(url)) continue;
    candidates.add(normalizeUrl(url));
  }
  return [...candidates];
}

export async function crawlSite(baseUrl, options = {}) {
  const normalizedBaseUrl = normalizeUrl(baseUrl);
  const pageBudget = options.pageBudget || DEFAULT_PAGE_BUDGET;
  const resources = {};
  const pages = [];
  const fetchErrors = [];

  for (const resourcePath of SPECIAL_RESOURCES) {
    const url = new URL(resourcePath, normalizedBaseUrl).href;
    const resource = await fetchResource(url);
    if (resource.ok) {
      resources[resourcePath] = resource;
    }
  }

  const root = await fetchResource(normalizedBaseUrl);
  if (!root.ok) {
    throw new Error(`Unable to fetch ${normalizedBaseUrl} (${root.status || root.error || 'unknown error'})`);
  }

  const rootMarkdown = await probeMarkdownVariant(normalizedBaseUrl);
  const rootPage = analyzePage({
    url: normalizedBaseUrl,
    content: root.content,
    contentType: root.contentType,
    markdownUrl: rootMarkdown?.url || null,
    status: root.status,
    headers: root.headers,
  });
  rootPage.tokenCount = countTokens(rootPage.text);
  rootPage.tokenClassification = classifyTokenCount(rootPage.tokenCount);
  pages.push(rootPage);

  const rootLinks = root.contentType.includes('html')
    ? extractInternalLinks(root.content, normalizedBaseUrl, normalizedBaseUrl)
    : [];
  const sitemapUrls = resources['sitemap.xml']?.content
    ? parseSitemapUrls(normalizedBaseUrl, resources['sitemap.xml'].content)
    : [];
  const candidates = chooseCandidateLinks(rootLinks, sitemapUrls, normalizedBaseUrl)
    .filter((candidate) => candidate !== normalizedBaseUrl)
    .slice(0, Math.max(pageBudget - 1, 0));

  for (const candidateUrl of candidates) {
    const result = await fetchResource(candidateUrl);
    if (!result.ok) {
      fetchErrors.push({ url: candidateUrl, status: result.status, error: result.error || null });
      continue;
    }

    const markdownProbe = await probeMarkdownVariant(candidateUrl);
    const page = analyzePage({
      url: candidateUrl,
      content: result.content,
      contentType: result.contentType,
      markdownUrl: markdownProbe?.url || null,
      status: result.status,
      headers: result.headers,
    });

    page.tokenCount = countTokens(page.text);
    page.tokenClassification = classifyTokenCount(page.tokenCount);
    pages.push(page);
  }

  return {
    baseUrl: normalizedBaseUrl,
    pages,
    resources,
    summary: {
      pageBudget,
      rootLinksDiscovered: rootLinks.length,
      sitemapUrlsDiscovered: sitemapUrls.length,
      pagesFetched: pages.length,
      fetchErrors,
      missedImportantPages: chooseCandidateLinks(rootLinks, sitemapUrls, normalizedBaseUrl)
        .filter((candidate) => !pages.some((page) => page.url === candidate))
        .slice(0, 20),
    },
    analyticsGuidance: {
      referralSources: [
        'labs.perplexity.ai/referral',
        'chatgpt.com/(none)',
        'chatgpt.com/organic',
        'link.edgepilot.com/referral',
        'platform.openai.com/referral',
        'perplexity/(not set)',
        'claude.ai/referral',
        'copilot.microsoft.com/referral',
        'gemini.google.com/referral',
      ],
      userAgentFingerprints: [
        'axios/1.8.4',
        'curl/8.4.0',
        'got (sindresorhus/got)',
        'colly',
        'Electron',
        'Mozilla/5.0 (Playwright)',
      ],
    },
  };
}
