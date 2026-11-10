/**
 * 스쿼드 «한눈에» 기둥 무대의 자리 계산 (pivit-work PW-2616 · 기획 screen-org-chart-squad.policy.md §5-7
 * «리소스 표현 후보» 행 v3.49 임시 적용). 화면 부품과 떼어 둔 순수 함수다 — 같은 입력이면 같은 자리가 나온다.
 *
 * 사람 = 기둥. 기둥 높이 = 그 배정의 «개인 캐파 사용»(분모 = 그 사람의 시간 100). 겸임이면 조직도 쪽에서는
 * 조각이 쌓인 한 기둥이고 스쿼드 쪽에서는 조각이 스쿼드마다 선다 — 조각 높이의 합이 원래 높이다.
 * 스쿼드 판 아래에는 트라이브·그룹(PW-2599 «스쿼드 계층») 받침이, 팀 판 아래에는 회사 바로 아래 조직 받침이 선다.
 */
import { isCapacityUnset, isCountedStatus, plannedTotalPct } from './squad-constants.js';

export const PILLAR = {
  cos: Math.cos(Math.PI / 6), sin: 0.5,
  cell: 30, half: 10, rad: 12, plateT: 10, stepT: 9, lane: 34, pad: 14,
  heightPerPct: 0.62,
  unsetH: 14, noneH: 2.5, minH: 6,
};
export const PILLAR_FAMILIES = ['dev', 'design', 'pm', 'biz', 'ops'];
/** 직군 색 — 블록·띠·범례에 쓴다. 디자인 토큰(info · role · brand · warning · sub)이다. */
export const PILLAR_FAMILY_COLOR = {
  dev: 'var(--utility-blue-500)', design: 'var(--utility-purple-500)', pm: 'var(--utility-brand-500)',
  biz: 'var(--utility-orange-500)', ops: 'var(--utility-gray-500)', none: 'var(--text-quaternary)',
};
export const PILLAR_ZOOM_MIN = 0.2;
export const PILLAR_ZOOM_MAX = 2.5;
/** 이 크기(px) 아래로 작아진 일반 이름은 접는다 — 읽히지 않는다(카드 본문 «7px 아래로 내려가면»). */
export const PILLAR_MIN_NAME_PX = 7;
export const PILLAR_OVER = 100;
/** 멀리서 볼 때 이름표를 키우는 상한 — 이름표는 배율 1~이 값 사이로 커진다. */
export const PILLAR_TAG_SCALE_MAX = 1.45;
/** 일반 이름표에 싣는 글자 수 상한 — 넘으면 앞 글자 + «…»(온전한 이름은 마우스 올림 카드·찾기에 있다). */
export const PILLAR_NAME_MAX = 8;
export const shortName = (name) => {
  const ch = [...String(name || '')];
  return ch.length > PILLAR_NAME_MAX ? `${ch.slice(0, PILLAR_NAME_MAX - 1).join('')}…` : ch.join('');
};
const nameTagW = (len) => len * 10.2 + 4;

const { cos: COS, sin: SIN } = PILLAR;
export const pillarIso = (x, y, z = 0) => [(x - y) * COS, (x + y) * SIN - z];
export const pillarPts = (list) => list.map(([x, y, z]) => pillarIso(x, y, z).map((v) => v.toFixed(1)).join(',')).join(' ');

/** 흰색과 섞기 — pct 100 이면 원색. c 는 토큰(var)이나 스쿼드 색(데이터)이다. SVG 에서는 style 로만 칠한다(속성은 var 를 못 푼다). */
export const mixWhite = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, white)`;
/** 검정과 섞기 — 글자·점 테두리처럼 진하게 쓸 때. */
export const shadeDark = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, black)`;

/** 자식을 가로로 놓다가 넘치면 다음 줄 */
function pack(items, maxW, gapX, lane) {
  let x = 0; let y = 0; let rowD = 0; let W = 0;
  items.forEach((it) => {
    if (x > 0 && x + it.w > maxW) { x = 0; y += rowD + lane; rowD = 0; }
    it.x = x; it.y = y; x += it.w + gapX; rowD = Math.max(rowD, it.d); W = Math.max(W, x - gapX);
  });
  return { w: W, d: y + rowD };
}

