import React, { useState } from 'react';
import { AuditEvent } from '../types';
import { X, ShieldCheck, ShieldAlert, Copy, Check, Clock, Key, CheckCircle2, XCircle } from 'lucide-react';

interface EventModalProps {
  event: AuditEvent | null;
  onClose: () => void;
}

export const EventModal: React.FC<EventModalProps> = ({ event, onClose }) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!event) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isBlock = event.decision === 'BLOCK';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#080d22] border border-cyan-800/40 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            {isBlock ? (
              <div className="p-2 rounded-xl bg-rose-950/50 border border-rose-800/60">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-emerald-950/50 border border-emerald-800/60">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono">
                Audit Event Record
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">ID: {event.id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs font-mono">
          {/* Key Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[9px] uppercase text-slate-500">Decision</span>
              <p
                className={`font-bold mt-0.5 ${
                  isBlock ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {event.decision}
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[9px] uppercase text-slate-500">Threat</span>
              <p className="font-semibold text-slate-200 mt-0.5 truncate">
                {event.threat_category}
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[9px] uppercase text-slate-500">Risk Level</span>
              <p className="font-semibold text-amber-400 mt-0.5">{event.risk_level}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[9px] uppercase text-slate-500">Latency</span>
              <p className="font-semibold text-cyan-400 mt-0.5">
                {event.processing_time_ms}ms
              </p>
            </div>
          </div>

          {/* Sanitized Summary */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase text-slate-500 font-semibold">
              Sanitized Audit Description
            </span>
            <p className="text-slate-200 text-xs font-sans leading-relaxed">
              {event.sanitized_summary}
            </p>
          </div>

          {/* Reason Codes */}
          {event.reason_codes?.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase text-slate-500 font-semibold">
                Reason Codes
              </span>
              <div className="flex flex-wrap gap-1.5">
                {event.reason_codes.map((code) => (
                  <span
                    key={code}
                    className="px-2 py-0.5 rounded bg-slate-900 text-[10px] text-slate-300 border border-slate-700"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Raw JSON */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-slate-500 font-semibold">
                Raw Event Payload
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1 text-[10px] text-cyan-400 hover:text-cyan-300"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-black/80 border border-slate-800 text-[11px] text-cyan-300 overflow-x-auto max-h-52">
              {JSON.stringify(event, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
