import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

// 이만큼 움직여야 끌기다(PW-2540). 덜 움직이고 떼면 누른 것뿐이다 — 손떨림으로 시작되지 않을 만큼.
const DRAG_START_DISTANCE = 5;
// 끄는 동안 목록의 위·아래 끝에 이만큼 다가가면 화면을 그 쪽으로 민다.
const AUTO_SCROLL_EDGE = 40;
const AUTO_SCROLL_STEP = 10;

const scrollParentOf = (el) => {
  for (let n = el?.parentElement; n; n = n.parentElement) {
    const { overflowY } = getComputedStyle(n);
    if ((overflowY === 'auto' || overflowY === 'scroll') && n.scrollHeight > n.clientHeight) return n;
  }
  return document.scrollingElement;
};

/**
 * 포인터를 따라오는 줄 그림 — 끄는 줄을 그대로 베껴 목록 안에 띄운다. 목록 안에 두어야 그 목록 아래에서만
 * 듣는 스타일이 그대로 먹는다. 창에 transform 이 걸려 있으면 fixed 기준이 바뀌므로 놓인 자리를 재서 보정한다.
 */
function makeGhost(rowEl, host) {
  const rect = rowEl.getBoundingClientRect();
  const clone = rowEl.cloneNode(true);
  for (const el of [clone, ...clone.querySelectorAll('*')]) {
    for (const attr of ['id', 'data-testid', 'data-reorder-row', 'data-reorder-handle', 'tabindex']) el.removeAttribute(attr);
  }
  let ghost = clone;
  if (rowEl.tagName === 'TR') {
    [...clone.children].forEach((cell, k) => {
      cell.style.width = `${rowEl.children[k].getBoundingClientRect().width}px`;
    });
    ghost = document.createElement('table');
    ghost.className = rowEl.closest('table')?.className ?? '';
    const body = document.createElement('tbody');
    body.append(clone);
    ghost.append(body);
  }
  ghost.classList.add('dp-reorder-ghost');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.inert = true;
  Object.assign(ghost.style, { position: 'fixed', left: '0', top: '0', width: `${rect.width}px`, margin: '0' });
  host.append(ghost);
  const placed = ghost.getBoundingClientRect();
  return { el: ghost, dx: rect.left - placed.left, dy: rect.top - placed.top };
}

/**
 * ⋮⋮ 손잡이로 줄 순서를 바꾸는 조작 — 평가 항목·등급·단계 카드, 연차 정책, 조직 라벨, 배정 규칙이 같은 것을 쓴다.
 *
 * 정책(spec-eval-cycle.md §4.2.2-A · hr.policy §5.4.4, PW-1971 · leave settings §4, PW-2540): 순서 조작은
 * 손잡이 하나다. ▲▼ 버튼이 맡던 두 환경도 손잡이가 맡는다.
 *
 * - 마우스·터치: 같은 포인터 이벤트 한 길로 끈다. 브라우저 끌어 놓기(HTML drag)를 쓰지 않는다 — 그쪽은 시작하는
 *   순간 pointercancel 이 오고, 받아 주지 않는 자리마다 금지 표시가 뜨며, 터치에서는 일어나지도 않는다(PW-2540).
 *   손잡이(또는 `areaProps` 를 단 칸)를 누른 채 `DRAG_START_DISTANCE` 를 넘게 움직이면 끌기다.
 *   Esc·포인터 취소·창 포커스 잃음은 끌기를 무른다. 끄는 동안 줄 그림이 포인터를 따라온다.
 * - 키보드: 손잡이가 Tab 을 받고 ↑/↓ 로 한 칸 옮긴다. 포커스는 옮겨진 줄의 손잡이를
 *   따라간다. 맨 위 ↑ · 맨 아래 ↓ 는 아무 일도 하지 않는다. Space 는 집기·놓기 자리라 화면을 스크롤하지 않는다.
 *
 * 놓을 자리는 목록 안의 `rowProps` 줄뿐이다 — 그 줄들 위아래를 벗어나면(기본 정책 행·표 아래 빈자리) 놓아도
 * 옮기지 않는다. 줄 사이 틈에서는 가까운 줄을 고른다.
 *
 * 두 목록(등급·항목)이 한 화면에 있어 줄은 목록 안에서만 찾는다. 목록은 `bindList` 를 목록 요소의
 * `ref` 에 건다 — 콜백 ref 라 렌더 중에 ref 를 읽지 않는다(react-hooks/refs).
 *
 * `onReorder(from, to)` — `from` 줄을 빼서 `to` 자리에 넣는다.
 *
 * `onStep(i, dir)` (선택) — ↑/↓ 한 칸을 화면이 따로 정할 때 쓴다. 여러 줄이 한 묶음으로 움직이는
 * 목록(단계 카드의 하향 차수, PW-2097)은 «한 칸» 이 이웃 묶음 하나를 넘는 것이라 순번 ±1 이 아니다.
 * 옮긴 뒤 포커스할 줄의 순번을, 옮길 수 없으면 null 을 돌려준다.
 */
