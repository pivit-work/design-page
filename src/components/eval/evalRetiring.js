/**
 * PW-2029 — 퇴사가 잡힌 재직자를 평가 후보에서 다루는 규칙 (David 2026-10-19 (라)).
 *
 * 마지막으로 일하는 날(`lastServingDay` — 마지막 출근일, 없으면 퇴사일 전날)이 그 일의 마감 날보다
 * 앞이면 후보에서 뺀다. 마감 날이나 그 뒤까지 일하면 후보에 두고 «퇴사 예정 D-N»(`retiringLabel`)만 붙인다.
 * 마지막 날·문구는 앱이 사람마다 실어 준다(캔버스는 날짜를 셈하지 않는다). 서버 `leavesBefore` 와 같은 규칙.
 *
 * 마감 = 하향은 그 차수 하향 단계 끝 · 동료 리뷰는 동료 리뷰 단계 끝 · 위원은 캘리브레이션 단계 끝.
 * 단계 끝은 `YYYY-MM-DDTHH:mm`(조직 시각) — 날짜 부분만 본다. 마감을 아직 안 정했으면 아무도 빼지 않는다.
 */
export function leavesBeforeDate(lastServingDay, deadline) {
  const due = typeof deadline === 'string' ? deadline.slice(0, 10) : '';
  const last = typeof lastServingDay === 'string' ? lastServingDay.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || !/^\d{4}-\d{2}-\d{2}$/.test(last)) return false;
  return last < due;
}

/** 후보 목록에서 마감 전에 떠나는 사람을 뺀다. `person.lastServingDay` 를 본다. */
export function withoutLeavingBefore(people, deadline) {
  return (people ?? []).filter((p) => !leavesBeforeDate(p?.lastServingDay, deadline));
}
