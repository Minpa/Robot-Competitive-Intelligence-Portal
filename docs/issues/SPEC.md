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
3. §11 Implementation Phases → what to build now
4. §3–§9 → detailed specs for current phase
5. §17 Working Guide → operational rules

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

An **executive-driven issue tracking system** built natively, not bolted on. Differentiation from Linear / Jira / GitHub Issues:

> When an executive files a ticket, the ticket arrives at the assignee's inbox already enriched with relevant ARGOS context (linked competitors, related strategy material, suggested actions). The system is not a blank ticket queue — it is a contextual workflow.

### 1.3 User personas & role mapping

Existing `users.role` enum is `admin | analyst | viewer`. The original product spec described four personas (executive, leader, senior, member); for MVP we **compress to the existing three**:

| Persona (display) | Korean | DB role | Examples | Primary screens |
|---|---|---|---|---|
| Executive | 임원 (본부장, 연구센터장) | `admin` | Sponsor | `/issues/new`, `/issues/executive` |
| Leader | 리더 + 책임 | `analyst` | Team leads, senior researchers | Inbox, Kanban, Triage |
| Member | 실무자 | `viewer` | Engineers | Assigned tickets |

UI shows persona labels (`임원`, `리더`, `실무자`), code uses DB roles (`admin`/`analyst`/`viewer`). Mapping table lives in [permissions.ts](packages/backend/src/issues/permissions.ts) so changing it is one edit. Permissions matrix in §10.2.

### 1.4 Goals

| ID | Goal | Success metric |
|----|------|---------------|
| G1 | Executives file tickets in <30 s | Time from `+ New` click → submit |
| G2 | Tickets arrive enriched with ARGOS context | % tickets with ≥1 auto-linked competitor / strategy item |
| G3 | Executives see status at a glance | Time-to-answer for "status of X" ≤ 5 s |
| G4 | No double data entry — ARGOS context auto-flows in | 0 manual lookups during creation |
| G5 | Self-hosted; no external SaaS for core data | All ticket data in shared PostgreSQL |

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
| `linked` | ARGOS context linked | `{ type, targetIds }` |
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

No deletes. Use `status='cancelled'`. Reasoning: audit trail for executive visibility. `closedAt` is set on `done` OR `cancelled`.

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
◉ POST   /api/issues/tickets              Create ticket
◉ GET    /api/issues/tickets              List tickets (with filters)
◉ GET    /api/issues/tickets/:id          Get single ticket (with comments, activity)
◉ PATCH  /api/issues/tickets/:id          Update ticket
  DELETE /api/issues/tickets/:id          (NOT IMPLEMENTED — use PATCH status=cancelled)

◉ POST   /api/issues/tickets/:id/comments      Add comment
◉ GET    /api/issues/tickets/:id/comments      List comments
◉ PATCH  /api/issues/comments/:id              Edit comment (author only, within 15min)

◉ POST   /api/issues/tickets/:id/attachments   Upload file (multipart)
  GET    /api/issues/attachments/:id           Get download URL

◉ GET    /api/issues/dashboard/executive       Executive dashboard data
◉ GET    /api/issues/dashboard/inbox           User's inbox (assigned + mentioned)
  GET    /api/issues/dashboard/kanban          Kanban board data

  POST   /api/issues/tickets/:id/enrich               Trigger Claude enrichment   (v1)
  POST   /api/issues/tickets/:id/regenerate-summary   (v1)

  GET    /api/issues/notifications              List notifications for current user
  POST   /api/issues/notifications/:id/read     Mark as read
  POST   /api/issues/notifications/mark-all-read

  GET    /api/issues/search                     Natural language search (Claude-backed) (v2)
  POST   /api/issues/from-meeting               Extract tickets from meeting notes      (v2)

  WS     /ws/issues                             Real-time updates
```

### 4.3 Request/Response shapes (zod + TS)

```ts
// packages/backend/src/issues/schemas.ts
import { z } from 'zod';

export const PrioritySchema = z.enum(['H', 'M', 'L']);
export const StatusSchema = z.enum([
  'draft', 'triaged', 'in_progress', 'blocked', 'done', 'cancelled',
]);

