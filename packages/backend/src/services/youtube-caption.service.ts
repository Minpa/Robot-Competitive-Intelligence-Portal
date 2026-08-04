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
 */

// 자막 조회 우선 순위 — 영어 우선, 없으면 목록에서 사용 가능한 첫 언어로 폴백
const PREFERRED_LANGS = ['en', 'en-US', 'en-GB'];

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
  /** 영상에 등록된 자막 트랙 언어 목록 조회 (실패 시 null) */
  private async listTrackLangs(videoId: string): Promise<string[] | null> {
    try {
      const res = await fetch(
        `https://video.google.com/timedtext?type=list&v=${encodeURIComponent(videoId)}`
      );
      if (!res.ok) return null;
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
      const res = await fetch(
        `https://video.google.com/timedtext?lang=${encodeURIComponent(lang)}&v=${encodeURIComponent(videoId)}&fmt=json3`
      );
      if (!res.ok) return null;
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
