import { useState, useRef, useLayoutEffect } from 'react';
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
  const { positions, updatePosition } = usePositions();
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
  useLayoutEffect(() => {
    onDropRef.current = onDrop;
    onDragMoveRef.current = onDragMove;
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
      const nx = startPos.current.x + dx;
      const ny = startPos.current.y + dy;
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
