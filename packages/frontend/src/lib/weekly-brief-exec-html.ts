/**
 * 주간 브리프 v3(임원판) → 단일 HTML 파일 (외부 스크립트·스타일시트 없음, 인라인 <style> 하나).
 *
 * 안전 원칙 (v1·v2 규칙 + 임원판)
 *  - 모든 텍스트는 escapeHtml + defang(금지 토큰을 폭 없는 공백으로 끊기)을 거친다.
 *  - 외부 href 는 safeVideoHref / safeArticleHref / safePaperHref, img src 는 safeThumbSrc(ytimg)를 통과한 값만. 실패하면 링크 없이 텍스트.
 *    썸네일 <img> 는 loading="eager" + referrerpolicy="no-referrer". 정적 HTML 에는 스크립트가 없어 lazy 썸네일이 헤드리스 인쇄에서 누락되기 때문(PM 결정, v2 weekly-brief-report-html.ts 와 동일).
 *  - 내부 앵커(href="#…")는 문서에 대응하는 id 가 있을 때만 낸다(목차·"맨 위로"). 내부 링크에는 target/rel 을 붙이지 않는다.
 *  - 금지 문자열: <script <link @import url( http:// javascript: data: <iframe <object <embed <form onerror onclick onload + xmlns=
 *  - SVG 는 xmlns·url() 없이 단색 도형(svg/title/line/polyline/circle)만, 좌표는 소수 1자리.
 *  - 결정적: 현재 시각·난수를 쓰지 않고, 날짜는 payload 의 generatedAt 을 고정 KST 로 변환한다. 모델명·편집 UI·관리자 전용 요소는 출력하지 않는다.
 *  - 초안(또는 발행 후 수정 사항 미반영)에서 받은 HTML 은 첫 줄에 "미발행 초안입니다. 발행 전 내용입니다" 문구를 둔다(응답의 publishState 에서 온 meta.draft).
 */

import type { ExecEvidence, ExecGapRow, ExecTechSignal, WeeklyExecutiveResponse, WeeklyReportEvidence } from '@/types/weekly-brief';
import { escapeHtml } from '@/lib/tech-trend-report-html';
import { ext, maybeLink, okHref, t } from '@/lib/weekly-brief-html-common';
import { POSTER_COLORS, POSTER_DURATION_BG, POSTER_LINE, POSTER_PAGE_BG, POSTER_THUMB_GRADIENT, POSTER_TOP_BAR, POSTER_WHITE, REPORT_CHART } from '@/lib/weekly-brief-theme';
import {
  domainLabel,
  formatDuration,
  formatGeneratedLabel,
  formatKstDate,
  formatKstMonthDay,
  formatPeriod,
  formatViews,
  formatWeekTitle,
  safeArticleHref,
  safePaperHref,
  safeThumbSrc,
  safeVideoHref,
} from '@/lib/weekly-brief-format';
import { titlePair } from '@/lib/weekly-brief-report';
import {
  EXEC_ACCUMULATING_NOTE,
  EXEC_ACTION_LABELS,
  EXEC_BUSINESS_CATEGORY_LABELS,
  EXEC_DRAFT_HTML_NOTICE,
  EXEC_EMPTY_NOTICE,
  EXEC_EVIDENCE_TYPE_LABELS,
  EXEC_FOOTER_NOTICE,
  EXEC_LABELS,
  EXEC_NO_CONCLUSIONS,
  EXEC_NO_GAPS,
  EXEC_NO_PAPERS,
  EXEC_NO_SIGNALS,
  EXEC_OURS_MISSING_BADGE,
  EXEC_OURS_MISSING_NOTE,
  EXEC_PARTIAL_NOTICE,
  EXEC_QUESTION_KIND_LABELS,
  EXEC_ROLE_LABELS,
  EXEC_TOC_ID,
  EXEC_TOP_ID,
  buildExecToc,
  coverageLine,
  directionGlyph,
  directionLabel,
  estimateExecReadingMinutes,
  formatExecReadingTime,
  formatGapDiff,
  gapMovementBadge,
  gapPositionBadge,
  gapTone,
  gapWho,
  isExecEmpty,
  planExecSections,
  sparklineAlt,
  sparklineModel,
  type ExecPlannedSection,
} from '@/lib/weekly-brief-exec';

