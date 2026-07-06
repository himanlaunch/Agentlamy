export default function InstantLoading() {
  return (
    <section className="stack-list" aria-busy="true" aria-label="Scanning…">
      <div className="hero-card">
        <p className="eyebrow skeleton skeleton-inline" style={{ width: 80 }}>&nbsp;</p>
        <div className="skeleton" style={{ height: 32, width: "55%", borderRadius: 6, margin: "8px 0" }} />
        <div className="skeleton" style={{ height: 18, width: "35%", borderRadius: 6 }} />
      </div>

      <div className="score-grid" style={{ marginTop: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <article className="score-card" key={i} style={{ minHeight: 110 }}>
            <div className="skeleton" style={{ height: 16, width: "60%", borderRadius: 4, marginBottom: 10 }} />
            <div className="skeleton" style={{ height: 28, width: "40%", borderRadius: 4, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 12, width: "80%", borderRadius: 4 }} />
          </article>
        ))}
      </div>

      <div className="panel" style={{ padding: 24 }}>
        <div className="skeleton" style={{ height: 16, width: "30%", borderRadius: 4, marginBottom: 14 }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div className="skeleton" style={{ height: 12, width: `${75 + i * 5}%`, borderRadius: 4, marginBottom: 10 }} key={i} />
        ))}
      </div>

      <p className="meta" style={{ textAlign: "center", color: "var(--ink-faint)", paddingBottom: 24 }}>
        Crawling and scoring — this takes 10–30 seconds…
      </p>
    </section>
  );
}
