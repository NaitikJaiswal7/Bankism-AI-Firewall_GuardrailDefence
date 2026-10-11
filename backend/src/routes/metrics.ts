import { Router, Request, Response } from 'express';
import { getMetrics } from '../pipeline/audit.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const metrics = getMetrics();
  const total = metrics.total || 0;

  // Calculate rates
  const attackCategories = [
    'PROMPT_INJECTION',
    'JAILBREAK',
    'POLICY_OVERRIDE',
    'MEMO_INJECTION',
    'OBFUSCATION',
    'DATA_EXFILTRATION',
    'AUTHENTICATION_BYPASS',
  ];

  const threatCategories = metrics.threat_categories || {};
  const attackCount = Object.entries(threatCategories)
    .filter(([k]) => attackCategories.includes(k))
    .reduce((sum, [, v]) => sum + v, 0);

  const blockRate = total > 0 ? (metrics.blocked / total) * 100 : 0;
  const approvalRate = total > 0 ? (metrics.approved / total) * 100 : 0;
  const detectionRate = total > 0 ? (attackCount / total) * 100 : 0;

  res.json({
    total,
    total_requests: total,
    approved: metrics.approved || 0,
    blocked: metrics.blocked || 0,
    reviewed: metrics.reviewed || 0,
    threat_categories: threatCategories,
    threat_distribution: threatCategories,
    risk_levels: metrics.risk_levels || {},
    execution_statuses: metrics.execution_statuses || {},
    avg_processing_time_ms: metrics.avg_processing_time_ms || 0,
    avg_latency_ms: metrics.avg_processing_time_ms || 0,
    block_rate: blockRate,
    approval_rate: approvalRate,
    detection_rate: detectionRate,
    hash_chain_status: metrics.hash_chain_status || { valid: true, latest_hash: 'GENESIS' },
  });
});

export default router;
