import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Account, Transaction } from '../types';
import { Landmark, ShieldCheck, ArrowRight, RotateCcw, CheckCircle2, ShieldAlert, Zap, Send } from 'lucide-react';

interface MockLedgerProps {
  refreshTrigger?: number;
}

export const MockLedger: React.FC<MockLedgerProps> = ({ refreshTrigger }) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [testAmount, setTestAmount] = useState<number>(50);
  const [testRecipient, setTestRecipient] = useState<string>('alice');
  const [executing, setExecuting] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAccountsAndLedger = async () => {
    setLoading(true);
    try {
      const data = await api.getAccounts();
      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      setLedger(Array.isArray(data.ledger) ? data.ledger : Array.isArray((data as any).transactions) ? (data as any).transactions : []);
    } catch (err: any) {
      console.error('Failed to load accounts & ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccountsAndLedger();
  }, [refreshTrigger]);

  const handleSimulateTransfer = async () => {
    setExecuting(true);
    setActionNotice(null);
    try {
      const prompt = `Please transfer $${testAmount} from my checking account to ${testRecipient} for utilities`;
      const res = await api.executeTransfer({
        from_account: 'acc-001',
        to_account: testRecipient,
        amount: testAmount,
        currency: 'USD',
        memo: 'Utilities payment via ledger UI',
        natural_language_prompt: prompt,
      });

      setActionNotice({
        type: 'success',
        text: `✅ Transfer of $${testAmount} posted to ledger! Remaining balance updated.`,
      });
      loadAccountsAndLedger();
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        text: `❌ Core transfer rejected: ${err.message}`,
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#080d22]/90 border border-cyan-900/30">
        <div>
          <div className="flex items-center space-x-2">
            <Landmark className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-black text-slate-100">Core Banking System & Ledger</h2>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Mock Financial Core
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Isolated banking core ledger. Only requests that receive an unconditional{' '}
            <span className="text-emerald-400 font-bold">APPROVE</span> decision from the AI
            Firewall are permitted to touch balances. Blocked prompts never mutate accounts.
          </p>
        </div>

        <button
          onClick={loadAccountsAndLedger}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 transition-colors shrink-0"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Security Defense Guarantee Callout */}
      <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start space-x-3 text-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-emerald-300 font-mono">
            Zero-Trust Core Banking Isolation
          </h4>
          <p className="text-slate-300 mt-0.5 leading-relaxed">
            The core ledger has no direct LLM connection. Transactions require explicit structured
            parameters validated through the deterministic security pipeline. If an attacker crafts
            a prompt injection or memo exploit, execution is severed at the firewall gate.
          </p>
        </div>
      </div>

      {/* Quick Test Bar directly in Ledger */}
      <div className="p-4 rounded-xl bg-[#080d22]/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-300 font-semibold uppercase">Simulate Authorized Transfer:</span>
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">$</span>
            <input
              type="number"
              min="1"
              max="5000"
              value={testAmount}
              onChange={(e) => setTestAmount(Number(e.target.value))}
              className="w-20 px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">to</span>
            <select
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 outline-none focus:border-cyan-400"
            >
              <option value="alice">Alice Chen</option>
              <option value="bob">Bob Jones</option>
              <option value="charlie">Charlie Brown</option>
            </select>
          </div>

          <button
            onClick={handleSimulateTransfer}
            disabled={executing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{executing ? 'POSTING...' : 'POST VIA FIREWALL'}</span>
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionNotice && (
        <div
          className={`p-3 rounded-xl border text-xs font-mono flex items-center space-x-2 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
          }`}
        >
          <span>{actionNotice.text}</span>
        </div>
      )}

      {/* Mock Accounts Grid */}
      <div>
        <h3 className="text-xs font-mono font-bold uppercase text-slate-400 mb-3 flex items-center space-x-2">
          <span>Customer Account Vault</span>
          <span className="text-[10px] text-slate-500">({accounts.length} Accounts)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const balanceNum = typeof acc.balance === 'number' ? acc.balance : (acc.balance_usd ?? 0);
            const accountName = acc.name || acc.owner_name || 'Account';
            const accountStatus = acc.status || (acc.is_active ? 'ACTIVE' : 'INACTIVE');
            const accountType = acc.type || 'Checking';

            return (
              <div
                key={acc.id}
                className="p-4 rounded-xl bg-[#080d22]/90 border border-slate-800 hover:border-slate-700 transition-all shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                    {acc.account_number}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                    {accountStatus}
                  </span>
                </div>

                <div className="mt-3">
                  <h4 className="text-sm font-bold text-slate-200">{accountName}</h4>
                  <p className="text-[11px] text-slate-500">{accountType} Account</p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">Available Balance</span>
                  <span className="text-base font-black font-mono text-cyan-300">
                    ${balanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="rounded-xl border border-slate-800 bg-[#080d22]/90 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60">
          <h3 className="text-xs font-mono font-bold uppercase text-slate-200">
            Immutable Transaction Journal ({ledger.length} Records)
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Only authorized transactions cleared by the firewall are logged here
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-[10px] uppercase text-slate-400">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">From Account</th>
                <th className="py-3 px-4">To Account</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Memo</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-[11px]">
              {ledger.length > 0 ? (
                ledger.map((tx) => {
                  const amt = typeof tx.amount === 'number' ? tx.amount : (tx.amount_usd ?? 0);
                  const time = tx.timestamp ? new Date(tx.timestamp).toLocaleTimeString() : 'Recent';
                  const from = tx.from_account || tx.from_account_id || 'acc-001';
                  const to = tx.to_account || tx.to_account_id || 'acc-002';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {time}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-semibold">{from}</td>
                      <td className="py-3 px-4 text-slate-300 font-semibold">{to}</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">
                        ${amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        {tx.memo || 'None'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>{tx.status || 'POSTED'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No transactions posted yet. Execute a legitimate transfer above or in the Sandbox!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
