/**
 * KR 팀원 기여도 배분 칸의 셈 (PW-2529 · 기획 okr-policy §4.4.4 · 4.4.8).
 *
 * 줄: { id, name, pct, departed } — departed 는 «퇴사한 구성원» 줄로, 지우지도 % 를 고치지도 못한다.
 * 화면 밖에서도 같은 셈을 쓰도록(시험) 순수 함수로 둔다.
 */

/** 입력 글자 → 저장할 % — 정수만(소수는 버린다 33.7 → 33), 0~100 밖은 경계로 맞춘다. */
export function toContribPct(raw) {
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function contribSum(rows) {
  return rows.reduce((acc, r) => acc + (Number(r.pct) || 0), 0);
}

/** 미배분(0줄)이거나 합계 100 이면 저장할 수 있다. */
export function contribValid(rows) {
  return rows.length === 0 || contribSum(rows) === 100;
}

/**
 * 균등 배분 — 퇴사한 구성원 줄은 그대로 두고, 100 에서 그 줄들의 합을 뺀 나머지를 다른 줄에
 * 정수로 나눈다. 남는 1 % 씩은 위 줄부터 더한다(3명 → 34/33/33).
 */
export function evenSplit(rows) {
  const editable = rows.filter((r) => !r.departed).length;
  if (editable === 0) return rows;
  const fixed = rows.filter((r) => r.departed).reduce((acc, r) => acc + (Number(r.pct) || 0), 0);
  const pool = Math.max(0, 100 - fixed);
  const base = Math.floor(pool / editable);
  let rem = pool - base * editable;
  return rows.map((r) => {
    if (r.departed) return r;
    const pct = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem -= 1;
    return { ...r, pct };
  });
}

/** 창을 열 때와 같은 배분인가 — 같으면 [확정] 때 기여도를 다시 보내지 않는다. */
export function sameAllocation(a, b) {
  if (a.length !== b.length) return false;
  return a.every((r, i) => r.id === b[i].id && r.pct === b[i].pct);
}
