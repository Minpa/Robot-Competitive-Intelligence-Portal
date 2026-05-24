# ARGOS Issue Tracking Module — Implementation Spec (TS edition)

> **For Claude Code agents working on this codebase.**
> Read this end-to-end before touching code. Implementation phases (§11) define what to build in what order. Don't skip ahead — MVP first.
>
> **Stack note**: this spec is written against the actual repo stack — TypeScript / Fastify / Drizzle ORM / Next.js 14 App Router. An earlier Python/FastAPI/Vite draft existed in conversation history; this document supersedes it. When the two disagree, this document wins.

---

## 0. How to Use This Document

### 0.1 Document role

Single source of truth for the Issue Tracking Module. Update this file alongside code changes. When uncertain, this document wins over assumptions.

### 0.2 Reading order

1. §1 Context → why this exists
2. §2 Architecture → how it fits the repo
3. **§6.0 Unified Ask Entry → the differentiator; read this before anything else in §6**
4. §11 Implementation Phases → what to build now
5. §3–§9 → detailed specs for current phase (note: ask-first means §7.2 / §7.3 / §7.4 are all MVP)
6. §17 Working Guide → operational rules

### 0.3 When working

- **Phase boundary**: never implement v1.0 features during MVP. Mark them as `TODO(v1)` instead.
- **Stuck**: stop and ask the user, don't guess on product decisions.
- **Naming**: follow §A.3 conventions strictly. LG context expects specific Korean terminology.
- **Commits**: one logical change per commit. Reference phase + module: `feat(mvp/issues-tickets): add ticket CRUD endpoints`.
- **Push after every commit** (per user standing preference).

---

## 1. Project Context

### 1.1 What this repo is

`Robot-Competitive-Intelligence-Portal` — internal "War Room" portal hosted on Railway (production: `robot-info-personal.up.railway.app` / API: `robot-info-api.up.railway.app`).

Monorepo layout:

```
packages/
├── backend/        TypeScript + Fastify + Drizzle ORM + PostgreSQL
├── frontend/       Next.js 14 (App Router) + TanStack Query + Zustand + Tailwind
├── crawler/        Node-based article crawler
├── nlp-engine/     Python ML (separate process)
└── shared/         shared TS types
```

Existing user-facing modules (routes under `packages/frontend/src/app/`):

- `companies/`, `humanoid-robots/`, `application-cases/`, `components/` — competitor & product DB
- `cloid-simulator/`, `executive/`, `war-room/`, `business-strategy/` — analysis & decision tooling
- `event-calendar/`, `compliance/`, `regulatory-documents/` — operational tracking
- `boards/` (PM module — Monday-like) — recent work, lives under `pm_*` schema prefix
- `argos-designer/` — robotic system designer (separate sub-module under `src/modules/designer/`)

Tooling already wired:
- Auth: `@fastify/jwt`, users table (UUID, `role ∈ {admin, analyst, viewer}`)
- AI: `@anthropic-ai/sdk` in both backend and frontend deps
- Multipart: `@fastify/multipart`
- DB migrations: `drizzle-kit generate` / `tsx src/db/migrate.ts`

### 1.2 What this module adds

A **context-aware issue tracking system** built natively, not bolted on. Differentiation from Linear / Jira / GitHub Issues:

> When a user files a ticket, the ticket arrives at the assignee's inbox already enriched with relevant ARGOS context (linked competitors, related strategy material, suggested actions). The system is not a blank ticket queue — it is a contextual workflow.

### 1.3 Users (flat — no personas, no role gates)

**Every authenticated user has full access to every screen, every ticket, and every action in this module.** No role-based gating, no persona-specific dashboards-as-permission-walls, no field redaction.

This matches the rest of the portal as it actually behaves today: most existing routes ([companies](packages/backend/src/routes/companies.ts), [boards](packages/backend/src/routes/pm.ts), [cloid-simulator](packages/backend/src/routes/cloid-simulator.ts), …) require only `authMiddleware` (logged-in user), with `requireRole('admin')` reserved for a small number of write endpoints in unrelated modules ([vision-cost](packages/backend/src/routes/vision-cost.ts), [entity-aliases](packages/backend/src/routes/entity-aliases.ts), audit-logs). This module does not add any new role gate.

The screens described in §6 (Creation / Overview / Triage / Inbox) are **task-oriented surfaces, not role-restricted areas** — anyone can open any of them. The differentiator is the *contextual workflow* (auto-enrichment, AI suggestions), not who is allowed to do what.

`users.role` column in the DB stays untouched (out of scope for this module). See §10 for the (very short) auth section.

### 1.4 Goals

| ID | Goal | Success metric |
|----|------|---------------|
| G1 | Anyone files a ticket in <30 s | Time from `+ New` click → submit |
| G2 | Tickets arrive enriched with ARGOS context | % tickets with ≥1 auto-linked competitor / strategy item |
| G3 | Status visible at a glance | Time-to-answer for "status of X" ≤ 5 s |
| G4 | No double data entry — ARGOS context auto-flows in | 0 manual lookups during creation |
| G5 | Self-hosted; no external SaaS for core data | All ticket data in shared PostgreSQL |
| G6 | Users **ask**, they don't fill forms | ≥70 % of MVP submissions enter via the unified ask box (§6.0), not the manual form |
| G7 | A question never becomes an unnecessary ticket | "조회" intent answered inline without ticket creation, with `[이슈로 발행 →]` fallback always visible |

### 1.5 Non-goals (explicit, do NOT build)

- Sprint planning, story points, velocity charts
- Time tracking / billing
- Customer-facing portal (internal only)
- Replacing email — notifications, not communication platform
- External SaaS integration as primary store (Linear/Jira can be added later as mirror, not primary)
- Generic project management — only ticket workflow (we already have a PM module for that)

---

## 2. System Architecture

