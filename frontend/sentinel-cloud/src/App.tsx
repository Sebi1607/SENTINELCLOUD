import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Zap,
  Loader2,
  Globe,
} from 'lucide-react';
import {
  Monitor,
  ActiveNavTab,
  ToastMessage,
  DashboardStats,
  IncidentRecord,
  CreateMonitorPayload,
} from './types/monitor';
import {
  fetchMonitors,
  createMonitor,
  deleteMonitor,
  checkMonitorNow,
  togglePauseMonitor,
  fetchDashboardStats,
  fetchIncidents,
  testDiscordWebhook,
} from './services/api';
import { Navbar } from './components/Navbar';
import { TelemetryChart } from './components/TelemetryChart';
import { MonitorsTable } from './components/MonitorsTable';
import { AlertsSidebar } from './components/AlertsSidebar';
import { CreateMonitorModal } from './components/CreateMonitorModal';
import { MonitorDetailDrawer } from './components/MonitorDetailDrawer';
import { MonitorsView } from './components/MonitorsView';
import { AlertsView } from './components/AlertsView';
import { SettingsView } from './components/SettingsView';
import { ToastContainer } from './components/ToastContainer';

export const App: React.FC = () => {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('dashboard');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSimulating, setIsSimulating] = useState(true);

  const pollingIntervalRef = useRef<number | null>(null);

  // Toast dispatcher helper
  const addToast = useCallback(
    (
      type: 'success' | 'error' | 'info' | 'warning',
      title: string,
      message: string
    ) => {
      const newToast: ToastMessage = {
        id: `toast-${Date.now()}-${Math.random()}`,
        type,
        title,
        message,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      };
      setToasts((prev) => [newToast, ...prev].slice(0, 5));

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4500);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Synchronize monitors, dashboard stats, and incidents from FastAPI
  const refreshAllData = useCallback(async (isInitial = false) => {
    try {
      const [monitorsData, statsData, incidentsData] = await Promise.all([
        fetchMonitors(),
        fetchDashboardStats(),
        fetchIncidents(),
      ]);

      setMonitors(monitorsData);
      setDashboardStats(statsData);
      setIncidents(incidentsData);

      // Keep open drawer synchronized with fresh backend state
      setSelectedMonitor((prev) => {
        if (!prev) return null;
        return monitorsData.find((m) => m.id === prev.id) || prev;
      });
    } catch (err) {
      if (isInitial) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to reach FastAPI backend at http://127.0.0.1:8000';
        addToast('error', 'Backend Connection Error', msg);
      }
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  }, [addToast]);

  // Initial load on mount
  useEffect(() => {
    refreshAllData(true);
  }, [refreshAllData]);

  // 10-second polling interval to sync background APScheduler checks live
  useEffect(() => {
    if (isSimulating) {
      pollingIntervalRef.current = window.setInterval(() => {
        refreshAllData(false);
      }, 10000);
    } else {
      if (pollingIntervalRef.current !== null) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    return () => {
      if (pollingIntervalRef.current !== null) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isSimulating, refreshAllData]);

  // KPI Values (from backend stats with fallback to current monitors list)
  const totalMonitors = dashboardStats?.totalMonitors ?? monitors.length;
  const operationalCount =
    dashboardStats?.operational ?? monitors.filter((m) => m.status === 'UP').length;
  const downCount =
    dashboardStats?.down ?? monitors.filter((m) => m.status === 'DOWN').length;

  const upMonitorsWithLatency = monitors.filter(
    (m) => m.status === 'UP' && m.latency !== null
  );
  const computedAvgLatency =
    upMonitorsWithLatency.length > 0
      ? Math.round(
          upMonitorsWithLatency.reduce((acc, m) => acc + (m.latency ?? 0), 0) /
            upMonitorsWithLatency.length
        )
      : 0;
  const avgLatency = dashboardStats?.avgLatency ?? computedAvgLatency;

  // Handlers
  const handleToggleSimulation = () => {
    setIsSimulating((prev) => {
      const next = !prev;
      if (next) {
        addToast(
          'info',
          'Live Telemetry Polling Active',
          'Syncing background APScheduler probe results every 10 seconds.'
        );
      } else {
        addToast(
          'warning',
          'Live Polling Paused',
          'Automatic 10-second background refreshes paused.'
        );
      }
      return next;
    });
  };

  const handleSelectMonitor = (monitor: Monitor) => {
    const fresh = monitors.find((m) => m.id === monitor.id) || monitor;
    setSelectedMonitor(fresh);
    setIsDetailDrawerOpen(true);
  };

  const handleTogglePause = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await togglePauseMonitor(id);
      setMonitors((prev) => prev.map((m) => (m.id === id ? updated : m)));
      if (selectedMonitor?.id === id) {
        setSelectedMonitor(updated);
      }
      await refreshAllData(false);
      addToast(
        updated.status === 'UP' ? 'success' : 'warning',
        updated.status === 'UP' ? 'Monitor Resumed' : 'Monitor Paused',
        `${updated.name} monitoring is now ${
          updated.status === 'PAUSED' ? 'temporarily halted' : 'active'
        }.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to toggle pause status.';
      addToast('error', 'Update Failed', msg);
    }
  };

  const handleDeleteMonitor = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const monitorToDelete = monitors.find((m) => m.id === id);
    if (!monitorToDelete) return;

    try {
      await deleteMonitor(id);
      setMonitors((prev) => prev.filter((m) => m.id !== id));
      if (selectedMonitor?.id === id) {
        setIsDetailDrawerOpen(false);
        setSelectedMonitor(null);
      }
      await refreshAllData(false);
      addToast(
        'info',
        'Monitor Removed',
        `${monitorToDelete.name} has been deleted from SQLite and active checks.`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete monitor.';
      addToast('error', 'Delete Failed', msg);
    }
  };

  const handlePingMonitor = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPingingId(id);

    try {
      const updated = await checkMonitorNow(id);
      setMonitors((prev) => prev.map((m) => (m.id === id ? updated : m)));
      if (selectedMonitor?.id === id) {
        setSelectedMonitor(updated);
      }
      await refreshAllData(false);

      if (updated.status === 'DOWN') {
        addToast(
          'error',
          `Probe Result: HTTP ${updated.httpStatusCode ?? 'ERR'}`,
          `Ping to ${updated.name} failed or returned error.`
        );
      } else {
        addToast(
          'success',
          'Live Ping Successful',
          `${updated.name} verified operational (${updated.latency ?? 0}ms latency).`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'On-demand check failed.';
      addToast('error', 'Ping Failed', msg);
    } finally {
      setPingingId(null);
    }
  };

  const handleCreateMonitor = async (payload: CreateMonitorPayload) => {
    const created = await createMonitor(payload);
    setMonitors((prev) => [created, ...prev]);
    await refreshAllData(false);
    addToast(
      created.status === 'DOWN' ? 'warning' : 'success',
      'Monitor Deployed',
      `"${created.name}" created and probed (${created.status}${
        created.latency ? ` • ${created.latency}ms` : ''
      }).`
    );
  };

  const handleDiscordTest = async (webhookUrl: string, threshold = 250) => {
    try {
      const res = await testDiscordWebhook(webhookUrl, threshold);
      addToast(
        res.success ? 'success' : 'info',
        res.success ? 'Test Alert Dispatched' : 'Discord Test Processed',
        res.message
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to dispatch test Discord alert.';
      addToast('error', 'Discord Test Failed', msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFD] dark:bg-[#0B1120] text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-sky-100 selection:text-sky-800 dark:selection:bg-cyan-500/20 dark:selection:text-cyan-300 transition-colors duration-250">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isSimulating={isSimulating}
        onToggleSimulation={handleToggleSimulation}
        downMonitorsCount={downCount}
        monitors={monitors}
        onOpenMonitor={handleSelectMonitor}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="rounded-2xl bg-white/90 dark:bg-[#111827]/90 border border-slate-200/90 dark:border-slate-800/80 p-12 shadow-xs dark:shadow-xl flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-sky-500 dark:text-cyan-400 animate-spin" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Connecting to SentinelCloud FastAPI Engine...
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Synchronizing live monitors, telemetry history, and incident records from SQLite
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Dashboard Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                      <span>Dashboard Overview</span>
                      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-sky-50 dark:bg-cyan-500/10 text-sky-700 dark:text-cyan-400 border border-sky-200 dark:border-cyan-500/20 font-semibold">
                        <Radio className="w-3 h-3 text-sky-600 dark:text-cyan-400 animate-pulse" />
                        Live Telemetry
                      </span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Automated website and API monitoring system
                    </p>
                  </div>

                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 dark:from-cyan-400 dark:to-white dark:hover:from-cyan-300 dark:hover:to-slate-100 text-white dark:text-slate-950 font-semibold dark:font-bold text-xs shadow-md dark:shadow-lg shadow-sky-100 dark:shadow-cyan-950/40 border border-transparent dark:border-cyan-300/40 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4 text-white dark:text-slate-950" />
                    <span>+ Create New Monitor</span>
                  </button>
                </div>

                {/* 4 Top KPI Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Monitors */}
                  <div className="rounded-2xl bg-white/90 dark:bg-[#111827]/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/80 p-4 shadow-xs dark:shadow-xl flex items-center justify-between transition-colors duration-250">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Monitors</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
                          {totalMonitors}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">endpoints</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                      <Activity className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Operational */}
                  <div className="rounded-2xl bg-emerald-50/70 dark:bg-[#111827]/90 backdrop-blur-xl border border-emerald-200/90 dark:border-emerald-500/30 p-4 shadow-xs dark:shadow-xl flex items-center justify-between relative overflow-hidden group transition-colors duration-250">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-400">Operational</span>
                        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold font-mono text-emerald-700 dark:text-emerald-400 tracking-tight">
                          {operationalCount}
                        </span>
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-500/80 font-medium">healthy</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 shadow-xs dark:shadow-emerald-950/40">
                      <CheckCircle2 className="w-5 h-5 animate-pulse" />
                    </div>
                  </div>

                  {/* Incidents / Down */}
                  <div className="rounded-2xl bg-rose-50/70 dark:bg-[#111827]/90 backdrop-blur-xl border border-rose-200/90 dark:border-rose-500/30 p-4 shadow-xs dark:shadow-xl flex items-center justify-between relative overflow-hidden group transition-colors duration-250">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-xl pointer-events-none"></div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-rose-800 dark:text-rose-400">Incidents / Down</span>
                        {downCount > 0 && (
                          <span className="flex h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping"></span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold font-mono text-rose-700 dark:text-rose-400 tracking-tight">
                          {downCount}
                        </span>
                        <span className="text-[11px] text-rose-700 dark:text-rose-400/80 font-medium">critical</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-100/80 dark:bg-rose-950/60 border border-rose-300/80 dark:border-rose-500/40 text-rose-700 dark:text-rose-400 shadow-xs dark:shadow-rose-950/40">
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                    </div>
                  </div>

                  {/* Avg Global Latency */}
                  <div className="rounded-2xl bg-sky-50/70 dark:bg-[#111827]/90 backdrop-blur-xl border border-sky-200/90 dark:border-slate-800/80 p-4 shadow-xs dark:shadow-xl flex items-center justify-between transition-colors duration-250">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-sky-800 dark:text-slate-400">Avg Global Latency</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold font-mono text-sky-700 dark:text-cyan-400 tracking-tight">
                          {avgLatency}ms
                        </span>
                        <span className="text-[11px] text-sky-700 dark:text-cyan-500/80 font-medium">p50 consensus</span>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-sky-100/80 dark:bg-cyan-950/60 border border-sky-300/80 dark:border-cyan-500/40 text-sky-700 dark:text-cyan-400 shadow-xs dark:shadow-cyan-950/40">
                      <Zap className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Empty State Banner when 0 monitors exist in SQLite */}
                {monitors.length === 0 && (
                  <div className="rounded-2xl bg-white/90 dark:bg-[#111827]/90 border border-dashed border-sky-300 dark:border-cyan-500/40 p-8 shadow-xs dark:shadow-xl flex flex-col items-center justify-center text-center space-y-3">
                    <div className="p-3 rounded-2xl bg-sky-50 dark:bg-cyan-500/10 border border-sky-200 dark:border-cyan-500/20 text-sky-600 dark:text-cyan-400">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-md">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        No Monitored Endpoints Configured Yet
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Deploy your first HTTP/HTTPS monitor to start automated background health checks, TLS expiry tracking, and real-time latency telemetry.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-semibold text-xs shadow-sm transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Deploy First Monitor</span>
                    </button>
                  </div>
                )}

                {/* Main Split Grid (Left 2/3 width, Right 1/3 width) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Left Column (2/3 width on desktop) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Left Top — Telemetry Chart Card */}
                    <TelemetryChart stats={dashboardStats} />

                    {/* Left Bottom — Active Monitors Table */}
                    <MonitorsTable
                      monitors={monitors}
                      onSelectMonitor={handleSelectMonitor}
                      onTogglePause={handleTogglePause}
                      onDeleteMonitor={handleDeleteMonitor}
                      onPingMonitor={handlePingMonitor}
                      pingingId={pingingId}
                    />
                  </div>

                  {/* Right Sidebar — Notifications & Alerts Panel (1/3 width on desktop) */}
                  <div className="lg:col-span-1 space-y-6">
                    <AlertsSidebar
                      onSendDiscordTest={handleDiscordTest}
                      downMonitors={monitors.filter((m) => m.status === 'DOWN')}
                      onOpenMonitor={handleSelectMonitor}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Monitors Dedicated View */}
            {activeTab === 'monitors' && (
              <MonitorsView
                monitors={monitors}
                onOpenCreateModal={() => setIsCreateModalOpen(true)}
                onSelectMonitor={handleSelectMonitor}
                onTogglePause={handleTogglePause}
                onDeleteMonitor={handleDeleteMonitor}
                onPingMonitor={handlePingMonitor}
                pingingId={pingingId}
              />
            )}

            {/* Tab 3: Alerts & Incidents Dedicated View */}
            {activeTab === 'alerts' && (
              <AlertsView
                monitors={monitors}
                incidents={incidents}
                onOpenMonitor={handleSelectMonitor}
                onSendDiscordTest={handleDiscordTest}
              />
            )}

            {/* Tab 4: Settings Dedicated View */}
            {activeTab === 'settings' && (
              <SettingsView
                onSaveToast={() =>
                  addToast(
                    'success',
                    'Settings Saved',
                    'Probe parameters and policies persisted successfully.'
                  )
                }
                onSendDiscordTest={handleDiscordTest}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-5 bg-white/80 dark:bg-[#0B1120]/80 mt-12 transition-colors duration-250">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-300">SentinelCloud Monitoring Engine</span>
            <span>•</span>
            <span>Edge Nodes: {totalMonitors} Active Probes</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  downCount > 0 ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'
                }`}
              ></span>
              {downCount > 0 ? `${downCount} incident(s) active` : 'All systems operational'}
            </span>
            <span>
              API SLA: {(dashboardStats?.overallUptime ?? 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </footer>

      {/* Create New Monitor Modal */}
      <CreateMonitorModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateMonitor}
      />

      {/* Endpoint Detail Slide-Over Drawer */}
      <MonitorDetailDrawer
        monitor={selectedMonitor}
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        onPingNow={(id) => handlePingMonitor(id)}
        isPinging={pingingId === selectedMonitor?.id}
      />

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
