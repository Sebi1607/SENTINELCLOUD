export type MonitorStatus = 'UP' | 'DOWN' | 'PAUSED';

export type HttpMethod = 'GET' | 'POST' | 'HEAD' | 'PUT';

export interface SslInfo {
  valid: boolean;
  issuer: string;
  expiresDays: number;
  protocol: string;
}

export interface UptimeTick {
  hour: string;
  status: 'UP' | 'DOWN';
  latency: number | null;
}

export interface IncidentRecord {
  id: string;
  timestamp: string;
  type: 'OUTAGE' | 'DEGRADED' | 'SSL_WARNING' | 'RESOLVED';
  statusCode: number | null;
  reason: string;
  duration: string;
  resolved: boolean;
  monitorId?: string;
  monitorName?: string;
  monitorUrl?: string;
}

export interface RegionLatency {
  region: string;
  regionName: string;
  flag: string;
  latency: number | null;
  status: 'UP' | 'DOWN';
}

export interface Monitor {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  status: MonitorStatus;
  latency: number | null; // ms, null if down
  interval: '30s' | '1m' | '5m';
  latencyThreshold: number; // ms
  uptimePercentage: number; // 0-100
  uptimeHistory24h: UptimeTick[]; // 24 micro-bars for 24 hours
  sslStatus: SslInfo;
  httpStatusCode: number | null;
  lastChecked: string;
  region: string;
  alertChannels: {
    email: boolean;
    discord: boolean;
    slack?: boolean;
  };
  incidents: IncidentRecord[];
  regionLatencies: RegionLatency[];
}

export interface TelemetryPoint {
  time: string;
  latency: number;
  isSpike?: boolean;
  p95?: number;
  status: 'UP' | 'DOWN';
  annotation?: string;
}

export interface KPIStats {
  totalMonitors: number;
  operational: number;
  down: number;
  avgLatency: number;
}

export interface DashboardStats extends KPIStats {
  paused?: number;
  overallUptime?: number;
  p95Latency?: number;
  p99Latency?: number;
  median24hLatency?: number;
  max24hLatency?: number;
  telemetry24h?: TelemetryPoint[];
  telemetry7d?: TelemetryPoint[];
}

export interface CreateMonitorPayload {
  name: string;
  url: string;
  method: HttpMethod;
  interval: '30s' | '1m' | '5m';
  latencyThreshold: number;
  region: string;
  alertChannels: {
    email: boolean;
    discord: boolean;
    slack?: boolean;
  };
}

export interface MonitorHistory {
  monitorId: string;
  range: '24h' | '7d';
  uptimePercentage: number;
  uptimeHistory24h: UptimeTick[];
  telemetry: TelemetryPoint[];
}

export interface DiscordTestResponse {
  success: boolean;
  channel: string;
  webhookUrl: string;
  threshold: number;
  message: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: string;
}

export type ActiveNavTab = 'dashboard' | 'monitors' | 'alerts' | 'settings';
