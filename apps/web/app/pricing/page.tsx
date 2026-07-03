import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing",
  description: "AEO Command pricing for public scans, batch audits, and future saved workspaces.",
};

const features = [
  "Unlimited single-site public scans",
  "Batch scanning for large URL lists",
  "Competitor discovery and comparison",
  "AEO crawl plus agent-readiness scoring",
  "JSON and CSV exports",
  "No sign-in required",
];

export default function PricingPage() {
  return (
    <section className="content-page narrow">
      <div className="content-header centered">
        <p className="eyebrow">Pricing</p>
        <h2>Free while in beta</h2>
        <p>Paid plans with saved workspaces, scheduled monitoring, and team sharing are planned. The public scanner remains open during beta.</p>
      </div>

      <article className="pricing-card">
        <div>
          <p className="eyebrow">Beta</p>
          <h3>Free</h3>
        </div>
        <div className="stack-list">
          {features.map((feature) => (
            <p className="feature-line" key={feature}>
              <CheckCircle2 size={17} aria-hidden="true" />
              {feature}
            </p>
          ))}
        </div>
        <Link className="primary-button full-width" href="/">
          Start scanning
        </Link>
      </article>
    </section>
  );
}
