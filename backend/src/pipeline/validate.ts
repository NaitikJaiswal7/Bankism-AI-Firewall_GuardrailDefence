// ─── Transaction Validation Stage ────────────────────────────────────────────
// Deterministic validation — independent of LLM output.
// This is the core security gate for financial operations.

import { CheckResult } from '../schema/verdict.js';
import { POLICY } from '../policy/config.js';
import {
  getPrimaryAccount,
  resolveRecipient,
  findAmbiguousRecipients,
  getAccountById,
} from '../mock/accounts.js';
import { ParsedTransaction } from './parse.js';

export interface ValidationResult {
  checks: Record<string, CheckResult>;
  is_valid: boolean;
  reason_codes: string[];
  recipient_resolved: string | null;
  is_ambiguous_recipient: boolean;
}

export function validateTransaction(
  tx: ParsedTransaction,
  threatCategory: string,
  hasConflictingInstructions?: boolean,
): ValidationResult {
  const checks: Record<string, CheckResult> = {};
  const reason_codes: string[] = [];
  let recipient_resolved: string | null = null;
  let is_ambiguous_recipient = false;

  // ─── Check: Instruction clarity (no conflicting instructions) ──────────────
  if (hasConflictingInstructions) {
    checks['instruction_clarity'] = {
      passed: false,
      detail: 'Conflicting instructions or contradictory parameters detected. Clarification required before execution.',
    };
    reason_codes.push('CONFLICTING_INSTRUCTIONS');
    is_ambiguous_recipient = true;
  } else {
    checks['instruction_clarity'] = {
      passed: true,
      detail: 'Request instructions are clear and consistent',
    };
  }

  // ─── Check: No active threat ──────────────────────────────────────────────
  const blockingThreat = (POLICY.execution.blocking_threats as readonly string[]).includes(threatCategory);
  checks['no_active_threat'] = {
    passed: !blockingThreat,
    detail: blockingThreat
      ? `Threat category "${threatCategory}" blocks execution`
      : 'No blocking threat detected',
  };
  if (blockingThreat) reason_codes.push('BLOCKING_THREAT_PRESENT');

  // ─── Check: Valid amount ──────────────────────────────────────────────────
  const hasValidAmount =
    tx.amount !== null &&
    tx.amount >= POLICY.transaction.min_amount &&
    !isNaN(tx.amount) &&
    isFinite(tx.amount);
  checks['valid_amount'] = {
    passed: hasValidAmount,
    detail: !hasValidAmount
      ? tx.amount === null
        ? 'No amount specified'
        : `Invalid amount: ${tx.amount}`
      : `Amount ${tx.amount} ${tx.currency} is valid`,
  };
  if (!hasValidAmount) reason_codes.push('INVALID_AMOUNT');

  // ─── Check: Supported currency ────────────────────────────────────────────
  const hasSupportedCurrency =
    tx.currency !== null &&
    (POLICY.transaction.supported_currencies as readonly string[]).includes(tx.currency);
  checks['supported_currency'] = {
    passed: hasSupportedCurrency,
    detail: !hasSupportedCurrency
      ? tx.currency === null
        ? 'No currency specified'
        : `Currency "${tx.currency}" is not supported`
      : `Currency ${tx.currency} is supported`,
  };
  if (!hasSupportedCurrency) reason_codes.push('UNSUPPORTED_CURRENCY');

  // ─── Check: Recipient specified ───────────────────────────────────────────
  const hasRecipient = tx.recipient_ref !== null && tx.recipient_ref.trim().length > 0;
  checks['recipient_specified'] = {
    passed: hasRecipient,
    detail: hasRecipient ? `Recipient ref: "${tx.recipient_ref}"` : 'No recipient specified',
  };
  if (!hasRecipient) reason_codes.push('MISSING_REQUIRED_FIELDS');

  // ─── Check: Recipient uniquely resolved ───────────────────────────────────
  if (hasRecipient && tx.recipient_ref) {
    const resolved = resolveRecipient(tx.recipient_ref);
    if (resolved) {
      recipient_resolved = resolved.display_name;
      checks['recipient_resolved'] = {
        passed: true,
        detail: `Recipient resolved: ${resolved.display_name} (${resolved.account_number})`,
      };
    } else {
      // Check for partial matches (ambiguous)
      const partials = findAmbiguousRecipients(tx.recipient_ref);
      if (partials.length > 1) {
        is_ambiguous_recipient = true;
        checks['recipient_resolved'] = {
          passed: false,
          detail: `Ambiguous recipient "${tx.recipient_ref}": ${partials.length} possible matches. Clarification required.`,
        };
        reason_codes.push('AMBIGUOUS_RECIPIENT');
      } else {
        checks['recipient_resolved'] = {
          passed: false,
          detail: `Recipient "${tx.recipient_ref}" not found in verified recipients list`,
        };
        reason_codes.push('UNRESOLVED_RECIPIENT');
      }
    }
  } else {
    checks['recipient_resolved'] = {
      passed: false,
      detail: 'Cannot resolve recipient: none specified',
    };
  }

  // ─── Check: Source account authorized ────────────────────────────────────
  const fromAccount = tx.from_account ? getAccountById(tx.from_account) : getPrimaryAccount();
  const hasTransferPermission = fromAccount?.permissions.includes('transfer_out') ?? false;
  checks['account_authorized'] = {
    passed: hasTransferPermission && (fromAccount?.is_active ?? false),
    detail: !fromAccount
      ? 'Source account not found'
      : !fromAccount.is_active
        ? 'Source account is inactive'
        : !hasTransferPermission
          ? 'Account does not have outbound transfer permission'
          : `Account ${fromAccount.account_number} authorized for transfers`,
  };
  if (!hasTransferPermission || !fromAccount?.is_active) {
    reason_codes.push('UNAUTHORIZED_OPERATION');
  }

  // ─── Check: Sufficient funds ──────────────────────────────────────────────
  const amountUSD = tx.amount ?? 0;
  const availableBalance = fromAccount?.balance_usd ?? 0;
  const hasSufficientFunds = hasValidAmount && availableBalance >= amountUSD;
  checks['sufficient_funds'] = {
    passed: hasSufficientFunds,
    detail: !hasValidAmount
      ? 'Cannot check funds: invalid amount'
      : !hasSufficientFunds
        ? `Insufficient funds: balance $${availableBalance.toFixed(2)}, required $${amountUSD.toFixed(2)}`
        : `Sufficient funds: balance $${availableBalance.toFixed(2)}`,
  };
  if (hasValidAmount && !hasSufficientFunds) reason_codes.push('INSUFFICIENT_FUNDS');

  // ─── Check: Transaction limit ─────────────────────────────────────────────
  const withinLimit = !hasValidAmount || amountUSD <= POLICY.transaction.max_single_transfer_usd;
  checks['within_transaction_limit'] = {
    passed: withinLimit,
    detail: !withinLimit
      ? `Amount $${amountUSD.toFixed(2)} exceeds single-transfer limit of $${POLICY.transaction.max_single_transfer_usd}`
      : `Amount within $${POLICY.transaction.max_single_transfer_usd} limit`,
  };
  if (!withinLimit) reason_codes.push('LIMIT_EXCEEDED');

  // ─── Check: Daily limit ───────────────────────────────────────────────────
  const dailySpent = fromAccount?.daily_spent_usd ?? 0;
  const withinDailyLimit = !hasValidAmount || (dailySpent + amountUSD) <= POLICY.transaction.daily_limit_usd;
  checks['within_daily_limit'] = {
    passed: withinDailyLimit,
    detail: !withinDailyLimit
      ? `Daily limit would be exceeded: spent $${dailySpent.toFixed(2)}, requesting $${amountUSD.toFixed(2)}, limit $${POLICY.transaction.daily_limit_usd}`
      : `Daily spending within limit ($${(dailySpent + amountUSD).toFixed(2)} of $${POLICY.transaction.daily_limit_usd})`,
  };
  if (!withinDailyLimit) reason_codes.push('LIMIT_EXCEEDED');

  const is_valid =
    !blockingThreat &&
    !hasConflictingInstructions &&
    hasValidAmount &&
    hasSupportedCurrency &&
    hasRecipient &&
    checks['recipient_resolved'].passed &&
    hasTransferPermission &&
    (fromAccount?.is_active ?? false) &&
    hasSufficientFunds &&
    withinLimit &&
    withinDailyLimit;

  if (is_valid && reason_codes.length === 0) {
    reason_codes.push('ALL_CHECKS_PASSED');
  }

  return { checks, is_valid, reason_codes, recipient_resolved, is_ambiguous_recipient };
}

