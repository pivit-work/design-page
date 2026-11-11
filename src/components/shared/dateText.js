/* DateInput 이 친 글을 날짜로 읽는 규칙 — 칸 밖에서도 같은 판정을 쓰게 따로 둔다(PW-1333 4회차). */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** 온전한 `YYYY-MM-DD` 이고 달력에 있는 날인가(2026-02-30 은 아니다). */
export function isIsoDate(v) {
  if (!ISO_DATE.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const probe = new Date(y, m - 1, d);
  return probe.getFullYear() === y && probe.getMonth() === m - 1 && probe.getDate() === d;
}

/** `20260929` 처럼 줄표 없이 친 것도 받아 준다. */
export function normalize(raw) {
  const v = String(raw ?? '').trim();
  if (/^\d{8}$/.test(v)) return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6)}`;
  return v.replace(/[./]/g, '-');
}

/**
 * 친 글이 날짜로 읽히지 않나 — 칸을 떠날 때 `DateInput` 이 직전 값으로 되돌릴 글(`2026-02-30`·`abc`).
 * 빈 칸·온전한 날짜는 false. 칸이 blur 없이 사라지는 곳(표 칸을 Enter 로 닫기 등)이 `onRevert` 대신 같은 판정을 쓴다.
 */
export function isUnreadableDate(raw) {
  const v = normalize(raw);
  return v !== '' && !isIsoDate(v);
}
