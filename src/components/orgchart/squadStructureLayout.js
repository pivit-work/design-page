/**
 * 그림 보기 «구조» 갈래의 트리 재료 (pivit-work PW-2599 · 기획 screen-org-chart-squad.policy.md §5-6-A · §5-6-B · §5-6-C · v3.44).
 *
 * 순수 함수만 둔다. 두 쪽(`side`)을 같은 노드 트리로 만든다:
 *   스쿼드 조직 = 회사 → (위 묶음) → (아래 묶음) → 스쿼드 → 사람 · 맨 오른쪽 «스쿼드 없음»(처음 접힘)
 *   기능 조직   = 회사 → 조직 단위(조직도의 상하 · 조직도 순서) → 사람(주 소속에 한 장) · 맨 뒤 «미배정»
 *
 * 3회차(2026-11-09 커트 결정)부터 좌표를 계산하지 않는다 — 조직도 «트리»와 같은 부품(.org-node · .children-row ·
 * .members-list · DeptCard · BezierConnectors)이 흐름 배치로 그리고 선은 화면에서 잰다. 사람 카드는 노드 카드 바로 아래에
 * 쌓이고, 하위 노드로 가는 선은 사람 카드 줄 아래에서 나간다(조직도와 같다).
 *
 * 큰 조직(§5-6-B «큰 조직» · v3.44) — 노드 접기 · 한 노드 아래 11명 이상이면 9장 + «더 보기» 한 칸.
 * 노드의 인원 숫자는 접어도 그대로다(접힘은 «보이는 것»만 줄인다).
 */

/** 이만큼 넘으면(11명부터) 처음엔 `STRUCT_MORE_SHOW` 장 + «더 보기» 한 칸 — 묶음 없는 회사에서 최대 높이 760 안에 위아래가 다 드는 칸 수가 10 */
export const STRUCT_MORE_AT = 11;
export const STRUCT_MORE_SHOW = 9;

/** 확대·축소 범위 — 40~150%(§5-6-B «큰 조직» ②). 한 번 누를 때 10%p. */
export const STRUCT_ZOOM_MIN = 0.4;
export const STRUCT_ZOOM_MAX = 1.5;
export const STRUCT_ZOOM_STEP = 0.1;
/** 휠 한 칸(deltaY)당 배율 변화 — 조직도 트리 탭(usePanZoom)과 같은 세기. */
export const STRUCT_WHEEL_RATE = 0.002;
/** 캔버스 최대 높이 — «한눈에»와 같은 자리(§5-6-B «큰 조직» ①). */
export const STRUCT_CANVAS_MAX_H = 760;
/** 끌다가 놓은 것을 클릭으로 치지 않는 거리(§5.4 · 엣지 104). */
export const STRUCT_DRAG_THRESHOLD = 4;

export const STRUCT_VIEW_ALL = { folded: new Set(), more: new Set(), density: 'all' };

/**
 * 보이는 정보 양(조직도 트리 탭 툴바와 같은 세 갈래 · 4회차 2026-11-10 커트 결정).
 *  - all     사람 카드 전부
 *  - leaders 스쿼드 리드 · 트라이브·그룹 헤드 · 조직장 카드만, 나머지는 «N명» 한 줄
 *  - count   카드 없이 «N명» 한 줄
 * «N명» 줄은 그 노드 «자기» 사람만 센다. 묶음 노드(사람 = 헤드뿐)와 «스쿼드 없음»은 카드가 이미 수를 말해 줄을 두지 않는다.
 */
export const STRUCT_DENSITIES = ['all', 'leaders', 'count'];
const isStructLeader = (c) => !!(c.lead || c.headOf || c.unitHead);

const byKo = (a, b) => a.localeCompare(b, 'ko');

/** 맞춤 — 캔버스 폭에 맞추되 100% 위로 키우지 않고 40% 아래로 줄이지 않는다. */
export function structFitScale(viewW, treeW) {
  if (!viewW || !treeW) return 1;
  return Math.min(1, Math.max(STRUCT_ZOOM_MIN, viewW / treeW));
}

