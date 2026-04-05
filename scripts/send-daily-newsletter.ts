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
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

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

// ── HTML Newsletter Builder ─────────────────────────────────
function buildNewsletter(
  articles: ArticleRow[],
  ciUpdates: CiUpdateRow[],
  alerts: AlertRow[],
  weeklyKeywords: KeywordRow[],
): string {
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

  // ── [3] 주간 트렌드 (월요일만) ──
  if (IS_MONDAY) {
    html += `
<tr><td style="padding:16px 32px 0;">
  <div style="font-size:18px;font-weight:bold;color:#1a1a2e;border-bottom:2px solid #1a1a2e;padding-bottom:8px;margin-bottom:16px;">[3] 주간 트렌드</div>
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
  <div style="font-size:18px;font-weight:bold;color:#1a1a2e;border-bottom:2px solid #1a1a2e;padding-bottom:8px;margin-bottom:16px;">[${IS_MONDAY ? '4' : '3'}] 데이터 품질 요약</div>
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

  const [articles, ciUpdates, alerts, weeklyKeywords] = await Promise.all([
    getRecentArticles(),
    getRecentCiUpdates(),
    getRecentAlerts(),
    IS_MONDAY ? getWeeklyKeywords() : Promise.resolve([]),
  ]);

  console.log(`  Articles: ${articles.length}, CI Updates: ${ciUpdates.length}, Alerts: ${alerts.length}`);

  const subject = `[ARGOS Daily Brief] 휴머노이드 로봇 경쟁사 동향 - ${DATE_STR}`;
  const html = buildNewsletter(articles, ciUpdates, alerts, weeklyKeywords);

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
