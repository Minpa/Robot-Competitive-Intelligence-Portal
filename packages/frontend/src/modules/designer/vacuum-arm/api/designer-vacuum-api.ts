/**
 * ARGOS-Designer · vacuum-arm API client (Phase 1 PoC v1.2)
 *
 * Microservice boundary: vacuum-arm UI talks to /api/designer/vacuum-arm
 * through THIS file only.
 */

import type {
  ActuatorSpec,
  EndEffectorSpec,
  EndEffectorListResponse,
  EndEffectorType,
} from '../types/product';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE = RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL}/api`;

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/designer/vacuum-arm${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`vacuum-arm-api ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface ActuatorListResponse {
  actuators: ActuatorSpec[];
  isMock: true;
  generatedAt: string;
}

export const designerVacuumApi = {
  listActuators(filter?: { type?: ActuatorSpec['type']; minTorque?: number; maxWeight?: number }): Promise<ActuatorListResponse> {
    const qs = new URLSearchParams();
    if (filter?.type) qs.set('type', filter.type);
    if (filter?.minTorque !== undefined) qs.set('min_torque', String(filter.minTorque));
    if (filter?.maxWeight !== undefined) qs.set('max_weight', String(filter.maxWeight));
    const q = qs.toString();
    return fetchJson<ActuatorListResponse>(`/actuators${q ? `?${q}` : ''}`);
  },

  listEndEffectors(filter?: { type?: EndEffectorType; minPayloadKg?: number }): Promise<EndEffectorListResponse> {
    const qs = new URLSearchParams();
    if (filter?.type) qs.set('type', filter.type);
    if (filter?.minPayloadKg !== undefined) qs.set('min_payload', String(filter.minPayloadKg));
    const q = qs.toString();
    return fetchJson<EndEffectorListResponse>(`/end-effectors${q ? `?${q}` : ''}`);
  },

  getEndEffector(sku: string): Promise<{ endEffector: EndEffectorSpec; isMock: true }> {
    return fetchJson(`/end-effectors/${encodeURIComponent(sku)}`);
  },
};
