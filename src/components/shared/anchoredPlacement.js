/**
 * 앵커에 붙어 뜨는 패널의 **배치 계산** (PW-313).
 *
 * ── 왜 이 파일이 있나 ───────────────────────────────────────────────────────
 * 떠 있는 패널이 화면 밖으로 나가 못 눌리는 결함이 같은 원인으로 반복됐다.
 * 원인은 언제나 하나다 — **패널의 높이를 아무도 재지 않는다.**
 *
 *   - PW-109: 배정 편집 팝오버가 높이를 `340px` 상수로 가정 → 내용이 조건부로
 *     늘어나자 하단 행에서 액션 줄에 도달할 방법이 사라졌다.
 *   - PW-306: 목록 카드의 ⋮ 메뉴가 `position: absolute` → 조상의 `overflow: hidden`
 *     에 잘려 마지막 행은 '비활성·삭제' 를 아예 실행할 수 없었다.
 *   - PW-313(여기): 타임라인 셀 피커가 `window.innerHeight - 250`, 스쿼드 카드
 *     ⋯ 메뉴가 `top: calc(100% + 6px)` — 둘 다 뷰포트를 보지 않는다.
 *
 * 그래서 좌표를 화면 파일에서 계산하지 않는다. **앵커 사각형 + 실측 내용 크기 +
 * 뷰포트**를 넣으면 좌표와 `maxHeight` 가 나오는 순수 함수 하나를 두고, 모두가 그것을
 * 쓴다. 순수 함수라 jsdom 에서도 정확히 잴 수 있다(레이아웃 계산이 필요 없다).
 *
 * pivit-work 에도 같은 규격의 프리미티브가 있다
 * (`frontend/src/components/common/AnchoredPopover.tsx`). 패키지 의존 방향이 반대라
 * (pivit-work → design-page) 여기서 그것을 import 할 수는 없어 규격만 맞춘다.
 */

/** 앵커와 패널 사이 기본 간격. */
export const ANCHOR_GAP = 6;
/** 뷰포트 가장자리에서 최소한 띄우는 여백. */
export const VIEWPORT_MARGIN = 8;

/**
 * 앵커에 붙는 패널의 좌표와 높이 상한을 고른다.
 *
 * @param {object} p
 * @param {{top:number,bottom:number,left:number,right:number}} p.anchor
 *   앵커 사각형(뷰포트 기준). **클릭 지점처럼 점 앵커면 높이·너비 0 인 사각형**을
 *   넘긴다 — 나머지 판정은 완전히 같다.
 * @param {number} p.contentH  패널의 자연 높이(내용 높이). 제한 걸린 값이 아니라
 *   `scrollHeight` 기반이어야 한다 — 이미 걸린 `maxHeight` 안에서 재면 그 제한에
 *   갇혀 다시 잴 때마다 위/아래 판정이 흔들린다.
 * @param {number} p.contentW  패널의 너비.
 * @param {number} p.viewportW
 * @param {number} p.viewportH
 * @param {'left'|'right'} [p.align='left']  앵커의 어느 모서리에 맞출지.
 * @param {number} [p.gap=ANCHOR_GAP]
 * @param {number} [p.margin=VIEWPORT_MARGIN]
 * @returns {{left:number, top:number, maxHeight:number, flipped:boolean}}
 *
 * 규칙:
 *   1. 아래 공간에 자연 높이가 들어가면 아래에 붙인다.
 *   2. 아래는 모자라고 위가 더 넓으면 위로 뒤집는다.
 *   3. 어느 쪽에도 다 못 넣으면 **더 넓은 쪽**에 붙이고 그 높이로 줄인다.
 *      줄이지 않으면 마지막 항목이 화면 밖으로 나가 영영 못 누른다.
 *   4. 어느 경우든 `maxHeight` 를 함께 돌려준다. 위치만 옮기고 높이를 열어 두면
 *      같은 버그가 다른 좌표에서 재발한다.
 */
export function placeAnchored({
  anchor,
  contentH,
  contentW,
  viewportW,
  viewportH,
  align = 'left',
  gap = ANCHOR_GAP,
  margin = VIEWPORT_MARGIN,
}) {
  const below = viewportH - anchor.bottom - gap - margin;
  const above = anchor.top - gap - margin;
  const flipped = contentH > below && above > below;
  // `maxHeight` 는 **상한**이다 — 내용이 그보다 작으면 패널은 자연 높이로 그려진다.
  // 여기에 `contentH` 를 섞어 넣으면 실측 오차만큼 스크롤바가 생긴다.
  const maxHeight = Math.max(flipped ? above : below, 0);
  // `top` 을 잡을 때 쓰는 실제 높이는 자연 높이와 상한 중 작은 쪽이다.
  const height = Math.min(contentH, maxHeight);

  const raw = flipped
    ? anchor.top - gap - height
    : Math.min(
        anchor.bottom + gap,
        Math.max(margin, viewportH - height - margin),
      );
  // 초단신 뷰포트에서는 위 계산도 화면을 넘을 수 있다. 마지막으로 한 번 더 가둔다 —
  // 여백보다 아래, 그리고 (여백 + 높이)보다 위.
  const top = Math.min(
    Math.max(margin, raw),
    Math.max(margin, viewportH - margin - height),
  );

  let left = align === 'right' ? anchor.right - contentW : anchor.left;
  if (left + contentW > viewportW - margin) left = viewportW - contentW - margin;
  if (left < margin) left = margin;

  return { left, top, maxHeight, flipped };
}

/** 클릭 좌표를 앵커 사각형으로 바꾼다(점 앵커). */
export function pointAnchor(x, y) {
  return { top: y, bottom: y, left: x, right: x };
}