export interface ExecHtmlMeta {
  /** 초안(또는 발행 후 수정 사항 미반영)에서 받은 HTML 이면 true — 첫 줄에 초안 문구 */
  draft?: boolean;
}

// ───────────────────────── 스타일 ─────────────────────────

function buildCss(): string {
  const c = POSTER_COLORS;
  return `
  :root{--bg:${c.base};--bg2:${c.band};--bg3:${c.pill};--line:${POSTER_LINE};--fg:${c.fg};--fg2:${c.fg2};--fg3:${c.fg3};--card:${c.card};--ink900:${POSTER_TOP_BAR}}
  *{box-sizing:border-box}
  [id]{scroll-margin-top:112px}
  html{scroll-behavior:smooth}
  body{margin:0;padding:18px 12px 40px;background:${POSTER_PAGE_BG};color:var(--fg);font-family:-apple-system,"Apple SD Gothic Neo","Pretendard","Noto Sans KR",Segoe UI,Roboto,sans-serif;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  a{color:var(--fg);text-decoration:underline;text-underline-offset:2px}
  h1,h2,h3,h4,p,ul,ol{margin:0}
  ul,ol{padding:0;list-style:none}
  .draftnote{max-width:760px;margin:0 auto 10px;padding:8px 14px;background:#FFF3CD;color:#5C4400;font-size:13px;font-weight:700;border:1px solid #E0C36A}
  .page{max-width:760px;margin:0 auto;background:var(--bg);color:var(--fg);overflow-wrap:anywhere}
  .top{background:var(--ink900);padding:14px 28px;display:flex;justify-content:space-between;align-items:center;gap:12px;letter-spacing:.14em;font-weight:800;font-size:14px}
  .top>div:first-child{white-space:nowrap}
  .top span{font-weight:400;color:var(--fg3);letter-spacing:.08em;font-size:12px}
  .cover{padding:34px 20px 22px;text-align:center;break-inside:avoid;page-break-inside:avoid}
  .eyebrow{font-size:11px;letter-spacing:.2em;color:var(--fg3);text-transform:uppercase}
  .dash{border:0;border-top:1px dashed var(--line);margin:10px auto;width:60%}
  h1{font-size:40px;line-height:1.1;margin:10px 0 0;letter-spacing:-.01em;font-weight:900}
  h1 .thin{font-weight:300}
  .reading{font-size:13px;color:var(--fg2);margin-top:12px}
  .oneliner{font-size:18px;font-weight:700;line-height:1.4;margin:12px auto 0;max-width:560px}
  .toc{position:sticky;top:0;z-index:5;background:var(--bg2);padding:10px 20px;border-top:1px dashed var(--line);border-bottom:1px dashed var(--line)}
  .toc-d{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .toc-m{display:none}
  .toc-t{font-size:12px;font-weight:800;letter-spacing:.1em;margin-right:4px}
  .toc a{display:inline-block;background:var(--bg3);color:var(--fg);padding:4px 12px;border-radius:999px;font-size:13px;text-decoration:none}
  .toc-m summary{cursor:pointer;font-size:14px;font-weight:700;padding:4px 0}
  .toc-m ul{display:grid;gap:6px;margin-top:8px}
  .toc-m a{display:block;border-radius:0}
  .sec{border-top:1px dashed var(--line)}
  .sh{background:var(--bg2);padding:16px 20px;display:grid;grid-template-columns:auto 1fr auto;gap:4px 14px;align-items:center;break-inside:avoid;page-break-inside:avoid;break-after:avoid;page-break-after:avoid}
  .sh .no{grid-row:1 / span 2;font-size:28px;font-weight:900;letter-spacing:-.02em;line-height:1}
  .sh h2{font-size:22px;font-weight:900;letter-spacing:.02em;line-height:1.25}
  .sh .cnt{font-size:13px;color:var(--fg2);white-space:nowrap;grid-row:1;grid-column:3}
  .sh .subt{font-size:12.5px;color:var(--fg2);grid-column:2 / span 2}
  .sbody{padding:22px 20px 8px}
  .totop{padding:8px 20px 18px;text-align:right;font-size:12.5px}
  .totop a{color:var(--fg2)}
  .para{font-size:16px;line-height:1.78;margin:6px 0;color:var(--fg)}
  .meta{font-size:12.5px;color:var(--fg2);overflow-wrap:anywhere}
  .orig{font-size:12.5px;color:var(--fg2);margin-top:2px;overflow-wrap:anywhere}
  h3{font-size:18px;line-height:1.4;font-weight:800;break-after:avoid;page-break-after:avoid}
  h4{font-size:16px;line-height:1.4;font-weight:800}
  .card{background:var(--card);padding:16px;margin:14px 0;break-inside:avoid;page-break-inside:avoid}
  .hd{display:flex;gap:12px;align-items:flex-start}
  .no2{flex:none;font-size:24px;font-weight:900;line-height:1}
  .bd{display:inline-block;font-style:normal;background:var(--bg3);color:var(--fg);font-size:11.5px;font-weight:700;padding:0 7px;margin-right:6px}
  .lines{display:grid;gap:10px;margin-top:12px}
  .ln{display:grid;grid-template-columns:120px 1fr;gap:2px 12px}
  .ln .role{font-size:12px;font-weight:700;color:var(--fg2)}
  .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
  .chips li{font-size:12.5px;background:var(--bg3);padding:3px 10px;border-radius:14px;color:var(--fg)}
  .pos{display:inline-block;border:1px solid var(--fg);background:var(--bg3);font-size:12.5px;font-weight:700;padding:1px 8px;margin-right:6px}
  .pos.missing{border-style:dashed}
  .mv{display:inline-block;border:1px solid var(--line);font-size:12.5px;padding:1px 8px}
  .vals{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
  .vals>div{background:var(--bg3);padding:8px 12px;min-width:0}
  .vals .l{font-size:12px}
  .vals .v{font-size:18px;font-weight:900;line-height:1.25;margin-top:2px}
  .vals .v.miss{font-size:15px}
  .vals .s{font-size:12px;margin-top:2px}
  .cov{font-size:12.5px;color:var(--fg2);margin-top:12px}
  .sig{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px}
  .sig .tt{flex:1;min-width:0}
  .spark{display:block;flex:none}
  .facts{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}
  .facts li{background:var(--bg3);padding:8px 12px;min-width:0}
  .facts .l{font-size:12px}
  .facts .v{font-size:17px;font-weight:900;line-height:1.25;margin-top:2px}
  .facts .n{font-size:12px;margin-top:2px}
  .vc{display:grid;grid-template-columns:200px 1fr;gap:16px;align-items:start}
  .thw{display:block;position:relative;aspect-ratio:16/9;background:${POSTER_THUMB_GRADIENT};border:1px solid var(--line);overflow:hidden}
  .thw img{display:block;width:100%;height:100%;object-fit:cover}
  .thw.ph{display:flex;align-items:center;justify-content:center;color:var(--fg2);font-size:22px}
  .dur{position:absolute;right:4px;bottom:4px;background:${POSTER_DURATION_BG};color:${POSTER_WHITE};font-size:11px;padding:1px 5px}
  .vlines{margin-top:8px;display:grid;gap:4px}
  .vlines li{font-size:14px;line-height:1.6;padding-left:12px;position:relative}
  .vlines li::before{content:"·";position:absolute;left:2px}
  .sub3{font-size:16px;font-weight:800;margin:20px 0 6px}
  .evl>li{padding:8px 0;border-top:1px dashed var(--line);break-inside:avoid;page-break-inside:avoid}
  .evl>li:first-child{border-top:0}
  .evl .et{font-size:15px;font-weight:700}
  .line{font-size:14px;color:var(--fg2);margin-top:3px}
  .coll{margin-top:22px;padding-top:8px;border-top:1px dashed var(--line);font-size:12px;color:var(--fg3)}
  .note{font-size:12.5px;color:var(--fg2);margin-top:8px}
  .quiet{font-size:15px;color:var(--fg2)}
  .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .foot{padding:16px 20px 26px;text-align:center;font-size:11px;color:var(--fg3);border-top:1px dashed var(--line)}
  .foot p{margin:0 0 4px}
  .empty{padding:36px 20px;text-align:center;color:var(--fg2);font-size:15px}
  @media (max-width:640px){
    body{padding:10px 0 30px}
    .top{padding:12px 20px}
    .cover{padding:28px 20px 18px}
    h1{font-size:30px}
    h1 .thin{display:block;font-size:22px}
    .toc{padding:10px 20px;position:static}
    .toc-d{display:none}
    .toc-m{display:block}
    .sh{padding:14px 20px}
    .sh h2{font-size:20px}
    .sbody{padding:18px 20px 6px}
    .totop{padding:6px 20px 16px}
    .para{font-size:15px}
    .ln{grid-template-columns:1fr}
    .vals{grid-template-columns:1fr}
    .facts{grid-template-columns:1fr}
    .vc{grid-template-columns:1fr}
  }
  @page{size:A4 portrait;margin:10mm}
  @media print{
    body{background:${POSTER_WHITE};padding:0}
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    html{scroll-behavior:auto}
    .page{max-width:none;width:100%}
    .toc,.totop{display:none}
    .sec{break-before:page;page-break-before:always}
    .sec:first-of-type{break-before:auto;page-break-before:auto}
    .card,.sh,.cover,.evl>li,.vlines li,.vals,.facts li{break-inside:avoid;page-break-inside:avoid}
    h2,h3{break-after:avoid;page-break-after:avoid}
    .para{font-size:13px;line-height:1.6;margin:4px 0}
    .card{margin:8px 0;padding:10px 12px}
    .vc{grid-template-columns:150px 1fr;gap:10px}
    .sh{padding-top:10px;padding-bottom:10px}
    .sbody{padding-top:12px}
  }
`;
}

