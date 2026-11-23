import {
  CreateMonitorPayload,
  DashboardStats,
  DiscordTestResponse,
  IncidentRecord,
  Monitor,
  MonitorHistory,
} from '../types/monitor';

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'
).replace(/\/+$/, '');

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errBody = await response.json();
      if (errBody?.detail) {
        errorDetail =
          typeof errBody.detail === 'string'
            ? errBody.detail
            : JSON.stringify(errBody.detail);
      }
    } catch {
      // Ignore JSON parse failure and use status text
    }
    throw new Error(errorDetail);
  }
  return response.json() as Promise<T>;
}

/**
 * GET /api/monitors
 */
export async function fetchMonitors(): Promise<Monitor[]> {
  const response = await fetch(`${API_BASE_URL}/monitors`);
  return handleResponse<Monitor[]>(response);
}

/**
 * POST /api/monitors
 */
export async function createMonitor(payload: CreateMonitorPayload): Promise<Monitor> {
  const response = await fetch(`${API_BASE_URL}/monitors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Monitor>(response);
}

/**
 * DELETE /api/monitors/{id}
 */
export async function deleteMonitor(id: string): Promise<{ deleted: boolean; id: string }> {
  const response = await fetch(`${API_BASE_URL}/monitors/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleResponse<{ deleted: boolean; id: string }>(response);
}

/**
 * POST /api/monitors/{id}/check
 */
export async function checkMonitorNow(id: string): Promise<Monitor> {
  const response = await fetch(`${API_BASE_URL}/monitors/${encodeURIComponent(id)}/check`, {
    method: 'POST',
  });
  return handleResponse<Monitor>(response);
}

/**
 * PATCH /api/monitors/{id}/pause
 */
export async function togglePauseMonitor(id: string): Promise<Monitor> {
  const response = await fetch(`${API_BASE_URL}/monitors/${encodeURIComponent(id)}/pause`, {
    method: 'PATCH',
  });
  return handleResponse<Monitor>(response);
}

/**
 * GET /api/monitors/{id}/history
 */
export async function fetchMonitorHistory(
  id: string,
  range: '24h' | '7d' = '24h'
): Promise<MonitorHistory> {
  const response = await fetch(
    `${API_BASE_URL}/monitors/${encodeURIComponent(id)}/history?range=${range}`
  );
  return handleResponse<MonitorHistory>(response);
}

/**
 * GET /api/dashboard/stats
 */
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
  return handleResponse<DashboardStats>(response);
}

/**
 * GET /api/incidents
 */
export async function fetchIncidents(): Promise<IncidentRecord[]> {
  const response = await fetch(`${API_BASE_URL}/incidents`);
  return handleResponse<IncidentRecord[]>(response);
}

/**
 * POST /api/settings/test-discord
 */
export async function testDiscordWebhook(
  webhookUrl: string,
  threshold = 250
): Promise<DiscordTestResponse> {
  const response = await fetch(`${API_BASE_URL}/settings/test-discord`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ webhookUrl, threshold }),
  });
  return handleResponse<DiscordTestResponse>(response);
}
