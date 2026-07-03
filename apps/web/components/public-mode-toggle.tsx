"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";

const STORAGE_KEY = "aeo-public-mode";

export function PublicModeToggle() {
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    setIsPublic(localStorage.getItem(STORAGE_KEY) !== "false");
  }, []);

  function toggleMode() {
    setIsPublic((current) => {
      const next = !current;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <button
      aria-label={isPublic ? "Public mode is on. Click to switch to private mode." : "Private mode is on. Click to switch to public mode."}
      aria-pressed={isPublic}
      className={`public-mode-toggle ${isPublic ? "active" : ""}`}
      onClick={toggleMode}
      title={isPublic ? "Anyone with the scan link can view results." : "Scans are marked private in this browser."}
      type="button"
    >
      <BarChart3 size={16} aria-hidden="true" />
      {isPublic ? "Public mode" : "Private mode"}
    </button>
  );
}
