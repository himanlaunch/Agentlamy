"use client";

import { useState, useTransition } from "react";

export function ScanActionButton({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="stack-inline">
      <button
        className="primary-button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const response = await fetch("/api/scans", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ projectId }),
            });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
              setError(body.error || "Unable to start scan.");
              return;
            }
            window.location.assign(`/scans/${body.scan.id}`);
          })
        }
      >
        {isPending ? "Queuing scan..." : "Run scan"}
      </button>
      {error ? <span className="form-error">{error}</span> : null}
    </div>
  );
}

export function RemediationButton({ scanId }: { scanId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="stack-inline">
      <button
        className="secondary-button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const response = await fetch(`/api/scans/${scanId}/remediate`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                artifactKinds: [
                  "llms.txt",
                  "skill.md",
                  "AGENTS.md",
                  "robots.txt",
                  "copy-for-ai",
                  "remediation-summary",
                ],
              }),
            });
            if (!response.ok) {
              const body = await response.json().catch(() => ({}));
              setMessage(body.error || "Unable to generate remediation.");
              return;
            }
            setMessage("Remediation drafts generated. Refreshing...");
            window.location.reload();
          })
        }
      >
        {isPending ? "Generating..." : "Generate remediation"}
      </button>
      {message ? <span className="form-note">{message}</span> : null}
    </div>
  );
}
