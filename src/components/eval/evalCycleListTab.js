/**
 * PW-2115 — 사이클 목록 탭(전체·진행 중·초안·완료) 묶음. 본 스펙 «평가 사이클 목록은 상태순으로 놓인다»의
 * 묶음을 따른다(서버 `rules/eval-cycle-list-order.ts`): 진행 중 = 리뷰 단계·일시 중단·비상 정지·캘리브레이션 이후,
 * 초안 = draft, 완료 = done·revoked. 모르는 상태는 진행 중 — 손볼 사이클이 끝난 것들 사이로 숨지 않게.
 */
export function cycleListTab(status) {
  if (status === 'draft') return 'draft';
  if (status === 'done' || status === 'revoked') return 'done';
  return 'active';
}
