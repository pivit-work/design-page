import { useContext, useLayoutEffect, useRef, useState } from 'react';
import { OkrPositionsContext } from './contexts.js';

const POSITIONS_STORAGE_KEY = 'pivit_okr_positions';

export function loadOkrPositions() {
  try {
    const raw = localStorage.getItem(POSITIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveOkrPositions(positions) {
  localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions));
}

export function useOkrPositions() {
  return useContext(OkrPositionsContext);
}

// 클릭과 드래그를 구분하는 이동 거리 임계값(px).
const CLICK_THRESHOLD = 5;

/**
 * useOkrDrag — OKR 블록 드래그 훅 (조직도 useDrag 와 동일한 오프셋 방식).
 *
 * mousedown 부터 window 단위로 이동을 추적해 블록을 자유 배치하고,
 * 총 이동 거리가 임계값 미만이면 드래그가 아닌 클릭으로 보고 onClick 을
 * 호출한다(상세 모달 열기). 오프셋은 컨텍스트를 통해 저장·복원된다.
 */
export function useOkrDrag(blockId, onClick) {
  const { positions, updatePosition } = useOkrPositions();
  const saved = positions[blockId] || { x: 0, y: 0 };
  // 드래그 중에만 로컬 좌표로 덮어써 부드러운 이동을 보장한다.
  const [dragPos, setDragPos] = useState(null);
  const current = dragPos ?? saved;
  const isDragging = dragPos !== null;

  const startMouse = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  // 최신 콜백을 ref 에 기록 — 렌더 중 .current 갱신을 피하기 위해
  // useLayoutEffect 로 commit 직후 동기화 (조직도 useDrag 와 동일).
  const onClickRef = useRef(onClick);
  useLayoutEffect(() => { onClickRef.current = onClick; });

  const onDown = (e) => {
    e.stopPropagation();
    startMouse.current = { x: e.clientX, y: e.clientY };
    startPos.current = { ...current };
    setDragPos(current);

    const onMove = (ev) => {
      const pos = {
        x: startPos.current.x + (ev.clientX - startMouse.current.x),
        y: startPos.current.y + (ev.clientY - startMouse.current.y),
      };
      setDragPos(pos);
      updatePosition(blockId, pos);
    };
    const onUp = (ev) => {
      setDragPos(null);
      const moved = Math.hypot(ev.clientX - startMouse.current.x, ev.clientY - startMouse.current.y);
      if (moved < CLICK_THRESHOLD && onClickRef.current) onClickRef.current();
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