// ───────────────────────── 조각 ─────────────────────────

function internalLink(id: string, inner: string): string {
  return `<a href="#${id}">${inner}</a>`;
}

function badge(label: string): string {
  return label ? `<i class="bd">${t(label)}</i>` : '';
}

function p(text: string | null | undefined): string {
  return text ? `<p class="para">${t(text)}</p>` : '';
}

function evidenceChips(list: readonly WeeklyReportEvidence[]): string {
  const items = list
    .slice(0, 3)
    .map((e) => {
      const href = e.type === 'keyword' ? '' : okHref(e.type === 'video' ? safeVideoHref(e.url) : e.type === 'paper' ? safePaperHref(e.url) : safeArticleHref(e.url));
      const inner = `${t(EXEC_EVIDENCE_TYPE_LABELS[e.type] ?? '')} · ${t(e.title)}${e.label ? ` (${t(e.label)})` : ''}`;
      return `<li>${href ? ext(href, `${inner} ↗`) : inner}</li>`;
    })
    .join('');
  return items ? `<ul class="chips">${items}</ul>` : '';
}

function titleHtml(title: string, titleKo: string | null | undefined, href: string): string {
  const { main, sub } = titlePair(title, titleKo);
  return `${maybeLink(okHref(href), t(main))}${sub ? `<div class="orig">${t(EXEC_LABELS.original)}: ${t(sub)}</div>` : ''}`;
}

