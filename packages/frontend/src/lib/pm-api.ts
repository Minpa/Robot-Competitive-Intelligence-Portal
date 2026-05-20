// ARGOS Projects — 프론트 API 클라이언트. ARGOS 인증 토큰(localStorage) 재사용.
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
  const res = await fetch(`${API_BASE}/pm${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(e.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── 타입 ──
export type ColumnType =
  | 'text' | 'long_text' | 'status' | 'priority' | 'person' | 'date' | 'timeline'
  | 'number' | 'dropdown' | 'checkbox' | 'progress' | 'dependency' | 'link' | 'reliability';

export interface PmProject { id: number; name: string; code?: string | null; description?: string | null; status: string; color?: string | null; ownerUserId?: string | null; updatedAt: string; }
export interface PmMember { id: number; projectId: number; userId: string; role: 'owner' | 'editor' | 'viewer'; }
export interface PmBoard { id: number; projectId: number; name: string; description?: string | null; reportCycle?: string | null; orderIndex: number; }
export interface PmGroup { id: number; boardId: number; name: string; color?: string | null; orderIndex: number; collapsed: boolean; }
export interface PmColumn { id: number; boardId: number; name: string; type: ColumnType; settings?: any; orderIndex: number; width: number; }
export interface PmItem { id: number; boardId: number; groupId: number; parentItemId?: number | null; name: string; orderIndex: number; }
export interface PmCell { itemId: number; columnId: number; value: any; }
export interface PmView { id: number; boardId: number; name: string; type: 'table' | 'timeline' | 'kanban' | 'calendar'; config: any; isDefault: boolean; scope: string; }
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';
export interface PmDependency { id: number; boardId: number; predecessorItemId: number; successorItemId: number; type: DependencyType; lagDays: number; }
export interface BoardData { board: PmBoard; groups: PmGroup[]; columns: PmColumn[]; items: PmItem[]; cells: PmCell[]; views: PmView[]; dependencies: PmDependency[]; }

export const pmApi = {
  // projects
  listProjects: () => req<{ projects: PmProject[] }>('/projects'),
  createProject: (b: Partial<PmProject>) => req<{ project: PmProject }>('/projects', { method: 'POST', body: JSON.stringify(b) }),
  getProject: (id: number) => req<{ project: PmProject; boards: PmBoard[] }>(`/projects/${id}`),
  updateProject: (id: number, b: Partial<PmProject>) => req<{ project: PmProject }>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteProject: (id: number) => req<{ ok: true }>(`/projects/${id}`, { method: 'DELETE' }),
  // members
  listMembers: (pid: number) => req<{ members: PmMember[] }>(`/projects/${pid}/members`),
  addMember: (pid: number, userId: string, role: string) => req<{ member: PmMember }>(`/projects/${pid}/members`, { method: 'POST', body: JSON.stringify({ userId, role }) }),
  updateMember: (id: number, role: string) => req<{ member: PmMember }>(`/members/${id}`, { method: 'PUT', body: JSON.stringify({ role }) }),
  removeMember: (id: number) => req<{ ok: true }>(`/members/${id}`, { method: 'DELETE' }),
  // boards
  createBoard: (pid: number, b: Partial<PmBoard>) => req<{ board: PmBoard }>(`/projects/${pid}/boards`, { method: 'POST', body: JSON.stringify(b) }),
  getBoard: (id: number) => req<{ board: PmBoard }>(`/boards/${id}`),
  getBoardData: (id: number) => req<BoardData>(`/boards/${id}/data`),
  updateBoard: (id: number, b: Partial<PmBoard>) => req<{ board: PmBoard }>(`/boards/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteBoard: (id: number) => req<{ ok: true }>(`/boards/${id}`, { method: 'DELETE' }),
  // groups
  createGroup: (bid: number, b: Partial<PmGroup>) => req<{ group: PmGroup }>(`/boards/${bid}/groups`, { method: 'POST', body: JSON.stringify(b) }),
  updateGroup: (id: number, b: Partial<PmGroup>) => req<{ group: PmGroup }>(`/groups/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteGroup: (id: number) => req<{ ok: true }>(`/groups/${id}`, { method: 'DELETE' }),
  // columns
  createColumn: (bid: number, b: Partial<PmColumn>) => req<{ column: PmColumn }>(`/boards/${bid}/columns`, { method: 'POST', body: JSON.stringify(b) }),
  updateColumn: (id: number, b: Partial<PmColumn>) => req<{ column: PmColumn }>(`/columns/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteColumn: (id: number) => req<{ ok: true }>(`/columns/${id}`, { method: 'DELETE' }),
  // items
  createItem: (gid: number, b: Partial<PmItem>) => req<{ item: PmItem }>(`/groups/${gid}/items`, { method: 'POST', body: JSON.stringify(b) }),
  getItem: (id: number) => req<{ item: PmItem; cells: PmCell[]; subitems: PmItem[] }>(`/items/${id}`),
  updateItem: (id: number, b: Partial<PmItem>) => req<{ item: PmItem }>(`/items/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteItem: (id: number) => req<{ ok: true }>(`/items/${id}`, { method: 'DELETE' }),
  // cells
  setCell: (itemId: number, columnId: number, value: any) => req<{ ok: true }>(`/items/${itemId}/cells/${columnId}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  bulkCells: (itemId: number, cells: Array<{ itemId: number; columnId: number; value: any }>) => req<{ ok: true; count: number }>(`/items/${itemId}/cells/bulk`, { method: 'POST', body: JSON.stringify({ cells }) }),
  // reorder
  reorderItems: (bid: number, order: Array<{ id: number; groupId: number; orderIndex: number }>) => req<{ ok: true }>(`/boards/${bid}/items/reorder`, { method: 'PUT', body: JSON.stringify({ order }) }),
  reorderColumns: (bid: number, order: Array<{ id: number; orderIndex: number }>) => req<{ ok: true }>(`/boards/${bid}/columns/reorder`, { method: 'PUT', body: JSON.stringify({ order }) }),
  // updates / activity / search
  listUpdates: (itemId: number) => req<{ updates: any[] }>(`/items/${itemId}/updates`),
  addUpdate: (itemId: number, body: string) => req<{ update: any }>(`/items/${itemId}/updates`, { method: 'POST', body: JSON.stringify({ body }) }),
  // dependencies (Gantt 의존선)
  createDependency: (bid: number, b: { predecessorItemId: number; successorItemId: number; type?: DependencyType; lagDays?: number }) =>
    req<{ dependency: PmDependency }>(`/boards/${bid}/dependencies`, { method: 'POST', body: JSON.stringify(b) }),
  deleteDependency: (id: number) => req<{ ok: true }>(`/dependencies/${id}`, { method: 'DELETE' }),
  listViews: (bid: number) => req<{ views: PmView[] }>(`/boards/${bid}/views`),
  createView: (bid: number, b: Partial<PmView>) => req<{ view: PmView }>(`/boards/${bid}/views`, { method: 'POST', body: JSON.stringify(b) }),
  updateView: (id: number, b: Partial<PmView>) => req<{ view: PmView }>(`/views/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteView: (id: number) => req<{ ok: true }>(`/views/${id}`, { method: 'DELETE' }),
  activity: (pid: number) => req<{ activity: any[] }>(`/projects/${pid}/activity`),
  search: (q: string) => req<{ projects: PmProject[]; boards: PmBoard[]; items: any[] }>(`/search?q=${encodeURIComponent(q)}`),
  // templates
  listTemplates: () => req<{ templates: Array<{ id: number; name: string; description?: string | null; category?: string | null; isSystem: boolean }> }>('/templates'),
  createFromTemplate: (templateId: number, name: string, description?: string) =>
    req<{ project: PmProject }>('/projects/from-template', { method: 'POST', body: JSON.stringify({ templateId, name, description }) }),
  // export — returns blob
  async exportBoard(bid: number, opts: any): Promise<{ blob: Blob; filename: string; meta: any }> {
    const t = token();
    const res = await fetch(`${API_BASE}/pm/boards/${bid}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
      body: JSON.stringify(opts),
    });
    if (!res.ok) throw new Error(`Export 실패 (HTTP ${res.status})`);
    const cd = res.headers.get('Content-Disposition') || '';
    const m = cd.match(/filename="?([^"]+)"?/);
    const filename = m ? decodeURIComponent(m[1]) : `export_${bid}.pptx`;
    let meta: any = {};
    try { meta = JSON.parse(res.headers.get('X-PM-Export-Meta') || '{}'); } catch {}
    return { blob: await res.blob(), filename, meta };
  },
};
