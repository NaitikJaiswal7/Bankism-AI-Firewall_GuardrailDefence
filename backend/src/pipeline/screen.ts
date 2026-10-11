// ─── Threat Detection / Screening Stage ──────────────────────────────────────
// Layered heuristic detection for all required threat categories.
// Does NOT rely on a keyword blacklist alone — uses pattern context.

import { ThreatCategory } from '../schema/verdict.js';
import { NormalizationMeta } from '../schema/verdict.js';

export interface ScreenResult {
  threat_category: ThreatCategory;
  confidence: number;         // 0–1 heuristic confidence
  matched_signals: string[];  // Human-readable explanations
  is_memo_threat: boolean;    // Threat found in memo field specifically
}

// ─── Pattern Libraries ────────────────────────────────────────────────────────

// Instruction override patterns — direct prompt injection
const PROMPT_INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|above|prior|earlier)\s+(instructions?|prompts?|rules?|context)/i,
  /disregard\s+(your\s+)?(previous|above|prior)\s+(instructions?|rules?|context)/i,
  /forget\s+(everything|all|your\s+instructions|the\s+above)/i,
  /your\s+new\s+(instructions?|directive|role|task)\s+(is|are|will\s+be)/i,
  /system\s*:\s*(you\s+are|from\s+now|new\s+instructions)/i,
  /\[system\].*?(ignore|override|bypass)/i,
  /###\s*(new\s+)?instruction/i,
  /act\s+as\s+if\s+(you\s+have\s+no|you\s+don'?t\s+have|there\s+are\s+no)\s+(rules?|restrictions?|filters?)/i,
  /override\s+(security|safety|policy|authorization|verification|rules?|limits?)/i,
  /system\s+override/i,
  /bypass\s+(the\s+)?(verification|authentication|security|guardrail|filter|check|dual[\s\-]control)/i,
  /skip\s+(the\s+)?(verification|confirmation|security|check|validation|dual[\s\-]control)/i,
  /without\s+(dual[\s\-]control|confirmation|verification|authorization)/i,
  /you\s+are\s+now\s+(in\s+)?(developer|admin|root|god|unrestricted)\s+mode/i,
  /sudo\s+(transfer|send|pay|authorize|approve)/i,
  /--no-verify/i,
  /execute\s+(without|no)\s+(verification|approval|check)/i,
];

// Jailbreak patterns
const JAILBREAK_PATTERNS: RegExp[] = [
  /pretend\s+(you\s+are|to\s+be|that\s+you\s+are)\s+(a\s+)?(unrestricted|unfiltered|evil|DAN|jailbroken)/i,
  /you\s+are\s+(DAN|DAN\s+mode|jailbreak(ed)?|uncensored|unrestricted\s+AI)/i,
  /do\s+anything\s+now/i,
  /\bDAN\b/,
  /jailbreak/i,
  /roleplay\s+as\s+(a\s+)?(bank|financial|admin|system|no.restriction)/i,
  /in\s+this\s+story\s*[,:]?\s*(you\s+can|the\s+AI\s+can|pretend)/i,
  /hypothetically\s*[,]?\s*(if|what\s+if|suppose|assume)?.*?(bypass|ignore|send|transfer|authorize|no\s+security|no\s+rules)/i,
  /imagine\s+(you\s+are|that\s+you|there\s+are\s+no)\s+(restrictions?|rules?|limits?)/i,
  /for\s+(a\s+)?fictional\s+(story|scenario|game).*?(transfer|send|authorize|bank)/i,
  /\[unrestricted\]/i,
  /developer\s+mode\s+(enabled|activated|on)/i,
];

