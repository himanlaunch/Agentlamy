import { auditLiveSite, generateArtifacts, generateVisibilityAnalysis } from "@aeo/core";
import { getProviderConfig } from "@/lib/env";

export type InstantReport = {
  score: number;
  maxScore: number;
  percentage: number;
  grade: string;
  categories: Record<string, { name: string; score: number; maxScore: number; percentage: number }>;
  findings: {
    errors: Array<{ checker: string; checkerName: string; severity: string; message: string; fix?: string }>;
    warnings: Array<{ checker: string; checkerName: string; severity: string; message: string; fix?: string }>;
    infos: Array<{ checker: string; checkerName: string; severity: string; message: string; fix?: string }>;
  };
  pages: Array<{
    url: string;
    path?: string;
    title?: string;
    tokenCount: number;
    introText?: string;
  }>;
  crawlSummary?: {
    pagesFetched?: number;
  };
};

export type VisibilityAnalysis = {
  provider: string | null;
  marketSummary: string;
  brandName: string;
  productsServices: string[];
  area: string;
  targetAudience: string;
  agentQueries: string[];
  llmVisibilityScore: number;
  agentVisibilityScore: number;
  reasoning: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  platformScores: Array<{ platform: string; score: number; explanation: string }>;
  competitorInsights: Array<{
    competitorUrl: string;
    brandName: string;
    relativeVisibilityScore: number;
    relativePosition: "ahead" | "similar" | "behind";
    comparison: string;
  }>;
};

export type CompetitorScanResult = {
  url: string;
  report?: InstantReport;
  error?: string;
};

export type PublicScanResult = {
  report: InstantReport;
  remediation: Awaited<ReturnType<typeof generateArtifacts>> | null;
  visibility: VisibilityAnalysis;
  competitorReports: CompetitorScanResult[];
  providerConfigured: boolean;
  aiEnabled: boolean;
};

export function isValidHttpUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function splitList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function scanPublicUrl({
  url,
  area = "",
  focus = "",
  competitors = "",
  pageBudget = 20,
  includeAi = true,
  includeArtifacts = true,
}: {
  url: string;
  area?: string;
  focus?: string | string[];
  competitors?: string | string[];
  pageBudget?: number;
  includeAi?: boolean;
  includeArtifacts?: boolean;
}): Promise<PublicScanResult> {
  const focusTerms = Array.isArray(focus) ? focus : splitList(focus);
  const competitorUrls = (Array.isArray(competitors) ? competitors : splitList(competitors))
    .filter((value) => isValidHttpUrl(value))
    .slice(0, 4);
  const analysisProviderConfig = includeAi ? getProviderConfig({ purpose: "analysis" }) : null;
  const remediationProviderConfig = includeAi ? getProviderConfig({ purpose: "remediation" }) : null;
  const providerConfigured = Boolean(getProviderConfig({ purpose: "analysis" }) || getProviderConfig({ purpose: "remediation" }));

  const report = (await auditLiveSite(url, { pageBudget })) as InstantReport;

  const competitorReports = await Promise.all(
    competitorUrls.map(async (competitorUrl) => {
      try {
        const competitorReport = (await auditLiveSite(competitorUrl, { pageBudget })) as InstantReport;
        return { url: competitorUrl, report: competitorReport };
      } catch (competitorError) {
        return {
          url: competitorUrl,
          error: competitorError instanceof Error ? competitorError.message : "Competitor scan failed.",
        };
      }
    })
  );

  const remediation = remediationProviderConfig && includeArtifacts
    ? await generateArtifacts({
        report,
        baseUrl: url,
        providerConfig: remediationProviderConfig,
      })
    : null;

  const visibility = (await (generateVisibilityAnalysis as any)({
    report,
    baseUrl: url,
    providerConfig: analysisProviderConfig,
    area,
    focusTerms,
    competitorReports,
  })) as VisibilityAnalysis;

  return {
    report,
    remediation,
    visibility,
    competitorReports,
    providerConfigured,
    aiEnabled: Boolean(analysisProviderConfig || remediationProviderConfig),
  };
}

export function createBatchScanSummary({
  url,
  area = "",
  focus = "",
  result,
  elapsedMs,
}: {
  url: string;
  area?: string;
  focus?: string | string[];
  result: PublicScanResult;
  elapsedMs: number;
}) {
  const focusTerms = Array.isArray(focus) ? focus : splitList(focus);
  const allFindings = [
    ...result.report.findings.errors,
    ...result.report.findings.warnings,
    ...result.report.findings.infos,
  ];

  return {
    url,
    area,
    focusTerms,
    elapsedMs,
    score: {
      weighted: result.report.score,
      max: result.report.maxScore,
      percentage: result.report.percentage,
      grade: result.report.grade,
    },
    visibility: {
      llm: result.visibility.llmVisibilityScore,
      agent: result.visibility.agentVisibilityScore,
      marketSummary: result.visibility.marketSummary,
      recommendations: result.visibility.recommendations.slice(0, 3),
      provider: result.visibility.provider,
    },
    counts: {
      pages: result.report.pages.length,
      fetched: result.report.crawlSummary?.pagesFetched ?? result.report.pages.length,
      errors: result.report.findings.errors.length,
      warnings: result.report.findings.warnings.length,
      infos: result.report.findings.infos.length,
    },
    categories: Object.entries(result.report.categories).map(([key, value]) => ({
      key,
      name: value.name,
      percentage: value.percentage,
      score: value.score,
      maxScore: value.maxScore,
    })),
    topFindings: allFindings.slice(0, 5),
    largestPages: [...result.report.pages]
      .sort((a, b) => b.tokenCount - a.tokenCount)
      .slice(0, 3)
      .map((page) => ({
        url: page.url,
        title: page.title || page.path || page.url,
        tokenCount: page.tokenCount,
      })),
    artifactKinds: result.remediation?.artifacts.map((artifact) => artifact.kind) ?? [],
  };
}
