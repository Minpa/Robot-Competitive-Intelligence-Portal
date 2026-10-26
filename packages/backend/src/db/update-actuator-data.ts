/**
 * 로봇·액추에이터·CI 데이터 멱등 업서트 CLI (얇은 래퍼)
 *
 * 실제 로직은 `apply-actuator-data-update.ts` 라이브러리에 있다 (기동 시 자동 적용과 공유).
 * 이 파일은 인자 파싱, 콘솔 로거 주입, 결과 출력, process.exit 만 담당한다.
 *
 * 입력: `src/db/seed-data/actuator-update/robots.json`, `suppliers.json`, `sourcing-regrade.json`, `demand-cases.json`
 *       (스키마는 actuator-update.util.ts 의 RobotsFile / SuppliersFile / SourcingFile / AdoptionsFile 참고.
 *        sourcing-regrade.json / demand-cases.json 이 없으면 해당 섹션만 경고와 함께 건너뛴다.
 *        `*.sample.json` 은 개발용 픽스처이며 자동으로 사용되지 않는다 — 실제 파일이 없으면 에러 종료.)
 *
 * 실행 (Railway 백엔드 콘솔 또는 로컬, packages/backend 에서):
 *   npx tsx src/db/update-actuator-data.ts                  # 전체 (suppliers → robots → ci → sourcing → adoptions)
 *   npx tsx src/db/update-actuator-data.ts --dry-run        # 쓰기 없이 변경 요약만
 *   npx tsx src/db/update-actuator-data.ts --only robots    # robots | suppliers | ci | sourcing | adoptions (쉼표로 복수 지정)
  npx tsx src/db/update-actuator-data.ts --only sourcing,adoptions   # 조달 태세·수요 사례만 (테이블은 없으면 자동 생성)
 *   npx tsx src/db/update-actuator-data.ts --data-dir /path/with/robots.json   # 입력 디렉터리 변경
 *   npx tsx src/db/update-actuator-data.ts --create-companies  # robots.json 의 미등록 회사를 신규 생성 허용
 *   DATABASE_URL 환경변수 필요 (db/index.ts 와 동일).
 *
 * 동작 요약은 apply-actuator-data-update.ts 상단 주석 참고. 모든 쓰기는 하나의 트랜잭션이며,
 * 종료 시 테이블별 insert/update/skip, 신규 생성된 회사/로봇 목록을 출력한다.
 */

import path from 'path';
import { type CliArgs, parseArgs, formatCounters, ALL_SECTIONS } from './actuator-update.util.js';
import { applyActuatorDataUpdate, resolveDefaultDataDir, type ApplyLogger } from './apply-actuator-data-update.js';

const DEFAULT_DATA_DIR = resolveDefaultDataDir();

const consoleLogger: ApplyLogger = {
  detail: (msg) => console.log(msg),
  info: (msg) => console.log(msg),
  warn: (msg) => console.log(`  [warn] ${msg}`),
};

function printHelp() {
  console.log(`사용법: npx tsx src/db/update-actuator-data.ts [--dry-run] [--only robots|suppliers|ci|sourcing|adoptions[,..]] [--data-dir DIR]
  --dry-run        DB 쓰기 없이 변경 요약만 출력
  --only           실행 섹션 선택 (기본: ${ALL_SECTIONS.join(',')}; 실행 순서는 항상 suppliers → robots → ci → sourcing → adoptions)
  --data-dir       robots.json / suppliers.json / sourcing-regrade.json / demand-cases.json 이 있는 디렉터리 (기본: ${DEFAULT_DATA_DIR})
  --create-companies  robots.json 의 회사가 DB 에 없으면 신규 생성 (기본: 경고 후 건너뜀)`);
}

async function main() {
  let args: CliArgs;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error((e as Error).message);
    printHelp();
    process.exit(2);
  }
  if (args.help) { printHelp(); process.exit(0); }

  const dataDir = args.dataDir ? path.resolve(args.dataDir) : DEFAULT_DATA_DIR;

  const { counters, warnings, createdCompanies, createdRobots } = await applyActuatorDataUpdate({
    dryRun: args.dryRun,
    dataDir,
    sections: args.only,
    createRobotCompanies: args.createRobotCompanies,
    logger: consoleLogger,
  });

  console.log(`\n=== 결과 ${args.dryRun ? '(dry-run — 실제 쓰기 0)' : ''} ===`);
  console.log(formatCounters(counters));
  console.log(`\n신규 생성 회사 ${createdCompanies.length}건${createdCompanies.length ? ':\n  - ' + createdCompanies.join('\n  - ') : ''}`);
  console.log(`신규 생성 로봇 ${createdRobots.length}건${createdRobots.length ? ':\n  - ' + createdRobots.join('\n  - ') : ''}`);
  if (warnings.length > 0) {
    console.log(`\n경고 ${warnings.length}건:`);
    for (const w of warnings) console.log(`  - ${w}`);
  } else {
    console.log('\n경고 없음');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n실패:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
