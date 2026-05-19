// ARGOS Projects — 핵심 서비스: 보드 1회 조립, 셀 검증, RBAC, 활동 로그.
import { db } from '../db/index.js';
import {
  pmProjects, pmMemberships, pmBoards, pmGroups, pmColumns,
  pmItems, pmCells, pmViews, pmActivityLog, pmDependencies,
} from '../db/schema.js';
import { and, asc, eq, inArray } from 'drizzle-orm';

export type PmRole = 'owner' | 'editor' | 'viewer';

// ARGOS 전역 admin 은 전 프로젝트 owner 권한. 그 외는 멤버십 role.
export async function getUserProjectRole(
  projectId: number,
  userId: string,
  globalRole?: string,
): Promise<PmRole | null> {
  if (globalRole === 'admin') return 'owner';
  const rows = await db
    .select()
    .from(pmMemberships)
    .where(and(eq(pmMemberships.projectId, projectId), eq(pmMemberships.userId, userId)))
    .limit(1);
  return (rows[0]?.role as PmRole) || null;
}

const ROLE_RANK: Record<PmRole, number> = { viewer: 1, editor: 2, owner: 3 };
export function roleAtLeast(role: PmRole | null, min: PmRole): boolean {
  return !!role && ROLE_RANK[role] >= ROLE_RANK[min];
}

// boardId → projectId 역추적 (멤버십 검사용).
export async function projectIdOfBoard(boardId: number): Promise<number | null> {
  const r = await db.select({ pid: pmBoards.projectId }).from(pmBoards).where(eq(pmBoards.id, boardId)).limit(1);
  return r[0]?.pid ?? null;
}
export async function projectIdOfGroup(groupId: number): Promise<number | null> {
  const g = await db.select({ bid: pmGroups.boardId }).from(pmGroups).where(eq(pmGroups.id, groupId)).limit(1);
  return g[0] ? projectIdOfBoard(g[0].bid) : null;
}
export async function projectIdOfColumn(columnId: number): Promise<number | null> {
  const c = await db.select({ bid: pmColumns.boardId }).from(pmColumns).where(eq(pmColumns.id, columnId)).limit(1);
  return c[0] ? projectIdOfBoard(c[0].bid) : null;
}
export async function projectIdOfItem(itemId: number): Promise<number | null> {
  const i = await db.select({ bid: pmItems.boardId }).from(pmItems).where(eq(pmItems.id, itemId)).limit(1);
  return i[0] ? projectIdOfBoard(i[0].bid) : null;
}
export async function projectIdOfView(viewId: number): Promise<number | null> {
  const v = await db.select({ bid: pmViews.boardId }).from(pmViews).where(eq(pmViews.id, viewId)).limit(1);
  return v[0] ? projectIdOfBoard(v[0].bid) : null;
}

// ── 셀 value JSONB 타입 스키마 검증 (백엔드 강제) ──
const isStr = (v: unknown) => typeof v === 'string';
const isNum = (v: unknown) => typeof v === 'number' && !Number.isNaN(v);
const isIntArr = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === 'number');

export function validateCellValue(columnType: string, value: any): string | null {
  if (value == null || typeof value !== 'object') return 'value must be an object';
  switch (columnType) {
    case 'text':
    case 'long_text':
      return isStr(value.text) || value.text == null ? null : 'text expects {text:string}';
    case 'status':
    case 'priority':
      return value.label_id == null || isNum(value.label_id) ? null : 'expects {label_id:number}';
    case 'person':
      return value.user_ids == null || Array.isArray(value.user_ids) ? null : 'expects {user_ids:[]}';
    case 'date':
      return value.date == null || isStr(value.date) ? null : 'expects {date:"YYYY-MM-DD"}';
    case 'timeline':
      if (value.start == null && value.end == null) return null;
      return isStr(value.start) && isStr(value.end) ? null : 'expects {start,end}';
    case 'number':
      return value.number == null || isNum(value.number) ? null : 'expects {number}';
    case 'dropdown':
      return value.option_ids == null || isIntArr(value.option_ids) ? null : 'expects {option_ids:[]}';
    case 'checkbox':
      return value.checked == null || typeof value.checked === 'boolean' ? null : 'expects {checked:bool}';
    case 'progress':
      return value.percent == null || isNum(value.percent) ? null : 'expects {percent}';
    case 'dependency':
      return value.item_ids == null || isIntArr(value.item_ids) ? null : 'expects {item_ids:[]}';
    case 'link':
      return value.url == null || isStr(value.url) ? null : 'expects {url,text}';
    case 'reliability':
      return value.grade == null || isStr(value.grade) ? null : 'expects {grade:"A".."F"}';
    default:
      return null; // unknown/plugin types pass through
  }
}

// ── 보드 1회 조립: /boards/:id/data 단일 소스 ──
export async function assembleBoardData(boardId: number) {
  const [board] = await db.select().from(pmBoards).where(eq(pmBoards.id, boardId)).limit(1);
  if (!board) return null;
  const groups = await db.select().from(pmGroups)
    .where(eq(pmGroups.boardId, boardId)).orderBy(asc(pmGroups.orderIndex));
  const columns = await db.select().from(pmColumns)
    .where(eq(pmColumns.boardId, boardId)).orderBy(asc(pmColumns.orderIndex));
  const items = await db.select().from(pmItems)
    .where(eq(pmItems.boardId, boardId)).orderBy(asc(pmItems.orderIndex));
  const itemIds = items.map((i) => i.id);
  const cells = itemIds.length
    ? await db.select().from(pmCells).where(inArray(pmCells.itemId, itemIds))
    : [];
  const views = await db.select().from(pmViews).where(eq(pmViews.boardId, boardId));
  const dependencies = await db.select().from(pmDependencies).where(eq(pmDependencies.boardId, boardId));
  return { board, groups, columns, items, cells, views, dependencies };
}

export async function logActivity(entry: {
  projectId?: number | null;
  boardId?: number | null;
  itemId?: number | null;
  userId?: string | null;
  action: string;
  entityType: string;
  diff?: Record<string, unknown>;
}) {
  try {
    await db.insert(pmActivityLog).values({
      projectId: entry.projectId ?? null,
      boardId: entry.boardId ?? null,
      itemId: entry.itemId ?? null,
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      diff: entry.diff ?? {},
    });
  } catch {
    /* 로그 실패가 본 작업을 막지 않음 */
  }
}

export { pmProjects, pmMemberships, pmBoards, pmGroups, pmColumns, pmItems, pmCells, pmViews, pmActivityLog, pmDependencies };
