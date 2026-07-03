import Link from "next/link";
import { notFound } from "next/navigation";
import { getScanArtifacts, getScanByShareToken, getScanFindings, getScanPages } from "@/lib/data";
import { hasDatabaseConfig } from "@/lib/env";

export default async function SharedScanPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  if (!hasDatabaseConfig()) {
    return <section className="panel">Configure `DATABASE_URL` to enable shared reports.</section>;
  }

  const { shareToken } = await params;
  const scan = await getScanByShareToken(shareToken);
  if (!scan) {
    notFound();
  }

  const [pages, findings, artifacts] = await Promise.all([
    getScanPages(scan.id),
    getScanFindings(scan.id),
    getScanArtifacts(scan.id),
  ]);
  const summary = (scan.summaryJson ?? {}) as Record<string, any>;

  return (
    <section className="stack-list">
      <div className="hero-card">
        <p className="eyebrow">Shared report</p>
        <h2>{scan.projectName}</h2>
        <p>{scan.baseUrl}</p>
        <div className="row-wrap">
          <span className="badge">Score {summary.percentage ?? scan.score ?? "Pending"}%</span>
          <span className="badge">Grade {scan.grade ?? "-"}</span>
          <Link className="secondary-button" href="/">
            Open app
          </Link>
        </div>
      </div>

      <div className="lists-grid">
        <section className="list-card">
          <p className="eyebrow">Findings</p>
          <h3>Top issues</h3>
          <div className="stack-list">
            {findings.slice(0, 12).map((finding) => (
              <article className={`finding-item ${finding.severity}`} key={finding.id}>
                <strong>{finding.checkerName}</strong>
                <p>{finding.message}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="list-card">
          <p className="eyebrow">Pages</p>
          <h3>Largest pages</h3>
          <div className="stack-list">
            {pages.slice(0, 10).map((page) => (
              <article className="page-card" key={page.id}>
                <strong>{page.title || page.path || page.url}</strong>
                <p className="meta">{page.tokenCount.toLocaleString()} tokens</p>
              </article>
            ))}
          </div>
        </section>

        <section className="list-card">
          <p className="eyebrow">Artifacts</p>
          <h3>Draft fixes</h3>
          <div className="stack-list">
            {artifacts.slice(0, 6).map((artifact) => (
              <article className="artifact-card" key={artifact.id}>
                <strong>{artifact.kind}</strong>
                <pre>{artifact.content}</pre>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
