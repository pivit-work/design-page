/**
 * 스쿼드 «한눈에» 무대의 자리 계산 (pivit-work PW-2607 · 기획 screen-org-chart-squad.policy.md §5-7).
 * 화면 부품과 떼어 둔 순수 함수다 — 같은 입력이면 같은 자리가 나온다.
 *
 * 바닥 좌표(x, y)를 등각(30°)으로 비춘다. 팀 판 배치와 스쿼드 판 배치를 함께 내고,
 * 블록 하나가 두 자리(팀 → 스쿼드)를 갖는다. 겸임은 배정 하나당 블록 하나다.
 */
import { isCountedStatus } from './squad-constants.js';

export const ISO = {
  cos: 0.866, sin: 0.5,
  pad: 12, gapX: 48, gapY: 120, rowW: 1000,
  slab: 10, lift: 56,
  cell: 88, block: 20, blockH: 16, headRatio: 1.7,
  tagW: 96, tagH: 34,
};
export const ISO_ZOOM_MIN = 0.4;
export const ISO_ZOOM_MAX = 1.5;
export const ISO_VIEW_MAX_H = 760;
/** 이보다 블록이 많으면 재생하지 않는다 — 움직임이 끊겨 약 2.4초 안에 끝나지 않는다(규모 · 기획서에 없어 개발이 정함). */
export const ISO_PLAY_MAX_BLOCKS = 500;
export const ISO_FAMILIES = ['dev', 'design', 'pm', 'biz', 'ops'];

export const isoPoint = (x, y, z = 0) => [(x - y) * ISO.cos, (x + y) * ISO.sin - z];
export const isoPoints = (list) => list.map(([x, y, z]) => isoPoint(x, y, z).map((v) => v.toFixed(1)).join(',')).join(' ');

/** 판 자리 — 한 줄을 x 로 채우고 넘치면 y 로 다음 줄. 사람 수에 맞춰 판 크기가 정해진다. */
function layoutSlabs(counts) {
  const slabs = [];
  let x = 0; let y = 0; let rowD = 0; let w = 0;
  counts.forEach((n) => {
    const cols = Math.max(2, Math.ceil(Math.sqrt(n)));
    const rows = Math.max(1, Math.ceil(n / cols));
    const sw = cols * ISO.cell + ISO.pad * 2;
    const sd = rows * ISO.cell + ISO.pad * 2;
    if (x > 0 && x + sw > ISO.rowW) { x = 0; y += rowD + ISO.gapY; rowD = 0; }
    slabs.push({ x, y, w: sw, d: sd, cols });
    w = Math.max(w, x + sw);
    x += sw + ISO.gapX;
    rowD = Math.max(rowD, sd);
  });
  return { slabs, w, h: y + rowD };
}

const slotOf = (s, k) => ({
  x: s.x + ISO.pad + ((k % s.cols) + 0.5) * ISO.cell,
  y: s.y + ISO.pad + (Math.floor(k / s.cols) + 0.5) * ISO.cell,
});

const teamKeyOf = (p) => {
  if (p.unitKind === 'unit' && p.unitId) return `u:${p.unitId}`;
  return p.unitKind === 'ceo' || p.unitKind === 'ceoDirect' ? p.unitKind : 'unassigned';
};

/** 가장 많은 직군 — 판 앞면 띠와 «직군» 글자. 전원 미지정이면 null. 같으면 범례 순서가 앞선 것. */
function topFamily(list) {
  let best = null; let bestN = 0;
  ISO_FAMILIES.forEach((f) => {
    const n = list.filter((p) => p.jobFamilyGroup === f).length;
    if (n > bestN) { best = f; bestN = n; }
  });
  return best;
}

/**
 * @param {object} args
 * @param {Array} args.squads  스쿼드 응답. 준비중·진행중만 그린다.
 * @param {Array} args.people  명부(주 소속·직군이 실린 사람)
 * @returns 팀·스쿼드 판, 블록, 바닥 크기
 */
