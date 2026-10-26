/**
 * 주간 브리프 → 단일 HTML 파일 (외부 스크립트·스타일시트 없음, 인라인 <style> 하나).
 *
 * 안전 원칙:
 *  - 모든 텍스트는 escapeHtml 을 거치고, 금지 문자열(javascript: 등)이 본문에 우연히 들어와도
 *    출력에 나타나지 않도록 폭 없는 공백(U+200B)으로 끊는다.
 *  - href 는 safeVideoHref / safeArticleHref, img src 는 safeThumbSrc 를 통과한 값만 출력한다.
 *    통과하지 못하면 링크 없이 텍스트(썸네일은 빈 플레이스홀더)로 낸다.
 *  - 모든 외부 링크는 target="_blank" rel="noopener noreferrer".
 *  - 결정적: 현재 시각·난수를 쓰지 않고, 날짜는 payload 의 generatedAt 을 고정 KST 로 변환해 쓴다.
 */

import type {
  WeeklyArticleItem,
  WeeklyBriefResponse,
  WeeklyCiChange,
  WeeklyEvidence,
  WeeklyKeyMessage,
  WeeklyTopVideo,
  WeeklyVideoItem,
} from '@/types/weekly-brief';
import { escapeHtml } from '@/lib/tech-trend-report-html';
import {
  POSTER_COLORS,
  POSTER_DURATION_BG,
  POSTER_LINE,
  POSTER_PAGE_BG,
  POSTER_THUMB_GRADIENT,
  POSTER_TOP_BAR,
  POSTER_WHITE,
} from '@/lib/weekly-brief-theme';
import {
  EVIDENCE_TYPE_LABELS,
  POSTER_EMPTY_NOTICE,
  POSTER_FOOTER_NOTICE,
  POSTER_PARTIAL_NOTICE,
  buildStatItems,
  clipText,
  domainLabel,
  formatDuration,
  formatGeneratedLabel,
  formatKstDate,
  formatKstMonthDay,
  formatPeriod,
  formatViews,
  formatWeekTitle,
  isPosterEmpty,
  keywordDeltaText,
  keywordHero,
  planKeyMessages,
  safeArticleHref,
  safeEvidenceHref,
  safeThumbSrc,
  safeVideoHref,
  weeklyBriefFileNameOf,
} from '@/lib/weekly-brief-format';

export interface WeeklyBriefHtmlMeta {
  /** 원본 페이지 URL (현재는 푸터에 쓰지 않음 — 외부 링크 규칙상 필요 시 safeArticleHref 통과분만) */
  pageUrl: string;
}

export function weeklyBriefFileName(brief: Pick<WeeklyBriefResponse, 'weekStart' | 'payload'>): string {
  return weeklyBriefFileNameOf(brief.weekStart, brief.payload.header.weekNumber);
}

// ───────────────────────── 이스케이프 ─────────────────────────

