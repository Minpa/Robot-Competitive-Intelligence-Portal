/**
 * 주간 브리프 v3 테스트용 가짜 AI 클라이언트 — 프롬프트(JSON)를 읽어 그럴듯한 응답을 돌려준다.
 * 실제 API 는 호출하지 않는다. 토큰 수는 프롬프트/응답 길이로 만든 가짜 값이다. (실데이터 미측정)
 */

import { josa, withJosa } from '../../services/korean-josa.js';

export type FakeExecFailMode = 'throw' | 'garbage' | 'refusal' | 'truncate';
export type FakeExecCall = 'A' | 'B' | 'C' | 'D';

export interface FakeExecOptions {
  fail?: Partial<Record<FakeExecCall, FakeExecFailMode>>;
  /** 평어체·수집 건수·방향 모순·금칙어·가짜 id 를 섞는다 */
  hostile?: boolean;
  /** 실제 응답에 가까운 길이의 서술을 만든다 */
  rich?: boolean;
}

export interface FakeExecCallLog {
  call: FakeExecCall;
  params: any;
  options: any;
}

function detectCall(user: any): FakeExecCall {
  if (user.candidates) return 'A';
  if (user.gaps) return 'B';
  if (user.signals || user.moves) return 'C';
  return 'D';
}

function a(user: any, o: FakeExecOptions) {
  const cands: any[] = user.candidates ?? [];
  const conclusions = cands.map((c, i) => {
    const f = c.facts ?? {};
    const subject = f.company ?? f.label ?? '해당 항목';
    const detail =
      c.kind === 'gap_shift'
        ? `${f.axis}에서 ${withJosa(String(f.company), '은/는')} ${f.competitorValue}, 우리는 ${f.ourValue}${josa(String(f.ourValue), '이고/고') === '이고' ? '이며' : '며'} 비교 결과는 '${f.position}'입니다.`
        : c.kind === 'tech_signal'
          ? `${f.label}은 ${f.direction} 방향이며 최근 4주 ${f.recent}%, 이전 4주 ${f.prior}%입니다.`
          : `${subject}의 움직임이 참고 자료에서 확인됩니다.`;
    const lines: { role: string; text: string }[] = [
      { role: 'change', text: `${subject} 쪽에서 이번 주 눈에 띄는 변화가 확인되었습니다.` },
      { role: 'detail', text: detail },
      { role: 'why', text: '우리 제품 전략과 직접 맞닿아 있어서 연구소 차원에서 짚어 둘 변화입니다.' },
      { role: 'action', text: `${subject}${josa(String(subject), '과/와')} 관련해 공개된 사양과 참고 자료를 우리 사양과 함께 비교해 볼 필요가 있을 것 같습니다.` },
    ];
    if (o.rich) {
      lines.push({ role: 'detail', text: '이번 변화는 한 번의 발표가 아니라 참고 자료 여러 곳에서 함께 확인된다는 점이 중요합니다.' });
      lines.push({ role: 'action', text: `${subject} 관련 자료가 다음 주에도 같은 방향으로 이어지는지 추이를 지켜볼 필요가 있어 보입니다.` });
    }
    if (o.hostile && i === 0) lines.push({ role: 'detail', text: '가격이 내려감.' }, { role: 'detail', text: '영상 30건이 수집되었습니다.' }, { role: 'detail', text: '반드시 따라가야 합니다.' });
    return { candidateId: c.id, headline: c.kind === 'gap_shift' ? `${subject} 이번 주 ${f.axis} 수치를 공개했습니다` : c.kind === 'tech_signal' ? `${subject} 관련 자료 비율이 달라졌습니다` : `${subject}의 움직임이 확인되었습니다`, lines, actionKind: 'evaluate', refs: c.evidence?.[0] ? [c.evidence[0].ref] : [] };
  });
  if (o.hostile) conclusions.push({ candidateId: 'c999', headline: '가짜', lines: [], actionKind: 'evaluate', refs: ['e1'] });
  const questions = cands.slice(0, 3).map((c, i) => {
    const f = c.facts ?? {};
    const subject = f.company ?? f.label ?? '해당 항목';
    return {
      text: [
        `${subject}의 공개 사양과 참고 자료를 우리 사양과 직접 비교해 볼 필요가 있을 것 같습니다.`,
        `${subject} 제조사의 공개 자료와 공식 채널에서 사양 근거를 확인해 볼 필요가 있겠습니다.`,
        `${subject} 관련 자료가 다음 주에도 이어지는지 추이를 지켜볼 필요가 있어 보입니다.`,
      ][i],
      kind: (['evaluate', 'contact', 'decide'] as const)[i],
      rationale: ['참고 자료에서 같은 방향의 변화가 확인됩니다.', ...(o.rich ? ['공개된 사양은 확인되지만 측정 조건은 아직 알 수 없습니다.'] : [])],
      conclusionId: c.id,
      refs: c.evidence?.[0] ? [c.evidence[0].ref] : [],
    };
  });
  if (o.hostile) questions.push({ text: '이 변화를 직접 평가해 볼까요?', kind: 'evaluate', rationale: ['참고 자료에서 확인됩니다.'], conclusionId: null, refs: ['e1'] } as any);
  if (o.hostile) questions.push({ text: '근거 없는 질문입니다.', kind: 'watch', rationale: ['근거가 없습니다.'], conclusionId: null, refs: [] } as any);
  return { conclusions, questions };
}

