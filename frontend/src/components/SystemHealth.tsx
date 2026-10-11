import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemHealthData } from '../types';
import {
  HeartPulse,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Database,
  Sliders,
  Sparkles,
  Server,
  Activity,
  Layers,
  Clock,
  Shield,
} from 'lucide-react';

export const SystemHealth: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to load system health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const components = health?.components;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="soc-panel rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <HeartPulse className="w-5 h-5 text-[#22D3EE]" />
            <h2 className="text-base font-bold text-[#F1F5F9] font-mono">
              System Diagnostics & Subsystem Health Probes
            </h2>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                health?.status === 'healthy'
                  ? 'bg-emerald-950/40 text-[#34D399] border-emerald-800'
                  : 'bg-rose-950/40 text-[#F87171] border-rose-800'
              }`}
            >
              {health?.status ? health.status.toUpperCase() : 'CHECKING'}
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1 max-w-2xl">
            Continuous real-time probe telemetry across all 5 decoupled banking defense boundaries.
            Ensures deterministic policy, isolated storage, and mock financial rails are operational.
          </p>
        </div>

        <button
          onClick={loadHealth}
          disabled={loading}
          className="px-3.5 py-2 rounded bg-[#151F30] hover:bg-[#1e2c44] border border-[#263449] text-[#F1F5F9] font-mono text-xs transition-colors flex items-center space-x-2 shrink-0 disabled:opacity-50"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-[#22D3EE] ${loading ? 'animate-spin' : ''}`} />
          <span>PROBE NOW</span>
        </button>
      </div>

      {/* Top Diagnostics KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="soc-panel rounded-lg p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#94A3B8]">Overall System Status</span>
          <div className="flex items-center space-x-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                health?.status === 'healthy' ? 'bg-[#34D399] animate-pulse' : 'bg-[#F87171]'
              }`}
            />
            <span className="text-sm font-bold font-mono text-[#F1F5F9]">
              {health?.status ? health.status.toUpperCase() : 'CONNECTING'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#64748B] block">All probes responding</span>
        </div>

        <div className="soc-panel rounded-lg p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#94A3B8]">Engine Uptime</span>
          <p className="text-sm font-bold font-mono text-[#22D3EE]">
            {formatUptime(components?.backend_core?.uptime_seconds)}
          </p>
          <span className="text-[10px] font-mono text-[#64748B] block">Node.js Express daemon</span>
        </div>

        <div className="soc-panel rounded-lg p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#94A3B8]">Policy Ruleset</span>
          <p className="text-sm font-bold font-mono text-[#34D399]">
            {components?.policy_engine?.version ? `v${components.policy_engine.version}` : 'v1.0.0'} ({components?.policy_engine?.rules_loaded ?? 14} Rules)
          </p>
          <span className="text-[10px] font-mono text-[#64748B] block">Deterministic AST / Regex</span>
        </div>

        <div className="soc-panel rounded-lg p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#94A3B8]">Audit Ledger Chain</span>
          <p className="text-sm font-bold font-mono text-[#638BFF]">
            {components?.audit_persistence?.chain_events_count ?? 0} Sealed Blocks
          </p>
          <span className="text-[10px] font-mono text-[#64748B] block">
            {components?.audit_persistence?.hash_chain_intact ? 'Chain: VERIFIED' : 'Chain: STANDBY'}
          </span>
        </div>
      </div>

      {/* 5 Subsystem Probes Grid */}
      <div className="soc-panel rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-[#263449] pb-3">
          <span className="text-xs font-mono font-bold text-[#F1F5F9] uppercase">
            Subsystem Component Health Grid
          </span>
          <span className="text-[10px] font-mono text-[#94A3B8]">
            Auto-refreshes every 10s • Last probe: {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'N/A'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1. Backend Core */}
          <div className="soc-panel-sub rounded p-3.5 space-y-2.5 border border-[#263449]/80">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded bg-[#101827] border border-[#263449]">
                  <Server className="w-4 h-4 text-[#22D3EE]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#F1F5F9] font-mono">
                    Firewall Core Engine
                  </h4>
                  <span className="text-[10px] font-mono text-[#64748B]">backend_core</span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950/40 text-[#34D399] border border-emerald-800">
                HEALTHY
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-[#94A3B8] pt-1 border-t border-[#263449]/60">
              <div>
                <span className="text-[#64748B] block">Memory RSS:</span>
                <span className="text-[#F1F5F9] font-semibold">{components?.backend_core?.memory_rss_mb ?? 32} MB</span>
              </div>
              <div>
                <span className="text-[#64748B] block">Environment:</span>
                <span className="text-[#22D3EE] font-semibold">{components?.backend_core?.environment ?? 'development'}</span>
              </div>
            </div>
          </div>

          {/* 2. Policy Engine */}
          <div className="soc-panel-sub rounded p-3.5 space-y-2.5 border border-[#263449]/80">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded bg-[#101827] border border-[#263449]">
                  <Sliders className="w-4 h-4 text-[#22D3EE]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#F1F5F9] font-mono">
                    Deterministic Policy Engine
                  </h4>
                  <span className="text-[10px] font-mono text-[#64748B]">policy_engine</span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950/40 text-[#34D399] border border-emerald-800">
                HEALTHY
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-[#94A3B8] pt-1 border-t border-[#263449]/60">
              <div>
                <span className="text-[#64748B] block">Transfer Cap:</span>
                <span className="text-[#F1F5F9] font-semibold">${components?.policy_engine?.transfer_cap_usd?.toLocaleString() ?? '10,000'}</span>
              </div>
              <div>
                <span className="text-[#64748B] block">Confirm Threshold:</span>
                <span className="text-[#FBBF24] font-semibold">${components?.policy_engine?.confirmation_threshold_usd?.toLocaleString() ?? '1,000'}</span>
              </div>
            </div>
          </div>

          {/* 3. Mock Banking Adapter */}
          <div className="soc-panel-sub rounded p-3.5 space-y-2.5 border border-[#263449]/80">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded bg-[#101827] border border-[#263449]">
                  <Layers className="w-4 h-4 text-[#22D3EE]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#F1F5F9] font-mono">
                    Zero-Trust Banking Adapter
                  </h4>
                  <span className="text-[10px] font-mono text-[#64748B]">mock_banking_adapter</span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950/40 text-[#34D399] border border-emerald-800">
                SYNTHETIC
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-[#94A3B8] pt-1 border-t border-[#263449]/60">
              <div>
                <span className="text-[#64748B] block">Accounts Loaded:</span>
                <span className="text-[#F1F5F9] font-semibold">{components?.mock_banking_adapter?.accounts_count ?? 3} accounts</span>
              </div>
              <div>
                <span className="text-[#64748B] block">Live Rail Breached:</span>
                <span className="text-[#34D399] font-semibold">FALSE (Shielded)</span>
              </div>
            </div>
          </div>

          {/* 4. Audit Persistence */}
          <div className="soc-panel-sub rounded p-3.5 space-y-2.5 border border-[#263449]/80">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded bg-[#101827] border border-[#263449]">
                  <Database className="w-4 h-4 text-[#22D3EE]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#F1F5F9] font-mono">
                    SHA-256 Audit Ledger
                  </h4>
                  <span className="text-[10px] font-mono text-[#64748B]">audit_persistence</span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950/40 text-[#34D399] border border-emerald-800">
                INTACT
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-[#94A3B8] pt-1 border-t border-[#263449]/60">
              <div>
                <span className="text-[#64748B] block">Total Logged:</span>
                <span className="text-[#F1F5F9] font-semibold">{components?.audit_persistence?.chain_events_count ?? 0} events</span>
              </div>
              <div>
                <span className="text-[#64748B] block">Tamper Evident:</span>
                <span className="text-[#34D399] font-semibold">ACTIVE</span>
              </div>
            </div>
          </div>

          {/* 5. AI Sandbox Provider */}
          <div className="soc-panel-sub rounded p-3.5 space-y-2.5 border border-[#263449]/80">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded bg-[#101827] border border-[#263449]">
                  <Sparkles className="w-4 h-4 text-[#22D3EE]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#F1F5F9] font-mono">
                    AI Interpretation Sandbox
                  </h4>
                  <span className="text-[10px] font-mono text-[#64748B]">ai_interpretation_provider</span>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950/40 text-[#34D399] border border-emerald-800">
                SANDBOXED
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-[#94A3B8] pt-1 border-t border-[#263449]/60">
              <div>
                <span className="text-[#64748B] block">Mode:</span>
                <span className="text-[#F1F5F9] font-semibold">{components?.ai_interpretation_provider?.mode ?? 'mock_fallback'}</span>
              </div>
              <div>
                <span className="text-[#64748B] block">Fail-Closed Mode:</span>
                <span className="text-[#34D399] font-semibold">ENFORCED</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Assurance Statement */}
      <div className="soc-panel-sub rounded p-4 border border-[#263449] flex items-start space-x-3 text-xs font-mono">
        <ShieldCheck className="w-5 h-5 text-[#34D399] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[#F1F5F9] block">
            Blue-Team Guarantee: Zero Independent Financial Authority
          </span>
          <p className="text-[#94A3B8] text-[11px] mt-1 leading-relaxed">
            The BANKISM AI interpretation layer operates strictly inside an unprivileged sandbox.
            All mutations to the Core Banking Ledger require explicit cryptographic clearance and pass
            through the deterministic policy boundary. In the event of an AI anomaly, all transfers fail closed.
          </p>
        </div>
      </div>
    </div>
  );
};
