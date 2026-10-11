import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Sliders,
  Download,
  Check,
  ShieldCheck,
  Lock,
  FileCode,
  Info,
  RotateCcw,
  Save,
  AlertTriangle,
  History,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

export const PolicyConfig: React.FC = () => {
  const [policyData, setPolicyData] = useState<any>(null);
  const [version, setVersion] = useState<string>('1.0.0');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [downloaded, setDownloaded] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form edit states
  const [maxSingleTransfer, setMaxSingleTransfer] = useState<number>(10000);
  const [confirmationThreshold, setConfirmationThreshold] = useState<number>(1000);
  const [memoIsolation, setMemoIsolation] = useState<boolean>(true);
  const [authorizedRole, setAuthorizedRole] = useState<string>('COMPLIANCE_OFFICER');
  const [changeReason, setChangeReason] = useState<string>('');

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    setLoading(true);
    try {
      const data = await api.getPolicy();
      const pol = data.policy || {};
      setPolicyData(pol);
      setVersion(pol.version || '1.0.0');
      setHistory(pol.history || []);

      if (pol.max_single_transfer_usd !== undefined) {
        setMaxSingleTransfer(pol.max_single_transfer_usd);
      }
      if (pol.require_confirmation_above_usd !== undefined) {
        setConfirmationThreshold(pol.require_confirmation_above_usd);
      }
      if (pol.memo_isolation_enabled !== undefined) {
        setMemoIsolation(pol.memo_isolation_enabled);
      }
    } catch (err: any) {
      console.error('Failed to load policy data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeReason.trim()) {
      setSaveError('Audit requirement: You must provide an operator role and reason to modify policy.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await api.updatePolicy({
        max_single_transfer_usd: maxSingleTransfer,
        require_confirmation_above_usd: confirmationThreshold,
        memo_isolation_enabled: memoIsolation,
        authorized_role: `${authorizedRole}: ${changeReason.trim()}`,
      });

      const updatedPol = res.policy || {};
      setPolicyData(updatedPol);
      setVersion(res.version || updatedPol.version || '1.0.1');
      setHistory(updatedPol.history || []);
      setSaveSuccess(true);
      setChangeReason('');
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update policy');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPolicy = () => {
    const jsonStr = JSON.stringify(
      {
        version,
        exported_at: new Date().toISOString(),
        policy: policyData,
        audit_history: history,
      },
      null,
      2
    );
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bankism_security_policy_v${version}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="soc-panel rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-[#22D3EE]" />
            <h2 className="text-base font-bold text-[#F1F5F9] font-mono">
              Deterministic Policy Engine & Guardrail Ruleset
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#151F30] text-[#22D3EE] border border-[#263449]">
              ACTIVE VERSION: v{version}
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1 max-w-2xl">
            Hard policy boundaries enforced strictly by code before any LLM parsing can touch financial execution.
            All parameter modifications are recorded in the cryptographically chained audit history.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleExportPolicy}
            className="flex items-center space-x-2 px-3.5 py-2 rounded bg-[#151F30] hover:bg-[#1e2c44] border border-[#263449] text-xs font-mono text-[#F1F5F9] transition-colors"
          >
            {downloaded ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#34D399]" />
                <span className="text-[#34D399]">Exported JSON</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>Export Policy JSON</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Policy Adjustment Form */}
      <form onSubmit={handleSavePolicy} className="soc-panel rounded-lg p-5 space-y-5">
        <div className="flex items-center justify-between border-b border-[#263449] pb-3">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-[#22D3EE]" />
            <span className="text-xs font-mono font-bold uppercase text-[#F1F5F9]">
              Live Firewall Threshold Controls
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#94A3B8]">
            Requires compliance audit reason to apply
          </span>
        </div>

        {saveSuccess && (
          <div className="p-3 rounded bg-emerald-950/40 border border-emerald-800 text-xs font-mono text-[#34D399] flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>Policy updated successfully to version v{version}! New thresholds are now live.</span>
          </div>
        )}

        {saveError && (
          <div className="p-3 rounded bg-rose-950/40 border border-rose-800 text-xs font-mono text-[#F87171] flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{saveError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Max Single Transfer */}
          <div className="soc-panel-sub p-4 rounded space-y-2">
            <label className="text-xs font-mono font-semibold text-[#F1F5F9] block">
              Maximum Single Transfer Limit ($)
            </label>
            <p className="text-[11px] text-[#94A3B8]">
              Any transfer prompt exceeding this hard limit is unconditionally blocked at Stage 4.
            </p>
            <div className="flex items-center space-x-3 pt-1">
              <input
                type="number"
                min="100"
                max="100000"
                step="500"
                value={maxSingleTransfer}
                onChange={(e) => setMaxSingleTransfer(Number(e.target.value))}
                className="w-36 px-3 py-1.5 rounded bg-[#080D16] border border-[#263449] focus:border-[#22D3EE] text-xs font-mono text-[#22D3EE] font-bold outline-none"
              />
              <span className="text-xs font-mono text-[#94A3B8]">USD</span>
            </div>
          </div>

          {/* Dual-Control Confirmation Threshold */}
          <div className="soc-panel-sub p-4 rounded space-y-2">
            <label className="text-xs font-mono font-semibold text-[#F1F5F9] block">
              Dual-Control Confirmation Threshold ($)
            </label>
            <p className="text-[11px] text-[#94A3B8]">
              Transfers equal to or above this limit generate a confirmation token and require human approval.
            </p>
            <div className="flex items-center space-x-3 pt-1">
              <input
                type="number"
                min="50"
                max="50000"
                step="250"
                value={confirmationThreshold}
                onChange={(e) => setConfirmationThreshold(Number(e.target.value))}
                className="w-36 px-3 py-1.5 rounded bg-[#080D16] border border-[#263449] focus:border-[#22D3EE] text-xs font-mono text-[#FBBF24] font-bold outline-none"
              />
              <span className="text-xs font-mono text-[#94A3B8]">USD</span>
            </div>
          </div>

          {/* Secondary Memo Isolation Toggle */}
          <div className="soc-panel-sub p-4 rounded flex items-center justify-between">
            <div>
              <label className="text-xs font-mono font-semibold text-[#F1F5F9] block">
                Secondary Channel (Memo) Isolation
              </label>
              <p className="text-[11px] text-[#94A3B8] max-w-sm">
                Treats transfer memos/notes as untrusted data channels. Prevents prompt execution from memo fields.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMemoIsolation(!memoIsolation)}
              className="text-[#22D3EE] p-1"
            >
              {memoIsolation ? (
                <ToggleRight className="w-8 h-8 text-[#34D399]" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-[#64748B]" />
              )}
            </button>
          </div>

          {/* Role selector */}
          <div className="soc-panel-sub p-4 rounded space-y-2">
            <label className="text-xs font-mono font-semibold text-[#F1F5F9] block">
              Operating Authority Role
            </label>
            <p className="text-[11px] text-[#94A3B8]">
              Security officer authorized to alter core firewall parameters.
            </p>
            <select
              value={authorizedRole}
              onChange={(e) => setAuthorizedRole(e.target.value)}
              className="w-full px-3 py-1.5 rounded bg-[#080D16] border border-[#263449] text-xs font-mono text-[#F1F5F9] outline-none"
            >
              <option value="COMPLIANCE_OFFICER">Compliance Officer (SOC Tier 2)</option>
              <option value="HEAD_OF_FRAUD">Head of Fraud Risk Management</option>
              <option value="SECURITY_ARCHITECT">Principal Security Architect</option>
            </select>
          </div>
        </div>

        {/* Change Reason and Submit */}
        <div className="pt-2 border-t border-[#263449] space-y-3">
          <div>
            <label className="text-[10px] font-mono uppercase text-[#94A3B8] font-semibold block mb-1">
              Compliance Change Justification (Required for Audit Trail)
            </label>
            <input
              type="text"
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="e.g., Lowering confirmation threshold for weekend fraud monitoring protocol"
              className="w-full px-3 py-2 rounded bg-[#080D16] border border-[#263449] focus:border-[#22D3EE] text-xs font-mono text-[#F1F5F9] placeholder:text-[#64748B] outline-none"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center space-x-2 px-5 py-2 rounded bg-[#22D3EE] hover:bg-cyan-300 text-slate-950 font-bold font-mono text-xs transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'APPLYING RULESET...' : 'UPDATE & SEAL POLICY RULESET'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Policy Change History Trail */}
      <div className="soc-panel rounded-lg overflow-hidden">
        <div className="p-3.5 border-b border-[#263449] flex items-center justify-between bg-[#080D16]">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-[#22D3EE]" />
            <span className="text-xs font-mono font-bold text-[#F1F5F9] uppercase">
              Policy Revision & Governance Trail
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#94A3B8]">{history.length} Revisions Logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-[#263449] bg-[#080D16] text-[10px] uppercase text-[#94A3B8]">
                <th className="py-2.5 px-3">Version</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Authorized Operator</th>
                <th className="py-2.5 px-3">Changes Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263449]/60">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#94A3B8]">
                    Initial baseline ruleset active. No revisions logged.
                  </td>
                </tr>
              ) : (
                history.map((h, i) => (
                  <tr key={i} className="hover:bg-[#151F30]/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-[#22D3EE]">v{h.version}</td>
                    <td className="py-2.5 px-3 text-[#94A3B8]">
                      {new Date(h.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-[#F1F5F9]">{h.updated_by || 'SOC_ADMIN'}</td>
                    <td className="py-2.5 px-3 text-[11px] text-[#638BFF]">{h.changes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
