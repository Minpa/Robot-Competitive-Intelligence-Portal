#!/usr/bin/env npx tsx
/**
 * ARGOS Daily Competitive Intelligence Newsletter
 *
 * Usage:
 *   DATABASE_URL=... GMAIL_USER=... GMAIL_APP_PASSWORD=... npx tsx scripts/send-daily-newsletter.ts
 *
 * Required env vars:
 *   DATABASE_URL       - PostgreSQL connection string
 *   GMAIL_USER         - Gmail sender address (e.g. argos-bot@gmail.com)
 *   GMAIL_APP_PASSWORD - Gmail App Password (NOT regular password)
 *
 * Optional env vars:
 *   NEWSLETTER_TO      - Override recipient (default: hyeongjin.kim@lge.com)
 *   DRY_RUN            - Set to "true" to print HTML without sending
 */

import pg from 'pg';
import nodemailer from 'nodemailer';

const { Pool } = pg;

// ── Config ──────────────────────────────────────────────────
const DATABASE_URL = process.env.DATABASE_URL;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const RECIPIENT = process.env.NEWSLETTER_TO || 'hyeongjin.kim@lge.com';
const DRY_RUN = process.env.DRY_RUN === 'true';

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required');
  process.exit(1);
}
if (!DRY_RUN && (!GMAIL_USER || !GMAIL_APP_PASSWORD)) {
  console.error('ERROR: GMAIL_USER and GMAIL_APP_PASSWORD are required (or set DRY_RUN=true)');
  process.exit(1);
}

const TODAY = new Date();
const DATE_STR = TODAY.toISOString().slice(0, 10);
const YESTERDAY = new Date(TODAY.getTime() - 24 * 60 * 60 * 1000);
const IS_MONDAY = TODAY.getDay() === 1;
const WEEK_AGO = new Date(TODAY.getTime() - 7 * 24 * 60 * 60 * 1000);

const TARGET_COMPANIES = [
  'Tesla', 'Boston Dynamics', 'Figure AI', 'Unitree',
  'Agility', 'Apptronik', '1X', 'Agibot',
];

// ── Database Queries ────────────────────────────────────────
// NEWSLETTER_NO_SSL=true 로 로컬 PG(DRY_RUN 미리보기) 접속 시 SSL 비활성화 가능
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NEWSLETTER_NO_SSL === 'true' ? undefined : { rejectUnauthorized: false },
});

interface ArticleRow {
  id: string;
  title: string;
  source: string;
  url: string;
  summary: string | null;
  published_at: Date | null;
  company_name: string | null;
  category: string | null;
  extracted_metadata: any;
  created_at: Date;
}

interface CiUpdateRow {
  competitor_name: string;
  manufacturer: string;
  item_name: string;
  layer_name: string;
  value: string | null;
  confidence: string;
  source: string | null;
  source_url: string | null;
  updated_at: Date;
}

interface AlertRow {
  id: string;
  type: string;
  severity: string;
  title: string;
  summary: string | null;
  robot_name: string | null;
  manufacturer: string | null;
  created_at: Date;
}

interface KeywordRow {
  term: string;
  mention_count: number;
}

// ── 영상 기반 트렌드 (WRC 트렌드 맵 / 기술 인사이트 / 신규 분석 영상) ──
interface TrendPointJson {
  text?: string;
  title?: string;
  theme?: string;
  impact?: number;
  maturity?: number;
  /** 근거 영상의 articles.id UUID 배열 (유튜브 videoId 아님) */
  videoIds?: string[];
}

/**
 * 테마색 미러 상수.
 * 원본: packages/frontend/src/app/events/wrc2026/components/chartColors.ts CATEGORY_PALETTE[0..5]
 *       packages/frontend/src/app/events/wrc2026/components/TrendMatrix.tsx THEME_COLOR
 */
const THEME_COLOR_MIRROR: Record<string, string> = {
  제품: '#2a78d6',
  기술: '#eb6834',
  시장: '#1baf7a',
  서비스: '#eda100',
  생산: '#e87ba4',
  파트너십: '#008300',
};
const THEME_COLOR_MUTED = '#9AA1AC';