### 2.1 High level

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js App (packages/frontend)                              │
│  app/companies/ app/cloid-simulator/ app/boards/ ...          │
│  app/issues/      ← NEW                                       │
└────────────────────────┬──────────────────────────────────────┘
                         │  HTTP /api/issues/*  +  WS /ws/issues
┌────────────────────────▼──────────────────────────────────────┐
│  Fastify API (packages/backend)                                │
│  src/routes/ companies.ts cloid-simulator.ts pm.ts ...         │
│  src/routes/issues/  ← NEW                                     │
│  src/issues/services/, src/issues/ai/, src/issues/adapters/    │
└────────────────────────┬──────────────────────────────────────┘
                         │
              ┌──────────▼───────────┐
              │ PostgreSQL (shared)  │
              │ schema.ts (Drizzle)  │
              └──────┬───────────────┘
                     │
        ┌────────────┼────────────────┐
        ▼            ▼                ▼
   Claude API   SMTP (email)    Kakao Work (v1+)
```

### 2.2 Module boundaries

The Issue Module exposes:
- REST API mounted at `/api/issues/*` (registered in [packages/backend/src/routes/index.ts](packages/backend/src/routes/index.ts))
- WebSocket at `/ws/issues` for real-time updates (via `@fastify/websocket`, not yet installed)
- Frontend routes at `/issues/*` under [packages/frontend/src/app/issues/](packages/frontend/src/app/issues/)

It reads from existing modules via thin **adapter modules** in `src/issues/adapters/` (typed wrappers around Drizzle queries on the appropriate existing tables). **Do not** import existing module internals directly; if an adapter doesn't exist for what you need, build a small one.

Adapter targets (§9 has full mapping):
- `companies`, `humanoidRobots`, `products` → "competitor" surface
- `keywords`, `crawlTargets` → "data scheduler" surface
- `cloid-simulator` → "What-If" surface

### 2.3 Why monolith, not microservice

- Same reasoning as the rest of the repo
- Single shared DB makes JOINs free; cross-module foreign keys valuable
- Railway deployment simplicity
- Reverse only if user count > 200 or AI cost requires isolation

---

## 3. Data Model (Drizzle)

All schema definitions go in [packages/backend/src/db/schema.ts](packages/backend/src/db/schema.ts) alongside existing tables. Use the `issue_` prefix consistent with the `pm_` prefix already in use. Generate migrations with `npm --workspace=@rcip/backend run migrate:generate`, run with `npm --workspace=@rcip/backend run migrate`.

### 3.1 New tables

```ts
// ─── 3.1.1 Tickets ─────────────────────────────────────────
export const issueTickets = pgTable(
  'issue_tickets',
  {
    id:          uuid('id').primaryKey().defaultRandom(),
    // Human-readable code "ARG-001". Computed in service layer from
    // issue_ticket_seq (see §3.3). Unique.
    code:        varchar('code', { length: 16 }).notNull().unique(),
    title:       varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull().default(''),
    priority:    varchar('priority', { length: 1 }).notNull(),  // H|M|L
    status:      varchar('status', { length: 16 }).notNull().default('draft'),
                 // draft|triaged|in_progress|blocked|done|cancelled

    // Ticket classification — affects filters, AI enrichment defaults, badges.
    // ARGOS domain: 4 types only — keep tight. NOT bug/story/feature/task chaos.
    type:        varchar('type', { length: 16 }).notNull().default('task'),
                 // task(과제) | research(조사) | response(대응) | epic

    // Parent → child hierarchy. NULL = top-level (Epics live here too).
    // Depth limited to 2 (Epic → child). Sub-sub-task forbidden, enforced in
    // ticketService.create()/setParent(): parent.parentTicketId MUST be NULL.
    parentTicketId: uuid('parent_ticket_id').references((): any => issueTickets.id),

    reporterId:  uuid('reporter_id').notNull().references(() => users.id),
    ownerId:     uuid('owner_id').references(() => users.id),

    // ARGOS context links — uuid[] of foreign IDs.
    // No FK constraints (target tables may be missing in MVP); validate at write.
    linkedCompetitorIds:    jsonb('linked_competitor_ids').$type<string[]>().default([]),
    linkedStrategyDocIds:   jsonb('linked_strategy_doc_ids').$type<string[]>().default([]),
    linkedKeywordIds:       jsonb('linked_keyword_ids').$type<number[]>().default([]),
       // keywords table uses serial/integer ids — not uuid

    // AI enrichment cache (regenerated on demand, not authoritative)
    aiSummary:           text('ai_summary'),
    aiSuggestedActions:  jsonb('ai_suggested_actions').$type<AiSuggestedAction[]>(),
    aiEnrichedAt:        timestamp('ai_enriched_at'),

    dueAt:     timestamp('due_at'),
    closedAt:  timestamp('closed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    reporterIdx:   index('issue_tickets_reporter_idx').on(t.reporterId),
    ownerIdx:      index('issue_tickets_owner_idx').on(t.ownerId),
    statusIdx:     index('issue_tickets_status_idx').on(t.status),
    priorityIdx:   index('issue_tickets_priority_idx').on(t.priority),
    typeIdx:       index('issue_tickets_type_idx').on(t.type),
    parentIdx:     index('issue_tickets_parent_idx').on(t.parentTicketId),
    createdIdx:    index('issue_tickets_created_idx').on(t.createdAt),
    // Postgres GIN on jsonb — Drizzle: use sql tag in migration if needed.
  }),
);

// ─── 3.1.2 Comments ─────────────────────────────────────────
export const issueComments = pgTable(
  'issue_comments',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    ticketId:         uuid('ticket_id').notNull()
                       .references(() => issueTickets.id, { onDelete: 'cascade' }),
    authorId:         uuid('author_id').notNull().references(() => users.id),
    body:             text('body').notNull(),
    mentionedUserIds: jsonb('mentioned_user_ids').$type<string[]>().default([]),
    isAiGenerated:    boolean('is_ai_generated').notNull().default(false),
    createdAt:        timestamp('created_at').notNull().defaultNow(),
    editedAt:         timestamp('edited_at'),
  },
  (t) => ({
    ticketIdx: index('issue_comments_ticket_idx').on(t.ticketId, t.createdAt),
  }),
);

// ─── 3.1.3 Activity log ────────────────────────────────────
export const issueActivity = pgTable(
  'issue_activity',
  {
    id:         uuid('id').primaryKey().defaultRandom(),
    ticketId:   uuid('ticket_id').notNull()
                 .references(() => issueTickets.id, { onDelete: 'cascade' }),
    actorId:    uuid('actor_id').references(() => users.id), // null = system
    actionType: varchar('action_type', { length: 32 }).notNull(),  // see §3.2
    payload:    jsonb('payload').notNull().default({}),
    at:         timestamp('at').notNull().defaultNow(),
  },
  (t) => ({
    ticketIdx: index('issue_activity_ticket_idx').on(t.ticketId, t.at),
  }),
);

// ─── 3.1.4 Attachments ─────────────────────────────────────
export const issueAttachments = pgTable(
  'issue_attachments',
  {
    id:         uuid('id').primaryKey().defaultRandom(),
    // Exactly one of (ticketId, commentId) is set — enforced in service layer.
    ticketId:   uuid('ticket_id').references(() => issueTickets.id, { onDelete: 'cascade' }),
    commentId:  uuid('comment_id').references(() => issueComments.id, { onDelete: 'cascade' }),
    fileUrl:    text('file_url').notNull(),
    fileName:   varchar('file_name', { length: 255 }).notNull(),
    mimeType:   varchar('mime_type', { length: 128 }).notNull(),
    fileSize:   integer('file_size').notNull(),
    uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),
    at:         timestamp('at').notNull().defaultNow(),
  },
);

// ─── 3.1.5 Notifications (in-app) ──────────────────────────
export const issueNotifications = pgTable(
  'issue_notifications',
  {
    id:          uuid('id').primaryKey().defaultRandom(),
    recipientId: uuid('recipient_id').notNull().references(() => users.id),
    ticketId:    uuid('ticket_id').references(() => issueTickets.id, { onDelete: 'cascade' }),
    type:        varchar('type', { length: 32 }).notNull(),
                 // assigned | mentioned | status_changed | overdue | comment
    payload:     jsonb('payload').notNull().default({}),
    readAt:      timestamp('read_at'),
    createdAt:   timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    recipUnreadIdx: index('issue_notif_recipient_unread_idx')
                      .on(t.recipientId, t.createdAt)
                      .where(sql`${t.readAt} IS NULL`),
  }),
);

// ─── 3.1.6 Ticket links (blocks / duplicates / relates_to) ────
// Stored uni-directionally. Reverse direction computed at query time:
//   "A blocks B"      → shown on B as "blocked by A"
//   "A duplicates B"  → shown on B as "duplicated by A"
//   "A relates_to B"  → shown on both sides as "related"
// Self-links (from===to) and cycles in `blocks` chain rejected in service layer.
export const issueTicketLinks = pgTable(
  'issue_ticket_links',
  {
    id:           uuid('id').primaryKey().defaultRandom(),
    fromTicketId: uuid('from_ticket_id').notNull()
                    .references(() => issueTickets.id, { onDelete: 'cascade' }),
    toTicketId:   uuid('to_ticket_id').notNull()
                    .references(() => issueTickets.id, { onDelete: 'cascade' }),
    relation:     varchar('relation', { length: 16 }).notNull(),
                  // blocks | duplicates | relates_to
    createdBy:    uuid('created_by').notNull().references(() => users.id),
    createdAt:    timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    uniqLink: uniqueIndex('issue_ticket_links_uniq')
                .on(t.fromTicketId, t.toTicketId, t.relation),
    fromIdx:  index('issue_ticket_links_from_idx').on(t.fromTicketId),
    toIdx:    index('issue_ticket_links_to_idx').on(t.toTicketId),
  }),
);

type AiSuggestedAction = {
  step: string;
  rationale: string;
  estimatedEffortHours: number | null;
  requiresCompetitorData: boolean;
};
```

### 3.2 `actionType` enum (activity log)

| Value | When | Payload shape |
|-------|------|--------------|
| `created` | Ticket created | `{}` |
| `status_changed` | Status updated | `{ from, to }` |
| `assigned` | Owner set or changed | `{ from, to }` |
| `priority_changed` | Priority updated | `{ from, to }` |
| `due_changed` | Due date updated | `{ from, to }` |
| `commented` | Comment added | `{ commentId, preview }` |
| `attached` | File uploaded | `{ attachmentId, fileName }` |
| `ai_enriched` | AI enrichment ran | `{ model, fieldsUpdated[] }` |
| `linked` | ARGOS context linked (competitor / strategy / keyword) | `{ kind, targetIds }` |
| `type_changed` | Ticket `type` changed | `{ from, to }` |
| `parent_changed` | Parent attached / detached / swapped | `{ from, to }` (codes, not UUIDs) |
| `ticket_linked` | Inter-ticket link created (blocks / duplicates / relates_to) | `{ linkId, toCode, relation }` |
| `ticket_unlinked` | Inter-ticket link removed | `{ linkId, toCode, relation }` |
| `closed` | Status → done | `{ resolutionNote }` |
| `reopened` | done → in_progress | `{}` |

### 3.3 Code generation (ticket `code` field)

Format: `ARG-{nnn}` where nnn is a zero-padded sequence number (3+ digits). Use a Postgres sequence created in the migration:

```sql
CREATE SEQUENCE IF NOT EXISTS issue_ticket_seq START 1;
```

In service layer (`ticketService.create`):

```ts
const [{ next }] = await db.execute(sql`SELECT nextval('issue_ticket_seq') as next`);
const code = `ARG-${String(next).padStart(3, '0')}`;
```

Rationale: short, memorable, mentionable in chat / email / voice. Auto-expands to ARG-1234 beyond 999.

### 3.4 Soft vs hard delete

No deletes. Use `status='cancelled'`. Reasoning: full audit trail. `closedAt` is set on `done` OR `cancelled`.

### 3.5 `updatedAt` auto-update

Drizzle does not auto-update `updatedAt`; install a Postgres trigger in the migration:

```sql
CREATE OR REPLACE FUNCTION trg_issue_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$ LANGUAGE plpgsql;

CREATE TRIGGER issue_tickets_updated
  BEFORE UPDATE ON issue_tickets
  FOR EACH ROW EXECUTE FUNCTION trg_issue_set_updated_at();
```

Or simpler: have services set `updatedAt: new Date()` on every `db.update(issueTickets)`. The PM module does it this way — match that convention if it's the prevailing pattern.

---

## 4. API Specification

### 4.1 Conventions

- All endpoints: `Content-Type: application/json` unless file upload
- Auth: reuse existing JWT verification (`@fastify/jwt`). Decorate `request.user`.
- Errors: HTTP status + `{ error: string, code?: string }` (match existing routes)
- Pagination: `?limit=20&cursor=<opaque>`; response: `{ items: [...], nextCursor: string|null }`
- Timestamps: ISO 8601 UTC strings (Drizzle returns Date; serialize via Fastify default)
- Use **zod** for request validation (add `zod` dep). Define schemas in [packages/backend/src/issues/schemas.ts](packages/backend/src/issues/schemas.ts) and reuse types in frontend via `packages/shared/`.

### 4.2 Endpoints (MVP scope marked ◉)

```
◉ POST   /api/issues/ask                  Unified ask entry — classifies intent,
                                          returns either an inline answer (조회),
                                          a ready-to-publish draft (과제), or both (모호).
                                          Does NOT create a ticket by itself.

◉ POST   /api/issues/tickets              Create ticket (called from confirm screen,
                                          from manual form, or programmatically from /ask)
◉ GET    /api/issues/tickets              List tickets (with filters)
◉ GET    /api/issues/tickets/:id          Get single ticket (with comments, activity)
◉ PATCH  /api/issues/tickets/:id          Update ticket
  DELETE /api/issues/tickets/:id          (NOT IMPLEMENTED — use PATCH status=cancelled)

◉ POST   /api/issues/tickets/:id/comments      Add comment
◉ GET    /api/issues/tickets/:id/comments      List comments
◉ PATCH  /api/issues/comments/:id              Edit comment (author only, within 15min)

◉ POST   /api/issues/tickets/:id/attachments   Upload file (multipart)
  GET    /api/issues/attachments/:id           Get download URL

◉ POST   /api/issues/tickets/:id/links         Create link to another ticket
                                               body: { toCode, relation }
                                               relation ∈ blocks|duplicates|relates_to
◉ GET    /api/issues/tickets/:id/links         List links (both directions, with reverse labels)
◉ DELETE /api/issues/links/:linkId             Remove link

◉ GET    /api/issues/tickets/:id/children      List children of an Epic (or any ticket)
                                               Returns [{ code, title, status, progressPct, owner }]

◉ GET    /api/issues/dashboard/overview        Org-wide overview (signal-light cards for all open tickets)
◉ GET    /api/issues/dashboard/inbox           User's inbox (assigned + mentioned)
  GET    /api/issues/dashboard/kanban          Kanban board data

◉ POST   /api/issues/tickets/:id/enrich               Re-run Claude enrichment on existing ticket
                                                      (initial enrichment runs synchronously
                                                      inside /ask for confirm screen prefill)
  POST   /api/issues/tickets/:id/regenerate-summary   (v1)

  GET    /api/issues/notifications              List notifications for current user
  POST   /api/issues/notifications/:id/read     Mark as read
  POST   /api/issues/notifications/mark-all-read

◉ GET    /api/issues/search                     Natural language ticket search
                                                (Claude-backed; also used as one of the
                                                 retrieval sources by /ask)
  POST   /api/issues/from-meeting               Extract tickets from meeting notes      (v2)

  WS     /ws/issues                             Real-time updates
```

#### `POST /api/issues/ask` — request / response

```ts
// request
{ "query": "Figure 03 현재 정보 보여줘" }

// response — intent: "lookup" (조회)
{
  "intent": "lookup",
  "confidence": 0.91,
  "answer": {
    "summary": "Figure AI는 …",
    "competitors": [{ "id": "...", "name": "Figure AI", "summary": "...", "recentArticles": [...] }],
    "relatedTickets": [{ "code": "ARG-041", "title": "Figure 03 대응 분석", "status": "in_progress" }]
  },
  "fallback": { "action": "create_ticket", "label": "이 정보로 부족 — 이슈로 발행 →" }
}

// response — intent: "task" (과제)
{
  "intent": "task",
  "confidence": 0.88,
  "draft": {
    "title": "Figure 03 신형 핸드 대응 방안 검토",
    "description": "...",
    "priority": "H",
    "priorityRationale": "신제품 대응 → 시급",
    "suggestedOwnerId": "uuid",
    "ownerRationale": "gripper SI 담당, 워크로드 2",
    "linkedCompetitorIds": ["uuid"],
    "linkedStrategyDocIds": [],
    "suggestedDueAt": "2026-05-31",
    "suggestedActions": [...]
  }
}

// response — intent: "ambiguous" (모호)
{
  "intent": "ambiguous",
  "confidence": 0.52,
  "answer": { /* same shape as lookup.answer, best-effort */ },
  "draft":  { /* same shape as task.draft, best-effort */ }
}
```

The frontend confirm screen (§6.0) does **not** auto-create a ticket — it shows the draft for review, and only `POST /api/issues/tickets` on user tap. The draft is therefore stateless on the server; nothing persists until publish.

### 4.3 Request/Response shapes (zod + TS)

```ts
// packages/backend/src/issues/schemas.ts
import { z } from 'zod';

