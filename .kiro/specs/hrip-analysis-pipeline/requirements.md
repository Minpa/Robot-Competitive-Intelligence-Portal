# 요구사항 문서: HRIP 분석 파이프라인

## 소개

HRIP 분석 파이프라인은 휴머노이드 로봇 인텔리전스 포털(HRIP)의 핵심 분석 기능을 확장하는 기능 세트입니다. 두 가지 주요 영역으로 구성됩니다:

**A. 기사 입력·분석 파이프라인**: 기사 원문을 입력하면 AI가 자동으로 엔티티(회사/제품/부품/적용 사례/키워드)를 추출하고, 기존 DB와 fuzzy 매칭하여 링크하며, 검증 규칙을 적용하고, 집계 뷰와 인사이트 카드를 생성하는 종합 파이프라인입니다.

**B. 경영진 관점 질문 기반 뷰 10개**: 경영진이 자주 묻는 전략적 질문에 대한 답을 시각적으로 제공하는 대시보드 뷰 세트입니다. 히트맵, 타임라인, 트렌드 차트 등 다양한 시각화를 포함합니다.

## 용어집

- **Pipeline**: 기사 입력부터 인사이트 생성까지의 전체 분석 처리 흐름
- **ArticleAnalysisUI**: 기사 원문 입력 및 분석 결과를 표시하는 프론트엔드 화면
- **ArticleParser**: 기사 원문에서 엔티티(회사, 제품, 부품, 적용 사례, 키워드)와 요약을 추출하는 서비스
- **EntityLinker**: 파싱된 엔티티를 기존 DB 레코드와 fuzzy 매칭하여 후보를 제안하는 서비스
- **ArticleToDBWriter**: 기사 메타데이터와 엔티티 관계를 DB에 저장하는 서비스
- **NewEntitiesReviewDashboard**: 최근 생성된 엔티티의 품질을 검토하는 대시보드
- **ValidationRulesEngine**: 데이터 무결성을 검증하는 규칙 엔진
- **AggregationView**: 세그먼트별, 연도별, 부품별, 키워드별 집계 데이터 뷰
- **InsightCardsGenerator**: 집계 데이터와 LLM을 활용하여 대시보드 상단 요약 카드를 생성하는 서비스
- **MonthlyBriefGenerator**: 월간 집계 결과를 텍스트 브리프(Markdown)와 PPT 초안으로 변환하는 서비스
- **ExecutiveDashboard**: 경영진 관점의 전략적 질문에 답하는 10개 시각화 뷰
- **Heatmap**: 두 축(환경×작업×이동 방식)의 교차 밀도를 색상으로 표현하는 차트
- **FuzzyMatch**: 문자열 유사도 기반으로 기존 DB 엔티티와 근사 매칭하는 알고리즘
- **PipelineLog**: 파이프라인 각 단계의 실행 로그, 성능 지표, 에러 정보

## 요구사항

### 요구사항 1: 기사 분석 UI (ArticleAnalysisUI)

**사용자 스토리:** 데이터 분석가로서, 기사 원문을 붙여넣고 분석 옵션을 선택하면 구조화된 결과를 즉시 확인하고 싶습니다.

#### 수용 기준

1. THE ArticleAnalysisUI SHALL 좌측 패널에 기사 원문 텍스트 입력 영역과 분석 옵션(회사/제품/부품/적용 사례/키워드/요약) 체크박스를 제공한다
2. THE ArticleAnalysisUI SHALL 우측 패널에 구조화된 분석 결과(추출된 엔티티, 키워드, 인사이트)를 표시한다
3. WHEN 사용자가 분석 버튼을 클릭하면, THE ArticleAnalysisUI SHALL 선택된 옵션에 따라 ArticleParser를 호출하고 결과를 우측 패널에 렌더링한다
4. THE ArticleAnalysisUI SHALL 다크 테마(bg-slate-950)를 기본으로 적용한다
5. WHEN 분석이 진행 중일 때, THE ArticleAnalysisUI SHALL 로딩 상태를 표시하고 중복 요청을 방지한다

### 요구사항 2: 기사 파서 (ArticleParser)

**사용자 스토리:** 시스템 운영자로서, 다국어 기사 원문을 입력하면 공통 스키마로 구조화된 엔티티와 요약을 자동 추출하고 싶습니다.

