/**
 * PW-2066 — 하향 평가자 표 다루기(필터 · 정렬 · 일괄 조정 · 평가자 기준 보기)의 순수 판정.
 * 정책 screen-eval-cycle-hr.policy.md §5.13.10 · spec-eval-cycle §4.1.1-N(T-1~T-6).
 *
 * 오픈 전(4단계 섹션)과 오픈 뒤(진행 현황 블록)가 같은 함수를 쓴다. 두 표는 칸 모양이 달라서
 * 여기서는 행을 `{ id, name, groupId, level, subOrg }` 로, 칸을 `{ evaluateeId, round, evaluatorId,
 * skipped, origin }` 으로만 본다(각 섹션이 맞춰서 넘긴다).
 */
import {
  assignLeaderCell,
  cellKey,
  revertLeaderCell,
  skipLeaderCell,
} from './evalLeaderRounds.js';
import { fill } from './evalTemplateItemModel.js';

/** 상태 칩 — 그 행의 차수 칸 중 하나라도 해당하면 남긴다(T-1). */
export const LEADER_STATUS_FILTERS = ['recommended', 'rule', 'adjusted', 'skipped'];

/** 직급 칩의 `(비어 있음)` 값. */
export const LEADER_LEVEL_EMPTY = '';

/** 정렬 — 기본 «경고 먼저 · 조직 순», 대안 «이름순»(T-2). */
export const LEADER_SORT_WARN = 'warn';
export const LEADER_SORT_NAME = 'name';

export const EMPTY_LEADER_FILTER = Object.freeze({
  groups: [],
  levels: [],
  statuses: [],
});

/** 칸 하나의 상태 칩 값. 평가자 없음 칸은 «추천»(추천이 비었을 뿐 손대지 않은 칸이다). */
export function leaderCellStatus(cell) {
  if (!cell) return null;
  if (cell.skipped) return 'skipped';
  if (cell.origin === 'rule') return 'rule';
  if (cell.origin === 'adjusted') return 'adjusted';
  return 'recommended';
}

/** 칩 필터가 하나라도 켜졌나 — 「전체 보기」와 빈 상태 문구가 이것으로 갈린다. */
export function hasLeaderFilter(f) {
  return !!f && (f.groups.length > 0 || f.levels.length > 0 || f.statuses.length > 0);
}

/**
 * 보이는 행만 고른다. 칩끼리는 AND, 한 칩 안의 값끼리는 OR. 이름 검색·경고만 보기와도 AND.
 * `cellsOf(id)` = 그 행의 칸들, `warned` = 경고 있는 행 id 집합.
 */
export function filterLeaderRows(rows, f, { query = '', warnOnly = false, warned, cellsOf }) {
  const q = String(query ?? '').trim().toLowerCase();
  const groups = new Set(f.groups);
  const levels = new Set(f.levels);
  const statuses = new Set(f.statuses);
  return rows.filter((r) => {
    if (warnOnly && !warned.has(r.id)) return false;
    if (q && !String(r.name ?? '').toLowerCase().includes(q)) return false;
    if (groups.size > 0 && !groups.has(r.groupId)) return false;
    if (levels.size > 0 && !levels.has(r.level || LEADER_LEVEL_EMPTY)) return false;
    if (statuses.size > 0 && !cellsOf(r.id).some((c) => statuses.has(leaderCellStatus(c)))) {
      return false;
    }
    return true;
  });
}

const collator = new Intl.Collator('ko');

/**
 * 묶음 안의 행 순서. 기본 = 경고 있는 행 먼저 → 하위 조직 → 이름, `이름순` = 이름만.
 * 묶음(최상위 조직) 순서는 부르는 쪽이 묶음 목록 순서로 정한다(T-2 — 묶음이 맨 바깥이다).
 */
export function sortLeaderRows(rows, mode, warned) {
  const byName = (a, b) => collator.compare(String(a.name ?? ''), String(b.name ?? ''));
  const out = [...rows];
  if (mode === LEADER_SORT_NAME) return out.sort(byName);
  return out.sort(
    (a, b) =>
      Number(warned.has(b.id)) - Number(warned.has(a.id)) ||
      collator.compare(String(a.subOrg ?? ''), String(b.subOrg ?? '')) ||
      byName(a, b),
  );
}

/** 행 목록에 나오는 직급 값(가나다순) — 빈 값이 있으면 맨 끝에 `(비어 있음)`. */
export function leaderLevelOptions(rows) {
  const vals = new Set();
  let empty = false;
  rows.forEach((r) => (r.level ? vals.add(r.level) : (empty = true)));
  const out = [...vals].sort((a, b) => collator.compare(a, b));
  return empty ? [...out, LEADER_LEVEL_EMPTY] : out;
}

/**
 * 평가자 기준 보기(T-4) — 행 = 평가자, `byRound[k-1]` = k차 담당 칸 수, `total` 많은 순.
 * 건너뜀·평가자 없음 칸은 세지 않는다. 같은 수면 이름순.
 */
export function evaluatorLoadRows(cells, rounds, nameOf = () => '') {
  const by = new Map();
  (cells ?? []).forEach((c) => {
    if (c.skipped || !c.evaluatorId) return;
    let row = by.get(c.evaluatorId);
    if (!row) {
      row = { evaluatorId: c.evaluatorId, byRound: Array(rounds).fill(0), total: 0, cells: [] };
      by.set(c.evaluatorId, row);
    }
    if (c.round >= 1 && c.round <= rounds) row.byRound[c.round - 1] += 1;
    row.total += 1;
    row.cells.push(c);
  });
  return [...by.values()].sort(
    (a, b) =>
      b.total - a.total ||
      collator.compare(String(nameOf(a.evaluatorId) ?? ''), String(nameOf(b.evaluatorId) ?? '')),
  );
}

