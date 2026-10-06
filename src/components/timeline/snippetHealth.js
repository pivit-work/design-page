// Health Check 점수 → 색상 티어 / 라벨. pivit-specs snippet-write-view 시안과 동일:
//   8↑ 초록(#16A34A) / 6~7 노랑(#D97706) / 6미만 빨강(#DC2626)
//   9↑ "최고" / 8 "좋음" / 7 "보통" / 5~6 "힘듦" / 4↓ "매우 힘듦"
//
// 작성 모달(SnippetModal)과 간트의 스니핏 상세(SnippetDetailModal)가 같은
// 기준을 써야 같은 점수가 두 화면에서 다른 색으로 보이지 않는다.
//
// 점수는 소수(6.9)로 올 수 있다. 작성 모달은 반올림한 칸(7)을 고르므로 여기서도 반올림해 읽는다
// — 안 그러면 같은 스니핏이 작성 모달은 «보통», 상세 창은 «힘듦»으로 갈린다 (PW-1391).
export const healthTier = (v) => {
  const n = Math.round(v);
  return n >= 8 ? 'good' : n >= 6 ? 'mid' : 'low';
};

export const healthLabel = (v) => {
  const n = Math.round(v);
  return n >= 9 ? '최고' : n >= 8 ? '좋음' : n >= 7 ? '보통' : n >= 5 ? '힘듦' : '매우 힘듦';
};