function plate(id, name, people, opts = {}) {
  const n = Math.max(1, people.length);
  const cols = Math.ceil(Math.sqrt(n * (opts.wide ? 1.7 : 1.25)));
  const rows = Math.ceil(n / cols);
  // 앞쪽(오른쪽 아래 꼭지)일수록 뒤 번호 — 맨 뒤 사람(리드·조직장)은 판의 맨 앞 꼭지 칸에 선다.
  // 칸이 남으면 앞 꼭지와 같은 줄의 칸이 빌 수 있어, 앞 사람들은 뒤에서부터 채우고 마지막 사람만 꼭지로 보낸다.
  const cell = opts.cell || PILLAR.cell;
  const cells = [...Array(cols * rows).keys()].map((k) => [k % cols, Math.floor(k / cols)]).sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
  const slots = n === 1 ? [cells[0]] : [...cells.slice(0, n - 1), cells[cells.length - 1]];
  return {
    kind: 'plate', id, name, people, cols, rows, slots,
    w: Math.max(cols * cell + PILLAR.pad * 2, 164), d: rows * cell + PILLAR.pad * 2, ...opts, cell,
  };
}

function box(kind, id, name, children, maxW, opts = {}) {
  const p = pack(children, maxW, 26, opts.rowLane || PILLAR.lane);
  return { kind, id, name, children, w: p.w + PILLAR.pad * 2 + 6, d: p.d + PILLAR.pad + 6 + PILLAR.lane, ...opts };
}

function place(node, ox, oy, z) {
  node.ax = ox; node.ay = oy; node.z = z;
  const t = node.kind === 'plate' ? PILLAR.plateT : node.kind === 'root' ? 0 : PILLAR.stepT;
  node.t = t; node.top = z + t;
  const inset = node.kind === 'root' ? 0 : PILLAR.pad + 3;
  (node.children || []).forEach((c) => place(c, ox + inset + c.x, oy + inset + c.y, node.top));
}

export function flattenNodes(n, out = []) {
  if (n.kind !== 'root') out.push(n);
  (n.children || []).forEach((c) => flattenNodes(c, out));
  return out;
}

function rootOf(tops, maxW, gap, lane) {
  const p = pack(tops, maxW, gap, lane);
  const root = { kind: 'root', id: 'root', children: tops, w: p.w, d: p.d };
  place(root, 0, 0, 0);
  return root;
}

/**
 * «스쿼드 없음» 판의 칸 크기 — 납작한 타일이라 이름표가 모두 같은 높이에 선다. 화면에서 같은 줄에 놓이는 이웃 칸은
 * 가로로 2·cell·cos 떨어지므로, 가장 긴 이름표(멀리서 키운 크기까지)가 그 안에 들어가게 칸을 넓힌다.
 * 앞뒤 줄의 세로 간격도 키운 이름표 높이보다 넓게 잡아 짧은 이름만 있어도 40 이다(시안 30 은 멀리서 겹쳤다).
 */
function noneCell(list) {
  const len = Math.max(0, ...list.map((x) => [...shortName(x.person?.name)].length));
  const across = (nameTagW(len) * PILLAR_TAG_SCALE_MAX) / (2 * COS) + 2;
  // 앞뒤 줄은 세로로 cell·sin 떨어진다 — 키운 이름표 높이(13)보다 넓어야 위로 밀어 올리지 않는다.
  const down = (13 * PILLAR_TAG_SCALE_MAX + 1) / SIN;
  return Math.max(PILLAR.cell, Math.ceil(Math.max(across, down)));
}

/** 판 위 사람 자리(바닥 좌표) */
export function cellAt(pl, i) {
  const [c, r] = pl.slots[i];
  return [
    pl.ax + PILLAR.pad + (pl.w - PILLAR.pad * 2 - pl.cols * pl.cell) / 2 + (c + 0.5) * pl.cell,
    pl.ay + PILLAR.pad + (r + 0.5) * pl.cell,
  ];
}

