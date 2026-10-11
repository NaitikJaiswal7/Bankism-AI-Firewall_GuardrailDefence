import { z } from 'zod';

// ─── Threat Categories ────────────────────────────────────────────────────────
export const ThreatCategorySchema = z.enum([
  'NONE',
  'PROMPT_INJECTION',
  'JAILBREAK',
  'POLICY_OVERRIDE',
  'MEMO_INJECTION',
  'OBFUSCATION',
  'DATA_EXFILTRATION',
  'AUTHENTICATION_BYPASS',
  'SUSPICIOUS_TOOL_REQUEST',
  'UNKNOWN',
]);
export type ThreatCategory = z.infer<typeof ThreatCategorySchema>;

// ─── Intent Types ─────────────────────────────────────────────────────────────
export const IntentSchema = z.enum([
  'BALANCE_INQUIRY',
  'TRANSACTION_HISTORY',
  'TRANSFER',
  'UNSUPPORTED',
  'UNKNOWN',
  'BENIGN_DISCUSSION',
]);
export type Intent = z.infer<typeof IntentSchema>;

// ─── Decision Types ───────────────────────────────────────────────────────────
export const DecisionSchema = z.enum(['APPROVE', 'BLOCK', 'REVIEW']);
export type Decision = z.infer<typeof DecisionSchema>;

// ─── Risk Levels ──────────────────────────────────────────────────────────────
export const RiskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

// ─── Execution Status ─────────────────────────────────────────────────────────
export const ExecutionStatusSchema = z.enum([
  'NOT_REQUESTED',
  'NOT_EXECUTED',
  'PENDING_CONFIRMATION',
  'EXECUTED',
  'FAILED',
]);
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

// ─── Check Result ─────────────────────────────────────────────────────────────
export const CheckResultSchema = z.object({
  passed: z.boolean(),
  detail: z.string(),
});
export type CheckResult = z.infer<typeof CheckResultSchema>;

// ─── Transaction Summary ──────────────────────────────────────────────────────
export const TransactionSummarySchema = z.object({
  operation: z.string(),
  amount: z.number().nullable(),
  currency: z.string().nullable(),
  recipient_ref: z.string().nullable(),
  recipient_resolved: z.string().nullable(),
  memo: z.string().nullable(),
  from_account: z.string().nullable(),
}).nullable();
export type TransactionSummary = z.infer<typeof TransactionSummarySchema>;

// ─── Normalization Meta ───────────────────────────────────────────────────────
export const NormalizationMetaSchema = z.object({
  original_length: z.number(),
  normalized_length: z.number(),
  suspicious_unicode: z.boolean(),
  invisible_chars_found: z.boolean(),
  encoding_anomaly: z.boolean(),
  suspicious_patterns: z.array(z.string()),
});
export type NormalizationMeta = z.infer<typeof NormalizationMetaSchema>;

// ─── Stage Timings ────────────────────────────────────────────────────────────
export const StageTimingsSchema = z.object({
  normalize_ms: z.number(),
  screen_ms: z.number(),
  parse_ms: z.number(),
  validate_ms: z.number(),
  decide_ms: z.number(),
});
export type StageTimings = z.infer<typeof StageTimingsSchema>;

// ─── Processing Meta ──────────────────────────────────────────────────────────
export const ProcessingMetaSchema = z.object({
  pipeline_version: z.string(),
  ai_provider_used: z.boolean(),
  ai_provider_available: z.boolean(),
  processing_time_ms: z.number(),
  stage_timings: StageTimingsSchema.optional(),
  normalization: NormalizationMetaSchema,
});
export type ProcessingMeta = z.infer<typeof ProcessingMetaSchema>;

// ─── Canonical Verdict Schema (v1.0 Contract) ─────────────────────────────────
export const VerdictSchema = z.object({
  schema_version: z.literal('1.0'),
  request_id: z.string(),
  timestamp: z.string().datetime(),
  decision: DecisionSchema,
  risk_level: RiskLevelSchema,
  threat_category: ThreatCategorySchema,
  intent: IntentSchema,
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  checks: z.record(z.string(), CheckResultSchema),
  missing_fields: z.array(z.string()),
  transaction_summary: TransactionSummarySchema,
  execution_allowed: z.boolean(),
  execution_authorized: z.boolean(),
  execution_status: ExecutionStatusSchema,
  requires_confirmation: z.boolean(),
  confirmation_token: z.string().nullable().optional(),
  audit_hash: z.string().optional(),
  reason_codes: z.array(z.string()),
  policy_version: z.string(),
  processing_meta: ProcessingMetaSchema,
});
export type Verdict = z.infer<typeof VerdictSchema>;

export function validateVerdict(data: unknown): Verdict {
  return VerdictSchema.parse(data);
}

// ─── Reason Codes ────────────────────────────────────────────────────────────
export const REASON_CODES = {
  // Security
  PROMPT_INJECTION_DETECTED: 'PROMPT_INJECTION_DETECTED',
  JAILBREAK_DETECTED: 'JAILBREAK_DETECTED',
  POLICY_OVERRIDE_ATTEMPT: 'POLICY_OVERRIDE_ATTEMPT',
  MEMO_INJECTION_DETECTED: 'MEMO_INJECTION_DETECTED',
  OBFUSCATION_DETECTED: 'OBFUSCATION_DETECTED',
  DATA_EXFILTRATION_ATTEMPT: 'DATA_EXFILTRATION_ATTEMPT',
  AUTH_BYPASS_ATTEMPT: 'AUTH_BYPASS_ATTEMPT',
  // Validation
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  UNRESOLVED_RECIPIENT: 'UNRESOLVED_RECIPIENT',
  UNAUTHORIZED_OPERATION: 'UNAUTHORIZED_OPERATION',
  LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  DUPLICATE_TRANSACTION: 'DUPLICATE_TRANSACTION',
  UNSUPPORTED_CURRENCY: 'UNSUPPORTED_CURRENCY',
  // System
  MODEL_UNAVAILABLE: 'MODEL_UNAVAILABLE',
  VALIDATION_FAILURE: 'VALIDATION_FAILURE',
  AMBIGUOUS_RECIPIENT: 'AMBIGUOUS_RECIPIENT',
  CONFIRMATION_REQUIRED: 'CONFIRMATION_REQUIRED',
  // Success
  ALL_CHECKS_PASSED: 'ALL_CHECKS_PASSED',
  READ_ONLY_OPERATION: 'READ_ONLY_OPERATION',
} as const;
