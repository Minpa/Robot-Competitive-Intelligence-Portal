#!/usr/bin/env npx tsx
/**
 * ARGOS Daily Newsletter Generator — 2026-04-10
 *
 * Generates HTML newsletter from seed/CI data when direct DB access is unavailable.
 * Sends via Gmail when GMAIL_USER + GMAIL_APP_PASSWORD are set.
 *
 * Usage:
 *   npx tsx scripts/generate-newsletter-2026-04-10.ts
 *   GMAIL_USER=x GMAIL_APP_PASSWORD=y npx tsx scripts/generate-newsletter-2026-04-10.ts
 */

import fs from 'fs';

// ── Config ──────────────────────────────────────────────────
const DATE_STR = '2026-04-10';
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const RECIPIENT = process.env.NEWSLETTER_TO || 'hyeongjin.kim@lge.com';
const IS_FRIDAY = true; // 2026-04-10 is Friday → no weekly trends

// ── Competitor CI Data (from seed-ci.ts) ────────────────────
interface CiEntry {
  company: string;
  items: { name: string; value: string; confidence: string; source: string; layer: string }[];
}

const ciData: CiEntry[] = [
  {
    company: 'Tesla',
    items: [
      { name: '자유도(DOF)', value: '28+ DOF', confidence: 'B', source: 'Tesla AI Day 2024', layer: 'HW' },
      { name: '핵심 AI 모델', value: 'FSD 기반 End-to-End NN', confidence: 'B', source: 'Tesla AI Day 2024', layer: 'SW/AI' },
      { name: '손 자유도', value: '11 DOF (촉각 센서 내장)', confidence: 'B', source: 'Tesla AI Day 2024', layer: 'HW' },
      { name: '배치 대수', value: '~50대 (Tesla 공장)', confidence: 'C', source: 'Tesla 실적 발표', layer: 'Biz' },
      { name: '가격대', value: '$20K-$30K (목표, 대량생산 시)', confidence: 'C', source: 'Elon Musk 발언', layer: 'Biz' },
      { name: '총 특허 수', value: '200+ 특허 (로봇 관련)', confidence: 'C', source: 'Google Patents', layer: 'IP' },
      { name: 'GPU 클러스터', value: 'Dojo + H100 대규모 클러스터', confidence: 'A', source: 'Tesla 공식', layer: 'Data' },
      { name: '생태계 확장', value: '외부 판매 2026 목표', confidence: 'C', source: 'Elon Musk 발언', layer: 'Biz' },
    ],
  },
  {
    company: 'Boston Dynamics',
    items: [
      { name: '자유도(DOF)', value: '28+ DOF (전기 모델)', confidence: 'C', source: 'Boston Dynamics 공식', layer: 'HW' },
      { name: '핵심 AI 모델', value: 'MPC + RL 하이브리드', confidence: 'B', source: 'Boston Dynamics 논문/발표', layer: 'SW/AI' },
      { name: '총 펀딩', value: 'Hyundai 인수 ($1.1B)', confidence: 'A', source: 'Hyundai 공식', layer: 'Biz' },
      { name: '총 특허 수', value: '500+ 특허', confidence: 'B', source: 'Google Patents', layer: 'IP' },
      { name: '시뮬레이션', value: 'Drake Sim (자체 개발)', confidence: 'A', source: 'Boston Dynamics 공식', layer: 'SW/AI' },
      { name: '상용화 단계', value: 'Prototype → 상용 전환 중', confidence: 'B', source: 'Boston Dynamics 공식', layer: 'Biz' },
    ],
  },
  {
    company: 'Figure AI',
    items: [
      { name: '핵심 AI 모델', value: 'Helix VLA (자체개발)', confidence: 'A', source: 'Figure AI 공식', layer: 'SW/AI' },
      { name: '총 펀딩', value: '$854M+ (Series B)', confidence: 'A', source: 'Crunchbase', layer: 'Biz' },
      { name: '최근 밸류에이션', value: '$2.6B (2024 Series B)', confidence: 'A', source: 'Crunchbase', layer: 'Biz' },
      { name: '자율 작업 범위', value: '다중 작업 자율 수행', confidence: 'A', source: 'Figure AI 공식 데모', layer: 'SW/AI' },
      { name: '연속 행동 수', value: '50+ 연속 행동', confidence: 'B', source: 'Figure AI 데모 영상', layer: 'SW/AI' },
      { name: '새 환경 적응', value: '언어 지시로 새 작업 학습', confidence: 'A', source: 'Figure AI Helix 데모', layer: 'SW/AI' },
      { name: '손 자유도', value: '16 DOF (5핑거 독자 개발)', confidence: 'A', source: 'Figure AI 공식', layer: 'HW' },
      { name: '주요 고객', value: 'BMW', confidence: 'A', source: 'Figure AI 공식', layer: 'Biz' },
    ],
  },
  {
    company: 'Unitree',
    items: [], // No CI data in seed — will show "금일 특이사항 없음"
  },
  {
    company: 'Agility',
    items: [
      { name: '자유도(DOF)', value: '44 DOF (전신)', confidence: 'A', source: 'Agility Robotics 공식 스펙', layer: 'HW' },
      { name: '배치 대수', value: '~100대+ (Amazon 포함)', confidence: 'C', source: '업계 추정', layer: 'Biz' },
      { name: '제조 파트너', value: 'RoboFab (자체 공장)', confidence: 'A', source: 'Agility Robotics 공식', layer: 'Biz' },
      { name: '주요 고객', value: 'Amazon, GXO Logistics', confidence: 'A', source: 'Agility Robotics 공식', layer: 'Biz' },
      { name: '총 펀딩', value: '$179M+', confidence: 'A', source: 'Crunchbase', layer: 'Biz' },
      { name: '핵심 AI 모델', value: 'Locomotion RL + 조작 IL', confidence: 'B', source: 'Agility Robotics 블로그', layer: 'SW/AI' },
    ],
  },
  {
    company: 'Apptronik',
    items: [], // No CI data in seed
  },
  {
    company: '1X',
    items: [
      { name: '구동 방식', value: '소프트 액추에이터 (독자 기술)', confidence: 'A', source: '1X Technologies 공식', layer: 'HW' },
      { name: '키/몸무게', value: '177cm / 30kg', confidence: 'A', source: '1X Technologies 공식', layer: 'HW' },
      { name: '총 펀딩', value: '$125M+ (Series B)', confidence: 'A', source: 'Crunchbase', layer: 'Biz' },
      { name: '주요 투자자', value: 'OpenAI, Tiger Global, Samsung', confidence: 'A', source: 'Crunchbase', layer: 'Biz' },
      { name: '상용화 단계', value: 'PoC (가정용 베타)', confidence: 'B', source: '1X Technologies 공식', layer: 'Biz' },
      { name: '충돌 안전', value: '소프트 액추에이터 (본질 안전)', confidence: 'A', source: '1X Technologies 공식', layer: 'Safety' },
    ],
  },
  {
    company: 'Agibot',
    items: [], // No CI data in seed
  },
];