/** 기둥 높이 — 배정이 없으면 납작한 타일, 캐파 미설정이면 점선 기둥(고정 높이). */
export function pillarHeight(a) {
  if (!a) return PILLAR.noneH;
  if (a.unset) return PILLAR.unsetH;
  return Math.max(PILLAR.minH, a.capa * PILLAR.heightPerPct);
}

const teamKeyOf = (p) => {
  if (p.unitKind === 'unit' && p.unitId) return `u:${p.unitId}`;
  return p.unitKind === 'ceo' || p.unitKind === 'ceoDirect' ? p.unitKind : 'unassigned';
};

function topFamily(list) {
  let best = null; let bestN = 0;
  PILLAR_FAMILIES.forEach((f) => {
    const n = list.filter((p) => p.jobFamilyGroup === f).length;
    if (n > bestN) { best = f; bestN = n; }
  });
  return best;
}

/** 이 스쿼드의 «주 프로젝트» — 이 스쿼드가 주 스쿼드(主)인 첫 프로젝트, 없으면 연결된 첫 프로젝트(개발이 정함). */
export function mainProjectOf(squad) {
  const list = squad?.projects || [];
  return list.find((p) => p.isPrimary) || list[0] || null;
}

/**
 * @param {object} args
 * @param {Array} args.squads  스쿼드 응답(+ `projects`). 준비중·진행중만 그린다.
 * @param {Array} args.people  명부(주 소속·직군)
 * @param {Array} [args.orgUnits]  조직도 순서의 조직 단위 `{ id, name, depth }` — depth 0 이 회사 바로 아래
 * @param {string[]} [args.groupLevelNames]  스쿼드 계층 이름 — [0] 아래 층(트라이브) · [1] 위 층(그룹)
 * @param {Array} [args.squadGroups]  `{ id, level, name, color, headUserId, parentId }`
 */
