/**
 * 말풍선(`Tooltip`)의 시간 값과, 화면 전체가 함께 쓰는 «지금 떠 있나 / 언제 닫혔나» (PW-1123).
 * 컴포넌트 파일과 나눈 것은 빠른 새로고침(react-refresh)이 컴포넌트만 내보내는 파일을 요구해서다.
 */

/** 마우스를 올리고 말풍선이 뜨기까지 기다리는 기본 시간(ms). */
export const TOOLTIP_DELAY = 300;
/** 이 시간 안에 다른 말풍선이 닫혔으면 기다리지 않고 바로 띄운다. */
export const TOOLTIP_SKIP_WINDOW = 300;

export const tooltipGroup = { open: 0, lastClosedAt: Number.NEGATIVE_INFINITY };

/** 테스트용 — 앞 테스트가 남긴 «방금 닫힘» 상태를 지운다. */
export function resetTooltipGroup() {
  tooltipGroup.open = 0;
  tooltipGroup.lastClosedAt = Number.NEGATIVE_INFINITY;
}
