"use client";

import Link from "next/link";
import { Download, LayoutList, Loader2, Play, StopCircle } from "lucide-react";
import { useMemo, useRef, useState } from "react";

type BatchScanSummary = {
  url: string;
  area: string;
  focusTerms: string[];
  elapsedMs: number;
  score: {
    weighted: number;
    max: number;
    percentage: number;
    grade: string;
  };
  visibility: {
    llm: number;
    agent: number;
    marketSummary: string;
    recommendations: string[];
    provider: string | null;
  };
  counts: {
    pages: number;
    fetched: number;
    errors: number;
    warnings: number;
    infos: number;
  };
  categories: Array<{
    key: string;
    name: string;
    percentage: number;
    score: number;
    maxScore: number;
  }>;
  topFindings: Array<{
    checker: string;
    checkerName: string;
    severity: string;
    message: string;
    fix?: string;
  }>;
  largestPages: Array<{
    url: string;
    title: string;
    tokenCount: number;
  }>;
  artifactKinds: string[];
};

type BatchScanResult =
  | {
      status: "success";
      url: string;
      summary: BatchScanSummary;
    }
  | {
      status: "error";
      url: string;
      error: string;
    };

const MAX_BATCH_URLS = 500;

function splitUrls(value: string) {
  return [...new Set(
    value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
  )];
}

function buildInstantHref(url: string, area: string, focus: string) {
  const params = new URLSearchParams({ url });
  if (area.trim()) params.set("area", area.trim());
  if (focus.trim()) params.set("focus", focus.trim());
  return `/instant?${params.toString()}`;
}