export function pillarModel({ squads = [], people = [], orgUnits = [], groupLevelNames = [], squadGroups = [] }) {
  const shown = squads.filter((sq) => isCountedStatus(sq.status));
  const byId = new Map(people.map((p) => [p.id, p]));
  shown.forEach((sq) => (sq.members || []).forEach((m) => {
    if (!byId.has(m.userId)) byId.set(m.userId, { id: m.userId, name: '', unknown: true });
  }));
  const assigned = new Set(shown.flatMap((sq) => (sq.members || []).map((m) => m.userId)));
  const persons = [...byId.values()].filter((p) => p.employmentStatus !== 'terminated' || assigned.has(p.id));

  // 사람마다 배정(조각) — 스쿼드 순서대로
  const asOf = new Map(persons.map((p) => [p.id, []]));
  const squadInfo = shown.map((sq) => {
    const members = (sq.members || []).filter((m) => asOf.has(m.userId));
    const lead = members.find((m) => m.role === 'lead');
    const info = { squad: sq, id: `s:${sq.id}`, members, leadId: lead ? lead.userId : null, project: mainProjectOf(sq) };
    members.forEach((m) => {
      asOf.get(m.userId).push({
        squadId: sq.id, squad: sq, info,
        unset: isCapacityUnset(m),
        capa: isCapacityUnset(m) ? 0 : Math.max(0, Number(m.allocationPct) || 0),
        share: Number(m.sharePct) || 0,
        lead: m.role === 'lead',
      });
    });
    return info;
  });
  const totalOf = new Map(persons.map((p) => [p.id, plannedTotalPct(shown, p.id)]));
  const P = persons.map((p) => ({
    id: p.id, person: p, as: asOf.get(p.id), total: totalOf.get(p.id) || 0,
  }));
  const pById = new Map(P.map((x) => [x.id, x]));
  const NONE = P.filter((x) => x.as.length === 0);

  // ── 스쿼드 쪽 ──
  const capaIn = (x, sqId) => {
    const a = x.as.find((v) => v.squadId === sqId);
    return a && !a.unset ? a.capa : -1;
  };
  const squadPlate = (info) => {
    const xs = info.members.map((m) => pById.get(m.userId)).filter(Boolean);
    const lead = xs.find((x) => x.id === info.leadId);
    const rest = xs.filter((x) => x !== lead).sort((a, b) => capaIn(b, info.squad.id) - capaIn(a, info.squad.id));
    return plate(info.id, info.squad.name, lead ? [...rest, lead] : rest, { squad: info.squad, info });
  };
  const plateOf = new Map(squadInfo.map((info) => [info.squad.id, squadPlate(info)]));
  const layers = Math.min(2, groupLevelNames.length);
  const groupById = new Map(squadGroups.map((g) => [g.id, g]));
  const nameOfPerson = (id) => (id ? byId.get(id)?.name || null : null);
  const uniqPeople = (plates) => new Set(plates.flatMap((pl) => pl.people.map((x) => x.id))).size;
  let tops = [];
  const used = new Set();
  if (layers > 0) {
    const lowerBox = (g) => {
      const plates = shown.filter((sq) => sq.groupId === g.id).map((sq) => plateOf.get(sq.id));
      if (plates.length === 0) return null;
      plates.forEach((pl) => used.add(pl.squad.id));
      return box('tribe', `g:${g.id}`, g.name, plates, 520, {
        color: g.color, group: g, layer: groupLevelNames[0], headName: nameOfPerson(g.headUserId),
        squadCount: plates.length, peopleCount: uniqPeople(plates),
      });
    };
    const lowers = squadGroups.filter((g) => g.level === 0).map((g) => ({ g, b: lowerBox(g) })).filter((x) => x.b);
    if (layers === 1) {
      tops = lowers.map((x) => x.b);
    } else {
      const uppers = squadGroups.filter((g) => g.level === 1).map((g) => {
        const kids = lowers.filter((x) => x.g.parentId === g.id).map((x) => x.b);
        if (kids.length === 0) return null;
        const plates = kids.flatMap((k) => k.children);
        return box('group', `g:${g.id}`, g.name, kids, 640, {
          rowLane: 116, color: g.color, group: g, layer: groupLevelNames[1], headName: nameOfPerson(g.headUserId),
          squadCount: plates.length, peopleCount: uniqPeople(plates),
        });
      }).filter(Boolean);
      const orphanLowers = lowers.filter((x) => !x.g.parentId || !groupById.has(x.g.parentId) || !uppers.some((u) => u.group.id === x.g.parentId)).map((x) => x.b);
      tops = [...uppers, ...orphanLowers];
    }
  }
  shown.forEach((sq) => { if (!used.has(sq.id)) tops.push(plateOf.get(sq.id)); });
  const nonePlate = NONE.length ? plate('none', '', NONE, { dashed: true, wide: true, cell: noneCell(NONE) }) : null;
  if (nonePlate) tops.push(nonePlate);
  const sTree = rootOf(tops, layers === 0 ? 800 : 1020, 34, 124);

  // ── 조직도 쪽 ──
  const teamMap = new Map();
  P.forEach((x) => {
    const p = x.person;
    const key = teamKeyOf(p);
    if (!teamMap.has(key)) {
      teamMap.set(key, {
        key, kind: p.unitKind === 'unit' && p.unitId ? 'unit' : key, unitId: p.unitKind === 'unit' ? p.unitId : null,
        name: p.unitKind === 'unit' ? p.unitName : '', order: p.unitOrder ?? Number.MAX_SAFE_INTEGER, headId: null, list: [],
      });
    }
    const t = teamMap.get(key);
    t.list.push(x);
    if (p.unitHeadId) t.headId = p.unitHeadId;
  });
  const teams = [...teamMap.values()].sort((a, b) => a.order - b.order);
  // 회사 바로 아래 조직(받침) — 조직도 순서에서 depth 0 을 만날 때마다 바뀐다
  const topOfUnit = new Map();
  let curTop = null;
  orgUnits.forEach((u) => {
    if (u.depth === 0) curTop = u;
    if (curTop) topOfUnit.set(u.id, curTop);
  });
  const nested = orgUnits.some((u) => u.depth > 0);
  const teamPlates = teams.map((t) => {
    const ordered = [...t.list].sort((a, b) => ((a.id === t.headId) - (b.id === t.headId)) || (b.total - a.total));
    return plate(`t:${t.key}`, t.name, ordered, { team: t, family: topFamily(t.list.map((x) => x.person)) });
  });
  let orgTops;
  if (nested) {
    orgTops = [];
    const boxOf = new Map();
    teamPlates.forEach((pl) => {
      const top = pl.team.unitId ? topOfUnit.get(pl.team.unitId) : null;
      if (!top) { orgTops.push(pl); return; }
      if (!boxOf.has(top.id)) {
        const b = { top, plates: [] };
        boxOf.set(top.id, b);
        orgTops.push(b);
      }
      boxOf.get(top.id).plates.push(pl);
    });
    orgTops = orgTops.map((it) => {
      if (it.kind === 'plate') return it;
      const ppl = it.plates.flatMap((pl) => pl.people.map((x) => x.person));
      return box('div', `d:${it.top.id}`, it.top.name, it.plates, 560, {
        rowLane: 116, family: topFamily(ppl), teamCount: it.plates.length, peopleCount: ppl.length,
      });
    });
  } else {
    orgTops = teamPlates;
  }
  const oTree = rootOf(orgTops, 1020, 60, 136);

  // ── 기둥(조각) ──
  const sPlates = new Map(flattenNodes(sTree).filter((n) => n.kind === 'plate').map((n) => [n.id, n]));
  const oPlateOf = new Map();
  flattenNodes(oTree).filter((n) => n.kind === 'plate').forEach((n) => n.people.forEach((x) => oPlateOf.set(x.id, n)));
  const headIds = new Set(teams.filter((t) => t.headId && t.list.some((x) => x.id === t.headId)).map((t) => t.headId));
  const tokens = [];
  P.forEach((x) => {
    const org = oPlateOf.get(x.id);
    const [ox, oy] = cellAt(org, org.people.indexOf(x));
    let stack = 0;
    const list = x.as.length ? x.as : [null];
    list.forEach((a, k) => {
      const pl = a ? sPlates.get(`s:${a.squadId}`) : nonePlate;
      const [sx, sy] = cellAt(pl, pl.people.indexOf(x));
      const h = pillarHeight(a);
      tokens.push({
        key: `${x.id}::${a ? a.squadId : '-'}`, x, a, h, off: stack,
        top: k === list.length - 1, bottom: k === 0, base: org.top,
        lead: !!a && a.lead, head: headIds.has(x.id), multi: x.as.length,
        S: { x: sx, y: sy, z: pl.top }, O: { x: ox, y: oy, z: org.top + stack },
        squadPlateId: pl.id, orgPlateId: org.id,
      });
      stack += h;
    });
  });

  return {
    sTree, oTree, tokens, persons: P, personById: pById, squadInfo, nonePlate, layers,
    teamCount: teams.length,
    headcount: P.filter((x) => !x.person.unknown && x.person.employmentStatus !== 'terminated').length,
  };
}

