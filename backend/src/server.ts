// ─── BANKISM Standalone Backend Server ───────────────────────────────────────────
// Blue-Team AI Firewall & Guardrail Defense
// ⚠️ DEMO ONLY — No real banking connections

import app from './app.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

async function start() {
  try {
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

export default app;
export { app };
