# 연금 플래너 (iOS, 로컬 전용)

주택연금·국민연금·퇴직연금·개인연금을 입력하면, 은퇴 후 나이별 월수입(오늘 돈 가치, 세전)을
목표 월수입(기본 500만원)과 비교해 부족 구간과 부족액을 보여주는 아이폰 앱입니다.
개인연금 월 납입액을 얼마나 더 늘려야 부족분을 메우는지, 은퇴를 1~5년 늦추면 어떻게 되는지도 보여줍니다.

- SwiftUI, iOS 17+, 서버/네트워크/외부 SDK 없음. 입력값은 기기 안(UserDefaults)에만 저장됩니다.
- 계산 로직은 Swift Package `PensionCore`(Foundation만 사용)에, 화면은 `App/`에 있습니다.
- 명세: `docs/SPEC.md`

## 중요 안내

- **앱을 처음 열었을 때 들어 있는 숫자는 모두 시연용 예시값입니다.** 본인의 실제 값으로 바꿔서 사용하세요.
- 세전, 오늘 돈 가치 기준의 추정치이며 실제와 다를 수 있습니다. 세금은 계산하지 않습니다.
- 퇴직·개인연금은 받는 동안 물가만큼 늘어난다고 가정하고, 국민연금은 입력한 오늘 돈 값 그대로, 주택연금은 매달 같은 명목 금액(정액형)이라 오늘 돈 가치로는 해마다 줄어든다고 가정합니다.
- 주택연금 가격표는 앱에 들어 있지 않습니다(기본 빈칸, 출처 "확인할 수 없음", 신뢰도 F). 정확한 값은 한국주택금융공사 예상연금 조회를 권장합니다.

## Mac으로 받는 방법

```
git clone <저장소 주소>
cd Robot-Competitive-Intelligence-Portal
git checkout claude/youthful-mendel-4axr4t
```

그다음 `pension-planner-ios` 폴더를 `~/Desktop/Work/` 로 복사합니다.

```
mkdir -p ~/Desktop/Work
cp -R pension-planner-ios ~/Desktop/Work/
```

## 빌드 방법 (Xcode)

1. Mac, Xcode 15 이상, iOS 17 이상 환경이 필요합니다.
2. Xcode에서 새 프로젝트 만들기: iOS > App, Interface는 SwiftUI, 이름은 `PensionPlanner`.
   저장 위치는 `pension-planner-ios/` 폴더 안으로 합니다.
3. 템플릿이 만든 `ContentView.swift` 와 `PensionPlannerApp.swift` 를 삭제(Move to Trash)하고,
   `App/` 폴더의 파일들을 프로젝트에 추가합니다. 추가할 때 "Copy items if needed"는 해제하고
   "Create groups"를 선택합니다.
4. File > Add Package Dependencies > Add Local... 에서 `pension-planner-ios/` 폴더를 선택하고,
   앱 타깃에 `PensionCore` 를 연결합니다.
5. 앱 타깃의 Minimum Deployments(배포 타깃)를 iOS 17.0으로 맞춥니다.
6. 계산 테스트: 터미널에서 `pension-planner-ios/` 로 이동해 `swift test`, 또는 Xcode에서 Cmd+U.
7. 실행: Cmd+R. 실제 아이폰에서 돌리려면 Signing & Capabilities > Team 에서 Personal Team을 선택합니다.
8. 이 코드는 Swift를 쓸 수 없는 클라우드 환경에서 작성되어 **컴파일 검증을 못 했습니다.**
   첫 빌드에서 오류가 나면 오류 메시지를 그대로 복사해 전달해 주세요.

## 기대값 검산 (선택)

`python3 Tools/expected_values.py` 는 같은 산식을 Python으로 따로 구현해 명세의 기대값을 재현하고,
손계산 값과 일치하는지 assert로 확인합니다. Swift 테스트의 기대값은 이 출력에서 가져왔습니다.

## 폴더 구조

```
Package.swift            PensionCore 라이브러리 + 테스트
Sources/PensionCore/     Models/, Calc/ (계산 로직, Foundation만 사용)
Tests/PensionCoreTests/  XCTest
App/                     SwiftUI 앱 (PensionPlannerApp, Storage, Views)
Tools/expected_values.py Python 검산 스크립트
docs/SPEC.md             확정 명세
```
