import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Globe,
  Clock,
  Zap,
  Mail,
  ShieldCheck,
  Radio,
  Sliders,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { CreateMonitorPayload, HttpMethod } from '../types/monitor';

interface CreateMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: CreateMonitorPayload) => Promise<void> | void;
}

export const CreateMonitorModal: React.FC<CreateMonitorModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [interval, setInterval] = useState<'30s' | '1m' | '5m'>('30s');
  const [threshold, setThreshold] = useState<number>(200);
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelDiscord, setChannelDiscord] = useState(true);
  const [channelSlack, setChannelSlack] = useState(false);
  const [region, setRegion] = useState('us-east-1');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please enter a descriptive monitor name.');
      return;
    }
    if (!url.trim() || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      setErrorMessage('Please enter a valid URL starting with http:// or https://');
      return;
    }

    const payload: CreateMonitorPayload = {
      name: name.trim(),
      url: url.trim(),
      method,
      interval,
      latencyThreshold: threshold,
      region,
      alertChannels: {
        email: channelEmail,
        discord: channelDiscord,
        slack: channelSlack,
      },
    };

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onCreate(payload);
      setName('');
      setUrl('');
      setMethod('GET');
      setInterval('30s');
      setThreshold(200);
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to create monitor via API.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-250">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-cyan-500/10 border border-sky-200 dark:border-cyan-500/20 text-sky-600 dark:text-cyan-400">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Monitor</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure continuous uptime and latency checks across distributed probes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Monitor Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Monitor Name <span className="text-sky-600 dark:text-cyan-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Payments Webhook Gateway"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrorMessage('');
              }}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-sky-500 dark:focus:ring-cyan-500 transition-all"
            />
          </div>

          {/* Target URL & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">HTTP Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-sm font-mono text-sky-700 dark:text-cyan-300 font-semibold focus:outline-none focus:border-sky-500 dark:focus:border-cyan-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="HEAD">HEAD</option>
                <option value="PUT">PUT</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-3">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                Target Endpoint URL <span className="text-sky-600 dark:text-cyan-400">*</span>
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  required
                  placeholder="https://api.yourdomain.com/healthz"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setErrorMessage('');
                  }}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-sm font-mono text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-sky-500 dark:focus:border-cyan-500 focus:ring-1 focus:ring-sky-500 dark:focus:ring-cyan-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Check Interval & Latency Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Check Frequency</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['30s', '1m', '5m'] as const).map((int) => (
                  <button
                    key={int}
                    type="button"
                    onClick={() => setInterval(int)}
                    className={`py-2 text-xs font-mono font-semibold rounded-xl border transition-all ${
                      interval === int
                        ? 'bg-sky-50 dark:bg-cyan-500/20 text-sky-700 dark:text-cyan-300 border-sky-300 dark:border-cyan-500/50 shadow-xs dark:shadow-sm'
                        : 'bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:text-slate-200'
                    }`}
                  >
                    {int}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Latency Alert Threshold</span>
                </label>
                <span className="text-xs font-mono font-bold text-sky-700 dark:text-cyan-400">{threshold} ms</span>
              </div>
              <input
                type="range"
                min="50"
                max="800"
                step="25"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-sky-500 dark:accent-cyan-500 cursor-pointer h-2 bg-slate-200 dark:bg-slate-800 rounded-lg mt-2"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>50ms (Strict)</span>
                <span>400ms</span>
                <span>800ms (Relaxed)</span>
              </div>
            </div>
          </div>

          {/* Region Probe Assignment */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />
              <span>Primary Probe Region</span>
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500 dark:focus:border-cyan-500"
            >
              <option value="us-east-1">🇺🇸 US East (N. Virginia) — 10ms edge latency</option>
              <option value="eu-central-1">🇩🇪 EU Central (Frankfurt) — GDPR compliant</option>
              <option value="ap-south-1">🇮🇳 Asia Pacific (Mumbai) — High availability</option>
              <option value="sa-east-1">🇧🇷 South America (São Paulo) — Edge node</option>
            </select>
          </div>

          {/* Alert Channels Checkboxes */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Dispatch Outage Alerts To:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Email */}
              <label
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  channelEmail
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={channelEmail}
                  onChange={(e) => setChannelEmail(e.target.checked)}
                  className="rounded text-emerald-600 accent-emerald-600"
                />
                <Mail className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium">Email Digest</span>
              </label>

              {/* Discord */}
              <label
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  channelDiscord
                    ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-500/40 text-indigo-800 dark:text-indigo-300'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={channelDiscord}
                  onChange={(e) => setChannelDiscord(e.target.checked)}
                  className="rounded text-indigo-600 accent-indigo-600"
                />
                <MessageSquare className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-medium">Discord Bot</span>
              </label>

              {/* Slack */}
              <label
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  channelSlack
                    ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-500/40 text-purple-800 dark:text-purple-300'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/40 text-slate-600 dark:text-slate-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={channelSlack}
                  onChange={(e) => setChannelSlack(e.target.checked)}
                  className="rounded text-purple-600 accent-purple-600"
                />
                <ShieldCheck className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-medium">Slack Pager</span>
              </label>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white dark:text-slate-900 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 dark:from-cyan-400 dark:to-emerald-400 dark:hover:from-cyan-300 dark:hover:to-emerald-300 shadow-md shadow-sky-100 dark:shadow-cyan-950/40 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deploying & Probing...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Deploy Monitor</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