export const PrioritySchema = z.enum(['H', 'M', 'L']);
export const StatusSchema = z.enum([
  'draft', 'triaged', 'in_progress', 'blocked', 'done', 'cancelled',
]);
export const TypeSchema = z.enum(['task', 'research', 'response', 'epic']);
export const LinkRelationSchema = z.enum(['blocks', 'duplicates', 'relates_to']);

// POST /api/issues/tickets — request
export const TicketCreateSchema = z.object({
  title:                z.string().min(1).max(200),
  description:          z.string().default(''),
  priority:             PrioritySchema.default('M'),
  type:                 TypeSchema.default('task'),
  parentTicketCode:     z.string().regex(/^ARG-\d+$/).optional(),
                          // resolved to UUID in service; rejected if parent itself has a parent
  suggestedDepartment:  z.string().optional(),  // free text, reporter's hint
  voiceInputBlobUrl:    z.string().url().optional(),
});
export type TicketCreate = z.infer<typeof TicketCreateSchema>;

// PATCH /api/issues/tickets/:id — request
export const TicketPatchSchema = z.object({
  title:       z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority:    PrioritySchema.optional(),
  status:      StatusSchema.optional(),
  type:        TypeSchema.optional(),
  parentTicketCode: z.string().regex(/^ARG-\d+$/).nullable().optional(),  // null detaches
  ownerId:     z.string().uuid().nullable().optional(),
  dueAt:       z.string().datetime().nullable().optional(),
  linkedCompetitorIds:  z.array(z.string().uuid()).optional(),
  linkedStrategyDocIds: z.array(z.string().uuid()).optional(),
  linkedKeywordIds:     z.array(z.number().int()).optional(),
});

// POST /api/issues/tickets/:id/links — request
export const TicketLinkCreateSchema = z.object({
  toCode:   z.string().regex(/^ARG-\d+$/),
  relation: LinkRelationSchema,
});

// GET /api/issues/tickets — query params
export const TicketListQuerySchema = z.object({
  status:        z.array(StatusSchema).optional(),
  priority:      z.array(PrioritySchema).optional(),
  type:          z.array(TypeSchema).optional(),
  reporterId:    z.string().uuid().optional(),
  ownerId:       z.string().uuid().optional(),
  competitorId:  z.string().uuid().optional(),
  parentTicketId: z.string().uuid().optional(),  // list children of an Epic
  hasOverdue:    z.boolean().optional(),
  createdAfter:  z.string().datetime().optional(),
  cursor:        z.string().optional(),
  limit:         z.number().int().max(100).default(20),
});

// Response types — also exported as TS interfaces for frontend reuse.
// Place in packages/shared/src/issues.ts for cross-package consumption.

export interface UserSummary { id: string; email: string; name: string | null; role: string; }
export interface CompetitorSummary { id: string; name: string; country: string; }
export interface StrategyDocSummary { id: string; title: string; type: string; }
export interface AISuggestedAction {
  step: string;
  rationale: string;
  estimatedEffortHours: number | null;
  requiresCompetitorData: boolean;
}

export interface TicketRead {
  id: string;
  code: string;
  title: string;
  description: string;
  priority: 'H' | 'M' | 'L';
  status: 'draft' | 'triaged' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  type: 'task' | 'research' | 'response' | 'epic';
  parent: { code: string; title: string } | null;   // null if top-level
  reporter: UserSummary;
  owner: UserSummary | null;
  linkedCompetitors: CompetitorSummary[];
  linkedStrategyDocs: StrategyDocSummary[];   // [] in MVP
  aiSummary: string | null;                    // null in MVP
  aiSuggestedActions: AISuggestedAction[] | null;
  dueAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Included only in /tickets/:id, not in list
  comments?: CommentRead[];
  activity?: ActivityRead[];
  attachments?: AttachmentRead[];
  children?: TicketChildSummary[];   // populated only when type === 'epic'
  links?: TicketLinkRead[];          // both directions, with reverse labels
}

export interface TicketChildSummary {
  id: string;
  code: string;
  title: string;
  status: string;
  type: 'task' | 'research' | 'response';   // never 'epic' — depth limit
  owner: UserSummary | null;
  progressPct: number;
}

export interface TicketLinkRead {
  id: string;
  direction: 'outgoing' | 'incoming';
  relation: 'blocks' | 'duplicates' | 'relates_to';
  // Display label is computed by the frontend from (relation, direction).
  // outgoing blocks       → "blocks ARG-###"
  // incoming blocks       → "blocked by ARG-###"
  // outgoing duplicates   → "duplicates ARG-###"
  // incoming duplicates   → "duplicated by ARG-###"
  // either relates_to     → "related to ARG-###"
  otherTicket: { code: string; title: string; status: string };
  createdBy: UserSummary;
  createdAt: string;
}

export interface OverviewDashboard {
  summary: { open: number; inProgress: number; blocked: number; overdue: number; doneThisWeek: number };
  cards: TicketCard[];     // all open tickets, org-wide
  dailyBrief: string | null;  // null in MVP
}

export interface TicketCard {
  id: string;
  code: string;
  title: string;
  status: string;
  priority: string;
  ownerName: string | null;
  progressPct: number;          // 0-100, derived from status + comments (see §6.2)
  daysToDue: number | null;     // negative if overdue
  lastUpdateSummary: string;    // for MVP: latest activity action_type human form
}
```

### 4.4 Status transitions (state machine)

```
draft ──► triaged ──► in_progress ──► done
              │             │           ▲
              │             ▼           │
              │         blocked ────────┘
              │             │
              ▼             ▼
          cancelled    cancelled
