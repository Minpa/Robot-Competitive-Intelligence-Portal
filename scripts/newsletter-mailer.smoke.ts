/**
 * newsletter-mailer 스모크 체크 (DB / 네트워크 / env 불필요)
 *
 * Usage: npx tsx scripts/newsletter-mailer.smoke.ts
 * 통과 시 마지막 줄에 "SMOKE OK"를 출력하고 종료코드 0.
 */

import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import {
  buildSmtpStrategies,
  buildRetrySchedule,
  computeWorstCaseMs,
  parseRecipients,
  parseSender,
  probeSmtp,
  resolveMailProvider,
  sendMail,
  sendWithBrevo,
  sendWithRetry,
  type FetchLike,
  type MailMessage,
  type MailTransporter,
  type ProbeConnect,
  type ProbeSocket,
} from './newsletter-mailer';

const USER = 'bot@example.com';
const PASS = 'super-secret-app-password';
const MESSAGE: MailMessage = { from: `"ARGOS" <${USER}>`, to: 'to@example.com', subject: 's', html: '<b>h</b>' };

type SendBehavior = (portIndex: number, callNo: number) => Promise<unknown>;

/** fake createTransport: 호출 순서/옵션을 기록하고 behavior 로 sendMail 결과를 제어한다 */
function makeHarness(behavior: SendBehavior) {
  const created: Array<{ port: number; secure: boolean | undefined }> = [];
  const sleeps: number[] = [];
  const logs: string[] = [];
  const closes: number[] = [];
  const createTransport = (options: { port?: number; secure?: boolean }): MailTransporter => {
    const callNo = created.length;
    created.push({ port: options.port as number, secure: options.secure });
    return {
      sendMail: () => behavior(options.port as number, callNo),
      close: () => {
        closes.push(callNo);
      },
    };
  };
  const sleep = async (ms: number) => {
    sleeps.push(ms);
  };
  const push = (line: string) => {
    logs.push(line);
  };
  return {
    created,
    sleeps,
    logs,
    closes,
    run: (extra: { attemptDeadlineMs?: number } = {}) =>
      sendWithRetry({
        user: USER,
        pass: PASS,
        message: MESSAGE,
        createTransport,
        sleep,
        log: push,
        logError: push,
        ...extra,
      }),
  };
}

function codeError(code: string, command?: string, message = `${code} happened`): Error {
  return Object.assign(new Error(message), { code, command });
}

async function expectReject(p: Promise<unknown>): Promise<Error> {
  try {
    await p;
  } catch (e) {
    return e as Error;
  }
  throw new assert.AssertionError({ message: 'expected promise to reject' });
}

// ── Brevo / probe / dispatcher 용 fake 들 (실제 네트워크 사용 금지) ──
const BREVO_KEY = 'fake-brevo-key-SHOULD-NEVER-BE-LOGGED-9f3a';
const SENDER = { name: 'ARGOS War Room', email: 'bot@example.com' };
const BREVO_TO = ['a@x.com', 'b@y.com'];
const ALL_BREVO_LOGS: string[] = []; // 마지막에 키 노출 여부를 일괄 검사한다

type FakeReply = { status: number; body: string } | Error;

function makeBrevoHarness(replies: FakeReply[]) {
  const calls: Array<{ url: string; init: Parameters<FetchLike>[1] }> = [];
  const sleeps: number[] = [];
  const logs: string[] = [];
  const push = (line: string) => {
    logs.push(line);
    ALL_BREVO_LOGS.push(line);
  };
  const fetchImpl: FetchLike = async (url, init) => {
    const reply = replies[calls.length];
    calls.push({ url, init });
    if (reply === undefined) throw new Error('fake fetch: unexpected extra call');
    if (reply instanceof Error) throw reply;
    return { status: reply.status, text: async () => reply.body };
  };
  const sleep = async (ms: number) => {
    sleeps.push(ms);
  };
  return {
    calls,
    sleeps,
    logs,
    fetchImpl,
    run: (extra: { timeoutMs?: number; fetchImpl?: FetchLike } = {}) =>
      sendWithBrevo({
        apiKey: BREVO_KEY,
        sender: SENDER,
        to: BREVO_TO,
        subject: 'subj',
        html: '<b>h</b>',
        fetchImpl,
        sleep,
        log: push,
        logError: push,
        ...extra,
      }),
  };
}

