import { Router, Request, Response } from 'express';
import { MOCK_ACCOUNTS, TRANSACTION_LEDGER } from '../mock/accounts.js';

const router = Router();

// GET /api/accounts — returns mock account info and active transaction ledger
router.get('/', (_req: Request, res: Response) => {
  const safeAccounts = MOCK_ACCOUNTS
    .filter(a => a.id !== 'acc-sys')
    .map(a => ({
      id: a.id,
      account_number: a.account_number,
      name: a.owner_name,
      owner_name: a.owner_name,
      type: a.id === 'acc-001' ? 'Checking' : a.id === 'acc-002' ? 'Savings' : 'Standard',
      balance: a.balance_usd,
      balance_usd: a.balance_usd,
      currency: a.currency,
      status: a.is_active ? 'ACTIVE' : 'INACTIVE',
      is_active: a.is_active,
      daily_spent_usd: a.daily_spent_usd,
      permissions: a.permissions,
    }));

  const ledger = TRANSACTION_LEDGER.slice().reverse().map(tx => ({
    id: tx.id,
    timestamp: tx.timestamp,
    from_account: tx.from_account_id,
    to_account: tx.to_account_id,
    amount: tx.amount_usd,
    amount_usd: tx.amount_usd,
    currency: tx.currency,
    memo: tx.memo || '',
    status: tx.status,
  }));

  res.json({
    accounts: safeAccounts,
    ledger: ledger,
    transactions: ledger,
    demo_notice: '⚠️ SIMULATED DATA — No real banking connection',
  });
});

// GET /api/accounts/transactions — returns mock transaction ledger
router.get('/transactions', (_req: Request, res: Response) => {
  const ledger = TRANSACTION_LEDGER.slice().reverse().map(tx => ({
    id: tx.id,
    timestamp: tx.timestamp,
    from_account: tx.from_account_id,
    to_account: tx.to_account_id,
    amount: tx.amount_usd,
    amount_usd: tx.amount_usd,
    currency: tx.currency,
    memo: tx.memo || '',
    status: tx.status,
  }));

  res.json({
    transactions: ledger,
    ledger: ledger,
    demo_notice: '⚠️ SIMULATED DATA — No real banking connection',
  });
});

export default router;
