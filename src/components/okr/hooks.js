import { useContext, useLayoutEffect, useRef, useState } from 'react';
import { OkrPositionsContext } from './contexts.js';

/**
 * 옮긴 위치는 노드(조직 · 개인) 단위로, 고른 계층 보기마다 따로 기억한다 (okr-policy §3.4-B L6 · PW-2772).
 * 같은 조직도 `본부` 보기와 `팀` 보기에서 트리 자리가 달라, 한 보기에서 옮긴 거리를 다른 보기에 얹으면
 * 노드가 엉뚱한 곳으로 간다. 종전 키(`pivit_okr_positions` — 요약 행 단위 · 보기 구분 없음)는 읽지 않는다:
 * PW-2726 으로 트리 모양이 바뀌어 그 위치는 맞는 자리가 아니다. 그래서 접두어가 겹치지 않는 새 이름을 쓴다.
 */
const POSITIONS_STORAGE_PREFIX = 'pivit_okr_node_positions:';
const LEGACY_POSITIONS_STORAGE_KEY = 'pivit_okr_positions';
const storageKey = (viewKey) => `${POSITIONS_STORAGE_PREFIX}${viewKey || 'default'}`;

export function loadOkrPositions(viewKey) {
  try {
    const raw = localStorage.getItem(storageKey(viewKey));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveOkrPositions(viewKey, positions) {
  // 저장소가 막힌 브라우저(사파리 개인 모드·쿠키 차단·용량 초과)에서는 여기서 예외가 난다 —
  // 끌 때마다 부르므로 그대로 두면 카드를 끄는 순간 오류가 된다(PW-1637). 위치는 이번
  // 화면에서만 기억하면 충분하다.
  try {
    localStorage.setItem(storageKey(viewKey), JSON.stringify(positions));
  } catch { /* 저장 못 함 — 이번 화면에서만 기억한다 */ }
}

/** ⟳ 초기화 — 모든 계층 보기의 기억(과 남아 있던 종전 기억)을 지운다 (L6). */
export function clearOkrPositions() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(POSITIONS_STORAGE_PREFIX) || k === LEGACY_POSITIONS_STORAGE_KEY)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* 저장소가 막힌 브라우저 — 지울 것도 없다 */ }
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
 *
 * onDown(e, { clickSlop }) — 작은 글자 버튼(«외 N개 …», PW-2214)처럼 손이 떨려도 누름으로 볼
 * 거리를 넓힐 때 준다. 누름으로 본 떨림은 자리에 남기지 않고 되돌린다.
 */
export function useOkrDrag(blockId, onClick) {
  // scale 은 캔버스 배율. 블록의 translate 는 `scale(s)` 가 걸린
  // `[data-okr-canvas-inner]` 안쪽 좌표계라, 화면에서 잰 마우스 이동량을 그대로
  // 넣으면 블록이 s 배만 움직여 커서와 벌어진다(조직도 PW-248 과 동일).
  const { positions, updatePosition, scale = 1 } = useOkrPositions();
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
  // 드래그 도중 휠 줌이 일어나도 onMove 가 최신 배율을 읽도록 ref 로 둔다.
  const scaleRef = useRef(scale);
  useLayoutEffect(() => {
    onClickRef.current = onClick;
    scaleRef.current = scale;
  });

  const onDown = (e, { clickSlop = CLICK_THRESHOLD } = {}) => {
    e.stopPropagation();
    startMouse.current = { x: e.clientX, y: e.clientY };
    startPos.current = { ...current };
    setDragPos(current);

    const onMove = (ev) => {
      const s = scaleRef.current || 1;
      const pos = {
        x: startPos.current.x + (ev.clientX - startMouse.current.x) / s,
        y: startPos.current.y + (ev.clientY - startMouse.current.y) / s,
      };
      setDragPos(pos);
      updatePosition(blockId, pos);
    };
    const onUp = (ev) => {
      setDragPos(null);
      const moved = Math.hypot(ev.clientX - startMouse.current.x, ev.clientY - startMouse.current.y);
      if (moved < clickSlop) {
        updatePosition(blockId, startPos.current);
        if (onClickRef.current) onClickRef.current();
      }
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