// POST /api/issues/tickets — request
export const TicketCreateSchema = z.object({
  title:                z.string().min(1).max(200),
  description:          z.string().default(''),
  priority:             PrioritySchema.default('M'),
  suggestedDepartment:  z.string().optional(),  // free text, executive hint
  voiceInputBlobUrl:    z.string().url().optional(),
});
export type TicketCreate = z.infer<typeof TicketCreateSchema>;

// PATCH /api/issues/tickets/:id — request
export const TicketPatchSchema = z.object({
  title:       z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority:    PrioritySchema.optional(),
  status:      StatusSchema.optional(),
  ownerId:     z.string().uuid().nullable().optional(),
  dueAt:       z.string().datetime().nullable().optional(),
  linkedCompetitorIds:  z.array(z.string().uuid()).optional(),
  linkedStrategyDocIds: z.array(z.string().uuid()).optional(),
  linkedKeywordIds:     z.array(z.number().int()).optional(),
});

// GET /api/issues/tickets — query params
export const TicketListQuerySchema = z.object({
  status:        z.array(StatusSchema).optional(),
  priority:      z.array(PrioritySchema).optional(),
  reporterId:    z.string().uuid().optional(),
  ownerId:       z.string().uuid().optional(),
  competitorId:  z.string().uuid().optional(),
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
}

export interface ExecutiveDashboard {
  summary: { open: number; inProgress: number; blocked: number; overdue: number; doneThisWeek: number };
  cards: TicketCard[];     // tickets reported by this user
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

Broadcast scope (computed per connection from user role):
- Executive (`admin`): all tickets they reported
- Leader (`analyst`): tickets in their team (MVP simplification: all tickets, narrow later)
- Member (`viewer`): tickets they own or are mentioned in

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
├── page.tsx                       → redirect by role
│                                    admin → /issues/executive
│                                    others → /issues/inbox
├── layout.tsx                     → shell w/ nav + notification bell
├── new/page.tsx                   → ticket creation page (executive entry)
├── executive/page.tsx             → executive dashboard (signal-light cards)
├── inbox/page.tsx                 → assigned + mentioned tickets
├── kanban/page.tsx                → kanban board (leaders, members)        v1
├── triage/page.tsx                → triage queue (leaders only)            v1
├── search/page.tsx                → search results                         v2
└── [code]/page.tsx                → ticket detail, e.g. /issues/ARG-042
```

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
│   ├── useExecutiveDashboard.ts
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

## 6. UX Specifications by Persona

UX mockups below are the same as the original spec — they describe visual design and are stack-independent.

### 6.1 Executive — Creation page (`/issues/new`)

Single column, centered, max-width 640px. Memo-pad aesthetic.

```
┌────────────────────────────────────────────────┐
│   ★ 새 이슈 발행                              │
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
│                                                │
│              [  발행 →  ]                     │
└────────────────────────────────────────────────┘
```

Behavior:
- Title autosaves to draft on blur (MVP: skip; v1)
- Voice input → Whisper (v1) → fills title + description
- Submit → POST /api/issues/tickets → redirect to ticket detail with green flash banner
- AI enrichment (v1) kicks off async; show "AI 분석 중..." pill on detail page

Keyboard shortcuts:
- `Cmd/Ctrl + Enter`: submit
- `Cmd/Ctrl + V`: paste (image attaches automatically)
- `Esc`: cancel with confirmation if dirty

### 6.2 Executive — Dashboard (`/issues/executive`)

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

Card click → ticket detail. Hover → tooltip with AI summary (v1) + last comment preview.

`progressPct` derivation (computed in `/dashboard/executive` endpoint):
- `draft` = 5
- `triaged` = 15
- `in_progress` w/ no comments from owner = 30
- `in_progress` w/ ≥1 owner comment = 50
- `in_progress` w/ ≥3 owner comments = 70
- `blocked` = freeze at current value
- `done` = 100

### 6.3 Leader — Triage queue (`/issues/triage`) — v1

List of `status='triaged'` (or just-created without owner). Each row shows AI-suggested owner; leader confirms or overrides.

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

### 6.4 Member — Inbox (`/issues/inbox`)

Default sort: priority DESC, dueAt ASC, then createdAt DESC. Three sections (collapsible):

1. **할당된 이슈** (assigned to me)
2. **언급된 이슈** (mentioned in comments, last 7 days)
3. **관찰중** (watched — v1)

### 6.5 Mobile

PWA — not native. Manifest + service worker (cache static assets only; ticket data always fresh). Mobile screens prioritize:
- `/issues/new` (executive creates on the go)
- `/issues/executive` (status check)
- Ticket detail (read-mostly)

Kanban and Triage are desktop-first; show notice on mobile. Mobile work is v1.

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

### 7.2 Enrichment flow (v1)

Triggered on:
- New ticket creation (async, after HTTP response)
- Manual `POST /tickets/:id/enrich`
- Auto re-run if description changed by >100 chars

Single Claude call. System prompt (Korean comment, English content for AI):

```
You are the triage assistant for ARGOS, LG HS Robotics Research Lab's internal
intelligence portal. An executive has filed a ticket. Enrich it with context
from ARGOS internal data so the assignee receives a ready-to-act ticket.

You will be given:
- Ticket title and description
- A list of all competitors in the ARGOS DB (id, name, country, short summary)
- A list of recent strategy documents (v1 — will be empty in MVP)
- A list of available team members with roles and current workload

Return JSON with EXACTLY these fields:
{
  "title_refined":  "<concise, action-oriented; keep original if already good>",
  "summary_one_line": "<one sentence, executive-readable>",
  "priority_recommended": "H" | "M" | "L",
  "priority_rationale": "<one sentence>",
  "suggested_owner_id": "<uuid or null>",
  "owner_rationale": "<why this person>",
  "linked_competitor_ids": ["<uuid>", ...],
  "linked_strategy_doc_ids": ["<uuid>", ...],
  "suggested_actions": [
    {"step": "<action>", "rationale": "<why>",
     "estimated_effort_hours": <int|null>,
     "requires_competitor_data": <bool>}
  ],
  "suggested_keywords_to_track": ["<keyword>", ...]
}

Constraints:
- 2–4 suggested_actions, never more
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

### 7.3 Natural language search (v2)

`GET /api/issues/search?q=<query>`

NOT vector search for v2 either — keep simple:
1. Call Claude with: user query + minimal schema of tickets table
2. Claude returns structured filter JSON
3. Backend translates to Drizzle query
4. Return results

Prompt:
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

Fallback: invalid filter → simple `keyword_in_title_or_desc` with original query.

### 7.4 Daily brief (v1)

Cron at 07:30 KST. For each executive with ≥1 open ticket:

1. Fetch their tickets where status NOT IN ('done','cancelled')
2. Fetch last 24h activity for those tickets
3. Single Claude call:

```
You write a one-paragraph morning brief for an LG executive about their open
issue tickets. Tone: concise, factual, decision-oriented. Korean.

Inputs:
- {n} open tickets with status, owner, due date, last 24h activity

Rules:
- 2–4 sentences total
- Lead with overdue / blocked items (use ⚠)
- Mention any item awaiting executive decision (use ☞)
- Only what matters today
- If nothing notable, say so briefly
```

Cron implementation: existing repo already has scheduling concepts; pick the simplest of:
- `node-cron` if not already in use
- A small `setInterval` loop in the backend (single-instance OK)
- OS-level cron via Railway scheduled jobs

Store result in `issue_daily_briefs` (table added in v1 migration, not in MVP).

### 7.5 Meeting notes → tickets (v2)

User pastes meeting notes. Claude extracts action items as draft tickets. Each draft requires human confirmation before insertion.

### 7.6 Cost management

- Cache `aiSummary` / `aiSuggestedActions`; only regenerate on description change >100 chars
- Daily brief: skip executives with no changes since previous brief
- `ANTHROPIC_DAILY_TOKEN_BUDGET` env var; circuit-break if exceeded; fall back to non-AI mode (still functional, blank summary)
- Log every Claude call to `issue_ai_call_log` table (v1) for cost auditing

### 7.7 Failure handling

AI failures must never block core ticket operations:

| Operation | If AI fails |
|---|---|
| Ticket creation | Save without enrichment; show "AI 분석 실패" badge; allow manual retry |
| Search | Fall back to keyword search |
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

| Event | Executive (reporter) | Assigned owner | Mentioned | Other team |
|---|---|---|---|---|
| Ticket created | self | — | — | — |
| Auto-triage to owner | — | email + in-app | — | — |
| Comment added | daily digest | in-app | in-app + email | — |
| Executive comment | — | email + in-app + msgr (v1) | — | — |
| Status → blocked | email immediate | in-app | — | — |
| Status → done | email + in-app | in-app | — | — |
| Overdue (T-0) | email immediate | email immediate | — | — |
| Overdue (T+1, T+3) | email | email + msgr (v1) | — | — |
| Daily brief | email 07:30 | — | — | — |

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

### 9.1 Competitors

Reads from `companies` (and optionally `humanoidRobots` for robot-specific tickets).

```ts
// packages/backend/src/issues/adapters/competitorAdapter.ts
export interface CompetitorBrief { id: string; name: string; country: string; summary: string; }

export async function listAllCompetitors(): Promise<CompetitorBrief[]>;
export async function getCompetitor(id: string): Promise<CompetitorBrief | null>;
export async function getCompetitorRecentArticles(id: string, days = 30): Promise<ArticleBrief[]>;
   // joins companies → articleCompanies → articles
```

Used during AI enrichment and on ticket detail page (`LinkedContextPanel`).

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

`@fastify/jwt` is already mounted; `users` table exists with UUID PK. **No schema change required** for MVP — we use the existing `role` column (`admin | analyst | viewer`).

A `users.department` and `users.name` field would help dashboard presentation. Add only if missing — check before writing a migration.

### 10.2 Permission matrix

Display label / DB role correspondence:
- **Executive** = `admin`
- **Leader** = `analyst`  (also covers 책임/senior in the original 4-role spec)
- **Member** = `viewer`

| Action | admin | analyst | viewer |
|---|---|---|---|
| Create ticket | ✓ | ✓ | ✓ |
| View own tickets | ✓ | ✓ | ✓ |
| View all tickets in team | ✓ | ✓ | — |
| View all tickets (org-wide) | ✓ | — | — |
| Assign owner | — | ✓ | — |
| Change priority | reporter only | ✓ | — |
| Change status | — | ✓ | own tickets only |
| Cancel ticket | reporter only | ✓ | — |
| Triage queue access (v1) | ✓ | ✓ | — |
| Daily brief (v1) | ✓ | ✓ (opt-in) | — |

Implement as a Fastify preHandler factory in [packages/backend/src/issues/permissions.ts](packages/backend/src/issues/permissions.ts):

```ts
export function requireRole(...roles: Array<'admin'|'analyst'|'viewer'>) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user as { role: string };
    if (!roles.includes(user.role as any)) return reply.code(403).send({ error: 'forbidden' });
  };
}
```

### 10.3 Sensitive field redaction

For viewers reading tickets not assigned to them, hide `aiSuggestedActions` if marked sensitive (strategy keywords). Over-engineering for MVP — implement only if user requests.

---

## 11. Implementation Phases

### 11.1 MVP (target ~3 weeks / 15 work days)

**Goal**: usable by executive + 5 team members for real ticketing. Replace email-as-ticket-system.

**Definition of Done**:
- [ ] Drizzle schema for all §3 tables + sequence/trigger; migration applied locally and on Railway
- [ ] All ◉ endpoints in §4.2 implemented and tested (integration test suite)
- [ ] Existing JWT auth wired; role-based gates active
- [ ] Executive can create a ticket in <30 seconds (manual test)
- [ ] Executive dashboard shows signal-light cards correctly
- [ ] Inbox shows assigned tickets sorted by priority + due
- [ ] Comments work; @mentions create notifications
- [ ] Email notifications send on: assign, comment, status change
- [ ] WebSocket pushes new tickets / comments to relevant users
- [ ] One executive + 2 leaders + 5 members can use simultaneously without errors
- [ ] Logs visible on Railway
- [ ] README in `packages/backend/src/issues/README.md` and `packages/frontend/src/app/issues/README.md`

**Out of MVP** (deferred to v1):
- Claude AI enrichment (use placeholder/empty fields)
- Voice input
- ARGOS competitor/strategy auto-linking (empty arrays; manual link UI exists)
- Daily brief
- Internal messenger notifications
- Triage queue page (leaders edit tickets directly)
- Natural language search
- Mobile PWA shell

### 11.2 v1 (additional ~4–5 weeks)

- Claude enrichment on ticket creation (§7.2)
- AI summary block on ticket detail
- Triage queue page for leaders
- Competitor auto-linking via §9.1 adapter
- Strategy adapter decision (§9.4) — wire up after user picks target tables
- Data scheduler integration (§9.3) — keyword auto-registration
- Daily brief email at 07:30 KST (§7.4)
- Voice input (Whisper or equivalent)
- In-app notification panel with read/unread
- LG internal messenger notifications (after user decides which)
- Audit log UI on ticket detail
- Mobile PWA shell + responsive executive screens
- AI cost logging table + dashboard
- `issue_ticket_scenarios` and `issue_ticket_keywords` join tables

### 11.3 v2 (additional ~4–6 weeks)

- Natural language search ("지난주 지연된 거 보여줘")
- "Ask about progress" Q&A on dashboard
- Meeting notes → ticket extraction
- PPT closeout generation on ticket done (§9.5)
- What-If scenario attachment UI
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
│       │   ├── permissions.ts
│       │   ├── services/
│       │   │   ├── ticketService.ts
│       │   │   ├── commentService.ts
│       │   │   ├── notificationService.ts
│       │   │   └── transitionRules.ts
│       │   ├── ai/                        (v1+)
│       │   │   ├── client.ts
│       │   │   ├── enrichment.ts
│       │   │   ├── search.ts
│       │   │   ├── dailyBrief.ts
│       │   │   └── prompts/
│       │   │       ├── enrichment.txt
│       │   │       ├── search.txt
│       │   │       └── dailyBrief.txt
│       │   ├── adapters/
│       │   │   ├── competitorAdapter.ts
│       │   │   ├── strategyAdapter.ts     (stub in MVP)
│       │   │   ├── keywordAdapter.ts
│       │   │   └── whatifAdapter.ts
│       │   └── tasks.ts                   (background jobs, cron)
│       └── __tests__/
│           └── issues/
│               ├── tickets.crud.test.ts
│               ├── permissions.test.ts
│               ├── transitions.test.ts
│               ├── enrichment.test.ts     (v1)
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

Coverage target: 70%+ on `services/` and `permissions.ts`.

### 15.2 Frontend

- Component tests via Vitest + React Testing Library (set up if not present) for: `TicketCard`, `MentionInput`, `VoiceInputButton` (v1)
- E2E with Playwright (add if not present) — 5–10 scenarios on PR:
  - Executive creates ticket → sees it on dashboard
  - Member receives email link → opens detail
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
2. Flip flag for executive + 1 leader (manual list via `ISSUE_MODULE_ALLOWED_USERS=<csv of user IDs>`)
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

**MVP suggested chunking** (~15 work days):

| Day | Deliverable |
|---|---|
| 1  | Drizzle schema for §3 tables + sequence + trigger; migration generated and applied |
| 2  | Service layer: ticketService (CRUD), commentService + zod schemas |
| 3  | Routes: `tickets.ts` CRUD endpoints; auth gating via `requireRole` |
| 4  | Routes: `comments.ts` + `attachments.ts`; notification rows on @mention |
| 5  | Status transition rules (§4.4); activity log writes; tests |
| 6  | Routes: `dashboard.ts` (executive + inbox); `progressPct` derivation |
| 7  | `@fastify/websocket` install + `ws.ts` broadcast logic |
| 8  | Email sender (`nodemailer`) + templates; background fire-and-forget |
| 9  | Frontend scaffolding: routes under `app/issues/`, API client, types from `shared/`, theme verify |
| 10 | `IssueCreatePage` + `ExecutiveDashboardPage` (signal-light cards) |
| 11 | `InboxPage` + `TicketDetailPage` (header + tabs) |
| 12 | `CommentThread` + `MentionInput` + activity tab |
| 13 | WebSocket hook on frontend; live update of dashboard + detail |
| 14 | Email link → ticket detail flow; permission edge cases |
| 15 | E2E happy-path test; README writeup; walkthrough doc for executive onboarding |

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
- Route segments use kebab-case folders (e.g., `executive/`, not `Executive/`)
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
| 임원 | executive | DB role `admin` |
| 리더 | leader | DB role `analyst` |
| 책임 | senior | folded into `analyst` for MVP |
| 실무자 | member | DB role `viewer` |
| 발행 | create / publish | `발행` in UI button label |
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
