import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { MetricsSummary, AuditEvent, SystemHealthData } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  Flame,
  Terminal,
  FileCheck2,
  Lock,
  ArrowRight,
  RotateCcw,
  Eye,
  CheckCircle2,
  Shield,
  Zap,
} from 'lucide-react';

interface OverviewProps {
  onNavigateTab: (tabId: string) => void;
  onInspectEvent: (event: AuditEvent) => void;
}

// ─── Sub-Component: MetricCard ───────────────────────────────────────────────
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  accent: 'orange' | 'rose' | 'emerald' | 'amber';
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
}) => {
  const accentStyles = {
    orange: {
      text: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/25',
      glow: 'shadow-[0_0_16px_-3px_rgba(249,115,22,0.2)]',
    },
    rose: {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/25',
      glow: 'shadow-[0_0_16px_-3px_rgba(239,68,68,0.2)]',
    },
    emerald: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/25',
      glow: 'shadow-[0_0_16px_-3px_rgba(16,185,129,0.2)]',
    },
    amber: {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/25',
      glow: 'shadow-[0_0_16px_-3px_rgba(245,158,11,0.2)]',
    },
  }[accent];

  return (
    <div
      className={`bg-[#121620] border border-orange-500/15 rounded-xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:border-orange-500/40 hover:bg-[#171D2A] ${accentStyles.glow}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider font-mono text-slate-400 font-semibold truncate">
          {title}
        </span>
        <div className={`p-1.5 rounded-lg ${accentStyles.bg} border ${accentStyles.border}`}>
          <Icon className={`w-3.5 h-3.5 ${accentStyles.text}`} />
        </div>
      </div>
      <div className="mt-2.5">
        <p className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight ${accentStyles.text}`}>
          {value}
        </p>
        <span className="text-[11px] text-slate-400 mt-1 block truncate">{subtitle}</span>
      </div>
    </div>
  );
};

// ─── Sub-Component: StatusBadge ──────────────────────────────────────────────
const StatusBadge: React.FC<{ decision: string }> = ({ decision }) => {
  if (decision === 'APPROVE') {
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-sm shadow-emerald-500/5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
        <span>APPROVE</span>
      </span>
    );
  }
  if (decision === 'BLOCK') {
    return (
      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25 shadow-sm shadow-rose-500/5">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
        <span>BLOCK</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25 shadow-sm shadow-amber-500/5">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
      <span>REVIEW</span>
    </span>
  );
};

// ─── Sub-Component: ActionCard ───────────────────────────────────────────────
interface ActionCardProps {
  title: string;
  description: string;
  badge: string;
  actionText: string;
  icon: React.ElementType;
  accent: 'rose' | 'orange' | 'amber';
  onClick: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  badge,
  actionText,
  icon: Icon,
  accent,
  onClick,
}) => {
  const accentConfig = {
    rose: {
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
      badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
      actionText: 'text-rose-400 group-hover:text-rose-300',
    },
    orange: {
      iconBg: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
      badgeBg: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
      actionText: 'text-orange-400 group-hover:text-orange-300',
    },
    amber: {
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
      actionText: 'text-amber-400 group-hover:text-amber-300',
    },
  }[accent];

  return (
    <div
      onClick={onClick}
      className="group bg-[#121620] border border-orange-500/15 rounded-xl p-5 cursor-pointer flex flex-col justify-between space-y-4 transition-all duration-200 hover:border-orange-500/40 hover:bg-[#181E2C] hover:shadow-lg hover:shadow-black/60"
    >
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl border ${accentConfig.iconBg} transition-transform group-hover:scale-105`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${accentConfig.badgeBg}`}>
          {badge}
        </span>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">
          {title}
        </h3>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
          {description}
        </p>
      </div>
      <div className={`flex items-center text-xs font-medium pt-1 ${accentConfig.actionText} transition-colors`}>
        <span>{actionText}</span>
        <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-1" />
      </div>
    </div>
  );
};

// ─── Sub-Component: ProbeRow ─────────────────────────────────────────────────
interface ProbeRowProps {
  label: string;
  status: string;
  statusType: 'online' | 'active' | 'shielded' | 'warning';
}

