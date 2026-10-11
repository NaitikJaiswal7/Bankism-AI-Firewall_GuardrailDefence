// ─── Pipeline Orchestrator ────────────────────────────────────────────────────
// Runs stages in correct order: RECEIVE → NORMALIZE → SCREEN → PARSE →
// EVALUATE/VALIDATE → DECIDE → AUDIT
// Enforces deterministic zero-trust LLM boundary.

import { Verdict } from '../schema/verdict.js';
import { normalizeInput } from './normalize.js';
import { screenInput, screenMemoInIsolation } from './screen.js';
import { parseInput } from './parse.js';
import { validateTransaction, validateReadOnlyOperation } from './validate.js';
import { buildVerdict } from './decide.js';
import { logEvent } from './audit.js';
import { POLICY } from '../policy/config.js';

export interface AnalyzeRequest {
  input: string;
  memo?: string;
}

export async function runPipeline(req: AnalyzeRequest): Promise<Verdict> {
  const startMs = Date.now();

  // ─── 1. RECEIVE: Input validation ─────────────────────────────────────────
  if (!req.input || typeof req.input !== 'string') {
    throw new Error('Invalid input: must be a non-empty string');
  }

  const rawInput = req.input.trim();

  if (rawInput.length < POLICY.input.min_length) {
    throw new Error('Input too short');
  }
  if (rawInput.length > POLICY.input.max_length) {
    throw new Error(`Input exceeds maximum length of ${POLICY.input.max_length} characters`);
  }

  // ─── 2. NORMALIZE: Unicode, encoding, whitespace analysis ─────────────────
  const tNormStart = Date.now();
  const normalizeResult = normalizeInput(rawInput);
  const normalizeMs = Math.max(1, Date.now() - tNormStart);

  // ─── 3. SCREEN: Threat detection ──────────────────────────────────────────
  const tScreenStart = Date.now();
  let screenResult = screenInput(normalizeResult.normalized, normalizeResult.meta, req.memo);

  // Additionally: screen memo in isolation (memo instructions ≠ system instructions)
  if (req.memo && screenResult.threat_category === 'NONE') {
    const memoScreenResult = screenMemoInIsolation(req.memo);
    if (memoScreenResult.threat_category !== 'NONE') {
      screenResult = memoScreenResult;
    }
  }
  const screenMs = Math.max(1, Date.now() - tScreenStart);

  // ─── 4. PARSE: Intent extraction ──────────────────────────────────────────
  const tParseStart = Date.now();
  const parseResult = parseInput(normalizeResult.normalized);

  // If memo is present, integrate it
  if (req.memo && !parseResult.transaction.memo) {
    parseResult.transaction.memo = req.memo;
  }
  const parseMs = Math.max(1, Date.now() - tParseStart);

  // ─── 5. EVALUATE & VALIDATE ───────────────────────────────────────────────
  const tValidateStart = Date.now();
  let validationResult;
  const { intent } = parseResult;

  if (intent === 'TRANSFER') {
    validationResult = validateTransaction(
      parseResult.transaction,
      screenResult.threat_category,
      parseResult.has_conflicting_instructions,
    );
  } else if (intent === 'BALANCE_INQUIRY' || intent === 'TRANSACTION_HISTORY') {
    const targetAccount = parseResult.transaction.from_account || 'acc-001';
    validationResult = validateReadOnlyOperation(screenResult.threat_category, targetAccount, 'acc-001');
  } else {
    validationResult = {
      checks: {
        no_active_threat: {
          passed: screenResult.threat_category === 'NONE',
          detail: screenResult.threat_category === 'NONE'
            ? 'No threat detected'
            : `Threat: ${screenResult.threat_category}`,
        },
        intent_recognized: {
          passed: false,
          detail: `Intent "${intent}" is not a recognized banking operation`,
        },
      },
      is_valid: false,
      reason_codes: intent === 'UNKNOWN' ? ['UNRECOGNIZED_INTENT'] : ['UNSUPPORTED_OPERATION'],
      recipient_resolved: null,
      is_ambiguous_recipient: false,
    };
  }
  const validateMs = Math.max(1, Date.now() - tValidateStart);

  // ─── 6. DECIDE: Build schema-validated verdict ────────────────────────────
  const verdict = buildVerdict({
    normalizeResult,
    screenResult,
    parseResult,
    validationResult,
    aiProviderAvailable: false,
    processingStartMs: startMs,
    stageTimings: {
      normalize_ms: normalizeMs,
      screen_ms: screenMs,
      parse_ms: parseMs,
      validate_ms: validateMs,
    },
  });

  // ─── 7. AUDIT: Log sanitized event with tamper-evident hash chaining ─────
  const auditHash = logEvent(verdict);
  verdict.audit_hash = auditHash;

  return verdict;
}
