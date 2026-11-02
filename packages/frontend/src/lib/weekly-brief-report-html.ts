/**
 * 주간 브리프 v2(장문 리포트) → 단일 HTML 파일 (외부 스크립트·스타일시트 없음, 인라인 <style> 하나).
 *
 * 안전 원칙 (v1 규칙 + 리포트 확장, 명세 10.2)
 *  - 모든 텍스트는 escapeHtml + defang(금지 토큰을 폭 없는 공백으로 끊기)을 거친다. 새 필드 전부(하이라이트·도메인·회사·blurb·meaning·
 *    whyItMatters·watchPoints·keywordNote·titleKo …)가 대상이다.
 *  - 외부 href 는 safeVideoHref / safeArticleHref / safePaperHref, img src 는 safeThumbSrc 를 통과한 값만. 실패하면 링크 없이 텍스트.

 *  - 썸네일 <img> 는 loading="eager" + referrerpolicy="no-referrer" + ytimg 만(최대 12장). 스크립트가 금지라 lazy 이미지의 인쇄 워밍업이 불가능해 인쇄 시 누락되기 때문(PM 결정). v1 은 lazy 유지.
 *  - 내부 앵커(href="#…")는 문서에 대응하는 id 가 있을 때만 낸다(목차·"맨 위로"·도메인 이동). 내부 링크에는 target/rel 을 붙이지 않는다.
 *  - 금지 문자열: <script <link @import url( http:// javascript: data: <iframe <object <embed <form onerror onclick onload
 *    + <foreignobject <use xlink:href xmlns=
 *  - SVG 는 xmlns 없이 단색 도형(svg/title/polyline/line/circle)만, 좌표는 소수 1자리.
 *  - 결정적: 현재 시각·난수를 쓰지 않고, 날짜는 payload 의 generatedAt 을 고정 KST 로 변환한다. 모델명은 출력하지 않는다.
 */

