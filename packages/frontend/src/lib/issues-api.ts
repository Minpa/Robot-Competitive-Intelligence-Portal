// ARGOS Issue Tracking — 프론트 API 클라이언트 (spec §4.2).
'use client';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

function token(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

async function req<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any) };
  const t = token();
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`${API_BASE}/issues${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(e.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── 타입 ──
export type Priority = 'H' | 'M' | 'L';
export type IssueStatus = 'draft' | 'triaged' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
export type IssueType = 'task' | 'research' | 'response' | 'epic';
export type LinkRelation = 'blocks' | 'duplicates' | 'relates_to';
export type NotificationType = 'assigned' | 'mentioned' | 'status_changed' | 'overdue' | 'comment';

export interface AiSuggestedAction {
  step: string;
  rationale: string;
  estimatedEffortHours?: number;
  requiresCompetitorData?: boolean;
}

export interface IssueTicket {
  id: string;
  code: string; // ARG-NNN
  title: string;
  description: string;
  priority: Priority;
  status: IssueStatus;
  type: IssueType;
  parentTicketId: string | null;
  reporterId: string;
  ownerId: string | null;
  linkedCompetitorIds?: string[] | null;
  linkedStrategyDocIds?: string[] | null;
  linkedKeywordIds?: number[] | null;
  aiSummary?: string | null;
  aiSuggestedActions?: AiSuggestedAction[] | null;
  aiEnrichedAt?: string | null;
  dueAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueComment {
  id: string;
  body: string;
  mentionedUserIds?: string[] | null;
  isAiGenerated: boolean;
  createdAt: string;
  editedAt?: string | null;
  authorId: string;
  authorEmail?: string | null;
}

export interface IssueActivity {
  id: string;
  ticketId: string;
  actorId: string | null;
  actionType: string;
  payload: any;
  at: string;
}

export interface IssueLink {
  id: string;
  direction: 'outgoing' | 'incoming';
  relation: LinkRelation;
  createdBy: string;
  createdAt: string;
  otherTicket?: { id: string; code: string; title: string; status: IssueStatus };
}

export interface IssueChild { id: string; code: string; title: string; status: IssueStatus; }

export interface IssueTicketDetail extends IssueTicket {
  reporter: { id: string; email: string } | null;
  owner: { id: string; email: string } | null;
  parent: { code: string; title: string } | null;
  comments: IssueComment[];
  activity: IssueActivity[];
  links: IssueLink[];
  children: IssueChild[];
}

export interface IssueNotification {
  id: string;
  recipientId: string;
  ticketId: string | null;
  type: NotificationType;
  payload: any;
  readAt: string | null;
  createdAt: string;
}

export interface DashboardOverview {
  summary: {
    open: number;
    inProgress: number;
    blocked: number;
    overdue: number;
    doneThisWeek: number;
  };
  cards: IssueTicket[];
}

// ── /ask 응답 ──
export interface AskLookupAnswer {
  summary: string;
  competitors: Array<{ id: string; name: string; country: string }>;
  robots?: Array<{
    id: string; name: string; companyName: string | null;
    announcementYear: number | null; announcementQuarter: number | null;
    status: string | null; purpose: string | null; stage: string | null;
    dataType: string | null; description: string | null;
  }>;
  products?: Array<{
    id: string; name: string; type: string;
    companyId: string | null; companyName: string | null;
    releaseDate: string | null; status: string | null;
  }>;
  recentArticles: Array<{
    id: string; title: string; source: string; url: string;
    publishedAt: string | null;
  }>;
  relatedTickets: Array<{ id: string; code: string; title: string; status: IssueStatus }>;
}

export interface AskDraft {
  title: string;
  description: string;
  priority: Priority;
  priorityRationale?: string;
  suggestedOwnerId: string | null;
  ownerRationale?: string;
  type_recommended: IssueType;
  linkedCompetitorIds: string[];
  linkedStrategyDocIds: string[];
  suggestedDueAt: string;
  suggestedActions: AiSuggestedAction[];
  suggested_links?: any[];
}

export interface AskResult {
  intent: 'lookup' | 'task' | 'ambiguous';
  confidence: number;
  answer?: AskLookupAnswer;
  draft?: AskDraft;
  fallback?: { action: string; label: string };
  autoCreatedTicket?: { code: string; title: string; reason: string };
  clarification?: {
    question: string;
    options: string[];
    reasoning?: string;
  };
}

// ── 티켓 생성/수정 페이로드 ──
export interface TicketCreatePayload {
  title: string;
  description?: string;
  priority?: Priority;
  type?: IssueType;
  parentTicketCode?: string;
  ownerId?: string;
  dueAt?: string;
  linkedCompetitorIds?: string[];
  linkedStrategyDocIds?: string[];
  linkedKeywordIds?: number[];
}

export interface TicketPatchPayload {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: IssueStatus;
  type?: IssueType;
  parentTicketCode?: string | null;
  ownerId?: string | null;
  dueAt?: string | null;
  linkedCompetitorIds?: string[];
  linkedStrategyDocIds?: string[];
  linkedKeywordIds?: number[];
}

export interface TicketListParams {
  status?: IssueStatus[] | string;
  priority?: Priority[] | string;
  type?: IssueType[] | string;
  reporterId?: string;
  ownerId?: string;
  parentTicketId?: string;
  competitorId?: string;
  hasOverdue?: boolean;
  createdAfter?: string;
  cursor?: string;
  limit?: number;
}

function qs(params: Record<string, any>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    sp.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const issuesApi = {
  // tickets
  listTickets: (p: TicketListParams = {}) =>
    req<{ items: IssueTicket[]; nextCursor: string | null }>(`/tickets${qs(p)}`),
  getTicket: (idOrCode: string) =>
    req<{ ticket: IssueTicketDetail }>(`/tickets/${encodeURIComponent(idOrCode)}`),
  createTicket: (b: TicketCreatePayload) =>
    req<{ ticket: IssueTicket }>(`/tickets`, { method: 'POST', body: JSON.stringify(b) }),
  patchTicket: (id: string, b: TicketPatchPayload) =>
    req<{ ticket: IssueTicket }>(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(b) }),
  enrichTicket: (id: string) =>
    req<{ ticket: IssueTicket }>(`/tickets/${id}/enrich`, { method: 'POST' }),

  // comments
  listComments: (idOrCode: string) =>
    req<{ comments: IssueComment[] }>(`/tickets/${encodeURIComponent(idOrCode)}/comments`),
  addComment: (idOrCode: string, body: string, mentionedUserIds: string[] = []) =>
    req<{ comment: IssueComment }>(`/tickets/${encodeURIComponent(idOrCode)}/comments`, {
      method: 'POST', body: JSON.stringify({ body, mentionedUserIds }),
    }),
  patchComment: (commentId: string, body: string) =>
    req<{ comment: IssueComment }>(`/comments/${commentId}`, { method: 'PATCH', body: JSON.stringify({ body }) }),

  // links
  listLinks: (idOrCode: string) =>
    req<{ links: IssueLink[] }>(`/tickets/${encodeURIComponent(idOrCode)}/links`),
  addLink: (idOrCode: string, toCode: string, relation: LinkRelation) =>
    req<{ link: any }>(`/tickets/${encodeURIComponent(idOrCode)}/links`, {
      method: 'POST', body: JSON.stringify({ toCode, relation }),
    }),
  deleteLink: (linkId: string) =>
    req<{ ok: true }>(`/links/${linkId}`, { method: 'DELETE' }),

  // children
  listChildren: (idOrCode: string) =>
    req<{ children: IssueChild[] }>(`/tickets/${encodeURIComponent(idOrCode)}/children`),

  // dashboard
  overview: () => req<DashboardOverview>('/dashboard/overview'),
  inbox: () => req<{ items: IssueTicket[] }>('/dashboard/inbox'),

  // notifications
  listNotifications: () =>
    req<{ notifications: IssueNotification[] }>('/notifications'),
  markRead: (id: string) =>
    req<{ ok: true }>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () =>
    req<{ ok: true }>('/notifications/mark-all-read', { method: 'POST' }),

  // search
  search: (q: string) =>
    req<{ items: IssueTicket[] }>(`/search?q=${encodeURIComponent(q)}`),

  // ask
  ask: (query: string, opts?: { skipClarification?: boolean }) =>
    req<AskResult>('/ask', { method: 'POST', body: JSON.stringify({ query, skipClarification: opts?.skipClarification ?? false }) }),
  askHistory: () =>
    req<{ items: AskHistoryItem[] }>('/ask/history'),
  deleteAskHistoryItem: (id: string) =>
    req<{ ok: true }>(`/ask/history/${id}`, { method: 'DELETE' }),
  clearAskHistory: () =>
    req<{ ok: true }>('/ask/history', { method: 'DELETE' }),
};

export interface AskHistoryItem {
  id: string;
  query: string;
  intent: 'lookup' | 'task' | 'ambiguous' | null;
  confidence: number | null; // 0~100
  hitCount: number;
  autoCreatedTicketCode: string | null;
  at: string;
}

// ── 유틸 (공용 표시 라벨/색) ──
export const STATUS_LABEL: Record<IssueStatus, string> = {
  draft: '초안', triaged: '분류됨', in_progress: '진행중',
  blocked: '차단됨', done: '완료', cancelled: '취소',
};

export const STATUS_COLOR: Record<IssueStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  triaged: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  blocked: 'bg-red-100 text-red-800',
  done: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500 line-through',
};

export const PRIORITY_LABEL: Record<Priority, string> = { H: '높음', M: '중간', L: '낮음' };
export const PRIORITY_COLOR: Record<Priority, string> = {
  H: 'bg-red-100 text-red-800',
  M: 'bg-amber-100 text-amber-800',
  L: 'bg-slate-100 text-slate-700',
};

export const TYPE_LABEL: Record<IssueType, string> = {
  task: '실행', research: '조사', response: '대응', epic: 'Epic',
};
export const TYPE_COLOR: Record<IssueType, string> = {
  task: 'bg-indigo-100 text-indigo-800',
  research: 'bg-purple-100 text-purple-800',
  response: 'bg-pink-100 text-pink-800',
  epic: 'bg-emerald-100 text-emerald-800',
};

export const LINK_LABEL: Record<LinkRelation, string> = {
  blocks: '차단함', duplicates: '중복', relates_to: '관련',
};
