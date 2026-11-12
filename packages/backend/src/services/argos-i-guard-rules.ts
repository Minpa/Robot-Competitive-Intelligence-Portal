/**
 * ARGOS_I 사내 정보 차단 가드 — 규칙 상수 (순수, 의존성 없음).
 *
 * 인바운드 가드(argos-i-inbound-guard.ts)와 문서(docs/argos-i-client-guide.md)가 공유한다.
 * ARGOS_I 쪽 참고 구현(scripts/lib/argos-i-outbound-guard.mjs)은 이 목록의 JS 사본을 가진다.
 * 두 목록이 어긋나지 않는지는 패리티 테스트(argos-i-guard-parity)가 확인한다.
 *
 * ⚠ 이 파일에는 실제 사내 코드명·사번·내부 호스트 목록을 넣지 않는다. 형태(shape) 규칙과 공개된 도메인만 둔다.
 */

export const GUARD_RULES_VERSION = 1;

/** 거부 사유 코드 (18개). 반환 순서는 이 배열의 순서로 고정한다. */
export const GUARD_REASON_CODES = [
  'unknown_key',
  'invalid_type_or_shape',
  'url_scheme',
  'url_host_not_allowed',
  'private_host',
  'internal_domain',
  'email_detected',
  'employee_id',
  'internal_host_name',
  'unc_or_file_path',
  'classification_label',
  'internal_pattern',
  'internal_term_hash',
  'blob_detected',
  'number_unit_in_note',
  'note_format',
  'source_not_public',
  'control_chars',
] as const;

export type GuardReasonCode = (typeof GUARD_REASON_CODES)[number];

/** 사유 코드 → 한 줄 설명 (문서·관리자 화면 공용) */
export const GUARD_REASON_DESCRIPTIONS: Record<GuardReasonCode, string> = {
  unknown_key: '스키마에 없는 키가 있다 (키 이름은 응답·로그에 남기지 않는다)',
  invalid_type_or_shape: '타입·범위·길이·형식 위반, 깊이>4, 키>30, 본문>8KB',
  url_scheme: 'https 가 아닌 스킴(http/file/ftp/data/javascript), 사용자 정보, 비표준 포트',
  url_host_not_allowed: '허용 호스트 목록에 없는 URL 호스트',
  private_host: '사설·루프백 IP, IP 리터럴, localhost, 단일 라벨 호스트, .local/.internal/.corp/.lan/.intra',
  internal_domain: '설정된 내부 도메인이 URL·이메일·본문에 등장',
  email_detected: '이메일 형태(난독화 복원 포함)',
  employee_id: '사번·직원 ID 형태 (note 한정 기본 패턴 + 운영자 패턴)',
  internal_host_name: '서버·호스트명 형태 (예: *-srv01, *.corp.*)',
  unc_or_file_path: 'UNC·드라이브·홈 디렉터리 경로, file://',
  classification_label: '보안 등급 표기 (대외비, Confidential, Internal Only 등)',
  internal_pattern: '운영자가 등록한 사내 정규식 또는 프로젝트 코드명 형태',
  internal_term_hash: '토큰·2-gram 의 sha256 이 사내 용어 해시 목록에 있다',
  blob_detected: 'base64·hex 긴 문자열, data: URI',
  number_unit_in_note: 'note 에 숫자+단위 조합 또는 4자리 이상 숫자',
  note_format: 'note 가 한 줄 평문이 아니다 (개행, URL, 코드·마크다운 링크·HTML, 200자 초과)',
  source_not_public: 'sourcePublic 이 정확히 true 가 아니다',
  control_chars: '비가시·제어·방향 제어 문자',
};

/** 이 코드만으로 거부되면 `invalid_request`, 하나라도 다른 코드가 있으면 `internal_data_rejected` */
export const STRUCTURAL_REASON_CODES: readonly GuardReasonCode[] = ['invalid_type_or_shape', 'source_not_public'];

/** 기본 내부 도메인 (회사 공개 도메인). 운영자가 ARGOS_I_INTERNAL_DOMAINS 로 추가한다 */
export const DEFAULT_INTERNAL_DOMAINS: readonly string[] = ['lge.com', 'lgecorp.com'];

/** 호스트가 이 접미사로 끝나면 내부망으로 본다 */
export const PRIVATE_HOST_SUFFIXES: readonly string[] = ['local', 'internal', 'corp', 'lan', 'intra'];

