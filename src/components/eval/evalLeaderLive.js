/**
 * PW-1594 — 진행 현황 「하향 평가자」(오픈 뒤) 표의 순수 판정. 정책 screen-eval-cycle-hr.policy.md §5.13.6.
 *
 * 칸 = 서버 `GET /eval-cycles/:id/leader-assignments` 의 `rows[].cells[]` 한 칸
 *   `{ id, round, evaluatorId, evaluatorName, recommendedEvaluatorId, recommendedName, origin, skipped,
 *      state: 'waiting_prev'|'open'|'in_progress'|'submitted'|'skipped', submittedAt, resigned }`
 *
 * 🔴 열림(state)은 서버만 정한다 — 화면이 아래 차수 제출 여부로 다시 재지 않는다(§5.13.6 「서버 판정」).
 */

/** 캘리브레이션이 확정된 뒤의 사이클 단계 — 표는 조회 전용이다(§5.13.6 「캘리브레이션 확정 뒤」). */
export const LEADER_LIVE_READONLY_STATUSES = ['report_review', 'hr_review', 'done'];

export function isLeaderLiveReadOnly(status) {
  return LEADER_LIVE_READONLY_STATUSES.includes(String(status ?? ''));
}

/** 차수별 배정이 하나라도 있나 — 옛 사이클(배정 행 없음)은 블록을 그리지 않는다. */
export function hasLeaderLiveAssignments(rows) {
  return (rows ?? []).some((r) => Array.isArray(r?.cells) && r.cells.length > 0);
}

/** 칸이 «건너뜀»인가 — 건너뛰었거나 평가자가 없다. */
export function isLiveCellSkipped(cell) {
  return !!cell?.skipped || cell?.state === 'skipped' || !cell?.evaluatorId;
}

/**
 * 칸 배지 — `{ key, tone }` 또는 null(건너뜀 칸은 배지 없이 `건너뜀` 글만).
 * key 는 라벨 키(`liveWaiting` …), tone 은 `.evc-status-badge` 의 색.
 * 퇴사자(미제출)는 열림 상태보다 퇴사를 먼저 보인다 — HR 이 바꿔야 할 칸이다.
 */
export function liveCellBadge(cell) {
  if (!cell || isLiveCellSkipped(cell)) return null;
  if (cell.state === 'submitted') return { key: 'liveSubmitted', tone: 'tone-success' };
  if (cell.resigned) return { key: 'liveResigned', tone: 'tone-error' };
  if (cell.state === 'waiting_prev') return { key: 'liveWaiting', tone: 'tone-neutral' };
  if (cell.state === 'in_progress') return { key: 'liveInProgress', tone: 'tone-warn' };
  return { key: 'liveOpen', tone: 'tone-info' };
}

/**
 * 칸에서 HR 이 할 수 있는 것(§5.13.6 표).
 *   locked       제출된 칸 — 아무것도 못 한다(툴팁으로 이유)
 *   canEdit      팝오버를 연다(교체·건너뛰기 · 건너뜀 칸은 사람 지정 = 되살리기)
 *   canSkip      이미 건너뛴 칸은 다시 건너뛰지 않는다
 *   canForceOpen 앞 차수 대기 칸만 `앞 차수 없이 열기`
 *   confirmReplace 작성 중 칸 교체는 임시저장이 넘어가지 않는다는 확인을 거친다
 */
export function liveCellActions(cell, readOnly = false) {
  const locked = cell?.state === 'submitted';
  const skipped = isLiveCellSkipped(cell);
  const editable = !readOnly && !locked && !!cell?.id;
  return {
    locked,
    canEdit: editable,
    canSkip: editable && !skipped,
    canForceOpen: editable && !skipped && cell?.state === 'waiting_prev',
    confirmReplace: editable && !skipped && cell?.state === 'in_progress',
  };
}

/** `2026-10-09T…` → `10/09`(로컬). 못 읽으면 ''. */
export function formatMonthDay(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}/${p(d.getDate())}`;
}

/** 칸 하나를 id 로 갈아 끼운 새 rows. 바뀐 것이 없으면 같은 배열. */
export function replaceLiveCell(rows, next) {
  if (!next?.id) return rows;
  let changed = false;
  const out = (rows ?? []).map((r) => {
    if (!r.cells?.some((c) => c.id === next.id)) return r;
    changed = true;
    return { ...r, cells: r.cells.map((c) => (c.id === next.id ? { ...c, ...next } : c)) };
  });
  return changed ? out : rows;
}

/** 칸 id 로 찾기 — `{ row, cell }` 또는 null. */
export function findLiveCell(rows, id) {
  for (const row of rows ?? []) {
    const cell = row.cells?.find((c) => c.id === id);
    if (cell) return { row, cell };
  }
  return null;
}

/** 차수 수 — 서버가 준 `rounds` 가 없으면 칸에서 가장 높은 차수. */
export function liveRoundCount(rounds, rows) {
  const n = Math.trunc(Number(rounds));
  if (Number.isFinite(n) && n >= 1) return n;
  let max = 1;
  (rows ?? []).forEach((r) => (r.cells ?? []).forEach((c) => (max = Math.max(max, c.round || 1))));
  return max;
}

/**
 * 캘리브레이션 표 「하향 등급」 칸의 딸린 표시(spec-calibration §20.1).
 * `leaderGrade` = `{ value, round, missingHigherRound, originChanged }` | undefined.
 *   none      값·차수가 모두 비었다(배정 차수가 전부 건너뜀) → `하향 없음`
 *   round     값이 나온 차수(배지 `2차`) — 위 차수 미제출이면 대신 `missing` 배지
 *   missing   `{ higher, round }` → `3차 미제출 · 2차 등급`
 *   changed   `원안 변경됨`
 */
export function leaderGradeMarks(leaderGrade) {
  if (!leaderGrade || typeof leaderGrade !== 'object') return null;
  const value = leaderGrade.value ?? null;
  const round = Number.isFinite(leaderGrade.round) ? leaderGrade.round : null;
  const higher = Number.isFinite(leaderGrade.missingHigherRound) ? leaderGrade.missingHigherRound : null;
  const none = !value && round == null;
  return {
    none,
    // 값이 아직 없으면(아무 차수도 안 냈다) 차수 배지를 달지 않는다 — 빈 칸에 `1차` 만 뜬다.
    round: !none && value && higher == null ? round : null,
    missing: !none && higher != null && round != null ? { higher, round } : null,
    changed: !!leaderGrade.originChanged,
  };
}