/** 그 쪽 그림 전체가 들어가는 viewBox */
export function pillarViewBox(tree) {
  const X = []; const Y = [];
  flattenNodes(tree).forEach((n) => {
    [[n.ax, n.ay], [n.ax + n.w, n.ay], [n.ax, n.ay + n.d + PILLAR.lane], [n.ax + n.w, n.ay + n.d + PILLAR.lane]].forEach(([x, y]) => {
      const [a, b] = pillarIso(x, y, n.z);
      X.push(a); Y.push(b);
    });
  });
  if (X.length === 0) return { x: -200, y: -100, w: 400, h: 200 };
  const x0 = Math.min(...X); const x1 = Math.max(...X); const y0 = Math.min(...Y); const y1 = Math.max(...Y);
  return { x: x0 - 24, y: y0 - 96, w: x1 - x0 + 48, h: y1 - y0 + 112 };
}

/**
 * 사람 이름표 상자(바닥 단위 · 배율 1) — 그리는 모양(SquadPillarStage «Tag»)과 같은 자리.
 * top = 기둥 꼭대기에서 상자 위 끝까지(과부하 20 올림 전), h = 상자 높이.
 * 내 이름표는 두 줄 알약(위 끝 42 · 높이 34), 리드·조직장 알약(위 끝 25 · 높이 22), 일반 이름 글자(위 끝 15 · 높이 13).
 */
