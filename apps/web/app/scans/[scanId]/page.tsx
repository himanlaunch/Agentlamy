import Link from "next/link";
import { notFound } from "next/navigation";
import { RemediationButton } from "@/components/scan-actions";
import { auth } from "@/lib/auth";
import { getScanArtifacts, getScanFindings, getScanForUser, getScanPages, listScansForProject } from "@/lib/data";
import { hasDatabaseConfig } from "@/lib/env";

function statusBadge(status: string) {
  return status === "failed" ? "badge fail" : status === "completed" ? "badge" : "badge warn";
}

export default async function ScanPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  if (!hasDatabaseConfig()) {
    return <section className="panel">Configure `DATABASE_URL` to view scans.</section>;
  }

  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const { scanId } = await params;
  const scan = await getScanForUser(scanId, session.user.id);
  if (!scan) {
    notFound();
  }

  const [pages, findings, artifacts, history] = await Promise.all([
    getScanPages(scan.id),
    getScanFindings(scan.id),
    getScanArtifacts(scan.id),
    listScansForProject(scan.projectId, session.user.id),
  ]);

  const previousCompleted = history
    .map((item) => item.scans)
    .filter((entry) => entry.id !== scan.id && entry.status === "completed" && typeof entry.score === "number")[0];
  const delta =
    previousCompleted && typeof scan.score === "number" && typeof previousCompleted.score === "number"
      ? scan.score - previousCompleted.score
      : null;

  const summary = (scan.summaryJson ?? {}) as Record<string, any>;
  const categoryRows = Object.values(summary.categories ?? {}) as Array<{
    name: string;
    score: number;
    maxScore: number;
    percentage: number;
  }>;

  return (
    <section className="stack-list">
      <div className="hero-card">
        <p className="eyebrow">Scan Report</p>
        <h2>{scan.projectName}</h2>
        <p>{scan.baseUrl}</p>
        <div className="row-wrap">
          <span className={statusBadge(scan.status)}>{scan.status}</span>
          <span className="badge">Score {scan.score ?? "Pending"}%</span>
          <span className="badge">Grade {scan.grade ?? "-"}</span>
          {delta !== null ? <span className={`badge ${delta < 0 ? "fail" : ""}`}>Delta {delta > 0 ? "+" : ""}{delta}%</span> : null}
        </div>
      </div>

      <div className="metrics-grid">
        <article className="metric-card">
          <span className="eyebrow">Pages</span>
          <strong className="metric-value">{pages.length}</strong>
          <p className="meta">Fetched documentation pages in the latest crawl.</p>
        </article>
        <article className="metric-card">
          <span className="eyebrow">Findings</span>
          <strong className="metric-value">{findings.length}</strong>
          <p className="meta">Errors, warnings, and informational guidance across all checks.</p>
        </article>
        <article className="metric-card">
          <span className="eyebrow">Artifacts</span>
          <strong className="metric-value">{artifacts.length}</strong>
          <p className="meta">Generated remediation drafts for discovery, capability, and UX gaps.</p>
        </article>
      </div>

      <div className="detail-grid">
        <div className="stack-list">
          <section className="panel">
            <div className="split-header">
              <div>
                <p className="eyebrow">Categories</p>
                <h3>Score breakdown</h3>
              </div>
              <div className="row-wrap">
                <RemediationButton scanId={scan.id} />
                <Link className="secondary-button" href={`/api/scans/${scan.id}/export?format=md`}>
                  Export Markdown
                </Link>
                <Link className="secondary-button" href={`/share/${scan.shareToken}`}>
                  Share view
                </Link>
              </div>
            </div>
            <div className="stack-list">
              {categoryRows.map((category) => (
                <div className="project-link" key={category.name}>
                  <div className="row">
                    <strong>{category.name}</strong>
                    <span className="badge">{category.percentage}%</span>
                  </div>
                  <p className="meta">
                    {category.score}/{category.maxScore}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <p className="eyebrow">Findings</p>
            <h3>What needs attention</h3>
            <div className="stack-list">
              {findings.length ? (
                findings.map((finding) => (
                  <article className={`finding-item ${finding.severity}`} key={finding.id}>
                    <div className="row">
                      <strong>{finding.checkerName}</strong>
                      <span className={`badge ${finding.severity === "error" ? "fail" : finding.severity === "warning" ? "warn" : ""}`}>
                        {finding.severity}
                      </span>
                    </div>
                    <p>{finding.message}</p>
                    {finding.fixHint ? <p className="meta">{finding.fixHint}</p> : null}
                  </article>
                ))
              ) : (
                <p className="empty-state">No findings stored yet.</p>
              )}
            </div>
          </section>
        </div>

        <div className="stack-list">
          <section className="panel">
            <p className="eyebrow">Page Inventory</p>
            <h3>Token-heavy and crawl-visible pages</h3>
            <div className="stack-list">
              {pages.length ? (
                pages.slice(0, 12).map((page) => (
                  <article className="page-card" key={page.id}>
                    <div className="row">
                      <strong>{page.title || page.path || page.url}</strong>
                      <span className="badge">{page.tokenCount.toLocaleString()} tokens</span>
                    </div>
                    <p className="meta">{page.url}</p>
                    {page.introText ? <p className="subtle">{page.introText}</p> : null}
                  </article>
                ))
              ) : (
                <p className="empty-state">Pages will appear once the scan finishes.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <p className="eyebrow">Artifacts</p>
            <h3>Generated remediation drafts</h3>
            <div className="stack-list">
              {artifacts.length ? (
                artifacts.map((artifact) => (
                  <article className="artifact-card" key={artifact.id}>
                    <div className="row">
                      <strong>{artifact.kind}</strong>
                      <span className="badge">{artifact.format}</span>
                    </div>
                    <pre>{artifact.content}</pre>
                  </article>
                ))
              ) : (
                <p className="empty-state">Generate remediation to draft llms.txt, AGENTS.md, skill.md, robots.txt, and page rewrite guidance.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
