import Link from "next/link";
import { notFound } from "next/navigation";
import { ScanActionButton } from "@/components/scan-actions";
import { auth } from "@/lib/auth";
import { getProjectForUser, listScansForProject } from "@/lib/data";
import { hasDatabaseConfig } from "@/lib/env";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  if (!hasDatabaseConfig()) {
    return <section className="panel">Configure `DATABASE_URL` to view project data.</section>;
  }

  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const { projectId } = await params;
  const project = await getProjectForUser(projectId, session.user.id);
  if (!project) {
    notFound();
  }

  const scans = await listScansForProject(project.id, session.user.id);

  return (
    <section className="stack-list">
      <div className="hero-card">
        <p className="eyebrow">Project</p>
        <h2>{project.name}</h2>
        <p>{project.baseUrl}</p>
        <div className="row-wrap">
          <ScanActionButton projectId={project.id} />
          <Link className="secondary-button" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </div>

      <div className="panel">
        <div className="split-header">
          <div>
            <p className="eyebrow">Scan History</p>
            <h3>Historical runs for this site</h3>
          </div>
          <span className="badge">{scans.length} scans</span>
        </div>

        <div className="stack-list">
          {scans.length ? (
            scans.map((entry) => (
              <Link className="project-link" href={`/scans/${entry.scans.id}`} key={entry.scans.id}>
                <div className="row">
                  <strong>{entry.scans.id}</strong>
                  <span className={`badge ${entry.scans.status === "failed" ? "fail" : entry.scans.status === "completed" ? "" : "warn"}`}>
                    {entry.scans.status}
                  </span>
                </div>
                <p className="meta">
                  {entry.scans.score ?? "Pending"}% {entry.scans.grade ? `· Grade ${entry.scans.grade}` : ""}
                </p>
              </Link>
            ))
          ) : (
            <p className="empty-state">Run the first scan to build a baseline.</p>
          )}
        </div>
      </div>
    </section>
  );
}
