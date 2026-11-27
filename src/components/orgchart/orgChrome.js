import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';

/**
 * 조직도 세 탭(조직도 · 스쿼드 · 근무지)의 «창» — 상단 머리 줄(내 프로필 · 알림 · 검색) · 제목 줄(탭 + 서브라인) · 본문 위 여백 8.
 * 보기 위에서 휠을 내리면 함께 접혀 보기가 화면 맨 위에 닿고, 올리면 돌아온다 (pivit-work PW-3314 ·
 * 기획 org-chart-public-card-spec.md §5.1 «탭 줄 숨김» · «창이 움직여도 그림은 제자리» · «창 먼저, 그다음 트리»).
 *
 * 상태는 화면에 하나뿐이라 모듈에 둔다 — 머리 줄(App.css `.top-nav`)은 조직도 부품 밖에 있어 `<html data-org-chrome>` 로 알린다.
 *   data-org-chrome="shown" | "hidden" — 조직도 탭이 떠 있는 동안만 있다. 없으면 다른 화면과 같다(머리 줄 그대로).
 * 접히고 펴지는 시간은 CSS 0.22초 · 그동안의 트리 안 휠은 무시한다(ORG_CHROME_LOCK_MS).
 */
export const ORG_CHROME_LOCK_MS = 280;
/** 접힘 · 펼침 직전에 창에 쏘는 사건 — 캔버스들이 «움직이기 전 자리»를 잡는다(useHoldInPlace). */
export const ORG_CHROME_SHIFT_EVENT = 'pivit-chrome-shift';
/** 휠 판정 — 세로만 · 아주 작은 움직임은 무시 (§5.1 «가로 휠과 아주 작은 움직임은 무시한다»). */
export const ORG_CHROME_MIN_DELTA = 4;

const listeners = new Set();
let hidden = false;
let lockUntil = 0;
let owners = 0;

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function mark() {
  if (typeof document === 'undefined') return;
  if (owners > 0) document.documentElement.dataset.orgChrome = hidden ? 'hidden' : 'shown';
  else delete document.documentElement.dataset.orgChrome;
}

export function isOrgChromeHidden() {
  return hidden;
}

/** 접힘 · 펼침이 움직이는 중인가(0.28초) — 이 동안의 트리 안 휠은 트리를 움직이지 않는다. */
export function isOrgChromeMoving() {
  return now() < lockUntil;
}

export function setOrgChromeHidden(next) {
  const want = !!next;
  if (want === hidden) return;
  // 먼저 알린다 — 캔버스들이 지금(움직이기 전) 자리를 기준으로 잡는다
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ORG_CHROME_SHIFT_EVENT));
  // 흐름 안에 선 제목 줄(스쿼드 · 근무지)은 자기 높이만큼 위로 접힌다 — 접기 전에 그 높이를 잰다(CSS --org-head-h)
  if (want && typeof document !== 'undefined') {
    const head = document.querySelector('.pj-header.org-head');
    if (head) document.documentElement.style.setProperty('--org-head-h', `${head.offsetHeight}px`);
  }
  hidden = want;
  lockUntil = now() + ORG_CHROME_LOCK_MS;
  mark();
  listeners.forEach((fn) => fn(hidden));
}

