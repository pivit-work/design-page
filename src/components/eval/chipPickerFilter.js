/* PW-1875 — 회사가 정한 값 목록에 검색칸을 세우는 기준과 거르기. 칩 줄과 직급별 템플릿 행이 같이 쓴다. */
export const CHIP_PICKER_SEARCH_MIN = 12;

export function filterByQuery(values, query) {
  const q = query.trim().toLowerCase();
  return q ? values.filter((v) => v.toLowerCase().includes(q)) : values;
}
