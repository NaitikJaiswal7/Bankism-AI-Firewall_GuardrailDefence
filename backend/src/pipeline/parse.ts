// ─── Intent Parsing Stage ────────────────────────────────────────────────────
// Extracts banking intent and transaction fields from normalized input.
// Rule-based baseline. Optional LLM enrichment is advisory only.

import { Intent } from '../schema/verdict.js';
import { POLICY } from '../policy/config.js';

export interface ParsedTransaction {
  amount: number | null;
  currency: string | null;
  recipient_ref: string | null;
  memo: string | null;
  from_account: string | null;
}

export interface ParseResult {
  intent: Intent;
  transaction: ParsedTransaction;
  missing_fields: string[];
  raw_amount_string: string | null;
  has_conflicting_instructions?: boolean;
}

// ─── Currency patterns ────────────────────────────────────────────────────────
const CURRENCY_SYMBOLS: Record<string, string> = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  'C$': 'CAD',
  'A$': 'AUD',
};

function parseCurrency(text: string): string | null {
  // Check symbol
  for (const [sym, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (text.includes(sym)) return code;
  }

  // Check explicit code
  const codeMatch = text.match(/\b(USD|EUR|GBP|JPY|CAD|AUD)\b/i);
  if (codeMatch) return codeMatch[1].toUpperCase();

  // Check explicit crypto or other currencies (e.g., 500 DOGE, 10 BTC)
  const cryptoMatch = text.match(/\b\d+\s*([a-zA-Z]{3,5})\b/);
  if (cryptoMatch) {
    const candidate = cryptoMatch[1].toUpperCase();
    if (!['THE', 'FOR', 'AND', 'NEW', 'ALL', 'OUT'].includes(candidate)) {
      return candidate;
    }
  }

  return null;
}

function parseAmount(text: string): { amount: number | null; raw: string | null } {
  // Detect negative amount
  const negativeMatch = text.match(/(?:-\s*[\$€£¥]|[\$€£¥]\s*-|-\s*)([\d,]+\.?\d*)/);
  if (negativeMatch) {
    const num = parseFloat(negativeMatch[1].replace(/,/g, ''));
    if (!isNaN(num) && num > 0) {
      return { amount: -num, raw: negativeMatch[0] };
    }
  }

  // Match patterns like $1,000, 500 USD, 1.5k, $2,500.00
  const patterns = [
    /[\$€£¥][\s]?([\d,]+\.?\d*)\s*([kKmM])?/,
    /([\d,]+\.?\d*)\s*([kKmM])?\s*(USD|EUR|GBP|JPY|CAD|AUD|[a-zA-Z]{3,5})/i,
    /send\s+([\d,]+\.?\d*)\s*([kKmM])?/i,
    /transfer\s+([\d,]+\.?\d*)\s*([kKmM])?/i,
    /pay\s+([\d,]+\.?\d*)\s*([kKmM])?/i,
    /amount[:\s]+([\d,]+\.?\d*)\s*([kKmM])?/i,
    /\b([\d,]+\.?\d*)\s*([kKmM])?\s*dollars?\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const numStr = match[1].replace(/,/g, '');
      let num = parseFloat(numStr);
      const multiplier = match[2]?.toLowerCase();
      if (multiplier === 'k') num *= 1000;
      if (multiplier === 'm') num *= 1000000;
      if (!isNaN(num) && num > 0) {
        return { amount: num, raw: match[0] };
      }
    }
  }
  return { amount: null, raw: null };
}

function parseRecipient(text: string): string | null {
  // Match "to <name>", "send to <name>", "@name", "for <name>"
  const patterns = [
    /\bto\s+([a-zA-Z0-9@._\-]{2,60})(?:\s|$|,|\.|!)/i,
    /\bpay\s+([a-zA-Z0-9@._\-]{2,60})(?:\s|$|,|\.|!)/i,
    /\bsend\s+(?:money\s+)?to\s+([a-zA-Z0-9@._\-]{2,60})(?:\s|$|,|\.|!)/i,
    /\btransfer\s+(?:.*?\s+)?to\s+([a-zA-Z0-9@._\-]{2,60})(?:\s|$|,|\.|!)/i,
    /@([a-zA-Z0-9@._\-]{2,60})(?:\s|$|,|\.|!)/,
    /recipient[:\s]+([a-zA-Z0-9@._\-]{2,60})(?:\s|$|,|\.|!)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim().toLowerCase();
      // Reject words that aren't names
      if (!['the', 'a', 'an', 'my', 'me', 'you', 'your', 'their', 'usd', 'eur', 'gbp'].includes(candidate)) {
        return candidate;
      }
    }
  }
  return null;
}

