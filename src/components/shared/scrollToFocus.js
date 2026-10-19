/**
 * 알림으로 들어온 화면이 «그 줄» 을 화면 가운데로 가져온다 (pivit-work PW-2016).
 *
 * 🔴 `el.scrollIntoView()` 를 쓰지 않는다 — 가로 방향까지 맞추느라 고정 위치 캔버스를 품은
 * 화면 전체를 옆으로 밀어 왼쪽 메뉴가 사라졌다(1200폭에서 149px). 가장 가까운 «세로로
 * 스크롤되는 조상» 의 scrollTop 만 움직인다.
 *
 * 들어온 직후에는 아직 위쪽 내용(인사이트·서브탭 전환 뒤 보드)이 자리를 잡는 중이라 한 번
 * 내려도 줄이 다시 밀려난다. 그래서 `settleMs` 동안 레이아웃이 바뀔 때마다 다시 맞추고,
 * 사용자가 직접 스크롤·키 입력을 하면 그 즉시 멈춘다. 돌려주는 함수로 미리 멈출 수 있다.
 */
function scrollParent(el) {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

function center(el) {
  const r = el.getBoundingClientRect();
  const parent = scrollParent(el);
  if (parent) {
    const pr = parent.getBoundingClientRect();
    parent.scrollTop += r.top - pr.top - (parent.clientHeight - r.height) / 2;
  } else {
    window.scrollBy(0, r.top - (window.innerHeight - r.height) / 2);
  }
}

export default function scrollToFocus(el, { settleMs = 1500 } = {}) {
  if (!el) return () => {};
  let stopped = false;
  let frame = requestAnimationFrame(() => { if (!stopped) center(el); });
  const observer = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => {
      if (stopped) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { if (!stopped) center(el); });
    })
    : null;
  // 고정 위치 캔버스 안의 높이 변화는 body 크기를 안 바꾼다 — 스크롤 조상의 내용물을 지켜본다.
  const parent = scrollParent(el);
  const watched = parent ? Array.from(parent.children) : [document.body];
  for (const node of watched) observer?.observe(node);
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    clearTimeout(timer);
    for (const type of USER_INPUT) window.removeEventListener(type, stop, true);
  };
  const timer = setTimeout(stop, settleMs);
  for (const type of USER_INPUT) window.addEventListener(type, stop, { capture: true, passive: true });
  return stop;
}

const USER_INPUT = ['wheel', 'touchmove', 'keydown', 'mousedown'];
