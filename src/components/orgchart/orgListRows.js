/**
 * 리스트 탭이 조직 트리를 **한 줄에 한 사람** 표로 펴는 셈법 (Figma 16610:35863).
 *
 * 트리(`orgData`)는 조직도 탭과 같은 것을 그대로 받는다 — 리스트 탭을 위해 호스트가 따로
 * 명단을 만들지 않는다. 한 사람의 「부서」는 그 사람이 들어 있는 조직 카드의 이름이고,
 * 회사 카드 직속(`directReports`)은 회사 이름이 부서다.
 */

/** 트리의 조직 단위 목록 — 깊이 우선, 트리에 적힌 순서 그대로. 「팀별 보기」 드롭다운의 선택지다. */
export function collectOrgUnits(root) {
  const out = [];
  const walk = (node, depth) => {
    if (!node) return;
    out.push({ id: node.id, name: node.name, type: node.type, level: node.level, depth });
    (node.children || []).forEach((c) => walk(c, depth + 1));
  };
  walk(root, 0);
  return out;
}

/**
 * 트리의 모든 사람 → 줄 목록. 트리 순서(조직 → 그 안 사람 → 하위 조직)대로다.
 * `path` 는 회사부터 그 조직까지의 id — 「팀별 보기」로 고른 조직 안(하위 포함)만 남길 때 쓴다.
 */
export function collectOrgRows(root) {
  const rows = [];
  const walk = (node, path) => {
    const here = [...path, node.id];
    const dept = { id: node.id, name: node.name, order: rows.length };
    const push = (m, i, slot) => rows.push({ id: `${node.id}:${slot}:${i}`, member: m, dept, path: here });
    (node.directReports || []).forEach((m, i) => push(m, i, 'direct'));
    (node.members || []).forEach((m, i) => push(m, i, 'member'));
    (node.children || []).forEach((c) => walk(c, here));
  };
  if (root) walk(root, []);
  return rows;
}

/* 직급 차례 — 「직급 순」은 높은 직급부터다. 목록에 없는 직급은 뒤로, 그 안에서는 이름순. */
const GRADE_ORDER = ['대표', '이사', '본부장', '매니저', '팀장', '부장', '차장', '과장', '대리', '주임', '사원'];
const gradeRank = (g) => {
  const i = GRADE_ORDER.indexOf(g);
  return i < 0 ? GRADE_ORDER.length : i;
};
const gradeOf = (m) => m.grade ?? m.position ?? '';

/**
 * 줄을 정렬한다. `by` 는 'name' | 'dept' | 'grade'.
 *  - name  — 이름 가나다순
 *  - dept  — 트리에 적힌 조직 순서대로, 같은 조직 안은 이름순
 *  - grade — 높은 직급부터, 같은 직급 안은 이름순
 */
export function sortOrgRows(rows, by, locale) {
  const cmp = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), locale);
  const byName = (a, b) => cmp(a.member.name, b.member.name);
  const sorted = [...rows];
  if (by === 'dept') sorted.sort((a, b) => (a.dept.order - b.dept.order) || byName(a, b));
  else if (by === 'grade') {
    sorted.sort((a, b) => (gradeRank(gradeOf(a.member)) - gradeRank(gradeOf(b.member)))
      || cmp(gradeOf(a.member), gradeOf(b.member))
      || byName(a, b));
  } else sorted.sort(byName);
  return sorted;
}