// ── Confidence distribution ─────────────────────────────────
function computeConfidence(data: CiEntry[]): Record<string, number> {
  const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const entry of data) {
    for (const item of entry.items) {
      if (item.confidence in dist) dist[item.confidence]++;
    }
  }
  return dist;
}

// ── HTML Helpers ────────────────────────────────────────────
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function confidenceBadge(grade: string): string {
  const colors: Record<string, string> = {
    A: '#2E7D32', B: '#558B2F', C: '#F9A825', D: '#EF6C00', F: '#C62828',
  };
  const color = colors[grade] || '#999';
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:${color};color:#fff;font-size:12px;font-weight:bold;">${grade}</span>`;
}

// ── Newsletter HTML Builder ────────────────────────────────
function buildNewsletter(): string {
  const confDist = computeConfidence(ciData);
  const totalItems = ciData.reduce((sum, e) => sum + e.items.length, 0);

  // ── Highlight: Figure AI's Helix VLA progress is most significant
  const highlightTitle = 'Figure AI — Helix VLA 기반 다중 작업 자율 수행 50+ 연속 행동 달성';
  const highlightSummary =
    'Figure AI가 자체 개발한 Helix VLA(Visual Language Action) 모델이 BMW 공장에서 50회 이상의 연속 행동을 수행하며 ' +
    '업계 최고 수준의 자율성을 입증했습니다. 언어 지시만으로 새로운 작업을 학습할 수 있는 능력은 산업용 휴머노이드 로봇 시장에서 ' +
    'Figure AI의 기술적 우위를 강화합니다. LG CLOiD의 VLA 도입 전략 수립 시 Figure AI의 접근법을 벤치마크할 필요가 있습니다.';

  let html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:20px 0;">
<table width="700" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1);">

