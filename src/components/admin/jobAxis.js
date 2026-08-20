/**
 * 직군 > 직렬 > 직무 3단 축 유틸 (§1-3-d · §1-3-j).
 *
 * 스프레드시트 뷰(셀 드롭다운)와 목록 뷰(필터 칩)가 **같은 좁히기 규칙**을 써야 한다.
 * 두 벌로 갈리면 한쪽에서 고를 수 있는 값이 다른 쪽에서는 안 보이고, 저장에서만
 * 거부된다.
 */

/**
 * 상위 값으로 하위 선택지를 좁힌다.
 *
 * - 상위가 비어 있으면 좁히지 않는다 — 아직 안 정한 사람에게 빈 목록을 주면
 *   위에서부터 고르라는 안내 없이 막힌 것처럼 보인다.
 * - 매핑 자체가 없으면(조회 실패·구버전) 역시 좁히지 않는다.
 * - 매핑이 있는데 하위가 0건이면 **빈 목록 그대로** 둔다. 그 직렬에 직무가 아직
 *   없다는 사실을 전체 목록으로 덮으면, 고른 값이 저장에서 거부된다.
 */
export function narrowByParent(all, map, parentValue) {
  if (!parentValue) return all;
  if (!map || Object.keys(map).length === 0) return all;
  const children = map[parentValue];
  if (!children) return [];
  // 카탈로그(활성 값)와 교집합 — 비활성된 값이 매핑에만 남아 새로 선택되면 안 된다(D5).
  const active = new Set(all);
  return children.filter((c) => active.has(c));
}
