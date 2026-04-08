import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [isDragging, setIsDragging] = useState(false);
  const [current, setCurrent] = useState(saved);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  const onDragMoveRef = useRef(onDragMove);
  onDragMoveRef.current = onDragMove;

  useEffect(() => {
    const s = positions[nodeId] || { x: 0, y: 0 };
    if (!isDragging) setCurrent(s);
  }, [positions, nodeId, isDragging]);

  const onDown = (e) => {
    e.stopPropagation();
    startMouse.current = { x: e.clientX, y: e.clientY };
    startPos.current = { ...current };
    setIsDragging(true);

    const onMove = (ev) => {
      const nx = startPos.current.x + (ev.clientX - startMouse.current.x);
      const ny = startPos.current.y + (ev.clientY - startMouse.current.y);
      const pos = { x: nx, y: ny };
      setCurrent(pos);
      updatePosition(nodeId, pos);
      if (onDragMoveRef.current) onDragMoveRef.current(ev, pos);
    };
    const onUp = (ev) => {
      setIsDragging(false);
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
