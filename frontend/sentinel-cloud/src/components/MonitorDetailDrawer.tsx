import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Globe,
  Clock,
  CheckCircle2,
  Lock,
  Activity,
  Radio,
  Server,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { Monitor, MonitorHistory } from '../types/monitor';
import { fetchMonitorHistory } from '../services/api';

interface MonitorDetailDrawerProps {
  monitor: Monitor | null;
  isOpen: boolean;
  onClose: () => void;
  onPingNow: (id: string) => Promise<void> | void;
  isPinging: boolean;
}

export const MonitorDetailDrawer: React.FC<MonitorDetailDrawerProps> = ({
  monitor,
  isOpen,
  onClose,
  onPingNow,
  isPinging,
}) => {
  const [copied, setCopied] = useState(false);
  const [historyData, setHistoryData] = useState<MonitorHistory | null>(null);

  useEffect(() => {
    if (isOpen && monitor?.id) {
      fetchMonitorHistory(monitor.id, '24h')
        .then((res) => setHistoryData(res))
        .catch(() => setHistoryData(null));
    } else {
      setHistoryData(null);
    }
  }, [isOpen, monitor?.id, monitor?.lastChecked]);

  if (!isOpen || !monitor) return null;

  const isDown = monitor.status === 'DOWN';
  const displayUptime = historyData?.uptimePercentage ?? monitor.uptimePercentage;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(monitor.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col overflow-hidden animate-slide-in-right transition-colors duration-250">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-50 dark:bg-cyan-500/10 text-sky-700 dark:text-cyan-400 border border-sky-200 dark:border-cyan-500/30">
                {monitor.method}
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">{monitor.name}</h2>
              {isDown ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  DOWN
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                  OPERATIONAL
                </span>
              )}
            </div>

            {/* Target URL with Copy Button */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950/60 p-1.5 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="truncate flex-1 text-slate-800 dark:text-slate-300">{monitor.url}</span>
              <button
                onClick={handleCopyUrl}
                title="Copy endpoint URL"
                className="text-slate-400 hover:text-sky-600 dark:hover:text-cyan-300 transition-colors p-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Action Header: Live Ping Now */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-sky-50/30 to-indigo-50/20 dark:from-slate-800/80 dark:to-slate-900 border border-slate-200 dark:border-slate-700/60 shadow-xs dark:shadow-lg">
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />
                <span>On-Demand Verification</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Last probe executed: <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">{monitor.lastChecked}</span>
              </p>
            </div>

            <button
              onClick={() => onPingNow(monitor.id)}
              disabled={isPinging}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-semibold dark:font-bold text-xs shadow-md shadow-sky-100 dark:shadow-cyan-950/50 transition-all disabled:opacity-50 active:scale-95"
            >
              {isPinging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Probing Multi-Region Nodes...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Ping Now</span>
                </>
              )}
            </button>
          </div>

          {/* 4 Stat Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* HTTP Status Code */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">HTTP Status Code</span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-base font-bold font-mono ${
                    isDown ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  {monitor.httpStatusCode ?? '504'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {monitor.httpStatusCode === 200
                    ? 'OK'
                    : monitor.httpStatusCode === 504
                    ? 'Gateway Timeout'
                    : 'Degraded'}
                </span>
              </div>
            </div>

            {/* Current Latency */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Current Latency</span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-base font-bold font-mono ${
                    isDown ? 'text-rose-700 dark:text-rose-400' : 'text-sky-700 dark:text-cyan-400'
                  }`}
                >
                  {isDown ? '---' : `${monitor.latency} ms`}
                </span>
              </div>
            </div>

            {/* 30-Day Uptime */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">30-Day Uptime</span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-base font-bold font-mono ${
                    displayUptime >= 99.5
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : displayUptime >= 95
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-rose-700 dark:text-rose-400'
                  }`}
                >
                  {displayUptime.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Check Frequency */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Frequency</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">
                  {monitor.interval}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">cadence</span>
              </div>
            </div>
          </div>

          {/* SSL Certificate Status Card */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">SSL/TLS Certificate</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Handshake encryption & cryptographic validity</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Valid - Expires in {monitor.sslStatus.expiresDays} days
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Certificate Authority</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                  {monitor.sslStatus.issuer}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Cipher / Protocol</span>
                <span className="font-semibold text-sky-700 dark:text-cyan-300 font-mono block mt-0.5">
                  {monitor.sslStatus.protocol}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Certificate Expiry</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                  In {monitor.sslStatus.expiresDays} Days
                </span>
              </div>
            </div>
          </div>

          {/* Multi-Region Latency Breakdown */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Regional Probe Latencies</h4>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">4 global edge nodes</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {monitor.regionLatencies.map((reg) => (
                <div
                  key={reg.region}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">{reg.flag}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        reg.status === 'UP'
                          ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-transparent'
                          : 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-transparent'
                      }`}
                    >
                      {reg.status}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{reg.regionName}</div>
                    <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{reg.region}</div>
                  </div>
                  <div className="text-sm font-bold font-mono text-sky-700 dark:text-cyan-400">
                    {reg.latency ? `${reg.latency}ms` : 'Timeout'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Incidents Log Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Incidents & Outage Log</h4>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {monitor.incidents.length} event(s) recorded
              </span>
            </div>

            {monitor.incidents.length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Status Code</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Root Cause</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {monitor.incidents.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap">
                          {inc.timestamp}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              inc.type === 'OUTAGE'
                                ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                                : 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                            }`}
                          >
                            {inc.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                          {inc.statusCode ?? '---'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">{inc.duration}</td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-xs">{inc.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 dark:text-emerald-400 mx-auto mb-1.5 opacity-80" />
                <p className="text-xs font-medium text-slate-800 dark:text-slate-300">Clean Incident Record</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">
                  No outages or degraded performance events recorded in the last 30 days.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Server className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
            <span>ID: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{monitor.id}</span></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors font-medium"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
};
