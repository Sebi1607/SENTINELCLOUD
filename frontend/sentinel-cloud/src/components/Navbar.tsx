import React, { useState } from 'react';
import {
  ShieldAlert,
  Activity,
  Bell,
  Play,
  Pause,
  Layers,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  Sun,
  Moon,
} from 'lucide-react';
import { ActiveNavTab, Monitor } from '../types/monitor';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  activeTab: ActiveNavTab;
  onTabChange: (tab: ActiveNavTab) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  downMonitorsCount: number;
  monitors: Monitor[];
  onOpenMonitor: (monitor: Monitor) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  isSimulating,
  onToggleSimulation,
  downMonitorsCount,
  monitors,
  onOpenMonitor,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  const downMonitors = monitors.filter((m) => m.status === 'DOWN');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#0B1120]/90 backdrop-blur-md shadow-xs transition-colors duration-250">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Brand & System Status */}
          <div className="flex items-center gap-4">
            <div
              onClick={() => onTabChange('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-cyan-500/20 dark:to-blue-600/20 border border-sky-200 dark:border-cyan-500/30 text-sky-600 dark:text-cyan-400 group-hover:scale-105 transition-all duration-300 shadow-sm shadow-sky-100 dark:shadow-cyan-950/30">
                <ShieldAlert className="w-5 h-5 text-sky-600 dark:text-cyan-400 group-hover:scale-105 transition-transform" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                    Sentinel<span className="text-sky-600 dark:text-cyan-400 font-extrabold">Cloud</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 font-medium">
                    v2.4
                  </span>
                </div>
              </div>
            </div>

            {/* Glowing System Status Pill */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="tracking-wide font-semibold">System Operational</span>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-gradient-to-r dark:from-cyan-500/20 dark:to-blue-500/20 text-sky-700 dark:text-cyan-300 border border-slate-200/70 dark:border-cyan-500/30 shadow-xs dark:shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onTabChange('monitors')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'monitors'
                  ? 'bg-white dark:bg-gradient-to-r dark:from-cyan-500/20 dark:to-blue-500/20 text-sky-700 dark:text-cyan-300 border border-slate-200/70 dark:border-cyan-500/30 shadow-xs dark:shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Monitors</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-semibold">
                {monitors.length}
              </span>
            </button>

            <button
              onClick={() => onTabChange('alerts')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'alerts'
                  ? 'bg-white dark:bg-gradient-to-r dark:from-cyan-500/20 dark:to-blue-500/20 text-sky-700 dark:text-cyan-300 border border-slate-200/70 dark:border-cyan-500/30 shadow-xs dark:shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Alerts</span>
              {downMonitorsCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 font-semibold animate-pulse">
                  {downMonitorsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onTabChange('settings')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-gradient-to-r dark:from-cyan-500/20 dark:to-blue-500/20 text-sky-700 dark:text-cyan-300 border border-slate-200/70 dark:border-cyan-500/30 shadow-xs dark:shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </nav>

          {/* Right Actions: Theme Toggle, Live Simulation Switch, Notification Bell, User Avatar */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button (Light/Dark Mode) */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Pastel mode' : 'Switch to Dark Telemetry mode'}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800/80 shadow-xs transition-all group"
              aria-label="Toggle theme mode"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600 group-hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Live Ping Simulator Toggle */}
            <button
              onClick={onToggleSimulation}
              title={isSimulating ? 'Pause 5-second live ping simulation' : 'Start 5-second live ping simulation'}
              className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isSimulating
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 shadow-xs dark:shadow-sm shadow-emerald-100/50'
                  : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
            >
              {isSimulating ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Live Simulation</span>
                  <Pause className="w-3 h-3 text-emerald-600 dark:text-emerald-400 ml-0.5" />
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                  <span>Simulation Paused</span>
                  <Play className="w-3 h-3 text-slate-500 dark:text-slate-400 ml-0.5" />
                </>
              )}
            </button>

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                className="relative p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800/80 shadow-xs transition-colors"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {downMonitorsCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotificationMenu && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-fade-in">
                  <div className="flex items-center justify-between p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Notifications & Incidents</span>
                    </div>
                    <button
                      onClick={() => setShowNotificationMenu(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                    {downMonitors.length > 0 ? (
                      downMonitors.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            onOpenMonitor(m);
                            setShowNotificationMenu(false);
                          }}
                          className="p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 hover:border-rose-300 dark:hover:border-rose-400/60 cursor-pointer transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
                              <span className="text-xs font-semibold text-rose-900 dark:text-rose-200">{m.name}</span>
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 font-bold border border-rose-200 dark:border-transparent">
                              HTTP 504
                            </span>
                          </div>
                          <p className="text-xs text-rose-700/90 dark:text-rose-300/80 mt-1">
                            Edge origin unreachable (Error 521) • Incident ongoing
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/30 text-[10px] text-slate-500 dark:text-slate-400">
                            <span>Started 42m ago</span>
                            <span className="text-sky-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-medium">
                              Inspect <ExternalLink className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 mx-auto mb-2 opacity-80" />
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-300">All services are operating normally</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">No active incidents or degradation</p>
                      </div>
                    )}

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/40 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Automated Ping Interval</span>
                      <span className="font-mono text-sky-700 dark:text-cyan-400 font-semibold">30s Active</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 text-center">
                    <button
                      onClick={() => {
                        setShowNotificationMenu(false);
                        onTabChange('alerts');
                      }}
                      className="text-xs text-sky-600 dark:text-cyan-400 hover:text-sky-700 dark:hover:text-cyan-300 font-semibold transition-colors"
                    >
                      View all system incident history →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Avatar */}
            <div className="flex items-center gap-2.5 pl-1 border-l border-slate-200 dark:border-slate-800">
              <div className="relative cursor-pointer">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 dark:from-cyan-600 dark:to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm border border-sky-300 dark:border-cyan-400/40">
                  SC
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0B1120]"></span>
              </div>
              <div className="hidden lg:flex flex-col">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Site Reliability Ops</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Sentinel Enterprise</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