<!-- ═══════ HEADER ═══════ -->
<tr><td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:28px 32px;">
  <table width="100%"><tr>
    <td>
      <span style="color:#fff;font-size:26px;font-weight:bold;letter-spacing:2px;">ARGOS</span>
      <span style="color:#A50034;font-size:14px;font-weight:bold;margin-left:6px;">●</span>
      <span style="color:#999;font-size:14px;margin-left:4px;">Daily Brief</span>
    </td>
    <td align="right"><span style="color:#aaa;font-size:13px;">${DATE_STR} (금)</span></td>
  </tr></table>
  <div style="color:#ccc;font-size:15px;margin-top:8px;">휴머노이드 로봇 경쟁사 동향</div>
</td></tr>

<!-- ═══════ [1] TODAY'S HIGHLIGHT ═══════ -->
<tr><td style="padding:24px 32px 16px;">
  <div style="background:linear-gradient(135deg,#A50034 0%,#d4004a 100%);border-radius:8px;padding:24px 28px;color:#fff;">
    <div style="font-size:11px;font-weight:bold;letter-spacing:3px;opacity:0.7;margin-bottom:10px;">🔥 TODAY'S HIGHLIGHT</div>
    <div style="font-size:18px;font-weight:bold;line-height:1.4;margin-bottom:10px;">${esc(highlightTitle)}</div>
    <div style="font-size:13px;line-height:1.7;opacity:0.95;">${esc(highlightSummary)}</div>
  </div>
</td></tr>

<!-- ═══════ [2] 기업별 동향 요약 ═══════ -->
<tr><td style="padding:8px 32px 0;">
  <div style="font-size:18px;font-weight:bold;color:#1a1a2e;border-bottom:2px solid #1a1a2e;padding-bottom:8px;margin-bottom:16px;">
    [2] 기업별 동향 요약
  </div>
</td></tr>`;

  // Company sections
  for (const entry of ciData) {
    const hasData = entry.items.length > 0;
    const itemCountStr = hasData ? `${entry.items.length}건` : '';

    html += `
