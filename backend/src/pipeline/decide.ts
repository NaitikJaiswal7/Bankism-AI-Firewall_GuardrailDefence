// ─── Verdict Construction Stage ──────────────────────────────────────────────
// Builds schema-validated verdict from pipeline results adhering to v1.0 contract.
// LLM output cannot override this deterministic verdict.

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import {
  Verdict,
  Decision,
  RiskLevel,
  ThreatCategory,
  Intent,
  ExecutionStatus,
  validateVerdict,
} from '../schema/verdict.js';
import { POLICY } from '../policy/config.js';
import { NormalizeResult } from './normalize.js';
import { ScreenResult } from './screen.js';
import { ParseResult } from './parse.js';
import { ValidationResult } from './validate.js';
import { queryAccountBalance } from '../mock/accounts.js';

export interface DecideInput {
  normalizeResult: NormalizeResult;
  screenResult: ScreenResult;
  parseResult: ParseResult;
  validationResult: ValidationResult;
  aiProviderAvailable: boolean;
  processingStartMs: number;
  stageTimings?: {
    normalize_ms: number;
    screen_ms: number;
    parse_ms: number;
    validate_ms: number;
  };
}

function determineRiskLevel(
  threat: ThreatCategory,
  screenConfidence: number,
  validationResult: ValidationResult,
): RiskLevel {
  const threatSeverity = POLICY.threat_severity[threat] ?? 'MEDIUM';

  if (threatSeverity === 'CRITICAL') return 'CRITICAL';
  if (threatSeverity === 'HIGH') return 'HIGH';

  const criticalReasonCodes = [
    'BLOCKING_THREAT_PRESENT',
    'UNAUTHORIZED_OPERATION',
  ];
  if (validationResult.reason_codes.some(r => criticalReasonCodes.includes(r))) {
    return 'HIGH';
  }

  if (threatSeverity === 'MEDIUM') return 'MEDIUM';

  if (!validationResult.is_valid) {
    const hasFinancialIssue = validationResult.reason_codes.some(r =>
      ['INSUFFICIENT_FUNDS', 'LIMIT_EXCEEDED', 'UNRESOLVED_RECIPIENT', 'AMBIGUOUS_RECIPIENT'].includes(r)
    );
    return hasFinancialIssue ? 'MEDIUM' : 'LOW';
  }

  return 'LOW';
}

function determineDecision(
  threat: ThreatCategory,
  intent: Intent,
  validationResult: ValidationResult,
  parseResult: ParseResult,
  riskLevel: RiskLevel,
): { decision: Decision; execution_allowed: boolean; requires_confirmation: boolean } {
  // Blocking threats ALWAYS block, regardless of anything else
  const isBlockingThreat = (POLICY.execution.blocking_threats as readonly string[]).includes(threat);
  if (isBlockingThreat) {
    return { decision: 'BLOCK', execution_allowed: false, requires_confirmation: false };
  }

  // CRITICAL risk → BLOCK
  if (riskLevel === 'CRITICAL') {
    return { decision: 'BLOCK', execution_allowed: false, requires_confirmation: false };
  }

  // Unknown intent → REVIEW
  if (intent === 'UNKNOWN') {
    return { decision: 'REVIEW', execution_allowed: false, requires_confirmation: true };
  }

  // Unsupported operation → BLOCK
  if (intent === 'UNSUPPORTED') {
    return { decision: 'BLOCK', execution_allowed: false, requires_confirmation: false };
  }

  // Read-only operations
  if (intent === 'BALANCE_INQUIRY' || intent === 'TRANSACTION_HISTORY') {
    if (validationResult.is_valid) {
      return { decision: 'APPROVE', execution_allowed: true, requires_confirmation: false };
    }
    return { decision: 'BLOCK', execution_allowed: false, requires_confirmation: false };
  }

  // Transfer operations
  if (intent === 'TRANSFER') {
    // Missing fields → REVIEW (needs clarification)
    if (parseResult.missing_fields.length > 0) {
      return { decision: 'REVIEW', execution_allowed: false, requires_confirmation: true };
    }

    // Ambiguous recipient or conflicting instructions → REVIEW
    if (
      validationResult.is_ambiguous_recipient ||
      validationResult.reason_codes.includes('CONFLICTING_INSTRUCTIONS') ||
      parseResult.has_conflicting_instructions
    ) {
      return { decision: 'REVIEW', execution_allowed: false, requires_confirmation: true };
    }

    // Validation failed for financial reasons → BLOCK
    if (!validationResult.is_valid) {
      return { decision: 'BLOCK', execution_allowed: false, requires_confirmation: false };
    }

    // Check confirmation policy threshold (e.g. transfers >= $1,000 require 2FA/human confirmation)
    const amount = parseResult.transaction.amount ?? 0;
    const threshold = POLICY.transaction.require_confirmation_above_usd;
    const requiresConfirmation = amount >= threshold;

    return {
      decision: requiresConfirmation ? 'REVIEW' : 'APPROVE',
      execution_allowed: !requiresConfirmation,
      requires_confirmation: requiresConfirmation,
    };
  }

  // Benign discussion
  if (intent === 'BENIGN_DISCUSSION') {
    return { decision: 'APPROVE', execution_allowed: false, requires_confirmation: false };
  }

  return { decision: 'REVIEW', execution_allowed: false, requires_confirmation: true };
}

