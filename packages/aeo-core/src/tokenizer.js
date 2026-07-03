import { encode } from 'gpt-tokenizer';

/**
 * Count tokens in a text string using the GPT tokenizer.
 * Falls back to character-based estimation if tokenizer fails.
 */
export function countTokens(text) {
  if (!text || text.length === 0) return 0;

  try {
    const tokens = encode(text);
    return tokens.length;
  } catch {
    // Fallback: ~4 chars per token for English text
    return Math.ceil(text.length / 4);
  }
}

/**
 * Token budget thresholds for different documentation types.
 */
export const TOKEN_THRESHOLDS = {
  quickstart: 15_000,
  apiReference: 25_000,
  conceptGuide: 20_000,
  general: 30_000,
  critical: 50_000,   // Absolutely should not exceed
};

/**
 * Classify a page's token count and return severity.
 */
export function classifyTokenCount(tokens) {
  if (tokens <= TOKEN_THRESHOLDS.quickstart) {
    return { level: 'excellent', label: 'Excellent - fits easily in agent context' };
  }
  if (tokens <= TOKEN_THRESHOLDS.apiReference) {
    return { level: 'good', label: 'Good - manageable for most agents' };
  }
  if (tokens <= TOKEN_THRESHOLDS.general) {
    return { level: 'warning', label: 'Large - may cause context pressure for agents' };
  }
  if (tokens <= TOKEN_THRESHOLDS.critical) {
    return { level: 'danger', label: 'Very large - likely to be truncated or skipped' };
  }
  return { level: 'critical', label: 'Critical - exceeds most agent context windows' };
}
