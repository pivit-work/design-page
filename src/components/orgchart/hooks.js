import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import React from 'react';
import { PositionsContext } from './contexts';

const POSITIONS_STORAGE_KEY = 'pivit_orgchart_positions';

export function loadPositions() {
  try {
    const raw = localStorage.getItem(POSITIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function savePositions(positions) {
  localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions));
}

export function usePositions() {
  return React.useContext(PositionsContext);
}

// 이 거리(px) 안에서 끝난 마우스 조작은 드래그가 아니라 클릭으로 본다.
// 손떨림으로 1~2px 움직인 클릭까지 드래그로 처리하면 카드 클릭이 통째로 죽는다.
const DRAG_THRESHOLD_PX = 4;

export function useDrag(nodeId, onDrop, onDragMove) {
  // scale 은 캔버스 배율. 카드의 translate 는 `scale(s)` 가 걸린 `.canvas-inner`
  // **안쪽** 좌표계라, 화면에서 잰 마우스 이동량(px)을 그대로 넣으면 카드는
  // s 배만큼만 움직여 커서와 점점 벌어진다(PW-248: 첫 화면 배율 0.5 에서
  // 300px 끌면 카드는 150px). 화면 → 로컬 변환으로 s 를 나눠 준다.
  const { positions, updatePosition, scale = 1 } = usePositions();
  const saved = positions[nodeId] || { x: 0, y: 0 };
  // dragPos 가 null 이면 positions context 가 소스. 드래그 중에만 로컬
  // 좌표로 덮어써서 부드러운 이동을 보장한다. (context 경유 re-render 가
  // 느려도 이 ref/state 경로는 즉시 반영됨)
  const [dragPos, setDragPos] = useState(null);
  const current = dragPos ?? saved;
  const isDragging = dragPos !== null;

  const startMouse = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  // 직전 조작이 드래그였는지 — mouseup 다음에 오는 click 핸들러가 읽는다.
  // (브라우저는 드래그로 카드를 옮긴 뒤에도 click 을 발화하므로, 이 플래그가
  //  없으면 카드를 옮길 때마다 토글이 같이 걸린다.)
  const didDragRef = useRef(false);
  // 최신 콜백을 ref 에 기록 — 렌더 중 .current 접근을 피하기 위해
  // useLayoutEffect 로 commit 직후 동기화.
  const onDropRef = useRef(onDrop);
  const onDragMoveRef = useRef(onDragMove);
  // 드래그 도중에도 휠로 배율이 바뀔 수 있어, onMove 클로저가 낡은 배율을
  // 붙들지 않도록 ref 로 최신값을 읽는다.
  const scaleRef = useRef(scale);
  useLayoutEffect(() => {
    onDropRef.current = onDrop;
    onDragMoveRef.current = onDragMove;
    scaleRef.current = scale;
  });

  const onDown = (e) => {
    e.stopPropagation();
    startMouse.current = { x: e.clientX, y: e.clientY };
    startPos.current = { ...current };
    didDragRef.current = false;
    setDragPos(current);

    const onMove = (ev) => {
      const dx = ev.clientX - startMouse.current.x;
      const dy = ev.clientY - startMouse.current.y;
      if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) {
        didDragRef.current = true;
      }
      const s = scaleRef.current || 1;
      const nx = startPos.current.x + dx / s;
      const ny = startPos.current.y + dy / s;
      const pos = { x: nx, y: ny };
      setDragPos(pos);
      updatePosition(nodeId, pos);
      if (onDragMoveRef.current) onDragMoveRef.current(ev, pos);
    };
    const onUp = (ev) => {
      setDragPos(null);
      if (onDropRef.current) onDropRef.current(ev);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const style = {
    transform: `translate(${current.x}px, ${current.y}px)`,
    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
  };

  return { isDragging, onDown, style, didDragRef };
}

/**
 * 바깥 클릭·Escape 로 닫는 레이어 — **화면을 덮는 백드롭을 쓰지 않는다** (PW-109).
 *
 * 종전에는 `position: fixed; inset: 0` 인 투명 백드롭에 `onClick={onClose}` 를 달아
 * 바깥 클릭을 받았다. 그 백드롭은 클릭만 막는 것이 아니다 — 그 위에서 굴린 휠은
 * **문서(viewport)로 체이닝**되는데 앱 셸의 `body` 는 `overflow: hidden` 이라 실제
 * 스크롤러(`.content-area`)까지 도달하지 못한다. 스크롤바 드래그·키보드 스크롤도
 * 함께 죽는다. 그래서 팝오버를 열면 **뒤 화면 전체가 잠긴 것처럼** 보였다
 * (제보 2026-08-18). 브라우저 실측: 백드롭에 `pointer-events: none` 을 주는 순간
 * `scrollTop` 이 12922 → 13222 로 움직였다.
 *
 * 🔴 `anchorSelector` 로 **트리거 자신을 바깥에서 제외한다.** 제외하지 않으면
 * `mousedown` 이 닫고 이어진 `click` 이 다시 열어, 트리거를 눌러도 닫히지 않는다.
 *
 * 이 훅은 앵커에 붙는 패널의 것이다. 화면 전체를 점유하는 **모달**에는 쓰지 않는다 —
 * 모달은 뒤를 막는 것이 목적이다.
 */
export function useDismissLayer(onClose, panelRef, anchorSelector, enabled = true) {
  // 부모가 매 렌더 새 `onClose` 를 넘겨도 리스너를 떼었다 붙이지 않는다.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!enabled) return undefined;
    const onDown = (e) => {
      const t = e.target;
      if (panelRef?.current && t instanceof Node && panelRef.current.contains(t)) return;
      if (anchorSelector && t instanceof Element && t.closest(anchorSelector)) return;
      onCloseRef.current();
    };
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current(); };
    // `document` 가 아니라 `window` — 요소에서 시작한 이벤트는 window 까지 올라온다.
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [panelRef, anchorSelector, enabled]);
}

/**
 * 뒤 화면이 스크롤될 때마다 다시 렌더시키는 티커 (PW-109).
 *
 * 배경 스크롤을 살리면 `position: fixed` 팝오버는 앵커에서 떨어진다 — 배경이 300px
 * 움직이는 동안 셀은 `top 827 → 527` 로 올라가는데 팝오버는 제자리에 남아, **엉뚱한
 * 행 위에 뜬 채로** 그 행의 값을 고치고 있게 된다. 팝오버가 앵커를 따라가야 배경을
 * 잠글 이유가 사라진다.
 *
 * capture 로 받아야 내부 스크롤 컨테이너(`.content-area`·배치표)의 스크롤도 잡힌다.
 */
export function useViewportTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener('scroll', bump, true);
    window.addEventListener('resize', bump);
    return () => {
      window.removeEventListener('scroll', bump, true);
      window.removeEventListener('resize', bump);
    };
  }, []);
}
