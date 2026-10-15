/**
 * newsletter-mailer 스모크 체크 (DB / 네트워크 / env 불필요)
 *
 * Usage: npx tsx scripts/newsletter-mailer.smoke.ts
 * 통과 시 마지막 줄에 "SMOKE OK"를 출력하고 종료코드 0.
 */

import assert from 'node:assert';
import {
  buildSmtpStrategies,
  buildRetrySchedule,
  computeWorstCaseMs,
  sendWithRetry,
  type MailMessage,
  type MailTransporter,
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

  console.log('SMOKE OK');
}

main().catch(err => {
  console.error('SMOKE FAILED:', err);
  process.exit(1);
});
