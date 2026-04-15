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
    setDragPos(current);

    const onMove = (ev) => {
      const nx = startPos.current.x + (ev.clientX - startMouse.current.x);
      const ny = startPos.current.y + (ev.clientY - startMouse.current.y);
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

  return { isDragging, onDown, style };
}
