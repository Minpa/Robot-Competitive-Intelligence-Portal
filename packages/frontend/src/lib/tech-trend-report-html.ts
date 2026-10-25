/**
 * 공유용 리포트 → 단일 HTML 파일 (외부 스크립트/스타일시트 없음, 인라인 <style>만).
 *
 * 안전 원칙:
 *  - 모든 텍스트는 escapeHtml을 거친다.
 *  - href/src는 safeHref(https + 호스트 allowlist)를 통과한 값만 출력한다.
 *  - 모든 외부 링크는 rel="noopener noreferrer" target="_blank".
 */

import type { EvidenceRef, TechTrendReport, TrendInsight } from '@/types/tech-trend-report';
import {
  isTimelineDomain,
  timelineDomainNoun,
  type TechTrendTimeline,
  type TechTrendTimelineInsightResponse,
  type TimelineInsight,
} from '@/types/tech-trend-timeline';
import { CATEGORY_PALETTE, CHART_HUE_MUTED } from '@/app/events/wrc2026/components/chartColors';

export interface ReportHtmlMeta {
  /** 원본 페이지 URL (푸터에 표시) */
  pageUrl: string;
  titleKo?: string;
  titleEn?: string;
}

/** 다운로드 HTML에 넣을 시계열 데이터 (react-query 캐시에서 읽은 값). 없으면 카드를 생략한다. */
export interface TimelineHtmlData {
  timeline: TechTrendTimeline | null | undefined;
  insight?: TechTrendTimelineInsightResponse | null;
}

export function escapeHtml(s: string | null | undefined): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ALLOWED_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'youtu.be', 'arxiv.org', 'i.ytimg.com']);

/** https + allowlist 호스트만 통과. 불합격은 '' */
export function safeHref(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return '';
    if (!ALLOWED_HOSTS.has(u.hostname.toLowerCase())) return '';
    return u.toString();
  } catch {
    return '';
  }
}

/** 근거 표시 문구: `영상 · {title} ({label})` / `논문 · {title} ({label})` (label 없으면 괄호 생략) */
export function formatEvidenceText(ev: EvidenceRef): string {
  const kind = ev.kind === 'paper' ? '논문' : '영상';
  return `${kind} · ${ev.title}${ev.label ? ` (${ev.label})` : ''}`;
}

/** points[i]에 대응하는 근거 목록 — pointEvidence가 없거나 길이가 맞지 않으면 null(근거 줄 생략) */
export function evidenceForPoints(insight: Pick<TrendInsight, 'points' | 'pointEvidence'>): EvidenceRef[][] | null {
  const ev = insight.pointEvidence;
  return Array.isArray(ev) && ev.length === insight.points.length ? ev : null;
}

