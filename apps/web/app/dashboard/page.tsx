import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, Clock, FolderOpen, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDashboardData } from "@/lib/data";
import { hasDatabaseConfig } from "@/lib/env";

export const metadata: Metadata = {
  title: "Dashboard",
};

function formatDate(date: Date | string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function gradeClass(grade: string | null) {
  if (!grade) return "";
  if (grade <= "C") return "fail";
  if (grade <= "B") return "warn";
  return "";
}

export default async function DashboardPage() {
  if (!hasDatabaseConfig()) {
    return (
      <section className="content-page narrow">
        <div className="content-header centered">
          <p className="eyebrow">Dashboard</p>
          <h2>Workspaces unavailable</h2>
          <p>Configure <code>DATABASE_URL</code> to save projects and track scan history over time.</p>
        </div>
        <div className="panel" style={{ textAlign: "center" }}>
          <p>In the meantime, the public scanner is fully open — no account needed.</p>
          <Link className="primary-button" href="/" style={{ marginTop: 16, display: "inline-flex" }}>
            Run a scan
          </Link>
        </div>
      </section>
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  const { projects, recentScans } = await getDashboardData(session.user.id);

  return (
    <section className="stack-list">
      <div className="hero-card">
        <p className="eyebrow">Dashboard</p>
        <h2>Your workspace</h2>
        <p>Saved projects and recent scan history.</p>
        <div className="row-wrap">
          <Link className="primary-button" href="/api/projects" aria-disabled>
            <Plus size={16} />
            New project
          </Link>
        </div>
      </div>

      <div className="detail-grid">
        <section className="panel stack-list">
          <div className="split-header">
            <div>
              <p className="eyebrow">Projects</p>
              <h3>Tracked sites</h3>
            </div>
            <span className="badge">{projects.length}</span>
          </div>
          {projects.length ? (
            projects.map((p) => (
              <Link className="project-link" href={`/projects/${p.projectId}`} key={p.projectId}>
                <div className="row">
                  <strong>{p.projectName}</strong>
                  <FolderOpen size={15} aria-hidden="true" />
                </div>
                <p className="meta">{p.baseUrl}</p>
                <p className="subtle">{formatDate(p.createdAt)}</p>
              </Link>
            ))
          ) : (
            <p className="empty-state">No projects yet. Create one to start tracking a site over time.</p>
          )}
        </section>

        <section className="panel stack-list">
          <div className="split-header">
            <div>
              <p className="eyebrow">Recent scans</p>
              <h3>Latest runs</h3>
            </div>
            <BarChart3 size={18} aria-hidden="true" />
          </div>
          {recentScans.length ? (
            recentScans.map((s) => (
              <Link className="project-link" href={`/scans/${s.scanId}`} key={s.scanId}>
                <div className="row">
                  <span className={`badge ${s.status === "failed" ? "fail" : s.status === "completed" ? "" : "warn"}`}>
                    {s.status}
                  </span>
                  {s.grade ? (
                    <span className={`badge ${gradeClass(s.grade)}`}>Grade {s.grade}</span>
                  ) : null}
                  <strong>{s.score != null ? `${s.score}%` : "Pending"}</strong>
                </div>
                <p className="meta row" style={{ gap: 6 }}>
                  <Clock size={13} aria-hidden="true" />
                  {formatDate(s.completedAt ?? s.createdAt)}
                </p>
              </Link>
            ))
          ) : (
            <p className="empty-state">No scans yet. Open a project and run the first scan.</p>
          )}
        </section>
      </div>
    </section>
  );
}
