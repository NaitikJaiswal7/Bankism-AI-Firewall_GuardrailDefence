// ─── Mock Banking Accounts & Data ────────────────────────────────────────────
// All data is entirely synthetic. No real banking connections.
// ⚠️ DEMO ONLY — Never connect to real financial systems.

import { v4 as uuidv4 } from 'uuid';

export interface MockAccount {
  id: string;
  account_number: string;
  owner_name: string;
  balance_usd: number;
  currency: string;
  daily_spent_usd: number;
  is_active: boolean;
  permissions: string[];
}

export interface MockRecipient {
  id: string;
  ref: string;           // The identifier users use (e.g. "alice", "alice@bankism.demo")
  display_name: string;
  account_number: string;
  is_verified: boolean;
}

export interface MockTransaction {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount_usd: number;
  currency: string;
  memo: string;
  timestamp: string;
  idempotency_key?: string;
  status: 'COMPLETED' | 'BLOCKED' | 'PENDING';
}

// ─── Demo Accounts ────────────────────────────────────────────────────────────
export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    id: 'acc-001',
    account_number: '****-****-****-1001',
    owner_name: 'Demo User (You)',
    balance_usd: 15000.00,
    currency: 'USD',
    daily_spent_usd: 0,
    is_active: true,
    permissions: ['read_balance', 'read_history', 'transfer_out', 'transfer_in'],
  },
  {
    id: 'acc-002',
    account_number: '****-****-****-1002',
    owner_name: 'Alice Chen',
    balance_usd: 8500.00,
    currency: 'USD',
    daily_spent_usd: 0,
    is_active: true,
    permissions: ['read_balance', 'read_history', 'transfer_in'],
  },
  {
    id: 'acc-003',
    account_number: '****-****-****-1003',
    owner_name: 'Bob Martinez',
    balance_usd: 22000.00,
    currency: 'USD',
    daily_spent_usd: 0,
    is_active: true,
    permissions: ['read_balance', 'read_history', 'transfer_in'],
  },
  {
    id: 'acc-004',
    account_number: '****-****-****-1004',
    owner_name: 'Savings Reserve',
    balance_usd: 50000.00,
    currency: 'USD',
    daily_spent_usd: 0,
    is_active: true,
    permissions: ['read_balance', 'read_history'],  // No outbound transfer
  },
  {
    id: 'acc-sys',
    account_number: '****-****-****-9999',
    owner_name: '[SYSTEM INTERNAL]',
    balance_usd: 0,
    currency: 'USD',
    daily_spent_usd: 0,
    is_active: false,
    permissions: [],
  },
];

// ─── Verified Recipients ──────────────────────────────────────────────────────
export const VERIFIED_RECIPIENTS: MockRecipient[] = [
  {
    id: 'rec-001',
    ref: 'alice',
    display_name: 'Alice Chen',
    account_number: '****-****-****-1002',
    is_verified: true,
  },
  {
    id: 'rec-001b',
    ref: 'alice@bankism.demo',
    display_name: 'Alice Chen',
    account_number: '****-****-****-1002',
    is_verified: true,
  },
  {
    id: 'rec-002',
    ref: 'bob',
    display_name: 'Bob Martinez',
    account_number: '****-****-****-1003',
    is_verified: true,
  },
  {
    id: 'rec-002b',
    ref: 'bob@bankism.demo',
    display_name: 'Bob Martinez',
    account_number: '****-****-****-1003',
    is_verified: true,
  },
];

