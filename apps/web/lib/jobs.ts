import { auditLiveSite, generateArtifacts } from "@aeo/core";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { env, getProviderConfig } from "./env";
import {
  findings as findingsTable,
  generatedArtifacts as generatedArtifactsTable,
  projects,
  scannedPages,
  scans,
  scanTargets,
} from "./schema";
import { getScanPages, getScanForUser } from "./data";

type AuditSummary = {
  score: number;
  maxScore: number;
  percentage: number;
  grade: string;
  categories: Record<string, unknown>;
  results: unknown[];
  summary: Record<string, unknown>;
  findings: {
    errors: Array<Record<string, any>>;
    warnings: Array<Record<string, any>>;
    infos: Array<Record<string, any>>;
  };
  crawlSummary: Record<string, unknown>;
  analyticsGuidance: Record<string, unknown>;
  baseUrl: string;
  pages: Array<Record<string, any>>;
};

function scanSummaryFromReport(report: AuditSummary) {
  return {
    score: report.score,
    maxScore: report.maxScore,
    percentage: report.percentage,
    grade: report.grade,
    categories: report.categories,
    results: report.results,
    summary: report.summary,
    findings: report.findings,
    crawlSummary: report.crawlSummary,
    analyticsGuidance: report.analyticsGuidance,
    baseUrl: report.baseUrl,
  };
}

export async function executeScanJob(scanId: string) {
  const db = getDb();

  const rows = await db
    .select({
      scanId: scans.id,
      projectId: scans.projectId,
      baseUrl: scanTargets.baseUrl,
    })
    .from(scans)
    .innerJoin(projects, eq(projects.id, scans.projectId))
    .innerJoin(scanTargets, eq(scanTargets.id, projects.scanTargetId))
    .where(eq(scans.id, scanId))
    .limit(1);

  const target = rows[0];
  if (!target) {
    throw new Error(`Scan ${scanId} was not found.`);
  }

  await db
    .update(scans)
    .set({
      status: "running",
      startedAt: new Date(),
    })
    .where(eq(scans.id, scanId));

  try {
    const report = (await auditLiveSite(target.baseUrl, { pageBudget: 20 })) as AuditSummary;

    await db.transaction(async (tx) => {
      await tx.delete(scannedPages).where(eq(scannedPages.scanId, scanId));
      await tx.delete(findingsTable).where(eq(findingsTable.scanId, scanId));

      await tx
        .update(scans)
        .set({
          status: "completed",
          completedAt: new Date(),
          score: report.percentage,
          grade: report.grade,
          summaryJson: scanSummaryFromReport(report),
        })
        .where(eq(scans.id, scanId));

      const insertedPages = report.pages.length
        ? await tx
            .insert(scannedPages)
            .values(
              report.pages.map((page) => ({
                scanId,
                url: page.url,
                path: page.path,
                title: page.title,
                contentType: page.contentType,
                tokenCount: page.tokenCount,
                headingStats: page.headingStats,
                markdownAvailable: page.markdownAvailable,
                fetchMode: page.fetchMode,
                introText: page.introText,
                metaJson: {
                  ...page.meta,
                  tokenClassification: page.tokenClassification,
                  hasCopyForAi: page.hasCopyForAi,
                  hasCopyCode: page.hasCopyCode,
                  hasRawView: page.hasRawView,
                },
              }))
            )
            .returning({
              id: scannedPages.id,
              url: scannedPages.url,
            })
        : [];

      const pageIdByUrl = new Map(insertedPages.map((page) => [page.url, page.id]));
      const flattenedFindings = [...report.findings.errors, ...report.findings.warnings, ...report.findings.infos];

      if (flattenedFindings.length > 0) {
        await tx.insert(findingsTable).values(
          flattenedFindings.map((finding) => ({
            scanId,
            pageId: null,
            checkerId: finding.checker,
            checkerName: finding.checkerName,
            severity: finding.severity,
            message: finding.message,
            fixHint: finding.fix ?? null,
            metadataJson: {
              candidatePageId: pageIdByUrl.get(finding.path || ""),
            },
          }))
        );
      }
    });

    return { scanId, status: "completed" as const };
  } catch (error) {
    await db
      .update(scans)
      .set({
        status: "failed",
        completedAt: new Date(),
        summaryJson: {
          error: error instanceof Error ? error.message : String(error),
        },
      })
      .where(eq(scans.id, scanId));

    throw error;
  }
}

function buildStoredReport(scan: NonNullable<Awaited<ReturnType<typeof getScanForUser>>>, pages: Awaited<ReturnType<typeof getScanPages>>) {
  const summaryJson = (scan.summaryJson ?? {}) as Record<string, any>;
  return {
    ...summaryJson,
    baseUrl: scan.baseUrl,
    pages: pages.map((page) => ({
      url: page.url,
      path: page.path,
      title: page.title,
      tokenCount: page.tokenCount,
      introText: page.introText,
      tokenClassification: page.metaJson?.tokenClassification,
    })),
  };
}

export async function executeArtifactJob(scanId: string, artifactKinds?: string[]) {
  const db = getDb();
  const scan = await db
    .select({
      id: scans.id,
      projectId: scans.projectId,
      summaryJson: scans.summaryJson,
      baseUrl: scanTargets.baseUrl,
    })
    .from(scans)
    .innerJoin(projects, eq(projects.id, scans.projectId))
    .innerJoin(scanTargets, eq(scanTargets.id, projects.scanTargetId))
    .where(eq(scans.id, scanId))
    .limit(1);

  if (!scan[0]) {
    throw new Error(`Scan ${scanId} was not found.`);
  }

  const pages = await getScanPages(scanId);
  const report = buildStoredReport(
    {
      ...scan[0],
      status: "completed",
      score: null,
      grade: null,
      shareToken: "",
      startedAt: null,
      completedAt: null,
      createdAt: new Date(),
      projectName: "",
      projectDescription: null,
    },
    pages
  );

  const remediation = await generateArtifacts({
    report,
    baseUrl: scan[0].baseUrl,
    providerConfig: getProviderConfig({
      purpose: "remediation",
      model: env.AEO_REMEDIATION_MODEL || env.AEO_ANALYSIS_MODEL || null,
    }),
  }) as {
    provider: string | null;
    artifacts: Array<{ kind: string; content: string; format: string }>;
  };

  const filteredArtifacts = artifactKinds?.length
    ? remediation.artifacts.filter((artifact) => artifactKinds.includes(artifact.kind))
    : remediation.artifacts;

  await db.transaction(async (tx) => {
    await tx.delete(generatedArtifactsTable).where(eq(generatedArtifactsTable.scanId, scanId));
    if (filteredArtifacts.length > 0) {
      await tx.insert(generatedArtifactsTable).values(
        filteredArtifacts.map((artifact) => ({
          scanId,
          kind: artifact.kind,
          provider: remediation.provider,
          model: env.AEO_REMEDIATION_MODEL || env.AEO_ANALYSIS_MODEL || null,
          content: artifact.content,
          format: artifact.format,
        }))
      );
    }
  });

  return remediation;
}