```

Enforce in `packages/backend/src/issues/services/transitionRules.ts`. Reject invalid transitions with **HTTP 409**.

Auto-rules:
- On `triaged`: must have `ownerId` set
- On `in_progress`: requires `ownerId` AND first comment from owner (acknowledgment)
- On `done`: set `closedAt = NOW()`
- On reopen (done → in_progress): clear `closedAt`

### 4.5 WebSocket events

Endpoint: `WS /ws/issues` (auth via `?token=<jwt>` query param). Use `@fastify/websocket`.

Outbound (server → client):

```jsonc
{ "type": "ticket.created",   "data": { /* TicketRead */ } }
{ "type": "ticket.updated",   "data": { "ticketId": "...", "changes": { /* partial */ } } }
{ "type": "ticket.commented", "data": { "ticketId": "...", "comment": { /* CommentRead */ } } }
{ "type": "notification.new", "data": { /* NotificationRead */ } }
```

Inbound: none for MVP (client uses REST for actions).

Broadcast scope: **every authenticated WS connection receives every event.** Filtering for "tickets I care about" is a client-side concern (inbox view uses `ownerId = me OR mentioned`); the wire delivers everything. Matches §1.3 (no role gates).

In-memory pub/sub for MVP (single Railway instance). Promote to Redis if scaling out.

---

## 5. Frontend Architecture (Next.js App Router)

### 5.1 Tech (already installed unless noted)

- **Framework**: Next.js 14 App Router (server + client components)
- **State**: TanStack Query (server) + Zustand (UI)
- **Styling**: Tailwind, `tailwind-merge`, `clsx`
- **Icons**: `lucide-react`
- **Forms**: install `react-hook-form` + `zod` + `@hookform/resolvers`
- **Markdown**: install `react-markdown` + `rehype-sanitize`
- **Date**: install `date-fns`

Confirm versions when adding — match existing `@tanstack/react-query@^5` etc.

### 5.2 Routes (file-based)

```
packages/frontend/src/app/issues/
├── page.tsx                       → redirect to /issues/ask (primary entry, same for everyone)
├── layout.tsx                     → shell w/ nav (all tabs visible to all users) + notification bell
├── ask/page.tsx                   → unified ask entry — single input, intent routing (§6.0)
├── ask/confirm/page.tsx           → task-draft confirm screen, 1-tap publish (§6.0.2)
├── new/page.tsx                   → manual creation form, fallback only (§6.1)
│                                    reachable as /issues/new or /issues/ask?manual=1
├── overview/page.tsx              → org-wide overview (signal-light cards for all open tickets)
├── inbox/page.tsx                 → tickets assigned to or mentioning me
├── kanban/page.tsx                → kanban board                            v1
├── triage/page.tsx                → triage queue (just-created without owner) v1
└── [code]/page.tsx                → ticket detail (full page), e.g. /issues/ARG-042
```

All routes are reachable by any authenticated user — there is no role-based redirect or hidden nav entry. Inbox is "personal" only in the sense of filter defaults (`ownerId = me`), not access control.

**The `/issues/search` route is gone** — natural-language search is now embedded in `/issues/ask` (a search query is just a `lookup`-intent ask), so a dedicated search page would be redundant. Saved/advanced search remains v2.

#### Ticket detail — dual presentation (modal + page)

Ticket detail uses **a single `TicketDetailView` component, rendered through two wrappers** (§6.6):

| Surface | Wrapper | When |
|---|---|---|
| Modal slideover (JIRA-style) | `<TicketDetailModal>` over current page | Card click from `/overview`, `/inbox`, `/kanban`, `/triage`. URL syncs to `?ticket=ARG-042` so refresh/share works. |
| Full page | `app/issues/[code]/page.tsx` | Direct URL, email link, bookmark, browser back from outside `/issues/*` |

The modal closes on `Esc` or backdrop click, removing the `?ticket=` param and restoring scroll position. If a user lands on `/issues/ARG-042` directly (no underlying list context), they get the full page — never an empty-background modal. Same React component renders both; only the chrome differs.

API routes (if needed for SSR proxying): `app/api/issues/` — prefer direct backend hits via `fetch` from server components.

### 5.3 Component tree

```
packages/frontend/src/
├── app/issues/             (route pages above)
├── components/issues/      (presentational + interactive components)
│   ├── TicketCard/
│   ├── TicketSignalLight/
│   ├── PriorityPill/
│   ├── StatusPill/
│   ├── TicketDetailView/        single source of truth for ticket detail UI
│   │                            (header + tabs + comments + activity + attachments)
│   ├── TicketDetailModal/       thin wrapper: slideover chrome + ?ticket=… URL sync
│   ├── AskInput/                §6.0 input box
│   ├── ConfirmDraftForm/        §6.0.2 task-draft 1-tap publish form
│   ├── LookupAnswerPanel/       §6.0.1 inline answer (competitor + articles + tickets)
│   ├── VoiceInputButton/        v1
│   ├── MentionInput/
│   ├── ActivityTimeline/
│   ├── CommentThread/
│   ├── AISummaryBlock/          v1 (renders skeleton in MVP)
│   ├── LinkedContextPanel/      v1 (renders empty in MVP)
│   └── DailyBriefCard/          v1
├── hooks/issues/
│   ├── useTickets.ts
│   ├── useTicket.ts
│   ├── useOverviewDashboard.ts
│   ├── useIssueWebSocket.ts
│   └── useVoiceInput.ts         v1
├── lib/issues-api.ts            (fetch wrappers matching §4)
├── stores/issueUIStore.ts       (Zustand: filters, kanban column collapse)
└── types/issues.ts              (re-export from packages/shared/src/issues.ts)
```

### 5.4 Styling tokens

Match the LG visual identity already used elsewhere in this repo (e.g. PM module uses `#A50034`, `#E2DED4`, `#1A1A1A`). Defined as Tailwind extension in [packages/frontend/tailwind.config.ts](packages/frontend/tailwind.config.ts) — add only if missing:

```ts
theme: {
  extend: {
    colors: {
      'lg-red':       '#A50034',  // primary accent — sparingly
      'lg-red-soft':  '#F4D6DD',  // bg, hover
      'status-green': '#16a34a',
      'status-blue':  '#2563eb',
      'status-orange':'#ea580c',
      'status-gray':  '#6b7280',
      'priority-h':   '#A50034',
      'priority-m':   '#ea580c',
      'priority-l':   '#6b7280',
    },
    fontFamily: {
      sans: ['Pretendard', 'Calibri', 'system-ui', 'sans-serif'],
    },
  },
}
```

**Rule**: LG Red (`#A50034`) is the only strong accent. Status / priority colors are functional.

---

## 6. UX Specifications by Screen

UX mockups below describe visual design per screen, not per persona. Every screen is reachable by every authenticated user (§1.3). Labels like "본부장 / 김OO" in mockups are *example sample data*, not role gates.

### 6.0 Unified Ask Entry (`/issues/ask`) — primary entry, MVP

This is the **default** entry to the module. The redirect from `/issues` lands here, the `+ New` button on the overview dashboard lands here, and the global nav "이슈" item lands here. Users do not fill ticket fields; they ask.

The screen is a single text input. On Enter, the input is sent to `POST /api/issues/ask`, which classifies the intent (§7.2) and routes:

```
                  ┌──────── POST /api/issues/ask ────────┐
                  │                                       │
   "Figure 03     │   intent: lookup     intent: task     │   intent: ambiguous
    현재 정보"    │        │                  │           │          │
                  │        ▼                  ▼           │          ▼
                  │   §6.0.1 answer      §6.0.2 confirm   │   §6.0.3 both
                  │   panel              screen           │   side-by-side
                  └───────────────────────────────────────┘
```

#### 6.0 — input screen

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│        🔍 무엇이 궁금하신가요?                          │
│        무엇을 시키고 싶으신가요?                         │
│                                                          │
│        ┌────────────────────────────────────────────┐   │
│        │ Figure 03 현재 정보 보여줘                │   │
│        └────────────────────────────────────────────┘   │
│                                                          │
│        [🎤 음성]                            [Enter ↵]   │
│                                                          │
│        ────────────────────────────────────────────     │
│        최근 질문                                         │
│        · "UL MCV 진행상황"                              │
│        · "BR 정리정돈 IFA 시연안 검토"                  │
│        · "Figure 03 대응 누가 하고 있어?"               │
│                                                          │
│        직접 폼으로 발행하기 →                            │
└──────────────────────────────────────────────────────────┘
```

- Single text box, autofocus on mount, no field labels to choose from
- Voice input (Whisper, v1) fills the box; Enter submits
- "최근 질문" — last 5 asks from this user, click to re-run
- Bottom-right escape hatch to the legacy manual form (`§6.1`)
- Keyboard: `Enter` submit, `Shift+Enter` newline, `Esc` clear, `↑` last query

#### 6.0.1 — lookup answer panel (intent: `lookup`)

Inline answer, **no ticket created**:

```
┌──────────────────────────────────────────────────────────┐
│  ← [돌아가기]   "Figure 03 현재 정보 보여줘"             │
├──────────────────────────────────────────────────────────┤
│  ▸ Figure AI (US)                                        │
│    Humanoid 스타트업. 2026-03 Figure 03 공개, 5지 핸드 SI│
│    [경쟁사 카드로 →]                                     │
├──────────────────────────────────────────────────────────┤
│  ▸ 최근 기사 (3건, 지난 30일)                            │
│    · 2026-05-12  Figure 03 핸드 스펙 공개  [원문 →]      │
│    · 2026-04-30  Figure 시리즈 C 펀딩 …    [원문 →]      │
│    · 2026-04-21  Figure 03 데모 영상       [원문 →]      │
├──────────────────────────────────────────────────────────┤
│  ▸ 관련 기존 이슈 (1건)                                  │
│    · ARG-041  Figure 03 대응 분석   [진행중] 80%         │
├──────────────────────────────────────────────────────────┤
│   이 정보로 부족합니다 — [ 이슈로 발행 → ]               │
└──────────────────────────────────────────────────────────┘
```

The fallback button at the bottom **always** appears (analytics: count clicks → measure classification quality). Clicking re-routes the same query to `intent: task` and shows §6.0.2.

#### 6.0.2 — task confirm screen (intent: `task`)

AI prefilled everything; user reviews and publishes:

```
┌──────────────────────────────────────────────────────────┐
│  AI 가 이렇게 발행할게요. 맞으면 [발행 →], 고칠 거면 클릭│
├──────────────────────────────────────────────────────────┤
│  제목      Figure 03 신형 핸드 대응 방안 검토      ✏     │
│  내용      최근 발표된 Figure 03의 5지 핸드 스펙   ✏     │
│            분석과 우리 대응 방안 검토 필요               │
│  우선순위  ● 상  (Figure 신제품 대응 → 시급)        ✏    │
│  담당자    김OO 책임  (gripper SI 담당, 워크로드 2) ✏    │
│  관련      Figure AI (경쟁사)                       ✏    │
│            Gripper Universal Adapter (전략문서)          │
│  마감      D+7 (2026-05-31)                         ✏    │
├──────────────────────────────────────────────────────────┤
│  AI 제안 액션 (발행 후 ARG-### 에 자동 첨부됨)           │
│  ① 5지 핸드 스펙 시트 정리 (~4h)                         │
│  ② Universal Adapter 와 호환성 비교 (~6h)                │
│  ③ 6/3 기술 리뷰 회의 안건 등록 (~1h)                    │
├──────────────────────────────────────────────────────────┤
│  [⌫ 처음으로]                              [  발행 →  ] │
└──────────────────────────────────────────────────────────┘
```

- Each `✏` opens an inline editor — typed-text overrides AI prefill for that field only
- `발행 →` calls `POST /api/issues/tickets` with the final (possibly edited) draft; redirect to `/issues/ARG-###` with green flash
- `처음으로` returns to §6.0 with the original query preserved
- The "AI 제안 액션" block is informational — committed as comments on the ticket post-publish

#### 6.0.3 — ambiguous (intent: `ambiguous`)

Both panels stacked vertically, user picks:

```
┌──────────────────────────────────────────────────────────┐
│  여러 의도로 해석돼요. 어떤 게 맞나요?                   │
├──────────────────────────────────────────────────────────┤
│  ▶ 정보를 보고 싶으세요?     [먼저 정보 보기]            │
│     · Figure AI 경쟁사 카드 · 최근 기사 3건              │
│     · 관련 이슈 1건                                      │
├──────────────────────────────────────────────────────────┤
│  ▶ 누군가에게 시키고 싶으세요?  [과제로 발행]            │
│     · 제목: Figure 03 신형 핸드 대응 방안 검토           │
│     · 담당: 김OO 책임 · 우선순위 상                      │
└──────────────────────────────────────────────────────────┘
```

### 6.1 Manual creation form (`/issues/new`) — fallback only

For users who want full control, or when `/ask` failed. Reachable from the bottom of §6.0 and as a direct URL. Same form as the original spec:

```
┌────────────────────────────────────────────────┐
│   ★ 새 이슈 발행 (수동)                       │
│                                                │
│   제목                                         │
│   [ Figure 03 신형 핸드 대응?              ]   │
│                                                │
│   내용                                         │
│   ┌──────────────────────────────────────┐    │
│   │ 최근 발표된 Figure 03의 5지 핸드     │    │
│   │ 스펙 분석과 우리 대응 방안 검토 필요 │    │
│   └──────────────────────────────────────┘    │
│                                                │
│   우선순위    ●상  ○중  ○하                   │
│                                                │
│   [🎤 음성] [📎 첨부] [⌨ 단축키]              │
│                                                │
│   ※ 담당자·관련 자료는 AI가 자동 제안합니다   │
│   ※ 빠른 입력은 `/issues/ask` 를 써보세요    │
│                                                │
│              [  발행 →  ]                     │
└────────────────────────────────────────────────┘
```

Behavior:
- Title autosaves to draft on blur (MVP: skip; v1)
- Voice input → Whisper (v1) → fills title + description
- Submit → POST /api/issues/tickets → redirect to ticket detail with green flash banner
- AI enrichment runs synchronously and the response already includes the suggested fields; if user kept defaults, those are saved as-is. (Note: for the ask flow, enrichment already ran inside `/ask` — no double call.)

Keyboard shortcuts:
- `Cmd/Ctrl + Enter`: submit
- `Cmd/Ctrl + V`: paste (image attaches automatically)
- `Esc`: cancel with confirmation if dirty

### 6.2 Overview dashboard (`/issues/overview`)

```
┌────────────────────────────────────────────────────────────────────┐
│   IFA 로봇 전시 컨셉                            발행: 5건  진행: 3│
│   본부장 / 김OO                                 완료: 2건  지연: 1│
├────────────────────────────────────────────────────────────────────┤
│   ☞ 오늘의 브리프 (AI 생성)                    [v1 — MVP는 숨김]  │
│   3건이 정상 진행중이며, ARG-042 "UL MCV 검토"가 마감 2일 지연.   │
├────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │● ARG-042   │  │● ARG-041   │  │● ARG-040   │  │● ARG-039   │  │
│  │ UL MCV     │  │ Figure 03  │  │ BR 정리정돈│  │ Changwon   │  │
│  │ 검토       │  │ 대응 분석  │  │ IFA 시연안 │  │ Gripper    │  │
│  │ ●●○○○ 40% │  │ ●●●●○ 80% │  │ ●●●●● 100%│  │ ●●●○○ 60% │  │
│  │ 박OO 리더 │  │ 김OO 책임 │  │ 이OO 책임 │  │ 정OO 리더 │  │
│  │ D+2 지연  │  │ D-3       │  │ 4/15 완료 │  │ D-7       │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│   [+ 새 이슈]                              [질문하기 🔍] (v2)     │
└────────────────────────────────────────────────────────────────────┘
```

Card click → opens `<TicketDetailModal>` over the dashboard (URL → `?ticket=ARG-042`). Esc/backdrop closes. See §6.6 for the modal+page dual presentation. Hover → tooltip with AI summary (v1) + last comment preview.

`progressPct` derivation (computed in `/dashboard/overview` endpoint):
- `draft` = 5
- `triaged` = 15
- `in_progress` w/ no comments from owner = 30
- `in_progress` w/ ≥1 owner comment = 50
- `in_progress` w/ ≥3 owner comments = 70
- `blocked` = freeze at current value
- `done` = 100

### 6.3 Triage queue (`/issues/triage`) — v1

List of `status='triaged'` (or just-created without owner). Each row shows AI-suggested owner; any user can confirm or override. Anyone can pick tickets off this queue.

```
┌──────────────────────────────────────────────────────────────────┐
│  Triage Queue (3)                                                 │
├──────────────────────────────────────────────────────────────────┤
│  ARG-043  Figure 03 신형 핸드 대응      [상]                     │
│  발행: 본부장 (10분 전)                                          │
│  AI 제안: 김OO 책임 (gripper SI 담당)                            │
│  관련: Figure AI (경쟁사), Gripper Universal Adapter (전략문서)  │
│  [확인 → 할당]  [담당자 변경]  [✏ 수정]                          │
└──────────────────────────────────────────────────────────────────┘
```

### 6.4 Inbox (`/issues/inbox`)

Default sort: priority DESC, dueAt ASC, then createdAt DESC. Three sections (collapsible):

1. **할당된 이슈** (assigned to me)
2. **언급된 이슈** (mentioned in comments, last 7 days)
3. **관찰중** (watched — v1)

### 6.5 Mobile

PWA — not native. Manifest + service worker (cache static assets only; ticket data always fresh). Mobile screens prioritize:
- `/issues/ask` (ask on the go)
- `/issues/overview` (status check)
- Ticket detail (read-mostly)

On mobile, ticket detail is always **full page** even when triggered from a card (modal slideover collapses to full page <640px). Kanban and Triage are desktop-first; show notice on mobile. Mobile work is v1.

### 6.6 Ticket detail (modal + full page) — MVP

Same UI two ways (§5.2 dual presentation). The component `TicketDetailView` is the single source of truth.

#### Modal slideover (default when clicked from a list)

```
┌──────────────────── /issues/overview ──────────────────────────────┐
│  IFA 로봇 전시 컨셉                       ╔══════════════════════╗ │
│  본부장 / 김OO                            ║ ARG-042  ●상  진행중 ║ │
│  [overview cards still visible behind] ←─→║ UL MCV 검토          ║ │
│                                           ║ 발행: 본부장 (5/20)   ║ │
│   ?ticket=ARG-042 in URL                  ║ 담당: 박OO 리더       ║ │
│   Esc / backdrop = close                  ║ 마감: D+2 ⚠ 지연      ║ │
│                                           ╠══════════════════════╣ │
│                                           ║ [요약][댓글][활동][📎]║ │
│                                           ╠══════════════════════╣ │
│                                           ║ ▸ AI 요약 (v1)        ║ │
│                                           ║ ▸ 연결: Figure AI …   ║ │
│                                           ║                       ║ │
│                                           ║ ─── 댓글 (3) ───      ║ │
│                                           ║ 박OO  5/22 14:02     ║ │
│                                           ║ 사양 시트 정리 완료… ║ │
│                                           ║ [@김OO 책임 검토 →]   ║ │
│                                           ║                       ║ │
│                                           ║ ┌─────────────────┐  ║ │
│                                           ║ │ 댓글 작성…       │  ║ │
│                                           ║ └─────────────────┘  ║ │
│                                           ║      [↗ 풀 페이지로] ║ │
│                                           ╚══════════════════════╝ │
└────────────────────────────────────────────────────────────────────┘
```

- Width: 720px (desktop), 100vw on mobile collapse
- Right side, slides in from edge with backdrop dim
- URL gains `?ticket=ARG-042`; refresh or share preserves the modal *if* the underlying route still matches; otherwise renders full page
- "↗ 풀 페이지로" → navigates to `/issues/ARG-042`, dropping the query state
- Behind-the-modal list (`/overview`, `/inbox`, etc.) stays mounted — closing modal restores scroll position

#### Full page (`/issues/ARG-042`)

Same `TicketDetailView` inside an `app/issues/[code]/page.tsx` shell. No slideover chrome; nav present. Used for:
- Direct URL hits (bookmark, email link, browser history)
- Mobile (modal collapses to full page)
- "↗ 풀 페이지로" button
- Server-rendered share previews (OpenGraph in v1)

#### Tabs inside `TicketDetailView`

| Tab | Contents | MVP |
|---|---|---|
| 요약 | Title, **type badge** (📋/🔍/⚡/🎯), status, priority, owner, due, description (markdown), AI summary block, **parent breadcrumb** when present | ◉ |
| 댓글 | `CommentThread` (oldest→newest, paginated >20) + `MentionInput` at bottom | ◉ |
| 활동 | `ActivityTimeline` — every state change, assignment, AI enrichment, link create/delete | ◉ |
| 📎 | Attachment list + dropzone | ◉ |
| 연결 | `TicketLinksPanel` — blocks / blocked by / duplicates / duplicated by / related sections + `+ 연결 추가` (ARG-### autocomplete → relation select) | ◉ |
| 하위 이슈 | (Epic 만 노출) child list with status/owner/progress, `+ 하위 이슈 추가` | v1 (자식 추가 UI), MVP (단순 리스트만) |

ARGOS context panel (competitors / strategy docs / keywords) lives in the 요약 tab as `LinkedContextPanel` — v1 fills it, MVP shows empty placeholder.

#### URL state contract

- `/issues/overview?ticket=ARG-042` — overview list + modal
- `/issues/inbox?ticket=ARG-042` — inbox list + modal
- `/issues/ARG-042` — page, no underlying list
- Hash for deep-link to tab: `?ticket=ARG-042#comments`, `/issues/ARG-042#activity`

Frontend implementation: a small `useTicketModal()` hook reads `?ticket=` from `useSearchParams()`, opens `<TicketDetailModal>` when present, and provides `openTicket(code)` / `closeTicket()` that update the URL via `router.replace()` (no history pollution; one back-button press closes the modal).

---

## 7. AI Integration (Claude API)

### 7.1 Client setup

Use existing `@anthropic-ai/sdk` (already in both backend and frontend deps). Backend client lives in [packages/backend/src/issues/ai/client.ts](packages/backend/src/issues/ai/client.ts):

```ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
// Default to latest 4.x at time of build.
export const MODEL_FAST = process.env.ISSUE_AI_MODEL_FAST ?? 'claude-sonnet-4-6';
export const MODEL_DEEP = process.env.ISSUE_AI_MODEL_DEEP ?? 'claude-opus-4-7';
export { client };
```

Per the `claude-api` skill, always enable prompt caching on system prompts that exceed the cache threshold (enrichment prompt is borderline; consider caching the schema chunk).

### 7.2 Intent classification (MVP)

The first call inside `POST /api/issues/ask` (§4). Decides whether the user is asking a question, requesting a task, or both. Cheap and fast — uses `MODEL_FAST`.

Prompt:

```
You are routing a user's input on an internal R&D portal. Decide intent.

User query (Korean or English): "{query}"
Today's date: {today_iso}

Choose ONE intent:
- "lookup":    user wants to see existing information (status, summary, who, when)
- "task":      user wants someone to do new work (investigate, prepare, analyze)
- "ambiguous": both readings are plausible; confidence < 0.7 either way

Heuristics:
- Imperative + new artifact → task   ("보고서 만들어줘", "검토해줘", "대응 방안 짜줘")
- Question + existing entity → lookup ("현재 정보", "진행상황", "누가 하고있어")
- Bare noun phrase → lookup           ("Figure 03", "UL MCV")

Return JSON ONLY:
{
  "intent": "lookup" | "task" | "ambiguous",
  "confidence": <float 0–1>,
  "extracted_entities": {
    "competitors": ["<name>", ...],
    "products":    ["<name>", ...],
    "people":      ["<name>", ...],
    "ticket_codes":["ARG-###", ...]
  }
}
```

Apply: `temperature: 0`, `max_tokens: 300`. On parse error → treat as `ambiguous` with conf 0.3 (safe default — user picks).

Then `/ask` fans out based on intent:
- `lookup` → §7.4 question answering (one Claude call OR pure DB if entity matched cleanly)
- `task` → §7.3 enrichment (one Claude call, returns the draft for §6.0.2)
- `ambiguous` → both in parallel; cap budget at 2× single-intent call

### 7.3 Ticket enrichment (MVP)

Triggered by:
- `POST /api/issues/ask` when `intent = task` (synchronous — result feeds §6.0.2 confirm screen)
- `POST /api/issues/tickets/:id/enrich` (manual re-run on an existing ticket)
- Manual form (§6.1) submit — runs synchronously and merges with user-entered fields before save
- Auto re-run if description changed by >100 chars

Single Claude call. System prompt (Korean comment, English content for AI):

```
You are the triage assistant for ARGOS, LG HS Robotics Research Lab's internal
intelligence portal. A user has filed a ticket. Enrich it with context
from ARGOS internal data so the assignee receives a ready-to-act ticket.

You will be given:
- Ticket title and description
- A list of all competitors in the ARGOS DB (id, name, country, short summary)
- A list of recent strategy documents (v1 — will be empty in MVP)
- A list of candidate assignees and their current workload
- A list of recent open tickets (last 30 days, top 30 by recency) for link detection

Return JSON with EXACTLY these fields:
{
  "type_recommended": "task" | "research" | "response" | "epic",
                       // task: do something concrete
                       // research: investigate / gather information
                       // response: react to a competitor / external event (usually H)
                       // epic: large effort that will spawn child tickets
  "type_rationale": "<one sentence>",
  "title_refined":  "<concise, action-oriented; keep original if already good>",
  "summary_one_line": "<one sentence, decision-ready>",
  "priority_recommended": "H" | "M" | "L",
  "priority_rationale": "<one sentence>",
  "suggested_owner_id": "<uuid or null>",
  "owner_rationale": "<why this person>",
  "suggested_due_at": "<ISO date or null>",
                       // type='response' → shorter default (D+3)
                       // type='research' → longer default (D+14)
                       // type='task'     → D+7 default
                       // type='epic'     → D+30 default
  "linked_competitor_ids": ["<uuid>", ...],
  "linked_strategy_doc_ids": ["<uuid>", ...],
  "suggested_actions": [
    {"step": "<action>", "rationale": "<why>",
     "estimated_effort_hours": <int|null>,
     "requires_competitor_data": <bool>}
  ],
  "suggested_keywords_to_track": ["<keyword>", ...],
  "suggested_links": [
    {"ticket_code": "ARG-###",
     "relation": "blocks" | "duplicates" | "relates_to",
     "reason": "<one sentence — why these are linked>"}
  ]
}

Constraints:
- 2–4 suggested_actions, never more
- 0–3 suggested_links, only if clearly related (NOT just keyword overlap)
- If type='epic', suggested_actions describe child-ticket candidates, not direct steps
- Only link clearly relevant competitors / docs
- Unknown → null (scalars) or [] (arrays). Do not invent.
- Korean output where input is Korean; English otherwise.
- JSON only, no prose, no markdown fences.
```

Apply:
- `temperature: 0.2`
- `max_tokens: 1500`
- Validate response with zod; on parse error log and skip enrichment (do **not** fail ticket creation)
- Store result in `aiSummary`, `aiSuggestedActions`, set `aiEnrichedAt = NOW()`
- Append `issue_activity` row: `ai_enriched` with `fieldsUpdated[]`

### 7.4 Question answering / search (MVP)

Used by `POST /api/issues/ask` when `intent = lookup`, and also exposed as `GET /api/issues/search?q=<query>` for direct/saved use.

Retrieval-first, generation-second. The flow:

1. **Entity match** (no Claude call): if `extracted_entities` from §7.2 cleanly hits a competitor / product / ticket code in the DB, fetch directly and return — no LLM in the loop. This is the fast path for the canonical "Figure 현재 정보 보여줘" case.
2. **Structured ticket query** (Claude call): when the user wants a list of tickets ("지난주 지연된 거", "내가 발행한 것 중 진행중"), call Claude to convert query → filter JSON, translate to Drizzle, return.
3. **Hybrid summary** (Claude call): when retrieval returns multiple sources, optionally call Claude once to summarize them into one paragraph (off by default in MVP; flag `ASK_SUMMARY_ENABLED`).

Structured-query prompt:

```
Convert the user's Korean/English natural-language question about issue tickets
into a structured query.

Available filters: status (list), priority (list), reporter_id, owner_id,
competitor_id, created_after (ISO date), due_before (ISO date),
has_overdue (bool), keyword_in_title_or_desc (string).

User query: "{user_query}"
Today's date: {today_iso}

Return JSON only:
{"filters": {...}, "sort": "created_at_desc"|"priority_h_first"|"due_asc",
 "limit": <int, default 20>}
```

Fallback chain (each step only if the prior returned empty):
1. Entity match (no LLM)
2. Structured ticket query (one LLM call)
3. Simple `keyword_in_title_or_desc` ILIKE (no LLM)

Answer panel (§6.0.1) is assembled from: matched competitor cards (§9.1) + recent articles (§9.1) + related tickets (this section's results). No vector search in MVP or v1.

### 7.5 Daily brief (v1)

Cron at 07:30 KST. For each user who has reported or owns ≥1 open ticket (and opted in — see §7.7):

1. Fetch their tickets where status NOT IN ('done','cancelled')
2. Fetch last 24h activity for those tickets
3. Single Claude call:

```
You write a one-paragraph morning brief for an LG team member about their open
issue tickets (tickets they reported or own). Tone: concise, factual,
decision-oriented. Korean.

Inputs:
- {n} open tickets with status, owner, due date, last 24h activity

Rules:
- 2–4 sentences total
- Lead with overdue / blocked items (use ⚠)
- Mention any item awaiting a decision from the reader (use ☞)
- Only what matters today
- If nothing notable, say so briefly
```

Cron implementation: existing repo already has scheduling concepts; pick the simplest of:
- `node-cron` if not already in use
- A small `setInterval` loop in the backend (single-instance OK)
- OS-level cron via Railway scheduled jobs

Store result in `issue_daily_briefs` (table added in v1 migration, not in MVP).

### 7.6 Meeting notes → tickets (v2)

User pastes meeting notes. Claude extracts action items as draft tickets. Each draft requires human confirmation before insertion.

### 7.7 Cost management

- Cache `aiSummary` / `aiSuggestedActions`; only regenerate on description change >100 chars
- `/ask` results cached per (userId, normalized query) for 5 min — repeat queries hit cache, not Claude
- `lookup` intent: skip the §7.4 step-3 hybrid summary unless `ASK_SUMMARY_ENABLED=true`
- `ambiguous` intent: cap fan-out budget at 2× single call (skip enrichment if entity match already succeeded)
- Daily brief: skip users with no changes since previous brief
- `ANTHROPIC_DAILY_TOKEN_BUDGET` env var; circuit-break if exceeded; fall back to non-AI mode — `/ask` degrades to keyword search + manual form
- Log every Claude call to `issue_ai_call_log` table (added in MVP migration, since MVP now depends on Claude)

### 7.8 Failure handling

AI failures must never block core operations:

| Operation | If AI fails |
|---|---|
| `/ask` intent classification | Treat as `ambiguous` with low confidence; show both panels |
| `/ask` enrichment (task branch) | Pre-fill only title/description from raw query, leave priority/owner/links blank; user fills in confirm screen |
| `/ask` answer (lookup branch) | Skip summary; show raw retrieval results (competitor card + articles + tickets) |
| Manual-form ticket creation | Save without enrichment; show "AI 분석 실패" badge; allow manual retry |
| Search | Fall back to keyword `ILIKE` |
| Daily brief | Skip sending; log error |
| Dashboard query | Show error toast; revert to filter UI |

---

## 8. Notification System

### 8.1 Channels (priority order)

| Channel | MVP | v1 | v2 |
|---|---|---|---|
| In-app (WS + bell icon) | ◉ |  |  |
| Email (SMTP) | ◉ |  |  |
| LG internal messenger |  | ◉ |  |
| KakaoTalk personal (알림톡) |  |  | ◉ |

> **DECISION REQUIRED** (ask user at v1): LG internal messenger choice — Kakao Work, Sandwork, Microsoft Teams, or Slack.

### 8.2 Notification matrix

| Event | Reporter | Owner | Mentioned | Others |
|---|---|---|---|---|
| Ticket created | self (confirmation) | — | — | — |
| Auto-triage to owner | — | email + in-app | — | — |
| Comment added | in-app (or daily digest if opted-in) | in-app | in-app + email | — |
| Comment by reporter | — | email + in-app + msgr (v1) | — | — |
| Status → blocked | email immediate | in-app | — | — |
| Status → done | email + in-app | in-app | — | — |
| Overdue (T-0) | email immediate | email immediate | — | — |
| Overdue (T+1, T+3) | email | email + msgr (v1) | — | — |
| Daily brief | email 07:30 (v1, opt-in) | — | — | — |

### 8.3 Implementation

- `issue_notifications` rows written **synchronously** in the request that triggers them
- Email sent via background fire-and-forget task. MVP: use `nodemailer` (add dep) + plain text; promote to queue (BullMQ / Redis) when volume justifies
- WebSocket push: in-memory pub/sub for MVP (single Railway instance). Promote to Redis pub/sub when scaling out
- Email template: plain text only for MVP — fast, no rendering issues, forwards cleanly

### 8.4 Email template (MVP)

```
[ARGOS] {ticket.code} 상태 변경: {ticket.title}

상태: {oldStatus} → {newStatus}
담당: {owner.name} {owner.title}
우선순위: {priorityKr}
마감: {dueAtHuman}

{aiSummary or empty}

링크: {ISSUE_FRONTEND_BASE_URL}/issues/{ticket.code}

---
ARGOS Issue Tracking
```

Subject patterns:
- New assignment: `[ARGOS] 신규 할당: {code} {title}`
- Status change: `[ARGOS] {code} {newStatusKr}`
- Overdue: `[ARGOS] ⚠ 지연: {code} {title}`
- Daily brief: `[ARGOS] {date} 이슈 브리프`

---

## 9. ARGOS Integration Adapters

Adapters live in `packages/backend/src/issues/adapters/`. Each is a thin TS module wrapping Drizzle queries on existing tables. **Do not** import target module internals; if helpers don't exist, write them.

### 9.1 Competitors (MVP — required by `/ask` and enrichment)

Reads from `companies` (and optionally `humanoidRobots` for robot-specific tickets). Promoted to MVP because the §6.0.1 lookup-answer panel and §7.3 enrichment both depend on this adapter.

```ts
// packages/backend/src/issues/adapters/competitorAdapter.ts
export interface CompetitorBrief { id: string; name: string; country: string; summary: string; }

export async function listAllCompetitors(): Promise<CompetitorBrief[]>;
export async function getCompetitor(id: string): Promise<CompetitorBrief | null>;
export async function getCompetitorRecentArticles(id: string, days = 30): Promise<ArticleBrief[]>;
   // joins companies → articleCompanies → articles

// MVP additions for /ask lookup branch:
export async function searchCompetitorsByName(query: string, limit = 5): Promise<CompetitorBrief[]>;
   // ILIKE on companies.name + alias table; used by §7.2 entity-match fast path
export async function getCompetitorWithContext(id: string): Promise<{
  competitor: CompetitorBrief;
  recentArticles: ArticleBrief[];
  relatedTickets: { code: string; title: string; status: string; progressPct: number }[];
}>;
   // single bundled fetch for the §6.0.1 answer panel
```

Used during `/ask` lookup branch (§6.0.1), AI enrichment (§7.3), and on ticket detail page (`LinkedContextPanel`).

### 9.2 What-If (cloid-simulator)

```ts
// packages/backend/src/issues/adapters/whatifAdapter.ts
export interface ScenarioBrief { id: string; name: string; createdAt: string; }
export async function attachScenarioResult(ticketId: string, scenarioId: string): Promise<void>;
export async function listScenariosForTicket(ticketId: string): Promise<ScenarioBrief[]>;
```

Storage: a join table `issue_ticket_scenarios (ticket_id uuid, scenario_id uuid, attached_by uuid, at timestamp)` — add in v1 migration. Out of scope for MVP.

### 9.3 Data collection scheduler (keywords)

Write access — register keywords from new tickets so future intel is auto-collected.

```ts
// packages/backend/src/issues/adapters/keywordAdapter.ts
export async function registerKeyword(keyword: string, sourceTicketId: string): Promise<number>;
   // returns keywords.id; if keyword already exists, attach ticket via a join table
   // (issue_ticket_keywords) — table added in v1.
```

When new intel matches a registered keyword, the scheduler should post a system comment on the source ticket(s). Wire this up when the scheduler module is touched (v1).

### 9.4 Strategy Docs / Patent Landscape — DEFERRED

Not implemented in MVP. Adapters exist as stubs returning empty arrays:

```ts
// packages/backend/src/issues/adapters/strategyAdapter.ts
export async function listRecentDocs(_limit = 50) { return []; }
export async function getDoc(_id: string) { return null; }
export async function searchDocs(_q: string, _limit = 10) { return []; }
```

Revisit in v1 — likely targets are `war-room`, `executive`, or `business-strategy` tables. **DECISION REQUIRED** at v1 entry.

### 9.5 PPT closeout (v2)

When a ticket transitions to `done`, optionally generate a closeout report slide using `pptxgenjs` (already in frontend deps) or backend equivalent. Out of MVP / v1.

---

## 10. Auth & Permissions

### 10.1 Reuse existing auth

`@fastify/jwt` is already mounted; `users` table exists with UUID PK. **No schema change required** for this module.

A `users.name` field would help dashboard presentation. Add only if missing — check before writing a migration.

### 10.2 Permission model — flat

**Every authenticated user can do everything in this module.** All write routes use `authMiddleware` only. No `requireRole` calls. No per-action gating. No persona-restricted screens.

```ts
// Every issue route — backend
fastify.post('/tickets',  { preHandler: authMiddleware }, handler);
fastify.patch('/tickets/:id', { preHandler: authMiddleware }, handler);
// ...
```

**There is no `packages/backend/src/issues/permissions.ts` file.** Do not create one. If a future requirement introduces gating, add it then — not preemptively.

Two soft conventions remain but are **enforced in business logic, not by role**, so they apply equally to all users:

| Convention | Rule | Where enforced |
|---|---|---|
| Comment edit window | Author can edit own comment within 15 min of creation | `commentService.update()` checks `authorId === currentUserId` and `createdAt > now - 15min` |
| Ticket cancellation | Reporter can cancel their own ticket; anyone else needs to add a comment explaining why | `ticketService.cancel()` — if `currentUserId !== reporterId` then require non-empty `reason` field |

Both are *self-service guardrails*, not permission walls — they exist so that audit logs are meaningful, not so that users are blocked from doing things.

### 10.3 Sensitive field redaction

None. All fields on a ticket are visible to every authenticated user. If sensitive content needs to be kept out of a ticket, it should not be put in the ticket in the first place.

---

## 11. Implementation Phases

### 11.1 MVP (target ~4.5 weeks / 22 work days)

**Goal**: usable by a team of ~8 for real ticketing. Replace email-as-ticket-system. **The ask-first entry (§6.0) is the differentiator and is non-negotiable for MVP** — without it, this module is just another form-based tracker.

**Definition of Done**:
- [ ] Drizzle schema for all §3 tables (incl. `issue_ticket_links`, `parent_ticket_id` column, `type` column) + sequence/trigger + `issue_ai_call_log`; migration applied locally and on Railway
- [ ] All ◉ endpoints in §4.2 implemented and tested (integration test suite)
- [ ] Existing JWT auth wired (`authMiddleware` only — no role gates per §10.2)
- [ ] **`POST /api/issues/ask` works end-to-end** — intent classification (§7.2), lookup-answer assembly (§7.4), task-draft enrichment (§7.3 with `type_recommended` + `suggested_links`)
- [ ] Ticket type (task/research/response/epic) filterable on overview + inbox; type badge on detail
- [ ] Ticket links (blocks / duplicates / relates_to): create via UI + listed on 연결 tab with reverse-direction labels
- [ ] Parent-child hierarchy: depth-2 enforced in `ticketService`; cycle in `blocks` chain rejected; Epic detail shows children list (read-only)
- [ ] **`/issues/ask` UI** — single input routes to §6.0.1 / §6.0.2 / §6.0.3 panels correctly
- [ ] Confirm screen (§6.0.2) allows inline edit of any prefilled field before publish
- [ ] Fallback "이슈로 발행 →" button always visible on lookup-answer panel
- [ ] Manual form (§6.1) still works as fallback at `/issues/new`
- [ ] Any user can publish a ticket in <30 seconds via `/ask` (manual test)
- [ ] Overview dashboard shows signal-light cards correctly
- [ ] Inbox shows assigned tickets sorted by priority + due
- [ ] Comments work; @mentions create notifications
- [ ] Email notifications send on: assign, comment, status change
- [ ] WebSocket pushes new tickets / comments to every connected user
- [ ] Competitor adapter (§9.1) returns search results and bundled context for `/ask`
- [ ] AI cost circuit breaker (§7.7) trips correctly when `ANTHROPIC_DAILY_TOKEN_BUDGET` exceeded; UI degrades to keyword search + manual form without errors
- [ ] 8 simultaneous users can use without errors
- [ ] Logs visible on Railway
- [ ] README in `packages/backend/src/issues/README.md` and `packages/frontend/src/app/issues/README.md`

**Out of MVP** (deferred to v1):
- Voice input (manual typing only in MVP)
- Strategy doc adapter (§9.4 — DECISION REQUIRED at v1)
- Data scheduler integration (§9.3) — keyword auto-registration
- Daily brief (§7.5)
- Triage queue page (anyone edits tickets directly from inbox/overview)
- Kanban board page
- Internal messenger notifications
- Mobile PWA shell
- AI cost dashboard UI (logging exists, dashboard doesn't)
- `/ask` hybrid summary step (§7.4 step 3 — off by default in MVP)

### 11.2 v1 (additional ~4–5 weeks)

- Voice input (Whisper or equivalent) on `/ask` and `/new`
- Triage queue page (`/issues/triage`)
- Kanban page (`/issues/kanban`) — columns may be grouped by status or by type (toggle)
- Epic detail: add child UI (`+ 하위 이슈 추가` in-place), Epic progress = avg of children's `progressPct`, Epic-grouped cards on overview
- AI `suggested_links` accept/reject UI on confirm screen (§6.0.2)
- Strategy adapter decision (§9.4) — wire up after user picks target tables
- Data scheduler integration (§9.3) — keyword auto-registration; system comments on matched articles
- Daily brief email at 07:30 KST (§7.5)
- In-app notification panel with read/unread
- LG internal messenger notifications (after user decides which)
- Audit log UI on ticket detail
- Mobile PWA shell + responsive overview screens
- AI cost dashboard (reads from `issue_ai_call_log`)
- `issue_ticket_scenarios` and `issue_ticket_keywords` join tables
- `/ask` hybrid summary step (§7.4 step 3) on by default

### 11.3 v2 (additional ~4–6 weeks)

- Saved/advanced search page
- "Ask about progress" inline on overview dashboard ("ARG-042 어떻게 돼가?")
- Meeting notes → ticket extraction (§7.6)
- PPT closeout generation on ticket done (§9.5)
- What-If scenario attachment UI (§9.2)
- Duplicate detection on creation
- Watcher / observer feature
- Bulk operations
- Webhooks (Linear/Jira mirror if needed later)

---

## 12. Directory Structure

```
packages/
├── backend/
│   └── src/
│       ├── db/
│       │   ├── schema.ts                  ← add issue_* tables here
│       │   └── migrations/                ← drizzle-kit output
│       ├── routes/
│       │   ├── index.ts                   ← register issue routers
│       │   └── issues/                    ← NEW
│       │       ├── tickets.ts
│       │       ├── comments.ts
│       │       ├── attachments.ts
│       │       ├── dashboard.ts
│       │       ├── notifications.ts
│       │       └── ws.ts
│       ├── issues/                        ← NEW (services + ai + adapters)
│       │   ├── README.md
│       │   ├── schemas.ts                 (zod request/response)
│       │   ├── services/
│       │   │   ├── ticketService.ts
│       │   │   ├── commentService.ts
│       │   │   ├── notificationService.ts
│       │   │   └── transitionRules.ts
│       │   ├── ai/                        (MVP — see §7)
│       │   │   ├── client.ts
│       │   │   ├── askRouter.ts           (intent classification §7.2 + fan-out)
│       │   │   ├── enrichment.ts          (§7.3 — used by /ask task branch + /enrich)
│       │   │   ├── questionAnswering.ts   (§7.4 — used by /ask lookup branch + /search)
│       │   │   ├── costGuard.ts           (circuit breaker §7.7)
│       │   │   ├── dailyBrief.ts          (v1)
│       │   │   └── prompts/
│       │   │       ├── intent.txt
│       │   │       ├── enrichment.txt
│       │   │       ├── search.txt
│       │   │       └── dailyBrief.txt
│       │   ├── adapters/
│       │   │   ├── competitorAdapter.ts   (MVP — required by /ask)
│       │   │   ├── strategyAdapter.ts     (stub in MVP, real in v1)
│       │   │   ├── keywordAdapter.ts      (v1)
│       │   │   └── whatifAdapter.ts       (v2)
│       │   └── tasks.ts                   (background jobs, cron)
│       └── __tests__/
│           └── issues/
│               ├── tickets.crud.test.ts
│               ├── ask.intent.test.ts     (§7.2 with mocked Claude)
│               ├── ask.enrichment.test.ts (§7.3)
│               ├── ask.lookup.test.ts     (§7.4)
│               ├── transitions.test.ts
│               └── websocket.test.ts
│
├── frontend/
│   └── src/
│       ├── app/issues/                    ← NEW (routes — see §5.2)
│       ├── components/issues/             ← NEW
│       ├── hooks/issues/                  ← NEW
│       ├── lib/issues-api.ts              ← NEW
│       └── stores/issueUIStore.ts         ← NEW
│
├── shared/
│   └── src/issues.ts                      ← shared types (TicketRead, etc.)
│
└── docs/issues/
    └── SPEC.md                            ← THIS FILE
```

---

## 13. Environment Variables

Add to existing `.env` / Railway environment. Document in `packages/backend/src/issues/README.md`.

```bash
# ─── Required ────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...               # Claude API
DATABASE_URL=postgresql://...              # existing shared DB
JWT_SECRET=...                             # existing

# ─── Email (MVP) ─────────────────────────────────────────
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
SMTP_FROM=argos-noreply@lge.com            # confirm with user before sending

# ─── Issue module ────────────────────────────────────────
ISSUE_FRONTEND_BASE_URL=https://robot-info-personal.up.railway.app
ISSUE_MODULE_ENABLED=false                 # feature flag (§16.3)
ISSUE_AI_ENABLED=false                     # v1 — enable when AI lands
ISSUE_AI_MODEL_FAST=claude-sonnet-4-6
ISSUE_AI_MODEL_DEEP=claude-opus-4-7
ANTHROPIC_DAILY_TOKEN_BUDGET=2000000       # circuit-break

# ─── Optional ────────────────────────────────────────────
WHISPER_API_KEY=...                        # voice input (v1)
KAKAO_WORK_WEBHOOK=...                     # internal messenger (v1)
SENTRY_DSN=...                             # error tracking (optional)
```

---

## 14. Dependencies

### 14.1 Backend (additions to `packages/backend/package.json`)

Already present: `@anthropic-ai/sdk`, `@fastify/cors`, `@fastify/jwt`, `@fastify/multipart`, `drizzle-orm`, `drizzle-kit`.

To add:
```
@fastify/websocket    ^10.x   # WebSocket support
zod                   ^3.x    # request validation
nodemailer            ^6.x    # SMTP
node-cron             ^3.x    # daily brief scheduling (v1) — or use Railway cron
```

### 14.2 Frontend (additions to `packages/frontend/package.json`)

Already present: `@tanstack/react-query`, `zustand`, `tailwindcss`, `lucide-react`, `clsx`, `tailwind-merge`, `@anthropic-ai/sdk`.

To add:
```
react-hook-form           ^7.x
zod                       ^3.x
@hookform/resolvers       ^3.x
react-markdown            ^9.x
rehype-sanitize           ^6.x
date-fns                  ^3.x
```

Check versions against existing repo to avoid conflicts. No new state library — Zustand and TanStack Query cover it.

### 14.3 Shared

Create `packages/shared/src/issues.ts` re-exporting:
- TS interfaces from §4.3
- zod schemas if both backend and frontend need them (e.g., `TicketCreateSchema`)

---

## 15. Testing Strategy

### 15.1 Backend (Vitest — already configured)

- **Unit**: `transitionRules`, `permissions`, prompt formatters, AI response parsers
- **Integration**: HTTP endpoints with `fastify.inject()` + a test database (use existing `__tests__/integration` pattern)
- **Don't test**: ORM column types, framework internals

Coverage target: 70%+ on `services/` and `issues/ai/`.

### 15.2 Frontend

- Component tests via Vitest + React Testing Library (set up if not present) for: `TicketCard`, `MentionInput`, `VoiceInputButton` (v1), `AskInput`, `ConfirmDraftForm`, `LookupAnswerPanel`
- E2E with Playwright (add if not present) — 5–10 scenarios on PR:
  - User types ask → lookup answer → fallback "이슈로 발행" → confirm screen → publish → sees ticket on overview
  - User types ask → task draft → edits priority → publishes
  - Recipient opens email link → ticket detail loads
  - Status transition through full lifecycle

### 15.3 AI testing

Tricky — non-deterministic output:
- Test plumbing (prompt assembly, response parsing, error handling) with **mocked** Claude responses
- Test prompts manually with a fixed set of 10 example tickets; review outputs
- Golden examples file: `packages/backend/src/issues/ai/goldenExamples.jsonl` — re-run and review diffs when prompts change

Do **not** write unit tests asserting specific Claude output strings.

---

## 16. Deployment (Railway)

### 16.1 Migration strategy

- Drizzle migrations generated via `npm --workspace=@rcip/backend run migrate:generate`
- Run via `npm --workspace=@rcip/backend run migrate` (or as Railway release command — confirm existing setup)
- Test rollback path on staging if available before destructive migrations

### 16.2 Environment separation

- `production` (current Railway service)
- `staging` (optional sibling service, separate DB, separate `ANTHROPIC_API_KEY` with low budget)
- For MVP, develop on production with feature flag `ISSUE_MODULE_ENABLED=false`

### 16.3 Feature flag

```ts
// packages/backend/src/issues/index.ts
export const ISSUE_MODULE_ENABLED =
  (process.env.ISSUE_MODULE_ENABLED ?? 'false').toLowerCase() === 'true';
```

In [packages/backend/src/routes/index.ts](packages/backend/src/routes/index.ts):
```ts
import { ISSUE_MODULE_ENABLED } from '../issues';
if (ISSUE_MODULE_ENABLED) {
  await app.register(import('./issues/tickets'),       { prefix: '/api/issues' });
  await app.register(import('./issues/comments'),      { prefix: '/api/issues' });
  // ...
}
```

Frontend mirror via `NEXT_PUBLIC_ISSUE_MODULE_ENABLED`. When `false`, the `/issues/*` routes render a "준비 중" placeholder and the nav entry hides.

### 16.4 Rollout

1. Deploy with flag OFF, verify migrations applied, no regressions
2. Flip flag for 2 pilot users (manual list via `ISSUE_MODULE_ALLOWED_USERS=<csv of user IDs>`)
3. Use for 1 week; collect feedback
4. Open to full team
5. Remove flag at v1 release

---

## 17. Claude Code Working Guide

### 17.1 Pre-flight checklist

Before starting any task in this module:

- [ ] Read §1 (Context) and §2 (Architecture) end-to-end
- [ ] Identify the current phase (§11) — usually stated by user
- [ ] Confirm the specific deliverable; if ambiguous, ask
- [ ] Inspect existing code structure (`ls packages/backend/src/routes/`, `ls packages/frontend/src/app/`); don't assume
- [ ] Confirm `users` table shape (`grep -A 15 "export const users" packages/backend/src/db/schema.ts`)
- [ ] Check what's already wired in `routes/index.ts` so new routes follow the same registration pattern

### 17.2 Task decomposition

Break each phase into ~1-day chunks. **Don't try to implement an entire phase in one session.**

**MVP suggested chunking** (~22 work days):

| Day | Deliverable |
|---|---|
| 1  | Drizzle schema for §3 tables (incl. `type`, `parent_ticket_id`, `issue_ticket_links`) + sequence + trigger + `issue_ai_call_log`; migration generated and applied |
| 2  | Service layer: ticketService (CRUD), commentService + zod schemas; **depth-2 parent guard + cycle check for blocks** in transitionRules |
| 3  | Routes: `tickets.ts` CRUD endpoints; `authMiddleware` only (no role gates, see §10.2) |
| 4  | Routes: `comments.ts` + `attachments.ts`; notification rows on @mention |
| 5  | Status transition rules (§4.4); activity log writes; tests |
| 6  | Routes: `dashboard.ts` (overview + inbox); `progressPct` derivation |
| 7  | `@fastify/websocket` install + `ws.ts` broadcast logic |
| 8  | Email sender (`nodemailer`) + templates; background fire-and-forget |
| 9  | **AI client** (`issues/ai/client.ts`), prompt-cache helpers, `issue_ai_call_log` writes, cost circuit breaker (§7.7) |
| 10 | **Competitor adapter** (§9.1) — `searchCompetitorsByName`, `getCompetitorWithContext` + tests |
| 11 | **`/api/issues/ask` route**: intent classification (§7.2) + fan-out skeleton |
| 12 | **`/ask` enrichment branch** (§7.3) — produces task draft for confirm screen |
| 13 | **`/ask` lookup branch** (§7.4) — entity match + structured query, no hybrid summary in MVP |
| 14 | Frontend scaffolding: routes under `app/issues/`, API client, shared types, theme verify |
| 15 | **`/issues/ask` page** — single input + intent routing skeleton |
| 16 | **§6.0.1 lookup-answer panel** + §6.0.3 ambiguous panel + fallback button wiring |
| 17 | **§6.0.2 confirm screen** — inline field editors + publish flow |
| 18 | Manual form (§6.1) at `/issues/new` + `IssueCreatePage` + `OverviewDashboardPage` (signal-light cards) |
| 19 | `InboxPage` + **`TicketDetailView` shared component** + **`TicketDetailModal` + `useTicketModal` hook** (§6.6 dual modal/page) + `[code]/page.tsx` full page + `CommentThread` + `MentionInput` + activity tab + WebSocket hook |
| 20 | **`TicketLinksPanel`** (연결 탭): create/list/delete + ARG-### autocomplete; activity-log entries on link create/delete |
| 21 | **Epic surfaces**: parent breadcrumb on detail; type badge; children list (read-only in MVP); `type` filter on overview/inbox |
| 22 | Email link → ticket detail flow; edge cases (15-min comment edit window, cancel-with-reason, depth-2 parent rejection); E2E happy-path test (ask → confirm → publish → link → comment → notify); README writeup; user onboarding walkthrough |

Each day: working code, committed, **pushed** (per standing preference), brief writeup.

### 17.3 Decisions requiring user confirmation

Stop and ask before:

1. Modifying any existing table (even adding columns to `users`)
2. Adding any external SaaS dependency beyond Anthropic + SMTP
3. Changing URL structure of existing ARGOS routes
4. Decisions marked **"DECISION REQUIRED"** in this doc (search this file for that string)
5. Anything where the spec is silent and the answer affects UX

### 17.4 Conventions

**TypeScript**:
- `"strict": true` (already on)
- No `any` — use `unknown` and narrow
- Functional React components only
- Hooks first; custom hooks for cross-component logic
- Files <~200 lines; split if larger

**Drizzle / Backend**:
- All new tables prefixed `issue_`
- Services return plain objects; let routes serialize
- `async/await` everywhere; no callbacks
- One Fastify route file per resource (`tickets.ts`, `comments.ts`, …); register in `routes/index.ts`
- No bare `catch` swallowing — log at minimum

**Next.js**:
- Server components by default; mark interactive ones `'use client'`
- TanStack Query for client-side data; no SWR
- Route segments use kebab-case folders (e.g., `overview/`, not `Overview/`)
- File-based routing — no React Router

**Git**:
- Conventional commits: `feat(scope):`, `fix(scope):`, `chore(scope):`, `docs(scope):`
- Scope: phase + module — `mvp/issues-tickets`, `mvp/issues-ui`, `v1/issues-ai`
- One PR per chunk in §17.2
- **Push after every commit** (per user standing preference)

**Korean text in code**:
- User-facing strings either inline in JSX (existing convention in this repo — check) or in a small i18n module if expanded later
- Log messages and code comments in **English**; commit messages may be Korean for clarity to the user

---

## Appendix A

### A.1 References

- Existing PM module ([packages/backend/src/routes/pm.ts](packages/backend/src/routes/pm.ts), [packages/frontend/src/components/pm/](packages/frontend/src/components/pm/)) — closest existing analog; mirror its patterns where reasonable
- Drizzle docs: <https://orm.drizzle.team>
- Fastify docs: <https://fastify.dev>
- Next.js App Router: <https://nextjs.org/docs/app>
- `@anthropic-ai/sdk`: see `claude-api` skill in this repo

### A.2 Terminology (Korean ↔ English)

| Korean | English (code) | Notes |
|---|---|---|
| 이슈 | issue / ticket | use `ticket` in code, `이슈` in UI |
| 사용자 | user | this module has no role distinctions (§1.3, §10.2) |
| 발행 | create / publish | `발행` in UI button label |
| 과제 | task | type=`task` — generic do-something ticket; default |
| 조사 | research | type=`research` — investigate / gather info |
| 대응 | response | type=`response` — react to competitor / external event; usually H |
| 에픽 | epic | type=`epic` — top-level parent for multiple child tickets |
| 하위 이슈 | child ticket | depth limited to 1 (Epic → child); sub-sub-task forbidden |
| 차단 | blocks | link relation; reverse displayed as "blocked by" |
| 중복 | duplicates | link relation; reverse displayed as "duplicated by" |
| 관련 | relates_to | link relation; symmetric label both sides |
| 우선순위 상/중/하 | priority H/M/L | |
| 검토중 | triaged | initial owner not yet acknowledged |
| 진행중 | in_progress | owner acknowledged via first comment |
| 보류 | blocked | |
| 완료 | done | |
| 취소 | cancelled | |
| 발행자 | reporter | |
| 담당자 | owner / assignee | |

### A.3 Naming rules

- Tables: snake_case with `issue_` prefix (`issue_tickets`, `issue_comments`)
- TS variables/functions: camelCase (`createTicket`, `ticketId`)
- React components: PascalCase (`TicketCard.tsx`)
- API paths: kebab-case (`/api/issues/tickets/:id/regenerate-summary`)
- Ticket codes: `ARG-{nnn}` (uppercase, hyphen, zero-padded)
- Env vars: SCREAMING_SNAKE with `ISSUE_` or `ANTHROPIC_` prefix
