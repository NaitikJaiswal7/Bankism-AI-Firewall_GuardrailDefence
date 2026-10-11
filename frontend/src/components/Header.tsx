import React from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  Terminal,
  BarChart3,
  Sliders,
  Landmark,
  FileCheck2,
  HeartPulse,
  Menu,
  X,
  AlertCircle,
  Shield,
  Flame,
} from 'lucide-react';
import { SystemHealthData } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  health: SystemHealthData | null;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  health,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const titles: Record<string, string> = {
    overview: 'Security Operations Overview',
    'attack-matrix': 'Adversarial Attack Matrix & Benchmark',
    'attack-lab': 'Adversarial Attack Matrix & Benchmark',
    playground: 'Request Playground & Defense Pipeline',
    sandbox: 'Request Playground & Defense Pipeline',
    'threat-analytics': 'Threat Analytics & Security Telemetry',
    telemetry: 'Threat Analytics & Security Telemetry',
    policies: 'Deterministic Policy Engine & Guardrails',
    policy: 'Deterministic Policy Engine & Guardrails',
    transactions: 'Mock Financial Core & Banking Ledger',
    'audit-logs': 'Cryptographic Audit Trail (SHA-256)',
    ledger: 'Cryptographic Audit Trail (SHA-256)',
    settings: 'System Diagnostics & Health Probes',
    health: 'System Diagnostics & Health Probes',
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'attack-matrix', label: 'Attack Matrix', icon: ShieldAlert },
    { id: 'playground', label: 'Playground', icon: Terminal },
    { id: 'threat-analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'policies', label: 'Policies', icon: Sliders },
    { id: 'transactions', label: 'Transactions', icon: Landmark },
    { id: 'audit-logs', label: 'Audit Logs', icon: FileCheck2 },
    { id: 'settings', label: 'Settings', icon: HeartPulse },
  ];

  const isHealthy = health?.status === 'healthy';

  return (
    <header className="border-b border-orange-500/15 bg-[#090A0F]/85 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Left: Mobile Toggle & Context Breadcrumb */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white bg-[#121620] border border-orange-500/20 hover:border-orange-500/40 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="flex items-center space-x-2">
            <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-orange-400/90 font-semibold">FIREWALL</span>
              <span className="text-slate-600">/</span>
            </div>
            <h1 className="text-xs sm:text-sm font-semibold text-slate-100 tracking-tight">
              {titles[activeTab] || 'Operational Console'}
            </h1>
          </div>
        </div>

        {/* Right: Environment Pills, Status Badges & Warnings */}
        <div className="flex items-center space-x-2.5">
          {/* Synthetic Sandbox Tag - Warm Fiery Accent */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-[11px] font-mono text-orange-400 shadow-sm shadow-orange-500/5">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
            <span className="font-semibold tracking-wide">SANDBOX</span>
            <span className="text-orange-500/70 hidden lg:inline">| SYNTHETIC CORE</span>
          </div>

          {/* Subsystem Health Indicator */}
          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono transition-colors ${
              isHealthy
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isHealthy ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)] animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span className="font-semibold tracking-wide">
              {isHealthy ? 'POLICY: ONLINE' : 'POLICY: DEGRADED'}
            </span>
          </div>

          {/* Mock Adapter Security Notice */}
          <div className="hidden xl:flex items-center space-x-1.5 text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/25">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>MOCK ADAPTER ONLY — NEVER CONNECT REAL ACCOUNTS</span>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-orange-500/15 bg-[#121620]/95 backdrop-blur-xl px-4 py-3 space-y-1 shadow-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
