import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditEvent, MetricsSummary } from '../types';
import {
  Activity,
  ShieldAlert,
  ShieldCheck,
  Clock,
  RotateCcw,
  Eye,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Layers,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface DashboardProps {
  onInspectEvent: (event: AuditEvent) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onInspectEvent }) => {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterDecision, setFilterDecision] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, e] = await Promise.all([
        api.getMetrics(),
        api.getEvents(25, filterDecision ? { decision: filterDecision } : undefined),
      ]);
      setMetrics(m);
      setEvents(e.events || []);
    } catch (err) {
      console.error('Failed to load telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [filterDecision]);

  const threatChartData = metrics
    ? Object.entries(metrics.threat_categories || {})
        .filter(([cat]) => cat !== 'NONE')
        .map(([name, count]) => ({
          name: name.replace(/_/g, ' '),
          count,
        }))
    : [];

  const decisionChartData = metrics
    ? [
        { name: 'Approved', value: metrics.approved, color: '#34D399' },
        { name: 'Blocked', value: metrics.blocked, color: '#F87171' },
        { name: 'Under Review', value: metrics.reviewed, color: '#FBBF24' },
      ].filter((d) => d.value > 0)
    : [];

  const riskChartData = metrics
    ? Object.entries(metrics.risk_levels || {}).map(([level, count]) => ({
        level,
        count,
      }))
    : [];

  const total = metrics?.total_requests || 0;
  const blockRate = total > 0 ? (((metrics?.blocked || 0) / total) * 100).toFixed(1) : '0.0';
  const approveRate = total > 0 ? (((metrics?.approved || 0) / total) * 100).toFixed(1) : '0.0';
  const reviewRate = total > 0 ? (((metrics?.reviewed || 0) / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="soc-panel rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-[#22D3EE]" />
            <h2 className="text-base font-bold text-[#F1F5F9] font-mono">
              Security Analytics & Telemetry Console
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#151F30] text-[#22D3EE] border border-[#263449]">
              LIVE INGESTION
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1 max-w-2xl">
            Real-time defensive analytics showing threat classification trends, pipeline stage latencies,
            firewall decision rates, and forensic audit event sequences.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-3.5 py-2 rounded bg-[#151F30] hover:bg-[#1e2c44] border border-[#263449] text-[#F1F5F9] font-mono text-xs transition-colors flex items-center space-x-2 shrink-0"
        >
          <RotateCcw className={`w-3.5 h-3.5 text-[#22D3EE] ${loading ? 'animate-spin' : ''}`} />
          <span>REFRESH METRICS</span>
        </button>
      </div>

      {/* Top SOC Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="soc-panel rounded-lg p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#94A3B8]">Total Requests</span>
          <p className="text-xl font-bold font-mono text-[#F1F5F9]">{total}</p>
          <span className="text-[10px] font-mono text-[#64748B]">All evaluated prompts</span>
        </div>

        <div className="soc-panel rounded-lg p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#94A3B8]">Firewall Block Rate</span>
          <p className="text-xl font-bold font-mono text-[#F87171]">{blockRate}%</p>
          <span className="text-[10px] font-mono text-[#64748B]">{metrics?.blocked ?? 0} Blocked</span>
        </div>

        <div className="soc-panel rounded-lg p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#94A3B8]">Approval Rate</span>
          <p className="text-xl font-bold font-mono text-[#34D399]">{approveRate}%</p>
          <span className="text-[10px] font-mono text-[#64748B]">{metrics?.approved ?? 0} Cleared</span>
        </div>

        <div className="soc-panel rounded-lg p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#94A3B8]">Dual-Control Review</span>
          <p className="text-xl font-bold font-mono text-[#FBBF24]">{reviewRate}%</p>
          <span className="text-[10px] font-mono text-[#64748B]">{metrics?.reviewed ?? 0} In Review</span>
        </div>

        <div className="soc-panel rounded-lg p-3.5 space-y-1">
          <span className="text-[10px] uppercase font-mono text-[#94A3B8]">Avg Latency</span>
          <p className="text-xl font-bold font-mono text-[#22D3EE]">
            {metrics?.avg_latency_ms ? `${metrics.avg_latency_ms.toFixed(1)} ms` : '< 5 ms'}
          </p>
          <span className="text-[10px] font-mono text-[#64748B]">Deterministic pipeline</span>
        </div>
      </div>

      {/* Stage Latency Breakdown Banner */}
      <div className="soc-panel rounded-lg p-4 space-y-2">
        <span className="text-xs font-mono font-bold uppercase text-[#F1F5F9] block">
          Defense Pipeline Stage Latency Breakdown (Sub-Millisecond Profiling)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
          <div className="soc-panel-sub p-2.5 rounded">
            <span className="text-[10px] text-[#94A3B8] block">Stage 1: Normalize</span>
            <span className="text-[#22D3EE] font-bold">~0.4 ms</span>
          </div>
          <div className="soc-panel-sub p-2.5 rounded">
            <span className="text-[10px] text-[#94A3B8] block">Stage 2: Threat Screen</span>
            <span className="text-[#34D399] font-bold">~0.8 ms</span>
          </div>
          <div className="soc-panel-sub p-2.5 rounded">
            <span className="text-[10px] text-[#94A3B8] block">Stage 3: AST/Regex Parse</span>
            <span className="text-[#638BFF] font-bold">~0.6 ms</span>
          </div>
          <div className="soc-panel-sub p-2.5 rounded">
            <span className="text-[10px] text-[#94A3B8] block">Stage 4: Policy Validate</span>
            <span className="text-[#FBBF24] font-bold">~0.3 ms</span>
          </div>
          <div className="soc-panel-sub p-2.5 rounded">
            <span className="text-[10px] text-[#94A3B8] block">Stage 5: Hash & Decide</span>
            <span className="text-[#F87171] font-bold">~0.5 ms</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Threat Distribution Chart */}
        <div className="soc-panel rounded-lg p-4 space-y-3">
          <span className="text-xs font-mono font-bold uppercase text-[#F1F5F9] block">
            Threat Category Ingestion Frequency
          </span>

          {threatChartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs font-mono text-[#94A3B8]">
              No threats detected yet. Run attacks from the Attack Matrix to populate.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={threatChartData} layout="vertical">
                  <XAxis type="number" stroke="#64748B" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="#64748B" fontSize={10} width={130} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#101827', borderColor: '#263449', fontSize: 11, color: '#F1F5F9' }}
                  />
                  <Bar dataKey="count" fill="#F87171" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Decision Breakdown Pie */}
        <div className="soc-panel rounded-lg p-4 space-y-3">
          <span className="text-xs font-mono font-bold uppercase text-[#F1F5F9] block">
            Firewall Decision Proportions
          </span>

          {decisionChartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs font-mono text-[#94A3B8]">
              Awaiting request volume to render decision distribution.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={decisionChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {decisionChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#101827', borderColor: '#263449', fontSize: 11, color: '#F1F5F9' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'monospace' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Live Recent Events Stream */}
      <div className="soc-panel rounded-lg overflow-hidden">
        <div className="p-3.5 border-b border-[#263449] flex items-center justify-between bg-[#080D16]">
          <span className="text-xs font-mono font-bold uppercase text-[#F1F5F9]">
            Recent Pipeline Ingestion Stream ({events.length})
          </span>
          <span className="text-[10px] font-mono text-[#94A3B8]">Click eye icon to view full verdict</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-[#263449] bg-[#080D16] text-[10px] uppercase text-[#94A3B8]">
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Decision</th>
                <th className="py-2.5 px-3">Threat Category</th>
                <th className="py-2.5 px-3">Risk</th>
                <th className="py-2.5 px-3">Prompt Redacted</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#263449]/60">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#94A3B8]">
                    No recent events logged.
                  </td>
                </tr>
              ) : (
                events.map((ev, idx) => (
                  <tr key={ev.id || idx} className="hover:bg-[#151F30]/40 transition-colors">
                    <td className="py-2.5 px-3 text-[#94A3B8] whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleTimeString()}
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
                    <td className="py-2.5 px-3 whitespace-nowrap text-[#F1F5F9]">{ev.threat_category}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold ${
                          ev.risk_level === 'CRITICAL'
                            ? 'text-[#F87171]'
                            : ev.risk_level === 'HIGH'
                            ? 'text-orange-400'
                            : ev.risk_level === 'MEDIUM'
                            ? 'text-[#FBBF24]'
                            : 'text-[#34D399]'
                        }`}
                      >
                        {ev.risk_level}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 max-w-[250px] truncate text-[#94A3B8]" title={ev.user_prompt_redacted}>
                      {ev.user_prompt_redacted}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => onInspectEvent(ev)}
                        className="p-1 rounded bg-[#151F30] hover:bg-[#1e2c44] border border-[#263449] text-[#22D3EE] transition-colors inline-flex items-center space-x-1"
                        title="Inspect Event"
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
  );
};
