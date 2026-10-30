/** 탭 줄 오른쪽 위에 따로 떠 있는 버튼 묶음 — 탭 몸통마다 그린다(`OkrHeaderActions`·[작성]). */
const HEADER_ACTIONS_SELECTOR = '.okr-header-actions, .okr-write-btn:not(.is-inline)';

/**
 * 탭 머리가 버튼 앞에서 멈추도록 허용할 최대 폭(px). 버튼이 없으면 null — 종전처럼 폭을 막지 않는다.
 * 머리 왼쪽 끝부터 버튼 왼쪽 끝까지다 — 머리의 오른쪽 안쪽 여백(12px)이 탭과 버튼 사이 틈이 된다.
 * 두 상자가 같은 기준(.app)에 고정돼 함께 움직이므로 두 좌표의 차이만 쓴다 — 창이 1280px 보다 좁거나
 * 확대해 화면이 가로로 밀려도 기준 상자 위치와 상관없이 맞다.
 */
export function measureHeaderMaxWidth(header, doc = document) {
  const headerBox = header.getBoundingClientRect();
  const headerBottom = headerBox.bottom;
  let left = Infinity;
  doc.querySelectorAll(HEADER_ACTIONS_SELECTOR).forEach((el) => {
    const box = el.getBoundingClientRect();
    // 탭 줄 높이에 걸친 버튼만 센다 — 아래 본문 안의 같은 이름 버튼은 탭을 가리지 않는다.
    if (box.width > 0 && box.top < headerBottom) left = Math.min(left, box.left);
  });
  if (left === Infinity) return null;
  return Math.max(0, Math.floor(left - headerBox.left));
}

/** 탭 줄 끝과 버튼 사이에 남길 틈(px) — 이보다 좁으면 한 줄에 안 들어간 것으로 본다. */
export const TAB_ACTIONS_GAP = 12;

/**
 * 버튼을 탭 줄 오른쪽에 둘지, 탭 아래 서브타이틀 줄로 내릴지 정한다 (pivit-work PW-2415).
 * 버튼 앞에서 멈춘 탭 줄을 가로로 밀어 두면, 밀린 탭은 표시 없이 잘려 버튼 뒤에 숨은 것처럼 보였다.
 * 탭 글자 전체 폭(`scrollWidth` — 밀려 가려진 부분까지)이 버튼 앞에 다 들어가면 종전처럼 오른쪽에 두고
 * 폭만 막는다. 안 들어가면 버튼을 내리고 폭을 막지 않는다 — 버튼은 가로 자리가 그대로라 다시 재도 같은 답이다.
 * @returns {{ maxWidth: number|null, below: boolean }}
 */
export function measureHeaderLayout(header, nav, doc = document) {
  const maxWidth = measureHeaderMaxWidth(header, doc);
  if (maxWidth == null || !nav) return { maxWidth, below: false };
  const navStart = nav.getBoundingClientRect().left - header.getBoundingClientRect().left;
  const below = navStart + nav.scrollWidth + TAB_ACTIONS_GAP > maxWidth;
  return { maxWidth: below ? null : maxWidth, below };
}