/**
 * 보이는 트리. `root` 는 `{ key, kind, data, children, people }` 노드 트리 — 고치지 않고 새 트리를 돌려준다.
 * `view.folded` = 접은 노드 key · `view.more` = «더 보기»를 연 노드 key.
 * 노드마다 `foldTotal`(접기 단추에 걸리는 하위 노드 + 사람 수 · 0 이면 단추 없음) · `folded` · `ownCount`(접기 전 사람 수) ·
 * `moreTotal`(더 보기가 걸린 사람 수 · 0 이면 없음) · `moreOpen` · `hidden`(가려진 사람 수) ·
 * `summaryCount`(«리더만»·«인원수만»에서 카드 대신 «N명» 한 줄로 세는 사람 수 · 0 이면 줄 없음)을 붙인다.
 * `view.density` = 보이는 정보 양(`STRUCT_DENSITIES`).
 * `foldable` = 접을 수 있는 노드 key 전부(«전체 접기»의 재료 — 접힌 노드 아래도 센다).
 */
export function structureView(root, view = STRUCT_VIEW_ALL) {
  const foldable = [];
  const walk = (n, collectOnly) => {
    const children = n.children || [];
    const people = n.people || [];
    const total = children.length + people.length;
    const canFold = (n.kind === 'group' || n.kind === 'unit' || n.kind === 'squad') && total > 0;
    if (canFold) foldable.push(n.key);
    const folded = canFold && view.folded.has(n.key);
    if (collectOnly || folded) children.forEach((c) => walk(c, true));
    if (collectOnly) return null;
    const density = view.density || 'all';
    const kept = density === 'count' ? [] : density === 'leaders' ? people.filter(isStructLeader) : people;
    const summaryCount = density !== 'all' && !folded && n.kind !== 'group' && n.kind !== 'none' ? people.length - kept.length : 0;
    let shown = folded ? [] : kept;
    const moreTotal = shown.length >= STRUCT_MORE_AT ? shown.length : 0;
    const moreOpen = moreTotal > 0 && view.more.has(n.key);
    if (moreTotal && !moreOpen) shown = shown.slice(0, STRUCT_MORE_SHOW);
    return {
      ...n,
      ownCount: people.length,
      foldTotal: canFold ? total : 0,
      folded,
      people: shown,
      moreTotal,
      moreOpen,
      hidden: moreTotal - shown.length,
      summaryCount,
      children: folded ? [] : children.map((c) => walk(c, false)),
    };
  };
  return { root: walk(root, false), foldable };
}

/** 한 스쿼드 아래 사람 순서 — 리드 먼저 → 주 소속 조직 단위의 조직도 순서 → 이름 가나다(§5-6-B «사람 순서»). */
function sortSquadMembers(members, personOf) {
  const order = (m) => personOf(m.userId)?.unitOrder ?? Number.MAX_SAFE_INTEGER;
  const name = (m) => personOf(m.userId)?.name || '';
  return [...members].sort((a, b) =>
    ((b.role === 'lead') - (a.role === 'lead')) || order(a) - order(b) || byKo(name(a), name(b)));
}

/** 묶음 순서 — 같은 층 이름 가나다(§5-6-A «순서»). `미분류` 는 부르는 쪽이 맨 뒤에 붙인다. */
function sortGroups(list) {
  return [...list].sort((a, b) => byKo(a.name, b.name));
}

/**
 * 스쿼드 조직 쪽 트리(§5-6-B).
 * - `shown` = 상태 필터로 켜진 스쿼드(카드 보기 순서) · `all` = 전체 스쿼드
 * - `levelNames` = `[0]` 아래 층 · `[1]` 위 층 · `groups` = 묶음(`level` 0 아래 · 1 위)
 * - `roster` = 조직도 명부의 사람(재직 중) — «스쿼드 없음» 재료
 * 묶음은 상태 필터와 무관하게 늘 그린다(«묶음과 필터»).
 */
