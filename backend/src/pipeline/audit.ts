// ─── Audit Logging Stage with Cryptographic Hash Chaining ─────────────────────
// Implements tamper-evident SHA-256 hash chaining for security audit records.
// Note: Hash chaining provides tamper-evident integrity tracking within the store.
// In-memory bounded persistence for demo sandbox mode.
// Never logs passwords, API keys, or raw full unmasked credentials.

import crypto from 'crypto';
import { Verdict } from '../schema/verdict.js';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  intent: string;
  decision: string;
  risk_level: string;
  threat_category: string;
  execution_allowed: boolean;
  execution_status: string;
  reason_codes: string[];
  rationale: string;
  processing_time_ms: number;
  prev_hash: string;
  current_hash: string;
  policy_version: string;
  sanitized_summary: string;
  checks?: Record<string, { passed: boolean; detail: string }>;
}

export interface StoredTestResult {
  id: string;
  run_id: string;
  test_name: string;
  category: string;
  expected_decision: string;
  actual_decision: string;
  expected_threat: string;
  actual_threat: string;
  passed: boolean;
  is_false_positive: boolean;
  is_false_negative: boolean;
  is_unsafe_execution: boolean;
  timestamp: string;
}

// ─── In-Memory Stores ─────────────────────────────────────────────────────────
const eventStore: SecurityEvent[] = [];
const testResultStore: StoredTestResult[] = [];
const MAX_EVENTS = 500;
const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export function initDatabase(): void {
  console.log('[AUDIT] Tamper-evident hash-chained audit store initialized (demo sandbox)');
}

