/**
 * Axios-based API service for non-streaming endpoints.
 */

import axios from 'axios';
import type { ServerStats, HealthStatus } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function getHealth(): Promise<HealthStatus> {
  const { data } = await api.get<HealthStatus>('/health');
  return data;
}

export async function getStats(): Promise<ServerStats> {
  const { data } = await api.get<ServerStats>('/stats');
  return data;
}

export async function getSessions() {
  const { data } = await api.get('/sessions');
  return data;
}

export async function deleteSession(sessionId: string) {
  const { data } = await api.delete(`/session/${sessionId}`);
  return data;
}

export default api;
