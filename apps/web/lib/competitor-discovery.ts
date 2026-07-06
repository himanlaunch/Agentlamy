import { createProvider } from "@aeo/core";
import { z } from "zod";
import { getProviderConfig, getSearchConfig } from "@/lib/env";

const DISCOVERY_USER_AGENT = "Mozilla/5.0 (compatible; AEO-Hosted-Checker/1.0; +https://vercel.app)";
const DIRECTORY_HOST_PATTERNS = [
  "10bestseo.com",
  "agencyspotter.com",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "yelp.com",
  "tripadvisor.com",
  "mapquest.com",
  "angi.com",
  "yellowpages.com",
  "indeed.com",
  "glassdoor.com",
  "wikipedia.org",
  "reddit.com",
  "github.com",
  "crunchbase.com",
  "zoominfo.com",
  "bloomberg.com",
  "builtinchicago.org",
  "capterra.com",
  "clutch.co",
  "designrush.com",
  "expertise.com",
  "findbestseo.com",
  "g2.com",
  "goodfirms.co",
  "goodfirms.com",
  "sortlist.com",
  "softwareadvice.com",
  "themanifest.com",
  "topseos.com",
  "upcity.com",
];

const DIRECTORY_TEXT_PATTERNS = [
  /\b(alternatives?|best|directory|list|marketplace|reviews?|top)\b/i,
  /\b(agencies|companies|firms|providers)\s+(in|near|for)\b/i,
  /\b\d+\s+(best|top)\b/i,
];

type SearchResult = {
  url: string;
  title: string;
  snippet: string;
  sourceQuery: string;
  sourceType?: "local" | "organic";
  address?: string;
};

export type CompetitorSuggestion = {
  url: string;
  domain: string;
  title: string;
  snippet: string;
  reason: string;
  sourceQuery: string;
  sourceType?: "local" | "organic";
};

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/");
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function toRootUrl(value: string) {
  const url = new URL(value);
  return `${url.protocol}//${url.host}/`;
}

function normalizeDomain(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return value.replace(/^www\./, "").toLowerCase();
  }
}

function decodeDuckDuckGoHref(href: string) {
  try {
    const url = href.startsWith("http") ? new URL(href) : new URL(href, "https://duckduckgo.com");
    const wrapped = url.searchParams.get("uddg");
    return wrapped ? decodeURIComponent(wrapped) : url.href;
  } catch {
    return href;
  }
}

function isLikelyCompetitorHost(candidateUrl: string, targetDomain: string) {
  try {
    const hostname = new URL(candidateUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (hostname === targetDomain || hostname.endsWith(`.${targetDomain}`) || targetDomain.endsWith(`.${hostname}`)) {
      return false;
    }
    if (DIRECTORY_HOST_PATTERNS.some((pattern) => hostname === pattern || hostname.endsWith(`.${pattern}`))) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isLikelyDirectoryResult(result: SearchResult) {
  const text = `${result.title} ${result.snippet}`.toLowerCase();
  return result.sourceType !== "local" && DIRECTORY_TEXT_PATTERNS.some((pattern) => pattern.test(text));
}

function queryTermsFromUrl(url: string) {
  const hostname = normalizeDomain(url);
  const brand = hostname.split(".")[0]?.replace(/[-_]/g, " ").trim() || hostname;
  return {
    hostname,
    brand,
  };
}

async function fetchPageTitle(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": DISCOVERY_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(4000),
    });
    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return titleMatch ? stripHtml(titleMatch[1]) : "";
  } catch {
    return "";
  }
}

async function searchDuckDuckGo(query: string) {
  const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: {
      "User-Agent": DISCOVERY_USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(7000),
  });

  if (!response.ok) {
    throw new Error(`Search lookup failed with status ${response.status}.`);
  }

  return response.text();
}