#### 수용 기준

1. WHEN 기사 원문(raw_text)과 옵션(options)이 제공되면, THE ArticleParser SHALL companies[], products[], components[], applications[], keywords[], summary를 포함하는 구조화된 결과를 반환한다
2. WHEN lang 파라미터가 제공되지 않으면, THE ArticleParser SHALL 입력 텍스트의 언어를 자동 감지한다
3. THE ArticleParser SHALL 한국어와 영어 기사를 동일한 출력 스키마로 매핑한다
4. IF 입력 텍스트가 비어 있거나 최소 길이 미만이면, THEN THE ArticleParser SHALL 유효성 검증 오류를 반환한다
5. WHEN 파싱이 완료되면, THE ArticleParser SHALL 각 추출된 엔티티에 신뢰도 점수(0.0~1.0)를 부여한다

### 요구사항 3: 엔티티 링커 (EntityLinker)

**사용자 스토리:** 데이터 분석가로서, 기사에서 추출된 엔티티가 기존 DB의 어떤 레코드와 매칭되는지 후보 리스트를 확인하고 선택하고 싶습니다.

#### 수용 기준

1. WHEN 파싱된 엔티티 목록이 제공되면, THE EntityLinker SHALL 각 엔티티에 대해 기존 DB에서 fuzzy 매칭 후보를 최대 5개까지 반환한다
2. THE EntityLinker SHALL 각 후보에 유사도 점수(0.0~1.0)를 부여한다
3. WHEN 유사도 점수가 임계값(0.8) 이상인 후보가 있으면, THE EntityLinker SHALL 해당 후보를 자동 링크 추천으로 표시한다
4. WHEN 사용자가 후보를 선택하면, THE EntityLinker SHALL 해당 엔티티를 기존 DB 레코드에 링크한다
5. WHEN 매칭되는 후보가 없으면, THE EntityLinker SHALL 신규 엔티티 생성 옵션을 제공한다
6. THE EntityLinker SHALL 회사, 제품(로봇), 부품, 키워드 타입별로 독립적인 매칭을 수행한다

### 요구사항 4: 기사-DB 저장기 (ArticleToDBWriter)

**사용자 스토리:** 시스템 운영자로서, 분석된 기사의 메타데이터와 엔티티 관계를 정규화된 테이블에 저장하고 싶습니다.

#### 수용 기준

1. WHEN 기사를 저장할 때, THE ArticleToDBWriter SHALL 기사 자체는 제목, 날짜, URL, 요약만 저장한다
2. WHEN 엔티티 링크가 확정되면, THE ArticleToDBWriter SHALL 관계 테이블(article_companies, article_robots, article_components, article_applications)에 연결 레코드를 생성한다
3. WHEN 동일한 content_hash를 가진 기사가 이미 존재하면, THE ArticleToDBWriter SHALL 저장을 거부하고 중복 알림을 반환한다
4. THE ArticleToDBWriter SHALL 모든 저장 작업을 단일 트랜잭션으로 처리한다
5. WHEN 저장이 완료되면, THE ArticleToDBWriter SHALL 생성된 기사 ID와 연결된 엔티티 수를 반환한다

### 요구사항 5: 신규 엔티티 검토 대시보드 (NewEntitiesReviewDashboard)

**사용자 스토리:** 데이터 관리자로서, 최근 생성된 엔티티의 품질을 검토하고 누락된 필드나 중복 가능성을 확인하고 싶습니다.

#### 수용 기준

1. THE NewEntitiesReviewDashboard SHALL 최근 7일 및 30일 내 생성된 회사, 제품, 부품, 키워드, 적용 사례를 탭별로 표시한다
2. WHEN 엔티티에 필수 필드가 누락되어 있으면, THE NewEntitiesReviewDashboard SHALL 해당 엔티티를 "필수 필드 누락" 경고와 함께 표시한다
3. WHEN 기존 엔티티와 이름 유사도가 높은 엔티티가 있으면, THE NewEntitiesReviewDashboard SHALL "중복 가능성" 경고를 표시한다
4. WHEN 엔티티에 태그나 세그먼트가 지정되지 않았으면, THE NewEntitiesReviewDashboard SHALL "분류 미지정" 경고를 표시한다
5. THE NewEntitiesReviewDashboard SHALL 기간 필터(7일/30일/전체)를 제공한다