// Policy override attempts
const POLICY_OVERRIDE_PATTERNS: RegExp[] = [
  /disable\s+(transaction\s+)?(limit|verification|confirmation|auth)/i,
  /remove\s+(the\s+)?(transfer\s+)?(limit|cap|restriction|check)/i,
  /increase\s+(the\s+)?(limit|cap|maximum)\s+(to|by)\s+\$?[\d,]+/i,
  /approve\s+this\s+(transaction|transfer)\s+(without|no)\s+(check|verification|confirmation)/i,
  /transaction\s+limit[s]?\s+(should\s+be\s+|are\s+now\s+)?ignored/i,
  /\$?(100[\s,]?000|1[\s,]?000[\s,]?000)\s+(transfer|transaction|withdrawal)/i,
  /no\s+confirmation\s+(needed|required)/i,
  /waive\s+(the\s+)?(limit|confirmation|check|verification)/i,
];

// Memo injection patterns — instructions inside memos
const MEMO_INJECTION_PATTERNS: RegExp[] = [
  /memo:.*?(ignore|bypass|override|execute|authorize|transfer|pay)/i,
  /note:.*?(system|instruction|command|execute)/i,
  /\[memo\].*?(ignore|bypass|override)/i,
  /reference:.*?(instruction|command|system)/i,
];

// Obfuscation patterns
const OBFUSCATION_PATTERNS: RegExp[] = [
  /\\u[0-9a-fA-F]{4}.*\\u[0-9a-fA-F]{4}/i,  // Multiple unicode escapes
  /(%[0-9a-fA-F]{2}){2,}/i,                 // URL percent-encoding sequence
  /%20|%24|%75|%62|%6e/i,                   // Specific URL obfuscation markers
  /base64/i,
  /rot13/i,
  /atob|btoa/i,
  /encode.*decode/i,
  /[а-яёА-ЯЁ].*?(transfer|ignore|send|bypass)/i,  // Cyrillic mixing
  /[α-ωΑ-Ω].*?(transfer|ignore|send|bypass)/i,     // Greek mixing
];

// Data exfiltration patterns
const DATA_EXFILTRATION_PATTERNS: RegExp[] = [
  /show\s+(me\s+)?(all|every|your|the)\s+(account(s)?|balance(s)?|password|key|secret|token|credential)/i,
  /reveal\s+(your\s+)?(system\s+)?(prompt|instruction|context|password|key|secret)/i,
  /print\s+(your\s+)?(system\s+)?(prompt|instruction|context)/i,
  /what\s+(is|are)\s+(your\s+)?(system\s+)?(prompt|instruction|rules?|restrictions?)/i,
  /display\s+(all\s+)?(account|customer|user)\s+(data|information|records|details)/i,
  /list\s+(all\s+)?(account(s)?|customer(s)?|password(s)?|key(s)?)/i,
  /export\s+(all\s+)?.*?(customer|account|financial|user|database|records)/i,
  /send\s+(me\s+)?(the\s+)?(database|account|financial|confidential)\s+(dump|data|info|records)/i,
  /internal\s+(system\s+)?(prompt|instruction|config|setting)/i,
];

// Authentication bypass patterns
const AUTH_BYPASS_PATTERNS: RegExp[] = [
  /without\s+(any\s+)?(password|auth|authentication|verification|pin|otp)/i,
  /skip\s+(the\s+)?(login|auth|authentication|password|verification)/i,
  /as\s+(an\s+)?(admin|administrator|root|superuser|privileged)/i,
  /i\s+(am|have)\s+(admin|administrator|root|superuser|bank\s+employee|staff)\s+(access|privileges?|permission)/i,
  /admin\s+(override|bypass|access|mode)/i,
  /emergency\s+(override|bypass|access|mode)/i,
  /master\s+(password|key|override|bypass)/i,
];

