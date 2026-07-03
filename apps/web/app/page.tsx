import { DirectScanForm } from "@/components/direct-scan-form";

const readinessLanes = [
  {
    symbol: "doc",
    title: "AEO crawl",
    text: "Robots.txt, llms.txt, token budgets, markdown paths",
  },
  {
    symbol: "agent",
    title: "Agent usability",
    text: "Capability signals, API hints, conversion paths",
  },
  {
    symbol: "market",
    title: "Market visibility",
    text: "Answer-share, local queries, competitor deltas",
  },
];

export default async function HomePage() {
  return (
    <section className="home-page">
      <DirectScanForm />

      <section className="readiness-strip" aria-labelledby="readiness-title">
        <p className="apple-eyebrow" id="readiness-title">Readiness model</p>
        <div className="readiness-card-row">
          {readinessLanes.map((lane) => (
            <article className="readiness-card" key={lane.title}>
              <span className={`readiness-symbol ${lane.symbol}`} aria-hidden="true" />
              <h3>{lane.title}</h3>
              <p>{lane.text}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="ambient-status" aria-label="Runtime status">
        <span><i className="status-light green" /> Public scanner <strong>Ready</strong></span>
        <span><i className="status-light" /> AI provider <strong>Env based</strong></span>
        <span><i className="status-light" /> Workspaces <strong>Optional</strong></span>
      </footer>
    </section>
  );
}
