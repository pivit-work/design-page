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
    .filter(Boolean);
}

