export function normalizeHttpUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    parsed.hash = "";
    return parsed.href;
  } catch {
    return null;
  }
}

export function isValidHttpUrl(value?: string | null) {
  return Boolean(normalizeHttpUrl(value));
}
