# Requirements Document

## Introduction

휴머노이드 로봇 인텔리전스 포털은 휴머노이드 로봇 산업의 시장 동향을 모니터링하고 분석하는 웹 애플리케이션입니다. 휴머노이드 로봇 제품 카탈로그, 회사·인력 규모 분석, 부품 동향, 그리고 경쟁 인텔리전스 대시보드를 제공합니다. 기존의 합법적인 데이터 수집 방식(arXiv, GitHub, SEC EDGAR, USPTO 공개 API)과 관리자/멤버 시스템을 유지하면서, 휴머노이드 로봇에 특화된 심층 분석 기능을 추가합니다.

## Glossary

- **Portal**: 휴머노이드 로봇 인텔리전스 포털 웹 애플리케이션
- **Humanoid_Robot**: 휴머노이드 로봇 제품 엔티티
- **Company**: 휴머노이드 로봇을 개발/제조하는 회사
- **Workforce_Data**: 회사의 인력 규모 및 직무 분포 데이터
- **Component**: 액추에이터, SoC, 센서 등 휴머노이드 로봇 부품
- **Catalog**: 휴머노이드 로봇 제품 목록 및 필터링 시스템
- **Body_Spec**: 로봇의 신체 관련 스펙 (신장, 중량, DoF 등)
- **Hand_Spec**: 로봇 손 관련 스펙 (타입, 손가락 수, Grip force 등)
- **Computing_Spec**: 컴퓨팅 관련 스펙 (SoC, TOPS, 아키텍처 등)
- **Sensor_Spec**: 센서 관련 스펙 (카메라, LiDAR, IMU 등)
- **Power_Spec**: 전원 관련 스펙 (배터리, 동작 시간 등)
- **Segment_Matrix**: 이동 방식 x 사용 환경 분석 매트릭스
- **Talent_Trend**: 연도별 인력 추이 및 채용 동향
- **Admin**: 데이터 입력/수정, 태그 관리 권한을 가진 사용자
- **Analyst**: 리포트 작성, 메모/인사이트 추가 권한을 가진 사용자
- **Viewer**: 검색·대시보드 조회만 가능한 사용자
- **Crawler**: 공개 API 및 RSS에서 메타데이터를 수집하는 서비스
- **Content_Hash**: 기사 콘텐츠 중복 확인을 위한 해시값
- **NLP_Engine**: 키워드 추출 및 AI 요약을 위한 자연어 처리 엔진
- **Allowed_Emails**: 로그인 허용된 이메일 목록
- **Article_Analyzer**: 기사 원문 분석 및 메타데이터 추출 도구
- **PPT_Generator**: 파워포인트 리포트 생성 서비스

## Requirements

### Requirement 1: 사용자 인증 및 역할 기반 접근 제어

**User Story:** 시스템 관리자로서, 역할 기반 접근 제어를 통해 민감한 경쟁 인텔리전스 데이터를 보호하고 싶습니다.

#### Acceptance Criteria

1. THE Portal SHALL implement role-based access control with three distinct roles: Admin, Analyst, and Viewer
2. WHEN a user attempts to log in, THE Portal SHALL verify the email against the Allowed_Emails list before granting access
3. WHEN an Admin user accesses the system, THE Portal SHALL allow data entry, modification, and tag management functions
4. WHEN an Analyst user accesses the system, THE Portal SHALL allow report creation and memo/insight addition, but restrict data modification
5. WHEN a Viewer user accesses the system, THE Portal SHALL allow only search and dashboard viewing functions
6. WHEN a user without appropriate role attempts restricted functions, THE Portal SHALL deny access and log the attempt
7. THE Portal SHALL support session management with secure token-based authentication

### Requirement 2: 합법적 데이터 수집 및 기사 입력

**User Story:** 데이터 분석가로서, 합법적인 방법으로 데이터를 수집하고 유의미한 기사 정보를 저장하고 싶습니다.

#### Acceptance Criteria