export function subscribeOrgChrome(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useOrgChromeHidden() {
  return useSyncExternalStore(subscribeOrgChrome, isOrgChromeHidden, () => false);
}

/** 이 휠이 창을 움직일 만한가 — 세로 방향이고 아주 작지 않다. */
export function isChromeWheel(e) {
  const dy = Math.abs(e.deltaY || 0);
  return dy >= ORG_CHROME_MIN_DELTA && dy >= Math.abs(e.deltaX || 0);
}

/** 트리 캔버스 안의 휠은 «창 먼저, 그다음 트리»(OrgChartViewport)가 맡는다 — 이 표지 안은 일반 규칙에서 뺀다. */
export const ORG_TREE_CANVAS_ATTR = 'data-org-tree-canvas';
/** 조직도 본문(머리 · 보기 · 여백) 표지 — 이 안에서 굴린 휠만 창을 움직인다. 창(모달) · 왼쪽 메뉴는 밖이다. */
export const ORG_VIEW_ATTR = 'data-org-view';

/**
 * 이 휠이 «조직도 본문»에서 굴린 것인가 — 머리 · 탭 줄 · 보기 · 둘레 여백(§5.1 «캔버스 밖(탭 줄 · 여백)»).
 * 빼는 곳: 트리 캔버스 안(따로 맡는다) · 왼쪽 메뉴 · 창(모달) · 펼친 메뉴 · 고르기 목록(제 스크롤이 있다).
 */
const NOT_BODY = '.sidebar, [role="dialog"], [aria-modal="true"], [role="menu"], [role="listbox"]';
export function isOrgBodyWheelTarget(t) {
  if (t.closest(`[${ORG_TREE_CANVAS_ATTR}]`)) return false;
  if (t.closest(`[${ORG_VIEW_ATTR}]`)) return true;
  if (t.closest(NOT_BODY)) return false;
  // 보기 둘레 여백 — 고정 자리 부품 사이로 비친 앱 바탕(본문 감싸개)
  return !!t.closest('.app, #root') || t === document.body || t === document.documentElement;
}

/**
 * 조직도 탭 하나가 떠 있는 동안 창을 맡는다 — 열 때 · 탭을 바꿀 때 보이는 상태로 열고, 본문에서 굴린 세로 휠로 접고 편다.
 * 세 탭 캔버스(OrgChartCanvas · SquadCanvas · OrgPlaceCanvas)가 한 번씩 부른다. 닫히면 머리 줄을 원래대로 둔다.
 */
export function useOrgChrome(enabled = true) {
  useLayoutEffect(() => {
    if (!enabled) return undefined;
    owners += 1;
    hidden = false;
    lockUntil = 0;
    mark();
    listeners.forEach((fn) => fn(hidden));
    return () => {
      owners -= 1;
      hidden = false;
      mark();
      listeners.forEach((fn) => fn(hidden));
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    const onWheel = (e) => {
      if (!isChromeWheel(e)) return;
      const t = e.target;
      if (!t || typeof t.closest !== 'function') return;
      if (!isOrgBodyWheelTarget(t)) return;
      const want = e.deltaY > 0;
      if (want === hidden) return;
      // 창을 접고 펴는 휠은 그 일만 한다 — 같은 휠로 페이지까지 내려가면 보던 그림이 밀린다(«창 먼저»).
      // 판 안 확대(무대 · 층 그림)는 판이 따로 맡으므로 그대로 돈다(전파는 막지 않는다)
      e.preventDefault();
      setOrgChromeHidden(want);
    };
    window.addEventListener('wheel', onWheel, { capture: true, passive: false });
    return () => window.removeEventListener('wheel', onWheel, { capture: true });
  }, [enabled]);
}

/** 가장 가까운 세로 스크롤 칸 — 페이지가 스크롤돼도 «페이지 안 자리»를 재려고 쓴다. */
function scrollParent(el) {
  let p = el && el.parentElement;
  while (p && p !== document.body) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p;
    p = p.parentElement;
  }
  return null;
}

/**
 * 창이 움직여도 안의 그림은 제자리 (§5.1) — 캔버스의 윗변 · 높이가 바뀐 만큼 그림을 되돌린다. 배율은 건드리지 않는다.
 *
 *   apply(dy) — 그림을 화면에서 dy 만큼 옮겨 달라는 요청(양수 = 아래로). 캔버스가 위로 d 올라가면 dy = +d 다.
 *   center    — 그림이 캔버스 세로 가운데에 놓이는 부품(«한눈에» 무대처럼 판보다 작으면 가운데)이면
 *               높이 변화의 절반도 움직였다고 본다. 함수로 주면 그때그때 묻는다.
 *
 * 언제 — 캔버스 크기가 바뀔 때(ResizeObserver)와 창이 접히고 펴지는 동안(ORG_CHROME_SHIFT_EVENT 뒤 0.45초 매 프레임).
 * 사용자가 스크롤 · 확대 · 끌기로 옮긴 것은 건드리지 않는다 — 캔버스 자체의 페이지 안 자리와 높이만 본다.
 * 멈춘 뒤에도 다시 맞추지 않는다(§5.1 «크기 조정»).
 */
export function useHoldInPlace(ref, apply, { center = false, key = '', enabled = true } = {}) {
  const centerRef = useRef(center);
  useLayoutEffect(() => { centerRef.current = center; });
  useChromeShiftRect(ref, (prev, cur) => {
    let moved = cur.top - prev.top;
    const c = typeof centerRef.current === 'function' ? centerRef.current() : centerRef.current;
    if (c) moved += (cur.h - prev.h) / 2;
    if (Math.abs(moved) > 0.3) apply(-moved);
  }, { key, enabled });
}

/** 창이 접히고 펴진 뒤 이만큼(ms) 판의 자리 변화를 «창이 움직인 것»으로 센다 — CSS 0.22초 + 여유. */
export const ORG_CHROME_SETTLE_MS = 450;

/**
 * 창이 움직이는 동안 판의 자리 · 크기가 바뀔 때마다 onChange(전, 후)를 부른다 — {top(페이지 안 · 스크롤 0 기준), h, w}.
 * 창 접힘 · 펼침 사건 뒤 ORG_CHROME_SETTLE_MS 동안만 센다 — 창 크기를 사용자가 바꾼 것 · 판 안의 일은 세지 않는다(기준만 새로 잡는다).
 */
export function useChromeShiftRect(ref, onChange, { key = '', enabled = true } = {}) {
  const fnRef = useRef(onChange);
  useLayoutEffect(() => { fnRef.current = onChange; });
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof window === 'undefined') return undefined;
    const read = () => {
      const r = el.getBoundingClientRect();
      const sp = scrollParent(el);
      return { top: r.top + (sp ? sp.scrollTop : 0), h: r.height, w: r.width };
    };
    let last = read();
    let until = 0;
    const check = () => {
      const cur = read();
      const prev = last;
      last = cur;
      if (now() > until) return;   // 창이 움직이는 때가 아니다 — 기준만 새로
      if (Math.abs(cur.top - prev.top) > 0.3 || Math.abs(cur.h - prev.h) > 0.3) fnRef.current(prev, cur);
    };
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
    if (ro) ro.observe(el);
    let raf = 0;
    const onShift = () => {
      cancelAnimationFrame(raf);
      last = read();
      until = now() + ORG_CHROME_SETTLE_MS;
      const loop = () => {
        check();
        if (now() < until) raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener(ORG_CHROME_SHIFT_EVENT, onShift);
    return () => {
      if (ro) ro.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener(ORG_CHROME_SHIFT_EVENT, onShift);
    };
  }, [ref, key, enabled]);
}

