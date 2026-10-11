import React from 'react';
import { ShieldCheck, ShieldAlert, Activity, Sliders, Landmark, Terminal } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  backendHealthy: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, backendHealthy }) => {
  const navItems = [
    { id: 'sandbox', label: 'Guardrail Sandbox', icon: Terminal },
    { id: 'attack-lab', label: 'Attack Matrix Lab', icon: ShieldAlert },
    { id: 'telemetry', label: 'SIEM Telemetry', icon: Activity },
    { id: 'policy', label: 'Policy Engine', icon: Sliders },
    { id: 'core-bank', label: 'Core Banking Ledger', icon: Landmark },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-cyan-900/40 bg-[#060a1c]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={() => setActiveTab('sandbox')}
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#060a1c]"></div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300">
                  BANKISM
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 uppercase tracking-widest font-semibold">
                  v2.4 Blue-Team
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Deterministic Financial AI Firewall & Guardrail Defense
              </p>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Status Indicator & Live Pill */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/60 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'
                }`}
              />
              <span className="text-slate-300 font-mono text-[11px]">
                {backendHealthy ? 'FIREWALL ACTIVE' : 'CONNECTING...'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile & Tablet Secondary Navigation Row */}
        <div className="flex lg:hidden overflow-x-auto space-x-1.5 py-2.5 border-t border-slate-800/60 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900/60 border border-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
