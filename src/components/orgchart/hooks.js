import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import React from 'react';
import { PositionsContext } from './contexts';

const POSITIONS_STORAGE_KEY = 'pivit_orgchart_positions';

/**
 * 접어 둔 조직 id 를 조직(워크스페이스)마다 기억하는 자리 (pivit-specs org-chart-public-card-spec.md §5.4 「상태 유지」).
 * **접힘**을 저장한다 — 새로 생긴 조직은 목록에 없으니 펼친 채로 나온다.
 * `v2` 인 까닭: 종전 키에는 «루트+1depth» 기준 접힘 집합이 통째로 들어 있어 그대로 읽으면
 * 새 기본값(전체 펼침)이 영영 안 보인다. 종전 키는 읽지도 지우지도 않는다(§5.4 엣지 7).
 * workspaceId 가 없으면 저장하지 않는다(이번 화면에서만 기억한다).
 */
export function collapsedStorageKey(workspaceId) {
  return workspaceId ? `pivit.orgchart.collapsed.v2.${workspaceId}` : null;
}

export function loadCollapsed(key) {
  if (!key) return new Set();
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch { return new Set(); }
}

// 저장소가 막힌 브라우저에서는 조용히 메모리로만 동작한다 — 사용자가 고칠 일이 아니다(§5.4 엣지 4).
export function saveCollapsed(key, ids) {
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify([...ids])); } catch { /* 이번 화면에서만 기억한다 */ }
}

export function clearCollapsed(key) {
  if (!key) return;
  try { localStorage.removeItem(key); } catch { /* 지울 것도 없다 */ }
}

export function loadPositions() {
  try {
    const raw = localStorage.getItem(POSITIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    // 깨진 값(null·배열·숫자)이면 카드마다 positions[id] 를 읽는 곳이 터진다 — 빈 기억으로 시작한다.
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

export function savePositions(positions) {
  // 저장소가 막힌 브라우저(사파리 개인 모드·쿠키 차단·용량 초과)에서는 여기서 예외가 난다 —
  // 끌 때마다 부르므로 그대로 두면 카드를 끄는 순간 오류가 된다(PW-1637). 위치는 이번
  // 화면에서만 기억하면 충분하다.
  try {
    localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions));
  } catch { /* 저장 못 함 — 이번 화면에서만 기억한다 */ }
}

/**
 * 지금 트리에 있는 카드 중 끌어 옮긴(거리가 0 이 아닌) 카드 수 — «자동 정렬»을 켤지 가른다
 * (pivit-specs org-chart-public-card-spec.md §5.4-D). 접힘·보이는 양으로 숨은 카드도 트리에 있으니 센다.
 * 저장값에 남은 옛 카드 id(조직 개편·퇴사·기준일)는 그리는 데 안 쓰이니 세지 않는다(엣지 2).
 * id 는 그리는 쪽과 같은 규칙이다 — 조직 `node.id`(OrgNode), 사람 `${parentId}_member_${i}`(MemberCard),
 * 대표 직속 슬롯은 parentId 가 `${node.id}__direct` 다.
 */
export function countMovedCards(root, positions) {
  if (!root || !positions) return 0;
  const isMoved = (id) => { const p = positions[id]; return !!p && (p.x !== 0 || p.y !== 0); };
  let count = 0;
  const walk = (node) => {
    if (isMoved(node.id)) count += 1;
    (node.members ?? []).forEach((_, i) => { if (isMoved(`${node.id}_member_${i}`)) count += 1; });
    (Array.isArray(node.directReports) ? node.directReports : []).forEach((_, i) => {
      if (isMoved(`${node.id}__direct_member_${i}`)) count += 1;
    });
    (node.children ?? []).forEach(walk);
  };
  walk(root);
  return count;
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
      // 4px 안에서 끝난 것은 클릭이다 — 손떨림만큼 옮긴 자리를 남기면 «자동 정렬»이 옮긴 카드로 센다(§5.4-D · PW-2347).
      if (!didDragRef.current) updatePosition(nodeId, startPos.current);
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

/** 바깥 누르기·Esc 로 닫기 — 공용 부품으로 올렸다(PW-1013). 조직도 쪽 import 를 살려 두려고 다시 내보낸다. */
export { default as useDismissLayer } from '../shared/useDismissLayer.js';

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
