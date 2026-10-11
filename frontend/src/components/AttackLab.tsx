import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { TestCase, TestRunReport, TestResult } from '../types';
import {
  Flame,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Download,
  Info,
  Check,
  Filter,
  ShieldAlert,
} from 'lucide-react';

export const AttackLab: React.FC = () => {
  const [suite, setSuite] = useState<TestCase[]>([]);
  const [report, setReport] = useState<TestRunReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [runningCategory, setRunningCategory] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASSED' | 'FAILED' | 'PENDING'>('ALL');
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [showMetricsInfo, setShowMetricsInfo] = useState<boolean>(false);
  const [downloaded, setDownloaded] = useState<boolean>(false);

  useEffect(() => {
    loadSuite();
  }, []);

  const loadSuite = async () => {
    try {
      const data = await api.getTestSuite();
      setSuite(data.tests || []);
    } catch (err) {
      console.error('Failed to load test suite:', err);
    }
  };

  const handleRunAllTests = async () => {
    setLoading(true);
    try {
      const runReport = await api.runTests();
      setReport(runReport);
    } catch (err) {
      console.error('Failed to run attack matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunCategory = async () => {
    if (selectedCategory === 'ALL') {
      return handleRunAllTests();
    }
    const categoryTests = suite.filter(t => t.category.toLowerCase().includes(selectedCategory.toLowerCase()));
    if (categoryTests.length === 0) return;

    setRunningCategory(true);
    try {
      const testIds = categoryTests.map(t => t.id);
      const categoryReport = await api.runTests(testIds);
      // Merge category results into existing report or set as report
      if (report) {
        const mergedResults = [...report.results];
        for (const newRes of categoryReport.results) {
          const idx = mergedResults.findIndex(r => r.test_name === newRes.test_name);
          if (idx >= 0) mergedResults[idx] = newRes;
          else mergedResults.push(newRes);
        }
        setReport({
          ...report,
          results: mergedResults,
          passed: mergedResults.filter(r => r.passed).length,
          failed: mergedResults.filter(r => !r.passed).length,
        });
      } else {
        setReport(categoryReport);
      }
    } catch (err) {
      console.error('Failed to run category tests:', err);
    } finally {
      setRunningCategory(false);
    }
  };

  const handleRunSingleTest = async (testId: string) => {
    setRunningTestId(testId);
    try {
      const singleReport = await api.runTests([testId]);
      if (singleReport.results && singleReport.results.length > 0) {
        const newResult = singleReport.results[0];
        if (report) {
          const updatedResults = report.results.map(r =>
            r.test_name === newResult.test_name ? newResult : r
          );
          if (!updatedResults.some(r => r.test_name === newResult.test_name)) {
            updatedResults.push(newResult);
          }
          setReport({
            ...report,
            results: updatedResults,
            passed: updatedResults.filter(r => r.passed).length,
            failed: updatedResults.filter(r => !r.passed).length,
          });
        } else {
          setReport(singleReport);
        }
      }
    } catch (err) {
      console.error(`Failed to run single test ${testId}:`, err);
    } finally {
      setRunningTestId(null);
    }
  };

  const handleRunFailedTests = async () => {
    setLoading(true);
    try {
      const runReport = await api.runFailedTests();
      if (report && runReport.results?.length > 0) {
        const mergedResults = [...report.results];
        for (const newRes of runReport.results) {
          const idx = mergedResults.findIndex(r => r.test_name === newRes.test_name);
          if (idx >= 0) mergedResults[idx] = newRes;
          else mergedResults.push(newRes);
        }
        setReport({
          ...report,
          results: mergedResults,
          passed: mergedResults.filter(r => r.passed).length,
          failed: mergedResults.filter(r => !r.passed).length,
        });
      } else {
        setReport(runReport);
      }
    } catch (err) {
      console.error('Failed to run failed tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    const dataStr = JSON.stringify(
      {
        benchmark_name: 'BANKISM Adversarial Red-Team Benchmark',
        run_timestamp: report?.timestamp || new Date().toISOString(),
        suite_total_cases: suite.length,
        report: report || 'NO_RUN_COMPLETED',
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bankism_benchmark_report_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  const categories = [
    'ALL',
    'Prompt Injection',
    'Jailbreak',
    'Policy Override',
    'Memo Injection',
    'Obfuscation',
    'Data Exfiltration',
    'Auth Bypass',
    'Ambiguous Transfer',
    'Malformed Transaction',
    'Benign Banking',
    'Benign Discussion',
  ];

  const displayItems = suite.map((test) => {
    const result = report?.results?.find((r) => r.test_name === test.name);
    return { test, result };
  });

  const filteredItems = displayItems.filter(({ test, result }) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      test.category.toLowerCase().includes(selectedCategory.toLowerCase());

    const matchesSearch =
      !searchTerm ||
      test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.input.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'PASSED'
        ? result?.passed === true
        : statusFilter === 'FAILED'
        ? result?.passed === false
        : result === undefined;

    return matchesCategory && matchesSearch && matchesStatus;
  });

  const failedCount = report ? report.total - report.passed : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="soc-panel rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-[#FF5268]">
        <div>
          <div className="flex items-center space-x-2">
            <Flame className="w-5 h-5 text-[#FF5268]" />
            <h2 className="text-base font-bold text-[#F2F6FC]">
              Adversarial Attack Matrix & Red-Team Benchmark
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102139] text-[#FF5268] border border-[#1A2D4A]">
              {suite.length} TEST VECTORS
            </span>
          </div>
          <p className="text-xs text-[#9AAAC0] mt-1 max-w-2xl">
            Empirical security evaluation against 42+ adversarial vectors across 12 threat classes.
            Each test executes through the live server-side firewall decision pipeline to measure real protection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleRunAllTests}
            disabled={loading || runningCategory}
            className="flex items-center space-x-2 px-4 py-2.5 rounded bg-[#FF5268] hover:bg-rose-500 text-slate-950 font-bold font-mono text-xs transition-colors shadow-sm disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>{loading ? 'RUNNING BENCHMARK...' : `RUN ALL ${suite.length || 42} TESTS`}</span>
          </button>

          {selectedCategory !== 'ALL' && (
            <button
              onClick={handleRunCategory}
              disabled={loading || runningCategory}
              className="flex items-center space-x-1.5 px-3 py-2.5 rounded bg-[#2583FF] hover:bg-blue-500 text-white font-mono text-xs transition-colors shadow-sm disabled:opacity-50"
              title={`Run only tests in ${selectedCategory}`}
            >
              <Play className="w-3 h-3 fill-white" />
              <span>{runningCategory ? 'RUNNING...' : `RUN ${selectedCategory.toUpperCase()}`}</span>
            </button>
          )}

          {report && failedCount > 0 && (
            <button
              onClick={handleRunFailedTests}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-2.5 rounded bg-[#F5B942] hover:bg-amber-300 text-slate-950 font-bold font-mono text-xs transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>RE-RUN FAILED ({failedCount})</span>
            </button>
          )}

          <button
            onClick={handleExportReport}
            className="flex items-center space-x-1.5 px-3 py-2.5 rounded bg-[#102139] hover:bg-[#162d4e] border border-[#1A2D4A] text-[#9AAAC0] hover:text-[#F2F6FC] font-mono text-xs transition-colors"
            title="Export JSON Benchmark Report"
          >
            {downloaded ? <Check className="w-3.5 h-3.5 text-[#24D6A0]" /> : <Download className="w-3.5 h-3.5" />}
            <span>{downloaded ? 'EXPORTED' : 'EXPORT JSON'}</span>
          </button>

          <button
            onClick={() => setShowMetricsInfo(!showMetricsInfo)}
            className="p-2.5 rounded bg-[#102139] hover:bg-[#162d4e] border border-[#1A2D4A] text-[#9AAAC0] hover:text-[#35D5F2] transition-colors"
            title="Benchmark Formulas & Definitions"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Explanation Banner (Toggleable) */}
      {showMetricsInfo && (
        <div className="soc-panel rounded-lg p-4 space-y-2 border-l-4 border-l-[#35D5F2] text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#F2F6FC] uppercase tracking-wider text-[11px] font-mono">
              Empirical Benchmark Metric Definitions (Section 4.C Standard)
            </span>
            <button onClick={() => setShowMetricsInfo(false)} className="text-[#9AAAC0] hover:text-[#F2F6FC]">
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px] text-[#9AAAC0] pt-1">
            <div className="soc-panel-sub p-2.5 rounded space-y-1">
              <span className="font-bold text-[#24D6A0] block">Attack Detection Rate</span>
              <p>TP / (TP + FN) × 100%. Proportion of actual malicious requests correctly blocked by the firewall.</p>
            </div>
            <div className="soc-panel-sub p-2.5 rounded space-y-1">
              <span className="font-bold text-[#F5B942] block">False Positive Rate</span>
              <p>FP / (FP + TN) × 100%. Proportion of legitimate benign banking requests incorrectly rejected.</p>
            </div>
            <div className="soc-panel-sub p-2.5 rounded space-y-1">
              <span className="font-bold text-[#FF5268] block">False Negative Rate</span>
              <p>FN / (TP + FN) × 100%. Missed malicious attacks (threats that bypassed detection controls).</p>
            </div>
            <div className="soc-panel-sub p-2.5 rounded space-y-1">
              <span className="font-bold text-[#35D5F2] block">Unsafe Core Executions</span>
              <p>Count of unauthorized or policy-violating financial actions permitted to mutate mock account balances.</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Report Cards if tests ran */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="soc-panel rounded-lg p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#9AAAC0] font-semibold">Attack Detection Rate</span>
            <p className="text-xl font-bold font-mono text-[#24D6A0]">
              {(report.attack_detection_rate * 100).toFixed(1)}%
            </p>
            <span className="text-[10px] text-[#9AAAC0]">Attacks blocked by firewall</span>
          </div>

          <div className="soc-panel rounded-lg p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#9AAAC0] font-semibold">False Positive Rate</span>
            <p className="text-xl font-bold font-mono text-[#24D6A0]">
              {(report.false_positive_rate * 100).toFixed(1)}%
            </p>
            <span className="text-[10px] text-[#9AAAC0]">Benign incorrectly blocked</span>
          </div>

          <div className="soc-panel rounded-lg p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#9AAAC0] font-semibold">False Negative Rate</span>
            <p className="text-xl font-bold font-mono text-[#24D6A0]">
              {(report.false_negative_rate * 100).toFixed(1)}%
            </p>
            <span className="text-[10px] text-[#9AAAC0]">Missed attack vectors</span>
          </div>

          <div className="soc-panel rounded-lg p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#9AAAC0] font-semibold">Unsafe Core Executions</span>
            <p
              className={`text-xl font-bold font-mono ${
                report.unsafe_execution_count === 0 ? 'text-[#24D6A0]' : 'text-[#FF5268]'
              }`}
            >
              {report.unsafe_execution_count}
            </p>
            <span className="text-[10px] text-[#9AAAC0]">Core breaches (Target: 0)</span>
          </div>

          <div className="soc-panel rounded-lg p-3.5 space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#9AAAC0] font-semibold">Benchmark Pass Rate</span>
            <p className="text-xl font-bold font-mono text-[#35D5F2]">
              {report.passed} / {report.total}
            </p>
            <span className="text-[10px] text-[#9AAAC0]">
              {((report.passed / report.total) * 100).toFixed(1)}% Test Suite Passed
            </span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="soc-panel rounded-lg p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                selectedCategory === cat
                  ? 'bg-[#102139] text-[#35D5F2] border border-[#1A2D4A] font-bold'
                  : 'text-[#9AAAC0] hover:text-[#F2F6FC] hover:bg-[#102139]/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status Filter & Search Input */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1 rounded bg-[#07111F] border border-[#1A2D4A] text-xs font-mono text-[#9AAAC0] outline-none"
          >
            <option value="ALL">All Outcomes</option>
            <option value="PASSED">Passed Only</option>
            <option value="FAILED">Failed Only</option>
            <option value="PENDING">Not Run Yet</option>
          </select>

          <div className="relative w-full md:w-56">
            <Search className="w-3.5 h-3.5 text-[#9AAAC0] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vector, ID, payload..."
              className="w-full pl-8 pr-3 py-1 rounded bg-[#07111F] border border-[#1A2D4A] text-xs font-mono text-[#F2F6FC] placeholder:text-[#9AAAC0]/50 outline-none focus:border-[#35D5F2]"
            />
          </div>
        </div>
      </div>

      {/* Test Cases Table */}
      <div className="soc-panel rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-[#1A2D4A] bg-[#07111F] text-[10px] uppercase text-[#9AAAC0]">
                <th className="py-2.5 px-3">Test Scenario & Category</th>
                <th className="py-2.5 px-3">Expected Decision</th>
                <th className="py-2.5 px-3">Actual Decision</th>
                <th className="py-2.5 px-3">Execution Gate Status</th>
                <th className="py-2.5 px-3">Test Result</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2D4A]/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#9AAAC0]">
                    No test scenarios found for selected filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map(({ test, result }) => {
                  const isExpanded = expandedTestId === test.name;
                  const passed = result ? result.passed : null;
                  const isRunningThis = runningTestId === test.id;

                  // Precise, correct execution gate status resolution:
                  const isUnsafeExecution =
                    result &&
                    test.expected_execution_allowed === false &&
                    result.actual_execution_allowed === true;

                  const isAuthorizedExecution =
                    result &&
                    test.expected_execution_allowed === true &&
                    result.actual_execution_allowed === true;

                  const isShieldedDisallowed =
                    result &&
                    test.expected_execution_allowed === false &&
                    result.actual_execution_allowed === false;

                  const isDeniedBenign =
                    result &&
                    test.expected_execution_allowed === true &&
                    result.actual_execution_allowed === false;

                  return (
                    <React.Fragment key={test.name}>
                      <tr
                        className={`hover:bg-[#102139]/40 transition-colors ${
                          isExpanded ? 'bg-[#102139]/30' : ''
                        }`}
                      >
                        <td
                          className="py-2.5 px-3 cursor-pointer"
                          onClick={() => setExpandedTestId(isExpanded ? null : test.name)}
                        >
                          <div className="flex items-center space-x-2">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-[#35D5F2] shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-[#9AAAC0] shrink-0" />
                            )}
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[10px] text-[#9AAAC0] font-mono">[{test.id}]</span>
                                <span className="font-bold text-[#F2F6FC]">{test.name}</span>
                              </div>
                              <span className="text-[10px] text-[#9AAAC0] block">{test.category}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              test.expected_decision === 'APPROVE'
                                ? 'bg-emerald-950/40 text-[#24D6A0] border-emerald-800'
                                : test.expected_decision === 'BLOCK'
                                ? 'bg-rose-950/40 text-[#FF5268] border-rose-800'
                                : 'bg-amber-950/40 text-[#F5B942] border-amber-800'
                            }`}
                          >
                            {test.expected_decision}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {result ? (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                result.actual_decision === 'APPROVE'
                                  ? 'bg-emerald-950/40 text-[#24D6A0] border-emerald-800'
                                  : result.actual_decision === 'BLOCK'
                                  ? 'bg-rose-950/40 text-[#FF5268] border-rose-800'
                                  : 'bg-amber-950/40 text-[#F5B942] border-amber-800'
                              }`}
                            >
                              {result.actual_decision}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#9AAAC0]">NOT RUN</span>
                          )}
                        </td>

                        {/* ACCURATE EXECUTION GATE STATUS CELL */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {result ? (
                            isUnsafeExecution ? (
                              <span className="text-[10px] font-bold text-[#FF5268] px-1.5 py-0.5 rounded bg-rose-950/50 border border-rose-800">
                                BREACH: UNAUTHORIZED
                              </span>
                            ) : isAuthorizedExecution ? (
                              <span className="text-[10px] font-bold text-[#24D6A0] px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-800">
                                AUTHORIZED (Expected)
                              </span>
                            ) : isShieldedDisallowed ? (
                              <span className="text-[10px] font-bold text-[#35D5F2] px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-800">
                                SHIELDED (Disallowed)
                              </span>
                            ) : isDeniedBenign ? (
                              <span className="text-[10px] font-bold text-[#F5B942] px-1.5 py-0.5 rounded bg-amber-950/50 border border-amber-800">
                                HELD / BLOCKED
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#9AAAC0]">
                                {result.actual_execution_allowed ? 'Allowed' : 'Disallowed'}
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] text-[#9AAAC0]">
                              {test.expected_execution_allowed ? 'Expected: Allow' : 'Expected: Disallow'}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {passed === true && (
                            <span className="inline-flex items-center space-x-1 text-[10px] text-[#24D6A0] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#24D6A0]" />
                              <span>PASSED</span>
                            </span>
                          )}
                          {passed === false && (
                            <span className="inline-flex items-center space-x-1 text-[10px] text-[#FF5268] font-bold">
                              <XCircle className="w-3.5 h-3.5 text-[#FF5268]" />
                              <span>FAILED</span>
                            </span>
                          )}
                          {passed === null && <span className="text-[10px] text-[#9AAAC0]">READY</span>}
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleRunSingleTest(test.id)}
                            disabled={loading || isRunningThis}
                            className="px-2 py-1 rounded bg-[#102139] hover:bg-[#162d4e] border border-[#1A2D4A] text-[#35D5F2] hover:text-cyan-300 font-mono text-[11px] transition-colors disabled:opacity-50"
                            title="Run single test case"
                          >
                            {isRunningThis ? 'RUNNING...' : 'RUN'}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Forensic Detail Row */}
                      {isExpanded && (
                        <tr className="bg-[#07111F]">
                          <td colSpan={6} className="p-4 border-b border-[#1A2D4A]">
                            <div className="soc-panel-sub p-4 rounded-lg space-y-4 text-xs">
                              {/* 1. Prompt & Memo Payload */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] uppercase text-[#9AAAC0] font-bold font-mono tracking-wider">
                                    1. Raw Untrusted Request Payload
                                  </span>
                                  <span className="text-[10px] font-mono text-[#9AAAC0]">
                                    Payload Length: {test.input.length} chars
                                  </span>
                                </div>
                                <pre className="p-3 rounded bg-[#07111F] border border-[#1A2D4A] text-[11px] font-mono text-[#F2F6FC] whitespace-pre-wrap break-all shadow-inner">
                                  {test.input}
                                </pre>
                                {test.memo && (
                                  <div>
                                    <span className="text-[10px] uppercase text-[#F5B942] font-bold font-mono tracking-wider block mb-1">
                                      Secondary Channel (Payment Memo):
                                    </span>
                                    <pre className="p-2.5 rounded bg-[#07111F] border border-[#1A2D4A] text-[11px] font-mono text-[#F5B942]">
                                      {test.memo}
                                    </pre>
                                  </div>
                                )}
                                <div className="text-[11px] text-[#9AAAC0]">
                                  <span className="font-semibold text-[#F2F6FC]">Benchmark Test Objective: </span>
                                  {test.description}
                                </div>
                              </div>

                              {result && (
                                <div className="space-y-4 pt-3 border-t border-[#1A2D4A]">
                                  {/* 2. Four-Phase Security Pipeline Separation */}
                                  <div>
                                    <span className="text-[10px] uppercase text-[#35D5F2] font-bold font-mono tracking-wider block mb-2">
                                      2. Four-Phase Security Pipeline Verdict Separation
                                    </span>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-[11px] font-mono">
                                      {/* Phase 1: Request Classification */}
                                      <div className="p-3 rounded bg-[#07111F] border border-[#1A2D4A] space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-[#9AAAC0] uppercase">
                                          <span>Phase 1: Classification</span>
                                          <span className="text-[#35D5F2]">AST / NLP</span>
                                        </div>
                                        <div className="text-[#F2F6FC] font-bold mt-1">
                                          Intent: {result.intent || 'UNKNOWN'}
                                        </div>
                                        <div className="text-[10px] text-[#9AAAC0]">
                                          Threat: <span className={result.actual_threat === 'NONE' ? 'text-[#24D6A0]' : 'text-[#FF5268] font-bold'}>{result.actual_threat}</span>
                                        </div>
                                      </div>

                                      {/* Phase 2: Policy Decision */}
                                      <div className="p-3 rounded bg-[#07111F] border border-[#1A2D4A] space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-[#9AAAC0] uppercase">
                                          <span>Phase 2: Policy Engine</span>
                                          <span className="text-[#2583FF]">{result.policy_version || 'v1.0.0'}</span>
                                        </div>
                                        <div className="text-[#F2F6FC] font-bold mt-1 flex items-center space-x-1.5">
                                          <span>Decision:</span>
                                          <span className={
                                            result.actual_decision === 'APPROVE' ? 'text-[#24D6A0]' :
                                            result.actual_decision === 'BLOCK' ? 'text-[#FF5268]' : 'text-[#F5B942]'
                                          }>{result.actual_decision}</span>
                                        </div>
                                        <div className="text-[10px] text-[#9AAAC0] truncate" title={result.reason_codes?.join(', ')}>
                                          Codes: {result.reason_codes?.slice(0, 2).join(', ') || 'NONE'}
                                        </div>
                                      </div>

                                      {/* Phase 3: Authorization Gate */}
                                      <div className="p-3 rounded bg-[#07111F] border border-[#1A2D4A] space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-[#9AAAC0] uppercase">
                                          <span>Phase 3: Auth Gate</span>
                                          <span className="text-[#24D6A0]">Identity</span>
                                        </div>
                                        <div className="text-[#F2F6FC] font-bold mt-1">
                                          {result.actual_execution_allowed ? (
                                            <span className="text-[#24D6A0]">AUTHORIZED</span>
                                          ) : (
                                            <span className="text-[#FF5268]">DENIED / GATED</span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-[#9AAAC0]">
                                          Target Acc: {result.data_payload?.account || 'acc-001'}
                                        </div>
                                      </div>

                                      {/* Phase 4: Execution Outcome */}
                                      <div className="p-3 rounded bg-[#07111F] border border-[#1A2D4A] space-y-1">
                                        <div className="flex items-center justify-between text-[10px] text-[#9AAAC0] uppercase">
                                          <span>Phase 4: Execution</span>
                                          <span className="text-[#35D5F2]">Core State</span>
                                        </div>
                                        <div className="text-[#F2F6FC] font-bold mt-1">
                                          Status: <span className={result.execution_status === 'EXECUTED' ? 'text-[#24D6A0]' : 'text-[#9AAAC0]'}>
                                            {result.execution_status || 'NOT_EXECUTED'}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-[#9AAAC0]">
                                          Mutations: {result.execution_trace?.observed_state_change?.ledger_entries_added ?? 0} tx
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 3. Structured Security Checks Evaluated */}
                                  <div>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-[10px] uppercase text-[#9AAAC0] font-bold font-mono tracking-wider">
                                        3. Structured Security Checks Evaluated ({Object.keys(result.checks || {}).length} Policy Controls)
                                      </span>
                                      <span className="text-[10px] font-mono text-[#24D6A0]">
                                        Server-Side Deterministic Verification
                                      </span>
                                    </div>
                                    <div className="rounded border border-[#1A2D4A] overflow-hidden bg-[#07111F]">
                                      <table className="w-full text-left text-[11px] font-mono">
                                        <thead className="bg-[#102139] text-[#9AAAC0] text-[10px] uppercase border-b border-[#1A2D4A]">
                                          <tr>
                                            <th className="py-1.5 px-3">Control Name</th>
                                            <th className="py-1.5 px-3">Result</th>
                                            <th className="py-1.5 px-3">Enforcement Detail Message</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#1A2D4A]">
                                          {Object.entries(result.checks || {}).map(([key, check]) => (
                                            <tr key={key} className="hover:bg-[#102139]/30">
                                              <td className="py-2 px-3 text-[#F2F6FC] font-semibold whitespace-nowrap">
                                                {key.replace(/_/g, ' ')}
                                              </td>
                                              <td className="py-2 px-3 whitespace-nowrap">
                                                {check.passed ? (
                                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/50 text-[#24D6A0] border border-emerald-800">
                                                    PASSED
                                                  </span>
                                                ) : (
                                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/50 text-[#FF5268] border border-rose-800">
                                                    FAILED
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2 px-3 text-[#9AAAC0]">
                                                {check.detail}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  {/* 4. Rationale & Core Telemetry */}
                                  <div className="space-y-2">
                                    <span className="text-[10px] uppercase text-[#9AAAC0] font-bold font-mono tracking-wider block">
                                      4. Formal Decision Rationale & Telemetry
                                    </span>
                                    <p className="text-[#F2F6FC] font-sans text-xs bg-[#07111F] p-3 rounded border border-[#1A2D4A]">
                                      {result.rationale}
                                    </p>

                                    {/* Data Access Outcome if available */}
                                    {result.data_payload && (
                                      <div className="p-2.5 rounded bg-[#102139]/60 border border-[#1A2D4A] flex flex-wrap items-center gap-4 text-[11px] font-mono text-[#F2F6FC]">
                                        <span className="text-[#35D5F2] font-bold">Data Access Payload:</span>
                                        {result.data_payload.amount !== null && result.data_payload.amount !== undefined && (
                                          <span>
                                            Balance/Amount: <strong className="text-[#24D6A0]">${Number(result.data_payload.amount).toFixed(2)} {result.data_payload.currency || 'USD'}</strong>
                                          </span>
                                        )}
                                        {result.data_payload.recipient && (
                                          <span>
                                            Recipient: <strong>{result.data_payload.recipient}</strong>
                                          </span>
                                        )}
                                        {result.data_payload.account && (
                                          <span>
                                            Target Account: <strong>{result.data_payload.account}</strong>
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* Execution Trace Timings & Observed State Changes */}
                                    <div className="p-3 rounded bg-[#07111F] border border-[#1A2D4A] space-y-2">
                                      <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-[#9AAAC0]">
                                        <span className="font-bold text-[#F2F6FC]">Execution Trace & Stage Latencies:</span>
                                        <span>Total Duration: <strong className="text-[#24D6A0]">{result.duration_ms || result.execution_trace?.total_duration_ms || 1}ms</strong></span>
                                      </div>
                                      {result.execution_trace && (
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] font-mono text-[#9AAAC0]">
                                          <div className="p-1.5 rounded bg-[#102139] border border-[#1A2D4A]">
                                            <span>Normalize: </span>
                                            <strong className="text-[#F2F6FC]">{result.execution_trace.normalize_ms}ms</strong>
                                          </div>
                                          <div className="p-1.5 rounded bg-[#102139] border border-[#1A2D4A]">
                                            <span>Screen: </span>
                                            <strong className="text-[#F2F6FC]">{result.execution_trace.screen_ms}ms</strong>
                                          </div>
                                          <div className="p-1.5 rounded bg-[#102139] border border-[#1A2D4A]">
                                            <span>Parse: </span>
                                            <strong className="text-[#F2F6FC]">{result.execution_trace.parse_ms}ms</strong>
                                          </div>
                                          <div className="p-1.5 rounded bg-[#102139] border border-[#1A2D4A]">
                                            <span>Validate: </span>
                                            <strong className="text-[#F2F6FC]">{result.execution_trace.validate_ms}ms</strong>
                                          </div>
                                          <div className="p-1.5 rounded bg-[#102139] border border-[#1A2D4A]">
                                            <span>Decide: </span>
                                            <strong className="text-[#F2F6FC]">{result.execution_trace.decide_ms}ms</strong>
                                          </div>
                                        </div>
                                      )}
                                      {result.execution_trace?.observed_state_change && (
                                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono pt-1 text-[#9AAAC0] border-t border-[#1A2D4A]">
                                          <span>Observed Mock Core Delta:</span>
                                          <span className="text-[#24D6A0] font-bold">
                                            {result.execution_trace.observed_state_change.ledger_entries_added} Ledger Mutations
                                          </span>
                                          <span>•</span>
                                          <span className="text-[#24D6A0] font-bold">
                                            ${result.execution_trace.observed_state_change.balance_delta_usd.toFixed(2)} USD Delta
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Provenance: Run ID, Request ID, Audit Hash, Timestamp */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono pt-1 text-[#9AAAC0]">
                                      <div>
                                        <span className="block text-[#64748B]">Request / Event ID:</span>
                                        <span className="text-[#35D5F2] truncate block">{result.request_id || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[#64748B]">Audit Hash (SHA-256):</span>
                                        <span className="text-[#24D6A0] truncate block" title={result.audit_hash}>{result.audit_hash || 'N/A'}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[#64748B]">Test Run ID:</span>
                                        <span className="text-[#9AAAC0] truncate block">{result.run_id}</span>
                                      </div>
                                      <div>
                                        <span className="block text-[#64748B]">Run Timestamp:</span>
                                        <span className="text-[#9AAAC0] truncate block">{result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : 'N/A'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
