/**
 * ARGOS_I 요청 관리자 API 타입 (백엔드 routes/argos-i.ts 의 /api/admin/argos-i/requests* 응답).
 * payload_hash·멱등 해시·거부된 본문은 어떤 응답에도 없다. note 는 관리자 목록에만 있다.
 */

export type ArgosIRequestStatus = 'queued' | 'needs_approval' | 'running' | 'done' | 'failed' | 'rejected' | 'cancelled' | 'unsupported';

export type ArgosIApprovalState = 'not_required' | 'pending' | 'approved' | 'rejected' | 'expired';

export interface ArgosIAdminRequestItem {
  id: string;
  type: string;
  status: ArgosIRequestStatus;
  params: Record<string, unknown>;
  errorCode: string | null;
  approval: { required: boolean; state: ArgosIApprovalState };
  createdAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  hasResult: boolean;
  /** 관리자 전용 자유 텍스트 — 평문으로만 표시한다 */
  note: string | null;
  approvalReason: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  attempts: number;
  costUsd: number;
  costProvider: string | null;
}

export interface ArgosIAdminRequestsResponse {
  items: ArgosIAdminRequestItem[];
  count: number;
}

export interface ArgosIRequestsStats {
  enabled: boolean;
  tokenConfigured: boolean;
  today: { date: string; costUsd: number; analyzeCount: number; budgetUsd: number; maxAnalyze: number };
  statusCounts: Record<string, number>;
  queueLength: number;
  rejects7d: Array<{ reasonCode: string; count: number }>;
  rejectTotal7d: number;
  suspended: boolean;
  suspendedSince: string | null;
  lastRun: { finishedAt: string | null; outcome: string | null; processed: number | null } | null;
}