// ─── Field Isolation: Memo Analysis ──────────────────────────────────────────
function hasMemoInjection(text: string, memo?: string): boolean {
  // If there's a memo field, check it specifically for instruction attempts
  if (memo) {
    if (/<script|javascript:|onload=|onerror=|alert\(|drop\s+table/i.test(memo)) {
      return true;
    }
    for (const p of PROMPT_INJECTION_PATTERNS) {
      if (p.test(memo)) return true;
    }
    // Memos containing system-like commands
    if (/\b(system|instruction|command|execute|authorize|admin)\b/i.test(memo)) {
      return true;
    }
  }

  // Check if the text contains "memo:" followed by injection
  for (const p of MEMO_INJECTION_PATTERNS) {
    if (p.test(text)) return true;
  }
  return false;
}

// ─── Benign Context Detection ─────────────────────────────────────────────────
// Detect when security concepts are discussed, not attempted
function isBenignSecurityDiscussion(text: string): boolean {
  const discussionSignals = [
    /what\s+is\s+(a\s+)?(prompt\s+injection|jailbreak|social\s+engineering)/i,
    /how\s+do(es)?\s+(prompt\s+injection|jailbreak)\s+work/i,
    /explain\s+.*?(prompt\s+injection|jailbreak|phishing)/i,
    /can\s+you\s+explain\s+.*?(prompt\s+injection|jailbreak|attacks?)/i,
    /tell\s+me\s+about\s+(prompt\s+injection|jailbreak|AI\s+safety)/i,
    /prompt\s+injection\s+(is|can\s+be|involves|attacks?)/i,
    /I\s+(read|saw|learned|heard)\s+about\s+(prompt\s+injection|jailbreak)/i,
    /curious\s+about\s+(prompt\s+injection|AI\s+security|jailbreak)/i,
    /theoretically.*?(if|how|would)/i,
    /for\s+(educational|research|academic|learning)\s+purpose/i,
  ];

  const hasDiscussionSignal = discussionSignals.some(p => p.test(text));

  // Must NOT also have an actual injection or override attempt
  const hasActualAttack = [
    ...PROMPT_INJECTION_PATTERNS,
    ...POLICY_OVERRIDE_PATTERNS,
    ...AUTH_BYPASS_PATTERNS,
  ].some(p => p.test(text));

  return hasDiscussionSignal && !hasActualAttack;
}

// ─── Main Screen Function ─────────────────────────────────────────────────────
export function screenInput(
  text: string,
  normMeta: NormalizationMeta,
  memo?: string,
): ScreenResult {
  const signals: string[] = [];
  let threat: ThreatCategory = 'NONE';
  let confidence = 0;
  let isMemoThreat = false;

  // Check benign discussion first — avoids false positives
  if (isBenignSecurityDiscussion(text)) {
    return {
      threat_category: 'NONE',
      confidence: 0.9,
      matched_signals: ['Benign security discussion detected'],
      is_memo_threat: false,
    };
  }

  // PROMPT_INJECTION (highest priority)
  const injectionMatches = PROMPT_INJECTION_PATTERNS.filter(p => p.test(text));
  if (injectionMatches.length > 0) {
    threat = 'PROMPT_INJECTION';
    confidence = Math.min(0.95, 0.7 + injectionMatches.length * 0.1);
    signals.push(`Instruction override patterns detected (${injectionMatches.length} signal(s))`);
  }

  // JAILBREAK
  if (threat === 'NONE') {
    const jailbreakMatches = JAILBREAK_PATTERNS.filter(p => p.test(text));
    if (jailbreakMatches.length > 0) {
      threat = 'JAILBREAK';
      confidence = Math.min(0.95, 0.7 + jailbreakMatches.length * 0.1);
      signals.push(`Jailbreak patterns detected (${jailbreakMatches.length} signal(s))`);
    }
  }

  // POLICY_OVERRIDE
  if (threat === 'NONE') {
    const overrideMatches = POLICY_OVERRIDE_PATTERNS.filter(p => p.test(text));
    if (overrideMatches.length > 0) {
      threat = 'POLICY_OVERRIDE';
      confidence = Math.min(0.92, 0.7 + overrideMatches.length * 0.1);
      signals.push(`Policy override attempt detected (${overrideMatches.length} signal(s))`);
    }
  }

  // AUTH_BYPASS
  if (threat === 'NONE') {
    const authMatches = AUTH_BYPASS_PATTERNS.filter(p => p.test(text));
    if (authMatches.length > 0) {
      threat = 'AUTHENTICATION_BYPASS';
      confidence = Math.min(0.92, 0.65 + authMatches.length * 0.1);
      signals.push(`Authentication bypass attempt detected (${authMatches.length} signal(s))`);
    }
  }

  // DATA_EXFILTRATION
  if (threat === 'NONE') {
    const exfilMatches = DATA_EXFILTRATION_PATTERNS.filter(p => p.test(text));
    if (exfilMatches.length > 0) {
      threat = 'DATA_EXFILTRATION';
      confidence = Math.min(0.9, 0.65 + exfilMatches.length * 0.1);
      signals.push(`Data exfiltration attempt detected (${exfilMatches.length} signal(s))`);
    }
  }

  // MEMO_INJECTION (check both combined text and explicit memo field)
  if (threat === 'NONE') {
    if (hasMemoInjection(text, memo)) {
      threat = 'MEMO_INJECTION';
      confidence = 0.85;
      signals.push('Instruction injection attempt detected in memo/note field');
      isMemoThreat = true;
    }
  }

  // OBFUSCATION — check both normalization meta and text
  if (threat === 'NONE') {
    const obfuscationMatches = OBFUSCATION_PATTERNS.filter(p => p.test(text));
    const hasNormAnomaly = normMeta.suspicious_unicode || normMeta.invisible_chars_found || normMeta.encoding_anomaly;

    if (obfuscationMatches.length > 0 || (hasNormAnomaly && normMeta.suspicious_patterns.length >= 2)) {
      threat = 'OBFUSCATION';
      confidence = obfuscationMatches.length > 0 ? 0.85 : 0.7;
      if (obfuscationMatches.length > 0) signals.push('Obfuscation patterns in text');
      if (hasNormAnomaly) signals.push(`Suspicious encoding: ${normMeta.suspicious_patterns.join(', ')}`);
    } else if (hasNormAnomaly) {
      // Single normalization anomaly — flag but lower confidence
      signals.push(`Encoding anomaly: ${normMeta.suspicious_patterns.join(', ')}`);
      confidence = 0.4;
    }
  }

  // UNKNOWN — when normalization flagged something but no category matched
  if (threat === 'NONE' && normMeta.suspicious_patterns.length > 0 && confidence === 0) {
    threat = 'UNKNOWN';
    confidence = 0.3;
    signals.push(`Unclassified suspicious patterns: ${normMeta.suspicious_patterns.join(', ')}`);
  }

  return {
    threat_category: threat,
    confidence,
    matched_signals: signals,
    is_memo_threat: isMemoThreat,
  };
}

// ─── Isolated Memo Screen ─────────────────────────────────────────────────────
// Analyze memo in isolation — memo instructions never become system instructions
export function screenMemoInIsolation(memo: string): ScreenResult {
  if (!memo || memo.trim().length === 0) {
    return { threat_category: 'NONE', confidence: 1, matched_signals: [], is_memo_threat: false };
  }

  // Check for injection in the memo alone
  const injectionMatch = PROMPT_INJECTION_PATTERNS.some(p => p.test(memo));
  const overrideMatch = POLICY_OVERRIDE_PATTERNS.some(p => p.test(memo));
  const commandLike = /\b(system|instruction|execute|authorize|admin|override|ignore)\b/i.test(memo);

  if (injectionMatch) {
    return {
      threat_category: 'MEMO_INJECTION',
      confidence: 0.9,
      matched_signals: ['Instruction-override pattern in payment memo'],
      is_memo_threat: true,
    };
  }
  if (overrideMatch || commandLike) {
    return {
      threat_category: 'MEMO_INJECTION',
      confidence: 0.75,
      matched_signals: ['Command-like language in payment memo'],
      is_memo_threat: true,
    };
  }

  return { threat_category: 'NONE', confidence: 0.95, matched_signals: [], is_memo_threat: false };
}