import type {
  WeeklyCompany,
  WeeklyDomainBlock,
  WeeklyEvidenceCard,
  WeeklyHighlight,
  WeeklyReportArticle,
  WeeklyReportEvidence,
  WeeklyReportPaper,
  WeeklyReportResponse,
  WeeklyReportVideo,
  WeeklyWatchPoint,
} from '@/types/weekly-brief';
import { escapeHtml } from '@/lib/tech-trend-report-html';
import { ext, maybeLink, okHref, t } from '@/lib/weekly-brief-html-common';
import {
  POSTER_COLORS,
  POSTER_DURATION_BG,
  POSTER_LINE,
  POSTER_PAGE_BG,
  POSTER_THUMB_GRADIENT,
  POSTER_TOP_BAR,
  POSTER_WHITE,
  REPORT_CHART,
} from '@/lib/weekly-brief-theme';
import {
  POSTER_EMPTY_NOTICE,
  POSTER_FOOTER_NOTICE,
  POSTER_PARTIAL_NOTICE,
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
import {
  DOMAIN_BLOCK_IDS,
  REPORT_EVIDENCE_LABELS,
  REPORT_LABELS,
  REPORT_QUIET_LINE,
  REPORT_TOC_ID,
  REPORT_TOP_ID,
  REPORT_TOP_VIDEO_BADGE,
  REPORT_VIEWS_NOTE,
  REPORT_WHY_LABEL,
  buildCoverStats,
  buildToc,
  cardTypeLabel,
  companyCountLine,
  compareRows,
  domainFigureLine,
  estimateReadingMinutes,
  formatReadingTime,
  hasKeywordTable,
  hasTrendChart,
  isReportEmpty,
  keywordRows,
  otherCiUpdates,
  planReportSections,
  quietCountLine,
  sparklineModel,
  titlePair,
  volumeBarRows,
  type BarRow,
  type PlannedSection,
} from '@/lib/weekly-brief-report';

// ───────────────────────── 스타일 ─────────────────────────

function buildCss(): string {
  const c = POSTER_COLORS;
  return `
  :root{--bg:${c.base};--bg2:${c.band};--bg3:${c.pill};--line:${POSTER_LINE};--fg:${c.fg};--fg2:${c.fg2};--fg3:${c.fg3};--card:${c.card};--ink900:${POSTER_TOP_BAR};--track:${REPORT_CHART.track};--prev:${REPORT_CHART.barPrev}}
  *{box-sizing:border-box}
  [id]{scroll-margin-top:112px}
  html{scroll-behavior:smooth}
  body{margin:0;padding:18px 12px 40px;background:${POSTER_PAGE_BG};color:var(--fg);font-family:-apple-system,"Apple SD Gothic Neo","Pretendard","Noto Sans KR",Segoe UI,Roboto,sans-serif;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  a{color:var(--fg);text-decoration:underline;text-underline-offset:2px}
  h1,h2,h3,p,ul,ol{margin:0}
  ul{padding:0;list-style:none}
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
  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px;text-align:center}
  .sc{background:var(--card);padding:10px 8px}
  .sc .l{font-size:12px;color:var(--fg2)}
  .sc .v{font-size:24px;font-weight:900;line-height:1.2;margin-top:2px}
  .sc .d{font-size:12px;color:var(--fg2);margin-top:2px}
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
  .sh .nt{font-size:12px;color:var(--fg2);grid-column:2 / span 2}
  .sbody{padding:22px 20px 8px}
  .totop{padding:8px 20px 18px;text-align:right;font-size:12.5px}
  .totop a{color:var(--fg2)}
  .para{font-size:16px;line-height:1.78;margin:12px 0;color:var(--fg)}
  .meta{font-size:12.5px;color:var(--fg2);overflow-wrap:anywhere}
  .orig{font-size:12.5px;color:var(--fg2);margin-top:2px;overflow-wrap:anywhere}
  h3{font-size:18px;line-height:1.4;font-weight:800;break-after:avoid;page-break-after:avoid}
  .card{background:var(--card);padding:16px;margin:14px 0;break-inside:avoid;page-break-inside:avoid}
  .hl-h{display:flex;gap:10px;align-items:flex-start}
  .hl-no{flex:none;width:28px;height:28px;border-radius:999px;background:var(--bg3);text-align:center;line-height:28px;font-weight:800;font-size:14px}
  .fig{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;margin-top:10px}
  .fig .fvu{display:inline-flex;align-items:baseline;gap:2px}
  .fig .fv{font-size:34px;font-weight:900;line-height:1.1;letter-spacing:-.02em}
  .fig .fu{font-size:16px;font-weight:700}
  .fig .fc{font-size:13px;color:var(--fg2)}
  .fig .fd{font-size:13px;font-weight:700;background:var(--bg3);padding:1px 8px}
  .basis{font-size:12.5px;color:var(--fg2);margin-top:6px}
  .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
  .chips li{font-size:12.5px;background:var(--bg3);padding:3px 10px;border-radius:14px;color:var(--fg)}
  .bd{display:inline-block;font-style:normal;background:var(--bg3);color:var(--fg);font-size:11.5px;font-weight:700;padding:0 7px;margin-right:6px}
  .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
  .tags li{font-size:12.5px;border:1px solid var(--line);padding:2px 10px;border-radius:999px}
  .tags li b{margin-left:4px}
  .figs{font-size:13.5px;color:var(--fg2);margin-top:6px}
  .quiet{font-size:15px;margin-top:6px}
  .dom{padding:6px 0 10px;border-top:1px dashed var(--line)}
  .dom:first-child{border-top:0}
  .domnav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}
  .domnav a{font-size:13px;background:var(--bg3);padding:3px 11px;border-radius:999px;text-decoration:none}
  .evl{margin-top:8px}
  .evl>li{padding:8px 0;border-top:1px dashed var(--line);break-inside:avoid;page-break-inside:avoid}
  .evl>li:first-child{border-top:0}
  .evl .et{font-size:15px;font-weight:700}
  .line{font-size:14px;color:var(--fg2);margin-top:3px}
  .ci{margin-top:10px;padding:10px 12px;background:var(--bg2);break-inside:avoid;page-break-inside:avoid}
  .ci .ch{font-size:14px;font-weight:700}
  .ci .cv{font-size:15px;margin-top:4px}
  .ci .cv .arr{padding:0 6px}
  .other{font-size:13.5px;color:var(--fg2);margin-top:6px}
  .vc{display:grid;grid-template-columns:240px 1fr;gap:16px;align-items:start}
  .thw{display:block;position:relative;aspect-ratio:16/9;background:${POSTER_THUMB_GRADIENT};border:1px solid var(--line);overflow:hidden}
  .thw img{display:block;width:100%;height:100%;object-fit:cover}
  .thw.ph{display:flex;align-items:center;justify-content:center;color:var(--fg2);font-size:22px}
  .dur{position:absolute;right:4px;bottom:4px;background:${POSTER_DURATION_BG};color:${POSTER_WHITE};font-size:11px;padding:1px 5px}
  .vlines{margin-top:8px;display:grid;gap:4px}
  .vlines li{font-size:14.5px;line-height:1.6;padding-left:12px;position:relative}
  .vlines li::before{content:"·";position:absolute;left:2px}
  .why{font-size:14px;margin-top:8px;padding:8px 10px;background:var(--bg2)}
  .why b{font-size:12px;letter-spacing:.04em;display:block;color:var(--fg2);margin-bottom:2px}
  .row{display:grid;grid-template-columns:1fr auto;gap:4px 14px;padding:12px 0;border-top:1px dashed var(--line);break-inside:avoid;page-break-inside:avoid}
  .row:first-child{border-top:0}
  .row h3{font-size:16px}
  .sub3{font-size:16px;margin:22px 0 8px}
  .spark{display:block;width:100%;max-width:100%;height:auto}
  .bars{display:grid;gap:6px;margin-top:8px}
  .br{display:grid;grid-template-columns:48px 1fr 54px;gap:8px;align-items:center;font-size:13px}
  .br.cur .bl{font-weight:800}
  .track{height:10px;background:var(--track);position:relative}
  .fill{height:10px;background:${REPORT_CHART.stroke}}
  .fill.prev{background:var(--prev)}
  .brn{grid-column:2 / span 2;font-size:12px;color:var(--fg2);margin-top:-3px}
  .cmp{display:grid;gap:10px;margin-top:8px}
  .cmp .ct{display:grid;grid-template-columns:48px 1fr 70px;gap:8px;align-items:center;font-size:13px}
  .cmp .pair{display:grid;gap:3px}
  table.kw{width:100%;border-collapse:collapse;font-size:14px;margin-top:10px}
  table.kw th,table.kw td{padding:7px 8px;text-align:left;border-top:1px dashed var(--line)}
  table.kw th{font-size:12px;color:var(--fg2);font-weight:700;border-top:0}
  table.kw td.n{text-align:right;white-space:nowrap}
  table.kw td.bar{min-width:80px}
  .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .foot{padding:16px 20px 26px;text-align:center;font-size:11px;color:var(--fg3);border-top:1px dashed var(--line)}
  .foot p{margin:0 0 4px}
  .empty{padding:36px 20px;text-align:center;color:var(--fg2);font-size:15px}
  @media (max-width:640px){
    body{padding:10px 0 30px}
    .top{padding:12px 20px}
    .cover{padding:28px 20px 18px}
    h1{font-size:30px}
    .stats{grid-template-columns:repeat(2,1fr)}
    .toc{padding:10px 20px;position:static}
    .toc-d{display:none}
    .toc-m{display:block}
    .sh{padding:14px 20px}
    .sh h2{font-size:20px}
    h1 .thin{display:block;font-size:22px}
    .sbody{padding:18px 20px 6px}
    .totop{padding:6px 20px 16px}
    .para{font-size:15px}
    .vc{grid-template-columns:1fr}
    .row{grid-template-columns:1fr}
    .foot{padding:16px 20px 26px}
    .br{grid-template-columns:44px 1fr 48px}
  }
  @page{size:A4 portrait;margin:10mm}
  @media print{
    body{background:${POSTER_WHITE};padding:0}
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    html{scroll-behavior:auto}
    .page{max-width:none;width:100%}
    .toc,.totop{display:none}
    .card,.row,.ci,.sh,.cover,.evl>li,.vlines li,.br,table.kw tr{break-inside:avoid;page-break-inside:avoid}
    h2,h3{break-after:avoid;page-break-after:avoid}
    .para{font-size:13px;line-height:1.6;margin:6px 0}
    .card{margin:8px 0;padding:10px 12px}
    .vc{grid-template-columns:150px 1fr;gap:10px}
    .sh{padding-top:10px;padding-bottom:10px}
    .sbody{padding-top:12px}
  }
`;
}

// ───────────────────────── 조각 ─────────────────────────

function internalLink(id: string, inner: string, cls?: string): string {
  const c = cls ? ` class="${cls}"` : '';
  return `<a${c} href="#${id}">${inner}</a>`;
}

function badge(label: string): string {
  return label ? `<i class="bd">${t(label)}</i>` : '';
}

function para(text: string | null | undefined): string {
  return text ? `<p class="para">${t(text)}</p>` : '';
}

function deltaText(d: { value: string; unit: string; label: string }): string {
  const raw = d.value.trim();
  const sign = raw.startsWith('-') ? '▼' : raw.startsWith('+') ? '▲' : raw === '0' || raw === '0.0' ? '±' : '';
  const body = raw.replace(/^[+-]/, '');
  return `${d.label} ${sign}${body}${d.unit}`;
}

function evidenceChips(list: readonly WeeklyReportEvidence[]): string {
  const items = list
    .slice(0, 3)
    .map((e) => {
      const kind = REPORT_EVIDENCE_LABELS[e.type] ?? '';
      const href = e.type === 'keyword' ? '' : okHref(e.type === 'video' ? safeVideoHref(e.url) : e.type === 'paper' ? safePaperHref(e.url) : safeArticleHref(e.url));
      const inner = `${t(kind)} · ${t(e.title)}${e.label ? ` (${t(e.label)})` : ''}`;
      return `<li>${href ? ext(href, `${inner} ↗`) : inner}</li>`;
    })
    .join('');
  return items ? `<ul class="chips">${items}</ul>` : '';
}

function cardHref(c: WeeklyEvidenceCard): string {
  return c.type === 'video' ? safeVideoHref(c.url) : c.type === 'paper' ? safePaperHref(c.url) : safeArticleHref(c.url);
}

function titleHtml(main: string, sub: string, href: string): string {
  return `${maybeLink(href, t(main))}${sub ? `<div class="orig">${t(REPORT_LABELS.original)}: ${t(sub)}</div>` : ''}`;
}

function evidenceCard(c: WeeklyEvidenceCard): string {
  const { main, sub } = titlePair(c.title, c.titleKo);
  const md = c.publishedAt ? formatKstMonthDay(c.publishedAt) : '';
  const meta = [c.source, md].filter(Boolean).map((x) => t(x)).join(' · ');
  return `<li>${badge(cardTypeLabel(c.type))}<span class="et">${titleHtml(main, sub, cardHref(c))}</span>${meta ? `<div class="meta">${meta}</div>` : ''}${c.line ? `<p class="line">${t(c.line)}</p>` : ''}</li>`;
}

function evidenceList(cards: readonly WeeklyEvidenceCard[]): string {
  return cards.length ? `<ul class="evl">${cards.map(evidenceCard).join('')}</ul>` : '';
}

function backToTop(): string {
  return `<p class="totop">${internalLink(REPORT_TOP_ID, `↑ ${t(REPORT_LABELS.backToTop)}`)}</p>`;
}

function sectionHeader(s: PlannedSection): string {
  const cnt = s.countLabel ? `<span class="cnt">${t(s.countLabel)}</span>` : '';
  const notice = s.notice ? `<p class="nt">${t(s.notice)}</p>` : '';
  return `<div class="sh"><span class="no" aria-hidden="true">${t(s.number)}</span><h2>${t(s.title)}</h2>${cnt}<p class="subt">${t(s.subtitle)}</p>${notice}</div>`;
}

function section(s: PlannedSection, body: string): string {
  return `<section class="sec" id="${s.id}">${sectionHeader(s)}<div class="sbody">${body}</div>${backToTop()}</section>`;
}

// ───────────────────────── 섹션 본문 ─────────────────────────

function highlightHtml(h: WeeklyHighlight, i: number): string {
  const f = h.figure;
  const fig = f
    ? `<div class="fig"><span class="fvu"><span class="fv">${t(f.value)}</span>${f.unit ? `<span class="fu">${t(f.unit)}</span>` : ''}</span><span class="fc">${t(f.caption)}</span>${f.delta ? `<span class="fd">${t(deltaText(f.delta))}</span>` : ''}</div>`
    : '';
  return `<article class="card"><div class="hl-h"><span class="hl-no" aria-hidden="true">${i + 1}</span><h3>${t(h.headline)}</h3></div>${fig}${para(h.body)}<p class="basis">${t(h.basis)}</p>${evidenceChips(h.evidence)}</article>`;
}

function domainBlockHtml(d: WeeklyDomainBlock): string {
  const id = DOMAIN_BLOCK_IDS[d.key];
  if (d.status !== 'active') {
    return `<article class="dom" id="${id}"><h3>${t(d.label)}</h3><p class="quiet">${t(REPORT_QUIET_LINE)}</p><p class="figs">${t(quietCountLine(d))}</p></article>`;
  }
  const tags = d.topTags.length ? `<ul class="tags">${d.topTags.map((x) => `<li>${t(x.tag)}<b>${t(String(x.count))}</b></li>`).join('')}</ul>` : '';
  return `<article class="dom" id="${id}"><h3>${t(d.label)}</h3><p class="figs">${t(domainFigureLine(d))}</p>${para(d.narrative)}${tags}${evidenceList(d.evidence)}</article>`;
}

function companyHtml(c: WeeklyCompany): string {
  const ci = c.ciChanges
    .map((k) => {
      const src = okHref(safeArticleHref(k.sourceUrl));
      const srcHtml = src ? ext(src, '출처 ↗') : k.sourceName ? t(k.sourceName) : '';
      const metaParts = [`신뢰도 ${t(k.confidence)}`, srcHtml, t(formatKstMonthDay(k.changedAt))].filter(Boolean).join(' · ');
      return `<div class="ci"><div class="ch">${t(k.item)}${k.layer ? ` <span class="meta">(${t(k.layer)})</span>` : ''}</div><div class="cv">${k.before ? `<span>${t(k.before)}</span><span class="arr" aria-hidden="true">→</span>` : ''}<b>${t(k.after)}</b></div>${k.meaning ? `<p class="line">${t(k.meaning)}</p>` : ''}<div class="meta">${metaParts}</div></div>`;
    })
    .join('');
  return `<article class="card"><h3>${t(c.name)}</h3><p class="meta">${t(companyCountLine(c))}</p>${para(c.blurb)}${evidenceList(c.items)}${ci}</article>`;
}

function thumbHtml(v: Pick<WeeklyReportVideo, 'thumbnail' | 'title' | 'url' | 'durationSec'>): string {
  const src = okHref(safeThumbSrc(v.thumbnail));
  const href = okHref(safeVideoHref(v.url));
  const dur = formatDuration(v.durationSec);
  const durHtml = dur ? `<span class="dur">${t(dur)}</span>` : '';
  if (!src) return `<div class="thw ph" aria-hidden="true">▶${durHtml}</div>`;
  const img = `<img src="${escapeHtml(src)}" alt="${t(v.title)}" width="320" height="180" loading="eager" referrerpolicy="no-referrer">${durHtml}`;
  return href ? `<a class="thw" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${img}</a>` : `<div class="thw">${img}</div>`;
}

function videoHtml(v: WeeklyReportVideo): string {
  const { main, sub } = titlePair(v.title, v.titleKo);
  const href = safeVideoHref(v.url);
  const dom = domainLabel(v.domain);
  const meta = [
    v.channel ? t(v.channel) : '',
    v.publishedAt ? t(formatKstMonthDay(v.publishedAt)) : '',
    v.views != null ? `조회 ${t(formatViews(v.views))} (수집 시점)` : '',
    href ? ext(okHref(href), '유튜브 원본 ↗') : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const lines = v.summaryLines.length ? `<ul class="vlines">${v.summaryLines.map((s) => `<li>${t(s)}</li>`).join('')}</ul>` : '';
  const tags = v.tags.length ? `<ul class="tags">${v.tags.map((x) => `<li>${t(x)}</li>`).join('')}</ul>` : '';
  const top = v.isTop ? `<i class="bd">${t(REPORT_TOP_VIDEO_BADGE)}</i>` : '';
  return `<article class="card vc">${thumbHtml(v)}<div>${top}${badge(dom)}<h3>${titleHtml(main, sub, href)}</h3><p class="meta">${meta}</p>${lines}${tags}</div></article>`;
}

function paperHtml(x: WeeklyReportPaper): string {
  const { main, sub } = titlePair(x.title, x.titleKo);
  const md = x.publishedAt ? formatKstMonthDay(x.publishedAt) : '';
  const meta = [x.authors ? t(x.authors) : '', 'arXiv', md ? t(md) : ''].filter(Boolean).join(' · ');
  const lines = x.summaryLines.length ? `<ul class="vlines">${x.summaryLines.map((s) => `<li>${t(s)}</li>`).join('')}</ul>` : '';
  const why = x.whyItMatters ? `<p class="why"><b>${t(REPORT_WHY_LABEL)}</b>${t(x.whyItMatters)}</p>` : '';
  return `<article class="card">${badge(domainLabel(x.domain))}<h3>${titleHtml(main, sub, safePaperHref(x.url))}</h3><p class="meta">${meta}</p>${lines}${why}</article>`;
}

function articleHtml(a: WeeklyReportArticle): string {
  const { main, sub } = titlePair(a.title, a.titleKo);
  const md = a.publishedAt ? formatKstMonthDay(a.publishedAt) : '';
  const meta = [t(a.source), md ? t(md) : ''].filter(Boolean).join(' · ');
  const lines = a.summaryLines.length ? `<ul class="vlines">${a.summaryLines.map((s) => `<li>${t(s)}</li>`).join('')}</ul>` : '';
  return `<li class="row"><div>${badge(domainLabel(a.domain))}<h3>${titleHtml(main, sub, safeArticleHref(a.url))}</h3>${lines}</div><div class="meta">${meta}</div></li>`;
}

function barRowHtml(r: BarRow): string {
  return `<li class="br${r.current ? ' cur' : ''}"><span class="bl">${t(r.label)}</span><div class="track"><div class="fill" style="width:${r.pct}%"></div></div><span class="bv">${t(r.value)}</span>${r.note ? `<span class="brn">${t(r.note)}</span>` : ''}</li>`;
}

function sparklineHtml(weeks: WeeklyReportResponse['payload']['trends']['volume']['weeks']): string {
  const m = sparklineModel(weeks);
  if (!m) return '';
  const label = `최근 ${weeks.length}주 수집량 추이: ${m.points.map((p) => `${p.week} ${p.total}건`).join(', ')}`;
  const base = `<line x1="8" y1="${m.height - 8}" x2="${m.width - 8}" y2="${m.height - 8}" stroke="${REPORT_CHART.grid}" stroke-width="1"/>`;
  const dots = m.points.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="${REPORT_CHART.stroke}"/>`).join('');
  return `<svg class="spark" viewBox="0 0 ${m.width} ${m.height}" width="${m.width}" height="${m.height}" role="img" aria-label="${t(label)}"><title>${t(label)}</title>${base}<polyline points="${m.polyline}" fill="none" stroke="${REPORT_CHART.stroke}" stroke-width="2"/>${dots}<circle cx="${m.last.x}" cy="${m.last.y}" r="4.5" fill="${REPORT_CHART.dot}"/></svg>`;
}

function trendsHtml(p: WeeklyReportResponse['payload']): string {
  const weeks = p.trends.volume.weeks;
  const out: string[] = [];
  if (hasTrendChart(weeks)) {
    out.push(`<h3 class="sub3">최근 ${weeks.length}주 수집량</h3>${sparklineHtml(weeks)}<ul class="bars">${volumeBarRows(weeks, p.header.weekStart).map(barRowHtml).join('')}</ul>`);
  } else {
    const c = p.header.counts;
    out.push(`<h3 class="sub3">이번 주 수집량</h3><p class="para">영상 ${c.videosNew}건 · 기사 ${c.articles}건 · 논문 ${c.papers}건이 수집되었습니다. 추이를 비교할 만큼의 주별 데이터가 아직 없습니다.</p>`);
  }
  const cmp = compareRows(weeks, p.header.weekStart);
  if (cmp.length > 0) {
    out.push(
      `<h3 class="sub3">이번 주 vs 지난주</h3><div class="cmp">${cmp
        .map((r) => `<div class="ct"><span>${t(r.label)}</span><div class="pair"><div class="track"><div class="fill" style="width:${r.curPct}%"></div></div><div class="track"><div class="fill prev" style="width:${r.prevPct}%"></div></div></div><span class="meta">이번 주 ${r.cur} / 지난주 ${r.prev}${r.delta ? ` ${t(r.delta)}` : ''}</span></div>`)
        .join('')}</div>`,
    );
  }
  if (p.trends.keywordNote) out.push(para(p.trends.keywordNote));
  if (hasKeywordTable(p)) {
    const rows = keywordRows(p.trends.keywords)
      .map((r) => `<tr><td>${t(r.term)}</td><td class="n">${t(r.count)}</td><td class="n">${t(r.prevCount)}</td><td class="n">${t(r.deltaText)}</td><td class="bar"><div class="track"><div class="fill" style="width:${r.pct}%"></div></div><span class="sr">${t(r.symbol)}</span></td><td class="n" aria-hidden="true">${t(r.symbol)}</td></tr>`)
      .join('');
    out.push(`<h3 class="sub3">키워드 증감</h3><table class="kw"><thead><tr><th scope="col">용어</th><th scope="col">이번 주</th><th scope="col">지난주</th><th scope="col">증감</th><th scope="col">언급량</th><th scope="col">방향</th></tr></thead><tbody>${rows}</tbody></table>`);
  }
  return out.join('');
}

function watchHtml(w: WeeklyWatchPoint): string {
  return `<article class="card"><h3>${t(w.title)}</h3>${para(w.body)}${evidenceChips(w.evidence)}</article>`;
}

// ───────────────────────── 빌더 ─────────────────────────

export function buildReportHtml(brief: WeeklyReportResponse): string {
  const p = brief.payload;
  const h = p.header;
  const periodTitle = formatWeekTitle(h.weekStart, h.weekEnd, h.weekNumber);
  const sections = planReportSections(p);
  const toc = buildToc(sections);
  const minutes = estimateReadingMinutes(p);

  const top = `<div class="top"><div>ARGOS <span>|| WEEKLY BRIEF</span></div><span>${t(formatGeneratedLabel(h.generatedAt))}</span></div>`;
  const stats = buildCoverStats(h.counts, h.deltas)
    .map((s) => `<div class="sc"><div class="l">${t(s.label)}</div><div class="v">${t(s.value)}</div><div class="d">${t(s.deltaPhrase)}</div></div>`)
    .join('');
  const reading = minutes > 0 ? `<p class="reading">${t(formatReadingTime(minutes))}</p>` : '';
  const cover = `<header class="cover"><div class="eyebrow">Weekly Brief · Week ${h.weekNumber}</div><hr class="dash"><h1><b>${t(REPORT_LABELS.cover)}</b><br><span class="thin">${t(periodTitle)}</span></h1><hr class="dash">${reading}<div class="stats">${stats}</div></header>`;

  const tocHtml =
    toc.length > 0
      ? `<nav class="toc" id="${REPORT_TOC_ID}" aria-label="${t(REPORT_LABELS.toc)}"><div class="toc-d"><span class="toc-t">${t(REPORT_LABELS.toc)}</span>${toc.map((i) => internalLink(i.id, t(i.label))).join('')}</div><details class="toc-m"><summary>${t(REPORT_LABELS.toc)} (${toc.length})</summary><ul>${toc.map((i) => `<li>${internalLink(i.id, t(i.label))}</li>`).join('')}</ul></details></nav>`
      : '';

  const bodies: string[] = sections.map((s) => {
    switch (s.key) {
      case 'glance':
        return section(s, p.highlights.map(highlightHtml).join(''));
      case 'domains':
        return section(s, `<nav class="domnav" aria-label="도메인 바로가기">${p.domains.map((d) => internalLink(DOMAIN_BLOCK_IDS[d.key], t(d.label))).join('')}</nav>${p.domains.map(domainBlockHtml).join('')}`);
      case 'companies': {
        const other = otherCiUpdates(p);
        return section(s, `${p.companies.map(companyHtml).join('')}${other > 0 ? `<p class="other">그 외 CI 갱신 ${other}건</p>` : ''}`);
      }
      case 'videos':
        return section(s, `<p class="meta">${t(REPORT_VIEWS_NOTE)}</p>${p.videos.map(videoHtml).join('')}`);
      case 'papers':
        return section(s, p.papers.map(paperHtml).join(''));
      case 'news':
        return section(s, `<ul>${p.articles.map(articleHtml).join('')}</ul>`);
      case 'trends':
        return section(s, trendsHtml(p));
      case 'watch':
        return section(s, p.watchPoints.map(watchHtml).join(''));
      default:
        return '';
    }
  });

  const empty = isReportEmpty(p) ? `<div class="empty">${t(POSTER_EMPTY_NOTICE)}</div>` : '';
  const partial = brief.status === 'partial' ? `<p>${t(POSTER_PARTIAL_NOTICE)}</p>` : '';
  const foot = `<footer class="foot">${partial}<p>${t(POSTER_FOOTER_NOTICE)} · ARGOS · ${t(formatKstDate(h.generatedAt))}</p></footer>`;

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
<div class="page" id="${REPORT_TOP_ID}">${top}${cover}${tocHtml}<main>${bodies.join('')}${empty}</main>${foot}</div>
</body>
</html>
`;
}