function computeHash(prevHash: string, data: Record<string, any>): string {
  const content = `${prevHash}|${data.id}|${data.timestamp}|${data.decision}|${data.threat_category}|${data.execution_status}|${data.intent}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

// ─── Log Event ────────────────────────────────────────────────────────────────
export function logEvent(verdict: Verdict): string {
  try {
    const prevHash = eventStore.length > 0 ? eventStore[0].current_hash : GENESIS_HASH;

    // Redact sensitive details for storage
    const sanitizedSummary = verdict.intent === 'TRANSFER' && verdict.transaction_summary
      ? `Transfer $${verdict.transaction_summary.amount ?? '?'} to ${verdict.transaction_summary.recipient_resolved ?? verdict.transaction_summary.recipient_ref ?? '?'}`
      : `Inquiry: ${verdict.intent}`;

    const rawData = {
      id: verdict.request_id,
      timestamp: verdict.timestamp,
      decision: verdict.decision,
      threat_category: verdict.threat_category,
      execution_status: verdict.execution_status,
      intent: verdict.intent,
    };

    const currentHash = computeHash(prevHash, rawData);

    const event: SecurityEvent = {
      id: verdict.request_id,
      timestamp: verdict.timestamp,
      intent: verdict.intent,
      decision: verdict.decision,
      risk_level: verdict.risk_level,
      threat_category: verdict.threat_category,
      execution_allowed: verdict.execution_allowed,
      execution_status: verdict.execution_status,
      reason_codes: verdict.reason_codes,
      rationale: verdict.rationale.substring(0, 500),
      processing_time_ms: verdict.processing_meta.processing_time_ms,
      prev_hash: prevHash,
      current_hash: currentHash,
      policy_version: verdict.policy_version,
      sanitized_summary: sanitizedSummary,
      checks: verdict.checks,
    };

    eventStore.unshift(event); // newest first

    if (eventStore.length > MAX_EVENTS) {
      eventStore.splice(MAX_EVENTS);
    }

    return currentHash;
  } catch (err) {
    console.error('[AUDIT] Failed to log event:', err);
    return GENESIS_HASH;
  }
}

// ─── Verify Audit Chain Integrity ─────────────────────────────────────────────
export function verifyAuditChain(): {
  chain_valid: boolean;
  total_events: number;
  root_hash: string;
  latest_hash: string;
  broken_index?: number;
} {
  if (eventStore.length === 0) {
    return {
      chain_valid: true,
      total_events: 0,
      root_hash: GENESIS_HASH,
      latest_hash: GENESIS_HASH,
    };
  }

  // Iterate chronologically (from oldest to newest)
  const chronological = [...eventStore].reverse();
  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < chronological.length; i++) {
    const item = chronological[i];
    if (item.prev_hash !== expectedPrevHash) {
      return {
        chain_valid: false,
        total_events: chronological.length,
        root_hash: GENESIS_HASH,
        latest_hash: eventStore[0].current_hash,
        broken_index: i,
      };
    }

    const calculatedHash = computeHash(item.prev_hash, {
      id: item.id,
      timestamp: item.timestamp,
      decision: item.decision,
      threat_category: item.threat_category,
      execution_status: item.execution_status,
      intent: item.intent,
    });

    if (calculatedHash !== item.current_hash) {
      return {
        chain_valid: false,
        total_events: chronological.length,
        root_hash: GENESIS_HASH,
        latest_hash: eventStore[0].current_hash,
        broken_index: i,
      };
    }

    expectedPrevHash = item.current_hash;
  }

  return {
    chain_valid: true,
    total_events: eventStore.length,
    root_hash: GENESIS_HASH,
    latest_hash: eventStore[0].current_hash,
  };
}

// ─── Query Events ─────────────────────────────────────────────────────────────
export function getRecentEvents(
  limit = 50,
  filters?: {
    decision?: string;
    risk_level?: string;
    threat_category?: string;
    execution_status?: string;
    query?: string;
  },
): SecurityEvent[] {
  let results = [...eventStore];

  if (filters?.decision) {
    results = results.filter(e => e.decision === filters.decision);
  }
  if (filters?.risk_level) {
    results = results.filter(e => e.risk_level === filters.risk_level);
  }
  if (filters?.threat_category) {
    results = results.filter(e => e.threat_category === filters.threat_category);
  }
  if (filters?.execution_status) {
    results = results.filter(e => e.execution_status === filters.execution_status);
  }
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    results = results.filter(e =>
      e.id.toLowerCase().includes(q) ||
      e.rationale.toLowerCase().includes(q) ||
      e.sanitized_summary.toLowerCase().includes(q) ||
      e.current_hash.toLowerCase().includes(q)
    );
  }

  return results.slice(0, limit);
}

// ─── Metrics ──────────────────────────────────────────────────────────────────
export function getMetrics(): {
  total: number;
  approved: number;
  blocked: number;
  reviewed: number;
  threat_categories: Record<string, number>;
  risk_levels: Record<string, number>;
  execution_statuses: Record<string, number>;
  avg_processing_time_ms: number;
  block_rate: number;
  hash_chain_status: { valid: boolean; latest_hash: string };
} {
  const total = eventStore.length;
  if (total === 0) {
    return {
      total: 0,
      approved: 0,
      blocked: 0,
      reviewed: 0,
      threat_categories: {},
      risk_levels: {},
      execution_statuses: {},
      avg_processing_time_ms: 0,
      block_rate: 0,
      hash_chain_status: { valid: true, latest_hash: GENESIS_HASH },
    };
  }

  const approved = eventStore.filter(e => e.decision === 'APPROVE').length;
  const blocked = eventStore.filter(e => e.decision === 'BLOCK').length;
  const reviewed = eventStore.filter(e => e.decision === 'REVIEW').length;

  const threat_categories: Record<string, number> = {};
  const risk_levels: Record<string, number> = {};
  const execution_statuses: Record<string, number> = {};
  let totalTime = 0;

  for (const event of eventStore) {
    threat_categories[event.threat_category] = (threat_categories[event.threat_category] || 0) + 1;
    risk_levels[event.risk_level] = (risk_levels[event.risk_level] || 0) + 1;
    execution_statuses[event.execution_status] = (execution_statuses[event.execution_status] || 0) + 1;
    totalTime += event.processing_time_ms;
  }

  const chainCheck = verifyAuditChain();

  return {
    total,
    approved,
    blocked,
    reviewed,
    threat_categories,
    risk_levels,
    execution_statuses,
    avg_processing_time_ms: total > 0 ? totalTime / total : 0,
    block_rate: total > 0 ? blocked / total : 0,
    hash_chain_status: {
      valid: chainCheck.chain_valid,
      latest_hash: chainCheck.latest_hash,
    },
  };
}

export function saveTestResult(result: any): void {
  testResultStore.push({
    id: result.id,
    run_id: result.run_id,
    test_name: result.test_name,
    category: result.category,
    expected_decision: result.expected_decision,
    actual_decision: result.actual_decision,
    expected_threat: result.expected_threat,
    actual_threat: result.actual_threat,
    passed: result.passed,
    is_false_positive: result.is_false_positive,
    is_false_negative: result.is_false_negative,
    is_unsafe_execution: result.is_unsafe_execution,
    timestamp: new Date().toISOString(),
  });
}