/** articles.id (uuid) 형식 검증 — DB 쿼리 전 필터링용 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface EventTrendJson {
  headline?: string;
  points?: (string | TrendPointJson)[];
  techPoints?: (string | TrendPointJson)[];
  basedOn?: number;
}

interface AnalyzedVideoRow {
  title: string;
  url: string;
  extracted_metadata: any;
}

/** view_cache에서 캐시된 JSON 하나를 읽는다 (없거나 실패 시 null — 섹션 생략) */
async function getViewCacheData<T>(viewName: string): Promise<T | null> {
  try {
    const { rows } = await pool.query(`SELECT data FROM view_cache WHERE view_name = $1 LIMIT 1`, [viewName]);
    return (rows[0]?.data as T) ?? null;
  } catch {
    return null;
  }
}

/** 최근 24시간 내 Gemini 분석(영상 내용 분석 또는 WRC 브리프)이 새로 붙은 영상 */
async function getRecentAnalyzedVideos(): Promise<AnalyzedVideoRow[]> {
  try {
    const since = YESTERDAY.toISOString();
    const { rows } = await pool.query(`
      SELECT title, url, extracted_metadata
      FROM articles
      WHERE product_type = 'video'
        AND (
          (extracted_metadata->>'geminiAnalyzedAt') >= $1
          OR (extracted_metadata->'eventBrief_wrc2026'->>'briefedAt') >= $1
        )
      ORDER BY GREATEST(
        COALESCE(extracted_metadata->>'geminiAnalyzedAt', ''),
        COALESCE(extracted_metadata->'eventBrief_wrc2026'->>'briefedAt', '')
      ) DESC
      LIMIT 5
    `, [since]);
    return rows;
  } catch {
    return [];
  }
}

interface VideoThumbInfo {
  url: string;
  thumbnail: string | null;
  titleKo: string | null;
}

/** extracted_metadata에서 썸네일 URL을 결정한다: meta.thumbnail 우선, 없으면 meta.videoId로 유튜브 mqdefault 썸네일 생성 */
function resolveThumbnail(meta: any): string | null {
  if (meta && typeof meta.thumbnail === 'string' && meta.thumbnail) return meta.thumbnail;
  if (meta && typeof meta.videoId === 'string' && meta.videoId) {
    return `https://i.ytimg.com/vi/${meta.videoId}/mqdefault.jpg`;
  }
  return null;
}

/** 트렌드 포인트에 인용된 근거 영상(articles.id UUID)의 썸네일/URL/한글 제목을 일괄 조회 */
async function getVideoThumbMap(articleIds: string[]): Promise<Map<string, VideoThumbInfo>> {
  const result = new Map<string, VideoThumbInfo>();
  try {
    const uniqueIds = Array.from(new Set(articleIds)).filter(id => UUID_RE.test(id)).slice(0, 12);
    if (uniqueIds.length === 0) return result;

    const { rows } = await pool.query(
      `SELECT id, url, extracted_metadata FROM articles WHERE id = ANY($1::uuid[])`,
      [uniqueIds]
    );
    for (const row of rows) {
      const meta = row.extracted_metadata ?? {};
      const titleKo = typeof meta.titleKo === 'string' ? meta.titleKo : null;
      result.set(row.id, { url: row.url, thumbnail: resolveThumbnail(meta), titleKo });
    }
  } catch (err) {
    console.error('getVideoThumbMap failed:', err);
  }
  return result;
}

/** 트렌드 포인트 정규화(문자열/객체 하위호환) 후 영향도 내림차순 상위 N개 */
function topTrendPoints(raw: (string | TrendPointJson)[] | undefined, limit: number): TrendPointJson[] {
  const points = (raw ?? [])
    .map((p): TrendPointJson | null => {
      if (typeof p === 'string') return p.trim() ? { text: p } : null;
      if (p && typeof p === 'object' && typeof p.text === 'string') return p;
      return null;
    })
    .filter((p): p is TrendPointJson => p !== null);
  points.sort((a, b) => (b.impact ?? 0) - (a.impact ?? 0));
  return points.slice(0, limit);
}

