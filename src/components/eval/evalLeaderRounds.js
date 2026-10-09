/**
 * PW-1594 — 하향 평가 차수(N차)의 순수 판정. 정책 screen-eval-cycle-hr.policy.md §5.13 ·
 * 결정 spec-eval-cycle.md §4.1.1-I(D-1~D-8).
 *
 * 위자드(EvalCycleWizard)의 1·2·3·4·6단계가 같은 규칙을 본다 — 단계 id 를 펼치는 법, 묶음 이동,
 * 등급 체계 일치, 배정 칸 경고. 컴포넌트 안에 두면 단계마다 규칙이 한 벌씩 생겨 한쪽이 뒤처진다.
 *
 * 🔴 단계 id 는 기획서의 `manager` 가 아니라 코드의 `leader` 다. k차 = `leader`(1차) · `leader_2` · … ·
 *    `leader_N`. `reviewSequence` 의 order·enabled·schedule·templateMap·reminders 가 모두 이 id 를 키로 쓴다.
 */

export const LEADER_BASE_ID = 'leader';
const LEADER_ROUND_RE = /^leader_(\d+)$/;

/** k차 단계 id. 1차는 종전 그대로 `leader`. */
export function leaderPhaseId(k) {
  return k <= 1 ? LEADER_BASE_ID : `${LEADER_BASE_ID}_${k}`;
}

/** 단계 id 의 하향 차수. 하향 단계가 아니면 0. */
export function leaderRoundOf(id) {
  if (id === LEADER_BASE_ID) return 1;
  const m = LEADER_ROUND_RE.exec(String(id ?? ''));
  return m ? Number(m[1]) : 0;
}

export const isLeaderPhaseId = (id) => leaderRoundOf(id) > 0;

/** `leader_3` → `leader`. 담당·리마인더 당사자·평가 유형 같은 «종류» 표는 이 값으로 읽는다. */
export function phaseBaseId(id) {
  return isLeaderPhaseId(id) ? LEADER_BASE_ID : id;
}

/** 1~n차 단계 id. */
export function leaderPhaseIds(n) {
  const rounds = Math.max(1, Math.trunc(Number(n) || 1));
  return Array.from({ length: rounds }, (_, i) => leaderPhaseId(i + 1));
}

/** 차수 값을 1 이상 정수로 눕힌다(저장값이 비거나 깨졌을 때). */
export function clampLeaderRounds(n) {
  const v = Math.trunc(Number(n));
  return Number.isFinite(v) && v >= 1 ? v : 1;
}

/**
 * 단계 목록의 `leader` 하나를 n개로 펼친다. n=1 이면 그대로 둔다(이름에 차수를 붙이지 않는다 —
 * 1차만 쓰는 사이클의 화면이 바뀌지 않게). 펼친 단계에는 `round` 가 붙는다.
 */
export function expandLeaderPhases(phases, n) {
  const rounds = clampLeaderRounds(n);
  if (rounds <= 1) return phases;
  return phases.flatMap((p) =>
    p.id === LEADER_BASE_ID
      ? Array.from({ length: rounds }, (_, i) => ({
          ...p,
          id: leaderPhaseId(i + 1),
          round: i + 1,
          leaderGroup: true,
        }))
      : [p],
  );
}

/**
 * 순서 배열에서 하향 차수 단계를 «연속 · 오름차순» 한 묶음으로 맞춘다(§5.13.3 · 서버도 오픈 때 본다).
 * 묶음은 순서 안에서 처음 나온 차수 단계 자리에 선다. n 보다 큰 차수는 버리고, 순서에 없는 차수는
 * 묶음 끝에 붙인다. 하향 단계가 하나도 없으면 손대지 않는다.
 */
export function normalizeLeaderOrder(order, n) {
  const rounds = clampLeaderRounds(n);
  const list = (order ?? []).filter((id) => {
    const k = leaderRoundOf(id);
    return k === 0 || k <= rounds;
  });
  const at = list.findIndex(isLeaderPhaseId);
  if (at < 0) return list;
  const rest = list.filter((id) => !isLeaderPhaseId(id));
  const before = list.slice(0, at).filter((id) => !isLeaderPhaseId(id)).length;
  return [...rest.slice(0, before), ...leaderPhaseIds(rounds), ...rest.slice(before)];
}

