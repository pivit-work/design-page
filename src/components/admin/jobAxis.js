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

/**
 * (상위, 하위) 한 쌍이 연결표에 있는지 본다 — §3.8.3-A 의 저장 차단 판정.
 *
 * 좁혀 주는 드롭다운(`narrowByParent`)은 «새로 어긋나게 만들기»만 막는다. 상위를
 * 나중에 바꿨거나, CSV 로 들어왔거나, 조직 설정에서 연결이 끊긴 값은 그대로 남아
 * 저장에서만 400 으로 거부됐다(INV-3 · INV-8). 그 값을 화면이 먼저 알리기 위한 판정이다.
 *
 * - **하위가 비어 있으면 통과.** 직렬·직무는 선택 입력이라, 아직 안 정한 사람을
 *   「잘못됐다」고 말하면 안 된다.
 * - **연결표를 못 받았으면(빈 매핑) 판정하지 않는다.** 조회 실패·구버전에서 전원을
 *   무효로 몰아 저장을 통째로 막는 것이 원래 문제보다 나쁘다. 그때는 서버가 판정한다.
 * - 상위가 비어 있는데 하위만 있으면 **무효다.** 그 하위는 어느 상위에도 매달려 있지
 *   않아 서버가 받지 않는다.
 */
export function isValidPair(map, parentValue, childValue) {
  if (!childValue) return true;
  if (!map || Object.keys(map).length === 0) return true;
  if (!parentValue) return false;
  const children = map[parentValue];
  return Array.isArray(children) && children.includes(childValue);
}

/**
 * 두 쌍((직군, 직렬) · (직렬, 직무)) 중 하나라도 어긋난 행의 id 집합.
 *
 * 요약의 N 이 이 집합의 크기이고, 「이 행만 보기」가 좁히는 대상도 이 집합이다 —
 * 세는 곳과 좁히는 곳이 갈리면 「N건」이라 해 놓고 다른 수가 보인다.
 */
export function invalidPairRowIds(rows, jobAxis) {
  const ids = new Set();
  if (!Array.isArray(rows) || !jobAxis) return ids;
  for (const r of rows) {
    if (!r) continue;
    const badLadder = !isValidPair(jobAxis.laddersByFamily, r.jobFamily, r.jobTitle);
    const badDuty = !isValidPair(jobAxis.dutiesByLadder, r.jobTitle, r.jobDuty);
    if (badLadder || badDuty) ids.add(r.id);
  }
  return ids;
}
