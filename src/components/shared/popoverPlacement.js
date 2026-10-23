/**
 * 버튼에 붙는 드롭다운·피커를 **아래로 펼지 위로 펼지** 정한다.
 *
 * 메뉴는 `position: absolute; top: 100%` 로 버튼 아래에 붙는데, 버튼이 스크롤 영역(모달 본문 등)
 * 바닥 가까이에 있으면 메뉴가 그 영역 밖으로 나가 잘린다 — 1on1 요약 모달의 「다음 회의 일정 등록」
 * 날짜·시간이 그랬다. 가장 가까운 스크롤 조상(없으면 창)의 바닥까지 남은 자리가 메뉴 높이보다 작고,
 * 위쪽 자리가 더 넓으면 'up' 을 돌려준다. 여는 순간 한 번 재면 된다(열린 뒤 스크롤은 드물다).
 *
 * @param {HTMLElement|null} anchorEl  메뉴가 붙는 버튼
 * @param {number} menuHeight          메뉴가 차지할 높이(px) — max-height 가 있으면 그 값
 * @param {number} [gap=4]             버튼과 메뉴 사이 틈
 * @returns {'down'|'up'}
 */
export default function popoverPlacement(anchorEl, menuHeight, gap = 4) {
  if (!anchorEl || typeof window === 'undefined') return 'down';
  const r = anchorEl.getBoundingClientRect();
  let topEdge = 0;
  let bottomEdge = window.innerHeight;
  for (let el = anchorEl.parentElement; el; el = el.parentElement) {
    const ov = getComputedStyle(el).overflowY;
    if (ov === 'auto' || ov === 'scroll' || ov === 'hidden') {
      const b = el.getBoundingClientRect();
      topEdge = Math.max(topEdge, b.top);
      bottomEdge = Math.min(bottomEdge, b.bottom);
      break;
    }
  }
  const below = bottomEdge - r.bottom - gap;
  const above = r.top - topEdge - gap;
  return below >= menuHeight || below >= above ? 'down' : 'up';
}
