// Health Check 점수 → 색상 티어 / 라벨. pivit-specs snippet-write-view 시안과 동일:
//   8↑ 초록(#16A34A) / 6~7 노랑(#D97706) / 6미만 빨강(#DC2626)
//   9↑ "최고" / 8 "좋음" / 7 "보통" / 5~6 "힘듦" / 4↓ "매우 힘듦"
//
// 작성 모달(SnippetModal)과 간트의 스니핏 상세(SnippetDetailModal)가 같은
// 기준을 써야 같은 점수가 두 화면에서 다른 색으로 보이지 않는다.
export const healthTier = (v) => (v >= 8 ? 'good' : v >= 6 ? 'mid' : 'low');

export const healthLabel = (v) =>
  v >= 9 ? '최고' : v >= 8 ? '좋음' : v >= 7 ? '보통' : v >= 5 ? '힘듦' : '매우 힘듦';
