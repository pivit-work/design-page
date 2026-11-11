/**
 * 적용일 칸 값 — 비거나 오늘 뒤면 오늘(pivit-work PW-2697).
 * DateInput 의 max 는 달력만 막고, 칸에 친 글자는 그대로 넘긴다. 앞날은 서버도 거절하지만(조직도 구성원 저장의 발령과 같다)
 * 칸에 남겨 두면 저장할 때마다 실패 토스트가 뜬다.
 */
export function clampToToday(value, today) {
  if (!value) return today;
  return today && value > today ? today : value;
}