function sectionHtml(s: ExecPlannedSection, body: string): string {
  const cnt = s.countLabel ? `<span class="cnt">${t(s.countLabel)}</span>` : '';
  const header = `<div class="sh"><span class="no" aria-hidden="true">${t(s.number)}</span><h2>${t(s.title)}</h2>${cnt}<p class="subt">${t(s.subtitle)}</p></div>`;
  return `<section class="sec" id="${s.id}">${header}<div class="sbody">${body}</div><p class="totop">${internalLink(EXEC_TOP_ID, `↑ ${t(EXEC_LABELS.backToTop)}`)}</p></section>`;
}

/** 단색 인라인 SVG 스파크라인 — xmlns·url() 없음 */
function sparkSvg(label: string, series: readonly number[], isCount: boolean): string {
  const m = sparklineModel(series);
  if (!m) return '';
  const alt = t(sparklineAlt(label, series, isCount));
  return (
    `<svg class="spark" viewBox="0 0 ${m.width} ${m.height}" width="${m.width}" height="${m.height}" role="img" aria-label="${alt}"><title>${alt}</title>` +
    `<line x1="3" y1="${m.height - 3}" x2="${m.width - 3}" y2="${m.height - 3}" stroke="${REPORT_CHART.grid}" stroke-width="1"/>` +
    `<polyline points="${m.points}" fill="none" stroke="${REPORT_CHART.stroke}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` +
    `<circle cx="${m.last.x}" cy="${m.last.y}" r="3" fill="${REPORT_CHART.dot}"/></svg>`
  );
}