// ─── In-Memory Transaction Ledger ─────────────────────────────────────────────
export const TRANSACTION_LEDGER: MockTransaction[] = [
  {
    id: uuidv4(),
    from_account_id: 'acc-001',
    to_account_id: 'acc-002',
    amount_usd: 250.00,
    currency: 'USD',
    memo: 'Dinner split',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'COMPLETED',
  },
  {
    id: uuidv4(),
    from_account_id: 'acc-003',
    to_account_id: 'acc-001',
    amount_usd: 1200.00,
    currency: 'USD',
    memo: 'Freelance payment',
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    status: 'COMPLETED',
  },
  {
    id: uuidv4(),
    from_account_id: 'acc-001',
    to_account_id: 'acc-003',
    amount_usd: 500.00,
    currency: 'USD',
    memo: 'Rent contribution',
    timestamp: new Date(Date.now() - 86400000 * 10).toISOString(),
    status: 'COMPLETED',
  },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────
export function getAccountById(id: string): MockAccount | undefined {
  return MOCK_ACCOUNTS.find(a => a.id === id);
}

export function getPrimaryAccount(): MockAccount {
  return MOCK_ACCOUNTS[0]; // Demo User
}

export function queryAccountBalance(
  targetAccountId: string = 'acc-001',
  callerAccountId: string = 'acc-001',
): {
  success: boolean;
  account?: MockAccount;
  balance_usd?: number;
  currency?: string;
  error?: string;
} {
  const account = getAccountById(targetAccountId);
  if (!account) {
    return { success: false, error: `Account "${targetAccountId}" not found` };
  }
  const authorizedAccounts = ['acc-001', 'acc-004'];
  if (callerAccountId === 'acc-001' && !authorizedAccounts.includes(targetAccountId)) {
    return {
      success: false,
      error: `Unauthorized cross-account read: caller ${callerAccountId} cannot access ${targetAccountId}`,
    };
  }
  if (!account.is_active) {
    return { success: false, error: `Account ${account.account_number} is inactive / restricted` };
  }
  if (!account.permissions.includes('read_balance')) {
    return { success: false, error: 'Missing "read_balance" permission' };
  }
  return {
    success: true,
    account,
    balance_usd: account.balance_usd,
    currency: account.currency,
  };
}

export function resolveRecipient(ref: string): MockRecipient | null {
  if (!ref || typeof ref !== 'string') return null;
  const normalized = ref.trim().toLowerCase();
  return (
    VERIFIED_RECIPIENTS.find(
      r =>
        r.ref.toLowerCase() === normalized ||
        r.display_name.toLowerCase() === normalized ||
        r.account_number.toLowerCase() === normalized
    ) ?? null
  );
}

export function findAmbiguousRecipients(ref: string): MockRecipient[] {
  if (!ref || typeof ref !== 'string') return [];
  const normalized = ref.trim().toLowerCase();
  return VERIFIED_RECIPIENTS.filter(r =>
    r.display_name.toLowerCase().includes(normalized) ||
    r.ref.toLowerCase().includes(normalized)
  );
}

// Idempotency: track submitted idempotency keys
const submittedKeys = new Set<string>();

export function isIdempotencyKeyUsed(key: string): boolean {
  return submittedKeys.has(key);
}

export function registerIdempotencyKey(key: string): void {
  submittedKeys.add(key);
}

export function executeTransfer(
  fromId: string,
  recipientRef: string,
  amountUSD: number,
  currency: string,
  memo: string,
  idempotencyKey?: string,
): { success: boolean; transaction?: MockTransaction; error?: string } {
  const from = getAccountById(fromId);
  if (!from) return { success: false, error: 'Source account not found' };

  const recipient = resolveRecipient(recipientRef);
  if (!recipient) return { success: false, error: 'Recipient not resolved' };

  const toAccount = MOCK_ACCOUNTS.find(a => a.account_number === recipient.account_number);
  if (!toAccount) return { success: false, error: 'Recipient account not found' };

  // Idempotency check
  if (idempotencyKey && isIdempotencyKeyUsed(idempotencyKey)) {
    return { success: false, error: 'Duplicate transaction: idempotency key already used' };
  }

  // Debit from source
  from.balance_usd -= amountUSD;
  from.daily_spent_usd += amountUSD;

  // Credit to destination
  toAccount.balance_usd += amountUSD;

  const tx: MockTransaction = {
    id: uuidv4(),
    from_account_id: fromId,
    to_account_id: toAccount.id,
    amount_usd: amountUSD,
    currency,
    memo: memo || '',
    timestamp: new Date().toISOString(),
    idempotency_key: idempotencyKey,
    status: 'COMPLETED',
  };

  TRANSACTION_LEDGER.push(tx);

  if (idempotencyKey) registerIdempotencyKey(idempotencyKey);

  return { success: true, transaction: tx };
}
