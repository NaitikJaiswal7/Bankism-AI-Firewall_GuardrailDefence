// ─── BANKISM Express Application ──────────────────────────────────────────────
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

// Initialize in-memory database store
initDatabase();

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // Relaxed for demo dashboard
  })
);

// ─── Flexible CORS Configuration ──────────────────────────────────────────────
// Supports localhost, vercel deployments, and custom cloud URLs
const rawCorsOrigin = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS;
const explicitOrigins = rawCorsOrigin
  ? rawCorsOrigin.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, same-origin, mobile, serverless proxy)
      if (!origin) return callback(null, true);

      // If configured for wildcard or found in explicit origins
      if (explicitOrigins.includes('*') || explicitOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow Vercel preview & production deployments and local addresses
      if (
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        process.env.VERCEL === '1'
      ) {
        return callback(null, true);
      }

      // For public sandbox/demo API, permit access
      return callback(null, true);
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '16kb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', retry_after: '60 seconds' },
});

// Stricter limit for analysis endpoint
const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Analysis rate limit exceeded' },
});

// ─── Core API Router ──────────────────────────────────────────────────────────
const apiRouter = express.Router();
apiRouter.use(limiter);

apiRouter.use('/analyze', analyzeLimiter, analyzeRouter);
apiRouter.use('/transfers', transfersRouter);
apiRouter.use('/accounts', accountsRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use('/metrics', metricsRouter);
apiRouter.use('/health', healthRouter);
apiRouter.use('/tests', testsRouter);
apiRouter.use('/policy', policyRouter);

// Mount API router under both /api and root / for seamless Vercel / serverless routing
app.use('/api', apiRouter);
app.use('/', apiRouter);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[SERVER] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
export { app };
