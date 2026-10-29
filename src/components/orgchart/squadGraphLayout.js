/**
 * 스쿼드 그림 보기의 자리 계산 (pivit-work PW-2356 · 기획 screen-org-chart-squad.policy.md §5-6).
 *
 * 화면 부품(`SquadGraphView`)과 떼어 둔 순수 함수다 — 배치 규칙(평균 위치 → 조직도 순서 → 리드 → 이름)과
 * 칩 자리 찾기를 화면 없이 시험하려고.
 *
 * 세 줄: 위 담당 프로젝트 · 가운데 스쿼드 · 아래 사람. 사람·프로젝트는 «이어진 스쿼드들의 평균 x» 순으로
 * 세운다 — 겸임자는 두 스쿼드 사이로, 협업 프로젝트는 두 스쿼드 위 가운데로 가서 선이 덜 엇갈린다.
 */
import { isCapacityUnset } from './squad-constants.js';

export const GRAPH_GEOM = {
  padX: 24,
  minW: 1102, // 매트릭스 판(.sq-panel) 안쪽 폭 — 이보다 넓으면 판 안에서 가로로 민다
  sqW: 200,
  sqH: 76,
  pjW: 168,
  pjH: 56,
  pR: 20, // 사람 아바타 반지름(매트릭스 이름 칸 사진 40)
  yPj: 16,
  ySq: 152,
  yP: 480, // 사람 아바타 중심 — 스쿼드와 사람 사이를 넓혀 칩 자리를 만든다
  personGap: 132,
  chipW: 76,
  chipH: 40,
  personFoot: 76, // 아바타 아래 이름 · 직함·소속 · 합계 세 줄
};

/** 칩을 놓아 볼 자리 — 사람 쪽(0)에서 스쿼드 쪽(1)으로, 선을 따라 차례로(§5-6 「칩 자리」). */
const CHIP_STEPS = [0.3, 0.42, 0.54, 0.2, 0.66, 0.78];

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * @param {object} args
 * @param {Array} args.squads 켜진 상태의 스쿼드(필터를 거친 것) — 화면에 그릴 순서
 * @param {(userId: string) => { name?: string, unitOrder?: number } | undefined} args.personOf 명부 조회
 * @returns {{ width, height, squadX, squadNodes, personNodes, projectNodes, memberEdges, projectEdges }}
 */
export function squadGraphLayout({ squads, personOf }) {
  const G = GRAPH_GEOM;

  // ── 사람 — 켜진 스쿼드의 배정에서만 모은다(배정이 없는 사람은 그리지 않는다) ──
  const people = new Map();
  squads.forEach((sq, si) => (sq.members || []).forEach((m) => {
    let p = people.get(m.userId);
    if (!p) {
      const meta = personOf(m.userId) || {};
      p = {
        userId: m.userId,
        name: meta.name || '',
        // 조직도 순서 — 명부가 준 값. 없으면(미배정·명부 밖) 맨 뒤
        unitOrder: Number.isFinite(meta.unitOrder) ? meta.unitOrder : Number.MAX_SAFE_INTEGER,
        links: [],
        isLead: false,
      };
      people.set(m.userId, p);
    }
    p.links.push({ si, squad: sq, member: m });
    if (m.role === 'lead') p.isLead = true;
  }));

  // ── 프로젝트 — 켜진 스쿼드에 이어진 것만(미배속·꺼진 스쿼드에만 붙은 것은 그리지 않는다) ──
  const projects = new Map();
  const projectEdgesRaw = [];
  squads.forEach((sq, si) => (sq.projects || []).forEach((pj) => {
    let p = projects.get(pj.id);
    if (!p) { p = { project: pj, sis: [] }; projects.set(pj.id, p); }
    p.sis.push(si);
    projectEdgesRaw.push({ si, squad: sq, project: pj, isPrimary: !!pj.isPrimary });
  }));

  const personList = [...people.values()];
  const projectList = [...projects.values()];
  const width = Math.max(
    G.minW,
    squads.length * (G.sqW + 48),
    personList.length * G.personGap + G.padX * 2,
    projectList.length * (G.pjW + 24) + G.padX * 2,
  );
  const inner = width - G.padX * 2;
  const squadX = (si) => G.padX + ((si + 0.5) * inner) / squads.length;

  // 같은 자리면 주 소속 조직 단위의 조직도 순서 → 리드 먼저 → 이름 가나다(§5-6 「배치」 v3.29) —
  // 한 스쿼드 아래 같은 기능 조직 사람이 붙어 선다.
  personList.forEach((p) => { p.bary = mean(p.links.map((l) => squadX(l.si))); });
  personList.sort((a, b) => a.bary - b.bary
    || a.unitOrder - b.unitOrder
    || Number(b.isLead) - Number(a.isLead)
    || a.name.localeCompare(b.name, 'ko'));
  personList.forEach((p, j) => { p.x = G.padX + ((j + 0.5) * inner) / personList.length; });

  projectList.forEach((p) => { p.bary = mean(p.sis.map(squadX)); });
  projectList.sort((a, b) => a.bary - b.bary || a.project.name.localeCompare(b.project.name, 'ko'));
  projectList.forEach((p, j) => { p.x = G.padX + ((j + 0.5) * inner) / projectList.length; });

  // ── 선 위 칩 자리 — 사람 쪽에서 출발해 선을 따라 빈 자리를 찾는다. 없으면 첫 자리(엣지 76) ──
  const placed = [];
  const memberEdges = [];
  personList.forEach((p) => p.links.forEach(({ squad, member, si }) => {
    const x2 = squadX(si);
    const y2 = G.ySq + G.sqH;
    const x1 = p.x;
    const y1 = G.yP - G.pR - 6;
    let best = null;
    for (const t of CHIP_STEPS) {
      const cx = x1 + (x2 - x1) * t;
      const cy = y1 + (y2 - y1) * t;
      const box = { x: cx - G.chipW / 2 - 3, y: cy - G.chipH / 2 - 3, w: G.chipW + 6, h: G.chipH + 6 };
      const free = !placed.some((q) => overlaps(box, q));
      if (!best) best = { cx, cy, box };
      if (free) { best = { cx, cy, box }; break; }
    }
    placed.push(best.box);
    memberEdges.push({
      userId: p.userId, squad, member, x1, y1, x2, y2, cx: best.cx, cy: best.cy,
      capUnset: isCapacityUnset(member),
    });
  }));

  const projectEdges = projectEdgesRaw.map((e) => ({
    ...e,
    x1: projects.get(e.project.id).x,
    y1: G.yPj + G.pjH,
    x2: squadX(e.si),
    y2: G.ySq,
  }));

  return {
    width,
    height: G.yP + G.pR + G.personFoot,
    squadX,
    squadNodes: squads.map((sq, si) => ({ squad: sq, x: squadX(si) })),
    personNodes: personList,
    projectNodes: projectList,
    memberEdges,
    projectEdges,
  };
}

/** 선 굵기 — 캐파 사용% 를 1.5~6px 로(§5-6). 비중은 굵기로 그리지 않는다(§5-3.1). 미설정은 가는 점선. */
export function memberEdgeWidth(member) {
  if (isCapacityUnset(member)) return 1.2;
  return 1.5 + (Math.min(Math.max(member.allocationPct || 0, 0), 100) / 100) * 4.5;
}
