import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Send,
  MessageSquare,
  Mail,
  ExternalLink,
  Flame,
  Radio,
} from 'lucide-react';
import { IncidentRecord, Monitor } from '../types/monitor';

interface AlertsViewProps {
  monitors: Monitor[];
  incidents?: IncidentRecord[];
  onOpenMonitor: (monitor: Monitor) => void;
  onSendDiscordTest: (webhookUrl: string, threshold: number) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  monitors,
  incidents,
  onOpenMonitor,
  onSendDiscordTest,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');
  const discordUrl = 'https://discord.com/api/webhooks/129841029481/a8B9cD_sentinel_alerts';

  // Use backend /api/incidents if provided, or flatten from monitors
  const allIncidents =
    incidents && incidents.length > 0
      ? incidents.map((inc) => {
          const matchedMonitor =
            monitors.find((m) => m.id === inc.monitorId || m.name === inc.monitorName) ||
            monitors[0];
          return {
            ...inc,
            monitorName: inc.monitorName || matchedMonitor?.name || 'Monitored Endpoint',
            monitorUrl: inc.monitorUrl || matchedMonitor?.url || '',
            monitorObj: matchedMonitor,
          };
        })
      : monitors.flatMap((m) =>
          m.incidents.map((inc) => ({
            ...inc,
            monitorName: m.name,
            monitorUrl: m.url,
            monitorObj: m,
          }))
        );

  const filteredIncidents = allIncidents.filter((inc) => {
    if (filterType === 'ACTIVE') return !inc.resolved;
    if (filterType === 'RESOLVED') return inc.resolved;
    return true;
  });

  const activeCount = allIncidents.filter((i) => !i.resolved).length;

  return (
    <div className="space-y-6 transition-colors duration-250">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Incident Management & Alerts
            </h1>
            {activeCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 animate-pulse">
                {activeCount} Active Outage
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time alert dispatching, multi-channel webhook integrations, and incident audit trails
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSendDiscordTest(discordUrl, 250)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-100 dark:shadow-indigo-950/40 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>Broadcast Test Alert</span>
          </button>
        </div>
      </div>

      {/* Incident Channels Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Discord */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#111827]/90 border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="font-semibold text-slate-900 dark:text-white text-sm">Discord Alerts</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
              Active
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rich embed payloads dispatched to <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">#ops-alerts</span>
          </p>
        </div>

        {/* Email */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#111827]/90 border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <Mail className="w-4 h-4" />
              </div>
              <span className="font-semibold text-slate-900 dark:text-white text-sm">Email Routing</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
              Connected
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Recipient list: <span className="text-slate-700 dark:text-slate-300 font-medium">ops-team@sentinelcloud.io</span>
          </p>
        </div>

        {/* Multi-Region Consensus */}
        <div className="p-4 rounded-2xl bg-white/90 dark:bg-[#111827]/90 border border-slate-200/90 dark:border-slate-800 shadow-xs dark:shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-50 dark:bg-cyan-500/10 border border-sky-200 dark:border-cyan-500/20 text-sky-600 dark:text-cyan-400">
                <Radio className="w-4 h-4" />
              </div>
              <span className="font-semibold text-slate-900 dark:text-white text-sm">Quorum Policy</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-cyan-500/10 text-sky-700 dark:text-cyan-300 border border-sky-200 dark:border-cyan-500/20">
              Strict 3/4
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Zero false positives via distributed quorum confirmation
          </p>
        </div>
      </div>

      {/* Incident Log Table & Filter */}
      <div className="rounded-2xl bg-white/90 dark:bg-[#111827]/90 border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs dark:shadow-xl">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500" />
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Incident Event Log</h3>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map((ft) => (
              <button
                key={ft}
                onClick={() => setFilterType(ft)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  filterType === ft
                    ? 'bg-white dark:bg-cyan-500/20 text-sky-700 dark:text-cyan-300 border border-slate-200 dark:border-cyan-500/30 shadow-xs dark:shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {ft}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredIncidents.length > 0 ? (
            filteredIncidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => inc.monitorObj && onOpenMonitor(inc.monitorObj)}
                className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-xl border shrink-0 ${
                      !inc.resolved
                        ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/40'
                        : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                    }`}
                  >
                    {!inc.resolved ? (
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{inc.monitorName}</h4>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          !inc.resolved
                            ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {inc.type}
                      </span>
                      {inc.statusCode && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700">
                          HTTP {inc.statusCode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">{inc.reason}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-mono">
                      <span>{inc.timestamp}</span>
                      <span>•</span>
                      <span>Duration: {inc.duration}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      !inc.resolved
                        ? 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40'
                        : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
                    }`}
                  >
                    {!inc.resolved ? 'Active Outage' : 'Resolved'}
                  </span>
                  <ExternalLink className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No incidents in this category</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
