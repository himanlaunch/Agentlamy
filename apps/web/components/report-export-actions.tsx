"use client";

import { Download, FileJson, FileText, Printer } from "lucide-react";
import type { PublicScanResult } from "@/lib/public-scan";

type ReportExportActionsProps = {
  scanUrl: string;
  area: string;
  focusTerms: string[];
  scanResult: PublicScanResult;
};

function safeFilename(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "").replace(/[^a-z0-9.-]+/gi, "-").toLowerCase();
  } catch {
    return value.replace(/[^a-z0-9.-]+/gi, "-").toLowerCase() || "aeo-report";
  }
}

function downloadText(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

function findingLines(findings: PublicScanResult["report"]["findings"]) {
  return [...findings.errors, ...findings.warnings, ...findings.infos]
    .slice(0, 20)
    .map((finding) => `- **${finding.severity.toUpperCase()}** ${finding.checkerName}: ${finding.message}${finding.fix ? `\n  Fix: ${finding.fix}` : ""}`)
    .join("\n");
}

function buildMarkdown({
  scanUrl,
  area,
  focusTerms,
  scanResult,
}: ReportExportActionsProps) {
  const { report, visibility, competitorReports, remediation } = scanResult;
  const categories = Object.values(report.categories)
    .map((category) => `- ${category.name}: ${category.percentage}% (${category.score}/${category.maxScore})`)
    .join("\n");
  const pages = [...report.pages]
    .sort((a, b) => b.tokenCount - a.tokenCount)
    .slice(0, 12)
    .map((page) => `- ${page.title || page.path || page.url}: ${page.tokenCount.toLocaleString()} tokens\n  ${page.url}`)
    .join("\n");
  const platforms = visibility.platformScores
    .map((platform) => `- ${platform.platform}: ${platform.score}% - ${platform.explanation}`)
    .join("\n");
  const competitors = competitorReports.length
    ? competitorReports.map((competitor) => {
        const insight = visibility.competitorInsights.find((item) => item.competitorUrl === competitor.url);
        if (competitor.error) {
          return `- ${competitor.url}: scan failed (${competitor.error})`;
        }
        return `- ${insight?.brandName || competitor.url}: AEO ${competitor.report?.percentage ?? 0}%, visibility ${insight?.relativeVisibilityScore ?? competitor.report?.percentage ?? 0}%${insight?.comparison ? `\n  ${insight.comparison}` : ""}`;
      }).join("\n")
    : "- No competitors included.";
  const artifacts = remediation?.artifacts.length
    ? remediation.artifacts.map((artifact) => `### ${artifact.kind}\n\n\`\`\`${artifact.format === "json" ? "json" : ""}\n${artifact.content}\n\`\`\``).join("\n\n")
    : "No AI remediation artifacts were generated.";

  return `# AEO Report

Generated: ${new Date().toISOString()}
URL: ${scanUrl}
Area: ${area || "Unspecified"}
Focus: ${focusTerms.length ? focusTerms.join(", ") : "Unspecified"}

## Score

- Grade: ${report.grade}
- AEO score: ${report.percentage}%
- Weighted points: ${report.score}/${report.maxScore}
- LLM visibility: ${visibility.llmVisibilityScore}%
- Agent visibility: ${visibility.agentVisibilityScore}%
- Pages fetched: ${report.crawlSummary?.pagesFetched ?? report.pages.length}

## Market Summary

${visibility.marketSummary}

## Likely Agent Queries

${visibility.agentQueries.map((query) => `- ${query}`).join("\n")}

## Category Breakdown

${categories}

## Platform Outlook

${platforms || "- No platform scores available."}

## Competitor Comparison

${competitors}

## Top Findings

${findingLines(report.findings) || "- No findings returned."}

## Largest Pages

${pages || "- No pages captured."}

## Recommendations

${visibility.recommendations.map((item) => `- ${item}`).join("\n")}

## AI Remediation Drafts

${artifacts}
`;
}

export function ReportExportActions(props: ReportExportActionsProps) {
  const filenameBase = `aeo-report-${safeFilename(props.scanUrl)}`;

  function exportJson() {
    downloadText(
      `${filenameBase}.json`,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          scanUrl: props.scanUrl,
          area: props.area,
          focusTerms: props.focusTerms,
          ...props.scanResult,
        },
        null,
        2
      ),
      "application/json"
    );
  }

  function exportMarkdown() {
    downloadText(`${filenameBase}.md`, buildMarkdown(props), "text/markdown;charset=utf-8");
  }

  return (
    <div className="report-export-actions" aria-label="Report export actions">
      <button className="secondary-button" onClick={exportJson} type="button">
        <FileJson size={16} aria-hidden="true" />
        JSON
      </button>
      <button className="secondary-button" onClick={exportMarkdown} type="button">
        <Download size={16} aria-hidden="true" />
        Markdown
      </button>
      <button className="secondary-button" onClick={() => window.print()} type="button">
        <Printer size={16} aria-hidden="true" />
        PDF
      </button>
      <span className="badge muted">
        <FileText size={14} aria-hidden="true" />
        Export report
      </span>
    </div>
  );
}