/**
 * 끌어 놓기. 하향 차수 단계는 한 묶음으로 움직인다 — 어느 차수를 끌어도 묶음 전체가 옮겨 가고,
 * 묶음 안 순서는 바꾸지 않는다(순차 작성 · D-3). 묶음이 아닌 단계를 묶음에 놓으면 묶음 앞(위로)이나
 * 뒤(아래로)로 간다 — 묶음 사이에 끼지 않는다. 옮길 수 없으면 `null`.
 */
export function moveGroupedPhase(order, dragId, targetId) {
  const grp = (id) => phaseBaseId(id);
  if (!dragId || !targetId || grp(dragId) === grp(targetId)) return null;
  const from = order.findIndex((id) => grp(id) === grp(dragId));
  const toOrig = order.findIndex((id) => grp(id) === grp(targetId));
  if (from < 0 || toOrig < 0) return null;
  const moving = order.filter((id) => grp(id) === grp(dragId));
  const rest = order.filter((id) => grp(id) !== grp(dragId));
  const to =
    from < toOrig
      ? rest.map(grp).lastIndexOf(grp(targetId)) + 1
      : rest.findIndex((id) => grp(id) === grp(targetId));
  return [...rest.slice(0, to), ...moving, ...rest.slice(to)];
}

/**
 * 키가 단계 id 인 객체(templateMap·schedule·reminders·enabled)에서 n차를 넘는 차수 키를 지운다.
 * 바뀐 것이 없으면 같은 객체를 돌려준다(상태를 괜히 새로 만들지 않게).
 */
export function dropRoundsAbove(obj, n) {
  if (!obj || typeof obj !== 'object') return obj;
  const keys = Object.keys(obj).filter((k) => leaderRoundOf(k) > n);
  if (keys.length === 0) return obj;
  const next = { ...obj };
  keys.forEach((k) => delete next[k]);
  return next;
}

/** 하향 단계 키를 전부 지운다(1단계에서 하향을 끌 때 · L13). */
export function dropAllLeaderKeys(obj) {
  return dropRoundsAbove(obj, 0);
}

/* ── 등급 체계 일치 (§5.13.2 · D-5) ──────────────────────────────────────────── */

/** 등급 체계 지문 — 등급 키(이름)와 순서. 비율·설명은 보지 않는다. */
export function gradeSignature(grades) {
  return (grades ?? []).map((g) => String(g?.label ?? '').trim()).join('\u0001');
}

/**
 * 차수별 등급 체계가 서로 같은가. `entries` = `[{ round, grades }]` — 확정된 차수만 넘긴다.
 * 둘 이상이 있고 지문이 하나가 아니면 `mismatch`. `rounds` 는 안내 문구(`1차: 4단계 · 2차: 5단계`)용.
 */
export function leaderGradeMismatch(entries) {
  const list = (entries ?? []).filter((e) => Array.isArray(e?.grades));
  const sigs = new Set(list.map((e) => gradeSignature(e.grades)));
  return {
    mismatch: list.length > 1 && sigs.size > 1,
    rounds: list
      .slice()
      .sort((a, b) => a.round - b.round)
      .map((e) => ({ round: e.round, count: e.grades.length })),
  };
}

/* ── 하향 평가자 배정 칸 (§5.13.4) ─────────────────────────────────────────── */

/**
 * 칸 = `{ evaluateeId, round, evaluatorId, recommendedEvaluatorId, origin, skipped, warnings? }`.
 *   origin  'recommended' | 'adjusted' — HR 이 손댄 칸(사람 지정·건너뛰기)은 adjusted
 *   skipped HR 이 명시적으로 건너뛴 칸. 평가자 없음(빈 칸)은 skipped 가 아니다
 */
export const cellKey = (evaluateeId, round) => `${evaluateeId}:${round}`;

/** 차단 경고 — 확정을 막는다. */
export const BLOCKING_WARNINGS = ['self', 'resigned'];
export const WARNING_KINDS = ['no_evaluator', 'self', 'duplicate', 'resigned'];

