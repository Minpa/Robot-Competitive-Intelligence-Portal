/**
 * YoutubeCaptionService — 유튜브 자막(스크립트) 텍스트 조회
 *
 * 범위 제한 (중요): 자막 텍스트만 유튜브의 비공식(문서화되지 않은) timedtext
 * 엔드포인트(video.google.com/timedtext)로 조회한다. 이 방식은 공식 API가 아니라
 * 스크래핑에 가까운 방식이므로, 영상 파일 자체는 절대 다운로드/저장하지 않는다 —
 * 오직 자막(텍스트) 콘텐츠만 태깅/트렌드 요약 프롬프트 보강용으로 사용한다.
 *
 * 자막이 없거나(비공개, 자동생성 자막 미제공 등) 요청이 실패하는 영상이 흔하므로,
 * 이 서비스는 예외를 던지지 않고 항상 null을 반환해 호출부(video-tagging 파이프라인)가
 * 에러 없이 제목+설명만으로 폴백하도록 한다.
 *
 * 프로덕션(Railway)에서 유튜브가 HTTP 429("automated queries")로 요청을 차단하는
 * 사례가 있어, 실제 브라우저에 가까운 User-Agent/Accept-Language 헤더를 붙이고,
 * 429는 짧게 1회 재시도한다(그래도 완전한 해결책은 아닐 수 있음 — 호출부의
 * circuit breaker가 연속 차단 상황에서 배치를 중단시킨다).
 */

// 실제 크롬 브라우저 수준의 User-Agent — 봇 차단(429) 회피 목적
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const REQUEST_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  'Accept-Language': 'en-US,en;q=0.9',
};

// 자막 조회 우선 순위 — 영어 우선, 없으면 목록에서 사용 가능한 첫 언어로 폴백
const PREFERRED_LANGS = ['en', 'en-US', 'en-GB'];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TimedTextJson3Event {
  segs?: { utf8?: string }[];
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

class YoutubeCaptionService {
  // 직전 fetchCaption() 호출 도중 429(레이트리밋)를 만났는지 여부.
  // fetchCaption()의 반환 타입(string|null)은 그대로 유지하면서, 호출부(video-tagging)의
  // circuit breaker가 "자막 없음"과 "차단됨"을 구분할 수 있도록 별도로 노출한다.
  private rateLimited = false;

  /** 직전 fetchCaption() 호출에서 429를 만났는지 여부 (circuit breaker 판단용) */
  wasRateLimited(): boolean {
    return this.rateLimited;
  }

  /**
   * timedtext 요청 실행. 429는 최대 1회 재시도(1초 백오프), 그래도 실패하면 null.
   * 429가 아닌 실패는 상태 코드를 로그로 남기고 즉시 null.
   */
  private async fetchWithRetry(url: string, logTarget: string): Promise<Response | null> {
    for (let attempt = 0; attempt <= 1; attempt++) {
      const res = await fetch(url, { headers: REQUEST_HEADERS });
      if (res.ok) return res;

      if (res.status === 429) {
        console.log(`[YoutubeCaption] Rate limited (429) for ${logTarget}`);
        this.rateLimited = true;
        if (attempt === 0) {
          await sleep(1000);
          continue;
        }
        return null;
      }

      console.log(`[YoutubeCaption] Request failed (status ${res.status}) for ${logTarget}`);
      return null;
    }
    return null;
  }

  /** 영상에 등록된 자막 트랙 언어 목록 조회 (실패 시 null) */
  private async listTrackLangs(videoId: string): Promise<string[] | null> {
    try {
      const res = await this.fetchWithRetry(
        `https://video.google.com/timedtext?type=list&v=${encodeURIComponent(videoId)}`,
        `videoId=${videoId} type=list`
      );
      if (!res) return null;
      const xml = await res.text();
      const langs = [...xml.matchAll(/lang_code="([^"]+)"/g)].map((m) => m[1]!);
      return langs.length > 0 ? langs : null;
    } catch {
      return null;
    }
  }

  /** 특정 언어 트랙의 자막 본문 텍스트 조회 (json3 포맷, 실패 시 null) */
  private async fetchTrackText(videoId: string, lang: string): Promise<string | null> {
    try {
      const res = await this.fetchWithRetry(
        `https://video.google.com/timedtext?lang=${encodeURIComponent(lang)}&v=${encodeURIComponent(videoId)}&fmt=json3`,
        `videoId=${videoId} lang=${lang}`
      );
      if (!res) return null;
      const body = await res.text();
      if (!body || body.trim().length === 0) return null;
      const data = JSON.parse(body) as { events?: TimedTextJson3Event[] };
      const text = (data.events ?? [])
        .flatMap((e) => e.segs ?? [])
        .map((s) => s.utf8 ?? '')
        .join('')
        .replace(/\n+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return text.length > 0 ? decodeEntities(text) : null;
    } catch {
      // 네트워크 실패/파싱 실패 — 예외를 전파하지 않고 null 처리 (폴백은 호출부 책임)
      return null;
    }
  }

  /**
   * videoId의 자막 텍스트를 조회한다. 영어 트랙 우선, 없으면 등록된 다른 언어로 폴백.
   * 자막이 전혀 없거나 요청이 실패하면 null을 반환한다(예외 없음).
   */
  async fetchCaption(videoId: string): Promise<string | null> {
    this.rateLimited = false;

    for (const lang of PREFERRED_LANGS) {
      const text = await this.fetchTrackText(videoId, lang);
      if (text) {
        console.log(`[YoutubeCaption] Fetched "${lang}" caption for ${videoId} (${text.length} chars)`);
        return text;
      }
    }

    const langs = await this.listTrackLangs(videoId);
    const fallbackLang = langs?.find((l) => !PREFERRED_LANGS.includes(l));
    if (fallbackLang) {
      const text = await this.fetchTrackText(videoId, fallbackLang);
      if (text) {
        console.log(`[YoutubeCaption] Fetched "${fallbackLang}" caption (fallback) for ${videoId} (${text.length} chars)`);
        return text;
      }
    }

    console.log(`[YoutubeCaption] No caption available for ${videoId}`);
    return null;
  }
}

export const youtubeCaptionService = new YoutubeCaptionService();
