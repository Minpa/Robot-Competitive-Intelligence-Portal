/**
 * 주간 브리프 통합 테스트용 시드 픽스처 (임시 PostgreSQL 전용 — 운영 DB 로 실행하지 말 것).
 *
 * 2026-10-19(월)~10-25(일) KST 주(= UTC [2026-10-18 15:00, 2026-10-25 15:00)) 와 직전 주에
 * 기사·영상·논문, 키워드, CI 값/이력, 알림, 신규 로봇을 넣는다. 모든 행은 식별 가능한 접두어('wb-fixture-', 'WB ')를 써서
 * 다시 실행하면 지우고 다시 넣는다(멱등). companies / ci_* / humanoid_robots 는 기존 시드가 있어야 한다.
 *
 * 경계 케이스
 *  - 이번 주 시작 직전·직후·끝 직전 / 다음 주 시작 시각의 기사 (구간은 [start, end) 이어야 한다)
 *  - published_at 이 NULL 이고 collected_at 만 구간 내인 기사 (COALESCE 기준)
 *  - 지난주에 발행됐지만 이번 주에 분석된 영상 (videosAnalyzed 에만 잡힌다)
 *  - 도메인과 무관하다고 AI 가 판정(domainFocus=none)한 영상
 *  - 썸네일이 ytimg 가 아닌 영상 (videoId 로 대체되어야 한다)
 *  - github 출처 행 (목록·총량 어디에도 들어가지 않는다)
 *  - CI: 이력 있는 값(두 번 변경 → 가장 이른 old / 가장 늦은 new), 되돌려진 값(제외), 이력 없이 updated_at 만 갱신된 값, 지난주 이력
 */

export type SeedExec = (sqlText: string) => Promise<unknown>;

/** 시드가 보장하는 기대값 (통합 테스트가 직접 SQL 집계와 함께 확인한다) */
export const WEEKLY_BRIEF_SEED_EXPECTED = {
  weekStart: '2026-10-19',
  prevWeekStart: '2026-10-12',
  current: {
    news: 43, // 40 + 시작 직전 경계 제외 후 포함 3(시작 정각, 끝 직전, published_at NULL)
    videos: 25,
    papers: 12,
    videosAnalyzed: 10, // 이번 주 영상 9 + 지난주 발행·이번 주 분석 1
    alerts: 3,
    newRobots: 2,
    ciUpdates: 3, // 변경 이력 2(되돌려진 1건 제외) + 이력 없는 updated_at 1
  },
  prev: {
    news: 30,
    videos: 13, // 12 + 지난주에 발행되고 이번 주에 분석된 영상 1
    papers: 8,
    videosAnalyzed: 4,
    alerts: 2,
    ciUpdates: 1,
  },
} as const;

const CUR_START = '2026-10-18 15:00:00';
const PREV_START = '2026-10-11 15:00:00';