// ───────────────────────── 섹션 본문 ─────────────────────────

function conclusionsHtml(c: WeeklyExecutiveResponse['payload']['conclusions']): string {
  if (c.length === 0) return `<p class="quiet">${t(EXEC_NO_CONCLUSIONS)}</p>`;
  return c
    .map((x, i) => {
      const seen = new Set<string>();
      const lines = x.lines
        .map((l) => {
          const first = !seen.has(l.role);
          seen.add(l.role);
          return `<div class="ln"><span class="role">${first ? t(EXEC_ROLE_LABELS[l.role]) : ''}</span><p class="para">${t(l.text)}</p></div>`;
        })
        .join('');
      const dom = domainLabel(x.domain);
      const act = EXEC_ACTION_LABELS[x.actionKind] ?? '';
      return `<article class="card"><div class="hd"><span class="no2" aria-hidden="true">${i + 1}</span><div><h3>${t(x.headline)}</h3><div>${badge(dom)}${badge(act)}${x.generatedBy === 'rule' ? badge('규칙 기반') : ''}</div></div></div><div class="lines">${lines}</div>${evidenceChips(x.evidence)}</article>`;
    })
    .join('');
}

function gapRowHtml(r: ExecGapRow, i: number): string {
  const tone = gapTone(r);
  const move = gapMovementBadge(r);
  const missing = r.status !== 'compared' || !r.ourValue;
  const cv = r.competitorValue;
  const cvSub = [cv.grade ? `신뢰도 ${cv.grade}` : '', cv.asOf ?? ''].filter(Boolean).join(' · ');
  const ours = missing
    ? `<div><div class="l">우리</div><div class="v miss">${t(EXEC_OURS_MISSING_BADGE)}</div><div class="s">${t(EXEC_OURS_MISSING_NOTE)}</div></div>`
    : `<div><div class="l">우리${r.ourRef ? ` (${t(r.ourRef)})` : ''}</div><div class="v">${t(r.ourValue!.display)}</div>${r.ourValue!.asOf ? `<div class="s">${t(r.ourValue!.asOf)}</div>` : ''}</div>`;
  const diff = `<div><div class="l">차이</div><div class="v">${t(missing ? '–' : formatGapDiff(r) || '–')}</div>${r.prevCompetitorValue !== null ? `<div class="s">직전 경쟁사값 ${t(String(r.prevCompetitorValue))}</div>` : ''}</div>`;
  const lines = r.lines.map((l) => `<p class="para">${t(l)}</p>`).join('');
  return (
    `<article class="card"><div class="hd"><span class="no2" aria-hidden="true">${i + 1}</span><div><h3>${t(gapWho(r))} · ${t(r.axisLabel)}</h3>` +
    `<div><span class="pos${tone === 'missing' ? ' missing' : ''}">${t(gapPositionBadge(r))}</span>${move ? `<span class="mv">${t(move)}</span>` : ''}</div></div></div>` +
    `<div class="vals"><div><div class="l">경쟁사</div><div class="v">${t(cv.display)}</div>${cvSub ? `<div class="s">${t(cvSub)}</div>` : ''}</div>${ours}${diff}</div>` +
    `<div class="lines">${lines}</div>${evidenceChips(r.evidence)}</article>`
  );
}