### 요구사항 6: 검증 규칙 엔진 (ValidationRulesEngine)

**사용자 스토리:** 데이터 관리자로서, 입력된 데이터가 도메인 규칙을 준수하는지 자동으로 검증하고 싶습니다.

#### 수용 기준

1. WHEN 연도 값이 입력되면, THE ValidationRulesEngine SHALL 1990~2035 범위 내인지 검증한다
2. WHEN SoC TOPS 값이 입력되면, THE ValidationRulesEngine SHALL 0.1~10000 범위 내인지 검증한다
3. WHEN 액추에이터 토크 값이 입력되면, THE ValidationRulesEngine SHALL 0.01~5000 Nm 범위 내인지 검증한다
4. WHEN 휴머노이드 로봇 엔티티에 이동 방식(locomotion_type)이 비어 있으면, THE ValidationRulesEngine SHALL 경고를 생성한다
5. WHEN 휴머노이드 로봇 엔티티에 손 타입(hand_type)이 비어 있으면, THE ValidationRulesEngine SHALL 경고를 생성한다
6. THE ValidationRulesEngine SHALL 검증 결과를 errors[]와 warnings[] 배열로 구분하여 반환한다
7. IF 검증 오류가 있으면, THEN THE ValidationRulesEngine SHALL 저장을 차단한다
8. IF 검증 경고만 있으면, THEN THE ValidationRulesEngine SHALL 사용자에게 경고를 표시하되 저장을 허용한다

### 요구사항 7: 집계 뷰 생성 (AggregationView)

**사용자 스토리:** 시장 분석가로서, 다양한 차원의 집계 데이터를 조회하여 시장 동향을 파악하고 싶습니다.

#### 수용 기준

1. THE AggregationView SHALL 세그먼트별(환경×작업×이동 방식) 로봇 수와 적용 사례 수를 집계한다
2. THE AggregationView SHALL 연도별 휴머노이드 출시, 적용 사례, 투자 이벤트 수를 집계한다
3. THE AggregationView SHALL 부품별 채택 로봇 수와 성능 지표 평균을 집계한다
4. THE AggregationView SHALL 키워드별 기사 등장 수와 전기 대비 증감률을 집계한다
5. WHEN 집계 데이터가 요청되면, THE AggregationView SHALL 캐시된 결과가 있으면 캐시를 반환하고, 없으면 실시간 계산 후 캐시한다

### 요구사항 8: 인사이트 카드 생성기 (InsightCardsGenerator)

**사용자 스토리:** 경영진으로서, 대시보드 상단에서 핵심 지표와 요약 문장을 한눈에 확인하고 싶습니다.

#### 수용 기준

1. WHEN 집계 데이터가 준비되면, THE InsightCardsGenerator SHALL 집계 뷰 데이터를 기반으로 요약 숫자와 문장을 생성한다
2. THE InsightCardsGenerator SHALL LLM API를 호출하여 자연어 인사이트 문장을 생성한다
3. THE InsightCardsGenerator SHALL 최소 4개의 인사이트 카드(총 로봇 수, 신규 기사 수, 주요 트렌드, 주목할 이벤트)를 생성한다
4. WHEN LLM API 호출이 실패하면, THE InsightCardsGenerator SHALL 집계 숫자만으로 구성된 폴백 카드를 생성한다
5. THE InsightCardsGenerator SHALL 생성된 카드를 JSON 형식으로 반환한다

### 요구사항 9: 월간 브리프 생성기 (MonthlyBriefGenerator)

**사용자 스토리:** 전략팀 멤버로서, 지난 1개월의 주요 동향을 Markdown 브리프와 PPT 초안으로 받아보고 싶습니다.

#### 수용 기준

1. WHEN 지난 1개월 집계 결과(JSON)가 입력되면, THE MonthlyBriefGenerator SHALL Markdown 형식의 텍스트 브리프를 생성한다
2. WHEN 브리프 생성이 요청되면, THE MonthlyBriefGenerator SHALL PPT 초안(.pptx)도 함께 생성한다
3. THE MonthlyBriefGenerator SHALL 브리프에 주요 수치, 트렌드 변화, 주목할 이벤트를 포함한다
4. THE MonthlyBriefGenerator SHALL LLM API를 활용하여 자연어 요약 섹션을 생성한다
5. WHEN LLM API 호출이 실패하면, THE MonthlyBriefGenerator SHALL 집계 데이터 기반의 템플릿 브리프를 생성한다