function evidenceLinesHtml(refs: EvidenceRef[] | undefined): string {
  if (!refs || refs.length === 0) return '';
  return refs
    .map((ev) => {
      const text = escapeHtml(formatEvidenceText(ev));
      const href = safeHref(ev.url);
      const inner = href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${text}</a>` : text;
      return `<div class="ev" style="margin-top:3px;font-size:11.5px;color:#8A909A">${inner}</div>`;
    })
    .join('');
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${fmtDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STYLE = `
*{box-sizing:border-box}
body{margin:0;padding:32px 24px;background:#F2F3F4;color:#1F2328;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;font-size:14px;line-height:1.6}
a{color:#1F4A7A;text-decoration:none}
a:hover{text-decoration:underline}
.wrap{max-width:1040px;margin:0 auto}
.kicker{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:#8A909A;margin-bottom:6px}
h1{font-size:28px;line-height:1.2;margin:0 0 6px;letter-spacing:-.01em}
h1 small{font-size:15px;font-weight:400;color:#5C636E;margin-left:10px;letter-spacing:.02em}
h2{font-size:17px;margin:0 0 12px;letter-spacing:-.01em}
.meta{color:#5C636E;font-size:13px;margin:0}
.card{background:#fff;border:1px solid #E6E7EA;border-radius:14px;padding:20px 22px;margin-top:18px}
.tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px}
.tile{background:#fff;border:1px solid #E6E7EA;border-radius:14px;padding:16px 18px}
.tile .v{font-size:30px;font-weight:700;line-height:1;margin-top:6px}
.tile .u{font-size:11px;color:#5C636E;margin-left:4px;font-weight:400}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.chip{display:inline-block;background:#F2F3F4;color:#5C636E;border:1px solid #E6E7EA;border-radius:999px;padding:2px 10px;font-size:11px}
.headline{font-size:15.5px;font-weight:600;margin:0 0 10px}
ol.points{margin:0;padding-left:22px}
ol.points li{margin:6px 0;color:#1F2328}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.vcard{border:1px solid #E6E7EA;border-radius:10px;overflow:hidden;background:#fff}
.vcard img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;background:#F2F3F4}
.vcard .ph{width:100%;aspect-ratio:16/9;background:#F2F3F4}
.vcard .b{padding:10px 12px}
.vcard .t{font-weight:600;font-size:13px;line-height:1.4;margin:0 0 6px;color:#1F2328}
.vcard .m{font-size:11.5px;color:#8A909A;margin:0}
.vcard .s{font-size:12px;color:#5C636E;margin:6px 0 0}
.paper{padding:12px 0;border-bottom:1px solid #E6E7EA}
.paper:last-child{border-bottom:0}
.paper .t{font-weight:600;font-size:13.5px;margin:0 0 4px}
.paper .a{font-size:12.5px;color:#5C636E;margin:0 0 4px}
.paper .m{font-size:11.5px;color:#8A909A;margin:0}
.empty{color:#8A909A;font-size:13px;padding:8px 0}
.tl-svg{display:block;width:100%;height:auto}
.tl-sub{margin:16px 0 6px;font-size:13px;font-weight:600}
.tl-note{font-size:11.5px;color:#8A909A;margin:6px 0 0;line-height:1.6}
.tl-table{border-collapse:separate;border-spacing:2px;width:100%;font-size:12px}
.tl-table th{font-weight:500;color:#5C636E;font-size:11px;padding:2px 4px;text-align:center}
.tl-table th.l,.tl-table td.l{text-align:left}
.tl-table td{text-align:center;padding:5px 4px;border-radius:3px;font-weight:600;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.tl-table td.l{font-weight:400;padding-left:0;white-space:nowrap}
.tl-table td.t{font-weight:500;color:#3A3F47;text-align:right}
.tl-item{margin:8px 0;font-size:13px}
.tl-badge{display:inline-block;background:#ECECEF;color:#3A3F47;border-radius:999px;padding:1px 8px;font-size:11px;margin-left:6px}
.foot{margin-top:28px;padding-top:14px;border-top:1px solid #E6E7EA;color:#8A909A;font-size:11.5px;line-height:1.7}
@media print{
  body{background:#fff;padding:0}
  .card,.tile,.vcard,.paper{break-inside:avoid}
  a{color:#1F2328}
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// 기술 시계열 카드 (다운로드 2안: 인라인 SVG 막대 + 히트맵 배경색 표 2개 + 해설 요약)
// ─────────────────────────────────────────────────────────────────────────────

const PAPER_COLOR = CATEGORY_PALETTE[0] as string;
const VIDEO_COLOR = CATEGORY_PALETTE[1] as string;
/** 히트맵 농도 4단계 (화면과 동일) */
const STEP_ALPHA = [0.18, 0.4, 0.68, 1] as const;

/** '#RRGGBB' + alpha → rgba(). 토큰 색에서 파생하므로 새 색을 정의하지 않는다. */
function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return hex;
  return `rgba(${parseInt(m[1]!, 16)},${parseInt(m[2]!, 16)},${parseInt(m[3]!, 16)},${alpha})`;
}

function int(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
}

function shortMonthLabel(month: string): string {
  return `${month.slice(2, 4)}.${month.slice(5, 7)}`;
}

/** (a) 월별 논문·영상 묶음 막대 — viewBox 기반 반응형 인라인 SVG */
function buildVolumeSvg(timeline: TechTrendTimeline): string {
  const buckets = timeline.buckets;
  const W = 720;
  const H = 280;
  const left = 40;
  const right = 12;
  const top = 34;
  const bottom = 36;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const maxVal = Math.max(1, ...buckets.flatMap((b) => [int(b.papers.total), int(b.videos.total)]));
  const step = Math.max(1, Math.ceil(maxVal / 4));
  const yMax = step * Math.ceil(maxVal / step);
  const yOf = (v: number) => top + plotH - (v / yMax) * plotH;
  const groupW = plotW / Math.max(1, buckets.length);
  const barW = Math.max(4, Math.min(28, groupW * 0.34));

  const parts: string[] = [];
  parts.push(
    `<svg class="tl-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml('월별 논문·영상 수집 건수 막대 차트')}" xmlns="http://www.w3.org/2000/svg">`
  );
  // 범례
  parts.push(`<rect x="${left}" y="10" width="10" height="10" fill="${PAPER_COLOR}"/><text x="${left + 14}" y="19" font-size="11" fill="#5C636E">${escapeHtml('논문')}</text>`);
  parts.push(`<rect x="${left + 56}" y="10" width="10" height="10" fill="${VIDEO_COLOR}"/><text x="${left + 70}" y="19" font-size="11" fill="#5C636E">${escapeHtml('영상')}</text>`);
  parts.push(`<text x="${left + 118}" y="19" font-size="10.5" fill="#8A909A">${escapeHtml('연한 색 = 집계 중인 월 · 회색 = 수집 시작 이전 월')}</text>`);
  // Y축 눈금 + 라벨
  for (let v = 0; v <= yMax; v += step) {
    const y = yOf(v);
    parts.push(`<line x1="${left}" y1="${y.toFixed(1)}" x2="${W - right}" y2="${y.toFixed(1)}" stroke="#ECECEF" stroke-width="1"/>`);
    parts.push(`<text x="${left - 6}" y="${(y + 4).toFixed(1)}" font-size="11" fill="#5C636E" text-anchor="end">${int(v)}</text>`);
  }
  parts.push(`<text x="4" y="${top - 8}" font-size="10.5" fill="#8A909A">${escapeHtml('건수')}</text>`);
  // 막대
  buckets.forEach((b, i) => {
    const cx = left + groupW * i + groupW / 2;
    const pairs: [number, string][] = [
      [int(b.papers.total), PAPER_COLOR],
      [int(b.videos.total), VIDEO_COLOR],
    ];
    pairs.forEach(([val, color], k) => {
      const x = cx + (k === 0 ? -barW - 1 : 1);
      const y = yOf(val);
      const h = Math.max(0, top + plotH - y);
      const fill = b.beforeCollection ? CHART_HUE_MUTED : color;
      const opacity = b.partial ? 0.45 : 1;
      if (val > 0) {
        parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" fill-opacity="${opacity}"><title>${escapeHtml(
          `${b.month.replace('-', '.')} · ${k === 0 ? '논문' : '영상'} ${val}${k === 0 ? '편' : '건'}${b.partial ? ' (집계 중)' : ''}`
        )}</title></rect>`);
        parts.push(`<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 3).toFixed(1)}" font-size="10" fill="#3A3F47" text-anchor="middle">${val}</text>`);
      }
    });
    parts.push(`<text x="${cx.toFixed(1)}" y="${H - bottom + 16}" font-size="11" fill="#5C636E" text-anchor="middle">${escapeHtml(shortMonthLabel(b.month))}</text>`);
  });
  parts.push(`<text x="${(left + plotW / 2).toFixed(1)}" y="${H - 6}" font-size="10.5" fill="#8A909A" text-anchor="middle">${escapeHtml('월 (UTC 기준 YY.MM)')}</text>`);
  parts.push('</svg>');
  return parts.join('');
}

/** (c) 서브토픽 × 기간 — 배경색 인라인 스타일 표 (숫자 병기). 소스별 1개. */
function buildHeatTable(timeline: TechTrendTimeline, source: 'papers' | 'videos'): string {
  const color = source === 'papers' ? PAPER_COLOR : VIDEO_COLOR;
  const unit = source === 'papers' ? '편' : '건';
  const hm = timeline.heatmap;
  const topicById = new Map(timeline.topics.map((t) => [t.id, t] as const));
  const max = Math.max(0, ...hm.rows.flatMap((r) => r[source].any.map(int)));
  const head = hm.columns
    .map((c) => `<th>${escapeHtml(c.label)}${c.partial ? `<br>${escapeHtml('(집계 중)')}` : ''}</th>`)
    .join('');
  const rows = hm.rows
    .map((r) => {
      const t = topicById.get(r.topicId);
      const cells = r[source].any
        .map((raw, i) => {
          const v = int(raw);
          const col = hm.columns[i];
          const title = escapeHtml(`${t?.shortLabel ?? r.topicId} · ${col?.label ?? ''} · ${v}${unit}`);
          if (v === 0) return `<td title="${title}" style="background:#F6F7F8;color:#C6CAD0">0</td>`;
          const ratio = max > 0 ? v / max : 0;
          const stepIdx = ratio <= 0.25 ? 0 : ratio <= 0.5 ? 1 : ratio <= 0.75 ? 2 : 3;
          const textColor = stepIdx === 3 ? '#FFFFFF' : '#1F2328';
          return `<td title="${title}" style="background:${hexToRgba(color, STEP_ALPHA[stepIdx])};color:${textColor}">${v}</td>`;
        })
        .join('');
      const total = t ? int(t.totals[source].any) : 0;
      return `<tr><td class="l">${escapeHtml(t?.shortLabel ?? r.topicId)}</td>${cells}<td class="t">${total}</td></tr>`;
    })
    .join('');
  return `<table class="tl-table"><thead><tr><th class="l">${escapeHtml('서브토픽')}</th>${head}<th>${escapeHtml('합계')}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function leadLagLabel(relation: string, lag: number | null): string {
  if (relation === 'paper_leads') return `논문 선행 ${int(lag)}개월`;
  if (relation === 'video_leads') return `영상 선행 ${int(lag)}개월`;
  if (relation === 'concurrent') return '동시';
  return '판단 유보';
}

function buildInsightSummary(data: TechTrendTimelineInsightResponse | null | undefined, ratio: number): string {
  if (!data) return `<p class="empty">${escapeHtml('해설 생성 불가')}</p>`;
  if (data.status !== 'ok' || !data.insight) {
    const msg =
      data.status === 'insufficient_classification'
        ? `분류 완료율이 낮아 해설을 생성하지 않았습니다(필요 80%, 현재 ${Math.floor(ratio * 100)}%)`
        : data.status === 'insufficient_period'
          ? '수집 기간이 짧아(3개월 미만) 해설을 생성하지 않았습니다'
          : '해설 생성 불가';
    return `<p class="empty">${escapeHtml(msg)}</p>`;
  }
  const ins: TimelineInsight = data.insight;
  const rising = ins.rising
    .map(
      (r) =>
        `<div class="tl-item"><strong>${escapeHtml(r.label)}</strong><span class="tl-badge">${escapeHtml(`논문 ${int(r.metrics.papers.prior)}→${int(r.metrics.papers.recent)}`)}</span><span class="tl-badge">${escapeHtml(`영상 ${int(r.metrics.videos.prior)}→${int(r.metrics.videos.recent)}`)}</span><br>${escapeHtml(r.evidence)}</div>`
    )
    .join('');
  const declining = ins.declining
    .map((d) => `<div class="tl-item"><strong>${escapeHtml(d.label)}</strong> — ${escapeHtml(d.note)}</div>`)
    .join('');
  const leadLag = ins.leadLag
    .map(
      (l) =>
        `<div class="tl-item"><strong>${escapeHtml(l.label)}</strong><span class="tl-badge">${escapeHtml(leadLagLabel(l.relation, l.lagMonths))}</span> ${escapeHtml(l.note)}</div>`
    )
    .join('');
  const lg = ins.lgImplications.map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  return `<p class="headline" style="font-weight:500">${escapeHtml(ins.overview)}</p>
    ${rising ? `<div class="tl-sub">${escapeHtml('부상 주제')}</div>${rising}` : ''}
    ${declining ? `<div class="tl-sub">${escapeHtml('감소·정체 주제')}</div>${declining}` : ''}
    ${leadLag ? `<div class="tl-sub">${escapeHtml('논문(연구) vs 영상(제품화) 선후행 (참고용)')}</div>${leadLag}` : ''}
    ${lg ? `<div class="tl-sub">${escapeHtml('LG 시사점')}</div><ol class="points">${lg}</ol>` : ''}
    <p class="tl-note">${escapeHtml(`AI 생성 · ${ins.model} · ${fmtDateTime(ins.generatedAt)}`)}</p>`;
}

/** 기술 시계열 카드 HTML — 타임라인 데이터가 없거나 비어 있으면 빈 문자열(카드 생략). 모든 텍스트는 escapeHtml 경유. */
export function buildTimelineCardHtml(data: TimelineHtmlData | null | undefined): string {
  const timeline = data?.timeline;
  if (!timeline || !timeline.period || timeline.buckets.length === 0 || timeline.classification.total === 0) return '';
  const c = timeline.classification;
  const period = timeline.period;
  const progress = `분류 ${int(c.classified)}/${int(c.total)} 완료${c.unclassified > 0 ? ', 실행 필요(미분류 건은 토픽별 표에서 제외)' : ''}${c.failed > 0 ? ` · 분류 실패 ${int(c.failed)}건` : ''}`;
  const periodText = `${period.startMonth.replace('-', '.')} ~ ${period.endMonth.replace('-', '.')} · 리포트 기간(days)과 무관`;
  const classified = c.classified > 0;

  const noun = timelineDomainNoun(timeline.domain);
  const footnote =
    `논문은 arXiv cs.RO/cs.AI 최신 제출분을 일 1회(최대 30건) 수집한 표본이라 월별 건수는 실제 논문 수가 아닌 수집량 기준의 상대 추이입니다. ${noun} 판정은 키워드 필터와 AI 분류를 거칩니다. ${noun}와 무관하다고 AI가 판정한 영상은 제외됩니다.` +
    (c.offTopic > 0 ? ` AI가 ${noun} 무관으로 분류해 제외한 항목 ${int(c.offTopic)}건.` : '') +
    (timeline.scope.beforeRangeDropped > 0
      ? ` 수집 시작보다 12개월 넘게 과거인 ${int(timeline.scope.beforeRangeDropped)}건은 제외.`
      : '');

  return `
  <div class="card">
    <div class="kicker">Tech Timeline</div>
    <h2>기술 시계열 트렌드 (전체 기간)</h2>
    <p class="meta">${escapeHtml(periodText)}</p>
    <p class="meta" style="margin-top:2px">${escapeHtml(progress)}</p>
    <div class="tl-sub">${escapeHtml('월별 수집 건수 (논문·영상 동일 축)')}</div>
    ${buildVolumeSvg(timeline)}
    ${
      classified
        ? `<div class="tl-sub">${escapeHtml('서브토픽 × 기간 — 논문 (복수 주제 포함 기준)')}</div>${buildHeatTable(timeline, 'papers')}
    <div class="tl-sub">${escapeHtml('서브토픽 × 기간 — 영상 (복수 주제 포함 기준)')}</div>${buildHeatTable(timeline, 'videos')}
    <p class="tl-note">${escapeHtml('한 건이 최대 3개 토픽에 중복 집계되어 표의 합계가 실제 건수보다 클 수 있습니다. 셀 색 농도는 표 안 최댓값 대비 4단계입니다.')}</p>`
        : `<p class="empty">${escapeHtml('분류 완료 후 표시됩니다')}</p>`
    }
    <div class="tl-sub">${escapeHtml('시계열 기술 트렌드 해설')}</div>
    ${buildInsightSummary(data?.insight, c.ratio)}
    <p class="tl-note">${escapeHtml(footnote)}</p>
  </div>
`;
}

export function buildTechTrendReportHtml(
  report: TechTrendReport,
  meta: ReportHtmlMeta,
  timelineData?: TimelineHtmlData | null,
  /** 이미 escape 처리된 추가 카드 HTML (예: 액추에이터 포지션 맵 카드). 비어 있으면 생략 */
  extraCardsHtml: string = ''
): string {
  const titleKo = meta.titleKo ?? report.domainLabel;
  const titleEn = meta.titleEn ?? '';
  const secondLabel = report.secondKind === 'papers' ? '논문' : '기사';
  const secondUnit = report.secondKind === 'papers' ? '편' : '건';
  const period = `${fmtDate(report.periodStart)} – ${fmtDate(report.periodEnd)}`;

  const videosHtml =
    report.videos.length === 0
      ? '<p class="empty">기간 내 수집된 영상이 없습니다.</p>'
      : `<div class="grid">${report.videos
          .map((v) => {
            const href = safeHref(v.url);
            const src = safeHref(v.thumbnail);
            const title = escapeHtml(v.title);
            const img = src
              ? `<img src="${escapeHtml(src)}" alt="${title}" width="320" height="180" loading="lazy" referrerpolicy="no-referrer">`
              : '<div class="ph"></div>';
            const titleEl = href
              ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${title}</a>`
              : title;
            const metaParts = [
              v.channel ? escapeHtml(v.channel) : '',
              v.thirdParty ? '외부 채널' : '',
              isTimelineDomain(report.domain) && v.domainFocus === null ? '분석 대기' : '',
              fmtDate(v.publishedAt),
            ].filter(Boolean);
            const summary = v.summaryKo ? `<p class="s">${escapeHtml(v.summaryKo)}</p>` : '';
            return `<div class="vcard">${img}<div class="b"><p class="t">${titleEl}</p><p class="m">${metaParts.join(' · ')}</p>${summary}</div></div>`;
          })
          .join('')}</div>`;

  const excludedCount = report.focus?.excluded ?? 0;
  const excludedHtml =
    excludedCount > 0
      ? `<p class="meta" style="margin:0 0 10px">AI 판정으로 핸드와 무관한 영상 ${excludedCount}건 제외</p>`
      : '';

  const papersHtml =
    report.papers.length === 0
      ? `<p class="empty">기간 내 수집된 ${secondLabel}이 없습니다.</p>`
      : report.papers
          .map((p) => {
            const href = safeHref(p.url);
            const title = escapeHtml(p.title);
            const titleEl = href
              ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${title}</a>`
              : title;
            const abs = p.abstractSnippet ? `<p class="a">${escapeHtml(p.abstractSnippet)}</p>` : '';
            const metaParts = [fmtDate(p.publishedAt), p.arxivId ? `arXiv:${escapeHtml(p.arxivId)}` : ''].filter(Boolean);
            return `<div class="paper"><p class="t">${titleEl}</p>${abs}<p class="m">${metaParts.join(' · ')}</p></div>`;
          })
          .join('');

  const insight = report.insight;
  const evidence = insight ? evidenceForPoints(insight) : null;
  const insightHtml = insight
    ? `<p class="headline">${escapeHtml(insight.headline)}</p><ol class="points">${insight.points
        .map((pt, i) => `<li>${escapeHtml(pt)}${evidenceLinesHtml(evidence?.[i])}</li>`)
        .join('')}</ol>${
        insight.keywords.length > 0
          ? `<div class="chips">${insight.keywords.map((k) => `<span class="chip">${escapeHtml(k)}</span>`).join('')}</div>`
          : ''
      }<p class="meta" style="margin-top:10px;font-size:11.5px;color:#8A909A">AI 생성 · ${escapeHtml(insight.model)} · ${fmtDateTime(insight.generatedAt)}</p>`
    : '<p class="empty">시사점 생성 조건 미충족(영상+논문 3건 미만) 또는 생성 실패</p>';

  const channelsHtml =
    report.stats.topChannels.length > 0
      ? `<div class="chips">${report.stats.topChannels
          .map((c) => `<span class="chip">${escapeHtml(c.name)} ${c.count}</span>`)
          .join('')}</div>`
      : '';
  const keywordsHtml =
    report.stats.topKeywords.length > 0
      ? `<div class="chips">${report.stats.topKeywords
          .map((k) => `<span class="chip">${escapeHtml(k.keyword)} ${k.count}</span>`)
          .join('')}</div>`
      : '';

  const docTitle = escapeHtml(`ARGOS · ${titleKo} (최근 ${report.days}일)`);

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${docTitle}</title>
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
  <div class="kicker">Share · Report</div>
  <h1>${escapeHtml(titleKo)}${titleEn ? `<small>${escapeHtml(titleEn)}</small>` : ''}</h1>
  <p class="meta">최근 ${report.days}일 (${escapeHtml(period)}) · 영상 ${report.stats.videoCount}건 · ${secondLabel} ${report.stats.paperCount}${secondUnit} · 생성 ${fmtDateTime(report.generatedAt)}</p>

  <div class="tiles">
    <div class="tile"><div class="kicker">영상</div><div class="v">${report.stats.videoCount}<span class="u">건</span></div></div>
    <div class="tile"><div class="kicker">${secondLabel}</div><div class="v">${report.stats.paperCount}<span class="u">${secondUnit}</span></div></div>
    <div class="tile"><div class="kicker">활동 채널</div><div class="v">${report.stats.channelCount}<span class="u">곳</span></div></div>
    <div class="tile"><div class="kicker">기간</div><div class="v">${report.days}<span class="u">일</span></div></div>
  </div>
  ${channelsHtml || keywordsHtml ? `<div class="card">${channelsHtml ? `<div class="kicker">활발한 채널</div>${channelsHtml}` : ''}${keywordsHtml ? `<div class="kicker" style="margin-top:14px">기술 키워드</div>${keywordsHtml}` : ''}</div>` : ''}

  <div class="card">
    <div class="kicker">AI Insight</div>
    <h2>주요 시사점</h2>
    ${insightHtml}
  </div>

  ${isTimelineDomain(report.domain) ? buildTimelineCardHtml(timelineData) : ''}
  ${extraCardsHtml}

  <div class="card">
    <div class="kicker">Demo Videos</div>
    <h2>영상 (${report.stats.videoCount}건)${report.truncated.videos ? ` <small style="font-size:12px;font-weight:400;color:#8A909A">최신 ${report.videos.length}건만 표시</small>` : ''}</h2>
    ${excludedHtml}
    ${videosHtml}
  </div>

  <div class="card">
    <div class="kicker">${report.secondKind === 'papers' ? 'Research Papers' : 'Related News'}</div>
    <h2>${secondLabel} (${report.stats.paperCount}${secondUnit})${report.truncated.papers ? ' <small style="font-size:12px;font-weight:400;color:#8A909A">최신 60건만 표시</small>' : ''}</h2>
    ${papersHtml}
  </div>

  <div class="foot">
    본 리포트는 공개 메타데이터(제목·썸네일 URL·링크)와 AI 생성 요약만 포함하며 원문을 복제하지 않습니다.<br>
    ARGOS · 생성 시각 ${fmtDateTime(report.generatedAt)}<br>
    원본 페이지: ${escapeHtml(meta.pageUrl)}
  </div>
</div>
</body>
</html>`;
}
