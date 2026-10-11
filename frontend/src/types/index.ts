export type Decision = 'APPROVE' | 'BLOCK' | 'REVIEW';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ExecutionStatus =
  | 'NOT_REQUESTED'
  | 'NOT_EXECUTED'
  | 'PENDING_CONFIRMATION'
  | 'EXECUTED'
  | 'FAILED';

export type ThreatCategory =
  | 'NONE'
  | 'PROMPT_INJECTION'
  | 'JAILBREAK'
  | 'POLICY_OVERRIDE'
  | 'MEMO_INJECTION'
  | 'OBFUSCATION'
  | 'DATA_EXFILTRATION'
  | 'AUTHENTICATION_BYPASS'
  | 'SUSPICIOUS_TOOL_REQUEST'
  | 'UNKNOWN';

export type Intent =
  | 'BALANCE_INQUIRY'
  | 'TRANSACTION_HISTORY'
  | 'TRANSFER'
  | 'UNSUPPORTED'
  | 'UNKNOWN'
  | 'BENIGN_DISCUSSION';

export interface CheckResult {
  passed: boolean;
  detail: string;
}

export interface TransactionSummary {
  operation: string;
  amount: number | null;
  currency: string | null;
  recipient_ref: string | null;
  recipient_resolved: string | null;
  memo: string | null;
  from_account: string | null;
}

export interface NormalizationMeta {
  original_length: number;
  normalized_length: number;
  suspicious_unicode: boolean;
  invisible_chars_found: boolean;
  encoding_anomaly: boolean;
  suspicious_patterns: string[];
}

export interface StageTimings {
  normalize_ms: number;
  screen_ms: number;
  parse_ms: number;
  validate_ms: number;
  decide_ms: number;
}

export interface ProcessingMeta {
  pipeline_version: string;
  ai_provider_used: boolean;
  ai_provider_available: boolean;
  processing_time_ms: number;
  stage_timings?: StageTimings;
  normalization: NormalizationMeta;
}

export interface Verdict {
  schema_version: '1.0';
  request_id: string;
  timestamp: string;
  decision: Decision;
  risk_level: RiskLevel;
  threat_category: ThreatCategory;
  intent: Intent;
  confidence: number;
  rationale: string;
  checks: Record<string, CheckResult>;
  missing_fields: string[];
  transaction_summary: TransactionSummary | null;
  execution_allowed: boolean;
  execution_authorized: boolean;
  execution_status: ExecutionStatus;
  requires_confirmation: boolean;
  confirmation_token?: string | null;
  audit_hash?: string;
  reason_codes: string[];
  policy_version: string;
  processing_meta: ProcessingMeta;
}

export interface AuditEvent {
  id: string;
  event_id?: string;
  request_id?: string;
  sequence_number?: number;
  timestamp: string;
  intent: string;
  decision: Decision;
  risk_level: RiskLevel;
  threat_category: ThreatCategory;
  execution_allowed: boolean;
  execution_status: ExecutionStatus;
  reason_codes: string[];
  rationale: string;
  processing_time_ms: number;
  prev_hash: string;
  current_hash: string;
  audit_hash?: string;
  policy_version: string;
  sanitized_summary: string;
  user_prompt_redacted?: string;
  checks?: Record<string, CheckResult>;
}

export interface MetricsSummary {
  total: number;
  total_requests?: number;
  approved: number;
  blocked: number;
  reviewed: number;
  threat_categories: Record<string, number>;
  risk_levels: Record<string, number>;
  execution_statuses: Record<string, number>;
  avg_processing_time_ms: number;
  avg_latency_ms?: number;
  block_rate: number;
  hash_chain_status: { valid: boolean; latest_hash: string };
}

export interface Account {
  id: string;
  account_number: string;
  name: string;
  display_name?: string;
  owner_name?: string;
  type: string;
  account_type?: string;
  balance: number;
  balance_usd?: number;
  currency: string;
  status: string;
  is_active?: boolean;
}

