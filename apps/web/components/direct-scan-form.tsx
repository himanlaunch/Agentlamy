"use client";

import Link from "next/link";
import type { Route } from "next";
import { Globe2, Loader2, Plus } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { normalizeHttpUrl } from "@/lib/url";

type CompetitorSuggestion = {
  url: string;
  domain: string;
  title: string;
  snippet: string;
  reason: string;
  sourceQuery: string;
};

function splitList(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function displayUrl(value: string) {
  try {
    const parsed = new URL(value);
    const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return `${parsed.origin}${path}`;
  } catch {
    return value;
  }
}

export function DirectScanForm({
  defaultUrl = "",
  defaultArea = "",
  defaultFocus = "",
  defaultCompetitors = "",
}: {
  defaultUrl?: string;
  defaultArea?: string;
  defaultFocus?: string;
  defaultCompetitors?: string;
}) {
  const [url, setUrl] = useState(defaultUrl);
  const [area, setArea] = useState(defaultArea);
  const [focus, setFocus] = useState(defaultFocus);
  const [manualCompetitors, setManualCompetitors] = useState(defaultCompetitors);
  const [suggestions, setSuggestions] = useState<CompetitorSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [discoverError, setDiscoverError] = useState("");
  const [competitorsOpen, setCompetitorsOpen] = useState(Boolean(defaultCompetitors));

  const combinedCompetitors = useMemo(() => {
    const unique = new Set<string>([
      ...selectedSuggestions,
      ...splitList(manualCompetitors),
    ]);
    return [...unique].join("\n");
  }, [manualCompetitors, selectedSuggestions]);

  async function handleDiscoverCompetitors() {
    const normalizedUrl = validateUrl(url);
    if (!normalizedUrl) {
      setDiscoverError("Enter a valid website URL before finding competitors.");
      return;
    }

    setDiscoverError("");
    setIsDiscovering(true);

    try {
      const response = await fetch("/api/competitor-discovery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: normalizedUrl,
          area,
          focus,
          limit: 6,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Competitor discovery failed.");
      }

      const nextSuggestions = (payload.suggestions || []) as CompetitorSuggestion[];
      if (!nextSuggestions.length) {
        throw new Error("No direct competitors were found. Try adding an area or industry to narrow the search.");
      }
      setSuggestions(nextSuggestions);
      setSelectedSuggestions(nextSuggestions.slice(0, 3).map((item) => item.url));
    } catch (error) {
      setDiscoverError(error instanceof Error ? error.message : "Competitor discovery failed.");
    } finally {
      setIsDiscovering(false);
    }
  }

  function toggleSuggestion(urlValue: string) {
    setSelectedSuggestions((current) =>
      current.includes(urlValue)
        ? current.filter((item) => item !== urlValue)
        : [...current, urlValue]
    );
  }

  function validateUrl(value: string) {
    if (!value.trim()) {
      setUrlError("Enter a website URL to scan.");
      return null;
    }

    const normalizedUrl = normalizeHttpUrl(value);
    if (!normalizedUrl) {
      setUrlError("Enter a valid website URL or domain.");
      return null;
    }

    setUrlError("");
    return normalizedUrl;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const normalizedUrl = validateUrl(url);
    if (!normalizedUrl) {
      event.preventDefault();
      return;
    }

    setUrl(normalizedUrl);
    const input = event.currentTarget.elements.namedItem("url");
    if (input instanceof HTMLInputElement) {
      input.value = normalizedUrl;
    }
    setIsScanning(true);
  }

  return (
    <form
      className="apple-scan-form"
      action="/instant"
      method="get"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="hero-scan-zone">
        <p className="apple-eyebrow">Scanner</p>
        <h2>Run a live AEO and LLM visibility audit</h2>

        <div className="apple-url-row">
          <label className="apple-url-field" htmlFor="scan-url">
            <Globe2 size={16} aria-hidden="true" />
            <input
              id="scan-url"
              name="url"
              inputMode="url"
              placeholder="Paste your website or docs URL..."
              required
              type="text"
              value={url}
              aria-describedby={urlError ? "scan-url-error" : "scan-url-hint"}
              aria-invalid={urlError ? "true" : "false"}
              onBlur={() => {
                if (url.trim()) validateUrl(url);
              }}
              onChange={(event) => {
                setUrl(event.target.value);
                if (urlError) validateUrl(event.target.value);
              }}
            />
          </label>
          <button
            aria-expanded={competitorsOpen}
            className="competitor-toggle url-competitor-toggle"
            onClick={() => setCompetitorsOpen((current) => !current)}
            type="button"
          >
            <span>Add competitors</span>
            <span className="plus-button" aria-hidden="true">
              <Plus size={14} />
            </span>
          </button>
        </div>
        {urlError ? (
          <p className="apple-error" id="scan-url-error" role="alert">{urlError}</p>
        ) : (
          <p className="sr-only" id="scan-url-hint">Paste a public website, docs, or service page URL.</p>
        )}

        <section className={`competitor-accordion ${competitorsOpen ? "open" : ""}`}>
          <div className="competitor-panel" aria-hidden={!competitorsOpen}>
            <textarea
              id="manual-competitors"
              placeholder={"https://competitor-one.com\nhttps://competitor-two.com"}
              value={manualCompetitors}
              onChange={(event) => setManualCompetitors(event.target.value)}
              rows={4}
            />
            <button
              className="find-auto-link"
              disabled={isDiscovering}
              onClick={handleDiscoverCompetitors}
              type="button"
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="spin" size={13} aria-hidden="true" />
                  Finding automatically
                </>
              ) : (
                "Find automatically"
              )}
            </button>
            {urlError ? (
              <p className="apple-error" role="alert">{urlError}</p>
            ) : null}
            {discoverError ? <p className="apple-error" role="alert">{discoverError}</p> : null}

            {suggestions.length ? (
              <div className="apple-suggestion-list">
                {suggestions.map((suggestion) => {
                  const checked = selectedSuggestions.includes(suggestion.url);
                  return (
                    <label className="apple-suggestion" key={suggestion.url}>
                      <input
                        checked={checked}
                        onChange={() => toggleSuggestion(suggestion.url)}
                        type="checkbox"
                      />
                      <span>
                        <strong className="apple-suggestion-url">{displayUrl(suggestion.url)}</strong>
                        <small className="apple-suggestion-title">
                          {suggestion.title || suggestion.domain}
                        </small>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>

        <div className="apple-secondary-fields">
          <label htmlFor="scan-area">
            <input
              id="scan-area"
              name="area"
              placeholder="Geography (e.g. UK, Singapore)"
              value={area}
              onChange={(event) => setArea(event.target.value)}
            />
          </label>
          <label htmlFor="scan-focus">
            <input
              id="scan-focus"
              name="focus"
              placeholder="Industry or product type"
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
            />
          </label>
        </div>

        <input name="competitors" type="hidden" value={combinedCompetitors} />

        <div className="apple-actions">
          <button className="apple-primary-button" disabled={isScanning || isDiscovering} type="submit">
            {isScanning ? "Scanning..." : "Scan URL"}
          </button>
          <Link className="apple-secondary-button" href={"/batch" as Route}>
            Batch scan
          </Link>
        </div>
      </div>
    </form>
  );
}