function gapsHtml(g: WeeklyExecutiveResponse['payload']['gaps']): string {
  const summary = g.summary.map((s) => p(s)).join('');
  const rows = g.rows.length === 0 ? `<p class="quiet">${t(EXEC_NO_GAPS)}</p>` : g.rows.map(gapRowHtml).join('');
  return `${summary}${rows}<p class="cov">${t(coverageLine(g.coverage))}</p>`;
}

function signalHtml(s: ExecTechSignal, i: number): string {
  const unit = s.kind === 'procurement' ? '건' : '%';
  const share = s.recent !== null && s.prior !== null ? `최근 4주 ${s.recent}${unit} · 이전 4주 ${s.prior}${unit}${s.relChangePct !== null ? ` (상대 ${s.relChangePct >= 0 ? '+' : ''}${s.relChangePct}%)` : ''}` : '';
  const dom = domainLabel(s.domain);
  return (
    `<article class="card"><div class="sig"><span class="no2" aria-hidden="true">${i + 1}</span><div class="tt"><h3>${t(s.label)}</h3><div><span class="pos">${t(directionGlyph(s.direction))} ${t(directionLabel(s.direction))}</span>${badge(dom)}</div></div>${sparkSvg(s.label, s.series, s.kind === 'procurement')}</div>` +
    `${share ? `<p class="meta">${t(share)}</p>` : ''}<div class="lines">${s.lines.map((l) => `<p class="para">${t(l)}</p>`).join('')}</div>${evidenceChips(s.evidence)}</article>`
  );
}

function techHtml(tech: WeeklyExecutiveResponse['payload']['tech']): string {
  const body = tech.signals.length === 0 ? `<p class="quiet">${t(EXEC_NO_SIGNALS)}</p>` : tech.signals.map(signalHtml).join('');
  const acc = tech.procurement.state === 'accumulating' ? `<p class="note">${t(EXEC_ACCUMULATING_NOTE)} (조달 통계 스냅샷 ${tech.procurement.snapshots}개 · 2개 이상 쌓이면 비교합니다)</p>` : '';
  return `${body}${acc}`;
}

function chipList(chips: readonly { label: string; value: string; note: string | null }[], cls = 'facts'): string {
  return chips.length === 0 ? '' : `<ul class="${cls}">${chips.map((c) => `<li><div class="l">${t(c.label)}</div><div class="v">${t(c.value)}</div>${c.note ? `<div class="n">${t(c.note)}</div>` : ''}</li>`).join('')}</ul>`;
}