export interface Transaction {
  id: string;
  timestamp: string;
  from_account: string;
  to_account: string;
  amount: number;
  currency: string;
  memo?: string;
  status: string;
}

export interface TestCase {
  id: string;
  name: string;
  category: string;
  description: string;
  input: string;
  memo?: string;
  expected_decision: string;
  expected_threat: string;
  expected_execution_allowed: boolean;
}

export interface ExecutionTrace {
  normalize_ms: number;
  screen_ms: number;
  parse_ms: number;
  validate_ms: number;
  decide_ms: number;
  total_duration_ms: number;
  observed_state_change: {
    ledger_entries_added: number;
    balance_delta_usd: number;
  };
}

export interface TestResult {
  id: string;
  run_id: string;
  timestamp: string;
  test_name: string;
  category: string;
  input: string;
  memo?: string;
  expected_decision: string;
  actual_decision: string;
  expected_threat: string;
  actual_threat: string;
  actual_threat_category?: string;
  actual_risk_level?: string;
  expected_execution_allowed: boolean;
  actual_execution_allowed: boolean;
  passed: boolean;
  is_false_positive: boolean;
  is_false_negative: boolean;
  is_unsafe_execution: boolean;
  rationale: string;
  checks: Record<string, CheckResult>;
  description: string;
  request_id?: string;
  audit_hash?: string;
  policy_version?: string;
  pipeline_version?: string;
  intent?: string;
  reason_codes?: string[];
  execution_status?: string;
  duration_ms?: number;
  execution_trace?: ExecutionTrace;
  data_payload?: Record<string, any> | null;
}

export interface TestRunReport {
  run_id: string;
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  attack_detection_rate: number;
  false_positive_rate: number;
  false_negative_rate: number;
  unsafe_execution_count: number;
  valid_acceptance_rate: number;
  benchmark_pass_rate?: number;
  confusion_matrix?: {
    tp: number;
    fp: number;
    tn: number;
    fn: number;
    malicious_count: number;
    benign_count: number;
    review_count: number;
  };
  results: TestResult[];
  limitations: string;
}

export interface ChainVerificationReport {
  status: 'INTACT' | 'CORRUPTED';
  chain_valid: boolean;
  total_events: number;
  total_blocks?: number;
  root_hash: string;
  latest_hash: string;
  genesis_block_hash?: string;
  latest_block_hash?: string;
  broken_index?: number;
  algorithm: string;
  verified_at: string;
  limitation_notice: string;
}

export interface SystemHealthData {
  status: 'healthy' | 'degraded';
  correlation_id: string;
  timestamp: string;
  environment: string;
  pipeline_version: string;
  uptime_seconds?: number;
  policy?: { version: number; rules_loaded: number };
  audit?: { total_events: number; chain_valid: boolean };
  components: {
    backend_core: {
      status: string;
      uptime_seconds: number;
      memory_rss_mb: number;
      environment: string;
      latency_ms?: number;
      details?: Record<string, any>;
      error?: string;
    };
    policy_engine: {
      status: string;
      version: string;
      rules_loaded: number;
      default_deny_enforced: boolean;
      transfer_cap_usd: number;
      confirmation_threshold_usd: number;
      latency_ms?: number;
      details?: Record<string, any>;
      error?: string;
    };
    mock_banking_adapter: {
      status: string;
      accounts_count: number;
      synthetic_mode: boolean;
      live_connections: boolean;
      disclaimer: string;
      latency_ms?: number;
      details?: Record<string, any>;
      error?: string;
    };
    audit_persistence: {
      status: string;
      storage_type: string;
      hash_chain_intact: boolean;
      chain_events_count: number;
      latest_hash: string;
      tamper_evident_enabled: boolean;
      latency_ms?: number;
      details?: Record<string, any>;
      error?: string;
    };
    ai_interpretation_provider: {
      status: string;
      provider_configured: boolean;
      mode: string;
      fail_closed_mode: boolean;
      note: string;
      latency_ms?: number;
      details?: Record<string, any>;
      error?: string;
    };
    [key: string]: any;
  };
  fail_closed: boolean;
  sandbox_notice: string;
}

