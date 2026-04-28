/**
 * ARGOS-Designer · module-local API client
 *
 * Microservice boundary: the designer module talks to /api/designer through
 * THIS file only. Other parts of the frontend should not import from here.
 */

import type {
  FormFactorListResponse,
  FormFactorSummary,
  FormFactorId,
  SensorSpec,
  EvaluationRequest,
  EvaluationResult,
  ActuatorRecommendation,
  ActuatorSpec,
  CoachingResponse,
} from '../types/robot.js';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE = RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL}/api`;

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/designer${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`designer-api ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const designerApi = {
  // REQ-1
  listFormFactors(): Promise<FormFactorListResponse> {
    return fetchJson<FormFactorListResponse>('/form-factors');
  },
  getFormFactor(id: FormFactorId): Promise<{ formFactor: FormFactorSummary; isMock: true }> {
    return fetchJson(`/form-factors/${id}`);
  },
  // REQ-2
  listSensors(): Promise<{ sensors: SensorSpec[]; isMock: true }> {
    return fetchJson('/sensors');
  },
  // REQ-3 + REQ-4
  evaluate(payload: EvaluationRequest): Promise<EvaluationResult> {
    return fetchJson('/evaluate', { method: 'POST', body: JSON.stringify(payload) });
  },
  // REQ-5
  listActuators(): Promise<{ actuators: ActuatorSpec[]; isMock: true }> {
    return fetchJson('/actuators');
  },
  recommendActuators(payload: EvaluationRequest & { topN?: number; safetyFactor?: number }): Promise<{
    recommendations: ActuatorRecommendation[];
    evaluation: EvaluationResult;
    isMock: true;
  }> {
    return fetchJson('/actuators/recommend', { method: 'POST', body: JSON.stringify(payload) });
  },
  // REQ-6
  coach(payload: EvaluationRequest & { language?: string }): Promise<{
    coaching: CoachingResponse;
    evaluation: EvaluationResult;
    isMock: true;
  }> {
    return fetchJson('/coach', { method: 'POST', body: JSON.stringify(payload) });
  },
};