export function tagBox(tk, side, name, mine) {
  const lead = side === 'squad' ? tk.lead : tk.head;
  const len = [...String(name || '')].length;
  if (side === 'squad' && mine) return { w: Math.max(len + 2, 7) * 11 + 24, top: 42, h: 34, lead: true };
  if (lead) return { w: side === 'squad' ? len * 11.5 + 44 : (len + 5) * 11.5 + 16, top: 25, h: 22, lead: true };
  return { w: nameTagW(Math.min(len, PILLAR_NAME_MAX)), top: 15, h: 13, lead: false };
}

/**
 * 이름표 자리 — 겹치면 겹친 상자 위로 올린다. 리드·조직장·내 이름표가 먼저, 그다음 앞쪽 사람부터 자리를 잡는다.
 * 올리는 거리에 상한을 두지 않는다 — 상한에서 멈추면 그 자리에서 겹친 채 남는다
 * (11-10 dev: 높이 34 인 내 이름표 바로 뒤 이름이 세 줄 상한에 걸려 통째로 덮였다).
 * @returns [{ key, x, top, w, h, dy }] (화면 단위 · 배율 k · 올린 뒤 자리 · dy = 위로 올린 거리)
 */
export function placeTagBoxes(list, side, k, nameOf, isMine) {
  const items = list.map((t) => {
    const q = side === 'squad' ? t.S : t.O;
    const [x, y] = pillarIso(q.x, q.y, q.z + t.h);
    const b = tagBox(t, side, nameOf(t), isMine(t));
    const over = t.a && t.x.total > PILLAR_OVER ? 20 : 0;
    return { key: t.key, x, top: y - (b.top + over) * k, w: b.w * k, h: b.h * k, lead: b.lead, order: q.x + q.y };
  });
  items.sort((a, b) => (b.lead - a.lead) || (b.order - a.order));
  const placed = [];
  items.forEach((it) => {
    let top = it.top;
    // 한 번 올릴 때마다 겹친 상자 하나의 위로 넘어가므로, 놓인 상자 수만큼이면 반드시 빈 자리에 닿는다
    for (let i = 0; i <= placed.length; i++) {
      const c = placed.find((p) => Math.abs(p.x - it.x) < (p.w + it.w) / 2 && top < p.top + p.h && top + it.h > p.top);
      if (!c) break;
      top = c.top - it.h - 1;
    }
    placed.push({ key: it.key, x: it.x, top, w: it.w, h: it.h, dy: it.top - top });
  });
  return placed;
}

/** @returns Map<key, dy> (화면 단위 · 위로 올린 거리, 배율 k 를 곱한 값) */
export function layoutTags(list, side, k, nameOf, isMine) {
  return new Map(placeTagBoxes(list, side, k, nameOf, isMine).map((p) => [p.key, p.dy]));
}

// ── 찾기 (초성 포함) ──
const JAMO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const cho = (s) => [...s].map((c) => {
  const v = c.charCodeAt(0) - 0xac00;
  return v >= 0 && v <= 11171 ? JAMO[Math.floor(v / 588)] : c;
}).join('');
export const normQuery = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
/** 글자가 들어 있거나, 찾는 말이 초성만이면 초성으로 들어 있나 */
export function pillarHit(text, q) {
  if (!q) return false;
  const t = normQuery(text);
  return t.includes(q) || ([...q].every((c) => JAMO.includes(c)) && cho(t).includes(q));
}

/** 살펴보기 단추 — 과부하 · 캐파 미설정 · 겸임 · 스쿼드 없음 */
export const PILLAR_CHIPS = [
  ['over', (x) => x.total > PILLAR_OVER],
  ['unset', (x) => x.as.some((a) => a.unset)],
  ['multi', (x) => x.as.length > 1],
  ['none', (x) => x.as.length === 0],
];

/** 스쿼드 기간 — `D-n` · 종료일 없음 · 종료일 n일 지남. today 는 'YYYY-MM-DD' */
export function squadPeriod(squad, today) {
  if (!squad?.endDate) return { kind: 'open' };
  const day = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const diff = Math.round((day(squad.endDate) - day(today)) / 86400000);
  return diff < 0 ? { kind: 'overdue', days: -diff } : { kind: 'left', days: diff };
}