function b(user: any, o: FakeExecOptions) {
  const rows = (user.gaps ?? []).map((g: any) => {
    if (g.status !== 'compared') {
      return { id: g.id, lines: [`${g.competitor}의 ${g.axis}은 ${g.competitorValue}로 확인됩니다.`, '우리 쪽 수치는 아직 등록되지 않았습니다.'] };
    }
    const headline = `이번 주 ${withJosa(g.competitor, '이/가')} ${g.axis} 수치 ${withJosa(g.competitorValue, '을/를')} 새로 공개했습니다.`;
    const lines = [
      `${g.axis} 항목에서 비교하면 ${g.position}입니다.`,
      `직전 수치와 비교한 변화는 ${g.movement}입니다.`,
    ];
    if (o.rich) lines.push('같은 기준끼리 비교한 값이라 수치를 그대로 나란히 볼 수 있습니다.', `${g.competitor}의 ${withJosa(g.axis, '이/가')} 앞서면 해당 제품의 성능 평가에 직접 영향을 줍니다.`);
    if (o.hostile) lines.push(g.position === '경쟁사가 앞서 있음' ? '이 축에서는 우리가 앞섭니다.' : '이 축에서는 경쟁사가 앞섭니다.');
    return { id: g.id, headline, lines };
  });
  const names = [...new Set<string>((user.gaps ?? []).map((g: any) => g.competitor))].slice(0, 2).join(', ');
  return {
    summary: rows.length > 0 ? [`이번 주 ${names}에서 새 수치가 공개되었습니다.`, '우리 쪽 수치가 아직 없는 항목은 비교 대상에서 제외했습니다.', ...(o.rich ? ['나머지 항목은 같은 기준으로 우리 수치와 나란히 놓았습니다.'] : [])] : [],
    rows,
  };
}

function c(user: any, o: FakeExecOptions) {
  const signals = (user.signals ?? []).map((t: any) => ({
    id: t.id,
    lines: [
      t.kind === 'procurement'
        ? `${t.label}의 변경 건수는 최근 4주 ${t.recent4w}건으로 이전 4주 ${t.prior4w}건과 비교해 ${t.direction} 방향입니다.`
        : `${t.label}의 최근 4주 점유율은 ${t.recent4w}%로 이전 4주 ${t.prior4w}%${josa(String(t.prior4w), '과/와')} 비교해 ${t.direction} 방향입니다.`,
      '한 주의 변동이 아니라 여러 주에 걸쳐 이어진 흐름입니다.',
      ...(o.rich ? ['여러 주에 걸쳐 같은 방향이라 일시적 변동과는 구분됩니다.'] : []),
    ],
  }));
  const moves = (user.moves ?? []).map((m: any) => ({
    id: m.id,
    lines: [`${m.company}의 ${m.category} 관련 움직임이 참고 자료에서 확인됩니다.`, '공급망에서는 누가 부품을 공급하는지가 이 소식의 핵심입니다.', ...(o.rich ? ['등록된 사실 칩은 현재 등록 현황 기준입니다.'] : [])],
  }));
  if (o.hostile) signals.push({ id: 't999', lines: ['가짜 흐름입니다.', '존재하지 않습니다.'] });
  return { signals, moves };
}

function d(user: any, o: FakeExecOptions) {
  const papers = (user.papers ?? []).map((p: any, i: number) => ({ ref: p.ref, frontierScore: i < 4 ? 3 : 1, implication: '핵심 기법이 우리 설계 검토에 참고가 됩니다.' }));
  const titles = (user.titles ?? []).map((t: any, i: number) => ({
    id: t.id,
    titleKo: o.hostile && i === 0 ? `<b>${String(t.title).slice(0, 20)} 99</b> 한글` : `${String(t.title).slice(0, 56)} (한글)`,
  }));
  return { papers, titles };
}

/** messages.create 를 흉내 내는 가짜 클라이언트 + 호출 로그 */
export function makeFakeExecClient(opts: FakeExecOptions = {}) {
  const calls: FakeExecCallLog[] = [];
  const client = {
    messages: {
      create: async (params: any, options: any) => {
        const user = JSON.parse(params.messages[0].content);
        const call = detectCall(user);
        calls.push({ call, params, options });
        const mode = opts.fail?.[call];
        if (mode === 'throw') throw new Error('simulated api failure');
        const inputTokens = Math.ceil((params.system.length + params.messages[0].content.length) * 1.1);
        if (mode === 'refusal') return { content: [], stop_reason: 'refusal', usage: { input_tokens: inputTokens, output_tokens: 5 } };
        if (mode === 'garbage') return { content: [{ type: 'text', text: '죄송합니다, JSON 이 아닙니다' }], stop_reason: 'end_turn', usage: { input_tokens: inputTokens, output_tokens: 20 } };
        const body = call === 'A' ? a(user, opts) : call === 'B' ? b(user, opts) : call === 'C' ? c(user, opts) : d(user, opts);
        let text = JSON.stringify(body);
        let stop = 'end_turn';
        if (mode === 'truncate') {
          text = text.slice(0, Math.floor(text.length * 0.8));
          stop = 'max_tokens';
        }
        return {
          content: [{ type: 'thinking', text: '생각 중…' }, { type: 'text', text: '```json\n' + text + '\n```' }],
          stop_reason: stop,
          usage: { input_tokens: inputTokens, output_tokens: Math.ceil(text.length * 0.9) },
        };
      },
    },
  };
  return { client, calls };
}