### 요구사항 10: 파이프라인 로깅 및 모니터링

**사용자 스토리:** 시스템 운영자로서, 각 파이프라인 단계의 실행 상태, 성능, 에러를 모니터링하고 싶습니다.

#### 수용 기준

1. WHEN 파이프라인의 각 단계(파싱, 링킹, 저장, 집계, 인사이트 생성)가 실행되면, THE Pipeline SHALL 시작 시간, 종료 시간, 소요 시간을 로그에 기록한다
2. IF 파이프라인 단계에서 에러가 발생하면, THEN THE Pipeline SHALL 에러 상세(메시지, 스택 트레이스, 입력 데이터 요약)를 로그에 기록한다
3. THE Pipeline SHALL 각 단계의 처리 건수(입력 수, 성공 수, 실패 수)를 기록한다
4. WHEN 파이프라인 실행이 완료되면, THE Pipeline SHALL 전체 실행 요약(총 소요 시간, 단계별 상태)을 반환한다

### 요구사항 11: 세그먼트 히트맵 뷰 (경영진 뷰 1)

**사용자 스토리:** 경영진으로서, "어떤 휴머노이드 세그먼트에 플레이어와 적용 사례가 가장 몰려 있는가?"에 대한 답을 시각적으로 확인하고 싶습니다.

#### 수용 기준

1. THE ExecutiveDashboard SHALL 환경×작업×이동 방식 3차원 매트릭스를 히트맵으로 표시한다
2. WHEN 히트맵 셀을 클릭하면, THE ExecutiveDashboard SHALL 해당 세그먼트의 로봇 목록과 적용 사례를 드릴다운으로 표시한다
3. THE ExecutiveDashboard SHALL 히트맵의 색상 강도로 플레이어 밀집도를 표현한다

### 요구사항 12: 상용화 전환 분석 뷰 (경영진 뷰 2)

**사용자 스토리:** 경영진으로서, "향후 2~3년 안에 실제 매출로 이어질 가능성이 높은 휴머노이드/적용 조합은?"에 대한 답을 확인하고 싶습니다.

#### 수용 기준

1. THE ExecutiveDashboard SHALL PoC→Pilot→Commercial 단계별 전환율을 차트로 표시한다
2. THE ExecutiveDashboard SHALL 적용 환경별 전환 속도(평균 소요 기간)를 표시한다
3. WHEN 특정 조합을 선택하면, THE ExecutiveDashboard SHALL 해당 조합의 상세 전환 이력을 표시한다

### 요구사항 13: 주요 플레이어 확장 추이 뷰 (경영진 뷰 3)

**사용자 스토리:** 경영진으로서, "주요 플레이어의 제품·인력·적용 사례는 어떻게 확대되고 있는가?"를 파악하고 싶습니다.

#### 수용 기준

1. THE ExecutiveDashboard SHALL 회사별 타임라인(제품 출시, 적용 사례, 주요 이벤트)을 표시한다
2. THE ExecutiveDashboard SHALL 회사별 인력 규모 추이 라인 차트를 표시한다
3. THE ExecutiveDashboard SHALL 회사별 제품 포트폴리오 맵(목적×상용화 단계)을 표시한다

### 요구사항 14: 가격·성능 트렌드 뷰 (경영진 뷰 4)

**사용자 스토리:** 경영진으로서, "휴머노이드 가격·성능은 시간에 따라 어떻게 변하고 있는가?"를 확인하고 싶습니다.

#### 수용 기준

1. THE ExecutiveDashboard SHALL 출시 연도별 가격 밴드(min~max) 차트를 표시한다
2. THE ExecutiveDashboard SHALL payload, DoF, 연속 동작 시간의 연도별 트렌드 라인을 표시한다
3. WHEN 특정 연도 구간을 선택하면, THE ExecutiveDashboard SHALL 해당 구간의 로봇 목록을 표시한다

### 요구사항 15: 핵심 부품 채택 트렌드 뷰 (경영진 뷰 5)

