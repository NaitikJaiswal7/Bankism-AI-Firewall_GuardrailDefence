import { Router, Request, Response } from 'express';
import { getRecentEvents, verifyAuditChain } from '../pipeline/audit.js';

const router = Router();

// GET /api/events — returns security audit log with optional filtering
router.get('/', (req: Request, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200);
  const decision = req.query.decision ? String(req.query.decision) : undefined;
  const risk_level = req.query.risk_level ? String(req.query.risk_level) : undefined;
  const threat_category = req.query.threat_category ? String(req.query.threat_category) : undefined;
  const execution_status = req.query.execution_status ? String(req.query.execution_status) : undefined;
  const query = req.query.q ? String(req.query.q) : undefined;

  const events = getRecentEvents(limit, {
    decision,
    risk_level,
    threat_category,
    execution_status,
    query,
  });

  res.json({
    events,
    total: events.length,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/events/verify-chain — verifies cryptographic SHA-256 hash chain integrity
router.get('/verify-chain', (_req: Request, res: Response) => {
  const check = verifyAuditChain();
  res.json({
    status: check.chain_valid ? 'INTACT' : 'CORRUPTED',
    chain_valid: check.chain_valid,
    total_events: check.total_events,
    root_hash: check.root_hash,
    latest_hash: check.latest_hash,
    broken_index: check.broken_index,
    algorithm: 'SHA-256',
    verified_at: new Date().toISOString(),
    limitation_notice: 'Hash chaining detects unauthorized record modification or omission within the store; in local demo memory, entire store replacement remains a threat model limitation.',
  });
});

export default router;
