import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Bot, FileSearch } from "lucide-react";

export const metadata: Metadata = {
  title: "Sample AEO Report",
  description: "Preview what an AEO Command report includes before running a live scan.",
};

const sampleScores = [
  { label: "AEO crawl", value: 82, icon: FileSearch },
  { label: "LLM visibility", value: 74, icon: BarChart3 },
  { label: "Agent utility", value: 68, icon: Bot },
];

export default function DemoPage() {
  return (
    <section className="content-page">
      <div className="content-header">
        <p className="eyebrow">Demo report</p>
        <h2>Preview the report format</h2>
        <p>This sample shows the kind of readiness signals a full scan returns. Run a live scan when you want real crawl data for a business or competitor.</p>
      </div>

      <div className="score-grid demo-scores">
        {sampleScores.map(({ label, value, icon: Icon }) => (
          <article className="score-card good" key={label}>
            <div className="row">
              <span className="icon-box">
                <Icon size={18} />
              </span>
              <strong>{value}%</strong>
            </div>
            <h3>{label}</h3>
            <p className="meta">Sample score for a well-structured business website.</p>
            <div className="mini-meter" aria-hidden="true">
              <span style={{ width: `${value}%` }} />
            </div>
          </article>
        ))}
      </div>

      <section className="panel stack-list">
        <p className="eyebrow">What the live report includes</p>
        <div className="feature-grid compact">
          <article className="feature-card">
            <h3>Competitor delta</h3>
            <p className="meta">Shows who is likely ahead in AI-assisted discovery and why.</p>
          </article>
          <article className="feature-card">
            <h3>Canonical facts</h3>
            <p className="meta">Summarizes brand, market, services, audience, and grounding quality.</p>
          </article>
          <article className="feature-card">
            <h3>AI remediation drafts</h3>
            <p className="meta">Generates llms.txt, AGENTS.md, skill.md, robots.txt, and rewrite guidance when a provider is configured.</p>
          </article>
        </div>
        <Link className="primary-button" href="/instant?url=https%3A%2F%2Fexample.com&area=Chicago&focus=SEO%20agency">
          Open a sample live scan
          <ArrowRight size={17} />
        </Link>
      </section>
    </section>
  );
}
