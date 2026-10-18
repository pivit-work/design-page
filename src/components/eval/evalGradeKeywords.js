/**
 * 등급별 기대 키워드 — 칸에는 쉼표로 이은 글로, 서버에는 문자열 배열로 (PW-1840 · hr.policy §5.4.5).
 *
 * 칸은 글 그대로 들고 있다가 저장할 때만 나눈다 — 칠 때마다 나누면 끝에 친 쉼표가 지워져 다음 키워드를
 * 칠 수 없다. 서버도 같은 정리(앞뒤 공백·빈 값·중복·20개·30자)를 한 번 더 한다(`normalizeGradeKeywords`).
 */
export const MAX_GRADE_KEYWORDS = 20;

/** 칸의 글 → 키워드 배열. 앞뒤 공백·빈 값·중복을 뺀다(개수는 자르지 않는다 — 넘김 안내가 센다). */
export function parseGradeKeywords(text) {
  const seen = new Set();
  const out = [];
  for (const raw of String(text ?? '').split(',')) {
    const kw = raw.trim();
    const key = kw.toLowerCase().replace(/\s+/g, '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(kw);
  }
  return out;
}

/** 서버 배열 → 칸의 글. */
export function formatGradeKeywords(list) {
  return Array.isArray(list) ? list.join(', ') : '';
}

/** 저장할 배열 — 앞 20개만. 하나도 없으면 null(«기준 없음»). */
export function gradeKeywordsForSave(text) {
  const list = parseGradeKeywords(text).slice(0, MAX_GRADE_KEYWORDS);
  return list.length ? list : null;
}