function businessHtml(b: WeeklyExecutiveResponse['payload']['business']): string {
  const picture = b.picture.length > 0 ? `${chipList(b.picture)}${b.asOf ? `<p class="note">현재 등록 현황 기준 · 기준일 ${t(b.asOf)}</p>` : ''}` : '';
  const moves = b.moves
    .map(
      (m, i) =>
        `<article class="card"><div class="hd"><span class="no2" aria-hidden="true">${i + 1}</span><div><h3>${t(m.company)}${m.vendor ? ` · ${t(m.vendor)}` : ''}</h3><div>${badge(EXEC_BUSINESS_CATEGORY_LABELS[m.category] ?? m.category)}</div></div></div>${chipList(m.facts)}<div class="lines">${m.lines.map((l) => `<p class="para">${t(l)}</p>`).join('')}</div>${evidenceChips(m.evidence)}</article>`,
    )
    .join('');
  return `${picture}${moves}`;
}

function questionsHtml(q: WeeklyExecutiveResponse['payload']['questions']): string {
  return q
    .map(
      (x, i) =>
        `<article class="card"><div class="hd"><span class="no2" aria-hidden="true">${i + 1}</span><div><h3>${t(x.text)}</h3><div>${badge(EXEC_QUESTION_KIND_LABELS[x.kind] ?? x.kind)}</div></div></div><div class="lines">${x.rationale.map((r) => `<p class="para">${t(r)}</p>`).join('')}</div>${evidenceChips(x.evidence)}</article>`,
    )
    .join('');
}

function thumbHtml(v: { thumbnail: string | null; title: string; url: string | null; durationSec: number | null }): string {
  const src = okHref(safeThumbSrc(v.thumbnail));
  const href = okHref(safeVideoHref(v.url));
  const dur = formatDuration(v.durationSec);
  const durHtml = dur ? `<span class="dur">${t(dur)}</span>` : '';
  if (!src) return `<div class="thw ph" aria-hidden="true">▶${durHtml}</div>`;
  const img = `<img src="${escapeHtml(src)}" alt="${t(v.title)}" width="320" height="180" loading="eager" referrerpolicy="no-referrer">${durHtml}`;
  return href ? `<a class="thw" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${img}</a>` : `<div class="thw">${img}</div>`;
}

function evidenceHtml(e: ExecEvidence): string {
  const videos =
    e.videos.length > 0
      ? `<h3 class="sub3">영상 ${e.videos.length}개</h3>` +
        e.videos
          .map((v) => {
            const href = safeVideoHref(v.url);
            const meta = [v.channel ? t(v.channel) : '', v.publishedAt ? t(formatKstMonthDay(v.publishedAt)) : '', v.views != null ? `${t(EXEC_LABELS.views)} ${t(formatViews(v.views))}` : ''].filter(Boolean).join(' · ');
            const lines = v.summaryLines.length ? `<ul class="vlines">${v.summaryLines.map((s) => `<li>${t(s)}</li>`).join('')}</ul>` : '';
            return `<article class="card vc">${thumbHtml(v)}<div>${badge(domainLabel(v.domain))}<h4>${titleHtml(v.title, v.titleKo, href)}</h4><p class="meta">${meta}</p>${lines}</div></article>`;
          })
          .join('')
      : '';
  const papers =
    `<h3 class="sub3">논문${e.papers.length > 0 ? ` ${e.papers.length}개` : ''}</h3>` +
    (e.papers.length === 0
      ? `<p class="quiet">${t(EXEC_NO_PAPERS)}</p>`
      : e.papers
          .map((x) => {
            const meta = [x.authors ? t(x.authors) : '', x.publishedAt ? t(formatKstMonthDay(x.publishedAt)) : '', x.arxivId ? `arXiv ${t(x.arxivId)}` : ''].filter(Boolean).join(' · ');
            return `<article class="card"><h4>${titleHtml(x.title, x.titleKo, safePaperHref(x.url))}</h4><p class="meta">${meta}</p>${p(x.implication)}</article>`;
          })
          .join(''));
  const articles =
    e.articles.length > 0
      ? `<h3 class="sub3">뉴스 ${e.articles.length}개</h3><ul class="evl">${e.articles
          .map((a) => {
            const meta = [t(a.source), a.publishedAt ? t(formatKstMonthDay(a.publishedAt)) : ''].filter(Boolean).join(' · ');
            return `<li><div class="et">${titleHtml(a.title, a.titleKo, safeArticleHref(a.url))}</div><div class="meta">${meta}</div>${a.summaryLine ? `<div class="line">${t(a.summaryLine)}</div>` : ''}</li>`;
          })
          .join('')}</ul>`
      : '';
  const coll = e.collectionLine ? `<p class="coll">${t(e.collectionLine)}</p>` : '';
  return `${videos}${papers}${articles}${coll}`;
}

