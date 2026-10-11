// ─── Policy Configuration ─────────────────────────────────────────────────────
// All security policy rules are defined here, separate from AI logic.
// The LLM cannot modify these values.

export const POLICY = {
  version: '1.0.0',

  // ─── Input Limits ─────────────────────────────────────────────────────────
  input: {
    max_length: 2000,
    min_length: 1,
  },

  // ─── Transaction Limits ───────────────────────────────────────────────────
  transaction: {
    max_single_transfer_usd: 10000,
    daily_limit_usd: 25000,
    min_amount: 0.01,
    supported_currencies: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'],
    require_confirmation_above_usd: 1000,
  },

  // ─── Risk Classification Thresholds ───────────────────────────────────────
  risk: {
    LOW: 'Routine, authorized, well-formed operations with no security concerns.',
    MEDIUM: 'Ambiguous request, incomplete information, or requires confirmation.',
    HIGH: 'Suspicious behavior, invalid transaction parameters, or unresolved security findings.',
    CRITICAL: 'Strong evidence of malicious intent, policy override, or security bypass attempt.',
  },

  // ─── Threat Severity Map ──────────────────────────────────────────────────
  threat_severity: {
    NONE: 'LOW',
    BENIGN_DISCUSSION: 'LOW',
    UNKNOWN: 'MEDIUM',
    MEMO_INJECTION: 'HIGH',
    SUSPICIOUS_TOOL_REQUEST: 'HIGH',
    OBFUSCATION: 'HIGH',
    DATA_EXFILTRATION: 'HIGH',
    PROMPT_INJECTION: 'CRITICAL',
    JAILBREAK: 'CRITICAL',
    POLICY_OVERRIDE: 'CRITICAL',
    AUTHENTICATION_BYPASS: 'CRITICAL',
  } as Record<string, string>,

  // ─── Execution Rules ──────────────────────────────────────────────────────
  execution: {
    // These threat categories ALWAYS block execution
    blocking_threats: [
      'PROMPT_INJECTION',
      'JAILBREAK',
      'POLICY_OVERRIDE',
      'AUTHENTICATION_BYPASS',
      'MEMO_INJECTION',
      'OBFUSCATION',
      'DATA_EXFILTRATION',
      'SUSPICIOUS_TOOL_REQUEST',
    ],
    // Operations that require full transfer validation
    transfer_operations: ['TRANSFER'],
    // Operations that are read-only (still require auth)
    readonly_operations: ['BALANCE_INQUIRY', 'TRANSACTION_HISTORY'],
  },

  // ─── Required Transfer Fields ─────────────────────────────────────────────
  required_transfer_fields: ['amount', 'currency', 'recipient_ref'] as string[],

  // ─── AI Integration ───────────────────────────────────────────────────────
  ai: {
    // AI output is advisory only — never authorization
    advisory_only: true,
    // Fail closed on AI failure for financial ops
    fail_closed_for_transfers: true,
    timeout_ms: 10000,
  },
} as const;
