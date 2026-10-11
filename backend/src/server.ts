// ─── BANKISM Backend Server ───────────────────────────────────────────────────
// Blue-Team AI Firewall & Guardrail Defense
// ⚠️ DEMO ONLY — No real banking connections

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initDatabase } from './pipeline/audit.js';

// ─── Routes ───────────────────────────────────────────────────────────────────
import analyzeRouter from './routes/analyze.js';
import transfersRouter from './routes/transfers.js';
import accountsRouter from './routes/accounts.js';
import eventsRouter from './routes/events.js';
import metricsRouter from './routes/metrics.js';
import healthRouter from './routes/health.js';
import testsRouter from './routes/tests.js';
import policyRouter from './routes/policy.js';

const app = express();
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Relaxed for demo
}));

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: false,
}));

app.use(express.json({ limit: '16kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', retry_after: '60 seconds' },
});
app.use('/api/', limiter);

// Stricter limit for analysis endpoint
const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Analysis rate limit exceeded' },
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/analyze', analyzeLimiter, analyzeRouter);
app.use('/api/transfers', transfersRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/health', healthRouter);
app.use('/api/tests', testsRouter);
app.use('/api/policy', policyRouter);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[SERVER] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Initialize & Start ───────────────────────────────────────────────────────
async function start() {
  try {
    initDatabase();
    console.log('[BANKISM] Database initialized');

    app.listen(PORT, () => {
      console.log(`[BANKISM] 🛡️  Security Backend running at http://localhost:${PORT}`);
      console.log(`[BANKISM] ⚠️  DEMO MODE — No real banking connections`);
      console.log(`[BANKISM] Pipeline version: 1.0.0`);
    });
  } catch (err) {
    console.error('[BANKISM] Failed to start:', err);
    process.exit(1);
  }
}

start();