export function isoScene({ squads, people }) {
  const shownSquads = squads.filter((sq) => isCountedStatus(sq.status));
  const byId = new Map(people.map((p) => [p.id, p]));
  // 명부에 없는 사람도 스쿼드 판에는 선다. 팀 판은 «미배정»에서 출발한다(엣지 80).
  shownSquads.forEach((sq) => (sq.members || []).forEach((m) => {
    if (!byId.has(m.userId)) byId.set(m.userId, { id: m.userId, name: '', unknown: true });
  }));
  const persons = [...byId.values()];

  const teamMap = new Map();
  persons.forEach((p) => {
    const key = teamKeyOf(p);
    if (!teamMap.has(key)) {
      teamMap.set(key, { key, kind: p.unitKind === 'unit' && p.unitId ? 'unit' : key, name: p.unitKind === 'unit' ? p.unitName : '', order: p.unitOrder ?? Number.MAX_SAFE_INTEGER, headId: null, people: [] });
    }
    const team = teamMap.get(key);
    team.people.push(p);
    if (p.unitHeadId) team.headId = p.unitHeadId;
  });
  const teams = [...teamMap.values()].sort((a, b) => a.order - b.order);
  teams.forEach((t) => {
    t.family = topFamily(t.people);
    // 조직장은 판의 맨 앞 칸. 조직장이 다른 팀 소속이면 이 판에 높은 블록은 없다(엣지 84와 같다 — 지어내지 않는다).
    t.people = [...t.people].sort((a, b) => (b.id === t.headId) - (a.id === t.headId));
    t.head = t.headId ? byId.get(t.headId) ?? null : null;
    t.hasHeadHere = t.people.some((p) => p.id === t.headId);
  });

  const assigned = new Set(shownSquads.flatMap((sq) => (sq.members || []).map((m) => m.userId)));
  const noSquad = persons.filter((p) => !assigned.has(p.id));
  const squadRows = shownSquads.map((sq) => {
    const members = [...(sq.members || [])].sort((a, b) => (b.role === 'lead') - (a.role === 'lead'));
    const list = members.map((m) => byId.get(m.userId));
    const counts = ISO_FAMILIES.map((f) => ({ family: f, n: list.filter((p) => p.jobFamilyGroup === f).length })).filter((c) => c.n > 0);
    const unset = list.length - counts.reduce((a, c) => a + c.n, 0);
    const lead = members.find((m) => m.role === 'lead');
    return { squad: sq, members, familyCounts: counts, unsetCount: unset, lead: lead ? byId.get(lead.userId) : null };
  });

  const teamLay = layoutSlabs(teams.map((t) => t.people.length));
  const squadCounts = [...squadRows.map((r) => r.members.length), ...(noSquad.length ? [noSquad.length] : [])];
  const squadLay = layoutSlabs(squadCounts);
  const floorW = Math.max(teamLay.w, squadLay.w);
  const floorH = Math.max(teamLay.h, squadLay.h);
  [teamLay, squadLay].forEach((lay) => {
    const ox = (floorW - lay.w) / 2; const oy = (floorH - lay.h) / 2;
    lay.slabs.forEach((s) => { s.x += ox; s.y += oy; });
  });

  const teamAt = new Map();
  teams.forEach((t, ti) => t.people.forEach((p, k) => teamAt.set(p.id, slotOf(teamLay.slabs[ti], k))));
  const headIds = new Set(teams.filter((t) => t.hasHeadHere).map((t) => t.headId));
  const teamOfPerson = new Map();
  teams.forEach((t) => t.people.forEach((p) => teamOfPerson.set(p.id, t)));

  const blocks = [];
  const seen = new Set();
  const push = (p, squadId, lead, slab, k) => {
    blocks.push({
      key: `${p.id}::${squadId ?? '-'}`,
      person: p,
      team: teamOfPerson.get(p.id),
      lead,
      head: headIds.has(p.id),
      none: squadId == null,
      teamAt: teamAt.get(p.id),
      squadAt: slotOf(slab, k),
      dup: seen.has(p.id), // 팀 판에서는 첫 블록만 남긴다 — 겸임 블록이 한 자리로 모인다
    });
    seen.add(p.id);
  };
  squadRows.forEach((r, si) => r.members.forEach((m, k) => push(byId.get(m.userId), r.squad.id, m.role === 'lead', squadLay.slabs[si], k)));
  noSquad.forEach((p, k) => push(p, null, false, squadLay.slabs[squadRows.length], k));

  return {
    teams, teamSlabs: teamLay.slabs,
    squadRows, squadSlabs: squadLay.slabs,
    noSquadCount: noSquad.length, noSquadSlab: noSquad.length ? squadLay.slabs[squadRows.length] : null,
    persons, personById: byId, teamOfPerson, blocks, floorW, floorH,
    squadsOf: (id) => shownSquads.filter((sq) => (sq.members || []).some((m) => m.userId === id)),
  };
}

/**
 * 글자가 칸을 넘으면 말줄임 — 한글은 글자 크기만큼, 영문·숫자는 그 0.58배로 어림한다(기획서 엣지 85).
 * 이름표 폭은 늘리지 않는다 — 늘리면 옆 칸 이름표와 겹친다.
 */
export function isoFit(text, maxPx, fontPx) {
  let w = 0; let out = '';
  for (const ch of String(text || '')) {
    const cw = /[ㄱ-힣]/.test(ch) ? fontPx : fontPx * 0.58;
    if (w + cw > maxPx) return `${out}…`;
    w += cw; out += ch;
  }
  return out;
}
