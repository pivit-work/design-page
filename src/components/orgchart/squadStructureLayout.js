/**
 * 그림 보기 «구조» 갈래의 트리 배치 (pivit-work PW-2599 · 기획 screen-org-chart-squad.policy.md §5-6-A · §5-6-B · §5-6-C · v3.44).
 *
 * 순수 함수만 둔다 — 같은 입력이면 같은 좌표다. 그리는 쪽(`SquadStructureView`)은 좌표를 그대로 쓴다.
 *
 * 두 쪽(`side`)을 같은 배치로 그린다:
 *   스쿼드 조직 = 회사 → (위 묶음) → (아래 묶음) → 스쿼드 → 사람 · 맨 오른쪽 «스쿼드 없음»(처음 접힘)
 *   기능 조직   = 회사 → 조직 단위(조직도의 상하 · 조직도 순서) → 사람(주 소속에 한 장) · 맨 뒤 «미배정»
 *
 * 사람 카드는 노드 아래로 쌓는다(조직도 직속 슬롯처럼). 옆으로 늘어놓으면 한 스쿼드 아래 6명만 돼도 트리 폭이 1,000 을 넘는다.
 * 사람과 하위 노드를 함께 가진 노드는 사람 묶음을 첫 자식 칸(`stack`)으로 내린다.
 *
 * 큰 조직(§5-6-B «큰 조직» · v3.44) — 노드 접기 · 한 노드 아래 11명 이상이면 9장 + «더 보기» 한 칸.
 * 노드의 인원 숫자는 접어도 그대로다(접힘은 «보이는 것»만 줄인다).
 */

export const STRUCT_GEOM = {
  nodeW: 196,
  cardW: 180,
  cardH: 44,
  cardGap: 6,
  hGap: 24,
  vGap: 44,
  stackTop: 12,
  /** 묶음 영역이 그 아래 가지를 감싸는 좌우 여백 */
  gPad: 12,
  /** 캔버스 가장자리 여백 */
  pad: 24,
  /** 이만큼 넘으면(11명부터) 처음엔 `moreShow` 장 + «더 보기» 한 칸 — 묶음 없는 회사에서 최대 높이 760 안에 위아래가 다 드는 칸 수가 10 */
  moreAt: 11,
  moreShow: 9,
  h: { root: 68, group: 100, squad: 72, unit: 60, none: 56, stack: 0 },
};

/** 확대·축소 범위 — 40~150%(§5-6-B «큰 조직» ②). 한 번 누를 때 10%p. */
export const STRUCT_ZOOM_MIN = 0.4;
export const STRUCT_ZOOM_MAX = 1.5;
export const STRUCT_ZOOM_STEP = 0.1;
/** 캔버스 최대 높이 — «한눈에»와 같은 자리(§5-6-B «큰 조직» ①). */
export const STRUCT_CANVAS_MAX_H = 760;
/** 끌다가 놓은 것을 클릭으로 치지 않는 거리(§5.4 · 엣지 104). */
export const STRUCT_DRAG_THRESHOLD = 4;

export const STRUCT_VIEW_ALL = { folded: new Set(), more: new Set() };

const byKo = (a, b) => a.localeCompare(b, 'ko');

/** 맞춤 — 캔버스 폭에 맞추되 100% 위로 키우지 않고 40% 아래로 줄이지 않는다. */
export function structFitScale(viewW, treeW) {
  if (!viewW || !treeW) return 1;
  return Math.min(1, Math.max(STRUCT_ZOOM_MIN, viewW / treeW));
}

/**
 * 트리 배치. `root` 는 `{ key, kind, data, children, people }` 노드 트리 — 이 함수가 노드에 좌표를 덧붙인다.
 * `view.folded` = 접은 노드 key · `view.more` = «더 보기»를 연 노드 key.
 */
