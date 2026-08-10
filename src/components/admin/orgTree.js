/**
 * 조직(소속) 계층 헬퍼 — 어드민에서 "조직을 고르는 모든 지점"이 공유하는 규격.
 * 정본: pivit-specs `spec-team-management.md §5-A` (OrgPicker P1~P9)
 *
 * 소속은 평면 목록이 아니라 트리(`org_units.parentId`)다. 종전 어드민의 소속 UI 들은
 * 팀 이름만 평면으로 나열해서, `프론트엔드` 가 어느 본부 밑인지·동명이팀 중 어느
 * 쪽인지 알 수 없었다. 여기서 트리를 한 번 만들어 목록/필터/피커가 같은 순서·같은
 * 표기를 쓰게 한다.
 */

/**
 * 경로 구분자 — 화면 표기는 `›`(U+203A)로 통일한다(§5-A P4).
 * CSV 대량 발령의 조직경로 구분자 `>` 와 시각적으로 구분돼, 화면에서 본 표기를
 * 그대로 파일에 붙여넣는 실수를 줄인다.
 */
export const ORG_PATH_SEP = ' › ';

/** 소속 필터의 '미배정' 특수값 — 조직 id 와 겹치지 않도록 `__` 를 두른다. */
export const ORG_FILTER_UNASSIGNED = '__unassigned__';

/**
 * 조직 단위 목록 → DFS 순서의 평탄 트리.
 *
 * @param {Array<{id:string,name:string,parentId?:string|null}>} units
 * @returns {Array<{
 *   id:string, name:string, parentId:string|null, depth:number,
 *   ancestorIds:string[], pathNames:string[], pathLabel:string, hasChildren:boolean
 * }>}
 *
 * 형제 순서는 입력 순서를 그대로 보존한다(서버 정렬이 정본).
 */
export function buildOrgTree(units = []) {
  const byId = new Map();
  for (const u of units) {
    if (u && u.id != null) byId.set(String(u.id), u);
  }

  const childrenOf = new Map();
  const roots = [];
  for (const u of units) {
    if (!u || u.id == null) continue;
    const id = String(u.id);
    const pid = u.parentId != null && u.parentId !== '' ? String(u.parentId) : null;
    // 부모가 목록에 없으면(부분 조회·권한 필터) 고아로 버리지 않고 루트로 올린다 —
    // 버리면 그 가지 전체가 선택지에서 통째로 사라진다.
    if (pid && pid !== id && byId.has(pid)) {
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid).push(u);
    } else {
      roots.push(u);
    }
  }

  const out = [];
  const seen = new Set();
  const walk = (list, depth, ancestorIds, pathNames) => {
    for (const u of list) {
      const id = String(u.id);
      if (seen.has(id)) continue; // 순환(A→B→A) 방어
      seen.add(id);
      const name = u.name ?? '';
      const names = [...pathNames, name];
      const kids = childrenOf.get(id) || [];
      out.push({
        id,
        name,
        parentId: u.parentId != null && u.parentId !== '' ? String(u.parentId) : null,
        depth,
        ancestorIds,
        pathNames: names,
        pathLabel: names.join(ORG_PATH_SEP),
        hasChildren: kids.length > 0,
      });
      walk(kids, depth + 1, [...ancestorIds, id], names);
    }
  };
  walk(roots, 0, [], []);

  // 순환 때문에 걸러진 노드가 남아 있으면 루트로 붙여 유실을 막는다.
  for (const u of units) {
    if (!u || u.id == null) continue;
    const id = String(u.id);
    if (seen.has(id)) continue;
    seen.add(id);
    const name = u.name ?? '';
    out.push({
      id,
      name,
      parentId: null,
      depth: 0,
      ancestorIds: [],
      pathNames: [name],
      pathLabel: name,
      hasChildren: false,
    });
  }

  return out;
}

/** 트리에서 id 로 노드 찾기(문자열/숫자 id 혼용 안전). */
export function findOrgEntry(tree, id) {
  if (id == null || id === '') return null;
  const key = String(id);
  return tree.find((e) => e.id === key) || null;
}

/**
 * 구성원의 소속 id 목록 중 "표시할 하나"를 고른다.
 * 겸직(PW-111)은 별도 티켓이라 여기서는 트리에 존재하는 첫 소속을 쓴다.
 */
export function primaryOrgEntry(tree, orgUnitIds) {
  if (!Array.isArray(orgUnitIds)) return null;
  for (const id of orgUnitIds) {
    const hit = findOrgEntry(tree, id);
    if (hit) return hit;
  }
  return null;
}

/** rootId 와 그 하위 전체의 id 집합. */
export function descendantIds(tree, rootId) {
  const key = String(rootId ?? '');
  const out = new Set();
  if (!key) return out;
  for (const e of tree) {
    if (e.id === key || e.ancestorIds.includes(key)) out.add(e.id);
  }
  return out;
}

/**
 * 소속 필터 판정 — 선택한 조직 **그리고 그 하위 전체**를 포함한다(§5-A P3).
 * 상위 조직을 고를 수 있는데 서브트리 매칭이 아니면 "본부로 거르기"가 0명이 되어
 * 필터 자체가 무의미해진다.
 *
 * id 기준으로 판정하므로 이름 접두 오탐(`People` 필터에 `Peoples` 가 걸림)이 없다.
 */
export function matchesOrgSubtree(memberOrgUnitIds, filterId, tree) {
  if (!filterId) return true;
  const ids = Array.isArray(memberOrgUnitIds) ? memberOrgUnitIds.map(String) : [];
  if (filterId === ORG_FILTER_UNASSIGNED) {
    return ids.length === 0 || ids.every((id) => !findOrgEntry(tree, id));
  }
  const allowed = descendantIds(tree, filterId);
  return ids.some((id) => allowed.has(id));
}
