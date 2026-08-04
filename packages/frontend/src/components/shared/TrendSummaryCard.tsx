'use client';

import type { ComponentType } from 'react';
import {
  Footprints, Hand, Factory, BrainCircuit, Sparkles, Radar, Shapes,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TrendSummaryData {
  summary: string;
  headline?: string;
  points?: { title: string; body: string }[];
  generatedAt?: string;
}

interface Props {
  title?: string;
  loading: boolean;
  data?: TrendSummaryData;
  /** 우측 기간 라벨 (기본: 최근 60일) */
  windowLabel?: string;
}

/**
 * 구버전(평문+마크다운) 요약을 라인 단위로 분해 —
 * **굵은 구절**을 키워드로 보고 다음 굵은 구절 전까지를 설명으로 묶는다.
 */
function parseLegacy(text: string): { lede: string; items: { title: string; body: string }[] } {
  // JSON형 텍스트(생성 실패로 원문이 저장된 경우) — title/body 쌍을 복원
  if (/"title"\s*:/.test(text)) {
    const unesc = (s: string) => {
      try { return JSON.parse(`"${s}"`) as string; } catch { return s; }
    };
    const headlineMatch = text.match(/"headline"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    const items: { title: string; body: string }[] = [];
    const pointRe = /"title"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"body"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = pointRe.exec(text)) !== null) {
      items.push({ title: unesc(m[1] ?? ''), body: unesc(m[2] ?? '') });
    }
    if (items.length > 0) {
      return { lede: headlineMatch ? unesc(headlineMatch[1] ?? '') : '', items };
    }
  }

  const cleaned = text
    .replace(/^#+\s*/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .trim();
  const parts = cleaned.split(/\*\*(.+?)\*\*/g);
  const lede = (parts[0] ?? '').trim();
  const items: { title: string; body: string }[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const title = (parts[i] ?? '').replace(/[:：]\s*$/, '').trim();
    const body = (parts[i + 1] ?? '').replace(/^[\s:：—-]+/, '').trim();
    if (title) items.push({ title, body });
  }
  return { lede, items };
}

// ── 포인트 카테고리 추론 (프론트 키워드 매칭, 트렌드 요약 카드 전용 — VIDEO_TASK_TYPES와 별개) ──

type CategoryKey =
  | 'locomotion'
  | 'manipulation'
  | 'industrial'
  | 'foundation-ai'
  | 'product-reveal'
  | 'autonomy-demo'
  | 'other';

type CategoryTone = 'info' | 'gold' | 'warn' | 'brand' | 'pos' | 'neg' | 'neutral';

interface CategoryMeta {
  label: string;
  icon: ComponentType<{ className?: string }>;
  tone: CategoryTone;
}

const CATEGORY_META: Record<CategoryKey, CategoryMeta> = {
  locomotion: { label: '보행/이동', icon: Footprints, tone: 'info' },
  manipulation: { label: '파지/조작', icon: Hand, tone: 'gold' },
  industrial: { label: '산업/양산', icon: Factory, tone: 'warn' },
  'foundation-ai': { label: '파운데이션모델/AI', icon: BrainCircuit, tone: 'brand' },
  'product-reveal': { label: '신제품 공개', icon: Sparkles, tone: 'pos' },
  'autonomy-demo': { label: '자율성/데모', icon: Radar, tone: 'neg' },
  other: { label: '기타', icon: Shapes, tone: 'neutral' },
};

// 우선순위 순서로 검사 — 먼저 매칭되는 규칙을 채택한다.
const CATEGORY_RULES: { key: CategoryKey; pattern: RegExp }[] = [
  {
    key: 'locomotion',
    pattern: /보행|이동성|주행|계단|지형|파쿠르|균형감?|달리기|점프|워킹|백플립|파워워킹|locomotion|\bwalk(ing)?\b|\bgait\b|\brun(ning)?\b|\bstairs?\b/i,
  },
  {
    key: 'manipulation',
    pattern: /파지|조작|그리퍼|그립|핸드|손가락|촉각|집기|잡기|매니퓰레이션|manipulat|\bgrasp(ing)?\b|\bgripper\b|dexter/i,
  },
  {
    key: 'industrial',
    pattern: /산업|공장|양산|생산|물류|창고|조립|현장\s?투입|출하|납품|생산라인|생산능력|factory|industrial|mass.?produc|warehouse|assembly\s?line/i,
  },
  {
    key: 'foundation-ai',
    pattern: /파운데이션|엔드투엔드|end-?to-?end|강화학습|모방학습|딥러닝|인공지능|알고리즘|정책\s?학습|파운데이션\s?모델|\bVLA\b|\bAI\b|foundation model|reinforcement learning|imitation learning|world model/i,
  },
  {
    key: 'product-reveal',
    pattern: /공개|출시|발표|신제품|신형|런칭|첫\s?선|unveil|launch|reveal|introduc(e|ed|tion)?|announce/i,
  },
  {
    key: 'autonomy-demo',
    pattern: /자율|데모|시연|퍼포먼스|쇼케이스|전시|부스|autonom|\bdemo(nstration)?\b|showcase|exhibition/i,
  },
];

function inferCategory(title: string, body: string): CategoryKey {
  const text = `${title} ${body}`;
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(text)) return rule.key;
  }
  return 'other';
}