export async function seedWeeklyBriefFixture(exec: SeedExec): Promise<void> {
  // ── 정리 ──────────────────────────────────────────────
  await exec(`DELETE FROM article_keywords WHERE article_id IN (SELECT id FROM articles WHERE content_hash LIKE 'wb-fixture-%')`);
  await exec(`DELETE FROM articles WHERE content_hash LIKE 'wb-fixture-%'`);
  await exec(`DELETE FROM keywords WHERE term LIKE 'wb-%'`);
  await exec(`DELETE FROM ci_value_history WHERE change_reason = 'wb-fixture'`);
  await exec(`DELETE FROM competitive_alerts WHERE title LIKE 'WB alert%'`);
  await exec(`DELETE FROM humanoid_robots WHERE name LIKE 'WB Robot%'`);
  await exec(`DELETE FROM weekly_briefs`);

  // ── 기사(뉴스) — 이번 주 40건 + 경계 3건, 직전 주 30건 ──────────────
  // 5의 배수는 '양산' 도메인 정규식에 걸리는 제목, 4의 배수는 회사 연결, 3의 배수는 summary 없음
  await exec(`
    INSERT INTO articles (title, source, url, published_at, summary, content_hash, collected_at, product_type, company_id, extracted_metadata)
    SELECT 'WB news cur ' || i || CASE WHEN i % 5 = 0 THEN ' mass production line update' ELSE '' END,
           'wbsrc' || (i % 6),
           'https://example.com/wb/cur/' || i,
           TIMESTAMP '${CUR_START}' + (i * INTERVAL '3 hours'),
           CASE WHEN i % 3 = 0 THEN NULL ELSE 'Summary sentence number ' || i || '. Another sentence follows.' END,
           'wb-fixture-cur-news-' || i,
           TIMESTAMP '${CUR_START}' + (i * INTERVAL '3 hours') + INTERVAL '1 hour',
           'none',
           CASE WHEN i % 4 = 0 THEN (SELECT id FROM companies ORDER BY name LIMIT 1) ELSE NULL END,
           '{}'::jsonb
    FROM generate_series(1, 40) AS i
  `);
  await exec(`
    INSERT INTO articles (title, source, url, published_at, summary, content_hash, collected_at, product_type, company_id, extracted_metadata)
    SELECT 'WB news prev ' || i || CASE WHEN i % 5 = 0 THEN ' mass production line update' ELSE '' END,
           'wbsrc' || (i % 6),
           'https://example.com/wb/prev/' || i,
           TIMESTAMP '${PREV_START}' + (i * INTERVAL '4 hours'),
           'Prev summary ' || i || '. More.',
           'wb-fixture-prev-news-' || i,
           TIMESTAMP '${PREV_START}' + (i * INTERVAL '4 hours'),
           'none',
           CASE WHEN i % 6 = 0 THEN (SELECT id FROM companies ORDER BY name LIMIT 1) ELSE NULL END,
           '{}'::jsonb
    FROM generate_series(1, 30) AS i
  `);
  // 경계: 시작 정각(포함), 끝 직전(포함), 다음 주 시작(제외), published_at NULL + collected_at 구간 내(포함), github(제외)
  await exec(`
    INSERT INTO articles (title, source, url, published_at, summary, content_hash, collected_at, product_type, extracted_metadata) VALUES
      ('WB boundary start', 'wbsrc0', 'https://example.com/wb/b/start', '2026-10-18 15:00:00', 'Boundary start. x', 'wb-fixture-b-start', '2026-10-18 15:00:00', 'none', '{}'),
      ('WB boundary end', 'wbsrc1', 'https://example.com/wb/b/end', '2026-10-25 14:59:59.999', 'Boundary end. x', 'wb-fixture-b-end', '2026-10-25 14:59:59.999', 'none', '{}'),
      ('WB boundary next week', 'wbsrc2', 'https://example.com/wb/b/next', '2026-10-25 15:00:00', 'Next week. x', 'wb-fixture-b-next', '2026-10-25 15:00:00', 'none', '{}'),
      ('WB boundary null published', 'wbsrc3', 'https://example.com/wb/b/null', NULL, 'Null published. x', 'wb-fixture-b-null', '2026-10-22 00:00:00', 'none', '{}'),
      ('WB github repo', 'github', 'https://github.com/example/wb', '2026-10-21 00:00:00', 'Repo. x', 'wb-fixture-gh-1', '2026-10-21 00:00:00', 'none', '{}')
  `);

  // ── 논문(arXiv) — 이번 주 12건 / 직전 주 8건 (액추에이터 정규식에 걸리는 제목) ──
  //  이번 주 12번째는 호스트가 export.arxiv.org 라 총량에는 들어가지만 목록에서는 제외된다. 저자는 배열(5명) 또는 문자열(3의 배수).
  await exec(`
    INSERT INTO articles (title, source, url, published_at, summary, content_hash, collected_at, product_type, extracted_metadata)
    SELECT 'Compact actuator with harmonic drive ' || i, 'arxiv',
           CASE WHEN i = 12 THEN 'https://export.arxiv.org/abs/2610.' ELSE 'https://arxiv.org/abs/2610.' END || lpad(i::text, 5, '0'),
           TIMESTAMP '${CUR_START}' + (i * INTERVAL '10 hours'), 'We present an actuator design. Results follow.',
           'wb-fixture-cur-paper-' || i, TIMESTAMP '${CUR_START}' + (i * INTERVAL '10 hours'), 'none',
           CASE WHEN i % 3 = 0 THEN jsonb_build_object('authors', 'Solo Author ' || i)
                ELSE jsonb_build_object('authors', jsonb_build_array('Author ' || i || 'A', 'Author ' || i || 'B', 'Author ' || i || 'C', 'Author ' || i || 'D', 'Author ' || i || 'E')) END
    FROM generate_series(1, 12) AS i
  `);
  await exec(`
    INSERT INTO articles (title, source, url, published_at, summary, content_hash, collected_at, product_type, extracted_metadata)
    SELECT 'Quasi-direct drive joint study ' || i, 'arxiv', 'https://arxiv.org/abs/2609.' || lpad(i::text, 5, '0'),
           TIMESTAMP '${PREV_START}' + (i * INTERVAL '12 hours'), 'Prev actuator paper. Results.',
           'wb-fixture-prev-paper-' || i, TIMESTAMP '${PREV_START}' + (i * INTERVAL '12 hours'), 'none', '{}'::jsonb
    FROM generate_series(1, 8) AS i
  `);

  // ── 영상 — 이번 주 25건 (조회수/videoId/썸네일/도메인/분석), 직전 주 12건 ─────────
  //  i<=10 actuator, 11..14 hand, 5의 배수는 비-ytimg 썸네일, 24번은 AI 가 도메인 무관(none)으로 판정, 25번은 조회수 없음
  await exec(`
    INSERT INTO articles (title, source, url, published_at, summary, content_hash, collected_at, product_type, company_id, extracted_metadata)
    SELECT 'WB video ' || i, 'youtube', 'https://www.youtube.com/watch?v=WBVID' || lpad(i::text, 6, '0'),
           TIMESTAMP '${CUR_START}' + (i * INTERVAL '6 hours'), NULL,
           'wb-fixture-cur-video-' || i, TIMESTAMP '${CUR_START}' + (i * INTERVAL '6 hours'), 'video',
           CASE WHEN i <= 3 THEN (SELECT id FROM companies ORDER BY name LIMIT 1) ELSE NULL END,
           jsonb_strip_nulls(jsonb_build_object(
             'videoId', 'WBVID' || lpad(i::text, 6, '0'),
             'channel', 'WB Channel ' || (i % 7),
             'views', CASE WHEN i = 25 THEN NULL ELSE i * 1000 END,
             'domain', CASE WHEN i <= 10 THEN 'actuator' WHEN i <= 14 THEN 'hand' ELSE NULL END,
             'thumbnail', CASE WHEN i % 5 = 0 THEN 'https://evil.example.com/x.jpg' ELSE 'https://i.ytimg.com/vi/WBVID' || lpad(i::text, 6, '0') || '/mqdefault.jpg' END,
             'description', 'WB description ' || i,
             'geminiAnalyzedAt', CASE WHEN i <= 9 THEN '2026-10-21T00:00:00.000Z' ELSE NULL END,
             'geminiAnalysis', CASE WHEN i <= 9 THEN jsonb_build_object('summaryKo', '요약 문장 ' || i || '입니다. 둘째 문장입니다.', 'durationSec', 100 + i, 'task', 'wb') ELSE NULL END,
             'domainFocus', CASE WHEN i = 24 THEN jsonb_build_object('actuator', jsonb_build_object('level', 'none'), 'hand', jsonb_build_object('level', 'none')) ELSE NULL END
           ))
    FROM generate_series(1, 25) AS i
  `);
  await exec(`
    INSERT INTO articles (title, source, url, published_at, summary, content_hash, collected_at, product_type, extracted_metadata)
    SELECT 'WB video prev ' || i, 'youtube', 'https://www.youtube.com/watch?v=WBPRV' || lpad(i::text, 6, '0'),
           TIMESTAMP '${PREV_START}' + (i * INTERVAL '10 hours'), NULL,
           'wb-fixture-prev-video-' || i, TIMESTAMP '${PREV_START}' + (i * INTERVAL '10 hours'), 'video',
           jsonb_strip_nulls(jsonb_build_object(
             'videoId', 'WBPRV' || lpad(i::text, 6, '0'),
             'channel', 'WB Prev Channel ' || (i % 4),
             'views', i * 500,
             'domain', CASE WHEN i <= 3 THEN 'actuator' ELSE NULL END,
             'geminiAnalyzedAt', CASE WHEN i <= 4 THEN '2026-10-14T00:00:00.000Z' ELSE NULL END
           ))
    FROM generate_series(1, 12) AS i
  `);
  // 지난주(10/15)에 발행됐지만 이번 주(10/22)에 분석된 영상 — videosAnalyzed 에만 잡힌다
  await exec(`
    INSERT INTO articles (title, source, url, published_at, summary, content_hash, collected_at, product_type, extracted_metadata) VALUES
      ('WB video analyzed late', 'youtube', 'https://www.youtube.com/watch?v=WBLATE000001', '2026-10-15 00:00:00', NULL, 'wb-fixture-late-video', '2026-10-15 00:00:00', 'video',
       '{"videoId":"WBLATE000001","channel":"WB Late","views":42,"geminiAnalyzedAt":"2026-10-22T00:00:00.000Z"}'::jsonb)
  `);

  // ── 키워드 ─────────────────────────────────────────────
  //  wb-tactile: 이번 주 40회(8건 × 5) / 지난주 30회(6건 × 5) → +33.3%  (대표 키워드)
  //  wb-gripper: 이번 주 12 / 지난주 12 → 변화 없음, wb-newterm: 이번 주 9 / 지난주 0, wb-rare: 이번 주 2 (임계값 미만)
  await exec(`INSERT INTO keywords (term, language) VALUES ('wb-tactile','en'),('wb-gripper','en'),('wb-newterm','en'),('wb-rare','en')`);
  const link = (term: string, hashPrefix: string, from: number, to: number, freq: number) =>
    exec(`
      INSERT INTO article_keywords (article_id, keyword_id, frequency)
      SELECT a.id, k.id, ${freq}
      FROM articles a, keywords k
      WHERE k.term = '${term}' AND a.content_hash IN (${Array.from({ length: to - from + 1 }, (_, n) => `'${hashPrefix}${from + n}'`).join(',')})
    `);
  await link('wb-tactile', 'wb-fixture-cur-news-', 1, 8, 5);
  await link('wb-tactile', 'wb-fixture-prev-news-', 1, 6, 5);
  await link('wb-gripper', 'wb-fixture-cur-news-', 9, 14, 2);
  await link('wb-gripper', 'wb-fixture-prev-news-', 7, 12, 2);
  await link('wb-newterm', 'wb-fixture-cur-news-', 15, 17, 3);
  await link('wb-rare', 'wb-fixture-cur-news-', 18, 19, 1);

  // ── CI 값/이력 ──────────────────────────────────────────
  // 모든 기존 값의 updated_at 을 구간 밖으로 밀어 두고 대상 값만 구간 안으로 옮긴다
  await exec(`UPDATE ci_values SET updated_at = TIMESTAMP '2026-09-01 00:00:00'`);
  // 대상 값은 id 순서로 n 번째 행 (풀의 다른 커넥션에서도 같은 값을 가리키도록 임시 테이블을 쓰지 않는다)
  const ciId = (n: number) => `(SELECT id FROM ci_values ORDER BY id OFFSET ${n - 1} LIMIT 1)`;
  // n=1: 구간 내 두 번 변경 (A→B, B→C) / n=2: 한 번 변경 / n=3: 되돌려짐(S→X→S, 제외) / n=4: 이력 없이 updated_at 만 구간 내 / n=5: 지난주 이력
  await exec(`UPDATE ci_values SET updated_at = TIMESTAMP '2026-10-22 03:00:00', source_url = 'https://example.com/ci/1', confidence = 'A', value = 'C-final' WHERE id = ${ciId(1)}`);
  await exec(`UPDATE ci_values SET updated_at = TIMESTAMP '2026-10-23 03:00:00', source_url = NULL, confidence = 'B', value = 'Y2' WHERE id = ${ciId(2)}`);
  await exec(`UPDATE ci_values SET updated_at = TIMESTAMP '2026-10-23 04:00:00', confidence = 'C', value = 'S' WHERE id = ${ciId(3)}`);
  await exec(`UPDATE ci_values SET updated_at = TIMESTAMP '2026-10-24 05:00:00', source_url = 'https://example.com/ci/4', confidence = 'B', value = 'Only-updated' WHERE id = ${ciId(4)}`);
  await exec(`UPDATE ci_values SET updated_at = TIMESTAMP '2026-10-14 05:00:00', confidence = 'C' WHERE id = ${ciId(5)}`);
  await exec(`
    INSERT INTO ci_value_history (value_id, old_value, new_value, old_confidence, new_confidence, change_source, change_reason, changed_at) VALUES
      (${ciId(1)}, 'A-old', 'B-mid', 'B', 'A', 'manual', 'wb-fixture', TIMESTAMP '2026-10-20 01:00:00'),
      (${ciId(1)}, 'B-mid', 'C-final', 'A', 'A', 'manual', 'wb-fixture', TIMESTAMP '2026-10-22 03:00:00'),
      (${ciId(2)}, 'Y1', 'Y2', 'C', 'B', 'auto', 'wb-fixture', TIMESTAMP '2026-10-23 03:00:00'),
      (${ciId(3)}, 'S', 'X', 'C', 'C', 'auto', 'wb-fixture', TIMESTAMP '2026-10-23 03:00:00'),
      (${ciId(3)}, 'X', 'S', 'C', 'C', 'auto', 'wb-fixture', TIMESTAMP '2026-10-23 04:00:00'),
      (${ciId(5)}, 'P-old', 'P-new', 'C', 'C', 'auto', 'wb-fixture', TIMESTAMP '2026-10-14 05:00:00')
  `);

  // ── 알림 / 신규 로봇 ─────────────────────────────────────
  await exec(`
    INSERT INTO competitive_alerts (type, severity, title, created_at)
    SELECT 'funding', 'info', 'WB alert cur ' || i, TIMESTAMP '2026-10-20 00:00:00' + (i * INTERVAL '1 day') FROM generate_series(1, 3) AS i
    UNION ALL SELECT 'funding', 'info', 'WB alert prev ' || i, TIMESTAMP '2026-10-13 00:00:00' + (i * INTERVAL '1 day') FROM generate_series(1, 2) AS i
  `);
  await exec(`UPDATE humanoid_robots SET created_at = TIMESTAMP '2026-01-01 00:00:00'`);
  await exec(`
    INSERT INTO humanoid_robots (company_id, name, data_type, created_at)
    SELECT (SELECT id FROM companies ORDER BY name LIMIT 1), 'WB Robot cur ' || i, 'confirmed', TIMESTAMP '2026-10-21 00:00:00' + (i * INTERVAL '1 day') FROM generate_series(1, 2) AS i
    UNION ALL SELECT (SELECT id FROM companies ORDER BY name LIMIT 1), 'WB Robot forecast', 'forecast', TIMESTAMP '2026-10-22 00:00:00'
    UNION ALL SELECT (SELECT id FROM companies ORDER BY name LIMIT 1), 'WB Robot prev', 'confirmed', TIMESTAMP '2026-10-14 00:00:00'
  `);
}
