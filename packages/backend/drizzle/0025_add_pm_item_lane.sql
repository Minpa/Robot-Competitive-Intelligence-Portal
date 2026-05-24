-- ARGOS Projects — pm_items.lane: Gantt 차선 영속화.
-- NULL = 미배정(자동 packing 대상), 정수 = 사용자/자동 배정된 고정 차선.

ALTER TABLE "pm_items" ADD COLUMN IF NOT EXISTS "lane" integer;
