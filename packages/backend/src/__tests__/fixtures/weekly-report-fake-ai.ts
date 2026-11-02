/**
 * 주간 브리프 v2 테스트용 가짜 AI 클라이언트 — 프롬프트(JSON)를 읽어 그럴듯한 응답을 돌려준다.
 * 실제 API 는 호출하지 않는다. 토큰 수는 프롬프트/응답 길이로 만든 가짜 값이다.
 */

export type FakeFailMode = 'throw' | 'garbage' | 'refusal' | 'truncate';
export type FakeCall = 'A' | 'B' | 'C' | 'D';

export interface FakeAiOptions {
  /** 호출별 실패 방식 */
  fail?: Partial<Record<FakeCall, FakeFailMode>>;
  /** 가짜 id·URL·꺾쇠·금칙어·마크다운·입력에 없는 숫자를 섞는다 */
  hostile?: boolean;
  /** 서술을 짧게 만들어 최소 길이 미달을 유도한다 */
  tooShort?: boolean;
  /** 실제 응답에 가까운 길이(상한 근처)의 서술을 만든다 — 샘플 픽스처 생성용 */
  rich?: boolean;
}

export interface FakeAiCallLog {
  call: FakeCall;
  params: any;
  options: any;
}

function detectCall(user: any): FakeCall {
  if (user.candidates) return 'A';
  if (user.domains) return 'B';
  if (user.companies || user.papers) return 'C';
  return 'D';
}

function a(user: any, o: FakeAiOptions) {
  const cands: any[] = user.candidates ?? [];
  const highlights = cands.slice(0, o.rich ? 5 : 4).map((c, i) => {
    const fig = c.figure ? `${c.figure.value}${c.figure.unit ?? ''}` : '';
    const counts = user.week?.counts ?? {};
    const body = o.tooShort
      ? '짧은 서술입니다.'
      : o.rich
        ? `${c.label} 항목은 이번 주 집계에서 ${fig ? `${fig} 수준으로 확인되었습니다` : '확인되었습니다'}. ` +
          `연결된 근거 자료는 ${c.evidence.length}건이며, 대표 항목은 '${String(c.evidence[0]?.title ?? '').slice(0, 40)}'입니다. ` +
          `이번 주 전체 수집 건수는 영상 ${counts.videosNew}건, 기사 ${counts.articles}건, 논문 ${counts.papers}건입니다. ` +
          `집계 기간은 ${user.week?.period}이며 수치는 모두 서버 집계값입니다. 증감과 근거는 아래 수치 카드와 링크에서 확인할 수 있습니다.`
        : `${c.label} 항목은 이번 주 집계에서 ${fig ? `${fig} 수준으로 확인되었습니다` : '확인되었습니다'}. 연결된 근거 자료는 ${c.evidence.length}건이며 수집된 메타데이터만 사용했습니다. 세부 내용은 근거 링크에서 확인할 수 있습니다.`;
    return {
      candidateId: c.id,
      headline: o.rich ? `${String(c.label).slice(0, 24)} 관련 이번 주 동향` : `${String(c.label).slice(0, 20)} 동향`,
      body: o.hostile && i === 0 ? `${body} 점유율이 99%까지 올랐습니다. 링크는 http://evil.example 입니다. 시장 전망이 밝습니다. **강조** 문장입니다.` : body,
      refs: c.evidence.length > 0 ? [c.evidence[0].ref] : [],
    };
  });
  const kws: any[] = user.keywords ?? [];
  const keywordNote = o.tooShort ? '짧음' : o.rich && kws.length >= 3 ? `'${kws[0].term}' 언급은 이번 주 ${kws[0].count}회(지난주 ${kws[0].prevCount}회), '${kws[1].term}' 언급은 ${kws[1].count}회(지난주 ${kws[1].prevCount}회)로 집계되었습니다. 언급 횟수 상위 키워드는 ${kws.slice(0, 3).map((k: any) => k.term).join(', ')} 순이며, 방향별 증감은 아래 표에서 확인할 수 있습니다.` : kws.length >= 2 ? `'${kws[0].term}' 언급은 ${kws[0].count}회, '${kws[1].term}' 언급은 ${kws[1].count}회로 집계되었습니다. 지난주와 비교한 증감은 표에서 확인할 수 있습니다.` : null;
  const pool: any[] = user.watchPool ?? [];
  const watchPoints = pool.slice(0, o.rich ? 5 : 4).map((w) => ({
    title: `추적 항목 ${w.id}`,
    body: o.tooShort ? '짧음' : o.rich ? `${w.fact} 내용은 이번 주 데이터에서 근거가 확인된 항목입니다. 다음 주 집계에서도 같은 흐름이 이어지는지 확인할 필요가 있습니다. 집계 기간은 ${user.week?.period}입니다.` : `${w.fact} 내용에 대해 다음 주 집계에서 변화가 이어지는지 확인할 필요가 있습니다.`,
    refs: [w.id],
  }));
  if (o.hostile) {
    highlights.push({ candidateId: 'h999', headline: '가짜 후보', body: '존재하지 않는 후보에 대한 서술입니다. 존재하지 않는 후보에 대한 서술입니다.', refs: ['e1'] });
    highlights.push({ candidateId: cands[0]?.id ?? 'h1', headline: '중복 후보', body: '중복 후보에 대한 서술입니다. 중복 후보에 대한 서술입니다. 중복 후보입니다.', refs: ['e999'] });
    watchPoints.push({ title: '가짜 근거', body: '가짜 근거를 참조하는 관찰 포인트입니다. 가짜 근거를 참조하는 관찰 포인트입니다.', refs: ['w999'] });
  }
  return { highlights, keywordNote, watchPoints };
}