function buildRationale(
  decision: Decision,
  threat: ThreatCategory,
  screenResult: ScreenResult,
  parseResult: ParseResult,
  validationResult: ValidationResult,
  intent: Intent,
  requiresConfirmation: boolean,
): string {
  if (threat !== 'NONE' && (POLICY.execution.blocking_threats as readonly string[]).includes(threat)) {
    return `Request blocked due to detected ${threat.replace(/_/g, ' ').toLowerCase()}: ${screenResult.matched_signals.join('; ')}. The banking system cannot process requests containing security threats.`;
  }

  if (intent === 'BALANCE_INQUIRY') {
    if (decision === 'APPROVE') {
      const targetAcc = parseResult.transaction.from_account || 'acc-001';
      return `Routine balance inquiry. Read-only authorization verified for account ${targetAcc}. All access controls passed.`;
    }
    const failed = Object.entries(validationResult.checks)
      .filter(([, v]) => !v.passed)
      .map(([k]) => k.replace(/_/g, ' '));
    return `Balance inquiry blocked. Access control verification failed: ${failed.join(', ')}.`;
  }

  if (intent === 'TRANSACTION_HISTORY') {
    if (decision === 'APPROVE') {
      const targetAcc = parseResult.transaction.from_account || 'acc-001';
      return `Transaction history request. Read-only authorization verified for account ${targetAcc}. All access controls passed.`;
    }
    const failed = Object.entries(validationResult.checks)
      .filter(([, v]) => !v.passed)
      .map(([k]) => k.replace(/_/g, ' '));
    return `Transaction history request blocked. Access control verification failed: ${failed.join(', ')}.`;
  }

  if (intent === 'TRANSFER') {
    if (parseResult.missing_fields.length > 0) {
      return `Transfer request requires clarification. Missing fields: ${parseResult.missing_fields.join(', ')}. Please provide complete transaction details.`;
    }
    if (
      validationResult.reason_codes.includes('CONFLICTING_INSTRUCTIONS') ||
      parseResult.has_conflicting_instructions
    ) {
      return 'Transfer held for review: conflicting instructions or contradictory transaction parameters detected in prompt. Clarification required before proceeding.';
    }
    if (validationResult.is_ambiguous_recipient) {
      return `Transfer held for review: recipient "${parseResult.transaction.recipient_ref}" is ambiguous and could not be uniquely resolved. Clarification required before proceeding.`;
    }
    if (!validationResult.is_valid) {
      const failed = Object.entries(validationResult.checks)
        .filter(([, v]) => !v.passed)
        .map(([k]) => k.replace(/_/g, ' '));
      return `Transfer cannot be processed. Failed checks: ${failed.join(', ')}.`;
    }
    if (requiresConfirmation) {
      return `Transfer of $${parseResult.transaction.amount} exceeds confirmation threshold of $${POLICY.transaction.require_confirmation_above_usd}. Human verification / dual-control authorization required before posting.`;
    }
    return `Transfer request passed all security and validation checks. Operation is eligible for authorized processing. Amount: ${parseResult.transaction.amount} ${parseResult.transaction.currency} to ${validationResult.recipient_resolved}.`;
  }

  if (intent === 'UNKNOWN') {
    return 'Request intent could not be determined. Please specify a clear banking operation such as "check my balance" or "transfer $X to [recipient]".';
  }

  return 'Request evaluated. Decision reflects current deterministic policy and security state.';
}

