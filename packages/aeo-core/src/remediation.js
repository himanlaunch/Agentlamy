import { z } from 'zod';
import { createProvider } from './providers.js';

const artifactSchema = z.object({
  summary: z.string(),
  priorities: z.array(z.string()).default([]),
  rewriteBriefs: z.array(z.string()).default([]),
});

function getTopFindings(report) {
  return [...report.findings.errors, ...report.findings.warnings]
    .slice(0, 10)
    .map((finding) => `- [${finding.checkerName}] ${finding.message}`);
}

function buildLlmsTxt(report, baseUrl) {
  const pageLines = report.pages
    .slice(0, 12)
    .map((page) => `- [${page.title || page.path}](${page.path || page.url}): ${page.introText?.slice(0, 120) || 'Documentation page'} (${Math.round(page.tokenCount / 1000)}K tokens)`);
  return `# Documentation Index\n\n## Core Docs\n${pageLines.join('\n')}\n\n## Audit Guidance\n- [Robots Rules](/robots.txt): Ensure AI crawlers can access key docs\n- [AEO Summary](${baseUrl}): Base site entry point for agent discovery\n`;
}

function buildSkillMd(report) {
  const strengths = report.findings.infos.slice(0, 4).map((finding) => `- ${finding.message}`);
  return `---\nname: docs-platform\ndescription: Capability map for documentation consumers and AI coding agents\n---\n\n## What I can accomplish\n- Help agents discover docs, APIs, and onboarding flows\n- Provide machine-readable reference content and supporting guides\n- Surface constraints like rate limits, auth setup, and supported interfaces\n\n## Required inputs\n- Base documentation URL\n- Authentication guidance or API key instructions when relevant\n- Linked references for CLI, API, SDK, or MCP surfaces\n\n## Constraints\n- Keep core pages under 30K tokens where possible\n- Publish root discovery files like llms.txt and robots.txt\n- Avoid JS-only rendering for key docs\n\n## Key documentation\n${strengths.length > 0 ? strengths.join('\n') : '- Add links to top documentation entry points'}\n`;
}

function buildAgentsMd(report, baseUrl) {
  return `# Agent Instructions\n\n## Project Structure\n- Public docs root: ${baseUrl}\n- Discovery files: /llms.txt, /robots.txt, /agent-permissions.json\n- High-value pages: ${report.pages.slice(0, 5).map((page) => page.path).join(', ')}\n\n## Working Style\n- Prefer Markdown or low-noise HTML sources when available\n- Check token-heavy pages before loading them into context\n- Use the linked capability and API references before inferring behavior\n\n## Constraints\n- Watch for pages flagged as oversized in the latest AEO report\n- Prefer directly linked docs over client-rendered navigation shells\n`;
}

function buildRobotsTxt() {
  return `User-agent: GPTBot\nAllow: /\n\nUser-agent: ChatGPT-User\nAllow: /\n\nUser-agent: ClaudeBot\nAllow: /\n\nUser-agent: Claude-Web\nAllow: /\n\nUser-agent: PerplexityBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n`;
}

function buildCopyForAiSnippet() {
  return `<button class="copy-for-ai" data-copy-ai="page-content">Copy for AI</button>\n<a href="?format=md">View as Markdown</a>`;
}

export async function generateArtifacts({ report, baseUrl, providerConfig }) {
  const artifacts = [
    { kind: 'llms.txt', format: 'markdown', content: buildLlmsTxt(report, baseUrl) },
    { kind: 'skill.md', format: 'markdown', content: buildSkillMd(report) },
    { kind: 'AGENTS.md', format: 'markdown', content: buildAgentsMd(report, baseUrl) },
    { kind: 'robots.txt', format: 'text', content: buildRobotsTxt() },
    { kind: 'copy-for-ai', format: 'html', content: buildCopyForAiSnippet() },
  ];

  const oversizedPages = report.pages
    .filter((page) => page.tokenCount > 30000)
    .slice(0, 5)
    .map((page) => `${page.path || page.url}: ${page.tokenCount.toLocaleString()} tokens`);

  let aiSummary = {
    summary: `Prioritize discovery files first, then reduce token-heavy pages and add machine-readable interfaces. Largest pages: ${oversizedPages.join('; ') || 'none detected'}.`,
    priorities: [
      'Add or improve llms.txt and robots.txt',
      'Expose Markdown or raw views for key docs',
      'Split oversized pages and front-load outcomes',
    ],
    rewriteBriefs: oversizedPages.map((page) => `Rewrite ${page} into smaller task-based chunks with a short outcome-oriented intro.`),
  };

  const provider = createProvider(providerConfig);
  if (provider) {
    try {
      aiSummary = await provider.generateStructuredOutput({
        schema: artifactSchema,
        system: 'You are an AEO remediation assistant. Return concise JSON only.',
        prompt: `Base URL: ${baseUrl}\n\nTop findings:\n${getTopFindings(report).join('\n')}\n\nPages:\n${report.pages.slice(0, 10).map((page) => `- ${page.url} (${page.tokenCount} tokens)`).join('\n')}\n\nReturn a short summary, priorities, and rewriteBriefs.`,
      });
    } catch {
      // Fall back to deterministic summaries if the provider is unavailable.
    }
  }

  artifacts.push({
    kind: 'remediation-summary',
    format: 'markdown',
    content: `## Summary\n${aiSummary.summary}\n\n## Priorities\n${aiSummary.priorities.map((item) => `- ${item}`).join('\n')}\n\n## Rewrite Briefs\n${aiSummary.rewriteBriefs.map((item) => `- ${item}`).join('\n') || '- No rewrite briefs generated.'}\n`,
  });

  return {
    provider: provider?.name || null,
    artifacts,
    summary: aiSummary.summary,
    priorities: aiSummary.priorities,
  };
}
