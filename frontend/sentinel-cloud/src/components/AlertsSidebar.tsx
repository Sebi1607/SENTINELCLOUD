import React, { useState } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  BellRing,
  AlertOctagon,
  ShieldAlert,
  Loader2,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { Monitor } from '../types/monitor';

interface AlertsSidebarProps {
  onSendDiscordTest: (webhookUrl: string, threshold: number) => void;
  downMonitors: Monitor[];
  onOpenMonitor: (monitor: Monitor) => void;
}

export const AlertsSidebar: React.FC<AlertsSidebarProps> = ({
  onSendDiscordTest,
  downMonitors,
  onOpenMonitor,
}) => {
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(
    'https://discord.com/api/webhooks/129841029481/a8B9cD_sentinel_alerts'
  );
  const [alertThresholdMs, setAlertThresholdMs] = useState(250);
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleTestNotification = () => {
    setIsSendingTest(true);
    setTimeout(() => {
      setIsSendingTest(false);
      onSendDiscordTest(discordWebhookUrl, alertThresholdMs);
    }, 600);
  };

  return (
    <div className="space-y-4 transition-colors duration-250">
      {/* Active Incident Warning Alert (if any down monitors) */}
      {downMonitors.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100/60 dark:from-rose-950/40 dark:to-slate-900 border border-rose-200 dark:border-rose-500/40 p-4 shadow-xs dark:shadow-xl relative overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 shrink-0">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                  Active Incident
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-200/80 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 font-bold border border-rose-300/60 dark:border-transparent">
                  P1 CRITICAL
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                {downMonitors[0].name} Down
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-200/80 mt-0.5 leading-relaxed">
                HTTP 504 Gateway Timeout: Edge origin unreachable (Error 521).
              </p>
              <button
                onClick={() => onOpenMonitor(downMonitors[0])}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-rose-800 dark:text-rose-300 hover:text-rose-950 dark:hover:text-white px-2.5 py-1 rounded-lg bg-white/90 dark:bg-rose-500/20 hover:bg-white dark:hover:bg-rose-500/30 border border-rose-200 dark:border-rose-500/40 shadow-xs transition-all"
              >
                <span>Investigate Root Cause</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Alerts Card */}
      <div className="rounded-2xl bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 p-4 shadow-xs dark:shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Email Alerts</h4>
                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Connected
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dispatch alerts to ops-team@sentinelcloud.io
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={() => setEmailAlertsEnabled(!emailAlertsEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              emailAlertsEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            role="switch"
            aria-checked={emailAlertsEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                emailAlertsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {emailAlertsEnabled && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Instant failover digest active</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold">0 delay</span>
          </div>
        )}
      </div>

      {/* Discord Webhook Integration Card */}
      <div className="rounded-2xl bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 p-4 shadow-xs dark:shadow-xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Discord Webhook</h4>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
                  v10
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Instant rich embed incident broadcasts</p>
            </div>
          </div>
          <BellRing className="w-4 h-4 text-slate-400" />
        </div>

        {/* Input: Webhook URL */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Webhook Endpoint URL</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Encrypted</span>
          </label>
          <input
            type="text"
            value={discordWebhookUrl}
            onChange={(e) => setDiscordWebhookUrl(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 dark:focus:border-cyan-500/50 focus:ring-1 focus:ring-sky-500 dark:focus:ring-cyan-500/50 transition-all truncate"
          />
        </div>

        {/* Input: Latency Threshold */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Alert Latency Threshold
            </label>
            <span className="font-mono text-xs font-bold text-sky-700 dark:text-cyan-400">
              {alertThresholdMs} ms
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="50"
              max="1000"
              step="25"
              value={alertThresholdMs}
              onChange={(e) => setAlertThresholdMs(Number(e.target.value))}
              className="w-full accent-sky-500 dark:accent-cyan-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Trigger P2 warning when endpoint response exceeds threshold for 2 consecutive probes.
          </p>
        </div>

        {/* Interactive Send Test Notification Button */}
        <button
          onClick={handleTestNotification}
          disabled={isSendingTest}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 dark:from-indigo-600 dark:to-cyan-600 dark:hover:from-indigo-500 dark:hover:to-cyan-500 text-white font-semibold text-xs shadow-md shadow-indigo-100 dark:shadow-indigo-950/40 border border-transparent dark:border-indigo-400/30 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {isSendingTest ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Dispatching Webhook Payload...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Send Test Notification</span>
            </>
          )}
        </button>
      </div>

      {/* Sentinel System Health Shield Card */}
      <div className="rounded-2xl bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 p-4 shadow-xs dark:shadow-xl">
        <div className="flex items-center gap-3 mb-2.5">
          <div className="p-2 rounded-xl bg-sky-50 dark:bg-cyan-500/10 border border-sky-200 dark:border-cyan-500/20 text-sky-600 dark:text-cyan-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs font-semibold text-slate-900 dark:text-white">Probe Node Consensus</h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Quorum: 3 of 4 region confirmations</p>
          </div>
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>False-Positive Dampening</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Enabled</span>
          </div>
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>SSL Expiry Early Warning</span>
            <span className="text-slate-800 dark:text-slate-200 font-mono font-medium">14 days</span>
          </div>
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
            <span>Incident Auto-Resolution</span>
            <span className="text-slate-700 dark:text-slate-200">After 3 green checks</span>
          </div>
        </div>
      </div>
    </div>
  );
};
