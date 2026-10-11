import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { POLICY } from '../policy/config.js';

const router = Router();

// Mutable policy state in sandbox demo memory
export const runtimePolicy = {
  version: '1.0.0',
  max_single_transfer_usd: POLICY.transaction.max_single_transfer_usd as number,
  daily_limit_usd: POLICY.transaction.daily_limit_usd as number,
  require_confirmation_above_usd: POLICY.transaction.require_confirmation_above_usd as number,
  min_amount: POLICY.transaction.min_amount as number,
  supported_currencies: [...POLICY.transaction.supported_currencies],
  default_deny: true,
  memo_isolation_enabled: true,
  homoglyph_normalization: 'NFKC',
  input_max_length: POLICY.input.max_length,
  updated_at: new Date().toISOString(),
  history: [
    {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      updated_by: 'SYSTEM_GENESIS',
      changes: 'Initial deterministic blue-team baseline policy loaded',
    },
  ],
};

const UpdatePolicySchema = z.object({
  max_single_transfer_usd: z.number().min(100).max(100000).optional(),
  daily_limit_usd: z.number().min(1000).max(500000).optional(),
  require_confirmation_above_usd: z.number().min(50).max(50000).optional(),
  memo_isolation_enabled: z.boolean().optional(),
  authorized_role: z.string().min(1), // e.g. "Compliance Officer"
});

// GET /api/policy — retrieve active policy and versioned change history
router.get('/', (_req: Request, res: Response) => {
  res.json({
    policy: runtimePolicy,
    static_reference: POLICY,
    validation_status: 'ACTIVE_AND_ENFORCED',
    timestamp: new Date().toISOString(),
  });
});

// PUT /api/policy — update sandbox policy limits with validation and audit entry
router.put('/', (req: Request, res: Response) => {
  try {
    const parsed = UpdatePolicySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid policy configuration',
        details: parsed.error.flatten(),
      });
    }

    const {
      max_single_transfer_usd,
      daily_limit_usd,
      require_confirmation_above_usd,
      memo_isolation_enabled,
      authorized_role,
    } = parsed.data;

    const changesSummary: string[] = [];

    if (max_single_transfer_usd !== undefined) {
      changesSummary.push(`Max single transfer: $${runtimePolicy.max_single_transfer_usd} -> $${max_single_transfer_usd}`);
      runtimePolicy.max_single_transfer_usd = max_single_transfer_usd;
    }
    if (daily_limit_usd !== undefined) {
      changesSummary.push(`Daily transfer cap: $${runtimePolicy.daily_limit_usd} -> $${daily_limit_usd}`);
      runtimePolicy.daily_limit_usd = daily_limit_usd;
    }
    if (require_confirmation_above_usd !== undefined) {
      changesSummary.push(`Confirmation threshold: $${runtimePolicy.require_confirmation_above_usd} -> $${require_confirmation_above_usd}`);
      runtimePolicy.require_confirmation_above_usd = require_confirmation_above_usd;
    }
    if (memo_isolation_enabled !== undefined) {
      changesSummary.push(`Memo isolation: ${runtimePolicy.memo_isolation_enabled} -> ${memo_isolation_enabled}`);
      runtimePolicy.memo_isolation_enabled = memo_isolation_enabled;
    }

    const newVersion = `1.0.${runtimePolicy.history.length}`;
    runtimePolicy.version = newVersion;
    runtimePolicy.updated_at = new Date().toISOString();
    runtimePolicy.history.unshift({
      version: newVersion,
      timestamp: new Date().toISOString(),
      updated_by: authorized_role,
      changes: changesSummary.join('; '),
    });

    res.json({
      message: 'Security policy updated successfully',
      version: newVersion,
      policy: runtimePolicy,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Policy update failed', message: err.message });
  }
});

export default router;
