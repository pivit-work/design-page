/**
 * 말풍선(`Tooltip`)의 **배치 계산** (PW-1123).
 *
 * 앵커 사각형 + 말풍선 실측 크기 + 뷰포트를 넣으면 좌표와 꼬리 위치가 나오는 순수 함수다.
 * 순수 함수라 jsdom 에서도 정확히 잰다(레이아웃 계산이 필요 없다). 패널(드롭다운)의 배치는
 * `anchoredPlacement.js` 가 하는데, 그쪽은 «아래가 기본이고 높이를 줄여 넣는» 규칙이라
 * «위가 기본이고 가운데 정렬 · 꼬리가 앵커를 가리키는» 말풍선과 규칙이 달라 따로 둔다.
 */

/** 앵커와 말풍선 사이 간격(꼬리 높이 4px 포함). */
export const TOOLTIP_GAP = 6;
/** 뷰포트 가장자리에서 최소한 띄우는 여백. */
export const TOOLTIP_MARGIN = 8;
/** 꼬리가 말풍선 모서리에 너무 붙지 않게 두는 여백. */
const ARROW_INSET = 8;

/**
 * @param {object} p
 * @param {{top:number,bottom:number,left:number,right:number}} p.anchor 뷰포트 기준 앵커 사각형
 * @param {number} p.width  말풍선 폭
 * @param {number} p.height 말풍선 높이
 * @param {number} p.viewportW
 * @param {number} p.viewportH
 * @param {'top'|'bottom'} [p.placement='top'] 먼저 시도할 쪽
 * @returns {{left:number, top:number, side:'top'|'bottom', arrowX:number}}
 *
 * 규칙:
 *   1. 고른 쪽에 들어가면 그쪽에 붙인다.
 *   2. 안 들어가고 반대쪽엔 들어가면 뒤집는다.
 *   3. 둘 다 안 들어가면 더 넓은 쪽에 붙인다.
 *   4. 가로는 앵커 가운데에 맞추되 화면 밖으로 나가지 않게 가둔다. 꼬리는 가둔 만큼
 *      옮겨 계속 앵커 가운데를 가리킨다.
 */
export function placeTooltip({
  anchor,
  width,
  height,
  viewportW,
  viewportH,
  placement = 'top',
  gap = TOOLTIP_GAP,
  margin = TOOLTIP_MARGIN,
}) {
  const roomAbove = anchor.top - gap - margin;
  const roomBelow = viewportH - anchor.bottom - gap - margin;
  const fitsAbove = height <= roomAbove;
  const fitsBelow = height <= roomBelow;

  let side = placement === 'bottom' ? 'bottom' : 'top';
  if (side === 'top' && !fitsAbove) {
    if (fitsBelow || roomBelow > roomAbove) side = 'bottom';
  } else if (side === 'bottom' && !fitsBelow) {
    if (fitsAbove || roomAbove > roomBelow) side = 'top';
  }

  const top = side === 'top' ? anchor.top - gap - height : anchor.bottom + gap;

  const center = (anchor.left + anchor.right) / 2;
  const maxLeft = viewportW - margin - width;
  const left = maxLeft < margin
    ? margin
    : Math.min(Math.max(center - width / 2, margin), maxLeft);

  const arrowX = Math.min(
    Math.max(center - left, ARROW_INSET),
    Math.max(width - ARROW_INSET, ARROW_INSET),
  );

  return { left, top, side, arrowX };
}
