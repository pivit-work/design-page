/**
 * 한 문단으로 온 안내 글을 마침표 · « — » 에서 줄로 나눈다 (pivit-work PW-3126). 글자는 바꾸지 않는다(시안 «글은 그대로, 줄만 나눔»).
 */
/**
 * @param {string} text
 * @returns {string[]} 마침표(.) 뒤 · « — » 앞에서 나눈 문장들. 빈 글이면 []
 */
export function sentences(text) {
  const s = String(text ?? '').trim();
  if (!s) return [];
  return s
    .split(/(?<=\.)\s+|\s+(?=—\s)/)
    .map((part) => part.trim())
    // « — » 에서 나눈 뒷줄은 줄 첫머리의 줄표를 뗀다 — 줄을 나눈 것으로 이음표 몫을 한다(시안 «이음표에서 줄만 나눔»)
    .map((part, i) => (i > 0 ? part.replace(/^—\s+/, '') : part))
    .filter(Boolean);
}

