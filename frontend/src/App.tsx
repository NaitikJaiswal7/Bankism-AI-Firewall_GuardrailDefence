import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Overview } from './components/Overview';
import { Playground } from './components/Playground';
import { AttackLab } from './components/AttackLab';
import { Dashboard } from './components/Dashboard';
import { PolicyConfig } from './components/PolicyConfig';
import { MockLedger } from './components/MockLedger';
import { AuditLedger } from './components/AuditLedger';
import { SystemHealth } from './components/SystemHealth';
import { EventModal } from './components/EventModal';
import { AuditEvent, SystemHealthData } from './types';
import { api } from './services/api';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [inspectedEvent, setInspectedEvent] = useState<AuditEvent | null>(null);
  const [ledgerRefreshTrigger, setLedgerRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 12000);
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch {
      setHealth(null);
    }
  };

  const handleTransactionSuccess = () => {
    setLedgerRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen flex bg-[#090A0F] text-slate-100 font-sans selection:bg-orange-500/25 selection:text-orange-200">
      {/* SOC Collapsible Sidebar (Desktop) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Sticky Header with Subsystem Telemetry Badge */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          health={health}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Connection Warning Banner if backend is not reachable */}
          {health === null && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs font-mono flex items-center space-x-3 shadow-lg">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold">Firewall Service Connecting...</span>
                <p className="text-amber-300/80 text-[11px] mt-0.5">
                  Connecting to BANKISM firewall server on port 3001. Ensure backend process is active.
                </p>
              </div>
            </div>
          )}

          {/* 8 Enterprise SOC Architecture Views */}
          {activeTab === 'overview' && (
            <Overview
              onNavigateTab={(tab) => setActiveTab(tab)}
              onInspectEvent={(event) => setInspectedEvent(event)}
            />
          )}

          {(activeTab === 'attack-matrix' || activeTab === 'attack-lab') && <AttackLab />}

          {(activeTab === 'playground' || activeTab === 'sandbox') && (
            <Playground
              onTransactionSuccess={handleTransactionSuccess}
              onNavigateToLedger={() => setActiveTab('transactions')}
            />
          )}

          {(activeTab === 'threat-analytics' || activeTab === 'telemetry') && (
            <Dashboard onInspectEvent={(event) => setInspectedEvent(event)} />
          )}

          {(activeTab === 'policies' || activeTab === 'policy') && <PolicyConfig />}

          {activeTab === 'transactions' && (
            <MockLedger refreshTrigger={ledgerRefreshTrigger} />
          )}

          {(activeTab === 'audit-logs' || activeTab === 'ledger') && (
            <AuditLedger onInspectEvent={(event) => setInspectedEvent(event)} />
          )}

          {(activeTab === 'settings' || activeTab === 'health') && <SystemHealth />}
        </main>

        {/* SOC Global Defense Assurance Footer */}
        <footer className="mt-auto border-t border-orange-500/15 bg-[#08090E]/90 backdrop-blur-md py-4 text-slate-400 text-xs font-mono px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              <span className="text-slate-200 font-medium font-sans">
                BANKISM — Blue-Team AI Firewall & Guardrail Defense (v1.0)
              </span>
            </div>

            <div className="flex items-center space-x-3 text-[11px] text-slate-500">
              <span>Deterministic AST/Regex Parsing</span>
              <span>•</span>
              <span>Zero-Trust LLM Isolation</span>
              <span>•</span>
              <span>SHA-256 Hash Chain</span>
              <span>•</span>
              <span>OWASP LLM Top 10</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Forensic Audit Event Modal */}
      <EventModal
        event={inspectedEvent}
        onClose={() => setInspectedEvent(null)}
      />
    </div>
  );
};

export default App;
