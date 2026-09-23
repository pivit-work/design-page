/**
 * 순간(Date·ISO) → 그 시간대의 달력일 `YYYY-MM-DD` (PW-963).
 *
 * `toISOString().slice(0, 10)` 은 브라우저 안에서도 **세계 표준시(UTC)** 달력일이다 —
 * 한국 0~9시에는 아직 어제라, 새 스쿼드 시작일 기본값이 어제로 채워지고 CSV 의 날짜가
 * 하루 앞으로 적혔다. `timeZone` 을 안 주면 브라우저 시간대로 읽는다.
 */
export function isoDateInZone(value, timeZone) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const fmt = (tz) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  try {
    return fmt(timeZone || undefined);
  } catch {
    // 모르는 시간대 이름을 받아도 날짜는 내놓는다 — 브라우저 시간대로 떨어뜨린다.
    return fmt(undefined);
  }
}

/** 그 시간대의 「오늘」 `YYYY-MM-DD`. */
export function todayIsoInZone(timeZone) {
  return isoDateInZone(new Date(), timeZone);
}
