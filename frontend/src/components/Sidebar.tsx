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
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Flame,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'attack-matrix', label: 'Attack Matrix', icon: ShieldAlert, badge: '42' },
    { id: 'playground', label: 'Request Playground', icon: Terminal, badge: 'LIVE' },
    { id: 'threat-analytics', label: 'Threat Analytics', icon: BarChart3 },
    { id: 'policies', label: 'Policies & Guardrails', icon: Sliders },
    { id: 'transactions', label: 'Transactions', icon: Landmark, badge: 'CORE' },
    { id: 'audit-logs', label: 'Audit Logs', icon: FileCheck2, badge: 'SHA-256' },
    { id: 'settings', label: 'Settings', icon: HeartPulse },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col border-r border-orange-500/15 bg-[#0B0D14] transition-all duration-200 z-30 shrink-0 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-3.5 border-b border-orange-500/15">
        {!collapsed ? (
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 via-amber-600 to-orange-700 flex items-center justify-center text-white shrink-0 font-mono font-bold text-xs shadow-md shadow-orange-500/25">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-xs tracking-wider text-slate-100">BANKISM</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/25 font-semibold">
                  v1.0
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-sans block leading-tight">AI Firewall Core</span>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 via-amber-600 to-orange-700 flex items-center justify-center text-white font-mono font-bold text-xs shadow-md shadow-orange-500/25">
            <Flame className="w-4 h-4 text-white" />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] border border-transparent hover:border-orange-500/20 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'attack-matrix' && activeTab === 'attack-lab') ||
            (item.id === 'playground' && activeTab === 'sandbox') ||
            (item.id === 'threat-analytics' && activeTab === 'telemetry') ||
            (item.id === 'policies' && activeTab === 'policy') ||
            (item.id === 'audit-logs' && activeTab === 'ledger') ||
            (item.id === 'settings' && activeTab === 'health');

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center rounded-lg text-xs font-medium transition-all ${
                collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 font-semibold shadow-sm shadow-orange-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-orange-400' : 'text-slate-400'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!collapsed && item.badge && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
                    isActive
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/35'
                      : 'bg-slate-900/80 text-slate-400 border-white/10'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer Context */}
      {!collapsed && (
        <div className="p-3 border-t border-orange-500/15 bg-[#08090E]/90">
          <div className="flex items-center space-x-2 text-[11px] font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Deterministic Gate</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono block mt-0.5 pl-4">
            Zero-Trust LLM Isolation
          </span>
        </div>
      )}
    </aside>
  );
};
