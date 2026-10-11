import React, { useState } from 'react';
import { Verdict } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  Key,
  Lock,
  FileCode,
  Shield,
  Fingerprint,
} from 'lucide-react';

interface VerdictDisplayProps {
  verdict: Verdict | null;
  onConfirmAction?: (token: string) => void;
  onExecuteAction?: () => void;
  executing?: boolean;
}

export const VerdictDisplay: React.FC<VerdictDisplayProps> = ({
  verdict,
  onConfirmAction,
  onExecuteAction,
  executing = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'evidence' | 'checks' | 'json'>('evidence');

  if (!verdict) {
    return (
      <div className="soc-panel rounded-lg p-8 text-center text-[#94A3B8]">
        <Shield className="w-8 h-8 mx-auto mb-2 text-[#64748B]" />
        <h4 className="text-xs font-semibold text-[#F1F5F9]">Firewall Boundary Standby</h4>
        <p className="text-[11px] text-[#94A3B8] max-w-md mx-auto mt-1">
          Compose a banking prompt or select an adversarial preset above to run through the 5-stage deterministic defense pipeline.
        </p>
      </div>
    );
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(verdict, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isBlock = verdict.decision === 'BLOCK';
  const isApprove = verdict.decision === 'APPROVE';
  const isReview = verdict.decision === 'REVIEW';

  const decisionStyles = isBlock
    ? {
        border: 'border-l-4 border-l-[#F87171]',
        badge: 'bg-rose-950/40 text-[#F87171] border-rose-800',
        icon: ShieldAlert,
        iconColor: 'text-[#F87171]',
      }
    : isApprove
    ? {
        border: 'border-l-4 border-l-[#34D399]',
        badge: 'bg-emerald-950/40 text-[#34D399] border-emerald-800',
        icon: ShieldCheck,
        iconColor: 'text-[#34D399]',
      }
    : {
        border: 'border-l-4 border-l-[#FBBF24]',
        badge: 'bg-amber-950/40 text-[#FBBF24] border-amber-800',
        icon: AlertTriangle,
        iconColor: 'text-[#FBBF24]',
      };

  const DecisionIcon = decisionStyles.icon;

  const riskBadgeStyles: Record<string, string> = {
    LOW: 'bg-emerald-950/40 text-[#34D399] border-emerald-800',
    MEDIUM: 'bg-amber-950/40 text-[#FBBF24] border-amber-800',
    HIGH: 'bg-orange-950/40 text-orange-400 border-orange-800',
    CRITICAL: 'bg-rose-950/40 text-[#F87171] border-rose-800',
  };

  return (
    <div className={`soc-panel rounded-lg p-5 ${decisionStyles.border} space-y-4`}>
      {/* Top Banner: Decision, Risk, Request ID, Execution State */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#263449] gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded bg-[#151F30] border border-[#263449]">
            <DecisionIcon className={`w-6 h-6 ${decisionStyles.iconColor}`} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono text-[#94A3B8] uppercase">FINAL DECISION:</span>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${decisionStyles.badge}`}>
                {verdict.decision}
              </span>
              <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${riskBadgeStyles[verdict.risk_level] || riskBadgeStyles.LOW}`}>
                RISK: {verdict.risk_level}
              </span>
              <span className="text-[10px] font-mono text-[#94A3B8] bg-[#151F30] px-2 py-0.5 rounded border border-[#263449]">
                POLICY: v{verdict.policy_version}
              </span>
            </div>

            <h3 className="text-base font-bold text-[#F1F5F9] mt-1 font-mono">
              {verdict.threat_category === 'NONE'
                ? `Legitimate Operation (${verdict.intent})`
                : `Threat Intercepted: ${verdict.threat_category.replace(/_/g, ' ')}`}
            </h3>
          </div>
        </div>

        {/* Execution Status Gate & Confirmation Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-start md:self-center">
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded bg-[#151F30] border border-[#263449] text-xs font-mono">
            <span className="text-[#94A3B8] text-[10px] uppercase">EXECUTION STATUS:</span>
            <span
              className={`font-bold ${
                verdict.execution_status === 'EXECUTED'
                  ? 'text-[#34D399]'
                  : verdict.execution_status === 'PENDING_CONFIRMATION'
                  ? 'text-[#FBBF24]'
                  : 'text-[#94A3B8]'
              }`}
            >
              {verdict.execution_status}
            </span>
          </div>

          {/* Dual-Control Confirmation Trigger */}
          {verdict.requires_confirmation && verdict.confirmation_token && onConfirmAction && (
            <button
              onClick={() => onConfirmAction(verdict.confirmation_token!)}
              className="px-3 py-1 text-xs font-bold font-mono rounded bg-[#FBBF24] hover:bg-amber-300 text-slate-950 transition-colors shadow-sm"
            >
              DUAL-CONTROL CONFIRMATION
            </button>
          )}

          {/* Immediate Execution Button if Allowed */}
          {verdict.execution_allowed && onExecuteAction && (
            <button
              onClick={onExecuteAction}
              disabled={executing}
              className="px-3 py-1 text-xs font-bold font-mono rounded bg-[#22D3EE] hover:bg-cyan-300 text-slate-950 transition-colors shadow-sm disabled:opacity-50"
            >
              {executing ? 'POSTING TO LEDGER...' : 'DISPATCH TO CORE LEDGER'}
            </button>
          )}
        </div>
      </div>

      {/* Rationale and Evidence Summary */}
      <div className="soc-panel-sub rounded p-3 text-xs leading-relaxed">
        <span className="text-[10px] font-mono uppercase text-[#94A3B8] font-semibold block mb-1">
          Evidence-Based Rationale:
        </span>
        <p className="text-[#F1F5F9] font-sans">{verdict.rationale}</p>

        <div className="flex flex-wrap items-center gap-4 mt-2.5 pt-2 border-t border-[#263449]/60 text-[10px] font-mono text-[#94A3B8]">
          <div className="flex items-center space-x-1">
            <Key className="w-3 h-3 text-[#22D3EE]" />
            <span>ID: {verdict.request_id}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-[#34D399]" />
            <span>Execution Duration: {verdict.processing_meta?.processing_time_ms}ms</span>
          </div>
          {verdict.audit_hash && (
            <div className="flex items-center space-x-1">
              <Fingerprint className="w-3 h-3 text-[#638BFF]" />
              <span className="truncate max-w-[180px]">Hash: {verdict.audit_hash}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex items-center justify-between border-b border-[#263449]">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('evidence')}
            className={`px-3 py-1.5 text-xs font-mono font-medium border-b-2 transition-colors ${
              activeTab === 'evidence'
                ? 'border-[#22D3EE] text-[#22D3EE]'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            Extracted Entity Schema
          </button>
          <button
            onClick={() => setActiveTab('checks')}
            className={`px-3 py-1.5 text-xs font-mono font-medium border-b-2 transition-colors ${
              activeTab === 'checks'
                ? 'border-[#22D3EE] text-[#22D3EE]'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            Policy & Security Checks ({Object.keys(verdict.checks || {}).length})
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`px-3 py-1.5 text-xs font-mono font-medium border-b-2 transition-colors ${
              activeTab === 'json'
                ? 'border-[#22D3EE] text-[#22D3EE]'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            Canonical JSON Verdict (v{verdict.schema_version})
          </button>
        </div>

        {activeTab === 'json' && (
          <button
            onClick={handleCopyJson}
            className="flex items-center space-x-1 text-[11px] font-mono text-[#94A3B8] hover:text-[#F1F5F9] px-2 py-1 rounded bg-[#151F30] border border-[#263449]"
          >
            {copied ? <Check className="w-3 h-3 text-[#34D399]" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>
        )}
      </div>

      {/* Tab Panels */}
      {activeTab === 'evidence' && (
        <div className="space-y-3 pt-1">
          {verdict.transaction_summary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs font-mono">
              <div className="soc-panel-sub p-2.5 rounded">
                <span className="text-[10px] text-[#94A3B8] uppercase block">Operation</span>
                <span className="font-semibold text-[#F1F5F9]">{verdict.transaction_summary.operation}</span>
              </div>
              <div className="soc-panel-sub p-2.5 rounded">
                <span className="text-[10px] text-[#94A3B8] uppercase block">Amount</span>
                <span className="font-semibold text-[#22D3EE]">
                  {verdict.transaction_summary.amount != null
                    ? `$${verdict.transaction_summary.amount.toLocaleString()} ${verdict.transaction_summary.currency ?? ''}`
                    : 'N/A'}
                </span>
              </div>
              <div className="soc-panel-sub p-2.5 rounded">
                <span className="text-[10px] text-[#94A3B8] uppercase block">Recipient</span>
                <span className="font-semibold text-[#F1F5F9]">
                  {verdict.transaction_summary.recipient_resolved || verdict.transaction_summary.recipient_ref || 'N/A'}
                </span>
              </div>
              <div className="soc-panel-sub p-2.5 rounded">
                <span className="text-[10px] text-[#94A3B8] uppercase block">Memo / Reference</span>
                <span className="text-[#94A3B8] truncate block" title={verdict.transaction_summary.memo ?? ''}>
                  {verdict.transaction_summary.memo || 'None'}
                </span>
              </div>
            </div>
          ) : (
            <div className="soc-panel-sub p-3 rounded text-xs text-[#94A3B8] font-mono">
              Non-transactional operation. No financial entity fields extracted.
            </div>
          )}

          {/* Normalization & Encoding Forensic Comparison */}
          {verdict.processing_meta?.normalization && (
            <div className="soc-panel-sub p-3 rounded space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-[#263449]/60 pb-1.5">
                <span className="text-[10px] uppercase text-[#94A3B8] font-semibold">
                  Stage 1 Forensic Normalization Telemetry
                </span>
                <span className="text-[10px] text-[#64748B]">
                  Length: {verdict.processing_meta.normalization.original_length} raw {'->'} {verdict.processing_meta.normalization.normalized_length} norm
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-[#94A3B8] block text-[10px]">Zero-Width Chars:</span>
                  <span className={verdict.processing_meta.normalization.invisible_chars_found ? 'text-[#F87171] font-bold' : 'text-[#34D399]'}>
                    {verdict.processing_meta.normalization.invisible_chars_found ? 'DETECTED & NEUTRALIZED' : 'CLEAN'}
                  </span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block text-[10px]">Unicode Anomaly:</span>
                  <span className={verdict.processing_meta.normalization.suspicious_unicode ? 'text-[#F87171] font-bold' : 'text-[#34D399]'}>
                    {verdict.processing_meta.normalization.suspicious_unicode ? 'FLAGGED' : 'PASSED'}
                  </span>
                </div>
                <div>
                  <span className="text-[#94A3B8] block text-[10px]">Encoding Flags:</span>
                  <span className={verdict.processing_meta.normalization.encoding_anomaly ? 'text-[#FBBF24] font-bold' : 'text-[#34D399]'}>
                    {verdict.processing_meta.normalization.encoding_anomaly ? 'ANOMALIES PRESENT' : 'STANDARD UTF-8'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'checks' && (
        <div className="space-y-1.5 pt-1 max-h-64 overflow-y-auto">
          {Object.entries(verdict.checks || {}).map(([key, check]) => (
            <div
              key={key}
              className="soc-panel-sub p-2 rounded flex items-start justify-between text-xs font-mono"
            >
              <div className="flex items-start space-x-2">
                {check.passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#34D399] mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-[#F87171] mt-0.5 shrink-0" />
                )}
                <div>
                  <span className="font-semibold text-[#F1F5F9] block">{key.replace(/_/g, ' ').toUpperCase()}</span>
                  <span className="text-[10px] text-[#94A3B8]">{check.detail}</span>
                </div>
              </div>

              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                  check.passed
                    ? 'bg-emerald-950/40 text-[#34D399] border-emerald-800'
                    : 'bg-rose-950/40 text-[#F87171] border-rose-800'
                }`}
              >
                {check.passed ? 'PASSED' : 'FAILED'}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'json' && (
        <div className="relative pt-1">
          <pre className="p-3.5 rounded bg-[#080D16] border border-[#263449] text-[11px] font-mono text-[#22D3EE] overflow-x-auto max-h-72 leading-relaxed">
            {JSON.stringify(verdict, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
