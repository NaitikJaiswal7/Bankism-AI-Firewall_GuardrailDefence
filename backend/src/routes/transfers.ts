// ─── POST /api/transfers ──────────────────────────────────────────────────────
// Executes a mock transfer ONLY after independent re-validation.
// Supports both immediate execution and human dual-control confirmation flow.
// This endpoint enforces its own authorization — it does NOT trust
// the frontend-provided verdict or execution_allowed flag.

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { runPipeline } from '../pipeline/index.js';
import {
  executeTransfer,
  isIdempotencyKeyUsed,
  getAccountById,
  MOCK_ACCOUNTS,
} from '../mock/accounts.js';

const router = Router();

// Store pending human confirmations bound to server-side tokens
interface PendingConfirmation {
  token: string;
  amount: number;
  currency: string;
  from_account: string;
  recipient_ref: string;
  recipient_resolved: string;
  memo: string;
  timestamp: string;
  expires_at: number;
}
const pendingConfirmations = new Map<string, PendingConfirmation>();

const TransferRequestSchema = z.object({
  input: z.string().max(2000).optional(),
  natural_language_prompt: z.string().max(2000).optional(),
  prompt: z.string().max(2000).optional(),
  from_account: z.string().optional(),
  to_account: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  memo: z.string().max(500).optional(),
  idempotency_key: z.string().optional(),
});

const ConfirmRequestSchema = z.object({
  confirmation_token: z.string().min(1),
  decision: z.enum(['CONFIRM', 'REJECT']),
  authorized_by_role: z.string().min(1),
  idempotency_key: z.string().optional(),
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = TransferRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid transfer request',
        details: parsed.error.flatten(),
      });
    }

    const {
      input,
      natural_language_prompt,
      prompt,
      memo,
      idempotency_key,
    } = parsed.data;

    const rawInput = (
      input ||
      natural_language_prompt ||
      prompt ||
      (parsed.data.amount && parsed.data.to_account
        ? `Transfer $${parsed.data.amount} to ${parsed.data.to_account}`
        : '')
    ).trim();

    if (!rawInput) {
      return res.status(400).json({
        error: 'Transfer input missing',
        message: 'Must provide input or natural_language_prompt',
      });
    }

    // ─── Idempotency check BEFORE pipeline ──────────────────────────────────
    if (idempotency_key && isIdempotencyKeyUsed(idempotency_key)) {
      return res.status(409).json({
        error: 'Duplicate transaction',
        message: 'This idempotency key has already been used',
        reason_code: 'DUPLICATE_TRANSACTION',
      });
    }

    // ─── Run full pipeline independently ────────────────────────────────────
    const verdict = await runPipeline({ input: rawInput, memo: memo || undefined });

    // ─── Gate: check if confirmation is required ─────────────────────────────
    if (verdict.requires_confirmation && verdict.confirmation_token) {
      const tx = verdict.transaction_summary;
      if (tx && tx.amount && tx.recipient_ref) {
        pendingConfirmations.set(verdict.confirmation_token, {
          token: verdict.confirmation_token,
          amount: tx.amount,
          currency: tx.currency ?? 'USD',
          from_account: tx.from_account ?? 'acc-001',
          recipient_ref: tx.recipient_ref,
          recipient_resolved: tx.recipient_resolved ?? tx.recipient_ref,
          memo: tx.memo ?? '',
          timestamp: verdict.timestamp,
          expires_at: Date.now() + 10 * 60 * 1000, // 10 minutes TTL
        });
      }

      return res.status(200).json({
        status: 'PENDING_CONFIRMATION',
        message: verdict.rationale,
        confirmation_token: verdict.confirmation_token,
        requires_confirmation: true,
        transaction: null,
        verdict,
      });
    }

    // ─── Gate: execution_allowed must be true ────────────────────────────────
    if (!verdict.execution_allowed) {
      return res.status(403).json({
        error: 'Transfer not authorized',
        message: verdict.rationale,
        verdict,
      });
    }

    // ─── Gate: must be APPROVE for TRANSFER intent ───────────────────────────
    if (verdict.decision !== 'APPROVE' || verdict.intent !== 'TRANSFER') {
      return res.status(403).json({
        error: 'Transfer not approved',
        message: `Decision: ${verdict.decision}, Intent: ${verdict.intent}`,
        verdict,
      });
    }

    // ─── Execute the mock transfer ────────────────────────────────────────────
    const tx = verdict.transaction_summary;
    if (!tx || tx.amount === null || !tx.currency || !tx.recipient_ref) {
      return res.status(422).json({
        error: 'Incomplete transaction data after validation',
      });
    }

    const result = executeTransfer(
      tx.from_account ?? 'acc-001',
      tx.recipient_resolved ?? tx.recipient_ref,
      tx.amount,
      tx.currency,
      tx.memo ?? memo ?? '',
      idempotency_key,
    );

    if (!result.success || !result.transaction) {
      return res.status(422).json({
        error: 'Transfer execution failed',
        message: result.error || 'Execution failure',
        verdict,
      });
    }

    const fromAcc = getAccountById(result.transaction.from_account_id);
    const toAcc = MOCK_ACCOUNTS.find(a => a.id === result.transaction?.to_account_id);

    const safeTransaction = {
      id: result.transaction.id,
      timestamp: result.transaction.timestamp,
      from_account: fromAcc ? `${fromAcc.owner_name} (${fromAcc.account_number})` : result.transaction.from_account_id,
      to_account: toAcc ? `${toAcc.owner_name} (${toAcc.account_number})` : result.transaction.to_account_id,
      amount: result.transaction.amount_usd,
      currency: result.transaction.currency,
      memo: result.transaction.memo,
      status: result.transaction.status,
    };

    return res.status(201).json({
      message: 'Transfer completed successfully',
      status: 'COMPLETED',
      transaction: safeTransaction,
      verdict: {
        ...verdict,
        execution_status: 'EXECUTED',
      },
    });
  } catch (err: any) {
    console.error('[/api/transfers] Error:', err);
    return res.status(500).json({ error: 'Transfer processing error', message: err.message });
  }
});