export function buildSquadSide({ shown, all, levelNames = [], groups = [], roster = [], personOf, noneOpen = false }) {
  const levels = levelNames.length;
  const counts = new Map();
  shown.forEach((sq) => (sq.members || []).forEach((m) => counts.set(m.userId, (counts.get(m.userId) || 0) + 1)));

  const squadNode = (sq) => ({
    key: `sq:${sq.id}`,
    kind: 'squad',
    data: sq,
    children: [],
    people: sortSquadMembers(sq.members || [], personOf).map((m) => ({
      key: `${m.userId}#${sq.id}`,
      userId: m.userId,
      squadId: sq.id,
      lead: m.role === 'lead',
      multi: counts.get(m.userId) || 0,
      dim: 1,
    })),
  });

  const lows = levels ? groups.filter((g) => g.level === 0) : [];
  const tops = levels === 2 ? groups.filter((g) => g.level === 1) : [];
  const lowIds = new Set(lows.map((g) => g.id));
  const topIds = new Set(tops.map((g) => g.id));
  const groupOf = (id) => groups.find((g) => g.id === id);
  // 묶음 아래의 스쿼드 — 아래 층은 소속이 그 묶음인 것, 위 층은 소속 묶음의 위 묶음이 그 묶음인 것
  const under = (list, g) => list.filter((sq) => (g.level === 0 ? sq.groupId === g.id : groupOf(sq.groupId)?.parentId === g.id && lowIds.has(sq.groupId)));
  const uniquePeople = (list) => new Set(list.flatMap((sq) => (sq.members || []).map((m) => m.userId))).size;
  // 헤드는 조직도의 조직장처럼 묶음 카드 바로 아래 사람 카드로 선다(3회차 · 커트 2026-11-09). 퇴사·휴직이면 «헤드 미지정»(엣지 89).
  const headCard = (g) => (g.headActive && g.headUserId && personOf?.(g.headUserId)
    ? [{ key: `${g.headUserId}#head:${g.id}`, userId: g.headUserId, squadId: null, groupKey: `g:${g.id}`, headOf: g.id, lead: false, multi: 0, dim: 1 }]
    : []);
  const groupNode = (g, kids) => {
    const inShown = under(shown, g);
    return {
      key: `g:${g.id}`,
      kind: 'group',
      data: g,
      levelName: levelNames[g.level],
      children: kids,
      people: headCard(g),
      squadIds: new Set(inShown.map((sq) => sq.id)),
      peopleCount: uniquePeople(inShown),
      allCount: under(all, g).length,
    };
  };
  const virtual = (level, kids, ids) => ({
    key: `g:none${level}`,
    kind: 'group',
    data: { id: null, name: null, virtual: true, color: null, level },
    levelName: levelNames[level],
    children: kids,
    people: [],
    squadIds: new Set(ids),
    peopleCount: uniquePeople(shown.filter((sq) => ids.includes(sq.id))),
    allCount: ids.length,
  });

  const inLow = (gid) => shown.filter((sq) => sq.groupId === gid);
  const orphanSquads = shown.filter((sq) => !lowIds.has(sq.groupId));
  let top = shown.map(squadNode);
  if (levels === 1) {
    top = sortGroups(lows).map((g) => groupNode(g, inLow(g.id).map(squadNode)));
    if (orphanSquads.length) top.push(virtual(0, orphanSquads.map(squadNode), orphanSquads.map((sq) => sq.id)));
  } else if (levels === 2) {
    const lowNode = (g) => groupNode(g, inLow(g.id).map(squadNode));
    top = sortGroups(tops).map((t) => groupNode(t, sortGroups(lows.filter((g) => g.parentId === t.id)).map(lowNode)));
    const orphanLows = sortGroups(lows.filter((g) => !topIds.has(g.parentId)));
    const kids = orphanLows.map(lowNode);
    if (orphanSquads.length) kids.push(virtual(0, orphanSquads.map(squadNode), orphanSquads.map((sq) => sq.id)));
    if (kids.length) {
      top.push(virtual(1, kids, [...orphanLows.flatMap((g) => inLow(g.id).map((sq) => sq.id)), ...orphanSquads.map((sq) => sq.id)]));
    }
  }

  const noneIds = roster.filter((p) => !counts.has(p.id)).map((p) => p.id);
  const none = noneIds.length
    ? {
      key: 'none',
      kind: 'none',
      data: { count: noneIds.length, open: noneOpen },
      children: [],
      people: noneOpen ? noneIds.map((id) => ({ key: `${id}#none`, userId: id, squadId: null, lead: false, multi: 0, dim: 0.45 })) : [],
    }
    : null;
  return {
    key: 'root',
    kind: 'root',
    data: { side: 'squad', squads: shown.length, people: counts.size },
    children: none ? [...top, none] : top,
    people: [],
    counts,
  };
}