/**
 * 보기를 화면 아래 끝까지 (§5.1 «보기 영역») — 판의 높이 = 화면 아래(여백 20)까지 남은 높이, 최소 max(560, 화면 높이 − 300), 최대 없음.
 * 판이 스크롤 칸(페이지) 안에 있으면 «스크롤 0 일 때의 자리»로 잰다 — 페이지를 내려도 판이 늘지 않는다.
 * 창이 접히고 펴지는 동안 매 프레임 다시 재 그 줄 높이만큼 보기가 커지고 작아진다.
 */
export const ORG_VIEW_BOTTOM_GAP = 20;
/** el 아래로 stop(스크롤 칸) 안에 더 쌓이는 높이 — 각 층의 아래 바깥 여백 · 뒤 형제 · 부모의 아래 안쪽 여백 · 테두리. */
function spaceBelow(el, stop) {
  const px = (v) => parseFloat(v) || 0;
  let sum = 0;
  for (let n = el; n && n !== stop; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.position === 'absolute' || cs.position === 'fixed') break;
    sum += px(cs.marginBottom);
    const p = n.parentElement;
    const ps = p ? getComputedStyle(p) : null;
    const row = ps && ps.display.includes('flex') && !ps.flexDirection.startsWith('column');   // 가로로 나란히 — 형제는 아래가 아니다
    if (!row) {
      for (let s = n.nextElementSibling; s; s = s.nextElementSibling) {
        const ss = getComputedStyle(s);
        if (ss.position === 'absolute' || ss.position === 'fixed' || ss.display === 'none') continue;
        sum += s.getBoundingClientRect().height + px(ss.marginTop) + px(ss.marginBottom);
      }
    }
    if (p && p !== stop) sum += px(ps.paddingBottom) + px(ps.borderBottomWidth);
  }
  return sum;
}
export function orgViewMinHeight(viewportH) {
  return Math.max(560, viewportH - 300);
}
export function useFillToBottom(ref, { enabled = true, key = '', prop = 'height' } = {}) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof window === 'undefined') return undefined;
    const fit = () => {
      const sp = scrollParent(el) || el.closest('.content-area');
      const r = el.getBoundingClientRect();
      const topAtZero = r.top + (sp ? sp.scrollTop : 0);
      const vh = window.innerHeight;
      // 판 아래에 서는 것(범례 · 본문 아래 여백 20)까지 화면 안에 들게 — 판에서 페이지(스크롤 칸)까지 올라가며 뒤 형제 · 아래 여백을 더한다.
      // 페이지 내용 상자의 아랫변으로 재지 않는다 — 내용 상자가 min-height 100% 면 판이 커질수록 줄어드는 값이 된다
      const below = sp ? spaceBelow(el, sp) : ORG_VIEW_BOTTOM_GAP;
      const bottom = sp ? sp.getBoundingClientRect().bottom : vh;
      const h = Math.max(orgViewMinHeight(vh), Math.floor(bottom - below - topAtZero));
      if (el.style[prop] !== `${h}px`) el.style[prop] = `${h}px`;
    };
    fit();
    let raf = 0;
    const onShift = () => {
      cancelAnimationFrame(raf);
      const t0 = now();
      const loop = () => {
        fit();
        if (now() - t0 < 450) raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('resize', fit);
    window.addEventListener(ORG_CHROME_SHIFT_EVENT, onShift);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
      window.removeEventListener(ORG_CHROME_SHIFT_EVENT, onShift);
      el.style[prop] = '';
    };
  }, [ref, enabled, key, prop]);
}