// ─── Read-Only Validation ─────────────────────────────────────────────────────
export function validateReadOnlyOperation(
  threatCategory: string,
  targetAccountId: string | null = 'acc-001',
  callerAccountId: string = 'acc-001',
): ValidationResult {
  const checks: Record<string, CheckResult> = {};
  const reason_codes: string[] = [];
  const targetId = targetAccountId || 'acc-001';

  // 1. Check: No active threat
  const blockingThreat = (POLICY.execution.blocking_threats as readonly string[]).includes(threatCategory);
  checks['no_active_threat'] = {
    passed: !blockingThreat,
    detail: blockingThreat
      ? `Threat "${threatCategory}" blocks read access`
      : 'No blocking threat detected',
  };
  if (blockingThreat) reason_codes.push('BLOCKING_THREAT_PRESENT');

  // 2. Check: Target account exists in core ledger
  const account = getAccountById(targetId);
  checks['account_exists'] = {
    passed: !!account,
    detail: account
      ? `Target account ${account.id} (${account.account_number}) located in core ledger`
      : `Target account "${targetId}" not found in core ledger`,
  };
  if (!account) reason_codes.push('ACCOUNT_NOT_FOUND');

  // 3. Check: Identity authorization (caller authorized on target account)
  const authorizedAccounts = ['acc-001', 'acc-004']; // Demo User accounts
  const isAuthorized = !!account && (callerAccountId === targetId || authorizedAccounts.includes(targetId));
  checks['account_access_authorized'] = {
    passed: isAuthorized,
    detail: isAuthorized
      ? `Identity ${callerAccountId} authorized to access account ${targetId}`
      : `Unauthorized account access: caller "${callerAccountId}" cannot inspect account "${targetId}"`,
  };
  if (!isAuthorized) reason_codes.push('UNAUTHORIZED_ACCOUNT_ACCESS');

  // 4. Check: Target account is active
  const isActive = account?.is_active ?? false;
  checks['account_active'] = {
    passed: isActive,
    detail: !account
      ? 'Cannot verify status: account not found'
      : isActive
        ? `Account ${account.account_number} status is ACTIVE`
        : `Account ${account.account_number} is INACTIVE / RESTRICTED`,
  };
  if (!isActive && account) reason_codes.push('ACCOUNT_INACTIVE');

  // 5. Check: Read permission
  const hasReadPermission = account?.permissions.includes('read_balance') ?? false;
  checks['read_permission'] = {
    passed: hasReadPermission,
    detail: !account
      ? 'Cannot verify permission: account not found'
      : hasReadPermission
        ? 'Account has "read_balance" permission enabled'
        : 'Account does not possess "read_balance" permission',
  };
  if (!hasReadPermission && account) reason_codes.push('UNAUTHORIZED_OPERATION');

  const is_valid =
    !blockingThreat &&
    !!account &&
    isAuthorized &&
    isActive &&
    hasReadPermission;

  if (is_valid) {
    reason_codes.push('READ_ONLY_AUTHORIZED');
  }

  return {
    checks,
    is_valid,
    reason_codes,
    recipient_resolved: null,
    is_ambiguous_recipient: false,
  };
}
