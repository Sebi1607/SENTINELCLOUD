import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { DashboardStats, TelemetryPoint } from '../types/monitor';
import { Activity, Clock, Zap, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface TelemetryChartProps {
  stats?: DashboardStats | null;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: TelemetryPoint;
  }>;
  label?: string;
  isDark?: boolean;
}

const FALLBACK_TELEMETRY_24H: TelemetryPoint[] = [
  { time: '00:00', latency: 0, status: 'UP' },
  { time: '06:00', latency: 0, status: 'UP' },
  { time: '12:00', latency: 0, status: 'UP' },
  { time: '18:00', latency: 0, status: 'UP' },
  { time: '23:59', latency: 0, status: 'UP' },
];

const FALLBACK_TELEMETRY_7D: TelemetryPoint[] = [
  { time: 'Mon', latency: 0, status: 'UP' },
  { time: 'Tue', latency: 0, status: 'UP' },
  { time: 'Wed', latency: 0, status: 'UP' },
  { time: 'Thu', latency: 0, status: 'UP' },
  { time: 'Fri', latency: 0, status: 'UP' },
  { time: 'Sat', latency: 0, status: 'UP' },
  { time: 'Sun', latency: 0, status: 'UP' },
];

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, isDark }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isSpike = data.isSpike;

    return (
      <div
        className={`rounded-xl backdrop-blur-md p-3 border shadow-xl text-xs space-y-1.5 min-w-[185px] transition-colors ${
          isDark
            ? 'bg-slate-900/95 border-slate-700/80 text-slate-100'
            : 'bg-white/98 border-slate-200 text-slate-800'
        }`}
      >
        <div
          className={`flex items-center justify-between border-b pb-1.5 ${
            isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-100'
          }`}
        >
          <span className="font-mono flex items-center gap-1">
            <Clock className={`w-3 h-3 ${isDark ? 'text-cyan-400' : 'text-sky-500'}`} />
            {label}
          </span>
          <span
            className={`font-semibold px-1.5 py-0.2 rounded text-[10px] ${
              isSpike
                ? isDark
                  ? 'bg-rose-500/20 text-rose-300'
                  : 'bg-rose-100 text-rose-700'
                : isDark
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {data.status}
          </span>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Response Time:</span>
          <span
            className={`text-base font-bold font-mono ${
              isSpike
                ? isDark
                  ? 'text-rose-400'
                  : 'text-rose-600'
                : isDark
                ? 'text-cyan-400'
                : 'text-sky-600'
            }`}
          >
            {data.latency} ms
          </span>
        </div>

        {isSpike && (
          <div
            className={`mt-1 flex items-start gap-1 text-[11px] rounded p-1.5 border ${
              isDark
                ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                : 'text-amber-800 bg-amber-50 border-amber-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
            <span>{data.annotation || 'Anomaly: Severe Latency Spike'}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const TelemetryChart: React.FC<TelemetryChartProps> = ({ stats }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [timeRange, setTimeRange] = useState<'24h' | '7d'>('24h');
  const [isHoveringSpike, setIsHoveringSpike] = useState(false);

  const telemetry24h =
    stats?.telemetry24h && stats.telemetry24h.length > 0
      ? stats.telemetry24h
      : FALLBACK_TELEMETRY_24H;
  const telemetry7d =
    stats?.telemetry7d && stats.telemetry7d.length > 0
      ? stats.telemetry7d
      : FALLBACK_TELEMETRY_7D;

  const data = timeRange === '24h' ? telemetry24h : telemetry7d;
  const spikePoint = data.find((d) => d.isSpike);

  const p95Latency = stats?.p95Latency ?? 68;
  const currentLatency = stats?.avgLatency ?? 0;
  const median24h = stats?.median24hLatency ?? 38;
  const p99Latency = stats?.p99Latency ?? 185;
  const max24h = stats?.max24hLatency ?? 342;

  return (
    <div className="rounded-2xl bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 p-5 shadow-xs dark:shadow-xl flex flex-col justify-between transition-colors duration-250">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-50 dark:bg-cyan-500/10 border border-sky-200 dark:border-cyan-500/20 text-sky-600 dark:text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-wide">
                Global Response Time Telemetry
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 dark:bg-cyan-500/10 text-sky-700 dark:text-cyan-300 border border-sky-200 dark:border-cyan-500/20">
                P95: {p95Latency}ms
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Aggregated across distributed probe nodes in 4 regions
            </p>
          </div>
        </div>

        {/* Range Selector & Telemetry Filter */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center bg-slate-100/90 dark:bg-slate-900/80 rounded-lg p-1 border border-slate-200 dark:border-slate-800 text-xs font-medium">
            <button
              onClick={() => setTimeRange('24h')}
              className={`px-3 py-1 rounded-md transition-all ${
                timeRange === '24h'
                  ? 'bg-white dark:bg-cyan-500/20 text-sky-700 dark:text-cyan-300 border border-slate-200 dark:border-cyan-500/30 shadow-xs dark:shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Last 24 hours
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1 rounded-md transition-all ${
                timeRange === '7d'
                  ? 'bg-white dark:bg-cyan-500/20 text-sky-700 dark:text-cyan-300 border border-slate-200 dark:border-cyan-500/30 shadow-xs dark:shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Last 7 days
            </button>
          </div>
        </div>
      </div>

      {/* Latency Anomaly Banner if spike exists */}
      {spikePoint && (
        <div
          onMouseEnter={() => setIsHoveringSpike(true)}
          onMouseLeave={() => setIsHoveringSpike(false)}
          className="mb-4 flex items-center justify-between px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-800 dark:text-rose-300/90 transition-all cursor-pointer hover:bg-rose-100/70 dark:hover:bg-rose-950/40"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="font-semibold text-rose-900 dark:text-rose-200">Latency Anomaly Detected:</span>
            <span>
              Peak of{' '}
              <span className="font-mono font-bold text-rose-700 dark:text-rose-300">
                {spikePoint.latency}ms
              </span>{' '}
              at{' '}
              <span className="font-mono text-slate-800 dark:text-white font-semibold">
                {spikePoint.time}
              </span>{' '}
              ({spikePoint.annotation || 'Origin Timeout'})
            </span>
          </div>
          <span className="hidden md:inline-block text-[11px] text-rose-600 dark:text-rose-400/80 font-medium underline underline-offset-2">
            View Incident Trace
          </span>
        </div>
      )}

      {/* Recharts Area Chart adapting dynamically to Theme */}
      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="telemetryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={isDark ? '#06B6D4' : '#0EA5E9'}
                  stopOpacity={isDark ? 0.4 : 0.25}
                />
                <stop
                  offset="95%"
                  stopColor={isDark ? '#06B6D4' : '#0EA5E9'}
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? '#1E293B' : '#E2E8F0'}
              vertical={false}
            />
            <XAxis
              dataKey="time"
              stroke={isDark ? '#64748B' : '#94A3B8'}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: isDark ? '#334155' : '#CBD5E1' }}
            />
            <YAxis
              stroke={isDark ? '#64748B' : '#94A3B8'}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: isDark ? '#334155' : '#CBD5E1' }}
              tickFormatter={(v) => `${v}ms`}
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip isDark={isDark} />} />
            <Area
              type="monotone"
              dataKey="latency"
              stroke={isDark ? '#06B6D4' : '#0284C7'}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#telemetryGradient)"
            />

            {/* Red / Amber dot highlighting latency spike point */}
            {spikePoint && (
              <ReferenceDot
                x={spikePoint.time}
                y={spikePoint.latency}
                r={isHoveringSpike ? 8 : 6}
                fill={isDark ? '#EF4444' : '#F43F5E'}
                stroke="#FFFFFF"
                strokeWidth={2.5}
                className="animate-pulse"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Telemetry Footnote Stats */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-slate-500 dark:text-slate-400">Current:</span>
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{currentLatency}ms</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sky-500 dark:bg-cyan-400"></div>
          <span className="text-slate-500 dark:text-slate-400">24h Median:</span>
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{median24h}ms</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
          <span className="text-slate-500 dark:text-slate-400">P99:</span>
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{p99Latency}ms</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500"></div>
          <span className="text-slate-500 dark:text-slate-400">24h Max:</span>
          <span className="font-mono font-semibold text-rose-600 dark:text-rose-300">{max24h}ms</span>
          <Zap className="w-3 h-3 text-rose-500" />
        </div>
      </div>
    </div>
  );
};
