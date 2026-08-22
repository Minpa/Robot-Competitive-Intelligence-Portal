/** WRC 2026 특집 페이지 공용 유틸 — 날짜 표기, 유튜브 videoId 추출, 썸네일 로드 실패 폴백 */

export function formatDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function getVideoId(url: string): string | null {
  const m = url.match(/[?&]v=([\w-]{11})/);
  return m ? m[1] : null;
}

/** hqdefault 썸네일이 없으면 mqdefault로 폴백, 그마저도 실패하면 이미지를 숨긴다 */
export function thumbFallback(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.src.includes('hqdefault')) {
    img.src = img.src.replace('hqdefault', 'mqdefault');
  } else {
    img.style.display = 'none';
  }
}
