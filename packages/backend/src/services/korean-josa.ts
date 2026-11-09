/**
 * 한국어 조사 선택 — 받침 유무에 따라 은/는, 이/가, 을/를, 과/와, 으로/로, 이고/고 를 고른다 (순수 함수).
 * 한글은 받침으로, 숫자는 읽는 소리(0 영·1 일·3 삼·6 육·7 칠·8 팔 = 받침 있음)로, 영문은 l·m·n·r 로 끝나면 받침 있음으로 본다.
 * 끝의 따옴표·괄호·% 는 건너뛰고 앞 글자를 본다(%는 "퍼센트"라 받침 없음으로 보고 그대로 둔다).
 */

/** 마지막 글자의 받침 종류: 'none' | 'rieul' | 'jong' */
function finalConsonant(word: string): 'none' | 'rieul' | 'jong' {
  const chars = Array.from(word.trim()).filter((c) => !/[\s"'’”)\]」』）.,!?]/u.test(c));
  const last = chars.pop() ?? '';
  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const j = (code - 0xac00) % 28;
    return j === 0 ? 'none' : j === 8 ? 'rieul' : 'jong';
  }
  if (/[0-9]/.test(last)) return last === '1' || last === '7' || last === '8' ? 'rieul' : '0136'.includes(last) ? 'jong' : 'none';
  if (/[A-Za-z]/.test(last)) return /[lLrR]/.test(last) ? 'rieul' : /[mMnN]/.test(last) ? 'jong' : 'none';
  return 'none';
}

/** josa('Atlas A1', '은/는') → '은'. pair 는 "받침 있을 때/없을 때" 순서 */
export function josa(word: string, pair: '은/는' | '이/가' | '을/를' | '과/와' | '으로/로' | '이고/고'): string {
  const [withBatchim, without] = pair.split('/') as [string, string];
  const f = finalConsonant(word);
  if (pair === '으로/로') return f === 'jong' ? withBatchim : without; // ㄹ 받침은 "로"
  return f === 'none' ? without : withBatchim;
}

/** 단어 + 조사 */
export function withJosa(word: string, pair: Parameters<typeof josa>[1]): string {
  return `${word}${josa(word, pair)}`;
}
