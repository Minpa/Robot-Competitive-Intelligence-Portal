// ARGOS Issue Tracking — zod validation schemas (spec §4.3).
import { z } from 'zod';

export const PrioritySchema = z.enum(['H', 'M', 'L']);
export const StatusSchema = z.enum(['draft', 'triaged', 'in_progress', 'blocked', 'done', 'cancelled']);
export const TypeSchema = z.enum(['task', 'research', 'response', 'epic']);
export const LinkRelationSchema = z.enum(['blocks', 'duplicates', 'relates_to']);

export const TicketCreateSchema = z.object({
  title:                z.string().min(1).max(200),
  description:          z.string().default(''),
  priority:             PrioritySchema.default('M'),
  type:                 TypeSchema.default('task'),
  parentTicketCode:     z.string().regex(/^ARG-\d+$/).optional(),
  ownerId:              z.string().uuid().optional(),
  dueAt:                z.string().datetime().optional(),
  linkedCompetitorIds:  z.array(z.string().uuid()).optional(),
  linkedStrategyDocIds: z.array(z.string().uuid()).optional(),
  linkedKeywordIds:     z.array(z.number().int()).optional(),
});

export const TicketPatchSchema = z.object({
  title:       z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority:    PrioritySchema.optional(),
  status:      StatusSchema.optional(),
  type:        TypeSchema.optional(),
  parentTicketCode: z.string().regex(/^ARG-\d+$/).nullable().optional(),
  ownerId:     z.string().uuid().nullable().optional(),
  dueAt:       z.string().datetime().nullable().optional(),
  linkedCompetitorIds:  z.array(z.string().uuid()).optional(),
  linkedStrategyDocIds: z.array(z.string().uuid()).optional(),
  linkedKeywordIds:     z.array(z.number().int()).optional(),
});

export const TicketLinkCreateSchema = z.object({
  toCode:   z.string().regex(/^ARG-\d+$/),
  relation: LinkRelationSchema,
});

export const CommentCreateSchema = z.object({
  body:             z.string().min(1),
  mentionedUserIds: z.array(z.string().uuid()).optional(),
});

export const AskSchema = z.object({
  query: z.string().min(1).max(2000),
  skipClarification: z.boolean().optional(),
});

export type TicketCreate = z.infer<typeof TicketCreateSchema>;
export type TicketPatch = z.infer<typeof TicketPatchSchema>;
export type TicketLinkCreate = z.infer<typeof TicketLinkCreateSchema>;
export type CommentCreate = z.infer<typeof CommentCreateSchema>;
