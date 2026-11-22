import React, { useState } from 'react';
import {
  Search,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  Zap,
  Globe,
  Loader2,
} from 'lucide-react';
import { Monitor } from '../types/monitor';

interface MonitorsTableProps {
  monitors: Monitor[];
  onSelectMonitor: (monitor: Monitor) => void;
  onTogglePause: (id: string, e: React.MouseEvent) => void;
  onDeleteMonitor: (id: string, e: React.MouseEvent) => void;
  onPingMonitor: (id: string, e: React.MouseEvent) => void;
  pingingId: string | null;
}

export const MonitorsTable: React.FC<MonitorsTableProps> = ({
  monitors,
  onSelectMonitor,
  onTogglePause,
  onDeleteMonitor,
  onPingMonitor,
  pingingId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UP' | 'DOWN'>('ALL');

  // Filter monitors based on search text and status filter
  const filteredMonitors = monitors.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.url.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'UP') return m.status === 'UP';
    if (statusFilter === 'DOWN') return m.status === 'DOWN';
    return true;
  });

  return (
    <div className="rounded-2xl bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 shadow-xs dark:shadow-xl overflow-hidden flex flex-col transition-colors duration-250">
      {/* Table Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Active Monitored Endpoints</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold">
              {filteredMonitors.length} of {monitors.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time multi-region health checks, SSL validity, and uptime history
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by name or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 dark:focus:border-cyan-500/50 focus:ring-1 focus:ring-sky-500 dark:focus:ring-cyan-500/50 transition-all"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-cyan-500/20 text-sky-700 dark:text-cyan-300 border border-slate-200/80 dark:border-cyan-500/30 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('UP')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'UP'
                  ? 'bg-white dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-500/30 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              UP
            </button>
            <button
              onClick={() => setStatusFilter('DOWN')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'DOWN'
                  ? 'bg-white dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-500/30 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              DOWN
            </button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium">
              <th className="py-3 px-4">Target Service</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Latency</th>
              <th className="py-3 px-4">24h Uptime Strip</th>
              <th className="py-3 px-4 text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredMonitors.length > 0 ? (
              filteredMonitors.map((m) => {
                const isDown = m.status === 'DOWN';
                const isPaused = m.status === 'PAUSED';
                const isPinging = pingingId === m.id;

                const getMethodBadgeClass = (method: string) => {
                  switch (method) {
                    case 'GET':
                      return 'bg-sky-50 dark:bg-blue-500/10 text-sky-700 dark:text-blue-400 border-sky-200 dark:border-blue-500/30';
                    case 'POST':
                      return 'bg-indigo-50 dark:bg-purple-500/10 text-indigo-700 dark:text-purple-400 border-indigo-200 dark:border-purple-500/30';
                    case 'HEAD':
                      return 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30';
                    default:
                      return 'bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600/30';
                  }
                };

                return (
                  <tr
                    key={m.id}
                    onClick={() => onSelectMonitor(m)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    {/* Target Service & Monospace URL */}
                    <td className="py-3.5 px-4 max-w-[280px]">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border shrink-0 mt-0.5 ${getMethodBadgeClass(
                            m.method
                          )}`}
                        >
                          {m.method}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 group-hover:text-sky-600 dark:group-hover:text-cyan-300 transition-colors">
                            <span className="truncate">{m.name}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-cyan-400 transition-colors shrink-0 opacity-0 group-hover:opacity-100" />
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            <span className="truncate">{m.url}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td className="py-3.5 px-4">
                      {isPaused ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          <Pause className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                          PAUSED
                        </span>
                      ) : isDown ? (
                        <div className="inline-flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 shadow-xs dark:shadow-rose-950/40 animate-pulse">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                            </span>
                            DOWN
                          </span>
                          <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-medium pl-1">
                            HTTP 504 Timeout
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 shadow-xs dark:shadow-emerald-950/30">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          UP
                        </span>
                      )}
                    </td>

                    {/* Latency */}
                    <td className="py-3.5 px-4">
                      {isDown ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">---</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
                            No response
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-mono">
                          <span
                            className={`font-bold text-sm ${
                              (m.latency ?? 0) > 150
                                ? 'text-amber-600 dark:text-amber-400'
                                : (m.latency ?? 0) < 50
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-sky-600 dark:text-cyan-400'
                            }`}
                          >
                            {m.latency}ms
                          </span>
                        </div>
                      )}
                    </td>

                    {/* 24h Uptime Micro-Bars Strip */}
                    <td className="py-3.5 px-4 min-w-[210px]">
                      <div className="flex items-center gap-2">
                        {/* 24 micro bars */}
                        <div className="flex items-center gap-[2.5px] p-1 rounded-lg bg-slate-100 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                          {m.uptimeHistory24h.map((tick, idx) => {
                            const isTickDown = tick.status === 'DOWN';
                            return (
                              <div
                                key={idx}
                                title={`${tick.hour}: ${tick.status} ${
                                  tick.latency ? `(${tick.latency}ms)` : '(Timeout)'
                                }`}
                                className={`w-1.5 h-4 rounded-[1.5px] transition-all hover:scale-125 ${
                                  isTickDown
                                    ? 'bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.6)]'
                                    : 'bg-emerald-400 dark:bg-emerald-500/80 hover:bg-emerald-500'
                                }`}
                              />
                            );
                          })}
                        </div>
                        {/* Percentage */}
                        <span
                          className={`font-mono text-xs font-semibold ${
                            m.uptimePercentage >= 99.5
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : m.uptimePercentage >= 95
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {m.uptimePercentage.toFixed(2)}%
                        </span>
                      </div>
                    </td>

                    {/* Quick Row Actions */}
                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Ping Test Button */}
                        <button
                          onClick={(e) => onPingMonitor(m.id, e)}
                          disabled={isPinging}
                          title="Run instant live ping test"
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-sky-50 dark:hover:bg-cyan-500/20 text-slate-600 dark:text-slate-300 hover:text-sky-700 dark:hover:text-cyan-300 border border-slate-200 dark:border-slate-700/60 hover:border-sky-300 dark:hover:border-cyan-500/40 transition-all"
                        >
                          {isPinging ? (
                            <Loader2 className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400 animate-spin" />
                          ) : (
                            <Zap className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />
                          )}
                        </button>

                        {/* Pause / Resume Button */}
                        <button
                          onClick={(e) => onTogglePause(m.id, e)}
                          title={isPaused ? 'Resume monitoring' : 'Pause monitoring'}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 transition-all"
                        >
                          {isPaused ? (
                            <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Pause className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => onDeleteMonitor(m.id, e)}
                          title="Delete monitor"
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700/60 hover:border-rose-300 dark:hover:border-rose-500/40 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500 dark:text-slate-400">
                  <div className="flex flex-col items-center justify-center">
                    <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No monitors match your criteria</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Try adjusting the search query or status filter
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer info */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Probes active every 30s across US-East, EU-Central, AP-South
        </span>
        <span className="hidden sm:inline">Click any row to view full telemetry & SSL health</span>
      </div>
    </div>
  );
};
