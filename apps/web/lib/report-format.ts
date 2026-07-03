export function toMarkdownReport(scan: {
  id: string;
  projectName: string;
  baseUrl: string;
  score: number | null;
  grade: string | null;
  summaryJson: Record<string, any> | null;
}) {
  const summary = scan.summaryJson ?? {};
  const findings = summary.findings ?? { errors: [], warnings: [], infos: [] };
  const categories = Object.values(summary.categories ?? {}) as Array<{
    name: string;
    score: number;
    maxScore: number;
    percentage: number;
  }>;

  return `# ${scan.projectName} AEO Report

- Scan ID: ${scan.id}
- Target: ${scan.baseUrl}
- Score: ${scan.score ?? "Pending"}%
- Grade: ${scan.grade ?? "Pending"}

## Categories
${categories.map((category) => `- ${category.name}: ${category.score}/${category.maxScore} (${category.percentage}%)`).join("\n")}

## Errors
${(findings.errors ?? []).map((finding: any) => `- [${finding.checkerName}] ${finding.message}`).join("\n") || "- None"}

## Warnings
${(findings.warnings ?? []).map((finding: any) => `- [${finding.checkerName}] ${finding.message}`).join("\n") || "- None"}

## AI Analytics Readiness
${(summary.analyticsGuidance?.referralSources ?? []).map((source: string) => `- ${source}`).join("\n") || "- No analytics guidance available"}
`;
}