function downloadText(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

function toCsv(results: BatchScanResult[]) {
  const headers = [
    "url",
    "status",
    "grade",
    "aeo_percentage",
    "llm_visibility",
    "agent_visibility",
    "pages_fetched",
    "errors",
    "warnings",
    "infos",
    "elapsed_ms",
    "top_findings",
  ];

  const rows = results.map((result) => {
    if (result.status === "error") {
      return [
        result.url,
        result.status,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        result.error,
      ];
    }

    return [
      result.url,
      result.status,
      result.summary.score.grade,
      String(result.summary.score.percentage),
      String(result.summary.visibility.llm),
      String(result.summary.visibility.agent),
      String(result.summary.counts.fetched),
      String(result.summary.counts.errors),
      String(result.summary.counts.warnings),
      String(result.summary.counts.infos),
      String(result.summary.elapsedMs),
      result.summary.topFindings.map((finding) => `${finding.checkerName}: ${finding.message}`).join(" | "),
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll("\"", "\"\"")}"`).join(","))
    .join("\n");
}

export function BatchScanRunner({
  providerAvailable,
}: {
  providerAvailable: boolean;
}) {
  const [urlsInput, setUrlsInput] = useState("");
  const [area, setArea] = useState("");
  const [focus, setFocus] = useState("");
  const [concurrency, setConcurrency] = useState(3);
  const [pageBudget, setPageBudget] = useState(12);
  const [includeAi, setIncludeAi] = useState(providerAvailable);
  const [results, setResults] = useState<BatchScanResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const [lastAnnouncement, setLastAnnouncement] = useState("");
  const stopRequested = useRef(false);

  const parsedUrls = useMemo(() => splitUrls(urlsInput), [urlsInput]);
  const cappedUrls = parsedUrls.slice(0, MAX_BATCH_URLS);
  const droppedCount = Math.max(0, parsedUrls.length - cappedUrls.length);
  const progress = cappedUrls.length ? Math.round((completed / cappedUrls.length) * 100) : 0;
  const successResults = results.filter((result): result is Extract<BatchScanResult, { status: "success" }> => result.status === "success");
  const failedResults = results.filter((result): result is Extract<BatchScanResult, { status: "error" }> => result.status === "error");
  const averageScore = successResults.length
    ? Math.round(successResults.reduce((sum, result) => sum + result.summary.score.percentage, 0) / successResults.length)
    : 0;

  async function runSingleScan(url: string) {
    const response = await fetch("/api/public-scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        area,
        focus,
        pageBudget,
        includeAi,
        includeArtifacts: false,
      }),
    });

    const payload = await response.json();
    if (!response.ok || !payload?.ok || !payload?.summary) {
      throw new Error(payload?.error || `Scan failed for ${url}.`);
    }

    return payload.summary as BatchScanSummary;
  }

  async function startBatchScan() {
    if (!cappedUrls.length) {
      setError("Add at least one valid URL to start a batch scan.");
      return;
    }

    setError("");
    setResults([]);
    setCompleted(0);
    setActive(0);
    setIsRunning(true);
    stopRequested.current = false;

    const queue = [...cappedUrls];
    const workerCount = Math.max(1, Math.min(concurrency, queue.length));

    const workers = Array.from({ length: workerCount }, async () => {
      while (queue.length && !stopRequested.current) {
        const nextUrl = queue.shift();
        if (!nextUrl) return;

        setActive((value) => value + 1);
        try {
          const summary = await runSingleScan(nextUrl);
          setResults((current) => [...current, { status: "success", url: nextUrl, summary }]);
          setLastAnnouncement(`Scan complete for ${nextUrl}`);
        } catch (scanError) {
          setResults((current) => [
            ...current,
            {
              status: "error",
              url: nextUrl,
              error: scanError instanceof Error ? scanError.message : "Scan failed.",
            },
          ]);
          setLastAnnouncement(`Scan failed for ${nextUrl}`);
        } finally {
          setCompleted((value) => value + 1);
          setActive((value) => Math.max(0, value - 1));
        }
      }
    });

    await Promise.all(workers);
    setIsRunning(false);
  }

  function stopBatchScan() {
    stopRequested.current = true;
  }

  function exportJson() {
    downloadText(
      "aeo-batch-report.json",
      JSON.stringify(
        {
          area,
          focus,
          concurrency,
          pageBudget,
          generatedAt: new Date().toISOString(),
          results,
        },
        null,
        2
      ),
      "application/json"
    );
  }

  function exportCsv() {
    downloadText("aeo-batch-report.csv", toCsv(results), "text/csv;charset=utf-8");
  }

  return (
    <div className="stack-list batch-runner">
      <div aria-live="polite" className="sr-only">
        {lastAnnouncement}
      </div>
      <section className="hero">
        <div className="hero-card">
          <p className="eyebrow">Batch Scanner</p>
          <h2>Scan hundreds of websites in one run.</h2>
          <p>
            Paste a long URL list and the browser will coordinate many small live scans against the public API,
            which is much safer than one huge Vercel request. You still get a separate report summary for each site,
            plus exports you can hand off to a team.
          </p>
          <div className="row-wrap">
            <span className="badge">Hundreds of URLs</span>
            <span className="badge">Controlled concurrency</span>
            <span className={`badge ${providerAvailable ? "" : "warn"}`}>
              {providerAvailable ? "AI visibility available" : "Heuristic visibility mode"}
            </span>
          </div>
        </div>

        <section className="panel stack-list">
          <div>
            <p className="eyebrow">How it works</p>
            <h3>One report per website</h3>
          </div>
          <p className="subtle">
            Batch mode scans each site independently, records score, visibility, counts, biggest pages, and top findings,
            then keeps going even if some URLs fail. Open any row in the instant scanner when you want the full deep-dive page.
          </p>
          <div className="row-wrap">
            <Link className="secondary-button" href="/">
              Single scan
            </Link>
            <Link className="secondary-button" href="/instant">
              Instant report page
            </Link>
          </div>
        </section>
      </section>

      <section className="dashboard-grid">
        <form
          id="batch-scan-form"
          className="panel stack-form"
          onSubmit={(event) => {
            event.preventDefault();
            void startBatchScan();
          }}
        >
          <div>
            <p className="eyebrow">Batch Inputs</p>
            <h3>Paste one URL per line</h3>
          </div>

          <label>
            <span>Website URLs</span>
            <textarea
              rows={14}
              placeholder={"https://docs.example.com\nhttps://www.example.org\nhttps://help.example.net"}
              value={urlsInput}
              onChange={(event) => setUrlsInput(event.target.value)}
            />
          </label>

          <label>
            <span>Area or location</span>
            <input
              placeholder="Chicago, Texas, UK, Singapore"
              value={area}
              onChange={(event) => setArea(event.target.value)}
            />
          </label>

          <label>
            <span>Products or services</span>
            <input
              placeholder="SEO agency, payroll software, dental clinic"
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
            />
          </label>

          <div className="lists-grid">
            <label>
              <span>Concurrent scans</span>
              <select
                value={String(concurrency)}
                onChange={(event) => setConcurrency(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Pages per site</span>
              <select
                value={String(pageBudget)}
                onChange={(event) => setPageBudget(Number(event.target.value))}
              >
                {[8, 10, 12, 15, 20].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={includeAi}
              disabled={!providerAvailable}
              onChange={(event) => setIncludeAi(event.target.checked)}
            />
            <span>Use configured AI provider for richer visibility scoring</span>
          </label>

          <p className="subtle">
            Recommended for large runs: keep concurrency between 2 and 4, and use 8 to 12 pages per site for faster throughput.
            {droppedCount ? ` Only the first ${MAX_BATCH_URLS} URLs will be scanned in one run.` : ""}
          </p>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="row-wrap">
            <button className="primary-button" disabled={isRunning} type="submit">
              {isRunning ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
              {isRunning ? "Scanning batch..." : "Start batch scan"}
            </button>
            <button
              className="secondary-button"
              disabled={!isRunning}
              onClick={stopBatchScan}
              type="button"
            >
              <StopCircle size={16} aria-hidden="true" />
              Stop after active scans
            </button>
          </div>
        </form>

        <section className="panel stack-list">
          <div>
            <p className="eyebrow">Run Status</p>
            <h3>Progress and exports</h3>
          </div>

          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="metrics-grid">
            <article className="metric-card">
              <span className="eyebrow">Queued</span>
              <strong className="metric-value">{cappedUrls.length}</strong>
              <p className="meta">Unique URLs ready for the current run.</p>
            </article>
            <article className="metric-card">
              <span className="eyebrow">Completed</span>
              <strong className="metric-value">{completed}</strong>
              <p className="meta">{progress}% of the current batch finished.</p>
            </article>
            <article className="metric-card">
              <span className="eyebrow">Active</span>
              <strong className="metric-value">{active}</strong>
              <p className="meta">Scans in flight right now.</p>
            </article>
            <article className="metric-card">
              <span className="eyebrow">Average AEO</span>
              <strong className="metric-value">{averageScore}%</strong>
              <p className="meta">Average score across successful results.</p>
            </article>
          </div>

          <div className="row-wrap">
            <span className="badge">Success {successResults.length}</span>
            <span className={`badge ${failedResults.length ? "warn" : ""}`}>Failed {failedResults.length}</span>
            <button className="secondary-button" disabled={!results.length} onClick={exportJson} type="button">
              <Download size={16} aria-hidden="true" />
              Export JSON
            </button>
            <button className="secondary-button" disabled={!results.length} onClick={exportCsv} type="button">
              <Download size={16} aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </section>
      </section>

      <section className="panel stack-list">
        <div className="split-header">
          <div>
            <p className="eyebrow">Batch Results</p>
            <h3>Per-site reports</h3>
          </div>
          <p className="meta">
            {results.length
              ? "Newest results appear as each scan finishes."
              : "Results will show up here as soon as the first site completes."}
          </p>
        </div>

        <div className="stack-list">
          {results.length ? (
            results.map((result) => (
              result.status === "error" ? (
                <article className="artifact-card" key={`${result.url}-error`}>
                  <div className="row">
                    <strong>{result.url}</strong>
                    <span className="badge fail">scan failed</span>
                  </div>
                  <p className="form-error">{result.error}</p>
                </article>
              ) : (
                <article className="artifact-card" key={result.url}>
                  <div className="row">
                    <strong>{result.url}</strong>
                    <span className="badge">{result.summary.score.grade} / {result.summary.score.percentage}%</span>
                  </div>
                  <div className="row-wrap">
                    <span className="badge">LLM {result.summary.visibility.llm}%</span>
                    <span className="badge">Agent {result.summary.visibility.agent}%</span>
                    <span className="badge">Pages {result.summary.counts.fetched}</span>
                    <span className={`badge ${result.summary.counts.errors ? "fail" : ""}`}>Errors {result.summary.counts.errors}</span>
                    <span className={`badge ${result.summary.counts.warnings ? "warn" : ""}`}>Warnings {result.summary.counts.warnings}</span>
                    <span className="badge">{Math.round(result.summary.elapsedMs / 100) / 10}s</span>
                  </div>
                  <p className="subtle">{result.summary.visibility.marketSummary}</p>

                  <div className="lists-grid">
                    <article className="list-card">
                      <p className="eyebrow">Top Findings</p>
                      <div className="stack-list">
                        {result.summary.topFindings.length ? (
                          result.summary.topFindings.map((finding, index) => (
                            <p key={`${result.url}-finding-${index}`}>{finding.checkerName}: {finding.message}</p>
                          ))
                        ) : (
                          <p className="empty-state">No major findings were returned.</p>
                        )}
                      </div>
                    </article>

                    <article className="list-card">
                      <p className="eyebrow">Largest Pages</p>
                      <div className="stack-list">
                        {result.summary.largestPages.length ? (
                          result.summary.largestPages.map((page) => (
                            <p key={page.url}>{page.title}: {page.tokenCount.toLocaleString()} tokens</p>
                          ))
                        ) : (
                          <p className="empty-state">No pages were captured.</p>
                        )}
                      </div>
                    </article>
                  </div>

                  <div className="row-wrap">
                    {result.summary.visibility.recommendations.map((recommendation, index) => (
                      <span className="badge" key={`${result.url}-recommendation-${index}`}>{recommendation}</span>
                    ))}
                  </div>

                  <div className="row-wrap">
                    <a className="secondary-button" href={buildInstantHref(result.url, area, focus)}>
                      Open full instant report
                    </a>
                    {result.summary.artifactKinds.length ? (
                      <span className="badge">Artifacts {result.summary.artifactKinds.join(", ")}</span>
                    ) : null}
                  </div>
                </article>
              )
            ))
          ) : (
            <div className="batch-empty-state">
              <span className="icon-box strong">
                <LayoutList size={24} aria-hidden="true" />
              </span>
              <h3>No results yet</h3>
              <p>Paste URLs above and start the batch scan. Each site gets its own report, and exports unlock as soon as results arrive.</p>
              <div className="batch-steps">
                <span>1. Paste URLs</span>
                <span>2. Tune crawl size</span>
                <span>3. Export results</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="batch-action-bar">
        <div className="batch-action-progress">
          {cappedUrls.length ? (
            <>
              <div className="progress-track" aria-hidden="true">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <span>{completed} / {cappedUrls.length} sites</span>
            </>
          ) : (
            <span>Add URLs to start a batch scan.</span>
          )}
        </div>
        <div className="row-wrap">
          {isRunning ? (
            <button className="secondary-button danger-button" onClick={stopBatchScan} type="button">
              <StopCircle size={16} aria-hidden="true" />
              Stop scan
            </button>
          ) : (
            <button className="primary-button" disabled={!cappedUrls.length} form="batch-scan-form" type="submit">
              <Play size={16} aria-hidden="true" />
              Start batch scan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