/** 서버가 항상 허용하는 공개 호스트 (서브도메인 포함 허용) */
export const STATIC_ALLOWED_HOSTS: readonly string[] = ['youtube.com', 'youtu.be', 'arxiv.org'];

/** 분류 라벨 — 강한 표현: 단독으로 나와도 거부 (인제스트 프로파일에서도 단독 거부) */
export const CLASSIFICATION_STRONG: readonly string[] = [
  '대외비',
  '극비',
  '社外秘',
  '机密',
  'internal only',
  'internal use only',
  'do not distribute',
];

/** 분류 라벨 — 일반 단어와 겹치는 표현: request 프로파일은 단독도 거부, ingest 프로파일은 헤더·괄호 형태만 거부 */
export const CLASSIFICATION_WEAK: readonly string[] = [
  '사내',
  '내부용',
  '내부 한정',
  '비공개',
  '기밀',
  '内部',
  'confidential',
  'internal use',
  'proprietary',
  'restricted',
  'nda',
];

/** 숫자 뒤에 (공백 허용) 오면 스펙·가격 수치로 보는 다글자 단위 (소문자, 정규식 대안식) */
export const NUMBER_UNIT_MULTI =
  'n\\s?[·.\\-]?\\s?m|nm|kgf|kg|mg|mm|cm|km|kwh|kw|mw|mv|ma|rpm|khz|mhz|ghz|hz|dof|db|°|%|usd|krw|eur|cny|jpy|달러|만원|원|억|wh|ah|mah|tops|fps|gb|mb|tb|ms|ns|kn';

/** 숫자에 붙어서만(공백 없이) 단위로 보는 한 글자 단위 (소문자). "5 a day" 같은 일반 문장을 막지 않으려는 구분이다 */
export const NUMBER_UNIT_SINGLE = 'g|m|w|v|a|n';

/** 사번 형태 기본 패턴 (소문자 정규화 후, note 한정). 형식은 ARGOS_I 팀 확인 후 조정한다 */
export const EMPLOYEE_ID_PATTERN = '(?<![a-z0-9])[a-z]{1,2}\\d{6,8}(?![a-z0-9])';

/** 프로젝트 코드명 형태 기본 패턴 (소문자 정규화 후) */
export const DEFAULT_INTERNAL_PATTERNS: readonly string[] = ['(?<![a-z0-9])prj[-_]\\d{3,6}(?![a-z0-9])'];

/** 호스트명·서버명 형태 (소문자) — 강한 패턴 */
export const HOST_NAME_PATTERNS: readonly string[] = [
  '(?<![a-z0-9])[a-z0-9]+-(?:srv|svr|fs|nas|db|ldap|vpn|dc|ad)\\d{1,3}(?![a-z0-9])',
  '(?<![a-z0-9.-])[a-z0-9][a-z0-9-]*\\.(?:corp|intra|internal|lan)(?:\\.[a-z0-9-]+)*(?![a-z0-9-])',
  '(?<![a-z0-9.-])[a-z0-9][a-z0-9-]+\\.local(?![a-z0-9-])',
];

/** 호스트명 + 포트 (FQDN 아닌 토큰) — request 프로파일 note 한정 */
export const HOST_PORT_PATTERN = '(?<![a-z0-9.-])(?:[a-z]+-[a-z0-9-]+|[a-z]+\\d+):\\d{2,5}(?![a-z0-9])';

export const BLOB_BASE64_MIN = 40;
export const BLOB_HEX_MIN = 32;
export const NOTE_MAX_CHARS = 200;
export const BODY_MAX_BYTES = 8192;
export const BODY_MAX_DEPTH = 4;
export const BODY_MAX_KEYS = 30;

/** article_url 정규화 때 제거하는 추적 파라미터 */
export const TRACKING_PARAM_PREFIXES: readonly string[] = ['utm_', 'mc_', 'pk_'];
export const TRACKING_PARAMS: readonly string[] = ['fbclid', 'gclid', 'dclid', 'msclkid', 'igshid', 'yclid', 'ref', 'ref_src', 'spm', 'cmpid'];

/** 사내 용어 해시(sha256 hex) 한 줄 */
export const TERM_HASH_RE = /^[0-9a-f]{64}$/;