async function getRecentArticles(): Promise<ArticleRow[]> {
  const { rows } = await pool.query(`
    SELECT a.id, a.title, a.source, a.url, a.summary, a.published_at,
           c.name AS company_name, a.category, a.extracted_metadata, a.created_at
    FROM articles a
    LEFT JOIN companies c ON a.company_id = c.id
    WHERE a.created_at >= $1 OR a.published_at >= $1
    ORDER BY a.created_at DESC
  `, [YESTERDAY.toISOString()]);
  return rows;
}

async function getRecentCiUpdates(): Promise<CiUpdateRow[]> {
  const { rows } = await pool.query(`
    SELECT cc.name AS competitor_name, cc.manufacturer,
           ci.name AS item_name, cl.name AS layer_name,
           cv.value, cv.confidence, cv.source, cv.source_url, cv.updated_at
    FROM ci_values cv
    JOIN ci_competitors cc ON cv.competitor_id = cc.id
    JOIN ci_items ci ON cv.item_id = ci.id
    JOIN ci_categories cat ON ci.category_id = cat.id
    JOIN ci_layers cl ON cat.layer_id = cl.id
    WHERE cv.updated_at >= $1
    ORDER BY cv.updated_at DESC
  `, [YESTERDAY.toISOString()]);
  return rows;
}

async function getRecentAlerts(): Promise<AlertRow[]> {
  const { rows } = await pool.query(`
    SELECT ca.id, ca.type, ca.severity, ca.title, ca.summary,
           hr.name AS robot_name, hr.manufacturer
    FROM competitive_alerts ca
    LEFT JOIN humanoid_robots hr ON ca.robot_id = hr.id
    WHERE ca.created_at >= $1
    ORDER BY
      CASE ca.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
      ca.created_at DESC
  `, [YESTERDAY.toISOString()]);
  return rows;
}

async function getWeeklyKeywords(): Promise<KeywordRow[]> {
  const { rows } = await pool.query(`
    SELECT k.term, COUNT(*)::int AS mention_count
    FROM keyword_stats ks
    JOIN keywords k ON ks.keyword_id = k.id
    WHERE ks.created_at >= $1
    GROUP BY k.term
    ORDER BY mention_count DESC
    LIMIT 10
  `, [WEEK_AGO.toISOString()]);
  return rows;
}

// ── Confidence helpers ──────────────────────────────────────
function confidenceBadge(grade: string): string {
  const colors: Record<string, string> = {
    A: '#2E7D32', B: '#558B2F', C: '#F9A825', D: '#EF6C00', F: '#C62828',
  };
  const color = colors[grade] || '#999';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${color};color:#fff;font-size:12px;font-weight:bold;">${grade}</span>`;
}

function severityBadge(severity: string): string {
  const colors: Record<string, string> = {
    critical: '#A50034', warning: '#EF6C00', info: '#1565C0',
  };
  const color = colors[severity] || '#999';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${color};color:#fff;font-size:12px;font-weight:bold;">${severity.toUpperCase()}</span>`;
}

/** 트렌드 포인트 카드의 영향도/성숙도 미니 바 한 줄(라벨 + 5칸 바 + n/5) */
function renderMiniBarRow(label: string, rawScore: number): string {
  const score = Math.min(5, Math.max(1, Math.round(rawScore)));
  let cells = '';
  for (let j = 1; j <= 5; j++) {
    const filled = j <= score;
    cells += `<td width="14" height="8" style="width:14px;height:8px;background:${filled ? '#1a1a2e' : '#e8e8ee'};font-size:0;line-height:0;">&nbsp;</td>`;
    if (j < 5) cells += `<td width="1" height="8" style="width:1px;height:8px;font-size:0;line-height:0;">&nbsp;</td>`;
  }
  return `
    <tr><td style="padding-top:6px;">
      <table cellpadding="0" cellspacing="0" style="display:inline-block;vertical-align:middle;"><tr>${cells}</tr></table>
      <span style="font-size:11px;color:#888;vertical-align:middle;margin-left:6px;">${escHtml(label)} ${score}/5</span>
    </td></tr>`;
}

