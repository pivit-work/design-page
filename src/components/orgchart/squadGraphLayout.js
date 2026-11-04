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
  sqH: 96, // 이름 · 상태 배지 · «N명 · 리드» 세 줄
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
 * 한 줄에 놓을 노드의 x — 저마다 «이어진 스쿼드들의 평균 x»(bary)에 두되, 서로 gap 보다 가까우면
 * 순서를 지킨 채 그 무리의 가운데를 기준으로 벌린다. 그래서 겸임자는 두 스쿼드 사이에,
 * 한 스쿼드에만 속한 사람들은 그 스쿼드 아래 가운데에 모인다(§5-6 「배치」 · 엣지 73 · TC-ORG-144 기대 4).
 * 고르게 나눠 세우면 순서만 맞고 자리가 어긋났다 — 겸임자가 두 스쿼드보다 왼쪽에 섰다(2026-11-02 브라우저 확인).
 * list 순서대로 세운다 — bary 가 거꾸로 선 이웃은 한 무리로 합쳐 가운데에 둔다. 양 끝은 [lo, hi] 안으로 민다(폭은 n*gap 이 들어가게 잡혀 있다).
 */
function placeOnRow(list, gap, lo, hi) {
  const clusters = [];
  list.forEach((node) => {
    let c = { nodes: [node], sum: node.bary };
    // 무리의 첫 자리 = 평균(bary - k*gap) — 무리 가운데가 bary 들의 가운데에 온다
    c.start = c.sum;
    while (clusters.length) {
      const prev = clusters[clusters.length - 1];
      if (prev.start + prev.nodes.length * gap <= c.start) break;
      clusters.pop();
      const nodes = prev.nodes.concat(c.nodes);
      const sum = nodes.reduce((acc, n, k) => acc + n.bary - k * gap, 0);
      c = { nodes, sum, start: sum / nodes.length };
    }
    clusters.push(c);
  });
  const xs = [];
  clusters.forEach((c) => c.nodes.forEach((n, k) => xs.push(c.start + k * gap)));
  for (let j = 0; j < xs.length; j += 1) xs[j] = Math.max(xs[j], j ? xs[j - 1] + gap : lo);
  for (let j = xs.length - 1; j >= 0; j -= 1) xs[j] = Math.min(xs[j], j < xs.length - 1 ? xs[j + 1] - gap : hi);
  list.forEach((n, j) => { n.x = xs[j]; });
}

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
  const sqGap = G.sqW + 48;
  const pjGap = G.pjW + 24;
  // 스쿼드 x — 스쿼드마다 제 사람 수만큼 폭을 나눠 주고 그 가운데에 둔다(겸임자는 이어진 스쿼드마다 나눠 센다).
  // 고르게 나누면 한 스쿼드에 사람이 몰릴 때 그 사람들이 옆 스쿼드 밑까지 밀려 겸임자가 두 스쿼드 밖에 섰다
  // (브라우저 확인 2026-11-02 송지아 885 · AI 검색 실험 911 · 적대적 리뷰 «줄이 꽉 차면»).
  const weight = squads.map(() => 0);
  personList.forEach((p) => p.links.forEach((l) => { weight[l.si] += 1 / p.links.length; }));
  let segs = weight.map((w) => Math.max(sqGap, w * G.personGap));
  const segSum = segs.reduce((a, b) => a + b, 0);
  const need = Math.max(G.minW - G.padX * 2, projectList.length * pjGap, personList.length * G.personGap);
  if (segSum > 0 && segSum < need) segs = segs.map((w) => (w * need) / segSum);
  const inner = Math.max(need, segs.reduce((a, b) => a + b, 0));
  const width = inner + G.padX * 2;
  const sqXs = [];
  segs.reduce((left, w, si) => { sqXs[si] = G.padX + left + w / 2; return left + w; }, 0);
  const squadX = (si) => sqXs[si];

  const placePeopleAndProjects = () => {
    // 같은 자리면 주 소속 조직 단위의 조직도 순서 → 리드 먼저 → 이름 가나다(§5-6 「배치」 v3.29) —
    // 한 스쿼드 아래 같은 기능 조직 사람이 붙어 선다.
    personList.forEach((p) => { p.bary = mean(p.links.map((l) => squadX(l.si))); });
    personList.sort((a, b) => a.bary - b.bary
      || a.unitOrder - b.unitOrder
      || Number(b.isLead) - Number(a.isLead)
      || a.name.localeCompare(b.name, 'ko'));
    placeOnRow(personList, G.personGap, G.padX + G.personGap / 2, width - G.padX - G.personGap / 2);

    projectList.forEach((p) => { p.bary = mean(p.sis.map(squadX)); });
    projectList.sort((a, b) => a.bary - b.bary || a.project.name.localeCompare(b.project.name, 'ko'));
    placeOnRow(projectList, pjGap, G.padX + pjGap / 2, width - G.padX - pjGap / 2);
  };

  placePeopleAndProjects();

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

/** 줌 범위 — 조직도 트리 캔버스 줌 스택과 같다(40~150% · 기획 §9-G). */
export const GRAPH_ZOOM_MIN = 0.4;
export const GRAPH_ZOOM_MAX = 1.5;
export const GRAPH_VIEW_PAD = 24; // 판 위·아래 여백(--spacing-3xl) — 종전 스크롤 칸의 위아래 여백과 같다

/**
 * 판(폭 `viewW`)에 그림(폭 `graphW` · 높이 `graphH`)을 놓는 첫 자리.
 *  - `fit=false`(처음 · 필터를 바꾼 뒤): 100%. 판보다 좁으면 가운데, 넓으면 왼쪽 끝부터(종전 스크롤 첫 자리와 같다).
 *  - `fit=true`(«맞춤» 버튼): 그림 전체가 판 폭에 들어오게 줄여 가운데. 100% 보다 키우지 않고 40% 아래로 줄이지 않는다.
 */
export function graphPlacement({ viewW, graphW, graphH, fit }) {
  const scale = fit && graphW > 0
    ? Math.min(1, Math.max(GRAPH_ZOOM_MIN, viewW / graphW))
    : 1;
  const w = graphW * scale;
  const x = w <= viewW ? Math.round((viewW - w) / 2) : 0;
  const y = Math.round(GRAPH_VIEW_PAD + (graphH - graphH * scale) / 2);
  return { scale, translate: { x, y } };
}
