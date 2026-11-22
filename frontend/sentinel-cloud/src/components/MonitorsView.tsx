import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Trash2,
  Zap,
  Globe,
  Loader2,
} from 'lucide-react';
import { Monitor } from '../types/monitor';

interface MonitorsViewProps {
  monitors: Monitor[];
  onOpenCreateModal: () => void;
  onSelectMonitor: (monitor: Monitor) => void;
  onTogglePause: (id: string, e: React.MouseEvent) => void;
  onDeleteMonitor: (id: string, e: React.MouseEvent) => void;
  onPingMonitor: (id: string, e: React.MouseEvent) => void;
  pingingId: string | null;
}

export const MonitorsView: React.FC<MonitorsViewProps> = ({
  monitors,
  onOpenCreateModal,
  onSelectMonitor,
  onTogglePause,
  onDeleteMonitor,
  onPingMonitor,
  pingingId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UP' | 'DOWN' | 'PAUSED'>('ALL');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');

  const filteredMonitors = monitors.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.url.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
    if (selectedMethod !== 'ALL' && m.method !== selectedMethod) return false;

    return true;
  });

  return (
    <div className="space-y-6 transition-colors duration-250">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Monitored Endpoints</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage all HTTP endpoints, webhooks, microservices, and regional probes
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 dark:from-cyan-500 dark:to-emerald-500 dark:hover:from-cyan-400 dark:hover:to-emerald-400 text-white dark:text-slate-950 font-semibold dark:font-bold text-xs shadow-md shadow-sky-100 dark:shadow-cyan-950/40 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create New Monitor</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#111827]/90 border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search monitors by name, URL or service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 dark:focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {(['ALL', 'UP', 'DOWN', 'PAUSED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-white dark:bg-cyan-500/20 text-sky-700 dark:text-cyan-300 border border-slate-200 dark:border-cyan-500/30 shadow-xs dark:shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* HTTP Method Filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="bg-transparent text-xs text-slate-700 dark:text-slate-200 focus:outline-none font-medium"
            >
              <option value="ALL">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="HEAD">HEAD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Monitor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMonitors.map((m) => {
          const isDown = m.status === 'DOWN';
          const isPaused = m.status === 'PAUSED';
          const isPinging = pingingId === m.id;

          return (
            <div
              key={m.id}
              onClick={() => onSelectMonitor(m)}
              className="rounded-2xl bg-white/90 dark:bg-[#111827]/90 border border-slate-200/90 dark:border-slate-800 hover:border-sky-300 dark:hover:border-slate-700/80 p-5 shadow-xs dark:shadow-xl hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 group flex flex-col justify-between"
            >
              <div>
                {/* Card Top */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-50 dark:bg-cyan-500/10 text-sky-700 dark:text-cyan-400 border border-sky-200 dark:border-cyan-500/30">
                      {m.method}
                    </span>
                    <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-cyan-300 transition-colors text-sm truncate">
                      {m.name}
                    </h3>
                  </div>

                  {isPaused ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      PAUSED
                    </span>
                  ) : isDown ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 animate-pulse">
                      DOWN
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40">
                      UP
                    </span>
                  )}
                </div>

                {/* URL */}
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-mono text-xs truncate mb-4">
                  <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="truncate">{m.url}</span>
                </div>

                {/* Latency & Uptime Stat */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 mb-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Response Latency</span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        isDown ? 'text-rose-700 dark:text-rose-400' : 'text-sky-700 dark:text-cyan-400'
                      }`}
                    >
                      {isDown ? '---' : `${m.latency}ms`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">30d Uptime</span>
                    <span
                      className={`font-mono font-bold text-sm ${
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
                </div>

                {/* 24h Micro Bars */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                    <span>24h Uptime History</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{m.interval} checks</span>
                  </div>
                  <div className="flex items-center gap-[2px] p-1 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                    {m.uptimeHistory24h.map((tick, idx) => (
                      <div
                        key={idx}
                        className={`w-full h-3 rounded-[1px] ${
                          tick.status === 'DOWN' ? 'bg-rose-500' : 'bg-emerald-400 dark:bg-emerald-500/80'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div
                className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                  SSL: {m.sslStatus.expiresDays}d left
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => onPingMonitor(m.id, e)}
                    disabled={isPinging}
                    title="Live ping check"
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-cyan-500/20 text-slate-600 dark:text-slate-300 hover:text-sky-700 dark:hover:text-cyan-300 border border-slate-200 dark:border-slate-700/60 transition-colors"
                  >
                    {isPinging ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600 dark:text-cyan-400" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />
                    )}
                  </button>
                  <button
                    onClick={(e) => onTogglePause(m.id, e)}
                    title={isPaused ? 'Resume' : 'Pause'}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700/60 transition-colors"
                  >
                    {isPaused ? (
                      <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Pause className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    )}
                  </button>
                  <button
                    onClick={(e) => onDeleteMonitor(m.id, e)}
                    title="Delete monitor"
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700/60 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