/** 트렌드 포인트 카드 1개 렌더링(신형 객체/구형 문자열 하위호환) */
function renderTrendCard(
  p: TrendPointJson,
  index: number,
  total: number,
  thumbMap: Map<string, VideoThumbInfo>,
): string {
  const themeColor = p.theme ? (THEME_COLOR_MIRROR[p.theme] || THEME_COLOR_MUTED) : null;
  const borderColor = themeColor || THEME_COLOR_MUTED;

  const themeBadge = themeColor
    ? `<span style="float:right;font-size:11px;font-weight:bold;color:${themeColor};">${escHtml(p.theme!)}</span>`
    : '';

  let barsHtml = '';
  if (typeof p.impact === 'number') barsHtml += renderMiniBarRow('영향도', p.impact);
  if (typeof p.maturity === 'number') barsHtml += renderMiniBarRow('성숙도', p.maturity);

  let thumbsHtml = '';
  if (Array.isArray(p.videoIds) && p.videoIds.length > 0) {
    const thumbs = p.videoIds
      .map(id => thumbMap.get(id))
      .filter((info): info is VideoThumbInfo => !!info && !!info.thumbnail)
      .slice(0, 3);
    if (thumbs.length > 0) {
      const cells = thumbs
        .map(info => {
          const alt = `근거 영상: ${escHtml(info.titleKo || '유튜브 영상')}`;
          return `<td style="padding-right:6px;"><a href="${escHtml(info.url)}" target="_blank"><img src="${escHtml(info.thumbnail!)}" width="96" height="54" alt="${alt}" style="display:block;width:96px;height:54px;object-fit:cover;border-radius:4px;border:0;"/></a></td>`;
        })
        .join('');
      thumbsHtml = `
    <tr><td style="padding-top:8px;">
      <table cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>
    </td></tr>`;
    }
  }

  const spacer = index < total - 1 ? `<tr><td style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>` : '';

  return `
<tr><td style="background:#fff;border:1px solid #e0e0e0;border-left:4px solid ${borderColor};border-radius:6px;padding:12px 16px;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="font-size:15px;font-weight:bold;color:#1a1a2e;">#${index + 1}${p.title ? ` ${escHtml(p.title)}` : ''}${themeBadge}</td></tr>
    <tr><td style="font-size:13px;color:#555;padding-top:4px;">${escHtml(p.text ?? '')}</td></tr>${barsHtml}${thumbsHtml}
  </table>
</td></tr>
${spacer}`;
}

// ── HTML Newsletter Builder ─────────────────────────────────
async function buildNewsletter(
  articles: ArticleRow[],
  ciUpdates: CiUpdateRow[],
  alerts: AlertRow[],
  weeklyKeywords: KeywordRow[],
  videoTrend: EventTrendJson | null,
  techInsight: { points?: string[] } | null,
  analyzedVideos: AnalyzedVideoRow[],
): Promise<string> {
  // Group by company
  const byCompany = new Map<string, { articles: ArticleRow[]; ciUpdates: CiUpdateRow[]; alerts: AlertRow[] }>();
  for (const name of TARGET_COMPANIES) {
    byCompany.set(name, { articles: [], ciUpdates: [], alerts: [] });
  }

  for (const a of articles) {
    const match = TARGET_COMPANIES.find(tc =>
      a.company_name?.includes(tc) ||
      a.title?.toLowerCase().includes(tc.toLowerCase()) ||
      JSON.stringify(a.extracted_metadata?.mentionedCompanies || []).toLowerCase().includes(tc.toLowerCase())
    );
    if (match) byCompany.get(match)!.articles.push(a);
  }

  for (const u of ciUpdates) {
    const match = TARGET_COMPANIES.find(tc =>
      u.manufacturer?.includes(tc) || u.competitor_name?.toLowerCase().includes(tc.toLowerCase())
    );
    if (match) byCompany.get(match)!.ciUpdates.push(u);
  }

  for (const al of alerts) {
    const match = TARGET_COMPANIES.find(tc =>
      al.manufacturer?.includes(tc) || al.title?.toLowerCase().includes(tc.toLowerCase())
    );
    if (match) byCompany.get(match)!.alerts.push(al);
  }

  // Pick highlight: highest severity alert or first article
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const highlight = criticalAlerts[0] || alerts[0] || articles[0];

  // Confidence distribution across CI updates
  const confDist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const u of ciUpdates) {
    if (u.confidence in confDist) confDist[u.confidence]++;
  }
  const totalCollected = articles.length + ciUpdates.length + alerts.length;

  // ── Render HTML ──
  let html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Malgun Gothic','Apple SD Gothic Neo',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:20px 0;">