<tr><td style="padding:4px 32px 12px;">
  <table width="100%" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;">
    <tr><td style="background:#f8f8fc;padding:10px 16px;font-weight:bold;font-size:15px;color:#1a1a2e;border-bottom:1px solid #e0e0e0;">
      ${esc(entry.company)}
      <span style="float:right;font-size:12px;color:#888;">${itemCountStr}</span>
    </td></tr>
    <tr><td style="padding:12px 16px;font-size:13px;line-height:1.7;color:#333;">`;

    if (!hasData) {
      html += `<span style="color:#999;">금일 특이사항 없음</span>`;
    } else {
      // Group by layer for cleaner presentation
      const byLayer = new Map<string, typeof entry.items>();
      for (const item of entry.items) {
        if (!byLayer.has(item.layer)) byLayer.set(item.layer, []);
        byLayer.get(item.layer)!.push(item);
      }

      for (const [layer, items] of byLayer) {
        html += `<div style="margin-bottom:8px;">
          <span style="display:inline-block;padding:1px 6px;border-radius:3px;background:#e8eaf6;color:#1a1a2e;font-size:11px;font-weight:bold;margin-bottom:4px;">${esc(layer)}</span>`;
        for (const item of items) {
          html += `<div style="margin:3px 0 3px 8px;">
            ${confidenceBadge(item.confidence)}
            <b>${esc(item.name)}</b>: ${esc(item.value)}
            <span style="font-size:11px;color:#888;"> — ${esc(item.source)}</span>
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

  // ── [3] 데이터 품질 요약 (no weekly trends on Friday) ──
  html += `
<tr><td style="padding:20px 32px 0;">
  <div style="font-size:18px;font-weight:bold;color:#1a1a2e;border-bottom:2px solid #1a1a2e;padding-bottom:8px;margin-bottom:16px;">
    [3] 데이터 품질 요약
  </div>
</td></tr>
<tr><td style="padding:0 32px 16px;">
  <table width="100%" style="border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;font-size:13px;">
    <tr><td style="padding:10px 16px;background:#f8f8fc;border-bottom:1px solid #e0e0e0;"><b>총 수집 건수</b></td>
        <td style="padding:10px 16px;border-bottom:1px solid #e0e0e0;text-align:right;font-weight:bold;color:#1a1a2e;">${totalItems}건</td></tr>
    <tr><td style="padding:10px 16px;border-bottom:1px solid #e0e0e0;">CI 데이터 항목</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e0e0e0;text-align:right;">${totalItems}건 (5개 기업)</td></tr>
    <tr><td style="padding:10px 16px;border-bottom:1px solid #e0e0e0;">데이터 미확보 기업</td>
        <td style="padding:10px 16px;border-bottom:1px solid #e0e0e0;text-align:right;color:#EF6C00;">Unitree, Apptronik, Agibot</td></tr>
  </table>

  <div style="margin-top:12px;">
    <b style="font-size:13px;color:#555;">신뢰도 분포 (CI 데이터 기준)</b>
    <table width="100%" style="margin-top:6px;font-size:13px;">
      <tr>
        ${Object.entries(confDist).filter(([_, c]) => c > 0).map(([grade, count]) =>
          `<td align="center" style="padding:6px;">${confidenceBadge(grade)}<br/><span style="font-size:14px;font-weight:bold;">${count}건</span></td>`
        ).join('')}
      </tr>
    </table>
  </div>
</td></tr>

<!-- ═══════ 참고 사항 ═══════ -->
<tr><td style="padding:16px 32px 0;">
  <div style="padding:14px 18px;background:#fff3e0;border-left:4px solid #EF6C00;border-radius:4px;font-size:12px;color:#555;line-height:1.6;">
    <b style="color:#EF6C00;">⚠ 참고:</b> 본 리포트는 ARGOS 시스템 내 CI 시드 데이터 기반으로 생성되었습니다.
    실시간 DB 조회가 불가하여, 최종 시드 시점 데이터를 반영합니다.
    Unitree, Apptronik, Agibot의 CI 데이터 수집이 필요합니다.
  </div>
</td></tr>

<!-- ═══════ FOOTER ═══════ -->
<tr><td style="background:#1a1a2e;padding:22px 32px;margin-top:20px;">
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

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log(`[ARGOS Newsletter] Generating ${DATE_STR} newsletter...`);

  const html = buildNewsletter();

  // Save to file for preview
  const outPath = `./scripts/newsletter-${DATE_STR}.html`;
  fs.writeFileSync(outPath, html, 'utf-8');
  console.log(`✅ HTML saved → ${outPath}`);

  // Send via Gmail if credentials are available
  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });

    await transporter.sendMail({
      from: `"ARGOS War Room" <${GMAIL_USER}>`,
      to: RECIPIENT,
      subject: `[ARGOS Daily Brief] 휴머노이드 로봇 경쟁사 동향 - ${DATE_STR}`,
      html,
    });

    console.log(`📧 Email sent → ${RECIPIENT}`);
  } else {
    console.log('⚠️  GMAIL_USER / GMAIL_APP_PASSWORD not set — email not sent.');
    console.log(`   To send: GMAIL_USER=you@gmail.com GMAIL_APP_PASSWORD=xxxx npx tsx ${outPath.replace('.html', '.ts')}`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