/** 대표 카드 윗변이 캔버스 윗변에서 이만큼 아래로 들어와야 «보인다»(§5.1 «창 먼저, 그다음 트리» — 기획 판단 56). */
export const ORG_ROOT_SHOWN_GAP = 56;

/**
 * 조직도 트리 캔버스 안 휠 — «창 먼저, 그다음 트리» (§5.1). 화면 좌표(px)만 받아 할 일을 돌려준다.
 *   { type: 'hide' }  창을 접는다(트리 그대로)       { type: 'show' }  창을 편다(트리 그대로)
 *   { type: 'hold' }  아무것도 안 움직인다           { type: 'scroll', dy }  트리를 dy 만큼(양수 = 아래로) 옮긴다
 * 트리는 스크롤 칸처럼 끝이 있다 — 트리 윗변이 캔버스 윗변 아래로(스크롤 0 너머로), 아랫변이 캔버스 아랫변 위로 넘어가지 않는다.
 *
 * @param {{deltaY:number, deltaX?:number, hidden:boolean, moving:boolean,
 *          areaTop:number, areaBottom:number, innerTop:number, innerBottom:number, rootTop:number|null}} w
 */
export function treeWheelAction(w) {
  if (w.moving) return { type: 'hold' };   // 접히고 펴지는 0.28초 — 트리 안 휠은 트리를 움직이지 않는다
  const dy = w.deltaY || 0;
  const atTop = w.innerTop >= w.areaTop - 0.5;   // 스크롤 0
  if (isChromeWheel(w)) {
    if (dy > 0 && !w.hidden) return { type: 'hide' };
    if (dy < 0 && w.hidden) {
      const rootShown = atTop || (w.rootTop != null && w.rootTop >= w.areaTop + ORG_ROOT_SHOWN_GAP);
      if (rootShown) return { type: 'show' };
    }
  }
  if (Math.abs(dy) < Math.abs(w.deltaX || 0) || !dy) return { type: 'hold' };
  if (dy > 0) {
    const room = Math.max(0, w.innerBottom - w.areaBottom);
    return room > 0 ? { type: 'scroll', dy: -Math.min(dy, room) } : { type: 'hold' };
  }
  const room = Math.max(0, w.areaTop - w.innerTop);
  return room > 0 ? { type: 'scroll', dy: Math.min(-dy, room) } : { type: 'hold' };
}
