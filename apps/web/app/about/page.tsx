import type { Metadata } from "next";
import { BarChart3, Bot, Clock, Globe2, ShieldCheck, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "How It Works",
  description: "How AEO Command audits websites for LLM visibility, agent readiness, and competitive positioning.",
};

const measured = [
  {
    icon: Bot,
    title: "AEO crawl",
    body: "Checks robots.txt, llms.txt, token budgets, sitemap, markdown paths, heading structure, and machine-readable documentation.",
  },
  {
    icon: Globe2,
    title: "Agent usability",
    body: "Evaluates capability signals, conversion paths, API hints, contact accessibility, and whether an AI agent could complete a task.",
  },
  {
    icon: BarChart3,
    title: "Market visibility",
    body: "Models local service queries, answer-share estimates, platform outlook, and competitor deltas.",
  },
];

const benefits = [
  { icon: Zap, text: "Run a public URL scan in seconds." },
  { icon: ShieldCheck, text: "Keep scoring deterministic while AI adds remediation context." },
  { icon: Clock, text: "Use batch mode to compare many sites in one workflow." },
];

export default function AboutPage() {
  return (
    <section className="content-page">
      <div className="content-header">
        <p className="eyebrow">About</p>
        <h2>What is Answer Engine Optimization?</h2>
        <p>
          AEO is the practice of making a website readable, trustworthy, and actionable for AI systems that answer questions or browse on behalf of users.
        </p>
      </div>

      <div className="feature-grid">
        {measured.map(({ icon: Icon, title, body }) => (
          <article className="feature-card" key={title}>
            <span className="icon-box">
              <Icon size={18} />
            </span>
            <h3>{title}</h3>
            <p className="meta">{body}</p>
          </article>
        ))}
      </div>

      <section className="dark-callout">
        <h3>Why this matters now</h3>
        <p>
          AI assistants increasingly choose which businesses, docs, and tools to recommend. If your site cannot be crawled, summarized, cited, or acted on, you lose visibility before a human even clicks.
        </p>
      </section>

      <div className="feature-grid compact">
        {benefits.map(({ icon: Icon, text }) => (
          <article className="feature-card" key={text}>
            <span className="icon-box">
              <Icon size={18} />
            </span>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
