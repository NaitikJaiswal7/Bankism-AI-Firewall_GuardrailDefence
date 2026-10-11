import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditEvent, ChainVerificationReport, Account, Transaction } from '../types';
import {
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Fingerprint,
  Link,
  Lock,
  Landmark,
  Eye,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface AuditLedgerProps {
  onInspectEvent: (event: AuditEvent) => void;
}

export const AuditLedger: React.FC<AuditLedgerProps> = ({ onInspectEvent }) => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [verification, setVerification] = useState<ChainVerificationReport | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ledgerTx, setLedgerTx] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [filterDecision, setFilterDecision] = useState<string>('ALL');
  const [filterRisk, setFilterRisk] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'chain' | 'accounts'>('chain');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [eventsRes, verifyRes, accountsRes] = await Promise.all([
        api.getEvents(100),
        api.verifyChain().catch(() => null),
        api.getAccounts().catch(() => ({ accounts: [], ledger: [] })),
      ]);
      setEvents(eventsRes.events || []);
      setVerification(verifyRes);
      setAccounts(Array.isArray(accountsRes.accounts) ? accountsRes.accounts : []);
      setLedgerTx(Array.isArray(accountsRes.ledger) ? accountsRes.ledger : []);
    } catch (err) {
      console.error('Failed to load audit ledger data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    setVerifying(true);
    try {
      const res = await api.verifyChain();
      setVerification(res);
    } catch (err) {
      console.error('Verification failed:', err);
    } finally {
      setVerifying(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    const matchesDecision = filterDecision === 'ALL' || ev.decision === filterDecision;
    const matchesRisk = filterRisk === 'ALL' || ev.risk_level === filterRisk;
    const matchesSearch =
      !searchTerm ||
      ev.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.sanitized_summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.current_hash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.threat_category?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDecision && matchesRisk && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="soc-panel rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileCheck2 className="w-5 h-5 text-[#22D3EE]" />
            <h2 className="text-base font-bold text-[#F1F5F9] font-mono">
              Tamper-Evident Cryptographic Audit Ledger
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#151F30] text-[#22D3EE] border border-[#263449]">
              SHA-256 HASH CHAIN
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1 max-w-2xl">
            Every transaction evaluation is cryptographically sealed into a sequential, tamper-evident
            audit log where each entry links to the predecessor hash. Any retroactive modification breaks chain integrity.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleVerifyChain}
            disabled={verifying}
            className="px-3.5 py-2 rounded bg-[#22D3EE] hover:bg-cyan-300 text-slate-950 font-bold font-mono text-xs transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{verifying ? 'VERIFYING CHAIN...' : 'VERIFY CHAIN INTEGRITY'}</span>
          </button>
          <button
            onClick={loadAll}
            disabled={loading}
            className="p-2 rounded bg-[#151F30] hover:bg-[#1e2c44] border border-[#263449] text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
            title="Refresh Ledger"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-[#22D3EE]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      {verification && (
        <div
          className={`soc-panel rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-l-4 ${
            verification.chain_valid ? 'border-l-[#34D399]' : 'border-l-[#F87171]'
          }`}
        >
          <div className="flex items-center space-x-3">
            {verification.chain_valid ? (
              <CheckCircle2 className="w-6 h-6 text-[#34D399] shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 text-[#F87171] shrink-0" />
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-[#F1F5F9]">
                  {verification.chain_valid
                    ? 'CRYPTOGRAPHIC CHAIN VERIFIED — ZERO TAMPERING DETECTED'
                    : 'INTEGRITY ALERT — HASH CHAIN COMPROMISED'}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    verification.chain_valid
                      ? 'bg-emerald-950/40 text-[#34D399] border-emerald-800'
                      : 'bg-rose-950/40 text-[#F87171] border-rose-800'
                  }`}
                >
                  {verification.total_events} BLOCKS
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8] font-mono mt-0.5">
                Genesis Block:{' '}
                <span className="text-[#64748B]">{verification.root_hash?.slice(0, 16)}...</span>
                {' | '}
                Latest Block:{' '}
                <span className="text-[#22D3EE]">{verification.latest_hash?.slice(0, 16)}...</span>
              </p>
            </div>
          </div>

          <div className="text-right text-[10px] font-mono text-[#94A3B8] shrink-0">
            <span>Verified at: {new Date(verification.verified_at).toLocaleTimeString()}</span>
          </div>
        </div>
      )}

      {/* View Switcher: Audit Chain vs Mock Core Accounts */}
      <div className="flex items-center space-x-2 border-b border-[#263449]">
        <button
          onClick={() => setActiveSubTab('chain')}
          className={`px-4 py-2 text-xs font-mono font-semibold border-b-2 transition-colors flex items-center space-x-2 ${
            activeSubTab === 'chain'
              ? 'border-[#22D3EE] text-[#22D3EE]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <Fingerprint className="w-3.5 h-3.5" />
          <span>Cryptographic Audit Entries ({events.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('accounts')}
          className={`px-4 py-2 text-xs font-mono font-semibold border-b-2 transition-colors flex items-center space-x-2 ${
            activeSubTab === 'accounts'
              ? 'border-[#22D3EE] text-[#22D3EE]'
              : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>Core Banking Accounts & Balances ({accounts.length})</span>
        </button>
      </div>

      {activeSubTab === 'chain' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="soc-panel rounded-lg p-3 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Decision Filter */}
              <div className="flex items-center space-x-1 text-xs font-mono">
                <span className="text-[#94A3B8] text-[10px] uppercase">Decision:</span>
                {['ALL', 'APPROVE', 'BLOCK', 'REVIEW'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setFilterDecision(d)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      filterDecision === d
                        ? 'bg-[#151F30] text-[#22D3EE] border border-[#263449] font-bold'
                        : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Risk Filter */}
              <div className="flex items-center space-x-1 text-xs font-mono ml-0 md:ml-3">
                <span className="text-[#94A3B8] text-[10px] uppercase">Risk:</span>
                {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setFilterRisk(r)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      filterRisk === r
                        ? 'bg-[#151F30] text-[#22D3EE] border border-[#263449] font-bold'
                        : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search hash, ID, prompt..."
                className="w-full pl-8 pr-3 py-1 rounded bg-[#080D16] border border-[#263449] text-xs font-mono text-[#F1F5F9] placeholder:text-[#64748B] outline-none focus:border-[#22D3EE]"
              />
            </div>
          </div>

          {/* Audit Chain Table */}
          <div className="soc-panel rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#263449] bg-[#080D16] text-[10px] uppercase text-[#94A3B8]">
                    <th className="py-2.5 px-3">Seq / Timestamp</th>
                    <th className="py-2.5 px-3">Decision</th>
                    <th className="py-2.5 px-3">Threat Category</th>
                    <th className="py-2.5 px-3">Execution Status</th>
                    <th className="py-2.5 px-3">Prompt (Redacted)</th>
                    <th className="py-2.5 px-3">Audit SHA-256 Hash</th>
                    <th className="py-2.5 px-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#263449]/60">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#94A3B8]">
                        No audit events matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((ev, idx) => (
                      <tr key={ev.id || idx} className="hover:bg-[#151F30]/40 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="font-bold text-[#22D3EE]">#{ev.sequence_number ?? idx + 1}</span>
                          <span className="text-[10px] text-[#64748B] block">
                            {new Date(ev.timestamp).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              ev.decision === 'APPROVE'
                                ? 'bg-emerald-950/40 text-[#34D399] border-emerald-800'
                                : ev.decision === 'BLOCK'
                                ? 'bg-rose-950/40 text-[#F87171] border-rose-800'
                                : 'bg-amber-950/40 text-[#FBBF24] border-amber-800'
                            }`}
                          >
                            {ev.decision}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-[#F1F5F9]">
                          {ev.threat_category}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold ${
                              ev.execution_status === 'EXECUTED'
                                ? 'text-[#34D399]'
                                : ev.execution_status === 'PENDING_CONFIRMATION'
                                ? 'text-[#FBBF24]'
                                : 'text-[#64748B]'
                            }`}
                          >
                            {ev.execution_status || (ev.execution_allowed ? 'ALLOWED' : 'BLOCKED')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-[220px] truncate text-[#94A3B8]" title={ev.sanitized_summary}>
                          {ev.sanitized_summary}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[10px] text-[#638BFF]">
                          <span className="truncate max-w-[140px] block" title={ev.current_hash}>
                            {ev.current_hash ? `${ev.current_hash.slice(0, 16)}...` : 'UNLINKED'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => onInspectEvent(ev)}
                            className="p-1 rounded bg-[#151F30] hover:bg-[#1e2c44] border border-[#263449] text-[#22D3EE] hover:text-cyan-300 transition-colors inline-flex items-center space-x-1"
                            title="Inspect Verdict & Evidence"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Synthetic Core Accounts View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <div key={acc.id} className="soc-panel rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#94A3B8] uppercase">{acc.type || acc.account_type || 'CHECKING'}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                      acc.status === 'ACTIVE'
                        ? 'bg-emerald-950/40 text-[#34D399] border-emerald-800'
                        : 'bg-rose-950/40 text-[#F87171] border-rose-800'
                    }`}
                  >
                    {acc.status}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-[#F1F5F9] font-mono">{acc.name || acc.display_name}</h4>
                <div className="text-[11px] font-mono text-[#94A3B8]">
                  Account: <span className="text-[#F1F5F9]">{acc.account_number}</span>
                </div>
                <div className="pt-2 border-t border-[#263449] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#94A3B8]">Available Balance:</span>
                  <span className="text-base font-bold font-mono text-[#34D399]">
                    ${acc.balance.toLocaleString()} {acc.currency}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Ledger Transactions */}
          <div className="soc-panel rounded-lg overflow-hidden">
            <div className="p-3 border-b border-[#263449] flex items-center justify-between bg-[#080D16]">
              <span className="text-xs font-mono font-bold text-[#F1F5F9] uppercase">
                Posted Financial Transactions ({ledgerTx.length})
              </span>
              <span className="text-[10px] font-mono text-[#94A3B8]">
                Only firewalled & authorized transfers reach this ledger
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#263449] bg-[#080D16] text-[10px] uppercase text-[#94A3B8]">
                    <th className="py-2.5 px-3">Transaction ID</th>
                    <th className="py-2.5 px-3">From</th>
                    <th className="py-2.5 px-3">To</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#263449]/60">
                  {ledgerTx.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#94A3B8]">
                        No financial transactions executed yet. Run a benign transfer in the Guardrail Sandbox to post to the ledger.
                      </td>
                    </tr>
                  ) : (
                    ledgerTx.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#151F30]/40 transition-colors">
                        <td className="py-2.5 px-3 text-[#22D3EE] font-bold">{tx.id}</td>
                        <td className="py-2.5 px-3 text-[#F1F5F9]">{tx.from_account}</td>
                        <td className="py-2.5 px-3 text-[#F1F5F9]">{tx.to_account}</td>
                        <td className="py-2.5 px-3 font-bold text-[#34D399]">
                          ${tx.amount.toLocaleString()} {tx.currency}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/40 text-[#34D399] border border-emerald-800">
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#94A3B8]">
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
