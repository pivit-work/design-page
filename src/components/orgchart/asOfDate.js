/**
 * 기준일(asOf) 값 다루기 — 조직도 캔버스와 리스트 탭이 같은 규약을 쓴다.
 *
 * 값 규약은 DateInput 과 같다('YYYY-MM-DD'). 버튼 글자는 로케일 긴 날짜(「2026년 4월 10일」)이고,
 * 호스트가 `asOf.display` 를 주면 그것이 이긴다.
 */
export const ISO = /^\d{4}-\d{2}-\d{2}$/;

export const toDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const pad2 = (n) => String(n).padStart(2, '0');

export const toIso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/** 기준일 버튼 글자 — 「2026년 4월 10일」. 호스트가 `asOf.display` 를 주면 그것이 이긴다. */
export function formatAsOf(asOf, locale) {
  if (asOf.display) return asOf.display;
  if (!asOf.value || !ISO.test(asOf.value)) return asOf.value ?? '';
  try {
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(toDate(asOf.value));
  } catch {
    return asOf.value;
  }
}