// ───────────────────────── 빌더 ─────────────────────────

export function buildExecutiveHtml(brief: WeeklyExecutiveResponse, meta: ExecHtmlMeta = {}): string {
  const pl = brief.payload;
  const h = pl.header;
  const periodTitle = formatWeekTitle(h.weekStart, h.weekEnd, h.weekNumber);
  const sections = planExecSections(pl);
  const toc = buildExecToc(sections);
  const minutes = estimateExecReadingMinutes(pl);

  const top = `<div class="top"><div>ARGOS <span>|| WEEKLY BRIEF</span></div><span>${t(formatGeneratedLabel(h.generatedAt))}</span></div>`;
  const oneLiner = pl.conclusions[0]?.headline ? `<p class="oneliner">${t(pl.conclusions[0].headline)}</p>` : '';
  const cover = `<header class="cover"><div class="eyebrow">Weekly Brief · Week ${h.weekNumber}</div><hr class="dash"><h1><b>${t(EXEC_LABELS.cover)}</b><br><span class="thin">${t(periodTitle)}</span></h1><hr class="dash"><p class="reading">${t(formatExecReadingTime(minutes))}</p>${oneLiner}</header>`;
  const tocHtml =
    toc.length > 0
      ? `<nav class="toc" id="${EXEC_TOC_ID}" aria-label="${t(EXEC_LABELS.toc)}"><div class="toc-d"><span class="toc-t">${t(EXEC_LABELS.toc)}</span>${toc.map((i) => internalLink(i.id, t(i.label))).join('')}</div><details class="toc-m"><summary>${t(EXEC_LABELS.toc)} (${toc.length})</summary><ul>${toc.map((i) => `<li>${internalLink(i.id, t(i.label))}</li>`).join('')}</ul></details></nav>`
      : '';

  const bodies = sections.map((s) => {
    switch (s.key) {
      case 'conclusions':
        return sectionHtml(s, conclusionsHtml(pl.conclusions));
      case 'gap':
        return sectionHtml(s, gapsHtml(pl.gaps));
      case 'tech':
        return sectionHtml(s, techHtml(pl.tech));
      case 'business':
        return sectionHtml(s, businessHtml(pl.business));
      case 'questions':
        return sectionHtml(s, questionsHtml(pl.questions));
      case 'evidence':
        return sectionHtml(s, evidenceHtml(pl.evidence));
      default:
        return '';
    }
  });

  const empty = isExecEmpty(pl) ? `<div class="empty">${t(EXEC_EMPTY_NOTICE)}</div>` : '';
  const partial = brief.status === 'partial' ? `<p>${t(EXEC_PARTIAL_NOTICE)}</p>` : '';
  const foot = `<footer class="foot">${partial}<p>${t(EXEC_FOOTER_NOTICE)} · ARGOS · ${t(formatKstDate(h.generatedAt))}</p></footer>`;
  const draft = meta.draft ? `<p class="draftnote">${t(EXEC_DRAFT_HTML_NOTICE)}</p>` : '';

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
${draft}<div class="page" id="${EXEC_TOP_ID}">${top}${cover}${tocHtml}<main>${bodies.join('')}${empty}</main>${foot}</div>
</body>
</html>
`;
}