/**
 * 칸마다 경고를 다시 계산한다(HR 이 칸을 바꾼 직후 — 서버가 준 경고는 그 전 값이다).
 * 규칙은 서버와 같다: 평가자 없음(빈 칸·건너뜀 아님) · 본인 · 퇴사자 · 중복(같은 대상자의
 * 앞 차수에 이미 있는 사람 — 뒤 차수 칸에 붙인다).
 *
 * @param {Array} cells
 * @param {(id: string) => boolean} isResigned
 * @returns {Map<string, string[]>} cellKey → 경고 목록
 */
export function computeLeaderWarnings(cells, isResigned = () => false) {
  const out = new Map();
  const byEvaluatee = new Map();
  (cells ?? []).forEach((c) => {
    const list = byEvaluatee.get(c.evaluateeId) ?? [];
    list.push(c);
    byEvaluatee.set(c.evaluateeId, list);
  });
  byEvaluatee.forEach((list) => {
    const seen = new Set();
    list
      .slice()
      .sort((a, b) => a.round - b.round)
      .forEach((c) => {
        const w = [];
        const ev = c.skipped ? null : c.evaluatorId ?? null;
        if (!ev && !c.skipped) w.push('no_evaluator');
        if (ev && ev === c.evaluateeId) w.push('self');
        if (ev && isResigned(ev)) w.push('resigned');
        if (ev) {
          if (seen.has(ev)) w.push('duplicate');
          seen.add(ev);
        }
        out.set(cellKey(c.evaluateeId, c.round), w);
      });
  });
  return out;
}

/** 경고 종류별 건수와 합계 · 차단 건수. */
export function summarizeLeaderWarnings(warningsByCell, visibleKeys = null) {
  const counts = { no_evaluator: 0, self: 0, duplicate: 0, resigned: 0 };
  warningsByCell.forEach((list, key) => {
    if (visibleKeys && !visibleKeys.has(key)) return;
    list.forEach((k) => {
      if (k in counts) counts[k] += 1;
    });
  });
  const total = counts.no_evaluator + counts.self + counts.duplicate + counts.resigned;
  return { ...counts, total, blocking: counts.self + counts.resigned };
}

/** 빈 칸(추천도 사람도 없음). 추천을 아직 못 받았거나 체인이 짧을 때. */
export function emptyLeaderCell(evaluateeId, round) {
  return {
    evaluateeId,
    round,
    evaluatorId: null,
    recommendedEvaluatorId: null,
    origin: 'recommended',
    skipped: false,
  };
}

/**
 * 칸 목록을 «대상 명단 × 1~n차» 로 맞춘다. 명단 순서·차수 오름차순으로 정렬하고, 명단에 없는
 * 사람·n 을 넘는 차수의 칸은 버리고, 없는 칸은 빈 칸으로 채운다(§5.13.4 명단 변경 · 차수 변경).
 */
export function alignLeaderCells(cells, evaluateeIds, n) {
  const rounds = clampLeaderRounds(n);
  const byKey = new Map((cells ?? []).map((c) => [cellKey(c.evaluateeId, c.round), c]));
  const out = [];
  (evaluateeIds ?? []).forEach((id) => {
    for (let k = 1; k <= rounds; k += 1) {
      out.push(byKey.get(cellKey(id, k)) ?? emptyLeaderCell(id, k));
    }
  });
  return out;
}

/**
 * 서버 추천을 지금 칸에 얹는다. HR 이 손댄 칸(adjusted — 사람 지정·건너뛰기)은 덮지 않는다.
 * `changed` = 손대지 않은 칸 중 평가자가 바뀐 칸 수(§5.13.4 「조직 변경으로 추천이 바뀐 칸 {x}개」).
 * 처음 받는 추천(이전 칸이 없던 자리)은 바뀐 것으로 세지 않는다.
 */