const TONE_ICON_CLASSES: Record<CategoryTone, string> = {
  neutral: 'bg-ink-100 text-ink-600',
  brand: 'bg-brand text-white',
  gold: 'bg-gold-soft text-gold',
  pos: 'bg-pos-soft text-pos',
  warn: 'bg-warn-soft text-warn',
  neg: 'bg-neg-soft text-neg',
  info: 'bg-info-soft text-info',
};

function PointCard({ title, body }: { title: string; body: string }) {
  const category = inferCategory(title, body);
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  return (
    <div className="flex h-full flex-col gap-2 rounded-[10px] border border-ink-200 bg-paper/50 p-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex w-7 h-7 shrink-0 items-center justify-center rounded-full',
            TONE_ICON_CLASSES[meta.tone]
          )}
          aria-hidden
        >
          <Icon className="w-3.5 h-3.5" />
        </span>
        <span className="text-[10px] font-mono font-medium uppercase tracking-[0.16em] text-ink-500">
          {meta.label}
        </span>
      </div>
      <p className="text-[13.5px] font-semibold leading-snug text-ink-900">{title}</p>
      {body && <p className="text-[12.5px] leading-relaxed text-ink-600">{body}</p>}
    </div>
  );
}

/**
 * AI 트렌드 요약 카드 (그리드형 디자인)
 * 헤더(닷 + 라벨 + 기간) → 리드 문장 → 포인트별 카테고리 아이콘 카드 그리드.
 * 구조화 응답(points)이 없으면 구버전 산문을 굵은 구절 기준으로 분해해 같은 카드 형식으로 표시한다.
 */
export function TrendSummaryCard({ loading, data, windowLabel = '최근 60일' }: Props) {
  let lede: string | undefined;
  let items: { title: string; body: string }[] = [];
  let fallbackText: string | null = null;

  if (data) {
    if (data.points && data.points.length > 0) {
      lede = data.headline;
      items = data.points;
    } else {
      const parsed = parseLegacy(data.summary);
      if (parsed.items.length > 0) {
        lede = parsed.lede || undefined;
        items = parsed.items;
      } else {
        fallbackText = parsed.lede || data.summary;
      }
    }
  }

  return (
    <section className="bg-white border border-ink-200 rounded-[14px] shadow-report px-7 py-[26px]">
      {/* Header row */}
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-2 h-2 rounded-full bg-ink-600 shrink-0" aria-hidden />
        <span className="text-[11px] font-bold uppercase tracking-[2px] text-ink-600">
          AI Trend Summary
        </span>
        <span className="ml-auto text-[12px] text-ink-400">{windowLabel}</span>
      </div>

      {loading ? (
        <p className="text-[14px] text-ink-500">요약을 생성하는 중...</p>
      ) : !data ? (
        <p className="text-[14px] text-ink-500">요약을 불러오지 못했습니다.</p>
      ) : items.length > 0 ? (
        <>
          {lede && (
            <p className="text-[16px] font-medium leading-relaxed text-ink-800 max-w-[820px] mb-5">
              {lede}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((p, i) => (
              <PointCard key={i} title={p.title} body={p.body} />
            ))}
          </div>
        </>
      ) : (
        <p className="text-[14px] leading-relaxed text-ink-700">{fallbackText}</p>
      )}
    </section>
  );
}