async function searchSerpApi(query: string, apiKey: string) {
  const searchUrl = new URL("https://serpapi.com/search.json");
  searchUrl.searchParams.set("engine", "google");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("api_key", apiKey);
  searchUrl.searchParams.set("num", "8");
  searchUrl.searchParams.set("hl", "en");
  searchUrl.searchParams.set("gl", "us");

  const response = await fetch(searchUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": DISCOVERY_USER_AGENT,
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`SerpAPI lookup failed with status ${response.status}.`);
  }

  const payload = await response.json() as {
    error?: string;
    local_results?: {
      places?: Array<{
        title?: string;
        website?: string;
        link?: string;
        address?: string;
        type?: string;
      }>;
    };
    organic_results?: Array<{
      link?: string;
      title?: string;
      snippet?: string;
      displayed_link?: string;
    }>;
  };

  if (payload.error) {
    throw new Error(`SerpAPI lookup failed: ${payload.error}`);
  }

  const localResults = (payload.local_results?.places || [])
    .map((result) => ({
      url: result.website || result.link || "",
      title: stripHtml(result.title || ""),
      snippet: stripHtml([result.type, result.address].filter(Boolean).join(" - ")),
      sourceQuery: query,
      sourceType: "local" as const,
      address: result.address,
    }))
    .filter((result) => result.url);

  const organicResults = (payload.organic_results || [])
    .map((result) => ({
      url: result.link || "",
      title: stripHtml(result.title || result.displayed_link || ""),
      snippet: stripHtml(result.snippet || ""),
      sourceQuery: query,
      sourceType: "organic" as const,
    }))
    .filter((result) => result.url);

  return [...localResults, ...organicResults];
}

