'use client';

/**
 * 액추에이터 리포트 카드 — "세트 제조사의 액추에이터 사업화 전략".
 * 정적 원고(STRATEGY_CONTENT)는 로딩·오류에서도 항상 보이고, 헤드라인·1절 동적 문장·5절 현재값만 useActuatorMap 데이터로 채운다.
 * useActuatorMap 은 ActuatorMapSection 과 같은 queryKey(['actuator-map'])를 공유하므로 추가 네트워크 요청이 없다.
 * 문장은 buildDiagnosisLines / buildMetricRows 로 만들어 다운로드 HTML(buildActuatorStrategyCardHtml)과 공유한다.
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Panel } from '@/components/ui';
import { useActuatorMap } from './useActuatorMap';
import {
  STRATEGY_CONTENT,
  STRATEGY_SOURCES,
  buildDiagnosisLines,
  buildHeadlineMessage,
  buildMetricRows,
  buildSubtitle,
  computeStrategyStats,
  formatFooter,
  safeSourceHref,
} from './actuator-strategy';

const TH = 'text-left px-2 py-1.5 text-[11px] font-medium text-ink-600 align-bottom border-b border-ink-200';
const TD = 'px-2 py-1.5 text-[12px] text-ink-800 border-b border-ink-100 align-top leading-relaxed';
const H4 = 'text-[14px] font-semibold text-ink-900';
const NOTE = 'text-[11.5px] text-ink-600 leading-relaxed';

function StrategyTable({ caption, columns, rows, boldFirst = true }: { caption: string; columns: string[]; rows: string[][]; boldFirst?: boolean }) {
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col" className={TH}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i} className="break-inside-avoid">
              {cells.map((c, j) => (
                <td key={j} className={cn(j === 0 && 'min-w-[72px]', j === 0 && boldFirst ? `${TD} font-medium` : TD)}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="report-panel border border-ink-200 rounded-[10px] bg-white p-4 flex flex-col gap-3">
      <h4 className={H4}>{title}</h4>
      {children}
    </div>
  );
}

export function ActuatorStrategyCard() {
  const query = useActuatorMap();
  const data = query.data;
  const stats = useMemo(() => computeStrategyStats(data), [data]);
  const C = STRATEGY_CONTENT;

  const diagnosis = useMemo(() => (stats.hasData ? buildDiagnosisLines(stats) : []), [stats]);
  const headline = useMemo(() => buildHeadlineMessage(stats), [stats]);
  const metricRows = useMemo(() => buildMetricRows(stats).map((m) => [m.name, m.definition, m.availability, m.source, m.currentValue]), [stats]);

  const subtitle = stats.hasData
    ? buildSubtitle(stats)
    : `${query.isError ? '집계를 불러오지 못했습니다' : '집계 중…'} · 정적 본문 기준일 ${C.asOf}`;

  return (
    <Panel className="print:block print:overflow-visible" kicker={C.kicker} title={C.title} subtitle={subtitle}>
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-ink-900 leading-relaxed font-medium rounded-[10px] border border-ink-200 bg-ink-50 px-3 py-2.5">{headline}</p>
        <div className="flex flex-col gap-1.5">
          <p className={NOTE}>{C.notice}</p>
          <p className="text-[12.5px] text-ink-900 leading-relaxed font-medium">{C.question}</p>
        </div>

        <Block title={C.sections.diagnosis}>
          {stats.hasData ? (
            <ul className="list-disc pl-5 flex flex-col gap-1 text-[12.5px] text-ink-900 leading-relaxed">
              {diagnosis.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : query.isError ? (
            <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
              <p className="text-ink-600">집계를 불러오지 못했습니다</p>
              <button
                type="button"
                onClick={() => query.refetch()}
                className="no-print px-3 py-2 text-[12px] font-medium border border-ink-200 bg-white text-ink-700 hover:border-ink-400 transition-colors"
              >
                재시도
              </button>
            </div>
          ) : (
            <p className="text-[12.5px] text-ink-600">집계 중…</p>
          )}
          <StrategyTable caption={C.factsHeading} columns={C.factColumns} rows={C.factRows.map((r) => [r.category, r.subject, r.fact, r.evidence])} boldFirst={false} />
          <p className={NOTE}>{C.factsFootnote}</p>
        </Block>

        <Block title={C.sections.roles}>
          <p className={NOTE}>{C.rolesIntro}</p>
          <StrategyTable
            caption={C.sections.roles}
            columns={C.roleColumns}
            rows={C.roles.map((r) => [r.kind, r.item, r.content, r.evidence, r.limits])}
          />
        </Block>

        <Block title={C.sections.options}>
          <StrategyTable
            caption={C.sections.options}
            columns={C.optionColumns}
            rows={C.options.map((o) => [o.name, o.core, o.evidence, o.capability, o.risk, o.prerequisite])}
          />
        </Block>

        <Block title={C.sections.collab}>
          <StrategyTable
            caption={C.sections.collab}
            columns={C.collabColumns}
            rows={C.collabModels.map((m) => [m.name, m.content, m.pros, m.cons, m.decisions, m.evidence])}
          />
        </Block>

        <Block title={C.sections.metrics}>
          <StrategyTable caption={C.sections.metrics} columns={C.metricColumns} rows={metricRows} />
        </Block>

        <Block title={C.sections.questions}>
          <p className={NOTE}>{C.questionsIntro}</p>
          <ol className="list-decimal pl-5 flex flex-col gap-1 text-[12.5px] text-ink-900 leading-relaxed">
            {C.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </Block>

        <Block title={C.sections.sources}>
          <ul className={`flex flex-col gap-0.5 break-all ${NOTE}`}>
            {STRATEGY_SOURCES.map((s) => {
              const href = safeSourceHref(s.url);
              return (
                <li key={s.id}>
                  [{s.id}] {s.label} · 신뢰도 {s.grade} ·{' '}
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-900">
                      {s.url}
                    </a>
                  ) : (
                    s.url
                  )}
                </li>
              );
            })}
          </ul>
          <p className={NOTE}>신뢰도: A 공식, B 대형 매체, C 2차 자료.</p>
        </Block>

        <p className={NOTE}>{formatFooter(stats)}</p>
      </div>
    </Panel>
  );
}
