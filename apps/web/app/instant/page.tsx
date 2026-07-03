import Link from "next/link";
import { ArrowLeft, BadgeCheck, Bot, BrainCircuit, Building2, CircleAlert, ClipboardCheck, Crosshair, FileText, Gauge, MapPin, Route, SearchCheck, Sparkles, Trophy } from "lucide-react";
import { DirectScanForm } from "@/components/direct-scan-form";
import { ReportExportActions } from "@/components/report-export-actions";
import { isValidHttpUrl, PublicScanResult, scanPublicUrl, splitList } from "@/lib/public-scan";

function scoreTone(score: number) {
  if (score >= 80) return "good";
  if (score >= 55) return "warn";
  return "fail";
}

function extractHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function makeReadinessSignals({
  report,
  visibility,
  focusTerms,
  areaValue,
}: {
  report: PublicScanResult["report"];
  visibility: PublicScanResult["visibility"];
  focusTerms: string[];
  areaValue: string;
}) {
  const discovery = report.categories.discovery?.percentage ?? report.percentage;
  const capability = report.categories["capability-signaling"]?.percentage ?? report.percentage;
  const structure = report.categories["content-structure"]?.percentage ?? report.percentage;
  const tokenRisk = report.pages.some((page) => page.tokenCount > 30000);
  const hasMarketContext = Boolean(areaValue || focusTerms.length || visibility.productsServices.length);

  return [
    {
      label: "Answer share",
      value: visibility.llmVisibilityScore,
      icon: SearchCheck,
      detail: `${visibility.agentQueries.length} prompts modeled for this market.`,
    },
    {
      label: "Agent utility",
      value: visibility.agentVisibilityScore,
      icon: Bot,
      detail: `${capability}% capability signaling score.`,
    },
    {
      label: "Crawl trust",
      value: discovery,
      icon: Gauge,
      detail: `${report.crawlSummary?.pagesFetched ?? report.pages.length} pages fetched from public URLs.`,
    },
    {
      label: "Context fit",
      value: tokenRisk ? Math.max(0, structure - 18) : structure,
      icon: BrainCircuit,
      detail: tokenRisk ? "One or more pages exceeds the safe 30K token target." : "No oversized page crossed the 30K token warning line.",
    },
    {
      label: "Business facts",
      value: hasMarketContext ? Math.min(100, visibility.llmVisibilityScore + 8) : Math.max(0, visibility.llmVisibilityScore - 12),
      icon: Building2,
      detail: hasMarketContext ? "Market and service context is available for grounding." : "Add services and area to improve grounding.",
    },
  ];
}

function makeCanonicalFacts({
  scanUrl,
  visibility,
  focusTerms,
  areaValue,
}: {
  scanUrl: string;
  visibility: PublicScanResult["visibility"];
  focusTerms: string[];
  areaValue: string;
}) {
  return [
    { label: "Brand", value: visibility.brandName || extractHost(scanUrl), icon: Building2 },
    { label: "Market", value: visibility.area || areaValue || "Unspecified", icon: MapPin },
    { label: "Services", value: (visibility.productsServices.length ? visibility.productsServices : focusTerms).join(", ") || "Needs clearer service language", icon: BadgeCheck },
    { label: "Audience", value: visibility.targetAudience || "AI-assisted buyers and agents", icon: Crosshair },
  ];
}

function makeConversionChecks(report: PublicScanResult["report"]) {
  const joined = report.pages.map((page) => `${page.title || ""} ${page.introText || ""} ${page.url}`).join(" ").toLowerCase();
  return [
    {
      label: "Contact path",
      ok: /\b(contact|sales|demo|quote|book|schedule)\b/.test(joined),
      detail: "Agents need a direct next step to recommend or complete the buyer journey.",
    },
    {
      label: "Pricing or plan clue",
      ok: /\b(pricing|price|plans|cost|quote|estimate)\b/.test(joined),
      detail: "Commercial clarity improves comparison answers and reduces hallucinated pricing.",
    },
    {
      label: "Documentation source",
      ok: /\b(docs|documentation|api|guide|help|learn|support)\b/.test(joined),
      detail: "Support or docs pages give agents safer grounding material.",
    },
  ];
}

