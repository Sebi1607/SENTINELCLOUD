import React, { useState } from 'react';
import {
  Sliders,
  Key,
  Globe,
  Save,
  Check,
  Copy,
  MessageSquare,
  Send,
  Loader2,
} from 'lucide-react';

interface SettingsViewProps {
  onSaveToast: () => void;
  onSendDiscordTest?: (webhookUrl: string, threshold: number) => Promise<void> | void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onSaveToast,
  onSendDiscordTest,
}) => {
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [probeInterval, setProbeInterval] = useState('30s');
  const [timeoutSeconds, setTimeoutSeconds] = useState(10);
  const [followRedirects, setFollowRedirects] = useState(true);
  const [strictSsl, setStrictSsl] = useState(true);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState(
    'https://discord.com/api/webhooks/129841029481/a8B9cD_sentinel_alerts'
  );
  const [isTestingDiscord, setIsTestingDiscord] = useState(false);

  const mockApiKey = 'sc_live_948f1028ba49102c0194821a81';

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(mockApiKey);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  const handleDiscordTestClick = async () => {
    if (!onSendDiscordTest) return;
    setIsTestingDiscord(true);
    try {
      await onSendDiscordTest(discordWebhookUrl, 250);
    } finally {
      setIsTestingDiscord(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl transition-colors duration-250">
      {/* View Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">System Settings & Probes</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure probe consensus algorithms, cryptographic verification, and API tokens
        </p>
      </div>

      {/* Global Probe Settings */}
      <div className="rounded-2xl bg-white/90 dark:bg-[#111827]/90 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs dark:shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-sky-50 dark:bg-cyan-500/10 border border-sky-200 dark:border-cyan-500/20 text-sky-600 dark:text-cyan-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Global Probe Policy</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Default options applied to all new and active monitors</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default Probe Interval</label>
            <select
              value={probeInterval}
              onChange={(e) => setProbeInterval(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 dark:focus:border-cyan-500"
            >
              <option value="30s">Every 30 seconds (High Precision)</option>
              <option value="1m">Every 1 minute (Standard)</option>
              <option value="5m">Every 5 minutes (Conserve)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">HTTP Request Timeout</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="2"
                max="30"
                value={timeoutSeconds}
                onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 dark:focus:border-cyan-500"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">seconds</span>
            </div>
          </div>
        </div>

        <div className="pt-2 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={strictSsl}
              onChange={(e) => setStrictSsl(e.target.checked)}
              className="rounded text-sky-600 dark:text-cyan-500 accent-sky-600 dark:accent-cyan-500"
            />
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Strict SSL / TLS Certificate Validation</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Flag self-signed certificates and cipher suite vulnerabilities as degraded</span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={followRedirects}
              onChange={(e) => setFollowRedirects(e.target.checked)}
              className="rounded text-sky-600 dark:text-cyan-500 accent-sky-600 dark:accent-cyan-500"
            />
            <div>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">Follow HTTP 301/302 Redirect Chains</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Evaluate terminal destination response code up to 5 hops</span>
            </div>
          </label>
        </div>
      </div>

      {/* Discord Webhook Integration & Test Card */}
      <div className="rounded-2xl bg-white/90 dark:bg-[#111827]/90 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs dark:shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Discord Webhook Alert Channel</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure and test live Discord Embed notifications via FastAPI</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            type="text"
            value={discordWebhookUrl}
            onChange={(e) => setDiscordWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 dark:focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={handleDiscordTestClick}
            disabled={isTestingDiscord}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 dark:from-indigo-600 dark:to-cyan-600 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50"
          >
            {isTestingDiscord ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sending Test...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send Test Discord Alert</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Edge Probe Locations */}
      <div className="rounded-2xl bg-white/90 dark:bg-[#111827]/90 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs dark:shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Active Distributed Probe Nodes</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Regional infrastructure powering consensus verifications</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: 'US East (N. Virginia)', code: 'us-east-1', flag: '🇺🇸', latency: '24ms', health: 'Operational' },
            { name: 'EU Central (Frankfurt)', code: 'eu-central-1', flag: '🇩🇪', latency: '42ms', health: 'Operational' },
            { name: 'Asia Pacific (Mumbai)', code: 'ap-south-1', flag: '🇮🇳', latency: '75ms', health: 'Operational' },
            { name: 'South America (São Paulo)', code: 'sa-east-1', flag: '🇧🇷', latency: '88ms', health: 'Operational' },
          ].map((node) => (
            <div
              key={node.code}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{node.flag}</span>
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">{node.name}</span>
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{node.code}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-sky-700 dark:text-cyan-400 block">{node.latency}</span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">{node.health}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Key Management */}
      <div className="rounded-2xl bg-white/90 dark:bg-[#111827]/90 border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs dark:shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Sentinel REST API & CLI Token</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Use this token to manage monitors via GitHub Actions or Terraform</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 font-mono text-xs text-slate-700 dark:text-slate-300 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 select-all truncate">
            {mockApiKey}
          </div>
          <button
            onClick={handleCopyApiKey}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xs transition-colors"
          >
            {apiKeyCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{apiKeyCopied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={onSaveToast}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-semibold dark:font-bold text-xs shadow-md shadow-sky-100 dark:shadow-cyan-950/40 transition-all active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Save System Configurations</span>
        </button>
      </div>
    </div>
  );
};
