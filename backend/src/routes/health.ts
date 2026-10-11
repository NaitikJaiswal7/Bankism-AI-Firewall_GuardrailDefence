import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { POLICY } from '../policy/config.js';
import { MOCK_ACCOUNTS } from '../mock/accounts.js';
import { verifyAuditChain } from '../pipeline/audit.js';

const router = Router();
const startTime = Date.now();

router.get('/', (_req: Request, res: Response) => {
  const correlationId = `corr_${uuidv4().substring(0, 8)}`;
  const chainCheck = verifyAuditChain();

  const components = {
    backend_core: {
      status: 'UP',
      uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
      memory_rss_mb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      environment: 'SANDBOX',
    },
    policy_engine: {
      status: 'UP',
      version: POLICY.version,
      rules_loaded: Object.keys(POLICY).length,
      default_deny_enforced: true,
      transfer_cap_usd: POLICY.transaction.max_single_transfer_usd,
      confirmation_threshold_usd: POLICY.transaction.require_confirmation_above_usd,
    },
    mock_banking_adapter: {
      status: 'UP',
      accounts_count: MOCK_ACCOUNTS.length,
      synthetic_mode: true,
      live_connections: false,
      disclaimer: 'Isolated mock core ledger. Zero real financial exposure.',
    },
    audit_persistence: {
      status: 'UP',
      storage_type: 'IN_MEMORY_DEMO',
      hash_chain_intact: chainCheck.chain_valid,
      chain_events_count: chainCheck.total_events,
      latest_hash: chainCheck.latest_hash,
      tamper_evident_enabled: true,
    },
    ai_interpretation_provider: {
      status: 'LOCAL_FALLBACK',
      provider_configured: false,
      mode: 'DETERMINISTIC_RULES_ENGINE',
      fail_closed_mode: true,
      note: 'External LLM unconfigured. Running in high-assurance deterministic heuristic mode (fail-closed for transfers).',
    },
  };

  const isHealthy =
    components.backend_core.status === 'UP' &&
    components.policy_engine.status === 'UP' &&
    components.mock_banking_adapter.status === 'UP';

  res.json({
    status: isHealthy ? 'healthy' : 'degraded',
    correlation_id: correlationId,
    timestamp: new Date().toISOString(),
    environment: 'SANDBOX',
    pipeline_version: '1.0.0',
    components,
    fail_closed: true,
    sandbox_notice: '⚠️ BANKISM DEMO SANDBOX — All financial accounts, transactions, and balances are strictly synthetic.',
  });
});

export default router;
