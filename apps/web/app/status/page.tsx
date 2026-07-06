import type { Metadata } from "next";
import { getProviderConfig, hasDatabaseConfig } from "@/lib/env";

export const metadata: Metadata = {
  title: "System Status",
};

const rows = [
  { label: "Public scanner", value: "Open", status: "good" },
  { label: "AI analysis provider", value: getProviderConfig({ purpose: "analysis" }) ? "Configured" : "Heuristic mode", status: getProviderConfig({ purpose: "analysis" }) ? "good" : "warn" },
  { label: "Database persistence", value: hasDatabaseConfig() ? "Ready" : "Not required", status: hasDatabaseConfig() ? "good" : "neutral" },
  { label: "Batch scanner", value: "Available", status: "good" },
];

export default function StatusPage() {
  return (
    <section className="content-page">
      <div className="content-header">
        <p className="eyebrow">Status</p>
        <h2>System status</h2>
        <p>Current health and runtime mode for AgentLamy services.</p>
      </div>
      <div className="status-card">
        {rows.map((row) => (
          <div className="status-row" key={row.label}>
            <span className={`status-dot ${row.status}`} />
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
