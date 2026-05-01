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
  ProductConfig,
  AnalyzeResponse,
  FurnitureSpec,
  ObstacleSpec,
  TargetObjectSpec,
  RoomPresetSpec,
  ScenarioSpec,
  RoomConfig,
  ReviewResult,
  SpecSheetPayload,
  SpecSheetRevisionEntry,
  ReviewIssue,
  ArmAnalysisResult,
  StabilityResult,
  EnvironmentResult,
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

  // REQ-4 + REQ-7 (room optional)
  analyze(product: ProductConfig, payloadKg: number, room?: RoomConfig): Promise<AnalyzeResponse> {
    return fetchJson('/analyze/', {
      method: 'POST',
      body: JSON.stringify({ product, payloadKg, ...(room ? { room } : {}) }),
    });
  },

  // REQ-6
  listFurniture(): Promise<{ furniture: FurnitureSpec[]; isMock: true }> {
    return fetchJson('/furniture');
  },
  listObstacles(): Promise<{ obstacles: ObstacleSpec[]; isMock: true }> {
    return fetchJson('/obstacles');
  },
  listTargetObjects(): Promise<{ targetObjects: TargetObjectSpec[]; isMock: true }> {
    return fetchJson('/target-objects');
  },
  listRoomPresets(): Promise<{ roomPresets: RoomPresetSpec[]; isMock: true }> {
    return fetchJson('/room-presets');
  },
  listScenarios(): Promise<{ scenarios: ScenarioSpec[]; isMock: true }> {
    return fetchJson('/scenarios');
  },

  // REQ-10 — engineering review (Claude API + heuristic fallback in backend)
  review(
    product: ProductConfig,
    payloadKg: number,
    analysis: AnalyzeResponse,
    room?: RoomConfig | null
  ): Promise<ReviewResult> {
    return fetchJson<ReviewResult>('/review/', {
      method: 'POST',
      body: JSON.stringify({
        product,
        payloadKg,
        room: room ?? null,
        analysis: {
          arms: analysis.arms.map((a) => ({
            armIndex: a.armIndex,
            statics: a.statics,
            payloadCurve: a.payloadCurve,
            endEffectorMaxPayloadKg: a.endEffectorMaxPayloadKg,
            endEffectorPayloadOverLimit: a.endEffectorPayloadOverLimit,
          })),
          stability: analysis.stability,
          environment: analysis.environment,
        },
      }),
    });
  },

  // REQ-10 Phase B — assemble PDF spec sheet payload
  specSheet(input: {
    product: ProductConfig;
    payloadKg: number;
    room?: RoomConfig | null;
    analysis: AnalyzeResponse;
    candidateName: string;
    authorName?: string;
    revisions?: SpecSheetRevisionEntry[];
    review?: ReviewResult;
  }): Promise<SpecSheetPayload> {
    return fetchJson<SpecSheetPayload>('/spec-sheet/', {
      method: 'POST',
      body: JSON.stringify({
        product: input.product,
        payloadKg: input.payloadKg,
        room: input.room ?? null,
        candidateName: input.candidateName,
        authorName: input.authorName ?? '민파',
        revisions: input.revisions ?? [],
        review: input.review,
        analysis: {
          arms: input.analysis.arms.map((a) => ({
            armIndex: a.armIndex,
            statics: a.statics,
            payloadCurve: a.payloadCurve,
            endEffectorMaxPayloadKg: a.endEffectorMaxPayloadKg,
            endEffectorPayloadOverLimit: a.endEffectorPayloadOverLimit,
          })),
          stability: input.analysis.stability,
          environment: input.analysis.environment,
        },
      }),
    });
  },
};