<table width="680" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

<!-- HEADER -->
<tr><td style="background:#1a1a2e;padding:28px 32px;">
  <table width="100%"><tr>
    <td><span style="color:#fff;font-size:24px;font-weight:bold;letter-spacing:1px;">ARGOS</span>
    <span style="color:#888;font-size:14px;margin-left:8px;">Daily Brief</span></td>
    <td align="right"><span style="color:#aaa;font-size:13px;">${DATE_STR}</span></td>
  </tr></table>
  <div style="color:#ccc;font-size:15px;margin-top:8px;">휴머노이드 로봇 경쟁사 동향</div>
</td></tr>

<!-- [1] TODAY's HIGHLIGHT -->
<tr><td style="padding:24px 32px 16px;">
  <div style="background:linear-gradient(135deg,#A50034 0%,#d4004a 100%);border-radius:8px;padding:20px 24px;color:#fff;">
    <div style="font-size:12px;font-weight:bold;letter-spacing:2px;opacity:0.8;margin-bottom:8px;">TODAY'S HIGHLIGHT</div>`;

  if (highlight) {
    const isAlert = 'severity' in highlight;
    const title = isAlert ? (highlight as AlertRow).title : (highlight as ArticleRow).title;
    const summary = isAlert ? (highlight as AlertRow).summary : (highlight as ArticleRow).summary;
    html += `
    <div style="font-size:18px;font-weight:bold;margin-bottom:8px;">${escHtml(title)}</div>
    <div style="font-size:14px;line-height:1.6;opacity:0.95;">${escHtml(summary || '상세 내용은 포털에서 확인하세요.')}</div>`;
    if (isAlert) {
      html += `<div style="margin-top:8px;">${severityBadge((highlight as AlertRow).severity)}</div>`;
    }
  } else {
    html += `
    <div style="font-size:16px;">금일 특이사항 없음 — 수집 시스템 정상 가동 중</div>`;
  }

  html += `
  </div>
</td></tr>

<!-- [2] 기업별 동향 요약 -->
<tr><td style="padding:8px 32px 0;">
  <div style="font-size:18px;font-weight:bold;color:#1a1a2e;border-bottom:2px solid #1a1a2e;padding-bottom:8px;margin-bottom:16px;">[2] 기업별 동향 요약</div>
</td></tr>`;

  for (const [companyName, data] of byCompany) {
    const hasNews = data.articles.length > 0 || data.ciUpdates.length > 0 || data.alerts.length > 0;
    html += `
<tr><td style="padding:4px 32px 12px;">
  <table width="100%" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;">
    <tr><td style="background:#f8f8fc;padding:10px 16px;font-weight:bold;font-size:15px;color:#1a1a2e;border-bottom:1px solid #e0e0e0;">
      ${escHtml(companyName)}
      <span style="float:right;font-size:12px;color:#888;">${hasNews ? `${data.articles.length + data.ciUpdates.length + data.alerts.length}건` : ''}</span>
    </td></tr>
    <tr><td style="padding:12px 16px;font-size:13px;line-height:1.7;color:#333;">`;

    if (!hasNews) {
      html += `<span style="color:#999;">금일 특이사항 없음</span>`;
    } else {
      // Alerts
      for (const al of data.alerts) {
        html += `<div style="margin-bottom:8px;">${severityBadge(al.severity)} <b>${escHtml(al.title)}</b><br/>
          <span style="color:#666;">${escHtml(al.summary || '')}</span></div>`;
      }
      // Articles
      for (const art of data.articles.slice(0, 3)) {
        html += `<div style="margin-bottom:8px;">
          <b>${escHtml(art.title)}</b><br/>
          <span style="color:#666;">${escHtml(art.summary?.slice(0, 150) || '')}${(art.summary?.length || 0) > 150 ? '...' : ''}</span><br/>
          <span style="font-size:11px;color:#888;">출처: <a href="${escHtml(art.url)}" style="color:#1565C0;">${escHtml(art.source)}</a></span>
        </div>`;
      }
      // CI Updates
      if (data.ciUpdates.length > 0) {
        html += `<div style="margin-top:4px;padding-top:8px;border-top:1px dashed #e0e0e0;">`;
        for (const ci of data.ciUpdates.slice(0, 5)) {
          html += `<div style="margin-bottom:4px;">
            ${confidenceBadge(ci.confidence)} <b>${escHtml(ci.item_name)}</b>: ${escHtml(ci.value || 'N/A')}
            ${ci.source_url ? ` <a href="${escHtml(ci.source_url)}" style="color:#1565C0;font-size:11px;">[출처]</a>` : ''}
          </div>`;
        }
        html += `</div>`;
      }
    }

    html += `
    </td></tr>
  </table>
</td></tr>`;
  }

  // ── [3] 영상 기반 트렌드 (AI 분석) ──
  const hasVideoSection = !!videoTrend || analyzedVideos.length > 0;
  if (hasVideoSection) {
    html += `
<tr><td style="padding:16px 32px 0;">
  <div style="font-size:18px;font-weight:bold;color:#1a1a2e;border-bottom:2px solid #1a1a2e;padding-bottom:8px;margin-bottom:16px;">[3] 영상 기반 트렌드 (AI 분석)</div>
</td></tr>
<tr><td style="padding:0 32px 16px;">`;

    if (videoTrend?.headline) {
      html += `
  <div style="font-size:15px;font-weight:bold;color:#1a1a2e;margin-bottom:10px;">${escHtml(videoTrend.headline)}</div>`;
    }

    const topPoints = topTrendPoints(videoTrend?.points, 3);
    if (topPoints.length > 0) {
      const allVideoIds = topPoints.flatMap(p => (Array.isArray(p.videoIds) ? p.videoIds : []));
      const thumbMap = await getVideoThumbMap(allVideoIds);
      html += `
  <table width="100%" cellpadding="0" cellspacing="0">
    ${topPoints.map((p, i) => renderTrendCard(p, i, topPoints.length, thumbMap)).join('')}
  </table>`;
    }

    const topTech = topTrendPoints(videoTrend?.techPoints, 2);
    if (topTech.length > 0) {
      html += `
  <div style="margin-top:10px;font-size:13px;color:#333;">
    <b style="color:#555;">기술 관점:</b> ${topTech.map((p) => escHtml(p.title ?? (p.text ?? '').slice(0, 60))).join(' · ')}
  </div>`;
    }

    if (techInsight?.points && techInsight.points.length > 0) {
      html += `
  <div style="margin-top:12px;padding:12px 16px;background:#fff8e1;border-left:4px solid #F9A825;border-radius:4px;font-size:13px;color:#333;">
    <b>산업·경쟁 관점 인사이트:</b><br/>${techInsight.points.slice(0, 2).map(escHtml).join('<br/>')}
  </div>`;
    }

    if (analyzedVideos.length > 0) {
      const yesterdayIso = YESTERDAY.toISOString();
      html += `
  <div style="margin-top:12px;">
    <b style="font-size:13px;color:#555;">최근 24시간 신규 분석 영상</b>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;font-size:13px;">`;
      analyzedVideos.forEach((v, idx) => {
        const meta = v.extracted_metadata ?? {};
        const titleKo = typeof meta.titleKo === 'string' ? meta.titleKo : null;
        const channel = typeof meta.channel === 'string' ? meta.channel : '';
        const analysisLabel =
          typeof meta.geminiAnalyzedAt === 'string' && meta.geminiAnalyzedAt >= yesterdayIso ? '영상 분석' : 'WRC 브리프';
        const oneLiner =
          (typeof meta.geminiAnalysis?.summaryKo === 'string' && meta.geminiAnalysis.summaryKo) ||
          (typeof meta.eventBrief_wrc2026?.highlight === 'string' && meta.eventBrief_wrc2026.highlight) ||
          '';
        const thumb = resolveThumbnail(meta);
        const borderStyle = idx < analyzedVideos.length - 1 ? 'border-bottom:1px solid #f0f0f0;' : '';
        const displayTitle = escHtml(titleKo ?? v.title);
        const thumbTd = thumb
          ? `<td width="120" style="width:120px;padding:8px 12px 8px 14px;${borderStyle}vertical-align:top;"><a href="${escHtml(v.url)}" target="_blank"><img src="${escHtml(thumb)}" width="120" height="68" alt="${displayTitle}" style="display:block;width:120px;height:68px;object-fit:cover;border-radius:4px;border:0;"/></a></td>`
          : `<td width="120" height="68" align="center" valign="middle" style="width:120px;height:68px;background:#e8e8ee;border-radius:4px;padding:8px 12px 8px 14px;${borderStyle}color:#999;font-size:12px;">영상</td>`;
        html += `
      <tr>
        ${thumbTd}
        <td style="padding:8px 14px 8px 0;${borderStyle}vertical-align:top;">
          <a href="${escHtml(v.url)}" target="_blank" style="font-size:13px;font-weight:bold;color:#1a1a2e;text-decoration:none;">${displayTitle}</a>
          <div style="font-size:11px;color:#888;margin-top:2px;">${channel ? `${escHtml(channel)} · ` : ''}${escHtml(analysisLabel)}</div>
          ${oneLiner ? `<div style="font-size:12px;color:#666;margin-top:4px;">${escHtml(String(oneLiner).slice(0, 120))}</div>` : ''}
        </td>
      </tr>`;
      });
      html += `
    </table>
  </div>`;
    }

    html += `
  <div style="margin-top:16px;">
    <a href="https://robot-info-personal.up.railway.app/events/wrc2026" style="display:inline-block;background:#1a1a2e;color:#fff;font-size:12px;font-weight:bold;text-decoration:none;padding:8px 16px;border-radius:4px;">트렌드 맵 전체 보기</a>
    ${typeof videoTrend?.basedOn === 'number' ? `<span style="margin-left:10px;font-size:11px;color:#888;">영상 브리프 ${videoTrend.basedOn}건 기반</span>` : ''}
  </div>
</td></tr>`;
  }

  const weeklyNo = hasVideoSection ? 4 : 3;

  // ── 주간 트렌드 (월요일만) ──
  if (IS_MONDAY) {
    html += `
<tr><td style="padding:16px 32px 0;">
  <div style="font-size:18px;font-weight:bold;color:#1a1a2e;border-bottom:2px solid #1a1a2e;padding-bottom:8px;margin-bottom:16px;">[${weeklyNo}] 주간 트렌드</div>
</td></tr>
<tr><td style="padding:0 32px 16px;">
  <table width="100%" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;font-size:13px;">
    <tr style="background:#f8f8fc;">
      <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e0e0e0;">키워드/테마</th>
      <th style="padding:8px 12px;text-align:right;border-bottom:1px solid #e0e0e0;">언급 횟수</th>
    </tr>`;
    if (weeklyKeywords.length > 0) {
      for (const kw of weeklyKeywords) {
        html += `
    <tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;">${escHtml(kw.term)}</td>
        <td style="padding:6px 12px;text-align:right;border-bottom:1px solid #f0f0f0;">${kw.mention_count}</td></tr>`;
      }
    } else {
      html += `<tr><td colspan="2" style="padding:12px;color:#999;text-align:center;">지난 7일간 키워드 데이터 없음</td></tr>`;
    }
    html += `
  </table>
  <div style="margin-top:12px;padding:12px 16px;background:#fff8e1;border-left:4px solid #F9A825;border-radius:4px;font-size:13px;color:#333;">
    <b>LG 전략 시사점:</b> ${weeklyKeywords.length > 0
      ? `금주 "${weeklyKeywords[0].term}" 키워드가 ${weeklyKeywords[0].mention_count}회로 최다 언급. 경쟁사 동향을 참고하여 관련 기술/사업 전략 점검 필요.`
      : '금주 특이 트렌드 미감지. 정상 모니터링 유지.'}
  </div>
</td></tr>`;
  }

  // ── [4] 데이터 품질 요약 ──
  html += `
<tr><td style="padding:16px 32px 0;">
  <div style="font-size:18px;font-weight:bold;color:#1a1a2e;border-bottom:2px solid #1a1a2e;padding-bottom:8px;margin-bottom:16px;">[${IS_MONDAY ? weeklyNo + 1 : weeklyNo}] 데이터 품질 요약</div>
</td></tr>
<tr><td style="padding:0 32px 16px;">
  <table width="100%" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;font-size:13px;">
    <tr><td style="padding:10px 16px;background:#f8f8fc;border-bottom:1px solid #e0e0e0;"><b>총 수집 건수</b></td>
        <td style="padding:10px 16px;border-bottom:1px solid #e0e0e0;text-align:right;font-weight:bold;color:#1a1a2e;">${totalCollected}건</td></tr>
    <tr><td style="padding:10px 16px;border-bottom:1px solid #e0e0e0;">기사/뉴스</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e0e0e0;text-align:right;">${articles.length}건</td></tr>
    <tr><td style="padding:10px 16px;border-bottom:1px solid #e0e0e0;">CI 데이터 업데이트</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e0e0e0;text-align:right;">${ciUpdates.length}건</td></tr>
    <tr><td style="padding:10px 16px;border-bottom:1px solid #e0e0e0;">경쟁 알림</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e0e0e0;text-align:right;">${alerts.length}건</td></tr>
  </table>

  <div style="margin-top:12px;">
    <b style="font-size:13px;color:#555;">신뢰도 분포 (CI 데이터 기준)</b>
    <table width="100%" style="margin-top:6px;font-size:13px;">
      <tr>
        ${Object.entries(confDist).map(([grade, count]) =>
          `<td align="center" style="padding:6px;">${confidenceBadge(grade)}<br/><span style="font-size:14px;font-weight:bold;">${count}건</span></td>`
        ).join('')}
      </tr>
    </table>
  </div>
</td></tr>

<!-- FOOTER -->
<tr><td style="background:#1a1a2e;padding:20px 32px;margin-top:16px;">
  <div style="color:#888;font-size:12px;line-height:1.8;">
    본 리포트는 ARGOS(War Room) 자동 수집 시스템에 의해 생성되었습니다.<br/>
    데이터 포털: <a href="https://robot-info-personal.up.railway.app/" style="color:#A50034;font-weight:bold;">https://robot-info-personal.up.railway.app/</a>
  </div>
</td></tr>

</table>
</td></tr></table>
</body></html>`;

  return html;
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Email Sender ────────────────────────────────────────────
async function sendEmail(subject: string, htmlBody: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"ARGOS War Room" <${GMAIL_USER}>`,
    to: RECIPIENT,
    subject,
    html: htmlBody,
  });

  console.log(`Email sent to ${RECIPIENT}`);
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log(`[ARGOS Newsletter] ${DATE_STR} — Querying database...`);

  const [articles, ciUpdates, alerts, weeklyKeywords, videoTrend, techInsight, analyzedVideos] = await Promise.all([
    getRecentArticles(),
    getRecentCiUpdates(),
    getRecentAlerts(),
    IS_MONDAY ? getWeeklyKeywords() : Promise.resolve([]),
    getViewCacheData<EventTrendJson>('event-trend-wrc2026'),
    getViewCacheData<{ points?: string[] }>('event-tech-insight-wrc2026'),
    getRecentAnalyzedVideos(),
  ]);

  console.log(
    `  Articles: ${articles.length}, CI Updates: ${ciUpdates.length}, Alerts: ${alerts.length}, ` +
      `VideoTrend: ${videoTrend ? 'yes' : 'no'}, AnalyzedVideos(24h): ${analyzedVideos.length}`
  );

  const subject = `[ARGOS Daily Brief] 휴머노이드 로봇 경쟁사 동향 - ${DATE_STR}`;
  const html = await buildNewsletter(articles, ciUpdates, alerts, weeklyKeywords, videoTrend, techInsight, analyzedVideos);

  if (DRY_RUN) {
    console.log('\n=== DRY RUN — HTML Output ===\n');
    console.log(html);
    // Also write to file for preview
    const fs = await import('fs');
    const outPath = `./scripts/newsletter-${DATE_STR}.html`;
    fs.writeFileSync(outPath, html, 'utf-8');
    console.log(`\nSaved to ${outPath} — open in browser to preview.`);
  } else {
    await sendEmail(subject, html);
  }

  await pool.end();
  console.log('[ARGOS Newsletter] Done.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
