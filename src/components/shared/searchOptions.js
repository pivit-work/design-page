/**
 * 펼침 목록 선택지를 검색어로 거른다 (PW-1879). `SearchSelect` 와 직원 관리 위쪽 필터가 함께 쓴다.
 *
 * - 이름(`label`)이나 경로(`pathLabel` — 동명 조직을 가르는 「본부 › 팀」)에 검색어가 들어 있으면 남긴다.
 *   대소문자는 가리지 않는다.
 * - 묶음 머리(`group: true` — 고를 수 없는 줄)는 그 아래 남은 선택지가 하나라도 있을 때만 남긴다.
 *   머리만 덩그러니 남으면 「결과 없음」인데도 목록이 있는 것처럼 보인다.
 * - `keep` 이 참인 선택지(「전체」처럼 검색과 상관없이 늘 있어야 하는 줄)는 거르지 않는다.
 * - 검색어가 비면 그대로 돌려준다.
 */
export function filterSearchOptions(options, query) {
  const needle = String(query ?? '').trim().toLowerCase();
  if (!needle) return options;
  const hit = (o) =>
    [o.label, o.pathLabel].some((v) => v != null && String(v).toLowerCase().includes(needle));
  const out = [];
  let header = null;
  for (const o of options) {
    if (o.group) {
      header = o;
      continue;
    }
    if (o.keep || hit(o)) {
      if (header && !o.keep) {
        out.push(header);
        header = null;
      }
      out.push(o);
    }
  }
  return out;
}

/** 검색어를 쳤을 때 남은 선택지 중 고를 수 있는 것(묶음 머리·keep 제외)이 없는가. */
export function hasNoSearchResult(shown, query) {
  if (!String(query ?? '').trim()) return false;
  return !shown.some((o) => !o.group && !o.keep);
}
