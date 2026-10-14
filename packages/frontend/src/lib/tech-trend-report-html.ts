/**
 * 공유용 리포트 → 단일 HTML 파일 (외부 스크립트/스타일시트 없음, 인라인 <style>만).
 *
 * 안전 원칙:
 *  - 모든 텍스트는 escapeHtml을 거친다.
 *  - href/src는 safeHref(https + 호스트 allowlist)를 통과한 값만 출력한다.
 *  - 모든 외부 링크는 rel="noopener noreferrer" target="_blank".
 */

import type { TechTrendReport } from '@/types/tech-trend-report';

export interface ReportHtmlMeta {
  /** 원본 페이지 URL (푸터에 표시) */
  pageUrl: string;
  titleKo?: string;
  titleEn?: string;
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
.foot{margin-top:28px;padding-top:14px;border-top:1px solid #E6E7EA;color:#8A909A;font-size:11.5px;line-height:1.7}
@media print{
  body{background:#fff;padding:0}
  .card,.tile,.vcard,.paper{break-inside:avoid}
  a{color:#1F2328}
}
`;

export function buildTechTrendReportHtml(report: TechTrendReport, meta: ReportHtmlMeta): string {
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
              report.domain === 'hand' && v.domainFocus === null ? '분석 대기' : '',
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
  const insightHtml = insight
    ? `<p class="headline">${escapeHtml(insight.headline)}</p><ol class="points">${insight.points
        .map((pt) => `<li>${escapeHtml(pt)}</li>`)
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
