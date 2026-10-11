import React from 'react';
import { Verdict } from '../types';
import {
  Binary,
  ShieldAlert,
  FileCode2,
  Lock,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface PipelineVisualizerProps {
  verdict: Verdict | null;
  loading: boolean;
}

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ verdict, loading }) => {
  const timings = verdict?.processing_meta?.stage_timings;

  const stages = [
    {
      id: 1,
      name: 'Normalization & Encoding',
      role: 'Sanitizes Unicode, homoglyphs & zero-width tricks',
      icon: Binary,
      timing: timings ? `${timings.normalize_ms}ms` : null,
      getStatus: () => {
        if (!verdict) return 'IDLE';
        const meta = verdict.processing_meta?.normalization;
        if (meta?.invisible_chars_found || meta?.suspicious_unicode || meta?.encoding_anomaly) {
          return 'FLAGGED';
        }
        return 'PASSED';
      },
      getEvidence: () => {
        if (!verdict) return 'Awaiting payload';
        const meta = verdict.processing_meta?.normalization;
        if (meta?.invisible_chars_found) return 'Zero-width character sequence detected & neutralized';
        if (meta?.encoding_anomaly) return 'Suspicious mixed encoding detected';
        return `Normalized cleanly (${meta?.normalized_length ?? 0} chars)`;
      },
    },
    {
      id: 2,
      name: 'Threat & Injection Screen',
      role: 'Screens prompt injection, jailbreaks & memo attacks',
      icon: ShieldAlert,
      timing: timings ? `${timings.screen_ms}ms` : null,
      getStatus: () => {
        if (!verdict) return 'IDLE';
        if (verdict.threat_category !== 'NONE') return 'BLOCKED';
        return 'PASSED';
      },
      getEvidence: () => {
        if (!verdict) return 'Awaiting scan';
        if (verdict.threat_category !== 'NONE') return `Detected signature: ${verdict.threat_category}`;
        return 'Zero adversarial injection signals';
      },
    },
    {
      id: 3,
      name: 'Intent & Entity Schema',
      role: 'Extracts operation, amount, currency & recipient',
      icon: FileCode2,
      timing: timings ? `${timings.parse_ms}ms` : null,
      getStatus: () => {
        if (!verdict) return 'IDLE';
        if (verdict.intent === 'UNKNOWN' || verdict.intent === 'UNSUPPORTED') return 'WARNING';
        return 'PASSED';
      },
      getEvidence: () => {
        if (!verdict) return 'Awaiting schema extraction';
        if (verdict.intent === 'TRANSFER') {
          const s = verdict.transaction_summary;
          return `Transfer: $${s?.amount ?? '?'} ${s?.currency ?? ''} -> ${s?.recipient_ref ?? '?'}`;
        }
        return `Intent validated: ${verdict.intent}`;
      },
    },
    {
      id: 4,
      name: 'Deterministic Policy & Limits',
      role: 'Applies transfer caps, 2FA triggers & recipient verification',
      icon: Lock,
      timing: timings ? `${timings.validate_ms}ms` : null,
      getStatus: () => {
        if (!verdict) return 'IDLE';
        const checks = verdict.checks || {};
        const anyFailed = Object.values(checks).some((c) => !c.passed);
        if (anyFailed && verdict.decision === 'BLOCK') return 'BLOCKED';
        if (verdict.requires_confirmation) return 'REVIEW';
        return 'PASSED';
      },
      getEvidence: () => {
        if (!verdict) return 'Awaiting policy validation';
        if (verdict.requires_confirmation) return 'Exceeds confirmation threshold (Dual-Control required)';
        const passedCount = Object.values(verdict.checks || {}).filter((c) => c.passed).length;
        const total = Object.values(verdict.checks || {}).length;
        return `${passedCount}/${total} policy checks satisfied`;
      },
    },
    {
      id: 5,
      name: 'Execution Boundary & Audit',
      role: 'Generates verdict, cryptographically links hash chain',
      icon: Cpu,
      timing: timings ? `${timings.decide_ms}ms` : null,
      getStatus: () => {
        if (!verdict) return 'IDLE';
        if (verdict.decision === 'BLOCK') return 'BLOCKED';
        if (verdict.decision === 'REVIEW') return 'REVIEW';
        return 'PASSED';
      },
      getEvidence: () => {
        if (!verdict) return 'Awaiting decision';
        return `Status: ${verdict.execution_status} | Hash: ${verdict.audit_hash ? verdict.audit_hash.substring(0, 10) + '...' : 'Recorded'}`;
      },
    },
  ];

  return (
    <div className="soc-panel rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-[#263449]">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-[#22D3EE]" />
          <h3 className="text-xs font-semibold text-[#F1F5F9] uppercase tracking-wider">
            5-Stage Pipeline Execution Trace
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-mono text-[#94A3B8]">
          {loading ? (
            <span className="text-[#22D3EE] animate-pulse">Running security stages...</span>
          ) : verdict ? (
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-[#22D3EE]" />
              <span>Pipeline Duration: {verdict.processing_meta?.processing_time_ms}ms</span>
            </span>
          ) : (
            'Standby'
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 relative">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const status = stage.getStatus();
          const evidence = stage.getEvidence();

          let statusBadge = 'bg-[#151F30] text-[#94A3B8] border-[#263449]';
          let borderAccent = 'border-[#263449]';

          if (loading) {
            statusBadge = 'bg-cyan-950/40 text-[#22D3EE] border-cyan-800 animate-pulse';
            borderAccent = 'border-cyan-800';
          } else if (status === 'PASSED') {
            statusBadge = 'bg-emerald-950/40 text-[#34D399] border-emerald-800';
            borderAccent = 'border-[#263449] border-l-2 border-l-[#34D399]';
          } else if (status === 'BLOCKED') {
            statusBadge = 'bg-rose-950/40 text-[#F87171] border-rose-800';
            borderAccent = 'border-[#263449] border-l-2 border-l-[#F87171]';
          } else if (status === 'FLAGGED' || status === 'REVIEW' || status === 'WARNING') {
            statusBadge = 'bg-amber-950/40 text-[#FBBF24] border-amber-800';
            borderAccent = 'border-[#263449] border-l-2 border-l-[#FBBF24]';
          }

          return (
            <div
              key={stage.id}
              className={`soc-panel-sub rounded p-3 flex flex-col justify-between ${borderAccent} transition-all`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[9px] font-mono font-bold text-[#94A3B8]">0{stage.id}</span>
                    <Icon className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </div>
                  <div className="flex items-center space-x-1">
                    {stage.timing && (
                      <span className="text-[9px] font-mono text-[#64748B]">{stage.timing}</span>
                    )}
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${statusBadge}`}>
                      {status}
                    </span>
                  </div>
                </div>

                <h4 className="text-[11px] font-semibold text-[#F1F5F9] leading-tight mb-1">
                  {stage.name}
                </h4>
                <p className="text-[10px] text-[#94A3B8] leading-normal line-clamp-2">
                  {stage.role}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-[#263449]/60">
                <p className="text-[9px] font-mono text-[#CBD5E1] truncate" title={evidence}>
                  {evidence}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
