/**
 * 전체 구성원 표의 열 머리 정렬 (PW-1545 · admin-spec §3.1 «정렬 · 고정 열»).
 *
 * - 머리를 누를 때마다 오름 → 내림 → 해제. 한 번에 한 열.
 * - 직급 · 직책은 글자가 아니라 필드 옵션 순서(조직 설정에서 정한 순번).
 * - 소속은 주 소속 경로. 겸직은 순서에 끼어들지 않는다.
 * - 빈 값은 방향과 무관하게 맨 아래. 같은 값끼리는 원래 순서(안정 정렬).
 * - 대표 행은 정렬과 무관하게 맨 위.
 *
 * 🔴 명부 내보내기 «현재 화면 그대로»가 서버에서 같은 순서를 만든다
 *    (pivit-work `backend/src/admin/admin-export/employee-export.sort.ts`). 열 하나의 규칙을 바꾸면 그쪽도 함께 바꾼다.
 */

/** 눌러도 정렬하지 않는 열 — 체크박스 · 스쿼드(한 사람이 여러 값) · 행 버튼. */
export const LIST_NO_SORT_COLS = new Set(['select', 'squads', 'actions']);

/** 재직상태는 코드가 아니라 상태 순서(재직 → 수습 → 휴직 → 퇴사)로 줄 세운다 — 필터 선택지 순서와 같다. */
export const LIST_STATUS_SORT_ORDER = ['active', 'probation', 'on_leave', 'terminated'];

/** 다음 정렬 상태 — `null` 은 해제. */
export function nextListSort(cur, colId) {
  if (LIST_NO_SORT_COLS.has(colId)) return cur;
  if (!cur || cur.col !== colId) return { col: colId, dir: 'asc' };
  if (cur.dir === 'asc') return { col: colId, dir: 'desc' };
  return null;
}

const isEmpty = (v) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

/** 순서 목록의 자리 — `[자리, 글자]`. 목록에 없는 값(옛 값 등)은 목록 뒤에 글자순으로 모인다 — 빈 값보다는 위다. */
function orderKey(list, v) {
  const i = (list || []).indexOf(v);
  return i < 0 ? [(list || []).length, String(v)] : [i, ''];
}

function toNumber(v) {
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * 한 사람의 정렬 값 — 빈 값이면 `null`.
 * @param {object} m 구성원 행
 * @param {string} colId 열 id
 * @param {{ orders?: { jobLevel?: string[], jobPosition?: string[] }, deptPathOf?: (m: object) => string | null }} ctx
 */
export function listSortValue(m, colId, ctx = {}) {
  switch (colId) {
    case 'jobLevel':
    case 'jobPosition': {
      const v = m[colId];
      return isEmpty(v) ? null : orderKey(ctx.orders?.[colId], v);
    }
    case 'employmentStatus':
      return isEmpty(m.employmentStatus) ? null : orderKey(LIST_STATUS_SORT_ORDER, m.employmentStatus);
    case 'dept': {
      const p = ctx.deptPathOf ? ctx.deptPathOf(m) : null;
      return isEmpty(p) ? null : p;
    }
    case 'manager':
      return isEmpty(m.managerName) ? null : m.managerName;
    case 'squadLead': {
      const names = m.squadLeadNames || [];
      return names.length ? names.join(', ') : null;
    }
    case 'hrbp':
      return isEmpty(m.hrbpName) ? null : m.hrbpName;
    case 'hireDate':
    case 'terminationDate':
      return isEmpty(m[colId]) ? null : String(m[colId]).slice(0, 10);
    case 'ftePercent':
    case 'salary': {
      if (isEmpty(m[colId])) return null;
      const n = toNumber(m[colId]);
      return n === null ? String(m[colId]) : n;
    }
    default: {
      const v = m[colId];
      return isEmpty(v) ? null : String(v);
    }
  }
}

export function compareListSortValues(x, y) {
  if (Array.isArray(x) && Array.isArray(y)) return x[0] - y[0] || compareListSortValues(x[1], y[1]);
  if (typeof x === 'number' && typeof y === 'number') return x - y;
  return String(x).localeCompare(String(y), 'ko');
}

/**
 * 줄 세우기 — 새 배열을 돌려준다. `sort` 가 없으면 받은 순서 그대로(대표만 위로).
 * @param {object[]} rows
 * @param {{ col: string, dir: 'asc' | 'desc' } | null} sort
 */
export function sortListMembers(rows, sort, ctx = {}) {
  const out = [...rows];
  if (sort && !LIST_NO_SORT_COLS.has(sort.col)) {
    const dir = sort.dir === 'desc' ? -1 : 1;
    const keyed = out.map((m, i) => ({ m, i, k: listSortValue(m, sort.col, ctx) }));
    keyed.sort((a, b) => {
      if (a.k === null && b.k === null) return a.i - b.i;
      if (a.k === null) return 1;
      if (b.k === null) return -1;
      return compareListSortValues(a.k, b.k) * dir || a.i - b.i;
    });
    out.splice(0, out.length, ...keyed.map((x) => x.m));
  }
  return out.sort((a, b) => (b.isCeo ? 1 : 0) - (a.isCeo ? 1 : 0));
}