const json = (status: number, obj: unknown) => ({ status, body: JSON.stringify(obj) });

/** fake net.connect: mode 에 따라 connect / error 를 비동기로 발생시키거나 아무 일도 하지 않는다 */
function makeFakeConnect(mode: 'connect' | 'error' | 'hang' | 'throw') {
  const sockets: Array<{ destroyed: number }> = [];
  const connect: ProbeConnect = () => {
    if (mode === 'throw') throw new Error('sync connect failure');
    const state = { destroyed: 0 };
    sockets.push(state);
    const socket = Object.assign(new EventEmitter(), {
      destroy: () => {
        state.destroyed++;
      },
    }) as ProbeSocket;
    if (mode === 'connect') setImmediate(() => socket.emit('connect'));
    if (mode === 'error') {
      setImmediate(() => socket.emit('error', Object.assign(new Error('blocked'), { code: 'ECONNREFUSED' })));
    }
    return socket;
  };
  return { connect, sockets };
}

const PROBE_HINT = 'Railway 아웃바운드 SMTP 차단 가능성';

async function main() {
  // ── 1. 전략 목록 ──
  {
    const s = buildSmtpStrategies(USER, PASS);
    assert.strictEqual(s.length, 2);
    assert.deepStrictEqual(s.map(x => x.port), [465, 587]);
    assert.strictEqual(s[0].options.host, 'smtp.gmail.com');
    assert.strictEqual(s[0].options.port, 465);
    assert.strictEqual(s[0].options.secure, true);
    assert.strictEqual(s[0].options.requireTLS, undefined);
    assert.strictEqual(s[1].options.host, 'smtp.gmail.com');
    assert.strictEqual(s[1].options.port, 587);
    assert.strictEqual(s[1].options.secure, false);
    assert.strictEqual(s[1].options.requireTLS, true);
    for (const x of s) {
      assert.strictEqual(x.options.connectionTimeout, 30000);
      assert.strictEqual(x.options.greetingTimeout, 30000);
      assert.strictEqual(x.options.socketTimeout, 30000);
      assert.strictEqual(x.options.dnsTimeout, 10000);
      assert.deepStrictEqual(x.options.auth, { user: USER, pass: PASS });
      assert.ok(!('service' in x.options), 'service key must not exist');
    }
    console.log('[1] strategies OK');
  }

  // ── 2. 스케줄 + 최악 시간 ──
  {
    const strategies = buildSmtpStrategies(USER, PASS);
    const sched = buildRetrySchedule({ rounds: 3, strategyCount: 2, waitMs: 60000 });
    assert.strictEqual(sched.length, 6);
    assert.deepStrictEqual(sched.map(x => x.attemptNo), [1, 2, 3, 4, 5, 6]);
    assert.deepStrictEqual(
      sched.map(x => `R${x.round}-${strategies[x.strategyIndex].port}`),
      ['R1-465', 'R1-587', 'R2-465', 'R2-587', 'R3-465', 'R3-587'],
    );
    assert.deepStrictEqual(sched.map(x => x.delayBeforeMs), [0, 0, 60000, 0, 60000, 0]);
    const worst = computeWorstCaseMs(sched, 30000);
    assert.strictEqual(worst, 300000);
    assert.ok(worst <= 300000);
    console.log('[2] schedule OK (worst case ' + worst + 'ms)');
  }

  // ── 3. 전부 실패 ──
  {
    const h = makeHarness(async port => {
      throw codeError('ETIMEDOUT', 'CONN', `Connection timeout on ${port} with ${PASS}`);
    });
    const err = await expectReject(h.run());
    assert.strictEqual(h.created.length, 6);
    assert.deepStrictEqual(h.sleeps, [60000, 60000]);
    assert.match(err.message, /failed after 6 attempts/);
    assert.match(err.message, /ETIMEDOUT/);
    const all = h.logs.join('\n');
    for (const n of [1, 2, 3]) assert.ok(all.includes(`round ${n}/3`), `log has round ${n}/3`);
    assert.ok(all.includes('port 465') && all.includes('port 587'));
    assert.ok(all.includes('code=ETIMEDOUT') && all.includes('command=CONN'));
    assert.ok(!all.includes(PASS), 'password must not appear in logs');
    assert.ok(!err.message.includes(PASS), 'password must not appear in thrown error');
    assert.ok(!h.logs.some(l => l.includes('Email sent to')), 'no success log on total failure');
    console.log('[3] all-fail OK');
  }

  // ── 4. R1 465 실패, 587 성공 ──
  {
    const h = makeHarness(async port => {
      if (port === 465) throw codeError('ECONNECTION', 'CONN');
      return { accepted: [MESSAGE.to] };
    });
    await h.run();
    assert.strictEqual(h.created.length, 2);
    assert.deepStrictEqual(h.created.map(c => c.port), [465, 587]);
    assert.deepStrictEqual(h.sleeps, []);
    const success = h.logs.filter(l => l.includes('Email sent to'));
    assert.strictEqual(success.length, 1);
    assert.ok(success[0].includes('587') && success[0].includes('round 1/3'));
    assert.ok(success[0].includes('attempt 2/6'));
    console.log('[4] 465 fail -> 587 success OK');
  }

  // ── 5. R1 전체 실패, R2 465 성공 ──
  {
    const h = makeHarness(async (port, callNo) => {
      if (callNo < 2) throw codeError('ETIMEDOUT', 'CONN');
      return { accepted: [MESSAGE.to] };
    });
    await h.run();
    assert.strictEqual(h.created.length, 3);
    assert.deepStrictEqual(h.sleeps, [60000]);
    const success = h.logs.filter(l => l.includes('Email sent to'));
    assert.strictEqual(success.length, 1);
    assert.ok(success[0].includes('465') && success[0].includes('round 2/3'));
    console.log('[5] R1 fail -> R2 465 success OK');
  }

  // ── 6. EAUTH 즉시 중단 ──
  {
    const h = makeHarness(async () => {
      throw Object.assign(codeError('EAUTH', 'AUTH PLAIN'), { responseCode: 535 });
    });
    const err = await expectReject(h.run());
    assert.strictEqual(h.created.length, 1);
    assert.deepStrictEqual(h.sleeps, []);
    assert.match(err.message, /EAUTH/);
    console.log('[6] EAUTH abort OK');
  }

  // ── 7. 하드 데드라인 ──
  {
    const h = makeHarness(() => new Promise<never>(() => undefined)); // 영원히 pending
    const started = Date.now();
    const err = await expectReject(h.run({ attemptDeadlineMs: 50 }));
    const elapsed = Date.now() - started;
    assert.strictEqual(h.created.length, 6, 'deadline errors are retryable');
    assert.deepStrictEqual(h.sleeps, [60000, 60000]);
    assert.match(err.message, /EATTEMPTDEADLINE/);
    assert.ok(h.logs.join('\n').includes('code=EATTEMPTDEADLINE'));
    for (let i = 0; i < 6; i++) assert.ok(h.closes.includes(i), `transporter ${i} closed`);
    assert.ok(elapsed < 5000, `fake sleep => finishes quickly (${elapsed}ms)`);
    // 타이머가 남아 있으면 이 프로세스는 자연 종료되지 않는다(아래 SMOKE OK 이후 즉시 종료되는지로 확인)
    console.log('[7] hard deadline OK');
  }

  // ── 8. resolveMailProvider ──
  {
    assert.strictEqual(resolveMailProvider({ BREVO_API_KEY: BREVO_KEY }), 'brevo', 'auto + key');
    assert.strictEqual(resolveMailProvider({ MAIL_PROVIDER: 'auto', BREVO_API_KEY: BREVO_KEY }), 'brevo');
    assert.strictEqual(resolveMailProvider({}), 'smtp', 'auto, no key');
    assert.strictEqual(resolveMailProvider({ BREVO_API_KEY: '   ' }), 'smtp', 'blank key == no key');
    assert.strictEqual(resolveMailProvider({ MAIL_PROVIDER: 'brevo' }), 'brevo', 'forced brevo (key checked by caller)');
    assert.strictEqual(resolveMailProvider({ MAIL_PROVIDER: ' SMTP ', BREVO_API_KEY: BREVO_KEY }), 'smtp', 'forced smtp');
    assert.strictEqual(resolveMailProvider({ MAIL_PROVIDER: '' }), 'smtp', 'empty value == auto');
    assert.throws(() => resolveMailProvider({ MAIL_PROVIDER: 'brvo', BREVO_API_KEY: BREVO_KEY }), /MAIL_PROVIDER must be auto\|brevo\|smtp/);
    console.log('[8] resolveMailProvider OK');
  }

  // ── 9. parseRecipients / parseSender ──
  {
    assert.deepStrictEqual(parseRecipients('a@x.com, b@y.com ,,'), ['a@x.com', 'b@y.com']);
    assert.deepStrictEqual(parseRecipients('solo@x.com'), ['solo@x.com']);
    assert.throws(() => parseRecipients(''), /No valid recipients/);
    assert.throws(() => parseRecipients(' , ,'), /No valid recipients/);
    assert.throws(() => parseRecipients(undefined), /No valid recipients/);
    assert.throws(() => parseRecipients('a@x.com, nope'), /missing "@"/);
    assert.deepStrictEqual(parseSender('bot@example.com'), { name: 'ARGOS War Room', email: 'bot@example.com' });
    assert.deepStrictEqual(parseSender('bot@example.com', 'Custom'), { name: 'Custom', email: 'bot@example.com' });
    assert.deepStrictEqual(parseSender('"Named" <bot@example.com>'), { name: 'Named', email: 'bot@example.com' });
    assert.deepStrictEqual(parseSender('"Named" <bot@example.com>', 'Over'), { name: 'Over', email: 'bot@example.com' });
    assert.throws(() => parseSender(undefined), /Invalid sender/);
    assert.throws(() => parseSender('no-at-sign'), /Invalid sender/);
    console.log('[9] parseRecipients/parseSender OK');
  }

  // ── 10. Brevo 성공 ──
  {
    const h = makeBrevoHarness([json(201, { messageId: 'm1' })]);
    await h.run();
    assert.strictEqual(h.calls.length, 1);
    assert.deepStrictEqual(h.sleeps, []);
    const { url, init } = h.calls[0];
    assert.strictEqual(url, 'https://api.brevo.com/v3/smtp/email');
    assert.strictEqual(init.method, 'POST');
    assert.strictEqual(init.headers['api-key'], BREVO_KEY);
    assert.strictEqual(init.headers['content-type'], 'application/json');
    assert.ok(init.signal instanceof AbortSignal);
    const body = JSON.parse(init.body);
    assert.deepStrictEqual(body, {
      sender: { name: 'ARGOS War Room', email: 'bot@example.com' },
      to: [{ email: 'a@x.com' }, { email: 'b@y.com' }],
      subject: 'subj',
      htmlContent: '<b>h</b>',
    });
    assert.ok(!('html' in body), 'body must not have html key');
    assert.strictEqual(h.logs.length, 1, 'exactly one success log line');
    assert.ok(h.logs[0].includes('messageId=m1') && h.logs[0].includes('attempt 1/3'));
    assert.ok(h.logs[0].includes('a@x.com,b@y.com'));
    assert.ok(!h.logs.join('\n').includes(BREVO_KEY), 'api key must not appear in logs');
    console.log('[10] brevo success OK');
  }

  // ── 11. 401 즉시 실패 ──
  {
    const h = makeBrevoHarness([json(401, { code: 'unauthorized', message: `Key not found ${BREVO_KEY}` })]);
    const err = await expectReject(h.run());
    assert.strictEqual(h.calls.length, 1);
    assert.deepStrictEqual(h.sleeps, []);
    const all = h.logs.join('\n');
    assert.ok(all.includes('status=401') && all.includes('Key not found'));
    assert.ok(all.includes('API key invalid or IP restriction'));
    assert.match(err.message, /Brevo HTTP 401 unauthorized/);
    assert.ok(!all.includes(BREVO_KEY) && !err.message.includes(BREVO_KEY), 'api key must not leak');
    assert.ok(!(err.stack ?? '').includes(BREVO_KEY));
    console.log('[11] 401 fail-fast OK');
  }

  // ── 11b. 400 발신자 미인증 즉시 실패 / 비 JSON 응답 ──
  {
    const h = makeBrevoHarness([json(400, { code: 'invalid_parameter', message: 'Sender is not valid' })]);
    const err = await expectReject(h.run());
    assert.strictEqual(h.calls.length, 1);
    assert.deepStrictEqual(h.sleeps, []);
    const all = h.logs.join('\n');
    assert.ok(all.includes('status=400') && all.includes('Sender is not valid'));
    assert.ok(all.includes('sender not verified in Brevo Senders'));
    assert.match(err.message, /Brevo HTTP 400/);

    // 프록시 HTML 오류(502)는 예외 없이 message="n/a" 로 기록하고 재시도한다
    const h2 = makeBrevoHarness([{ status: 502, body: '<html>Bad Gateway</html>' }, json(201, { messageId: 'm2' })]);
    await h2.run();
    assert.strictEqual(h2.calls.length, 2);
    assert.ok(h2.logs.some(l => l.includes('status=502') && l.includes('msg="n/a"')));
    assert.ok(!h2.logs.join('\n').includes('Bad Gateway'), 'raw body must not be dumped');

    // 긴 message 는 200자로 잘린다
    const h3 = makeBrevoHarness([json(403, { code: 'c', message: 'x'.repeat(500) })]);
    await expectReject(h3.run());
    const line = h3.logs.find(l => l.includes('status=403')) as string;
    assert.ok(line.includes('x'.repeat(200)) && !line.includes('x'.repeat(201)));
    console.log('[11b] 400 / non-JSON / truncation OK');
  }

  // ── 12. 500, 500, 201 ──
  {
    const h = makeBrevoHarness([json(500, { code: 'e', message: 'boom' }), json(500, { code: 'e', message: 'boom' }), json(201, { messageId: 'm3' })]);
    await h.run();
    assert.strictEqual(h.calls.length, 3);
    assert.deepStrictEqual(h.sleeps, [60000, 60000]);
    const success = h.logs.filter(l => l.includes('Email sent to'));
    assert.strictEqual(success.length, 1);
    assert.ok(success[0].includes('attempt 3/3'));
    assert.strictEqual(h.logs.filter(l => l.includes('status=500')).length, 2);
    console.log('[12] 500,500,201 OK');
  }

  // ── 12b. 전부 500 ──
  {
    const h = makeBrevoHarness([json(500, {}), json(503, {}), json(500, {})]);
    const err = await expectReject(h.run());
    assert.strictEqual(h.calls.length, 3);
    assert.deepStrictEqual(h.sleeps, [60000, 60000]);
    assert.match(err.message, /failed after 3 attempts \(brevo\): a1:500, a2:503, a3:500/);
    assert.ok(!h.logs.some(l => l.includes('Email sent to')));
    console.log('[12b] all 5xx OK');
  }

  // ── 13. 500 후 201 ──
  {
    const h = makeBrevoHarness([json(500, { message: 'boom' }), json(201, { messageId: 'm4' })]);
    await h.run();
    assert.strictEqual(h.calls.length, 2);
    assert.deepStrictEqual(h.sleeps, [60000]);
    console.log('[13] 500 -> 201 OK');
  }

  // ── 14. 네트워크 오류 3회 ──
  {
    const netErr = () =>
      Object.assign(new TypeError(`fetch failed ${BREVO_KEY}`), {
        cause: Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' }),
      });
    const h = makeBrevoHarness([netErr(), netErr(), netErr()]);
    const err = await expectReject(h.run());
    assert.strictEqual(h.calls.length, 3);
    assert.deepStrictEqual(h.sleeps, [60000, 60000]);
    assert.match(err.message, /failed after 3 attempts/);
    assert.match(err.message, /ECONNRESET/);
    const all = h.logs.join('\n');
    assert.ok(all.includes('code=ECONNRESET'));
    assert.ok(!all.includes(BREVO_KEY) && !err.message.includes(BREVO_KEY), 'api key must not leak');
    console.log('[14] network errors OK');
  }

  // ── 15. 타임아웃 (abort 에 reject 하는 pending fetch) ──
  {
    const h = makeBrevoHarness([]);
    const hangingFetch: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
        });
      });
    const started = Date.now();
    const err = await expectReject(h.run({ timeoutMs: 50, fetchImpl: hangingFetch }));
    const elapsed = Date.now() - started;
    assert.deepStrictEqual(h.sleeps, [60000, 60000]);
    assert.match(err.message, /failed after 3 attempts/);
    assert.match(err.message, /ETIMEDOUT_API/);
    assert.strictEqual(h.logs.filter(l => l.includes('ETIMEDOUT_API')).length, 3);
    assert.ok(elapsed < 5000, `finishes quickly (${elapsed}ms)`);

    // signal 을 무시하는 fetch 여도 자체 타임아웃으로 실패 처리된다
    const ignoring: FetchLike = () => new Promise<never>(() => undefined);
    const h2 = makeBrevoHarness([]);
    const err2 = await expectReject(h2.run({ timeoutMs: 30, fetchImpl: ignoring }));
    assert.match(err2.message, /ETIMEDOUT_API/);
    // 타이머 잔존 여부는 아래 SMOKE OK 이후 프로세스가 스스로 종료되는지로 확인한다
    console.log('[15] timeout OK');
  }

  // ── 15b. 429 후 201 / 408 후 201 ──
  {
    const h = makeBrevoHarness([json(429, { code: 'too_many_requests', message: 'slow down' }), json(201, { messageId: 'm5' })]);
    await h.run();
    assert.strictEqual(h.calls.length, 2);
    assert.deepStrictEqual(h.sleeps, [60000]);
    const h2 = makeBrevoHarness([json(408, {}), json(201, { messageId: 'm6' })]);
    await h2.run();
    assert.strictEqual(h2.calls.length, 2);
    console.log('[15b] 429/408 retry OK');
  }

  // ── 16. SMTP 사전 프로브 ──
  {
    // probeSmtp 단독: 실패(error) / 성공 / 타임아웃 / connect 동기 throw 모두 resolve
    const failing = makeFakeConnect('error');
    const l1: string[] = [];
    await probeSmtp({ connect: failing.connect, log: x => l1.push(x), logError: x => l1.push(x) });
    assert.strictEqual(l1.length, 1);
    assert.ok(l1[0].includes('smtp.gmail.com:465 FAILED') && l1[0].includes('ECONNREFUSED'));
    assert.ok(l1[0].includes(PROBE_HINT) && l1[0].includes('BREVO_API_KEY'));
    assert.strictEqual(failing.sockets[0].destroyed, 1);

    const ok = makeFakeConnect('connect');
    const l2: string[] = [];
    await probeSmtp({ connect: ok.connect, log: x => l2.push(x), logError: x => l2.push(x) });
    assert.strictEqual(l2.length, 1);
    assert.ok(l2[0].includes('smtp.gmail.com:465 OK') && !l2[0].includes(PROBE_HINT));
    assert.strictEqual(ok.sockets[0].destroyed, 1);

    const hang = makeFakeConnect('hang');
    const l3: string[] = [];
    await probeSmtp({ connect: hang.connect, timeoutMs: 40, log: x => l3.push(x), logError: x => l3.push(x) });
    assert.ok(l3.length === 1 && l3[0].includes('FAILED (timeout,'));
    assert.strictEqual(hang.sockets[0].destroyed, 1);

    const thrower = makeFakeConnect('throw');
    const l4: string[] = [];
    await probeSmtp({ connect: thrower.connect, log: x => l4.push(x), logError: x => l4.push(x) });
    assert.ok(l4.length === 1 && l4[0].includes(PROBE_HINT));

    // smtp 디스패처: 프로브 실패 -> 힌트 1회, 이후 sendWithRetry 진행(fake transport 호출)
    const makeSmtpRun = (probeMode: 'error' | 'connect') => {
      const logs: string[] = [];
      const sent: MailMessage[] = [];
      let fetchCalls = 0;
      let probeCalls = 0;
      const push = (x: string) => {
        logs.push(x);
      };
      const fake = makeFakeConnect(probeMode);
      const run = () =>
        sendMail({
          provider: 'smtp',
          subject: 's',
          html: '<b>h</b>',
          to: ['a@x.com', 'b@y.com'],
          sender: { name: 'My "Name"', email: 'ignored@example.com' },
          smtpUser: USER,
          smtpPass: PASS,
          brevoApiKey: BREVO_KEY,
          fetchImpl: async () => {
            fetchCalls++;
            throw new Error('fetch must not be called on smtp path');
          },
          probe: () => {
            probeCalls++;
            return probeSmtp({ connect: fake.connect, log: push, logError: push });
          },
          createTransport: () => ({
            sendMail: async (m: MailMessage) => {
              sent.push(m);
              return {};
            },
            close: () => undefined,
          }),
          sleep: async () => undefined,
          log: push,
          logError: push,
        });
      return { run, logs, sent, calls: () => ({ fetchCalls, probeCalls }) };
    };

    const bad = makeSmtpRun('error');
    await bad.run();
    assert.strictEqual(bad.logs.filter(l => l.includes(PROBE_HINT)).length, 1, 'hint exactly once');
    assert.ok(bad.logs.some(l => l.includes('BREVO_API_KEY')));
    assert.strictEqual(bad.sent.length, 1, 'sendWithRetry still proceeds after probe failure');
    assert.deepStrictEqual(bad.calls(), { fetchCalls: 0, probeCalls: 1 });

    const good = makeSmtpRun('connect');
    await good.run();
    assert.ok(!good.logs.some(l => l.includes(PROBE_HINT)), 'no hint when probe succeeds');
    assert.strictEqual(good.sent.length, 1);

    // 프로브가 (규약 위반으로) throw 해도 전송은 계속된다
    const sent2: MailMessage[] = [];
    await sendMail({
      provider: 'smtp',
      subject: 's',
      html: 'h',
      to: ['a@x.com'],
      sender: SENDER,
      smtpUser: USER,
      smtpPass: PASS,
      probe: async () => {
        throw new Error('probe bug');
      },
      createTransport: () => ({ sendMail: async (m: MailMessage) => (sent2.push(m), {}), close: () => undefined }),
      log: () => undefined,
      logError: () => undefined,
    });
    assert.strictEqual(sent2.length, 1);

    // brevo 경로에서는 프로브 미호출
    const b = makeBrevoHarness([json(201, { messageId: 'm7' })]);
    let brevoProbeCalls = 0;
    await sendMail({
      provider: 'brevo',
      subject: 's',
      html: 'h',
      to: BREVO_TO,
      sender: SENDER,
      brevoApiKey: BREVO_KEY,
      fetchImpl: b.fetchImpl,
      probe: async () => {
        brevoProbeCalls++;
      },
      createTransport: () => {
        throw new Error('createTransport must not be called on brevo path');
      },
      sleep: async () => undefined,
      log: x => ALL_BREVO_LOGS.push(x),
      logError: x => ALL_BREVO_LOGS.push(x),
    });
    assert.strictEqual(brevoProbeCalls, 0);
    assert.strictEqual(b.calls.length, 1);
    console.log('[16] smtp probe OK');
  }

  // ── 17. 디스패처: MAIL_PROVIDER=smtp 강제 + 키 존재 ──
  {
    const provider = resolveMailProvider({ MAIL_PROVIDER: 'smtp', BREVO_API_KEY: BREVO_KEY });
    assert.strictEqual(provider, 'smtp');
    let fetchCalls = 0;
    let probeCalls = 0;
    const created: number[] = [];
    const sent: MailMessage[] = [];
    await sendMail({
      provider,
      subject: 'subj',
      html: '<b>h</b>',
      to: ['a@x.com', 'b@y.com'],
      sender: { name: 'Custom Name', email: 'other@example.com' },
      smtpUser: USER,
      smtpPass: PASS,
      brevoApiKey: BREVO_KEY,
      fetchImpl: async () => {
        fetchCalls++;
        throw new Error('no fetch on smtp path');
      },
      probe: async () => {
        probeCalls++;
      },
      createTransport: opts => {
        created.push(opts.port as number);
        return { sendMail: async (m: MailMessage) => (sent.push(m), {}), close: () => undefined };
      },
      sleep: async () => undefined,
      log: () => undefined,
      logError: () => undefined,
    });
    assert.strictEqual(fetchCalls, 0);
    assert.strictEqual(probeCalls, 1);
    assert.deepStrictEqual(created, [465]);
    assert.strictEqual(sent.length, 1);
    // Q7: 이름만 반영, 주소는 smtpUser 고정
    assert.strictEqual(sent[0].from, `"Custom Name" <${USER}>`);
    assert.strictEqual(sent[0].to, 'a@x.com, b@y.com');

    // 필수 자격 누락은 명확한 오류
    await assert.rejects(() => sendMail({ provider: 'brevo', subject: 's', html: 'h', to: ['a@x.com'], sender: SENDER }), /BREVO_API_KEY is required/);
    await assert.rejects(() => sendMail({ provider: 'smtp', subject: 's', html: 'h', to: ['a@x.com'], sender: SENDER }), /GMAIL_USER and GMAIL_APP_PASSWORD/);
    console.log('[17] dispatcher smtp-forced OK');
  }

  // ── 전체 Brevo 관련 로그에 API 키가 한 번도 나오지 않았는지 ──
  assert.ok(ALL_BREVO_LOGS.length > 0);
  assert.ok(!ALL_BREVO_LOGS.some(l => l.includes(BREVO_KEY)), 'api key leaked into logs');

  console.log('SMOKE OK');
}

main().catch(err => {
  console.error('SMOKE FAILED:', err);
  process.exit(1);
});