1. THE Portal SHALL support manual article entry where authorized users can paste article text they have personally reviewed
2. WHEN a user submits article text, THE NLP_Engine SHALL generate an AI summary extracting key data points relevant to humanoid robotics
3. WHEN article content is processed, THE Portal SHALL store both the original text and AI-generated summary in the database
4. WHEN storing article content, THE Portal SHALL generate a Content_Hash and check for duplicates before saving
5. WHEN a duplicate Content_Hash is detected, THE Portal SHALL notify the user and skip storage
6. THE Portal SHALL optionally collect metadata from public APIs (arXiv, GitHub, SEC EDGAR, USPTO) for reference linking only
7. WHEN collecting from public APIs, THE Crawler SHALL retrieve only publicly available metadata (titles, abstracts, filing summaries, patent numbers)
8. THE Portal SHALL NOT automatically scrape or copy full article content from external websites
9. THE Portal SHALL maintain an audit trail of who submitted each article and when

### Requirement 2-1: 기사 분석 도구

**User Story:** 데이터 분석가로서, 기사 원문을 붙여넣으면 AI가 자동으로 요약하고 관련 회사/제품을 태깅해주는 도구를 사용하고 싶습니다.

#### Acceptance Criteria

1. THE Article_Analyzer SHALL provide a text input area for pasting article content
2. WHEN article content is submitted, THE Article_Analyzer SHALL call AI API to generate a structured summary
3. WHEN generating summary, THE Article_Analyzer SHALL extract metadata including: mentioned companies, mentioned products, key technologies, and market insights
4. WHEN companies or products are mentioned in the article, THE Article_Analyzer SHALL automatically suggest matching entities from the database for tagging
5. WHEN the user confirms tags, THE Portal SHALL create associations between the article and tagged entities
6. THE Article_Analyzer SHALL display the original text, AI summary, and extracted metadata side by side
7. WHEN saving the article, THE Portal SHALL store all extracted metadata and entity associations

### Requirement 3: 휴머노이드 로봇 카탈로그

**User Story:** 제품 관리자로서, 다양한 기준으로 휴머노이드 로봇을 필터링하고 비교하여 시장 현황을 파악하고 싶습니다.

#### Acceptance Criteria

1. THE Catalog SHALL organize Humanoid_Robot products with filtering by purpose: Industrial, Home, and Service
2. THE Catalog SHALL support filtering by locomotion type: Bipedal, Wheeled, and Hybrid
3. THE Catalog SHALL support filtering by hand type: Gripper, Multi_Finger_Hand, and Interchangeable
4. THE Catalog SHALL support filtering by commercialization stage: Concept, Prototype, PoC, Pilot, and Commercial
5. THE Catalog SHALL support filtering by region: North_America, Europe, China, Japan, Korea, and Other
6. WHEN a user applies multiple filters, THE Catalog SHALL return results matching ALL applied filter criteria
7. THE Catalog SHALL display results as product cards with key specifications visible
8. THE Catalog SHALL support sorting by name, company, release year, and commercialization stage
9. THE Catalog SHALL display a performance radar chart for each robot showing key metrics

### Requirement 4: 휴머노이드 로봇 상세 페이지

**User Story:** R&D 엔지니어로서, 휴머노이드 로봇의 상세 스펙을 확인하여 벤치마킹에 활용하고 싶습니다.

#### Acceptance Criteria

1. WHEN displaying a Humanoid_Robot detail page, THE Portal SHALL show basic information: name, company, announcement year, and current status
2. WHEN displaying Body_Spec, THE Portal SHALL show: height (cm), weight (kg), payload (kg), DoF count, max speed (m/s), and continuous operation time (hours)
3. WHEN displaying Hand_Spec, THE Portal SHALL show: hand type, finger count, hand DoF, grip force (N), and interchangeability status
4. WHEN displaying Computing_Spec, THE Portal SHALL show: main SoC, TOPS range, and architecture type (onboard/edge/cloud)
5. WHEN displaying Sensor_Spec, THE Portal SHALL show: camera specs, depth sensor, LiDAR, IMU, force-torque sensors, and touch sensors
6. WHEN displaying Power_Spec, THE Portal SHALL show: battery type, capacity (Wh), operation time (hours), and charging method
7. THE Portal SHALL allow Admin users to edit all specification fields
8. THE Portal SHALL display related articles and news for each Humanoid_Robot
9. THE Portal SHALL display a performance radar chart comparing the robot against segment averages

### Requirement 5: 회사 및 인력 규모 분석