export function detectConflictingInstructions(text: string): boolean {
  const lower = text.toLowerCase();

  // 1. Conflict/correction phrases
  const conflictPhrases = [
    /actually\s+(wait|no|instead|send|transfer)/i,
    /\bno\s+wait\b/i,
    /\bwait\s*[,.]?\s*(send|transfer|pay|make|instead)/i,
    /\binstead\b/i,
    /\bor\s+rather\b/i,
    /\bscratch\s+that\b/i,
    /\bcancel\s+that\b/i,
    /\bchange\s+(that\s+)?to\b/i,
    /\bon\s+second\s+thought\b/i,
    /\bcorrection[:\s]/i,
  ];
  if (conflictPhrases.some((pattern) => pattern.test(lower))) {
    return true;
  }

  // 2. Multiple distinct dollar amounts in the prompt
  const dollarAmounts = text.match(/\$[\d,]+(?:\.\d+)?/g);
  if (dollarAmounts && dollarAmounts.length > 1) {
    const uniqueAmounts = new Set(dollarAmounts.map(a => a.replace(/,/g, '')));
    if (uniqueAmounts.size > 1) {
      return true;
    }
  }

  // 3. Multiple recipients matched via "to <name>" or "@<name>"
  const recipientMatches = [...text.matchAll(/\bto\s+([a-zA-Z0-9@._\-]{2,60})/gi)];
  if (recipientMatches.length > 1) {
    const stopWords = ['the', 'a', 'an', 'my', 'me', 'you', 'your', 'their', 'usd', 'eur', 'gbp'];
    const filtered = recipientMatches
      .map(m => m[1].toLowerCase())
      .filter(w => !stopWords.includes(w));
    const uniqueRecipients = new Set(filtered);
    if (uniqueRecipients.size > 1) {
      return true;
    }
  }

  return false;
}

function parseMemo(text: string): string | null {
  const patterns = [
    /memo[:\s]+"?([^"]{1,200})"?/i,
    /note[:\s]+"?([^"]{1,200})"?/i,
    /reference[:\s]+"?([^"]{1,200})"?/i,
    /for\s+"?([^"]{3,100})"?(?:\s*$)/i,
    /message[:\s]+"?([^"]{1,200})"?/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function parseTargetAccount(text: string): string | null {
  const lower = text.toLowerCase();

  // Specific mock account ID mentions (e.g. acc-sys, acc-001, acc-002, acc-003, acc-004)
  const idMatch = text.match(/\b(acc-[a-z0-9\-]+)\b/i);
  if (idMatch) {
    return idMatch[1].toLowerCase();
  }

  // Account number mentions (e.g., account 9999, account 1002, account 1003, ****-9999)
  const numMatch = text.match(/(?:account|acc(?:ount)?\.?|acct\.?)\s*(?:#|number|no\.?)?\s*[*xX\-]*(\d{4})/i);
  if (numMatch) {
    const last4 = numMatch[1];
    if (last4 === '9999') return 'acc-sys';
    if (last4 === '1001') return 'acc-001';
    if (last4 === '1002') return 'acc-002';
    if (last4 === '1003') return 'acc-003';
    if (last4 === '1004') return 'acc-004';
  }

  // Named account mentions
  if (/\b(system\s+account|internal\s+account|root\s+account|admin\s+account)\b/i.test(lower)) {
    return 'acc-sys';
  }
  if (/\b(alice(?:'s)?\s+account)\b/i.test(lower)) {
    return 'acc-002';
  }
  if (/\b(bob(?:'s)?\s+account)\b/i.test(lower)) {
    return 'acc-003';
  }
  if (/\b(savings(?:\s+reserve)?\s+account)\b/i.test(lower)) {
    return 'acc-004';
  }

  return null;
}

// ─── Intent Detection ─────────────────────────────────────────────────────────
function detectIntent(text: string): Intent {
  const lower = text.toLowerCase();

  // Balance inquiry
  if (
    /\b(balance|how\s+much|funds?|account\s+balance|check\s+my\s+balance|show\s+(my\s+)?balance)\b/.test(lower) &&
    !/transfer|send|pay|wire/.test(lower)
  ) {
    return 'BALANCE_INQUIRY';
  }

  // Transaction history
  if (
    /\b(transaction(s)?|history|statement|recent\s+(transactions?|activity|payments?)|last\s+\d+\s+(transactions?|payments?))\b/.test(lower) &&
    !/transfer|send|pay|wire/.test(lower)
  ) {
    return 'TRANSACTION_HISTORY';
  }

  // Transfer
  if (
    /\b(transfer|send|pay|wire|move|remit|deposit)\b/.test(lower) &&
    /\b(to|recipient|account)\b/.test(lower)
  ) {
    return 'TRANSFER';
  }

  // Simple send/pay pattern
  if (/\b(send|pay|wire)\b/.test(lower)) {
    return 'TRANSFER';
  }

  return 'UNKNOWN';
}

// ─── Main Parse Function ──────────────────────────────────────────────────────
export function parseInput(text: string): ParseResult {
  const intent = detectIntent(text);
  const { amount, raw: rawAmount } = parseAmount(text);
  let currency = parseCurrency(text);
  const recipient_ref = parseRecipient(text);
  const memo = parseMemo(text);
  const has_conflicting_instructions = detectConflictingInstructions(text);
  const target_account = parseTargetAccount(text);

  // Default to USD if amount found but no currency
  if (amount !== null && currency === null) {
    currency = 'USD';
  }

  const transaction: ParsedTransaction = {
    amount,
    currency,
    recipient_ref,
    memo,
    from_account: target_account || 'acc-001', // Target or primary demo account
  };

  // Calculate missing fields for transfers
  const missing_fields: string[] = [];
  if (intent === 'TRANSFER') {
    if (transaction.amount === null) missing_fields.push('amount');
    if (transaction.currency === null) missing_fields.push('currency');
    if (transaction.recipient_ref === null) missing_fields.push('recipient');
  }

  return {
    intent,
    transaction,
    missing_fields,
    raw_amount_string: rawAmount,
    has_conflicting_instructions,
  };
}