/**
 * 기능 조직 쪽 트리(§5-6-C «기능 조직 쪽»).
 * - `units` = 조직도 순서(깊이 우선)의 조직 단위 `{ id, name, depth }` — 깊이로 상하를 되살린다
 * - `people` = 명부. `unitKind === 'unit'` 이고 `unitId` 가 단위 목록에 있는 사람만 그 단위에 선다
 * - 대표(`unitKind === 'ceo'`)는 회사 노드 안 · 그 밖(대표 직속 개인 · 소속 없음 · 조직도에 없는 스쿼드 이름)은 맨 뒤 «미배정»
 * 대표 직속 곁가지 · 직속 슬롯 · 접힘 기억 · 손으로 옮긴 위치는 쓰지 않는다(«조직도 탭 트리와 다른 점»).
 */
export function buildOrgSide({ units = [], people = [] }) {
  const known = new Set(units.map((u) => u.id));
  const card = (p) => ({ key: `${p.id}#org`, userId: p.id, squadId: null, lead: false, multi: 0, unitHead: p.unitHeadId === p.id, dim: 1 });
  const peopleOf = (unitId) => people
    .filter((p) => p.unitKind === 'unit' && p.unitId === unitId)
    .sort((a, b) => ((b.unitHeadId === b.id) - (a.unitHeadId === a.id)) || byKo(a.name || '', b.name || ''))
    .map(card);
  // 깊이 우선 목록 → 트리. 스택의 마지막 = 지금 단위의 조상 사슬
  const roots = [];
  const stack = [];
  units.forEach((u) => {
    const node = { key: `u:${u.id}`, kind: 'unit', data: { id: u.id, name: u.name }, children: [], people: peopleOf(u.id) };
    while (stack.length && stack[stack.length - 1].depth >= u.depth) stack.pop();
    if (stack.length) stack[stack.length - 1].node.children.push(node);
    else roots.push(node);
    stack.push({ depth: u.depth, node });
  });
  const ceo = people.find((p) => p.unitKind === 'ceo') || null;
  const unassigned = people
    .filter((p) => p !== ceo && !(p.unitKind === 'unit' && known.has(p.unitId)))
    .sort((a, b) => byKo(a.name || '', b.name || ''))
    .map(card);
  if (unassigned.length) {
    roots.push({ key: 'u:none', kind: 'unit', data: { id: null, name: null, virtual: true }, children: [], people: unassigned });
  }
  return {
    key: 'root',
    kind: 'root',
    // 구성원 N명 = 재직 중 전원(한 사람 한 번 · §5-6-F). 조직도에 없어 «미배정»에 선 퇴사자 이름은 세지 않는다
    data: { side: 'org', ceo, people: people.filter((p) => p.employmentStatus !== 'terminated').length },
    children: roots,
    people: [],
  };
}

/**
 * 구조 갈래 «근무지» 쪽 — 회사 → 근무지 → 사람(screen-org-chart-squad.policy.md v3.49 §5-6-D · 엣지 96~98 · PW-2599 7회차).
 * 근무지 = 구성원 정보 «근무지(도시)» 값 하나라 한 사람 한 장이다(겸임·조직장·리드 딱지 없음 · 대표도 근무지 아래 한 장).
 * 순서 = `placeOrder`(필드 옵션 «근무지» 순번 · «사용 중»을 끈 값도 포함 — 엣지 97). 순번에 없는 값(CSV 로 들어온 값 등)은
 * 그 뒤에 가나다로, `근무지 미지정`(값 없음 · 엣지 96)은 맨 뒤. 사람이 0명인 근무지는 그리지 않는다.
 * 그리는 사람 = 재직 중 전원(기능 조직 쪽과 같다 · 스쿼드 상태 필터와 무관).
 */