**User Story:** 시장 분석가로서, 휴머노이드 로봇 회사들의 인력 규모와 구성을 분석하여 경쟁력을 평가하고 싶습니다.

#### Acceptance Criteria

1. THE Portal SHALL store Company information: name, logo URL, country, city, founding year, main business, and linked humanoid products
2. THE Portal SHALL store Workforce_Data: total headcount range and estimated humanoid team size
3. THE Portal SHALL categorize workforce by job function: R&D, Software, Control_AI, Mechatronics, Operations, and Business
4. THE Portal SHALL track Talent_Trend: yearly headcount changes and job posting trends
5. WHEN displaying company profile page, THE Portal SHALL show a workforce size card with headcount range
6. WHEN displaying company profile page, THE Portal SHALL show an organization structure donut chart by job function
7. WHEN displaying company profile page, THE Portal SHALL show a Talent Trend line chart with yearly progression
8. THE Portal SHALL support manual and semi-automated workforce data entry to ensure legal compliance
9. WHEN workforce data is updated, THE Portal SHALL record the update timestamp and source
10. THE Portal SHALL update company and product data quarterly, and workforce data monthly to quarterly

### Requirement 6: 부품(Components) 동향

**User Story:** 기술 분석가로서, 휴머노이드 로봇에 사용되는 핵심 부품의 동향을 파악하고 싶습니다.

#### Acceptance Criteria

1. THE Portal SHALL track Actuator components with: type, torque (Nm), speed (rpm), weight (kg), integration level, and linked humanoid robots
2. THE Portal SHALL track SoC/Computing components with: vendor, TOPS rating, and onboard/edge location
3. THE Portal SHALL track Sensor components with: sensor type, placement location, and specifications
4. THE Portal SHALL track Power components with: battery type, capacity, and charging specifications
5. WHEN displaying component detail, THE Portal SHALL show which Humanoid_Robot products use the component
6. THE Portal SHALL support filtering components by type, vendor, and specification ranges
7. THE Portal SHALL allow Admin users to add and update component information
8. THE Portal SHALL display a torque density vs weight scatter plot for actuators
9. THE Portal SHALL display a TOPS trend chart over time for computing components
10. THE Portal SHALL display a sensor stack infographic showing common sensor configurations

### Requirement 7: 분석 대시보드

**User Story:** 경영진으로서, 휴머노이드 로봇 시장의 주요 지표를 시각적으로 확인하여 전략적 의사결정에 활용하고 싶습니다.

#### Acceptance Criteria

1. THE Dashboard SHALL display a Segment_Matrix showing locomotion type vs purpose distribution
2. THE Dashboard SHALL display a hand type distribution chart across all cataloged robots
3. THE Dashboard SHALL display workforce size vs segment chart
4. THE Dashboard SHALL display Top N humanoid players workforce comparison chart
5. THE Dashboard SHALL display job function distribution as radar or donut chart (Talent Dashboard)
6. THE Dashboard SHALL support both dark and light theme options
7. WHEN new data is added, THE Dashboard SHALL reflect updates within the next scheduled refresh cycle
8. THE Dashboard SHALL include a "This Week's Highlights" section showing new products, company updates, and trending topics

### Requirement 8: 로봇 적용 사례 및 시연 정보

**User Story:** 시장 분석가로서, 휴머노이드 로봇이 실제로 어떤 환경에서 어떤 동작을 수행하는지 파악하여 산업 적용 가능성을 평가하고 싶습니다.

#### Acceptance Criteria

1. THE Portal SHALL store Application_Case entities with fields: robot_id, environment_type, task_description, deployment_status, demo_event, demo_date
2. THE Portal SHALL categorize environment types: Factory, Warehouse, Retail, Healthcare, Hospitality, Home, Research_Lab, and Other
3. THE Portal SHALL categorize task types: Assembly, Picking, Packing, Inspection, Delivery, Cleaning, Assistance, and Other
4. WHEN displaying robot detail page, THE Portal SHALL show a table of application cases with environment, task, and deployment status
5. THE Portal SHALL track CES and other major event demonstrations with event name, date, and demonstrated capabilities
6. THE Dashboard SHALL display an environment vs task matrix showing which robots perform which tasks in which environments
7. THE Dashboard SHALL display a deployment status distribution chart (Concept, Pilot, Production)
8. THE Portal SHALL allow filtering robots by demonstrated environment and task types
9. THE Portal SHALL display a timeline visualization of major demonstrations and deployments

