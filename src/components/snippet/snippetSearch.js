// 검색어(공백 구분 토큰)가 스니핏의 summary/dateLabel/tags 어딘가에 모두
// 포함되면 매치. 토큰 0개면 전체 통과.
// 앱도 이 함수로 행을 걸러 위쪽 「기록 수」·평균을 센다 — 규칙이 갈라지면 목록과 숫자가 어긋난다 (PW-2393).
export function matchesQuery(s, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  const haystack = [
    s.summary ?? '',
    s.dateLabel ?? '',
    ...(s.detail?.tags ?? s.tags ?? []),
  ].join(' ').toLowerCase();
  return tokens.every((t) => haystack.includes(t));
}