function b(user: any, o: FakeAiOptions) {
  const domains = (user.domains ?? []).map((d: any, i: number) => {
    const f = d.figures;
    const first = d.items[0];
    const second = d.items[1];
    const text = o.tooShort
      ? '짧은 서술입니다.'
      : `${d.label} 축에서 이번 주 영상 ${f.videos}건과 ${f.secondKind === 'paper' ? '논문' : '기사'} ${f.second}건이 수집되어 전체의 ${f.sharePct}%를 차지했습니다. ` +
        `${f.prevSharePct !== null ? `지난주 점유율은 ${f.prevSharePct}%였습니다. ` : ''}` +
        `대표 항목으로는 '${first?.title ?? ''}'${second ? `와 '${second.title}'` : ''}이(가) 있습니다. ` +
        (o.rich && d.topTags?.length ? `영상에서 자주 나타난 태그는 ${d.topTags.slice(0, 3).map((t: any) => t.tag).join(', ')}입니다. ` : '') +
        (o.rich ? `근거 카드 ${d.items.length}건이 연결되어 있으며, 대표 항목의 출처는 ${first?.source ?? ''}입니다. ` : '') +
        '각 항목은 수집된 메타데이터와 파생 요약만을 근거로 정리했으며 세부 내용은 근거 카드의 링크에서 확인할 수 있습니다.';
    return { key: d.key, narrative: o.hostile && i === 0 ? `${text} 점유율이 99%까지 올랐다는 해석은 입력에 없습니다.` : text, refs: d.items.length > 0 ? [d.items[0].ref] : [] };
  });
  if (o.hostile) domains.push({ key: 'nonexistent', narrative: '존재하지 않는 도메인입니다. '.repeat(10), refs: ['d1'] });
  return { domains };
}

function c(user: any, o: FakeAiOptions) {
  const companies = (user.companies ?? []).map((co: any) => ({
    ref: co.ref,
    blurb: o.tooShort ? '짧음' : `${co.name}은(는) 이번 주 영상과 기사를 합쳐 ${co.counts.total}건이 수집되었습니다${o.rich ? `(지난주 ${co.counts.prevTotal}건)` : ''}. ${co.items[0] ? `대표 항목은 '${String(co.items[0].title).slice(0, 50)}'입니다.` : '대표 항목은 없습니다.'}${o.rich ? ` 연결된 CI 항목은 ${(co.ci ?? []).length}건이며 관련 자료는 아래 카드에서 확인할 수 있습니다.` : ''}`,
    refs: co.items[0] ? [co.items[0].ref] : [],
    ciMeanings: (co.ci ?? []).map((k: any) => ({ ref: k.ref, meaning: o.tooShort ? '짧음' : `${k.item} 값이 갱신된 내용을 정리한 항목입니다.` })),
  }));
  const papers = (user.papers ?? []).map((p: any) => ({ ref: p.ref, why: o.tooShort ? '짧' : '이번 주 자료에서 해당 주제를 다룬 논문으로 분류됩니다.' }));
  if (o.hostile) {
    companies.push({ ref: 'c999', blurb: '존재하지 않는 회사의 서술입니다. 존재하지 않는 회사의 서술입니다.', refs: [], ciMeanings: [] });
    papers.push({ ref: 'p999', why: '존재하지 않는 논문의 해설입니다.' });
  }
  return { companies, papers };
}

function d(user: any, o: FakeAiOptions) {
  return (user.titles ?? []).map((t: any, i: number) => ({
    id: t.id,
    titleKo: o.hostile && i === 0 ? `<b>${String(t.title).slice(0, 20)} 99</b> 한글` : `${String(t.title).slice(0, 56)} (한글)`,
  }));
}

/** messages.create 를 흉내 내는 가짜 클라이언트 + 호출 로그 */
export function makeFakeReportClient(opts: FakeAiOptions = {}) {
  const calls: FakeAiCallLog[] = [];
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
          // 마지막 원소 중간에서 잘린 응답
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
