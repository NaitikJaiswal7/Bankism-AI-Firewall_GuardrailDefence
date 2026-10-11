// ─── Input Normalization Stage ────────────────────────────────────────────────
// Detects Unicode anomalies, invisible chars, encoding tricks.
// NEVER silently strips and re-executes — suspicious text is flagged.

import { NormalizationMeta } from '../schema/verdict.js';

export interface NormalizeResult {
  original: string;
  normalized: string;
  meta: NormalizationMeta;
}

// Suspicious Unicode ranges and patterns
const INVISIBLE_CHAR_RANGES = [
  /[\u200B-\u200D]/g,  // Zero-width spaces
  /[\uFEFF]/g,          // BOM
  /[\u00AD]/g,          // Soft hyphen
  /[\u2028\u2029]/g,    // Line/paragraph separators
  /[\u180E]/g,          // Mongolian vowel separator
  /[\u2060-\u206F]/g,   // Word joiners
  /[\uE000-\uF8FF]/g,   // Private use area
];

const SUSPICIOUS_PATTERNS = [
  { pattern: /[\u0400-\u04FF]/g, label: 'Cyrillic characters' },
  { pattern: /[\u0370-\u03FF]/g, label: 'Greek homoglyphs' },
  { pattern: /[\u1D00-\u1DBF]/g, label: 'Phonetic extensions (homoglyphs)' },
  { pattern: /[\u2100-\u214F]/g, label: 'Letterlike symbols' },
  { pattern: /\\u[0-9a-fA-F]{4}/g, label: 'Unicode escape sequences' },
  { pattern: /%[0-9a-fA-F]{2}/g, label: 'URL-encoded characters' },
  { pattern: /&#[0-9]+;/g, label: 'HTML entity encoding' },
  { pattern: /&#x[0-9a-fA-F]+;/g, label: 'Hex HTML entity encoding' },
  { pattern: /[\u202A-\u202E]/g, label: 'Unicode directional overrides (BiDi)' },
  { pattern: /\t{3,}/g, label: 'Excessive tab whitespace' },
  { pattern: / {10,}/g, label: 'Excessive space whitespace' },
];

export function normalizeInput(raw: string): NormalizeResult {
  const original = raw;
  const foundPatterns: string[] = [];

  // Detect invisible chars
  let hasInvisible = false;
  for (const re of INVISIBLE_CHAR_RANGES) {
    if (re.test(original)) {
      hasInvisible = true;
      foundPatterns.push('Invisible/zero-width characters');
      break;
    }
  }

  // Detect suspicious patterns (don't strip — flag them)
  for (const { pattern, label } of SUSPICIOUS_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(original)) {
      foundPatterns.push(label);
    }
  }

  // Detect encoding anomalies (mixed encodings in a small text)
  const hasUnicodeEscapes = /\\u[0-9a-fA-F]{4}/.test(original);
  const hasUrlEncoding = /%[0-9a-fA-F]{2}/.test(original);
  const hasHtmlEntities = /&[#a-zA-Z][0-9a-zA-Z]*;/.test(original);
  const encodingAnomaly = hasUnicodeEscapes || hasUrlEncoding || hasHtmlEntities;

  // Produce inspection-safe normalized form:
  // - Collapse excessive whitespace
  // - Normalize line endings
  // - Do NOT remove suspicious chars (they stay for detection, just normalize display)
  let normalized = original
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/ {10,}/g, ' ')
    .replace(/\t{3,}/g, ' ')
    .trim();

  return {
    original,
    normalized,
    meta: {
      original_length: original.length,
      normalized_length: normalized.length,
      suspicious_unicode: foundPatterns.length > 0,
      invisible_chars_found: hasInvisible,
      encoding_anomaly: encodingAnomaly,
      suspicious_patterns: [...new Set(foundPatterns)],
    },
  };
}