**사용자 스토리:** 기술 분석가로서, "핵심 부품(SoC, 액추에이터, 센서)의 채택 트렌드는?"을 파악하고 싶습니다.

#### 수용 기준

1. THE ExecutiveDashboard SHALL 부품별 채택 로봇 수 추이 차트를 표시한다
2. THE ExecutiveDashboard SHALL 부품 성능 지표(TOPS, 토크) 간 상관관계 산점도를 표시한다
3. WHEN 특정 부품을 선택하면, THE ExecutiveDashboard SHALL 해당 부품을 사용하는 로봇 목록을 표시한다

### 요구사항 16: 키워드 포지션 맵 뷰 (경영진 뷰 6)

**사용자 스토리:** 시장 연구원으로서, "주요 키워드·테마 중 뜨고 있는 건/식는 건?"을 시각적으로 파악하고 싶습니다.

#### 수용 기준

1. THE ExecutiveDashboard SHALL 키워드를 빈도(X축)×증감률(Y축) 포지션 맵으로 표시한다
2. THE ExecutiveDashboard SHALL Rising(증가) 키워드와 Declining(감소) 키워드를 색상으로 구분한다
3. THE ExecutiveDashboard SHALL Rising/Declining 키워드 Top 10 리스트를 표시한다

### 요구사항 17: 산업별 도입 현황 뷰 (경영진 뷰 7)

**사용자 스토리:** 경영진으로서, "산업별 도입 속도와 대표 적용 사례는?"을 확인하고 싶습니다.

#### 수용 기준

1. THE ExecutiveDashboard SHALL 산업(환경 타입)별 적용 건수와 단계 분포를 바 차트로 표시한다
2. THE ExecutiveDashboard SHALL 각 산업별 대표 적용 사례 카드(로봇명, 작업, 상태)를 표시한다
3. WHEN 특정 산업을 선택하면, THE ExecutiveDashboard SHALL 해당 산업의 전체 적용 사례 목록을 표시한다

### 요구사항 18: 글로벌 지역별 경쟁 구도 뷰 (경영진 뷰 8)

**사용자 스토리:** 경영진으로서, "글로벌 지역별 경쟁 구도와 적용 수준은?"을 파악하고 싶습니다.

#### 수용 기준

1. THE ExecutiveDashboard SHALL 지역별(North America, Europe, China, Japan, Korea, Other) 회사 수, 제품 수, 적용 사례 수를 표시한다
2. THE ExecutiveDashboard SHALL 각 지역의 대표 플레이어 목록을 표시한다
3. WHEN 특정 지역을 선택하면, THE ExecutiveDashboard SHALL 해당 지역의 상세 회사·제품 목록을 표시한다

### 요구사항 19: 핵심 기술 축 로드맵 뷰 (경영진 뷰 9)

**사용자 스토리:** 기술 전략가로서, "향후 3~5년 로드맵에서 주목할 '핵심 기술 축'은?"을 파악하고 싶습니다.

#### 수용 기준

1. THE ExecutiveDashboard SHALL 부품·기술 키워드별 기사 발표 수와 제품 발표 수를 버블 차트로 표시한다
2. THE ExecutiveDashboard SHALL 연도별 기술 키워드 등장 추이를 라인 차트로 표시한다
3. WHEN 특정 기술 키워드를 선택하면, THE ExecutiveDashboard SHALL 관련 기사와 제품 목록을 표시한다

### 요구사항 20: 월간/분기 Top 10 이벤트 뷰 (경영진 뷰 10)

**사용자 스토리:** 경영진으로서, "이번 달/분기 꼭 알아야 할 10개 이벤트는?"을 빠르게 확인하고 싶습니다.

#### 수용 기준

1. THE ExecutiveDashboard SHALL 중요도 스코어로 랭킹된 Top 10 이벤트 카드를 표시한다
2. THE ExecutiveDashboard SHALL 각 이벤트 카드에 제목, 날짜, 관련 회사/로봇, 중요도 점수를 포함한다
3. THE ExecutiveDashboard SHALL 기간 필터(이번 달/이번 분기/최근 6개월)를 제공한다
4. WHEN 이벤트 카드를 클릭하면, THE ExecutiveDashboard SHALL 해당 이벤트의 상세 정보(관련 기사, 적용 사례)를 표시한다