/** 대상자 기준 선택(사람) × 고른 차수 → 칸 목록. */
export function leaderCellRefs(evaluateeIds, round) {
  return [...evaluateeIds].map((evaluateeId) => ({ evaluateeId, round }));
}

/**
 * 오픈 전 일괄 적용 — 고른 칸 전부에 같은 동작(T-3). `action` = 'assign' | 'skip' | 'revert'.
 * 지정할 사람이 그 칸의 대상자 본인이면 지정하지 않고 `skippedSelf` 로 센다(엣지 T1).
 * 되돌리기는 손으로 고친 칸만 바꾼다 — 손대지 않은 칸은 이미 규칙·추천 값이다.
 * 반환 `{ cells, applied, skippedSelf, changedIds }` — `changedIds` = 값이 바뀐 칸의 대상자.
 */
export function applyLeaderBulk(cells, refs, action, personId = null) {
  const keys = new Set(refs.map((r) => cellKey(r.evaluateeId, r.round)));
  let applied = 0;
  let skippedSelf = 0;
  const changedIds = new Set();
  const next = cells.map((c) => {
    if (!keys.has(cellKey(c.evaluateeId, c.round))) return c;
    if (action === 'assign' && personId === c.evaluateeId) {
      skippedSelf += 1;
      return c;
    }
    applied += 1;
    const out =
      action === 'assign'
        ? assignLeaderCell(c, personId)
        : action === 'skip'
          ? c.skipped && c.origin === 'adjusted'
            ? c
            : skipLeaderCell(c)
          : c.origin === 'adjusted'
            ? revertLeaderCell(c)
            : c;
    if (out !== c) changedIds.add(c.evaluateeId);
    return out;
  });
  return { cells: next, applied, skippedSelf, changedIds };
}

/** 도구 줄 · 일괄 바 · 평가자 기준 보기의 기본 문구(한국어). 앱은 `labels` 로 i18n 문구를 덮는다. */
export const LEADER_TOOL_LABELS = {
  leaderToolViewAria: "보기",
  leaderToolViewTarget: "대상자 기준",
  leaderToolViewEvaluator: "평가자 기준",
  leaderToolSearchTarget: "대상자 이름 검색",
  leaderToolSearchEvaluator: "평가자 이름 검색",
  leaderToolGroupRootDirect: "대표 직속",
  leaderToolGroupNone: "미지정",
  leaderToolOrg: "조직",
  leaderToolLevel: "직급",
  leaderToolLevelEmpty: "(비어 있음)",
  leaderToolStatus: "상태",
  leaderToolStatus_recommended: "추천",
  leaderToolStatus_rule: "규칙",
  leaderToolStatus_adjusted: "조정됨",
  leaderToolStatus_skipped: "건너뜀",
  leaderToolSortAria: "정렬",
  leaderToolSortWarn: "정렬: 경고 먼저 · 조직 순",
  leaderToolSortName: "정렬: 이름순",
  leaderToolFilterEmpty: "조건에 맞는 대상자가 없습니다.",
  leaderToolCheckAll: "보이는 행 모두 선택",
  leaderToolCheckGroup: "{{name}}의 보이는 행 모두 선택",
  leaderToolCheckRow: "{{name}} 선택",
  leaderBulkPeople: "{{n}}명 선택",
  leaderBulkCells: "{{n}}칸 선택",
  leaderBulkRoundAria: "바꿀 차수",
  leaderBulkAssign: "평가자 지정…",
  leaderBulkSkip: "이 차수 건너뛰기",
  leaderBulkRevert: "규칙·추천으로 되돌리기",
  leaderBulkClear: "선택 해제",
  leaderBulkPickLoad: "맡은 칸 {{count}}",
  leaderBulkApplied: "{{x}}칸에 적용했습니다",
  leaderBulkSelf: "본인이라 지정하지 않은 {{y}}칸",
  leaderBulkSubmitted: "제출된 {{z}}칸은 바꾸지 않았습니다",
  leaderEvColEvaluator: "평가자",
  leaderEvColTotal: "합계",
  leaderEvColState: "상태",
  leaderEvOverload: "부담 기준 {{limit}}칸 초과",
  leaderEvResigned: "퇴사",
  leaderEvEmpty: "배정된 평가자가 없습니다.",
  leaderEvExpand: "{{name}} 담당 칸 펼치기",
  leaderEvCellRound: "{{round}}차",
};

/** 결과 줄 — 0 인 항목은 뺀다(HR §5.13.10 「적용 뒤」). */
export function bulkResultText(L, { applied = 0, skippedSelf = 0, skippedSubmitted = 0 }) {
  const T = { ...LEADER_TOOL_LABELS, ...L };
  return [
    applied > 0 && fill(T.leaderBulkApplied, { x: applied }),
    skippedSelf > 0 && fill(T.leaderBulkSelf, { y: skippedSelf }),
    skippedSubmitted > 0 && fill(T.leaderBulkSubmitted, { z: skippedSubmitted }),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** 머리 체크 — 보이는 것 전부가 켜졌나. */
export function allOn(selected, ids) {
  return ids.length > 0 && ids.every((id) => selected.has(id));
}