// POST /api/transfers/confirm — Dual-control authorization / human confirmation
router.post('/confirm', async (req: Request, res: Response) => {
  try {
    const parsed = ConfirmRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid confirmation payload',
        details: parsed.error.flatten(),
      });
    }

    const { confirmation_token, decision, authorized_by_role, idempotency_key } = parsed.data;

    const pending = pendingConfirmations.get(confirmation_token);
    if (!pending) {
      return res.status(404).json({
        error: 'Confirmation token not found or already consumed',
      });
    }

    if (Date.now() > pending.expires_at) {
      pendingConfirmations.delete(confirmation_token);
      return res.status(410).json({
        error: 'Confirmation token expired',
        message: 'Security confirmation window elapsed. Re-analyze transfer request.',
      });
    }

    // Invalidate token immediately to prevent replay
    pendingConfirmations.delete(confirmation_token);

    if (decision === 'REJECT') {
      return res.json({
        status: 'REJECTED',
        message: `Transfer rejected by ${authorized_by_role}. No financial state mutated.`,
        execution_status: 'NOT_EXECUTED',
      });
    }

    // Execute verified transaction
    const result = executeTransfer(
      pending.from_account,
      pending.recipient_resolved || pending.recipient_ref,
      pending.amount,
      pending.currency,
      `${pending.memo} [Auth: ${authorized_by_role}]`,
      idempotency_key,
    );

    if (!result.success || !result.transaction) {
      return res.status(422).json({
        error: 'Execution failed after confirmation',
        message: result.error,
      });
    }

    const fromAcc = getAccountById(result.transaction.from_account_id);
    const toAcc = MOCK_ACCOUNTS.find(a => a.id === result.transaction?.to_account_id);

    return res.status(200).json({
      status: 'COMPLETED',
      message: `Transfer authorized and completed by ${authorized_by_role}`,
      transaction: {
        id: result.transaction.id,
        timestamp: result.transaction.timestamp,
        from_account: fromAcc ? `${fromAcc.owner_name} (${fromAcc.account_number})` : result.transaction.from_account_id,
        to_account: toAcc ? `${toAcc.owner_name} (${toAcc.account_number})` : result.transaction.to_account_id,
        amount: result.transaction.amount_usd,
        currency: result.transaction.currency,
        memo: result.transaction.memo,
        status: result.transaction.status,
      },
    });
  } catch (err: any) {
    console.error('[/api/transfers/confirm] Error:', err);
    return res.status(500).json({ error: 'Confirmation processing error', message: err.message });
  }
});

export default router;
