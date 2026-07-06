import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Crosshair, Search } from "lucide-react";

export default function NotFound() {
  return (
    <section className="not-found-page">
      <div className="not-found-mark">
        <span aria-hidden="true">404</span>
        <div>
          <Crosshair size={30} aria-hidden="true" />
        </div>
      </div>
      <h2>This page could not be found</h2>
      <p>The URL may be outdated or the page may have moved. Head back to the scanner and run a fresh audit.</p>
      <div className="row-wrap center">
        <Link className="primary-button" href="/">
          <Search size={16} />
          Run a scan
        </Link>
        <Link className="secondary-button" href="/batch">
          <ArrowLeft size={16} />
          Batch scanner
        </Link>
      </div>
      <nav className="helpful-links" aria-label="Helpful links">
        <Link href="/">Scanner</Link>
        <Link href={"/batch" as Route}>Batch</Link>
        <Link href={"/demo" as Route}>Demo</Link>
        <Link href={"/about" as Route}>About</Link>
        <Link href={"/pricing" as Route}>Pricing</Link>
        <Link href={"/status" as Route}>Status</Link>
        <Link href={"/dashboard" as Route}>Dashboard</Link>
      </nav>
    </section>
  );
}
