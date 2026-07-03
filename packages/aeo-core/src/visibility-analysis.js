import { z } from 'zod';
import { createProvider } from './providers.js';

const visibilitySchema = z.object({
  marketSummary: z.string(),
  brandName: z.string(),
  productsServices: z.array(z.string()).default([]),
  area: z.string(),
  targetAudience: z.string(),
  agentQueries: z.array(z.string()).default([]),
  llmVisibilityScore: z.number().min(0).max(100),
  agentVisibilityScore: z.number().min(0).max(100),
  reasoning: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  platformScores: z.array(
    z.object({
      platform: z.string(),
      score: z.number().min(0).max(100),
      explanation: z.string(),
    })
  ).default([]),
  competitorInsights: z.array(
    z.object({
      competitorUrl: z.string(),
      brandName: z.string(),
      relativeVisibilityScore: z.number().min(0).max(100),
      relativePosition: z.enum(['ahead', 'similar', 'behind']),
      comparison: z.string(),
    })
  ).default([]),
});

function compactFindings(report) {
  return [...report.findings.errors, ...report.findings.warnings]
    .slice(0, 8)
    .map((finding) => `- [${finding.checkerName}] ${finding.message}`)
    .join('\n');
}

function compactPages(report) {
  return [...report.pages]
    .sort((a, b) => b.tokenCount - a.tokenCount)
    .slice(0, 6)
    .map((page) => `- ${page.title || page.path || page.url} (${page.tokenCount} tokens)`)
    .join('\n');
}

function compactCategories(report) {
  return Object.values(report.categories)
    .map((category) => `${category.name}: ${category.percentage}%`)
    .join(', ');
}

function heuristicScore(report) {
  const discovery = report.categories?.discovery?.percentage ?? report.percentage;
  const structure = report.categories?.['content-structure']?.percentage ?? report.percentage;
  const capability = report.categories?.['capability-signaling']?.percentage ?? report.percentage;
  return Math.round((report.percentage * 0.5) + (discovery * 0.2) + (structure * 0.15) + (capability * 0.15));
}

function defaultQueries({ focusTerms, area, report }) {
  const title = report.pages?.[0]?.title || 'the service';
  const focus = focusTerms?.length ? focusTerms.join(', ') : title;
  const region = area || 'the target market';
  return [
    `best ${focus} in ${region}`,
    `${focus} near me in ${region}`,
    `top providers for ${focus} in ${region}`,
    `which company should I use for ${focus} in ${region}`,
  ];
}

export async function generateVisibilityAnalysis({
  report,
  baseUrl,
  providerConfig,
  area = '',
  focusTerms = [],
  competitorReports = [],
}) {
  const provider = createProvider(providerConfig);
  const heuristic = heuristicScore(report);
  const competitorBaseline = competitorReports.map((competitor) => ({
    competitorUrl: competitor.url,
    brandName: competitor.report?.pages?.[0]?.title || competitor.url,
    relativeVisibilityScore: competitor.report ? heuristicScore(competitor.report) : 0,
    relativePosition: competitor.report
      ? heuristicScore(competitor.report) > heuristic + 5
        ? 'ahead'
        : heuristicScore(competitor.report) < heuristic - 5
          ? 'behind'
          : 'similar'
      : 'similar',
    comparison: competitor.error
      ? `Competitor crawl failed: ${competitor.error}`
      : `AEO score ${competitor.report.percentage}% versus ${report.percentage}% for the target site.`,
  }));

  let analysis = {
    marketSummary: `Estimated LLM/agent discoverability for ${baseUrl} based on AEO signals rather than live ranking data.`,
    brandName: report.pages?.[0]?.title || baseUrl,
    productsServices: focusTerms.length ? focusTerms : [report.pages?.[0]?.title || 'Primary service'],
    area: area || 'Unspecified market',
    targetAudience: 'Prospects asking an AI assistant to find relevant products or services.',
    agentQueries: defaultQueries({ focusTerms, area, report }),
    llmVisibilityScore: heuristic,
    agentVisibilityScore: heuristic,
    reasoning: [
      `The site currently scores ${report.percentage}% on AEO checks.`,
      'Discovery, content structure, and capability signaling are the biggest drivers of agent visibility.',
    ],
    strengths: report.findings.infos.slice(0, 4).map((finding) => finding.message),
    weaknesses: [...report.findings.errors, ...report.findings.warnings].slice(0, 4).map((finding) => finding.message),
    recommendations: [
      'Publish stronger discovery signals such as llms.txt and agent permissions.',
      'Reduce oversized pages and make service/location relevance clearer near the top of the page.',
      'Add cleaner machine-readable capability descriptions for agents.',
    ],
    platformScores: [
      { platform: 'ChatGPT', score: heuristic, explanation: 'Estimated from crawlable docs, discovery files, and concise content structure.' },
      { platform: 'Claude', score: Math.max(0, heuristic - 2), explanation: 'Slightly lower when machine-readable guidance is weak or pages are large.' },
      { platform: 'Gemini', score: Math.max(0, heuristic - 4), explanation: 'Depends heavily on clean crawlability and structured reference content.' },
      { platform: 'Perplexity', score: Math.min(100, heuristic + 1), explanation: 'Benefits from explicit summaries and concise, citation-friendly landing pages.' },
    ],
    competitorInsights: competitorBaseline,
  };

  if (provider) {
    try {
      analysis = await provider.generateStructuredOutput({
        schema: visibilitySchema,
        system: 'You estimate likely LLM and agent discoverability for websites. Do not claim to have live rankings. Use the provided AEO signals and competitor data to estimate visibility and compare likely appearance in AI-assisted search journeys. Return JSON only.',
        prompt: `Target URL: ${baseUrl}
Area / market: ${area || 'Not provided'}
Focus products or services: ${focusTerms.length ? focusTerms.join(', ') : 'Infer from the site summary'}

Target site summary:
- AEO score: ${report.percentage}% (${report.grade})
- Categories: ${compactCategories(report)}
- Top findings:
${compactFindings(report) || '- None'}
- Largest pages:
${compactPages(report) || '- None'}

Competitors:
${competitorReports.length
  ? competitorReports.map((competitor) => competitor.error
      ? `- ${competitor.url}: crawl failed (${competitor.error})`
      : `- ${competitor.url}: AEO ${competitor.report.percentage}% (${compactCategories(competitor.report)})`
    ).join('\n')
  : '- None provided'}

Return:
- a short marketSummary
- inferred brandName, productsServices, and area
- likely agentQueries users would ask for this business in that area
- llmVisibilityScore and agentVisibilityScore from 0-100
- reasoning, strengths, weaknesses, recommendations
- platformScores for ChatGPT, Claude, Gemini, and Perplexity
- competitorInsights only for the competitors above`,
      });
    } catch {
      // Fall back to deterministic estimates if the provider call fails.
    }
  }

  return {
    provider: provider?.name || null,
    ...analysis,
  };
}
