/**
 * 상태 띠 설명 글을 문장마다 한 줄로 나눈다 (pivit-work PW-3132) — 띠는 한 문단에 문장을 잇지 않는다(공용 틀 NoticeLines).
 * 마침표 · 물음표 · 느낌표 뒤 빈칸에서만 나누고, 그 빈칸은 앞 줄 끝에 남긴다 — 줄을 이어 읽으면 원래 글과 한 글자도 같다.
 * 글이 아닌 것(이미 그려 둔 조각)은 나누지 않고 한 줄로 둔다.
 * @param {import('react').ReactNode} text
 * @returns {import('react').ReactNode[]}
 */
export function noticeSentences(text) {
  if (typeof text !== 'string') return [text];
  return text.split(/(?<=[.!?]\s)(?=\S)/);
}