### Requirement 9: 키워드 추출 및 트렌드 분석

**User Story:** 시장 연구원으로서, 자동 키워드 추출과 트렌드 분석을 통해 새로운 주제와 시장 변화를 파악하고 싶습니다.

#### Acceptance Criteria

1. WHEN new article content is stored, THE NLP_Engine SHALL extract keywords and topics from the text
2. THE NLP_Engine SHALL support both Korean and English language processing
3. THE Portal SHALL calculate weekly keyword frequency counts and store them as statistics
4. THE Portal SHALL calculate monthly keyword frequency counts and store them as statistics
5. WHEN calculating keyword statistics, THE Portal SHALL compute the change rate (delta) compared to the previous period
6. THE Portal SHALL associate extracted keywords with related Company and Humanoid_Robot entities

### Requirement 9: 키워드 추출 및 트렌드 분석

**User Story:** 시장 연구원으로서, 자동 키워드 추출과 트렌드 분석을 통해 새로운 주제와 시장 변화를 파악하고 싶습니다.

#### Acceptance Criteria

1. WHEN new article content is stored, THE NLP_Engine SHALL extract keywords and topics from the text
2. THE NLP_Engine SHALL support both Korean and English language processing
3. THE Portal SHALL calculate weekly keyword frequency counts and store them as statistics
4. THE Portal SHALL calculate monthly keyword frequency counts and store them as statistics
5. WHEN calculating keyword statistics, THE Portal SHALL compute the change rate (delta) compared to the previous period
6. THE Portal SHALL associate extracted keywords with related Company and Humanoid_Robot entities

### Requirement 10: 파워포인트 리포트 생성

**User Story:** 전략팀 멤버로서, 선택한 데이터와 차트를 파워포인트 형식으로 다운로드하여 경영진 프레젠테이션 자료를 만들고 싶습니다.

#### Acceptance Criteria

1. THE PPT_Generator SHALL allow users to select specific robots, companies, or components for inclusion in the report
2. THE PPT_Generator SHALL allow users to select specific charts and visualizations for inclusion
3. WHEN generating a report, THE PPT_Generator SHALL create a downloadable PowerPoint file (.pptx)
4. THE PPT_Generator SHALL include a title slide with report name and generation date
5. THE PPT_Generator SHALL include data tables formatted for presentation
6. THE PPT_Generator SHALL include selected charts as images
7. THE PPT_Generator SHALL support both dark and light theme templates
8. THE Portal SHALL allow Analyst and Admin users to generate PowerPoint reports
9. THE PPT_Generator UI and structure SHALL be implemented first, with Claude API integration planned for future enhancement

### Requirement 10: 파워포인트 리포트 생성

**User Story:** 전략팀 멤버로서, 선택한 데이터와 차트를 파워포인트 형식으로 다운로드하여 경영진 프레젠테이션 자료를 만들고 싶습니다.

#### Acceptance Criteria

1. THE PPT_Generator SHALL allow users to select specific robots, companies, or components for inclusion in the report
2. THE PPT_Generator SHALL allow users to select specific charts and visualizations for inclusion
3. WHEN generating a report, THE PPT_Generator SHALL create a downloadable PowerPoint file (.pptx)
4. THE PPT_Generator SHALL include a title slide with report name and generation date
5. THE PPT_Generator SHALL include data tables formatted for presentation
6. THE PPT_Generator SHALL include selected charts as images
7. THE PPT_Generator SHALL support both dark and light theme templates
8. THE Portal SHALL allow Analyst and Admin users to generate PowerPoint reports
9. THE PPT_Generator UI and structure SHALL be implemented first, with Claude API integration planned for future enhancement

### Requirement 11: 데이터 내보내기

**User Story:** 분석가로서, 필터링된 데이터를 다양한 형식으로 내보내어 추가 분석에 활용하고 싶습니다.

#### Acceptance Criteria