export function layoutStructure(root, view = STRUCT_VIEW_ALL) {
  const G = STRUCT_GEOM;
  const foldable = [];
  const mores = [];
  const prep = (n) => {
    n.children = n.children || [];
    n.people = n.people || [];
    n.ownCount = n.people.length;
    // 접는 단추가 보이는 노드 — 그 아래 노드나 사람이 하나라도 있으면
    n.foldTotal = n.children.length + n.ownCount;
    if ((n.kind === 'group' || n.kind === 'unit' || n.kind === 'squad') && n.foldTotal) foldable.push(n.key);
    n.folded = view.folded.has(n.key) && n.foldTotal > 0;
    if (n.folded) { n.children = []; n.people = []; }
    n.children = n.children.map(prep);
    if (n.people.length && n.children.length) {
      n.children.unshift(prep({ key: `${n.key}/stack`, kind: 'stack', people: n.people, children: [] }));
      n.people = [];
    }
    n.h = G.h[n.kind];
    n.moreTotal = n.people.length >= G.moreAt ? n.people.length : 0;
    n.moreOpen = n.moreTotal > 0 && view.more.has(n.key);
    if (n.moreTotal && !n.moreOpen) n.people = n.people.slice(0, G.moreShow);
    const slots = n.people.length + (n.moreTotal ? 1 : 0);
    const stackH = slots ? (n.kind === 'stack' ? 0 : G.stackTop) + slots * (G.cardH + G.cardGap) - G.cardGap : 0;
    n.selfW = n.kind === 'stack' ? G.cardW : G.nodeW;
    n.selfH = n.h + stackH;
    n.childW = n.children.reduce((a, c) => a + c.w, 0) + Math.max(0, n.children.length - 1) * G.hGap;
    const regionPad = n.kind === 'group' && !n.data?.virtual ? G.gPad * 2 : 0;
    n.w = Math.max(n.selfW, n.childW) + regionPad;
    return n;
  };
  prep(root);

  const nodes = [];
  const edges = [];
  const spines = [];
  const regions = [];
  const cards = [];
  const place = (n, left, y) => {
    let bottom = y + n.selfH;
    if (n.children.length) {
      let x = left + (n.w - n.childW) / 2;
      const cy = y + n.h + G.vGap;
      n.children.forEach((c) => { bottom = Math.max(bottom, place(c, x, cy)); x += c.w + G.hGap; });
      n.cx = (n.children[0].cx + n.children[n.children.length - 1].cx) / 2;
    } else {
      n.cx = left + n.w / 2;
    }
    n.y = y;
    if (n.kind !== 'stack') nodes.push(n);
    n.children.forEach((c) => edges.push({ key: `${n.key}>${c.key}`, x1: n.cx, y1: y + n.h, x2: c.cx, y2: c.y }));
    if (n.people.length) {
      const top = y + (n.kind === 'stack' ? 0 : n.h + G.stackTop);
      n.people.forEach((p, i) => {
        cards.push({ ...p, x: n.cx - G.cardW / 2, y: top + i * (G.cardH + G.cardGap) });
      });
      if (n.moreTotal) {
        mores.push({
          key: n.key,
          x: n.cx - G.cardW / 2,
          y: top + n.people.length * (G.cardH + G.cardGap),
          hidden: n.moreTotal - n.people.length,
          open: n.moreOpen,
        });
      }
      const last = top + (n.people.length - (n.moreTotal ? 0 : 1)) * (G.cardH + G.cardGap) + G.cardH / 2;
      spines.push({ key: `${n.key}/spine`, x: n.cx, y1: n.kind === 'stack' ? y : y + n.h, y2: last, dashed: n.kind === 'none' });
    }
    if (n.kind === 'group' && !n.data?.virtual) {
      bottom += G.gPad;
      regions.push({ key: `${n.key}/region`, x: left + 2, y: y - 10, w: n.w - 4, h: bottom - y + 10, color: n.data.color });
    }
    return bottom;
  };
  const h = place(root, 0, 0);
  return { nodes, edges, spines, regions, cards, mores, foldable, w: root.w, h, root };
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
  const groupNode = (g, kids) => {
    const inShown = under(shown, g);
    return {
      key: `g:${g.id}`,
      kind: 'group',
      data: g,
      levelName: levelNames[g.level],
      children: kids,
      people: [],
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
  const card = (p) => ({ key: `${p.id}#org`, userId: p.id, squadId: null, lead: false, multi: 0, head: p.unitHeadId === p.id, dim: 1 });
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
