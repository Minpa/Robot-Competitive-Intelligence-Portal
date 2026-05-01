'use client';

/**
 * SpecSheetView · REQ-10 Phase B (PDF 사양서)
 *
 * Print-optimized A4 layout. Six sections from spec §5.3:
 *   1. Cover  2. Components  3. Engineering  4. Environment
 *   5. Review  6. Revision Log (appendix)
 *
 * Each section is wrapped in a `<section className="page">` with
 * `page-break-after: always` so browser PDF (window.print → "Save as PDF")
 * yields a 6-page document. Light theme for print readability.
 */

import type { SpecSheetPayload } from '../types/product';

const REASON_KO: Record<string, string> = {
  OK: '도달',
  BASE_BLOCKED: '베이스 통과 불가',
  HEIGHT_OUT_OF_REACH: '높이 부족',
  HORIZONTAL_OUT_OF_REACH: '리치 부족',
  ZMP_LIMIT: 'ZMP 한계',
  TORQUE_LIMIT: '토크 한계',
  PAYLOAD_LIMIT: '페이로드 한계',
  NO_ARM: '팔 없음',
};

export function SpecSheetView({ data }: { data: SpecSheetPayload }) {
  const { meta, product, payloadKg, room, analysis, review, revisions } = data;
  const generatedDate = new Date(meta.generatedAt).toLocaleDateString('ko-KR');
  const targetCount = analysis.environment?.targets.length ?? 0;
  const targetReached = analysis.environment?.targets.filter((t) => t.canReach).length ?? 0;

  return (
    <div className="spec-sheet">
      <style jsx global>{`
        @page {
          size: A4;
          margin: 18mm 16mm;
        }
        @media print {
          html,
          body {
            background: white !important;
          }
        }
        .spec-sheet {
          background: white;
          color: #111;
          font-family: 'Inter', 'Noto Sans KR', system-ui, sans-serif;
          font-size: 10.5pt;
          line-height: 1.45;
        }
        .spec-sheet .page {
          page-break-after: always;
          padding: 24px 32px;
          max-width: 800px;
          margin: 0 auto;
        }
        .spec-sheet .page:last-child {
          page-break-after: auto;
        }
        .spec-sheet h1 {
          font-size: 22pt;
          font-weight: 700;
          margin: 0 0 4px;
        }
        .spec-sheet h2 {
          font-size: 14pt;
          font-weight: 700;
          margin: 0 0 12px;
          padding-bottom: 6px;
          border-bottom: 2px solid #111;
        }
        .spec-sheet h3 {
          font-size: 11pt;
          font-weight: 600;
          margin: 18px 0 6px;
          color: #333;
        }
        .spec-sheet table {
          width: 100%;
          border-collapse: collapse;
          margin: 6px 0 14px;
          font-size: 9.5pt;
        }
        .spec-sheet th,
        .spec-sheet td {
          border: 1px solid #ccc;
          padding: 5px 8px;
          text-align: left;
          vertical-align: top;
        }
        .spec-sheet th {
          background: #f3f3f3;
          font-weight: 600;
        }
        .spec-sheet td.num {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .spec-sheet .meta {
          font-size: 9pt;
          color: #555;
          margin-top: 12px;
        }
        .spec-sheet .badge {
          display: inline-block;
          padding: 2px 8px;
          border: 1px solid #999;
          font-size: 8.5pt;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-right: 6px;
        }
        .spec-sheet .badge.high {
          border-color: #c0142a;
          color: #c0142a;
          background: #fde8eb;
        }
        .spec-sheet .badge.medium {
          border-color: #b67d00;
          color: #b67d00;
          background: #fdf3d6;
        }
        .spec-sheet .badge.low {
          border-color: #4a6fa5;
          color: #4a6fa5;
          background: #e7eef8;
        }
        .spec-sheet .badge.mock {
          border-color: #c0142a;
          color: #c0142a;
        }
        .spec-sheet ul {
          padding-left: 20px;
          margin: 4px 0;
        }
        .spec-sheet li {
          margin-bottom: 4px;
        }
        .spec-sheet .summary-box {
          border-left: 4px solid #b67d00;
          background: #fdf3d6;
          padding: 10px 14px;
          margin: 8px 0 14px;
        }
        .spec-sheet .footer {
          margin-top: 24px;
          padding-top: 8px;
          border-top: 1px solid #ddd;
          font-size: 8.5pt;
          color: #888;
        }
      `}</style>

      {/* PAGE 1 — Cover */}
      <section className="page">
        <span className="badge mock">100% Mock 데이터 · ARGOS-Designer Phase 1 PoC</span>
        <h1 style={{ marginTop: 28 }}>제품 사양서</h1>
        <p style={{ fontSize: '13pt', color: '#444', margin: '4px 0 28px' }}>
          {product.name} · 청소기 + 매니퓰레이터
        </p>

        <table>
          <tbody>
            <tr>
              <th style={{ width: '30%' }}>후보명</th>
              <td>{meta.candidateName}</td>
            </tr>
            <tr>
              <th>제품명</th>
              <td>{product.name}</td>
            </tr>
            <tr>
              <th>작성자</th>
              <td>{meta.authorName}</td>
            </tr>
            <tr>
              <th>작성일</th>
              <td>{generatedDate}</td>
            </tr>
            <tr>
              <th>유즈케이스</th>
              <td>로봇청소기 + 매니퓰레이터 1~2개 (Phase 1 한정)</td>
            </tr>
            <tr>
              <th>분석 기준</th>
              <td>worst-case 자세 (팔 수평 뻗음) · 정적 ZMP · {payloadKg.toFixed(2)}kg 페이로드</td>
            </tr>
          </tbody>
        </table>

        <h3>구성 요약</h3>
        <table>
          <tbody>
            <tr>
              <th style={{ width: '30%' }}>베이스 형상</th>
              <td>
                {product.base.shape} · {product.base.diameterOrWidthCm.toFixed(1)} ×{' '}
                {product.base.heightCm.toFixed(1)} cm · {product.base.weightKg.toFixed(2)} kg
              </td>
            </tr>
            <tr>
              <th>리프트 컬럼</th>
              <td>
                {product.base.hasLiftColumn
                  ? `있음 · 최대 ${product.base.liftColumnMaxExtensionCm.toFixed(0)}cm`
                  : '없음'}
              </td>
            </tr>
            <tr>
              <th>매니퓰레이터</th>
              <td>{product.arms.length}개</td>
            </tr>
            <tr>
              <th>환경 시나리오</th>
              <td>
                {room
                  ? `${room.widthCm}×${room.depthCm}cm · 가구 ${room.furniture.length} · 장애물 ${room.obstacles.length} · 타겟 ${room.targets.length}`
                  : '환경 미정의'}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="footer">
          본 문서는 ARGOS-Designer Phase 1 PoC가 자동 생성한 사양서입니다. 모든 부품·치수는 Mock
          데이터이며, 개발 착수 전 사양 수렴 목적의 검토 자료로만 사용하십시오.
        </p>
      </section>

      {/* PAGE 2 — Components */}
      <section className="page">
        <h2>2. 부품 사양</h2>

        <h3>2.1 베이스</h3>
        <table>
          <tbody>
            <tr>
              <th style={{ width: '40%' }}>형상</th>
              <td>{product.base.shape}</td>
            </tr>
            <tr>
              <th>지름/폭</th>
              <td className="num">{product.base.diameterOrWidthCm.toFixed(1)} cm</td>
            </tr>
            <tr>
              <th>높이</th>
              <td className="num">{product.base.heightCm.toFixed(1)} cm</td>
            </tr>
            <tr>
              <th>무게</th>
              <td className="num">{product.base.weightKg.toFixed(2)} kg</td>
            </tr>
            <tr>
              <th>리프트 컬럼</th>
              <td>{product.base.hasLiftColumn ? `있음 (max ${product.base.liftColumnMaxExtensionCm.toFixed(0)}cm)` : '없음'}</td>
            </tr>
          </tbody>
        </table>

        {product.arms.length === 0 ? (
          <p style={{ color: '#888' }}>매니퓰레이터 미장착.</p>
        ) : (
          product.arms.map((arm, idx) => (
            <div key={idx}>
              <h3>2.{idx + 2} 매니퓰레이터 팔 {idx + 1}</h3>
              <table>
                <tbody>
                  <tr>
                    <th style={{ width: '40%' }}>장착 위치</th>
                    <td>{arm.mountPosition}</td>
                  </tr>
                  <tr>
                    <th>어깨 높이 (베이스 상단 기준)</th>
                    <td className="num">{arm.shoulderHeightAboveBaseCm.toFixed(1)} cm</td>
                  </tr>
                  <tr>
                    <th>상완 (L1)</th>
                    <td className="num">{arm.upperArmLengthCm.toFixed(1)} cm</td>
                  </tr>
                  <tr>
                    <th>전완 (L2)</th>
                    <td className="num">{arm.forearmLengthCm.toFixed(1)} cm</td>
                  </tr>
                  <tr>
                    <th>총 리치 (L1+L2)</th>
                    <td className="num">{(arm.upperArmLengthCm + arm.forearmLengthCm).toFixed(1)} cm</td>
                  </tr>
                  <tr>
                    <th>손목 자유도</th>
                    <td className="num">{arm.wristDof}</td>
                  </tr>
                  <tr>
                    <th>어깨 액추에이터 SKU</th>
                    <td>{arm.shoulderActuatorSku}</td>
                  </tr>
                  <tr>
                    <th>엘보 액추에이터 SKU</th>
                    <td>{arm.elbowActuatorSku}</td>
                  </tr>
                  <tr>
                    <th>엔드이펙터 SKU</th>
                    <td>
                      {arm.endEffectorSku}
                      {analysis.arms[idx]
                        ? ` · max payload ${analysis.arms[idx].endEffectorMaxPayloadKg.toFixed(2)}kg`
                        : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))
        )}
      </section>

      {/* PAGE 3 — Engineering */}
      <section className="page">
        <h2>3. 공학적 분석 결과</h2>

        <h3>3.1 ZMP 안정성 (정적, worst-case 자세)</h3>
        {analysis.stability ? (
          <table>
            <tbody>
              <tr>
                <th style={{ width: '40%' }}>안정성</th>
                <td>{analysis.stability.isStable ? 'OK · 풋프린트 내부' : '⚠ 불안정 · 풋프린트 외부'}</td>
              </tr>
              <tr>
                <th>가장자리까지 마진</th>
                <td className="num">{analysis.stability.marginToEdgeCm.toFixed(2)} cm</td>
              </tr>
              <tr>
                <th>ZMP 위치 (베이스 중심 기준)</th>
                <td className="num">
                  X {analysis.stability.zmpXCm.toFixed(1)}, Y {analysis.stability.zmpYCm.toFixed(1)} cm
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p style={{ color: '#888' }}>ZMP 미산출 (팔 미장착).</p>
        )}

        <h3>3.2 정역학 토크 (팔별)</h3>
        {analysis.arms.length === 0 ? (
          <p style={{ color: '#888' }}>해당 없음.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>팔</th>
                <th>관절</th>
                <th>SKU</th>
                <th>요구 토크</th>
                <th>피크 한계</th>
                <th>마진</th>
              </tr>
            </thead>
            <tbody>
              {analysis.arms.flatMap((a, ai) =>
                a.statics.joints.map((j) => (
                  <tr key={`${ai}-${j.jointName}`} style={j.overLimit ? { background: '#fde8eb' } : undefined}>
                    <td>{ai + 1}</td>
                    <td>{j.jointName === 'shoulder' ? '어깨' : '엘보'}</td>
                    <td>{j.actuatorSku}</td>
                    <td className="num">{j.requiredPeakTorqueNm.toFixed(2)} Nm</td>
                    <td className="num">{j.actuatorPeakTorqueNm.toFixed(2)} Nm</td>
                    <td className="num" style={{ color: j.overLimit ? '#c0142a' : '#222' }}>
                      {j.marginPct.toFixed(1)} %
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        <h3>3.3 페이로드</h3>
        <table>
          <tbody>
            <tr>
              <th style={{ width: '40%' }}>설정 페이로드</th>
              <td className="num">{payloadKg.toFixed(2)} kg</td>
            </tr>
            {analysis.arms.map((a, idx) => (
              <tr key={idx}>
                <th>팔 {idx + 1} EE 한계</th>
                <td className="num" style={{ color: a.endEffectorPayloadOverLimit ? '#c0142a' : '#222' }}>
                  {a.endEffectorMaxPayloadKg.toFixed(2)} kg{' '}
                  {a.endEffectorPayloadOverLimit ? '· 초과' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* PAGE 4 — Environment */}
      <section className="page">
        <h2>4. 환경 적합성</h2>
        {!room || !analysis.environment ? (
          <p style={{ color: '#888' }}>환경 미정의 — 환경 적합성 분석을 수행하지 않았습니다.</p>
        ) : (
          <>
            <h3>4.1 통과 가능 영역</h3>
            <table>
              <tbody>
                <tr>
                  <th style={{ width: '40%' }}>방 면적</th>
                  <td className="num">
                    {(room.widthCm * room.depthCm).toLocaleString()} cm² ({room.widthCm}×{room.depthCm})
                  </td>
                </tr>
                <tr>
                  <th>통과 가능 영역</th>
                  <td className="num">
                    {analysis.environment.traversability.coveragePct.toFixed(1)} %
                  </td>
                </tr>
                <tr>
                  <th>차단 장애물</th>
                  <td className="num">
                    {analysis.environment.traversability.blockedObstacleIndices.length} / {room.obstacles.length}
                  </td>
                </tr>
                <tr>
                  <th>지상고</th>
                  <td className="num">
                    {analysis.environment.traversability.groundClearanceCm.toFixed(1)} cm
                  </td>
                </tr>
              </tbody>
            </table>

            <h3>4.2 타겟 도달성 ({targetReached}/{targetCount})</h3>
            {targetCount === 0 ? (
              <p style={{ color: '#888' }}>타겟 미배치.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>도달</th>
                    <th>사유</th>
                    <th>사용 팔</th>
                    <th>페이로드 마진</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.environment.targets.map((t) => (
                    <tr key={t.targetMarkerIndex} style={t.canReach ? undefined : { background: '#fde8eb' }}>
                      <td>{t.targetMarkerIndex + 1}</td>
                      <td>{t.canReach ? 'OK' : '✗'}</td>
                      <td>
                        {REASON_KO[t.reason] ?? t.reason} {t.reasonText ? `· ${t.reasonText}` : ''}
                      </td>
                      <td className="num">{t.armUsed === null ? '—' : t.armUsed + 1}</td>
                      <td className="num">{t.payloadMarginKg.toFixed(2)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>

      {/* PAGE 5 — Review */}
      <section className="page">
        <h2>5. 검토 의견</h2>
        <p style={{ fontSize: '9pt', color: '#666', margin: '0 0 8px' }}>
          출처: {review.source === 'claude' ? 'Claude API (claude-opus-4-7)' : '내부 휴리스틱 룰 베이스'} ·{' '}
          {new Date(review.generatedAt).toLocaleString('ko-KR')}
        </p>

        <div className="summary-box">
          <strong style={{ display: 'block', marginBottom: 4 }}>진단 요약</strong>
          {review.summary}
        </div>

        {review.issues.length === 0 ? (
          <p>현재 사양은 안정 영역 — 추가 권고 없음.</p>
        ) : (
          review.issues.map((issue, idx) => (
            <div key={idx} style={{ marginBottom: 14 }}>
              <span className={`badge ${issue.severity}`}>{issue.severity.toUpperCase()}</span>
              <strong style={{ fontSize: '11pt' }}>{issue.title}</strong>
              <p style={{ margin: '4px 0' }}>{issue.explanation}</p>
              {issue.recommendations.length > 0 ? (
                <ul>
                  {issue.recommendations.map((r, ri) => (
                    <li key={ri}>
                      <strong>{r.action}</strong> — <span style={{ color: '#555' }}>{r.expected_effect}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))
        )}
      </section>

      {/* PAGE 6 — Revisions */}
      <section className="page">
        <h2>6. 부록 · 사양 변경 로그</h2>
        {revisions.length === 0 ? (
          <p style={{ color: '#888' }}>변경 이력 없음.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>시각</th>
                <th>파라미터</th>
                <th>이전</th>
                <th>이후</th>
              </tr>
            </thead>
            <tbody>
              {revisions
                .slice()
                .reverse()
                .map((r, idx) => (
                  <tr key={idx}>
                    <td className="num">{new Date(r.changedAt).toLocaleTimeString('ko-KR')}</td>
                    <td>{r.parameterName}</td>
                    <td>{formatVal(r.oldValue)}</td>
                    <td>{formatVal(r.newValue)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
        <p className="footer">
          본 사양서는 ARGOS-Designer Phase 1 PoC 자동 생성 결과입니다. 사용자 입력 데이터는 7일 후
          자동 삭제됩니다 (스펙 §9 가드레일 6).
        </p>
      </section>
    </div>
  );
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2);
  if (typeof v === 'boolean') return v ? 'on' : 'off';
  if (typeof v === 'string') return v;
  try {
    const s = JSON.stringify(v);
    return s.length > 30 ? s.slice(0, 27) + '…' : s;
  } catch {
    return '?';
  }
}