export function buildPlaceSide({ people = [], placeOrder = [] }) {
  const roster = people.filter((p) => p.employmentStatus !== 'terminated');
  const valueOf = (p) => (typeof p.workLocation === 'string' ? p.workLocation.trim() : '');
  const card = (p) => ({ key: `${p.id}#place`, userId: p.id, squadId: null, lead: false, multi: 0, dim: 1 });
  const byPlace = new Map();
  roster.forEach((p) => {
    const v = valueOf(p);
    if (!byPlace.has(v)) byPlace.set(v, []);
    byPlace.get(v).push(p);
  });
  const known = placeOrder.filter((v, i) => v && placeOrder.indexOf(v) === i);
  const others = [...byPlace.keys()].filter((v) => v && !known.includes(v)).sort(byKo);
  const peopleOf = (v) => (byPlace.get(v) || []).sort((a, b) => byKo(a.name || '', b.name || '')).map(card);
  const places = [...known, ...others]
    .filter((v) => byPlace.has(v))
    .map((v) => ({ key: `pl:${v}`, kind: 'unit', data: { id: `place:${v}`, name: v, place: true }, children: [], people: peopleOf(v) }));
  const unset = byPlace.has('')
    ? [{ key: 'pl:none', kind: 'unit', data: { id: null, name: null, place: true, virtual: true }, children: [], people: peopleOf('') }]
    : [];
  return {
    key: 'root',
    kind: 'root',
    // 근무지 K곳(미지정 뺌) · N명(그린 사람 수 = 노드 인원의 합 · 미지정 포함 — §5-6-D «회사 노드» · §5-6-F)
    data: { side: 'place', places: places.length, people: roster.length, placed: roster.length - (byPlace.get('') || []).length },
    children: [...places, ...unset],
    people: [],
  };
}

/**
 * 연결 갈래의 스쿼드 줄 순서 — 묶음 층이 있으면 묶음 트리 순서(위 묶음 → 아래 묶음 → 스쿼드 · `미분류` 는 맨 뒤 ·
 * §5-6 «묶음 (연결 갈래)»). 묶음 안 스쿼드는 받은 순서(카드 보기 순서) 그대로. 층이 없으면 그대로 돌려준다.
 */
export function orderSquadsByGroups(squads, levelNames = [], groups = []) {
  const levels = levelNames.length;
  if (!levels) return squads;
  const lows = groups.filter((g) => g.level === 0);
  const tops = levels === 2 ? groups.filter((g) => g.level === 1) : [];
  const topRank = new Map(sortGroups(tops).map((g, i) => [g.id, i]));
  const lowRank = new Map(
    [...lows]
      .sort((a, b) => {
        const ta = topRank.has(a.parentId) ? topRank.get(a.parentId) : Number.MAX_SAFE_INTEGER;
        const tb = topRank.has(b.parentId) ? topRank.get(b.parentId) : Number.MAX_SAFE_INTEGER;
        return ta - tb || byKo(a.name, b.name);
      })
      .map((g, i) => [g.id, i]),
  );
  const rank = (sq) => (lowRank.has(sq.groupId) ? lowRank.get(sq.groupId) : Number.MAX_SAFE_INTEGER);
  return squads.map((sq, i) => ({ sq, i })).sort((a, b) => rank(a.sq) - rank(b.sq) || a.i - b.i).map((x) => x.sq);
}

/** 연결 갈래의 묶음 띠 — 같은 아래 층 묶음에 속한 스쿼드 노드들의 가로 범위(`squadNodes` 순서 기준). */
export function groupBands(squadNodes, groups = [], levels = 0) {
  if (!levels) return [];
  const bands = [];
  squadNodes.forEach(({ squad, x }) => {
    const g = groups.find((gr) => gr.id === squad.groupId && gr.level === 0);
    if (!g) return;
    const last = bands[bands.length - 1];
    if (last && last.group.id === g.id) last.x2 = x;
    else bands.push({ group: g, x1: x, x2: x });
  });
  return bands;
}