export function useHandleReorder({ count, onReorder, onStep }) {
  const [listEl, setListEl] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  // 누른 동안 창에 건 듣기는 누른 때의 렌더를 붙든다 — 놓을 때는 지금 렌더의 값으로 옮겨야 한다.
  const latest = useRef(null);
  useEffect(() => {
    latest.current = { count, onReorder };
  });
  const press = useRef(null);
  useEffect(() => () => press.current?.finish(false), []);

  const move = (from, to) => {
    if (to < 0 || to >= latest.current.count || from === to) return false;
    latest.current.onReorder(from, to);
    return true;
  };

  const rowProps = (i) => ({ 'data-reorder-row': i });

  // `is-over-before` / `is-over-after` — 놓으면 끄는 줄이 그 줄의 위 · 아래 어느 쪽으로 들어가나.
  // `move(from, to)` 는 위로 끌면 `to` 줄 앞, 아래로 끌면 `to` 줄 뒤에 넣는다. 놓일 자리를 선으로
  // 그리는 목록(연차 정책 표 등, PW-2540)이 쓴다. `is-over` 는 그대로 둔다 — 테두리로 그리는 목록이 쓴다.
  const rowClass = (i) => {
    const over = overIdx === i && dragIdx !== null && dragIdx !== i;
    return [
      over ? 'is-over' : '',
      over ? (dragIdx > i ? 'is-over-before' : 'is-over-after') : '',
      dragIdx === i ? 'is-dragging' : '',
    ]
      .filter(Boolean)
      .join(' ');
  };

  const rowAt = (x, y) => {
    const el = document.elementFromPoint?.(x, y)?.closest('[data-reorder-row]');
    if (el && listEl?.contains(el)) return Number(el.getAttribute('data-reorder-row'));
    const rows = [...(listEl?.querySelectorAll('[data-reorder-row]') ?? [])].map((r) => ({
      i: Number(r.getAttribute('data-reorder-row')),
      rect: r.getBoundingClientRect(),
    }));
    if (rows.length === 0) return null;
    const inX = rows.some(({ rect }) => x >= rect.left && x <= rect.right);
    const inY = y >= Math.min(...rows.map((r) => r.rect.top)) && y <= Math.max(...rows.map((r) => r.rect.bottom));
    if (!inX || !inY) return null;
    const gap = ({ rect }) => Math.abs(y - (rect.top + rect.bottom) / 2);
    return rows.reduce((a, b) => (gap(b) < gap(a) ? b : a)).i;
  };

  const startPress = (i, e) => {
    if (press.current || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const scroller = scrollParentOf(listEl);
    const session = { x: startX, y: startY, started: false, over: null, ghost: null, frame: 0 };

    const paint = () => {
      const { el, dx, dy } = session.ghost;
      el.style.transform = `translate(${dx + session.x - startX}px, ${dy + session.y - startY}px)`;
      session.over = rowAt(session.x, session.y);
      setOverIdx(session.over);
    };
    const autoScroll = () => {
      const box = scroller === document.scrollingElement
        ? { top: 0, bottom: window.innerHeight }
        : scroller.getBoundingClientRect();
      if (session.y < box.top + AUTO_SCROLL_EDGE) scroller.scrollTop -= AUTO_SCROLL_STEP;
      else if (session.y > box.bottom - AUTO_SCROLL_EDGE) scroller.scrollTop += AUTO_SCROLL_STEP;
      paint();
      session.frame = requestAnimationFrame(autoScroll);
    };
    const onMove = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      session.x = ev.clientX;
      session.y = ev.clientY;
      if (!session.started) {
        if (Math.hypot(session.x - startX, session.y - startY) < DRAG_START_DISTANCE) return;
        const rowEl = listEl?.querySelector(`[data-reorder-row="${i}"]`);
        if (!rowEl) return;
        session.started = true;
        session.ghost = makeGhost(rowEl, listEl);
        document.documentElement.classList.add('dp-reorder-dragging');
        setDragIdx(i);
        session.frame = requestAnimationFrame(autoScroll);
      }
      paint();
    };
    const onUp = (ev) => {
      if (ev.pointerId === e.pointerId) session.finish(true);
    };
    const onCancel = () => session.finish(false);
    const onKey = (ev) => {
      if (ev.key !== 'Escape' || !session.started) return;
      // 끌기만 무른다 — 창까지 닫히지 않게 한다.
      ev.stopPropagation();
      session.finish(false);
    };
    session.finish = (commit) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onCancel);
      window.removeEventListener('keydown', onKey, true);
      press.current = null;
      if (!session.started) return;
      cancelAnimationFrame(session.frame);
      session.ghost.el.remove();
      document.documentElement.classList.remove('dp-reorder-dragging');
      setDragIdx(null);
      setOverIdx(null);
      // 끌고 뗀 자리에서 브라우저가 click 을 낸다 — 줄의 편집 창이 열리면 안 된다. 목록 밖 click 은 그대로 둔다.
      const swallow = (ev) => {
        if (listEl?.contains(ev.target)) ev.stopPropagation();
      };
      window.addEventListener('click', swallow, true);
      setTimeout(() => window.removeEventListener('click', swallow, true), 0);
      if (commit && session.over !== null) move(i, session.over);
    };
    press.current = session;
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onCancel);
    window.addEventListener('keydown', onKey, true);
  };

  // 끌기가 시작되는 자리에 공통 — 글자가 선택되거나 브라우저 끌기가 먼저 시작되지 않게 한다.
  const pressProps = (i) => ({
    onPointerDown: (e) => startPress(i, e),
    onDragStart: (e) => e.preventDefault(),
  });

  /** 손잡이 말고 끌기를 시작할 칸(연차 정책의 «순서» 칸 전체)에 단다. 손잡이도 그 안에 있으면 한 번만 시작된다. */
  const areaProps = (i) => ({
    ...pressProps(i),
    style: { cursor: 'grab', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' },
  });

  const handleProps = (i) => ({
    ...pressProps(i),
    style: { userSelect: 'none', WebkitUserSelect: 'none' },
    'data-reorder-handle': i,
    role: 'button',
    tabIndex: 0,
    onKeyDown: (e) => {
      if (e.key === ' ') {
        e.preventDefault();
        return;
      }
      const dir = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      if (!dir) return;
      // 맨 끝에서도 막는다 — 안 막으면 화면이 스크롤된다.
      e.preventDefault();
      let to = null;
      // 옮긴 결과를 바로 그려야 옮겨진 줄의 손잡이를 찾아 포커스를 넘길 수 있다.
      flushSync(() => {
        to = onStep ? onStep(i, dir) : move(i, i + dir) ? i + dir : null;
      });
      if (to === null) return;
      listEl?.querySelector(`[data-reorder-handle="${to}"]`)?.focus();
    },
  });

  return { bindList: setListEl, rowProps, rowClass, handleProps, areaProps };
}

/**
 * 「이 자리의 펴 둔 설정판·선택이 옮긴 뒤 어디로 가나」 — 순번을 id 로 쓰는 화면이 쓴다.
 * `from` 이 `to` 로 가면 그 사이 줄은 한 칸씩 밀린다.
 */
export function reorderedIndex(idx, from, to) {
  if (idx === null || idx === undefined) return idx;
  if (idx === from) return to;
  if (from < idx && idx <= to) return idx - 1;
  if (to <= idx && idx < from) return idx + 1;
  return idx;
}