export default async function InstantScanPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; area?: string; focus?: string; competitors?: string }>;
}) {
  const { url, area, focus, competitors } = await searchParams;
  const scanUrl = typeof url === "string" ? url : "";
  const areaValue = typeof area === "string" ? area : "";
  const focusValue = typeof focus === "string" ? focus : "";
  const competitorsValue = typeof competitors === "string" ? competitors : "";
  const focusTerms = splitList(focusValue);

  if (!isValidHttpUrl(scanUrl)) {
    return (
      <section className="stack-list">
        <div className="hero-card">
          <p className="eyebrow">Direct Scanner</p>
          <h2>Run an AEO audit without signing in</h2>
          <p>Paste any public documentation URL, define the service and area you care about, and compare your site with competitors inside one LLM visibility report.</p>
        </div>
        <DirectScanForm
          defaultUrl={scanUrl}
          defaultArea={areaValue}
          defaultFocus={focusValue}
          defaultCompetitors={competitorsValue}
        />
      </section>
    );
  }

  let scanResult: PublicScanResult | null = null;
  let error: string | null = null;

  try {
    scanResult = await scanPublicUrl({
      url: scanUrl,
      area: areaValue,
      focus: focusValue,
      competitors: competitorsValue,
      pageBudget: 20,
      includeAi: true,
      includeArtifacts: true,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Unable to scan this URL.";
  }

  if (error || !scanResult) {
    return (
      <section className="stack-list">
        <div className="hero-card">
          <p className="eyebrow">Scan Error</p>
          <h2>That URL could not be scanned</h2>
          <p>{error || "Unknown error"}</p>
          <div className="row-wrap">
            <Link className="secondary-button" href="/">
              Try another URL
            </Link>
          </div>
        </div>
        <DirectScanForm
          defaultUrl={scanUrl}
          defaultArea={areaValue}
          defaultFocus={focusValue}
          defaultCompetitors={competitorsValue}
        />
      </section>
    );
  }

  const { report, remediation, visibility, competitorReports } = scanResult;
  const categories = Object.values(report.categories);
  const topFindings = [...report.findings.errors, ...report.findings.warnings, ...report.findings.infos].slice(0, 12);
  const readinessSignals = makeReadinessSignals({ report, visibility, focusTerms, areaValue });
  const canonicalFacts = makeCanonicalFacts({ scanUrl, visibility, focusTerms, areaValue });
  const conversionChecks = makeConversionChecks(report);
  const competitorWinner = visibility.competitorInsights
    .filter((item) => item.relativePosition === "ahead")
    .sort((a, b) => b.relativeVisibilityScore - a.relativeVisibilityScore)[0];

  return (
    <section className="stack-list">
      <div className="report-header">
        <div>
          <p className="eyebrow">Instant Report</p>
          <h2>{visibility.brandName || extractHost(scanUrl)}</h2>
          <p className="url-line">{scanUrl}</p>
        </div>
        <div className={`grade-block ${scoreTone(report.percentage)}`}>
          <span>{report.grade}</span>
          <strong>{report.percentage}%</strong>
        </div>
      </div>

      <div className="report-toolbar">
        <div className="row-wrap">
          <span className="badge"><FileText size={14} /> Pages {report.pages.length}</span>
          <span className={`badge ${report.findings.errors.length ? "fail" : ""}`}><CircleAlert size={14} /> Errors {report.findings.errors.length}</span>
          <span className={`badge ${report.findings.warnings.length ? "warn" : ""}`}>Warnings {report.findings.warnings.length}</span>
          {areaValue ? <span className="badge"><MapPin size={14} /> {areaValue}</span> : null}
          {focusTerms.length ? <span className="badge">{focusTerms.join(", ")}</span> : null}
        </div>
        <Link className="secondary-button" href="/">
          <ArrowLeft size={16} />
          New scan
        </Link>
      </div>

      <section className="panel report-export-panel">
        <div>
          <p className="eyebrow">Export</p>
          <h3>Download this report</h3>
        </div>
        <ReportExportActions
          area={areaValue}
          focusTerms={focusTerms}
          scanResult={scanResult}
          scanUrl={scanUrl}
        />
      </section>

      <div className="score-grid">
        {readinessSignals.map((signal) => {
          const Icon = signal.icon;
          return (
            <article className={`score-card ${scoreTone(signal.value)}`} key={signal.label}>
              <div className="row">
                <span className="icon-box"><Icon size={18} /></span>
                <strong>{signal.value}%</strong>
              </div>
              <h3>{signal.label}</h3>
              <p className="meta">{signal.detail}</p>
              <div className="mini-meter" aria-hidden="true">
                <span style={{ width: `${signal.value}%` }} />
              </div>
            </article>
          );
        })}
      </div>

      <div className="detail-grid">
        <div className="stack-list">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">LLM / Agent Search</p>
                <h3>Answer visibility model</h3>
              </div>
              <span className={`badge ${visibility.provider ? "" : "warn"}`}>
                {visibility.provider ? `AI ${visibility.provider}` : "Heuristic"}
              </span>
            </div>
            {visibility ? (
              <div className="stack-list">
                <p>{visibility.marketSummary}</p>
                <div className="query-list">
                  {visibility.agentQueries.map((query) => (
                    <div className="query-pill" key={query}>
                      <Sparkles size={14} />
                      {query}
                    </div>
                  ))}
                </div>
                <div className="lists-grid">
                  <article className="list-card">
                    <p className="eyebrow">Strengths</p>
                    <div className="stack-list">
                      {visibility.strengths.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}
                    </div>
                  </article>
                  <article className="list-card">
                    <p className="eyebrow">Weaknesses</p>
                    <div className="stack-list">
                      {visibility.weaknesses.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}
                    </div>
                  </article>
                </div>
                <article className="list-card">
                  <p className="eyebrow">Recommendations</p>
                  <div className="stack-list">
                    {visibility.recommendations.map((item, index) => <p key={`${item}-${index}`}>{item}</p>)}
                  </div>
                </article>
              </div>
            ) : (
              <p className="empty-state">Detailed visibility analysis is unavailable because the scan did not complete.</p>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Business Facts</p>
                <h3>Canonical grounding layer</h3>
              </div>
              <ClipboardCheck size={19} />
            </div>
            <div className="fact-grid">
              {canonicalFacts.map((fact) => {
                const Icon = fact.icon;
                return (
                  <article className="fact-item" key={fact.label}>
                    <span className="icon-box"><Icon size={16} /></span>
                    <div>
                      <p className="eyebrow">{fact.label}</p>
                      <strong>{fact.value}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <div className="stack-list">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Competitor Delta</p>
                <h3>Why another site may be recommended</h3>
              </div>
              <Trophy size={19} />
            </div>
            <div className="stack-list">
              {competitorWinner ? (
                <article className="insight-banner">
                  <strong>{competitorWinner.brandName} is currently ahead.</strong>
                  <p>{competitorWinner.comparison}</p>
                </article>
              ) : null}
              <article className="compare-card target">
                <div className="row">
                  <strong>{visibility?.brandName || scanUrl}</strong>
                  <span className="badge">Target</span>
                </div>
                <p className="meta">{scanUrl}</p>
                <div className="row-wrap">
                  <span className="badge">AEO {report.percentage}%</span>
                  <span className="badge">LLM {visibility?.llmVisibilityScore ?? report.percentage}%</span>
                  <span className="badge">Agent {visibility?.agentVisibilityScore ?? report.percentage}%</span>
                </div>
              </article>
              {competitorReports.length ? (
                competitorReports.map((competitor) => {
                  const insight = visibility?.competitorInsights.find((item) => item.competitorUrl === competitor.url);
                  return (
                    <article className="artifact-card" key={competitor.url}>
                      <div className="row">
                        <strong>{insight?.brandName || competitor.report?.pages?.[0]?.title || competitor.url}</strong>
                        <span className={`badge ${insight?.relativePosition === "ahead" ? "warn" : insight?.relativePosition === "behind" ? "" : ""}`}>
                          {insight?.relativePosition || "competitor"}
                        </span>
                      </div>
                      <p className="meta">{competitor.url}</p>
                      {competitor.error ? (
                        <p className="form-error">{competitor.error}</p>
                      ) : (
                        <div className="row-wrap">
                          <span className="badge">AEO {competitor.report?.percentage ?? 0}%</span>
                          <span className="badge">Visibility {insight?.relativeVisibilityScore ?? competitor.report?.percentage ?? 0}%</span>
                        </div>
                      )}
                      {insight?.comparison ? <p className="subtle">{insight.comparison}</p> : null}
                    </article>
                  );
                })
              ) : (
                <p className="empty-state">Add competitor URLs in the form above to get a side-by-side benchmark.</p>
              )}
            </div>
          </section>

          <section className="panel">
            <p className="eyebrow">Platform Outlook</p>
            <h3>Estimated answer-share by assistant</h3>
            <div className="stack-list">
              {visibility?.platformScores.map((platform) => (
                <article className="platform-row" key={platform.platform}>
                  <div className="row">
                    <strong>{platform.platform}</strong>
                    <span className="badge">{platform.score}%</span>
                  </div>
                  <div className="mini-meter" aria-hidden="true">
                    <span style={{ width: `${platform.score}%` }} />
                  </div>
                  <p className="meta">{platform.explanation}</p>
                </article>
              )) || <p className="empty-state">Configure an AI provider for platform-specific visibility estimates.</p>}
            </div>
          </section>

          <section className="panel">
            <p className="eyebrow">Conversion Readiness</p>
            <h3>Can an agent send a buyer somewhere useful?</h3>
            <div className="stack-list">
              {conversionChecks.map((check) => (
                <article className={`check-row ${check.ok ? "good" : "warn"}`} key={check.label}>
                  <span className="status-dot" />
                  <div>
                    <strong>{check.label}</strong>
                    <p className="meta">{check.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="detail-grid">
        <div className="stack-list">
          <section className="panel">
            <p className="eyebrow">Category Breakdown</p>
            <h3>How the site scored</h3>
            <div className="stack-list">
              {categories.map((category) => (
                <article className="project-link" key={category.name}>
                  <div className="row">
                    <strong>{category.name}</strong>
                    <span className="badge">{category.percentage}%</span>
                  </div>
                  <p className="meta">
                    {category.score}/{category.maxScore}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <p className="eyebrow">Top Findings</p>
            <h3>What to fix first</h3>
            <div className="stack-list">
              {topFindings.map((finding, index) => (
                <article className={`finding-item ${finding.severity}`} key={`${finding.checker}-${index}`}>
                  <div className="row">
                    <strong>{finding.checkerName}</strong>
                    <span className={`badge ${finding.severity === "error" ? "fail" : finding.severity === "warning" ? "warn" : ""}`}>
                      {finding.severity}
                    </span>
                  </div>
                  <p>{finding.message}</p>
                  {finding.fix ? <p className="meta">{finding.fix}</p> : null}
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="stack-list">
          <section className="panel">
            <p className="eyebrow">Pages</p>
            <h3>Largest crawled pages</h3>
            <div className="stack-list">
              {[...report.pages]
                .sort((a, b) => b.tokenCount - a.tokenCount)
                .slice(0, 10)
                .map((page) => (
                  <article className="page-card" key={page.url}>
                    <div className="row">
                      <strong>{page.title || page.path || page.url}</strong>
                      <span className="badge">{page.tokenCount.toLocaleString()} tokens</span>
                    </div>
                    <p className="meta">{page.url}</p>
                    {page.introText ? <p className="subtle">{page.introText}</p> : null}
                  </article>
                ))}
            </div>
          </section>

          <section className="panel">
            <p className="eyebrow">AI Drafts</p>
            <h3>{remediation ? "Generated remediation" : "AI provider not configured"}</h3>
            <div className="stack-list">
              {remediation ? (
                remediation.artifacts.map((artifact) => (
                  <article className="artifact-card" key={artifact.kind}>
                    <div className="row">
                      <strong>{artifact.kind}</strong>
                      <span className="badge">{artifact.format}</span>
                    </div>
                    <pre>{artifact.content}</pre>
                  </article>
                ))
              ) : (
                <p className="empty-state">Set `AEO_PROVIDER_TYPE` and `AEO_PROVIDER_API_KEY` to generate llms.txt, AGENTS.md, skill.md, robots.txt, rewrite drafts, and detailed LLM visibility benchmarks.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
