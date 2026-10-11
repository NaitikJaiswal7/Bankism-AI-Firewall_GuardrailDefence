// ─── POST /api/analyze ────────────────────────────────────────────────────────
// Runs the full security pipeline on user input.
// Does NOT execute transactions — analysis only.

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { runPipeline } from '../pipeline/index.js';

const router = Router();

const AnalyzeRequestSchema = z.object({
  input: z.string().min(1).max(2000),
  memo: z.string().max(500).optional(),
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = AnalyzeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: parsed.error.flatten(),
      });
    }

    const verdict = await runPipeline(parsed.data);
    return res.json(verdict);
  } catch (err: any) {
    if (err?.message?.includes('too short') || err?.message?.includes('maximum length')) {
      return res.status(400).json({ error: err.message });
    }
    console.error('[/api/analyze] Error:', err);
    return res.status(500).json({ error: 'Internal pipeline error', message: err.message });
  }
});

export default router;
