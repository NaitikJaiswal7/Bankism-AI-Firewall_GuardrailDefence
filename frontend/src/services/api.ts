import type {
  Verdict,
  AuditEvent,
  MetricsSummary,
  Account,
  Transaction,
  TestCase,
  TestRunReport,
  ChainVerificationReport,
  SystemHealthData,
} from '../types';

const BASE_URL = '/api';

export const api = {
  // Analyze input through pipeline
  async analyze(input: string, memo?: string): Promise<Verdict> {
    const res = await fetch(`${BASE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, memo: memo || undefined }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Analysis failed' }));
      throw new Error(err.message || err.error || 'Pipeline request failed');
    }
    return res.json();
  },

  // Execute transfer (gated by pipeline)
  async executeTransfer(payload: {
    from_account?: string;
    to_account?: string;
    amount?: number;
    currency?: string;
    memo?: string;
    natural_language_prompt: string;
    idempotency_key?: string;
  }): Promise<{ status: string; transaction: Transaction; verdict: Verdict }> {
    const res = await fetch(`${BASE_URL}/transfers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Transfer failed');
    }
    return data;
  },

  // Confirm dual-control human authorization
  async confirmTransfer(payload: {
    confirmation_token: string;
    decision: 'CONFIRM' | 'REJECT';
    authorized_by_role: string;
    idempotency_key?: string;
  }): Promise<{ status: string; message: string; transaction?: Transaction }> {
    const res = await fetch(`${BASE_URL}/transfers/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || 'Confirmation failed');
    }
    return data;
  },

  // Audit events with filters
  async getEvents(limit = 50, filters?: {
    decision?: string;
    risk_level?: string;
    threat_category?: string;
    execution_status?: string;
    q?: string;
  }): Promise<{ events: AuditEvent[]; total: number }> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (filters?.decision) params.append('decision', filters.decision);
    if (filters?.risk_level) params.append('risk_level', filters.risk_level);
    if (filters?.threat_category) params.append('threat_category', filters.threat_category);
    if (filters?.execution_status) params.append('execution_status', filters.execution_status);
    if (filters?.q) params.append('q', filters.q);
    const res = await fetch(`${BASE_URL}/events?${params}`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  // Verify cryptographic hash chain integrity
  async verifyChain(): Promise<ChainVerificationReport> {
    const res = await fetch(`${BASE_URL}/events/verify-chain`);
    if (!res.ok) throw new Error('Failed to verify audit hash chain');
    return res.json();
  },

  // System Metrics
  async getMetrics(): Promise<MetricsSummary> {
    const res = await fetch(`${BASE_URL}/metrics`);
    if (!res.ok) throw new Error('Failed to fetch metrics');
    return res.json();
  },

  // Policy configuration
  async getPolicy(): Promise<any> {
    const res = await fetch(`${BASE_URL}/policy`);
    if (!res.ok) throw new Error('Failed to fetch policy configuration');
    return res.json();
  },

  // Update policy configuration
  async updatePolicy(payload: {
    max_single_transfer_usd?: number;
    daily_limit_usd?: number;
    require_confirmation_above_usd?: number;
    memo_isolation_enabled?: boolean;
    authorized_role: string;
  }): Promise<any> {
    const res = await fetch(`${BASE_URL}/policy`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Failed to update policy');
    return data;
  },

  // System Health details
  async getHealth(): Promise<SystemHealthData> {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error('Failed to fetch system health');
    return res.json();
  },

  // Mock Banking accounts
  async getAccounts(): Promise<{ accounts: Account[]; ledger: Transaction[] }> {
    const res = await fetch(`${BASE_URL}/accounts`);
    if (!res.ok) throw new Error('Failed to fetch accounts');
    return res.json();
  },

  // Test suite cases
  async getTestSuite(): Promise<{ tests: TestCase[]; total: number; last_failed_count?: number }> {
    const res = await fetch(`${BASE_URL}/tests/suite`);
    if (!res.ok) throw new Error('Failed to fetch test suite');
    return res.json();
  },

  // Run adversarial tests
  async runTests(testIds?: string[]): Promise<TestRunReport> {
    const res = await fetch(`${BASE_URL}/tests/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testIds ? { test_ids: testIds } : {}),
    });
    if (!res.ok) throw new Error('Failed to run tests');
    return res.json();
  },

  // Run only failed tests
  async runFailedTests(): Promise<TestRunReport> {
    const res = await fetch(`${BASE_URL}/tests/run-failed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error('Failed to run failed tests');
    return res.json();
  },
};
