-- ARGOS Projects 템플릿 시스템 (Phase 2 REQ-18).

CREATE TABLE IF NOT EXISTS "pm_templates" (
	"id" serial PRIMARY KEY,
	"name" varchar(120) NOT NULL,
	"description" text,
	"category" varchar(50),
	"payload" jsonb DEFAULT '{}'::jsonb,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- 시스템 템플릿 5종 시드 (기획자 워크플로우 특화)
-- payload 구조: { boards: [{ name, reportCycle, groups: [{name,color}], columns: [{name,type,settings,width?}] }] }
INSERT INTO "pm_templates" ("name", "description", "category", "payload", "is_system") VALUES
('전시 대응 일정', 'CES·MWC·박람회 등 전시 전후 추진 일정 보드. 사전 준비/현장/사후 그룹 + 마일스톤·담당자', 'event',
 '{"boards":[{"name":"추진 일정","reportCycle":"weekly","groups":[{"name":"사전 준비","color":"#3C6FA5"},{"name":"현장 운영","color":"#A50034"},{"name":"사후 보고","color":"#7E5BB5"}],"columns":[{"name":"기간","type":"timeline","width":200},{"name":"상태","type":"status","width":110,"settings":{"labels":[{"id":1,"name":"예정","color":"#888780"},{"id":2,"name":"진행중","color":"#3C6FA5"},{"id":3,"name":"완료","color":"#3F8C6E"}]}},{"name":"우선순위","type":"priority","width":110,"settings":{"labels":[{"id":1,"name":"High","color":"#C8366E"},{"id":2,"name":"Mid","color":"#D4A22F"},{"id":3,"name":"Low","color":"#3F8C6E"}]}},{"name":"담당자","type":"person","width":140}]}]}'::jsonb,
 true),
('기술보고 추진', '월간/분기 기술보고 작성과 검토 단계를 추적하는 보드. 작성·검토·결재 단계 구분', 'reporting',
 '{"boards":[{"name":"기술보고","reportCycle":"monthly","groups":[{"name":"작성","color":"#3C6FA5"},{"name":"검토","color":"#D4A22F"},{"name":"결재·배포","color":"#3F8C6E"}],"columns":[{"name":"기간","type":"timeline","width":180},{"name":"단계","type":"status","width":110,"settings":{"labels":[{"id":1,"name":"작성중","color":"#3C6FA5"},{"id":2,"name":"검토중","color":"#D4A22F"},{"id":3,"name":"승인","color":"#3F8C6E"},{"id":4,"name":"수정요청","color":"#C8366E"}]}},{"name":"담당자","type":"person","width":120},{"name":"신뢰도","type":"reliability","width":80}]}]}'::jsonb,
 true),
('주간 KPI 추적', '주간 단위 KPI 진척률·달성도 추적 보드 (% progress + status)', 'kpi',
 '{"boards":[{"name":"주간 KPI","reportCycle":"weekly","groups":[{"name":"전략 KPI","color":"#A50034"},{"name":"운영 KPI","color":"#3C6FA5"}],"columns":[{"name":"기간","type":"timeline","width":180},{"name":"진척률","type":"progress","width":120},{"name":"상태","type":"status","width":110,"settings":{"labels":[{"id":1,"name":"정상","color":"#3F8C6E"},{"id":2,"name":"주의","color":"#D4A22F"},{"id":3,"name":"지연","color":"#C8366E"}]}},{"name":"담당자","type":"person","width":120}]}]}'::jsonb,
 true),
('이슈·리스크 관리', '발생한 이슈와 예측되는 리스크를 분리해 등록·추적하는 보드', 'risk',
 '{"boards":[{"name":"이슈 트래커","reportCycle":"weekly","groups":[{"name":"공개 이슈","color":"#C8366E"},{"name":"잠재 리스크","color":"#D4A22F"},{"name":"해소됨","color":"#3F8C6E"}],"columns":[{"name":"발견일","type":"date","width":120},{"name":"심각도","type":"priority","width":110,"settings":{"labels":[{"id":1,"name":"치명","color":"#C8366E"},{"id":2,"name":"높음","color":"#D4A22F"},{"id":3,"name":"보통","color":"#888780"}]}},{"name":"상태","type":"status","width":110,"settings":{"labels":[{"id":1,"name":"검토","color":"#888780"},{"id":2,"name":"대응중","color":"#3C6FA5"},{"id":3,"name":"해소","color":"#3F8C6E"}]}},{"name":"담당자","type":"person","width":120}]}]}'::jsonb,
 true),
('PoC 추진', '제안·검증·완료 단계의 PoC 프로젝트 진행 보드', 'poc',
 '{"boards":[{"name":"PoC 일정","reportCycle":"weekly","groups":[{"name":"제안·평가","color":"#7E5BB5"},{"name":"준비","color":"#3C6FA5"},{"name":"실행","color":"#A50034"},{"name":"평가·완료","color":"#3F8C6E"}],"columns":[{"name":"기간","type":"timeline","width":200},{"name":"단계","type":"status","width":110,"settings":{"labels":[{"id":1,"name":"제안","color":"#7E5BB5"},{"id":2,"name":"준비","color":"#3C6FA5"},{"id":3,"name":"실행중","color":"#A50034"},{"id":4,"name":"완료","color":"#3F8C6E"}]}},{"name":"우선순위","type":"priority","width":110,"settings":{"labels":[{"id":1,"name":"High","color":"#C8366E"},{"id":2,"name":"Mid","color":"#D4A22F"},{"id":3,"name":"Low","color":"#3F8C6E"}]}},{"name":"담당자","type":"person","width":120}]}]}'::jsonb,
 true)
ON CONFLICT DO NOTHING;