export function mergeRecommendedCells(prevCells, serverCells) {
  const prev = new Map((prevCells ?? []).map((c) => [cellKey(c.evaluateeId, c.round), c]));
  let changed = 0;
  const cells = (serverCells ?? []).map((s) => {
    const key = cellKey(s.evaluateeId, s.round);
    const old = prev.get(key);
    if (old && old.origin === 'adjusted') {
      return { ...old, recommendedEvaluatorId: s.recommendedEvaluatorId ?? null, computed: true };
    }
    const next = {
      evaluateeId: s.evaluateeId,
      round: s.round,
      evaluatorId: s.skipped ? null : s.evaluatorId ?? null,
      recommendedEvaluatorId: s.recommendedEvaluatorId ?? null,
      origin: s.origin === 'adjusted' ? 'adjusted' : 'recommended',
      skipped: !!s.skipped,
      warnings: Array.isArray(s.warnings) ? s.warnings : undefined,
      // 추천을 한 번이라도 받은 칸 — 다음 추천에서 «바뀌었다»를 셀 수 있는 칸이다.
      computed: true,
    };
    if (old?.computed && (old.evaluatorId ?? null) !== next.evaluatorId) {
      changed += 1;
    }
    return next;
  });
  return { cells, changed };
}

/**
 * 칸에 사람을 지정한다 → 조정됨. 추천받은 바로 그 사람을 고르면 추천으로 돌아간다 — 「조정됨」은
 * 추천과 다르다는 표시라, 같은 사람인데 조정됨으로 남으면 HR 이 무엇을 바꿨는지 읽을 수 없다.
 */
export function assignLeaderCell(cell, evaluatorId) {
  const origin =
    cell.recommendedEvaluatorId && evaluatorId === cell.recommendedEvaluatorId
      ? 'recommended'
      : 'adjusted';
  return { ...cell, evaluatorId, skipped: false, origin, warnings: undefined };
}

/** 이 차수 건너뛰기 → 조정됨 · 건너뜀. */
export function skipLeaderCell(cell) {
  return { ...cell, evaluatorId: null, skipped: true, origin: 'adjusted', warnings: undefined };
}

/** 추천으로 되돌리기 — 추천이 없으면 평가자 없음. */
export function revertLeaderCell(cell) {
  return {
    ...cell,
    evaluatorId: cell.recommendedEvaluatorId ?? null,
    skipped: false,
    origin: 'recommended',
    warnings: undefined,
  };
}

/**
 * 확정에 실을 칸. 평가자 없음 칸은 건너뜀으로 저장한다(D-6 · §5.13.4 「확정」).
 * 화면용 `warnings` 는 싣지 않는다.
 */
export function cellsForConfirm(cells) {
  return (cells ?? []).map((c) => {
    const empty = !c.skipped && !c.evaluatorId;
    return {
      evaluateeId: c.evaluateeId,
      round: c.round,
      evaluatorId: c.skipped || empty ? null : c.evaluatorId,
      recommendedEvaluatorId: c.recommendedEvaluatorId ?? null,
      origin: c.origin === 'adjusted' ? 'adjusted' : 'recommended',
      skipped: !!c.skipped || empty,
    };
  });
}

/** 6단계 요약 — 배정 칸 수 · 건너뜀(평가자 없음 포함) 칸 수. */
export function leaderAssignmentCounts(cells) {
  let assigned = 0;
  let skipped = 0;
  (cells ?? []).forEach((c) => {
    if (!c.skipped && c.evaluatorId) assigned += 1;
    else skipped += 1;
  });
  return { assigned, skipped };
}

/**
 * L2 — 최고 차수 열에 추천 평가자가 있는 대상자가 하나도 없다(1단계에서 차수를 너무 높게 골랐다).
 * 대상이 없거나 n=1 이면 판정하지 않는다.
 */
export function topRoundHasNoRecommendation(cells, n) {
  const rounds = clampLeaderRounds(n);
  if (rounds <= 1) return false;
  const top = (cells ?? []).filter((c) => c.round === rounds);
  return top.length > 0 && top.every((c) => !c.recommendedEvaluatorId);
}

/** 대표 행 — 모든 차수 칸에 추천이 없다(체인이 비었다 · L1). */
export function rowHasNoChain(rowCells) {
  return rowCells.length > 0 && rowCells.every((c) => !c.recommendedEvaluatorId);
}