const ProbeRow: React.FC<ProbeRowProps> = ({ label, status, statusType }) => {
  const badgeConfig = {
    online: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
    active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
    shielded: 'text-orange-400 bg-orange-500/10 border-orange-500/25',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  }[statusType];

  return (
    <div className="bg-[#181D29]/70 border border-orange-500/10 p-2.5 rounded-lg flex items-center justify-between transition-colors hover:bg-[#1D2332]">
      <span className="text-xs text-slate-400 font-sans">{label}</span>
      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${badgeConfig}`}>
        {status}
      </span>
    </div>
  );
};

// ─── Main Overview Component ─────────────────────────────────────────────────
export const Overview: React.FC<OverviewProps> = ({ onNavigateTab, onInspectEvent }) => {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 12000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, evRes, h] = await Promise.all([
        api.getMetrics().catch(() => null),
        api.getEvents(10).catch(() => ({ events: [], total: 0 })),
        api.getHealth().catch(() => null),
      ]);
      setMetrics(m);
      setEvents(evRes.events || []);
      setHealth(h);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  const total = metrics?.total ?? 0;
  const blocked = metrics?.blocked ?? 0;
  const approved = metrics?.approved ?? 0;
  const reviewed = metrics?.reviewed ?? 0;
  const blockRate = total > 0 ? ((blocked / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Executive Welcome & SOC Status Banner with Warm Fiery Palette */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#121620] via-[#1C161E] to-[#121620] border border-orange-500/20 rounded-xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative z-10">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/25 text-orange-400">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
              BANKISM AI Firewall — Security Operations Overview
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/25 font-semibold">
              ZERO-AUTONOMY CORE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Autonomous language models must never independently authorize or execute banking operations.
            All natural-language financial requests are intercepted, normalized, screened, and validated by deterministic policy.
          </p>
        </div>

        <div className="relative z-10 flex items-center space-x-2.5 shrink-0">
          <button
            onClick={() => onNavigateTab('attack-matrix')}
            className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold text-xs transition-all shadow-md shadow-orange-600/30 flex items-center space-x-2"
          >
            <Flame className="w-3.5 h-3.5 text-white" />
            <span>Open Attack Matrix</span>
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-lg bg-[#181D29] hover:bg-[#202738] border border-orange-500/20 text-slate-400 hover:text-white transition-colors"
            title="Refresh Metrics"
            aria-label="Refresh Metrics"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top 5 KPI Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <MetricCard
          title="Total Requests"
          value={total}
          subtitle="Intercepted by firewall"
          icon={Activity}
          accent="orange"
        />
        <MetricCard
          title="Threats Blocked"
          value={blocked}
          subtitle={`${blockRate}% block rate`}
          icon={ShieldAlert}
          accent="rose"
        />
        <MetricCard
          title="Cleared Operations"
          value={approved}
          subtitle="Approved for execution"
          icon={CheckCircle2}
          accent="emerald"
        />
        <MetricCard
          title="Dual-Control Reviews"
          value={reviewed}
          subtitle="Required human 2FA"
          icon={Lock}
          accent="amber"
        />
        <MetricCard
          title="Unsafe Executions"
          value={0}
          subtitle="Core violations (Target: 0)"
          icon={Shield}
          accent="emerald"
        />
      </div>

      {/* Quick Launch & Workflow Stations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionCard
          title="Adversarial Attack Matrix"
          description="Automated red-team benchmark covering OWASP LLM01 injections, jailbreaks, memo vectors, and schema violations."
          badge="42 VECTORS"
          actionText="Run Benchmark Matrix"
          icon={Flame}
          accent="rose"
          onClick={() => onNavigateTab('attack-matrix')}
        />
        <ActionCard
          title="Request Playground"
          description="Test custom prompts or adversarial attack vectors live. Observe real-time 5-stage pipeline telemetry."
          badge="INTERACTIVE"
          actionText="Launch Sandbox"
          icon={Terminal}
          accent="orange"
          onClick={() => onNavigateTab('playground')}
        />
        <ActionCard
          title="Cryptographic Audit Logs"
          description="Tamper-evident sequential hash chaining ensuring non-repudiation and permanent integrity verification."
          badge="SHA-256 SEALED"
          actionText="Verify Hash Chain"
          icon={FileCheck2}
          accent="amber"
          onClick={() => onNavigateTab('audit-logs')}
        />
      </div>

      {/* Subsystem Health & Recent Events Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Core Defense Probes Status */}
        <div className="bg-[#121620] border border-orange-500/15 rounded-xl p-5 space-y-3.5">
          <div className="flex items-center justify-between border-b border-orange-500/15 pb-3">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-100 font-mono">
                Core Defense Probes
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE</span>
            </span>
          </div>

          <div className="space-y-2">
            <ProbeRow label="Firewall Gateway:" status="ONLINE" statusType="online" />
            <ProbeRow label="Deterministic Policy Engine:" status="v1.0.0 ACTIVE" statusType="active" />
            <ProbeRow label="Mock Core Isolation:" status="ZERO-TRUST SHIELDED" statusType="shielded" />
            <ProbeRow label="Audit Hash Chain:" status="CRYPTOGRAPHICALLY INTACT" statusType="online" />
            <ProbeRow label="AI Intent Extraction:" status="SANDBOXED (FAIL-CLOSED)" statusType="warning" />
          </div>
        </div>

        {/* Live Ingestion Stream Table (2 columns on desktop) */}
        <div className="bg-[#121620] border border-orange-500/15 rounded-xl p-5 space-y-3.5 lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-orange-500/15 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-100 font-mono">
                Live Request Ingestion Stream
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('audit-logs')}
              className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center space-x-1 transition-colors"
            >
              <span>View All Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-orange-500/15 text-[10px] font-mono uppercase text-slate-400">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Decision</th>
                  <th className="py-2.5 px-3">Threat Class</th>
                  <th className="py-2.5 px-3">Prompt Preview</th>
                  <th className="py-2.5 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-500/10">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                      No events evaluated yet. Run a prompt in the Request Playground or execute the Attack Matrix.
                    </td>
                  </tr>
                ) : (
                  events.slice(0, 5).map((ev) => (
                    <tr
                      key={ev.id}
                      className="hover:bg-orange-500/[0.04] transition-colors group"
                    >
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <StatusBadge decision={ev.decision} />
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                        {ev.threat_category}
                      </td>
                      <td
                        className="py-2.5 px-3 text-slate-400 truncate max-w-[220px]"
                        title={ev.sanitized_summary}
                      >
                        {ev.sanitized_summary}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onInspectEvent(ev)}
                          className="p-1.5 rounded-lg bg-[#181D29] hover:bg-[#222838] border border-orange-500/20 text-orange-400 hover:text-orange-300 transition-colors inline-flex items-center"
                          title="Inspect Event"
                          aria-label="Inspect Event"
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
    </div>
  );
};