function parseDuckDuckGoResults(html: string, query: string) {
  const results: SearchResult[] = [];
  const blocks = html.split(/<div[^>]+class="result[^"]*"[^>]*>/i).slice(1);

  for (const block of blocks) {
    const linkMatch = block.match(/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const snippetMatch = block.match(/<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/<div[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    const candidateUrl = decodeDuckDuckGoHref(decodeHtmlEntities(linkMatch[1]));
    results.push({
      url: candidateUrl,
      title: stripHtml(linkMatch[2]),
      snippet: stripHtml(snippetMatch?.[1] || ""),
      sourceQuery: query,
      sourceType: "organic",
    });
  }

  return results;
}

function buildQueries({
  targetUrl,
  area,
  focus,
  pageTitle,
}: {
  targetUrl: string;
  area: string;
  focus: string;
  pageTitle: string;
}) {
  const { brand } = queryTermsFromUrl(targetUrl);
  const topic = focus.trim() || pageTitle || brand;
  const market = area.trim();

  if (market) {
    return [
      `${topic} ${market}`,
      `${topic} company ${market}`,
    ];
  }

  return [
    `${topic} company`,
    `${topic} service provider`,
    `"${topic}"`,
  ];
}

function heuristicReason({
  title,
  snippet,
  area,
  focus,
}: {
  title: string;
  snippet: string;
  area: string;
  focus: string;
}) {
  const parts = [];
  if (focus.trim()) {
    parts.push(`matches the "${focus.trim()}" market`);
  }
  if (area.trim()) {
    parts.push(`shows up for the ${area.trim()} area`);
  }
  if (title || snippet) {
    parts.push("appears as a direct business result for the same category");
  }
  return `Likely competitor because it ${parts.join(" and ")}.`;
}

function terms(value: string) {
  const stopWords = new Set(["a", "an", "and", "best", "company", "for", "in", "near", "of", "or", "service", "services", "the"]);
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2 && !stopWords.has(item));
}

function scoreResult(result: SearchResult, area: string, focus: string) {
  const haystack = `${result.title} ${result.snippet} ${result.address || ""} ${result.url}`.toLowerCase();
  const focusTerms = terms(focus);
  const areaTerms = terms(area);
  let score = result.sourceType === "local" ? 45 : 10;

  for (const term of focusTerms) {
    if (haystack.includes(term)) score += 12;
  }

  for (const term of areaTerms) {
    if (haystack.includes(term)) score += 12;
  }

  if (/\/(blog|article|best|compare|directory|list|reviews?)(\/|$)/i.test(result.url)) score -= 25;
  if (isLikelyDirectoryResult(result)) score -= 30;
  if (result.sourceType === "local" && result.address) score += 10;

  return score;
}

const aiSchema = z.object({
  suggestions: z.array(
    z.object({
      url: z.string().url(),
      reason: z.string(),
    })
  ).max(8),
});

async function rerankWithAi({
  candidates,
  targetUrl,
  area,
  focus,
}: {
  candidates: CompetitorSuggestion[];
  targetUrl: string;
  area: string;
  focus: string;
}) {
  const providerConfig = getProviderConfig({ purpose: "analysis" });
  const provider = createProvider(providerConfig);
  if (!provider || !candidates.length) {
    return candidates;
  }

  try {
    const response = await Promise.race([
      provider.generateStructuredOutput({
        schema: aiSchema,
        system: "You choose direct competitor business websites from a candidate list. Select companies that offer the same product/service in the same area when area is provided. Exclude directories, review sites, listicles, marketplaces, social networks, and the target site. Return JSON only.",
        model: undefined,
        prompt: `Target site: ${targetUrl}
Area: ${area || "Not provided"}
Products or services: ${focus || "Infer from the candidate set"}

Candidate sites:
${candidates.map((candidate, index) => `${index + 1}. ${candidate.url}
Title: ${candidate.title || "N/A"}
Snippet: ${candidate.snippet || "N/A"}`).join("\n\n")}

Return up to 8 suggestions with the exact url from the candidates and a concise reason that mentions same service/category and same area fit when available.`,
      }) as Promise<z.infer<typeof aiSchema>>,
      new Promise<z.infer<typeof aiSchema>>((_, reject) =>
        setTimeout(() => reject(new Error("AI rerank timed out.")), 4500)
      ),
    ]);

    const reasonByUrl = new Map(response.suggestions.map((item) => [toRootUrl(item.url), item.reason]));
    const ranked = response.suggestions
      .map((item) => candidates.find((candidate) => toRootUrl(candidate.url) === toRootUrl(item.url)))
      .filter((candidate): candidate is CompetitorSuggestion => Boolean(candidate))
      .map((candidate) => ({
        ...candidate,
        reason: reasonByUrl.get(toRootUrl(candidate.url)) || candidate.reason,
      }));

    return ranked.length ? ranked : candidates;
  } catch {
    return candidates;
  }
}

export async function discoverCompetitors({
  url,
  area = "",
  focus = "",
  limit = 6,
}: {
  url: string;
  area?: string;
  focus?: string;
  limit?: number;
}) {
  const targetDomain = normalizeDomain(url);
  const pageTitle = focus.trim() ? "" : await fetchPageTitle(url);
  const queries = buildQueries({
    targetUrl: url,
    area,
    focus,
    pageTitle,
  });

  const byDomain = new Map<string, CompetitorSuggestion>();
  const searchConfig = getSearchConfig();
  const lookupErrors: string[] = [];

  const searchResults = await Promise.allSettled(queries.map(async (query) => {
    try {
      if (searchConfig.provider === "serpapi") {
        if (!searchConfig.apiKey) {
          throw new Error("SerpAPI is selected, but AEO_SEARCH_API_KEY is not configured.");
        }
        return await searchSerpApi(query, searchConfig.apiKey);
      } else {
        const html = await searchDuckDuckGo(query);
        return parseDuckDuckGoResults(html, query);
      }
    } catch (error) {
      lookupErrors.push(error instanceof Error ? error.message : "Search lookup failed.");
      return [];
    }
  }));

  for (const settled of searchResults) {
    const rawResults = settled.status === "fulfilled" ? settled.value : [];
    for (const result of rawResults) {
      if (!result.url.startsWith("http://") && !result.url.startsWith("https://")) continue;
      if (!isLikelyCompetitorHost(result.url, targetDomain)) continue;
      if (isLikelyDirectoryResult(result)) continue;

      const rootUrl = toRootUrl(result.url);
      const domain = normalizeDomain(rootUrl);
      if (byDomain.has(domain)) continue;
      if (scoreResult(result, area, focus) < 20) continue;

      byDomain.set(domain, {
        url: rootUrl,
        domain,
        title: result.title,
        snippet: result.snippet,
        reason: heuristicReason({
          title: result.title,
          snippet: result.snippet,
          area,
          focus,
        }),
        sourceQuery: result.sourceQuery,
        sourceType: result.sourceType,
      });

      if (byDomain.size >= Math.max(limit + 4, limit * 2)) {
        break;
      }
    }
  }

  const candidates = [...byDomain.values()];
  const candidatesByScore = candidates.sort((a, b) => {
    const aScore = scoreResult({
      url: a.url,
      title: a.title,
      snippet: a.snippet,
      sourceQuery: a.sourceQuery,
      sourceType: a.sourceType,
    }, area, focus);
    const bScore = scoreResult({
      url: b.url,
      title: b.title,
      snippet: b.snippet,
      sourceQuery: b.sourceQuery,
      sourceType: b.sourceType,
    }, area, focus);
    return bScore - aScore;
  });

  if (!candidatesByScore.length && lookupErrors.length) {
    throw new Error(lookupErrors[0]);
  }

  if (!candidatesByScore.length) {
    throw new Error("No direct competitors were found. Try adding an area or industry to narrow the search.");
  }

  const ranked = await rerankWithAi({
    candidates: candidatesByScore,
    targetUrl: url,
    area,
    focus,
  });

  return {
    targetUrl: url,
    targetDomain,
    pageTitle,
    source: searchConfig.provider === "serpapi" ? "serpapi-google" : "duckduckgo-html",
    suggestions: ranked.slice(0, limit),
  };
}