/** 이스케이프 후에도 남을 수 있는 금지 토큰(본문에 우연히 포함된 경우)을 폭 없는 공백으로 끊는다 */
const FORBIDDEN_TOKEN_RE = /javascript:|data:|http:\/\/|url\(|@import|onerror|onclick|onload|src\s*=|href\s*=/gi;
/** 링크 값에 금지 토큰이 들어 있으면(예: 쿼리의 http://) 링크를 포기한다 */
const FORBIDDEN_HREF_RE = /javascript:|data:|http:\/\/|url\(|@import|onerror|onclick|onload|<|"/i;

function defang(s: string): string {
  return s.replace(FORBIDDEN_TOKEN_RE, (m) => `${m[0]}​${m.slice(1)}`);
}

/** 텍스트 노드·속성값용 */
function t(s: string | null | undefined): string {
  return defang(escapeHtml(s ?? ''));
}

function okHref(h: string): string {
  return h && !FORBIDDEN_HREF_RE.test(h) ? h : '';
}

function ext(href: string, inner: string, cls?: string): string {
  const c = cls ? ` class="${cls}"` : '';
  return `<a${c} href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
}

/** 링크가 안전하면 <a>, 아니면 텍스트 그대로 */
function maybeLink(href: string, inner: string, cls?: string): string {
  const h = okHref(href);
  return h ? ext(h, inner, cls) : inner;
}

// ───────────────────────── 스타일 ─────────────────────────

function buildCss(): string {
  const c = POSTER_COLORS;
  return `
  :root{--bg:${c.base};--bg2:${c.band};--bg3:${c.pill};--line:${POSTER_LINE};--fg:${c.fg};--fg2:${c.fg2};--fg3:${c.fg3};--card:${c.card};--ink900:${POSTER_TOP_BAR}}
  *{box-sizing:border-box}
  body{margin:0;padding:18px 12px 40px;background:${POSTER_PAGE_BG};color:var(--fg);font-family:-apple-system,"Apple SD Gothic Neo","Pretendard","Noto Sans KR",Segoe UI,Roboto,sans-serif;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  a{color:var(--fg2)}
  .page{max-width:760px;margin:0 auto;background:var(--bg);color:var(--fg)}
  .top{background:var(--ink900);padding:14px 28px;display:flex;justify-content:space-between;align-items:center;gap:12px;letter-spacing:.14em;font-weight:800;font-size:14px}
  .top>div:first-child{white-space:nowrap}
  .top span{font-weight:400;color:var(--fg3);letter-spacing:.08em;font-size:12px}
  .hero{padding:34px 28px 26px;text-align:center}
  .eyebrow{font-size:11px;letter-spacing:.2em;color:var(--fg3);text-transform:uppercase}
  .dash{border:0;border-top:1px dashed var(--line);margin:10px auto;width:60%}
  .dash.full{width:100%;margin:0}
  h1{font-size:40px;line-height:1.1;margin:10px 0 0;letter-spacing:-.01em;font-weight:900}
  h1 .thin{font-weight:300}
  .stats{font-size:12px;color:var(--fg2);margin-top:12px}
  .stats span{white-space:nowrap}
  .sec{padding:26px 28px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:22px}
  .grid2.one{grid-template-columns:1fr}
  .stmt{text-align:center;padding:6px 4px}
  .stmt p{margin:0;font-size:14.5px;color:var(--fg2)}
  .num{font-size:46px;font-weight:900;line-height:1;margin:10px 0 4px;letter-spacing:-.02em;overflow-wrap:anywhere}
  .num small{font-size:18px;font-weight:700;margin-left:4px}
  .num.sm{font-size:28px;line-height:1.2}
  .num.xs{font-size:20px;line-height:1.25}
  .cap{font-size:12px;color:var(--fg2);overflow-wrap:anywhere}
  .aux{font-size:12px;color:var(--fg2);margin-top:6px}
  .src{font-size:12px;color:var(--fg2);margin-top:8px}
  .ev{list-style:none;margin:6px 0 0;padding:0;font-size:12px;color:var(--fg2)}
  .ev li{margin:2px 0;overflow-wrap:anywhere}
  .ctr{text-align:center}
  .box{background:var(--card);padding:18px 18px 14px;text-align:center}
  .box .lab{font-size:11px;letter-spacing:.14em;color:var(--fg2);text-transform:uppercase}
  .box .lab2{font-size:12px;color:var(--fg2);margin-top:2px}
  .thw{display:block;position:relative;margin:12px auto 10px;max-width:260px;aspect-ratio:16/9;background:${POSTER_THUMB_GRADIENT};border:1px solid var(--line);overflow:hidden}
  .thw img{display:block;width:100%;height:100%;object-fit:cover}
  .thw.ph{display:flex;align-items:center;justify-content:center;color:var(--fg2);font-size:20px}
  .dur{position:absolute;right:4px;bottom:4px;background:${POSTER_DURATION_BG};color:${POSTER_WHITE};font-size:11px;padding:1px 5px}
  .quote{font-size:15px;line-height:1.45;color:var(--fg);overflow-wrap:anywhere}
  .who{font-size:12px;color:var(--fg2);margin-top:10px}
  .kicker{display:inline-block;background:var(--bg3);padding:8px 14px;font-weight:800;font-size:15px;letter-spacing:.02em;text-align:left;overflow-wrap:anywhere}
  .arrowrow{display:grid;grid-template-columns:1.1fr 36px 1fr;align-items:center;gap:10px}
  .arrow{font-size:26px;color:var(--fg2);text-align:center}
  .big{font-size:24px;font-weight:900;line-height:1.15;text-align:center;overflow-wrap:anywhere}
  .big small{font-size:16px;font-weight:700;margin-left:4px}
  .sub{font-size:12.5px;color:var(--fg2);margin-top:6px;overflow-wrap:anywhere}
  .band{background:var(--bg2);padding:18px 28px;text-align:center}
  .band h2{margin:0;font-size:22px;font-weight:900;letter-spacing:.04em}
  .band p{margin:4px 0 0;font-size:12.5px;color:var(--fg2)}
  .thumbs{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .thumbs .thw{max-width:none;margin:0}
  .tt{font-size:11.5px;margin-top:4px;line-height:1.3}
  .tt b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-weight:700}
  .tt b a{text-decoration:none;color:var(--fg)}
  .tt span{display:block;color:var(--fg2);font-size:12px;margin-top:2px;overflow-wrap:anywhere}
  .bd{display:inline-block;font-style:normal;background:var(--bg3);color:var(--fg);font-size:11px;font-weight:700;padding:0 6px;margin-right:4px}
  .list{margin:0;padding:0;list-style:none}
  .list li{padding:8px 0;border-top:1px dashed var(--line);font-size:13px;display:grid;grid-template-columns:1fr auto;gap:12px}
  .list li:first-child{border-top:0}
  .list a{color:var(--fg);text-decoration:none}
  .list .sl{display:block;font-size:12px;color:var(--fg2);margin-top:2px}
  .list .m{color:var(--fg2);font-size:12px;white-space:nowrap}
  .chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:10px}
  .chip{border:1px solid var(--line);padding:4px 12px;font-size:12px;border-radius:999px}
  .chip b{margin-left:6px}
  .foot{padding:16px 28px 26px;text-align:center;font-size:11px;color:var(--fg3)}
  .foot p{margin:0 0 4px}
  .empty{text-align:center;color:var(--fg2);font-size:14px}
  @media (max-width:640px){.grid2,.arrowrow{grid-template-columns:1fr}.arrow{transform:rotate(90deg)}.thumbs{grid-template-columns:1fr 1fr}h1{font-size:30px}.num{font-size:38px}}
  @page{size:A4 portrait;margin:10mm}
  @media print{
    body{background:${POSTER_WHITE};padding:0}
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{max-width:none;width:100%}
    .top,.hero,.sec,.band,.box,.stmt,.arrowrow,.vc,.list li,.foot{break-inside:avoid;page-break-inside:avoid}
  }
`;
}

// ───────────────────────── 조각 ─────────────────────────

function bigNumberHtml(value: string, unit: string, cls = ''): string {
  return `<div class="num${cls ? ` ${cls}` : ''}">${t(value)}${unit ? `<small>${t(unit)}</small>` : ''}</div>`;
}

function evidenceHtml(list: WeeklyEvidence[]): string {
  const items = list.slice(0, 3).map((e) => {
    const kind = EVIDENCE_TYPE_LABELS[e.type] ?? '';
    const label = e.label ? ` (${t(e.label)})` : '';
    const title = t(clipText(e.title, 60));
    const href = okHref(safeEvidenceHref(e.type, e.url));
    const inner = `${t(kind)} · ${title}${label}`;
    return `<li>${href ? ext(href, `${inner} ↗`) : inner}</li>`;
  });
  return items.length ? `<ul class="ev">${items.join('')}</ul>` : '';
}

function statHtml(m: WeeklyKeyMessage): string {
  const delta = m.delta
    ? `<hr class="dash"><p>${t(m.delta.label)}</p>${bigNumberHtml(m.delta.value, m.delta.unit)}`
    : '';
  const note = m.note ? `<div class="aux">${t(m.note)}</div>` : '';
  return `<div class="stmt"><p>${t(m.headline)}</p>${bigNumberHtml(m.bigNumber.value, m.bigNumber.unit)}<div class="cap">${t(m.bigNumber.caption)}</div>${delta}${note}<div class="src">${t(m.basis)}</div>${evidenceHtml(m.evidence)}</div>`;
}

function causeEffectHtml(m: WeeklyKeyMessage): string {
  const note = m.note ? `<div class="aux ctr">${t(m.note)}</div>` : '';
  return `<div class="arrowrow"><div><div class="kicker">${t(m.headline)}</div><div class="sub">${t(m.bigNumber.caption)}</div></div><div class="arrow" aria-hidden="true">→</div><div class="big">${t(m.bigNumber.value)}${m.bigNumber.unit ? `<small>${t(m.bigNumber.unit)}</small>` : ''}</div></div>${note}<div class="src ctr">${t(m.basis)}</div>${evidenceHtml(m.evidence)}`;
}

function thumbHtml(v: Pick<WeeklyVideoItem, 'thumbnail' | 'title' | 'url'>, durationSec?: number | null): string {
  const src = okHref(safeThumbSrc(v.thumbnail));
  const href = okHref(safeVideoHref(v.url));
  const dur = formatDuration(durationSec);
  const durHtml = dur ? `<span class="dur">${t(dur)}</span>` : '';
  if (!src) {
    return `<div class="thw ph" aria-hidden="true">▶${durHtml}</div>`;
  }
  const img = `<img src="${escapeHtml(src)}" alt="${t(v.title)}" width="320" height="180" loading="lazy" referrerpolicy="no-referrer">${durHtml}`;
  return href
    ? `<a class="thw" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${img}</a>`
    : `<div class="thw">${img}</div>`;
}

function topVideoHtml(v: WeeklyTopVideo): string {
  const hasViews = v.views != null;
  const label = hasViews ? '이번 주 가장 많이 본 영상' : '이번 주 분석 영상';
  const labelSub = hasViews ? '<div class="lab2">수집 시점 조회수 기준</div>' : '';
  const href = okHref(safeVideoHref(v.url));
  const who = [
    v.channel ? t(v.channel) : '',
    v.publishedAt ? t(formatKstMonthDay(v.publishedAt)) : '',
    hasViews ? `조회 ${t(formatViews(v.views))}` : '',
    href ? ext(href, '유튜브 원본 ↗') : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const title = maybeLink(safeVideoHref(v.url), t(v.title));
  const line = v.analysisLine ? `<div class="aux">${t(v.analysisLine)}</div>` : '';
  return `<div class="box"><div class="lab">${label}</div>${labelSub}${thumbHtml(v, v.durationSec)}<div class="quote">${title}</div>${line}<div class="who">${who}</div></div>`;
}

function ciItemHtml(c: WeeklyCiChange): string {
  const lenCls = Array.from(c.after).length > 40 ? 'xs' : 'sm';
  const src = okHref(safeArticleHref(c.sourceUrl));
  const srcHtml = src ? ext(src, '출처 ↗') : c.sourceName ? t(c.sourceName) : '';
  const meta = [`신뢰도 ${t(c.confidence)}`, srcHtml].filter(Boolean).join(' · ');
  const before = c.before ? `<div class="aux">이전: ${t(c.before)}</div>` : '';
  return `<div class="stmt"><p>${t(c.company)} ${t(c.item)}</p><div class="num ${lenCls}">${t(c.after)}</div>${before}<div class="src">${meta}</div></div>`;
}

function videoCardHtml(v: WeeklyVideoItem): string {
  const badge = domainLabel(v.domain);
  const metaParts = [v.channel ? t(v.channel) : '', v.views != null ? t(formatViews(v.views)) : ''].filter(Boolean).join(' · ');
  const meta = `${badge ? `<i class="bd">${t(badge)}</i>` : ''}${metaParts}`;
  return `<div class="vc">${thumbHtml(v)}<div class="tt"><b>${maybeLink(safeVideoHref(v.url), t(v.title))}</b>${meta ? `<span>${meta}</span>` : ''}</div></div>`;
}

function articleRowHtml(a: WeeklyArticleItem): string {
  const badge = domainLabel(a.domain);
  const title = maybeLink(safeArticleHref(a.url), t(a.title));
  const summary = a.summaryLine ? `<span class="sl">${t(a.summaryLine)}</span>` : '';
  const m = [t(a.source), a.publishedAt ? t(formatKstMonthDay(a.publishedAt)) : ''].filter(Boolean).join(' · ');
  return `<li><div>${badge ? `<i class="bd">${t(badge)}</i>` : ''}${title}${summary}</div><div class="m">${m}</div></li>`;
}

// ───────────────────────── 빌더 ─────────────────────────

export function buildWeeklyBriefHtml(brief: WeeklyBriefResponse, _meta: WeeklyBriefHtmlMeta): string {
  const p = brief.payload;
  const h = p.header;
  const periodTitle = formatWeekTitle(h.weekStart, h.weekEnd, h.weekNumber);
  const generatedDate = formatKstDate(h.generatedAt);
  const sections: string[] = [];

  // 상단 바 + 히어로
  const stats = buildStatItems(h.counts, h.deltas)
    .map((i) => `<span>${t(i.label)} ${i.value}${i.delta ? ` (${t(i.delta)})` : ''}</span>`)
    .join(' · ');
  const top = `<div class="top"><div>ARGOS <span>|| WEEKLY BRIEF</span></div><span>${t(formatGeneratedLabel(h.generatedAt))}</span></div>`;
  const hero = `<div class="hero"><div class="eyebrow">Weekly Brief · Week ${h.weekNumber}</div><hr class="dash"><h1><b>주간 브리프</b><br><span class="thin">${t(periodTitle)}</span></h1><hr class="dash"><div class="stats">${stats}</div></div>`;

  // 행 A + 추가 메시지
  const plan = planKeyMessages(p.keyMessages);
  if (plan.lead && p.topVideo) {
    sections.push(`<div class="sec grid2">${statHtml(plan.lead)}${topVideoHtml(p.topVideo)}</div>`);
  } else if (plan.lead) {
    sections.push(`<div class="sec">${statHtml(plan.lead)}</div>`);
  } else if (p.topVideo) {
    sections.push(`<div class="sec">${topVideoHtml(p.topVideo)}</div>`);
  }
  for (const m of plan.rest) {
    sections.push(`<div class="sec">${m.kind === 'stat' ? statHtml(m) : causeEffectHtml(m)}</div>`);
  }

  // CI 변화
  if (p.ciChanges.length > 0) {
    const sub = `이번 주 경쟁사 정보 ${p.ciSummary.updates}건 갱신 · ${p.ciSummary.companies}개사`;
    const one = p.ciChanges.length === 1 ? ' one' : '';
    sections.push(
      `<div class="band"><h2>CI 변화</h2><p>${t(sub)}</p></div><div class="sec grid2${one}">${p.ciChanges.map(ciItemHtml).join('')}</div>`
    );
  }

  // 키워드 흐름
  if (p.keywords.length > 0) {
    const rep = p.keywords[0];
    const hero2 = keywordHero(rep);
    const chips = p.keywords
      .slice(1, 8)
      .map((k) => `<span class="chip">${t(k.term)}<b>${t(keywordDeltaText(k))}</b></span>`)
      .join('');
    sections.push(
      `<div class="band"><h2>키워드 흐름</h2><p>주간 키워드 증감</p></div><div class="sec ctr"><div class="num">${t(rep.term)} <small>${t(hero2.value)}${t(hero2.unit)}</small></div><div class="cap">${t(hero2.caption)}</div>${chips ? `<div class="chips">${chips}</div>` : ''}</div>`
    );
  }

  // 영상
  if (p.videos.length > 0) {
    sections.push(
      `<div class="band"><h2>이번 주 영상</h2><p>조회수·분석 기준 상위 8 · 수집 시점 조회수 · 클릭하면 유튜브 원본</p></div><div class="sec"><div class="thumbs">${p.videos.map(videoCardHtml).join('')}</div></div>`
    );
  }

  // 기사
  if (p.articles.length > 0) {
    sections.push(
      `<div class="band"><h2>주요 기사</h2><p>상위 12 · 출처 다양성 반영 · 제목 클릭 시 원문</p></div><div class="sec"><ul class="list">${p.articles.map(articleRowHtml).join('')}</ul></div>`
    );
  }

  if (isPosterEmpty(p)) {
    sections.push(`<div class="sec empty">${t(POSTER_EMPTY_NOTICE)}</div>`);
  }

  const body = sections.join('<hr class="dash full">');
  const partial = brief.status === 'partial' ? `<p>${t(POSTER_PARTIAL_NOTICE)}</p>` : '';
  const foot = `<div class="foot">${partial}<p>${t(POSTER_FOOTER_NOTICE)} · ARGOS · ${t(generatedDate)}</p></div>`;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${t(`ARGOS · 주간 브리프 ${formatPeriod(h.weekStart, h.weekEnd)} (Week ${h.weekNumber})`)}</title>
<style>${buildCss()}</style>
</head>
<body>
<div class="page">${top}${hero}<hr class="dash full">${body}<hr class="dash full">${foot}</div>
</body>
</html>
`;
}