1. WHEN a user requests export, THE Portal SHALL generate downloadable files in CSV and Excel formats
2. THE Portal SHALL support chart and table image capture for presentation use
3. THE Portal SHALL provide a print-friendly report view optimized for executive reports
4. WHEN exporting, THE Portal SHALL apply the current filter selections to the exported data
5. THE Portal SHALL support both dark and light theme options for exported images

### Requirement 11: 데이터 내보내기

**User Story:** 분석가로서, 필터링된 데이터를 다양한 형식으로 내보내어 추가 분석에 활용하고 싶습니다.

#### Acceptance Criteria

1. WHEN a user requests export, THE Portal SHALL generate downloadable files in CSV and Excel formats
2. THE Portal SHALL support chart and table image capture for presentation use
3. THE Portal SHALL provide a print-friendly report view optimized for executive reports
4. WHEN exporting, THE Portal SHALL apply the current filter selections to the exported data
5. THE Portal SHALL support both dark and light theme options for exported images

### Requirement 12: 검색 성능 및 신뢰성

**User Story:** 사용자로서, 빠른 검색 결과와 안정적인 시스템을 통해 효율적으로 작업하고 싶습니다.

#### Acceptance Criteria

1. WHEN a user performs a search query, THE Portal SHALL return results within 2 seconds for datasets containing thousands of items
2. WHEN the Crawler encounters API errors, THE Portal SHALL log the error and continue processing other sources
3. THE Portal SHALL implement exception handling for all data collection operations to prevent system-wide failures
4. THE Portal SHALL maintain data freshness with configurable automated collection cycles

### Requirement 12: 검색 성능 및 신뢰성

**User Story:** 사용자로서, 빠른 검색 결과와 안정적인 시스템을 통해 효율적으로 작업하고 싶습니다.

#### Acceptance Criteria

1. WHEN a user performs a search query, THE Portal SHALL return results within 2 seconds for datasets containing thousands of items
2. WHEN the Crawler encounters API errors, THE Portal SHALL log the error and continue processing other sources
3. THE Portal SHALL implement exception handling for all data collection operations to prevent system-wide failures
4. THE Portal SHALL maintain data freshness with configurable automated collection cycles

### Requirement 13: 데이터 모델 및 저장

**User Story:** 개발자로서, 잘 구조화된 데이터 모델을 통해 휴머노이드 인텔리전스 데이터베이스를 효율적으로 쿼리하고 유지보수하고 싶습니다.

#### Acceptance Criteria

1. THE Portal SHALL store Humanoid_Robot entities with fields: name, company_id, announcement_year, status, purpose, locomotion_type, hand_type, commercialization_stage, region
2. THE Portal SHALL store Body_Spec entities with fields: robot_id, height_cm, weight_kg, payload_kg, dof_count, max_speed_mps, operation_time_hours
3. THE Portal SHALL store Hand_Spec entities with fields: robot_id, hand_type, finger_count, hand_dof, grip_force_n, is_interchangeable
4. THE Portal SHALL store Computing_Spec entities with fields: robot_id, main_soc, tops_min, tops_max, architecture_type
5. THE Portal SHALL store Sensor_Spec entities with fields: robot_id, cameras (JSON), depth_sensor, lidar, imu, force_torque, touch_sensors
6. THE Portal SHALL store Power_Spec entities with fields: robot_id, battery_type, capacity_wh, operation_time_hours, charging_method
7. THE Portal SHALL store Company entities with fields: name, logo_url, country, city, founding_year, main_business, homepage_url, description
8. THE Portal SHALL store Workforce_Data entities with fields: company_id, total_headcount_min, total_headcount_max, humanoid_team_size, job_distribution (JSON), recorded_at, source
9. THE Portal SHALL store Component entities with fields: type, name, vendor, specifications (JSON), related_robots (JSON)
10. THE Portal SHALL store Article entities with fields: title, source, url, published_at, content, summary, language, content_hash, related_company_ids (JSON), related_robot_ids (JSON), extracted_metadata (JSON)
11. THE Portal SHALL store User entities with fields: email, role, last_login, created_at
12. THE Portal SHALL store TalentTrend entities with fields: company_id, year, total_headcount, humanoid_team_size, job_posting_count, recorded_at, source
13. THE Portal SHALL store Application_Case entities with fields: robot_id, environment_type, task_type, task_description, deployment_status, demo_event, demo_date, video_url, notes