export function buildVerdict(input: DecideInput): Verdict {
  const {
    normalizeResult,
    screenResult,
    parseResult,
    validationResult,
    aiProviderAvailable,
    processingStartMs,
    stageTimings,
  } = input;

  const decideStart = Date.now();
  const { threat_category, confidence } = screenResult;
  const { intent, transaction, missing_fields } = parseResult;

  const riskLevel = determineRiskLevel(threat_category, confidence, validationResult);
  const { decision, execution_allowed, requires_confirmation } = determineDecision(
    threat_category,
    intent,
    validationResult,
    parseResult,
    riskLevel,
  );

  const rationale = buildRationale(
    decision,
    threat_category,
    screenResult,
    parseResult,
    validationResult,
    intent,
    requires_confirmation,
  );

  const reason_codes = [...validationResult.reason_codes];
  if (requires_confirmation) {
    reason_codes.push('CONFIRMATION_REQUIRED');
  }
  if (reason_codes.length === 0) {
    if (decision === 'BLOCK') reason_codes.push('VALIDATION_FAILURE');
    if (decision === 'REVIEW') reason_codes.push('MISSING_REQUIRED_FIELDS');
  }

  // Determine machine execution status & perform authorized read-only data access
  let execution_status: ExecutionStatus = 'NOT_REQUESTED';
  if (intent === 'TRANSFER') {
    if (decision === 'BLOCK') {
      execution_status = 'NOT_EXECUTED';
    } else if (requires_confirmation) {
      execution_status = 'PENDING_CONFIRMATION';
    } else if (decision === 'APPROVE') {
      execution_status = 'NOT_EXECUTED'; // Ready, but pending client dispatch to core banking adapter
    } else {
      execution_status = 'NOT_EXECUTED';
    }
  } else if (intent === 'BALANCE_INQUIRY' || intent === 'TRANSACTION_HISTORY') {
    if (decision === 'APPROVE' && execution_allowed) {
      const readRes = queryAccountBalance(transaction.from_account || 'acc-001', 'acc-001');
      if (readRes.success && readRes.balance_usd !== undefined) {
        execution_status = 'EXECUTED';
        // Zero financial authorization: transaction amount remains null for read-only inquiries
      } else {
        execution_status = 'FAILED';
      }
    } else {
      execution_status = 'NOT_EXECUTED';
    }
  }

  // Generate cryptographic confirmation token if confirmation required
  let confirmation_token: string | null = null;
  if (requires_confirmation && transaction.amount && transaction.recipient_ref) {
    const rawPayload = `${transaction.amount}|${transaction.currency}|${transaction.recipient_ref}|${transaction.from_account}|${POLICY.version}`;
    confirmation_token = `CONF-${crypto.createHash('sha256').update(rawPayload).digest('hex').substring(0, 16).toUpperCase()}`;
  }

  const requestId = `req_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
  const now = new Date().toISOString();
  const totalDuration = Date.now() - processingStartMs;

  const rawVerdict = {
    schema_version: '1.0' as const,
    request_id: requestId,
    timestamp: now,
    decision,
    risk_level: riskLevel,
    threat_category,
    intent,
    confidence,
    rationale,
    checks: validationResult.checks,
    missing_fields,
    transaction_summary: {
      operation: intent,
      amount: transaction.amount,
      currency: transaction.currency,
      recipient_ref: transaction.recipient_ref,
      recipient_resolved: validationResult.recipient_resolved,
      memo: transaction.memo,
      from_account: transaction.from_account,
    },
    execution_allowed,
    execution_authorized: execution_allowed,
    execution_status,
    requires_confirmation,
    confirmation_token,
    reason_codes,
    policy_version: POLICY.version,
    processing_meta: {
      pipeline_version: '1.0.0',
      ai_provider_used: false,
      ai_provider_available: aiProviderAvailable,
      processing_time_ms: totalDuration,
      stage_timings: {
        normalize_ms: stageTimings?.normalize_ms ?? 1,
        screen_ms: stageTimings?.screen_ms ?? 1,
        parse_ms: stageTimings?.parse_ms ?? 1,
        validate_ms: stageTimings?.validate_ms ?? 1,
        decide_ms: Date.now() - decideStart,
      },
      normalization: normalizeResult.meta,
    },
  };

  return validateVerdict(rawVerdict);
}
