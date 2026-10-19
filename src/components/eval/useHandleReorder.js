import { useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * ⋮⋮ 손잡이로 줄 순서를 바꾸는 조작 — 평가 항목 줄과 등급 줄이 같은 것을 쓴다.
 *
 * 정책(spec-eval-cycle.md §4.2.2-A · hr.policy §5.4.4, PW-1971 2026-10-19): 순서 조작은 손잡이
 * 하나다. ▲▼ 버튼이 맡던 두 환경도 손잡이가 맡는다.
 *
 * - 마우스: 손잡이를 누른 동안만 그 줄이 draggable 이다(`armed`). 줄 안 입력칸에서 글자를
 *   끌어도 줄은 움직이지 않는다.
 * - 키보드: 손잡이가 Tab 을 받고 ↑/↓ 로 한 칸 옮긴다. 포커스는 옮겨진 줄의 손잡이를
 *   따라간다. 맨 위 ↑ · 맨 아래 ↓ 는 아무 일도 하지 않는다.
 * - 터치: HTML 끌어 놓기는 터치에서 안 일어난다 — 그래서 손잡이의 포인터 이벤트로 따로
 *   끈다. 손가락 아래 줄을 놓을 자리로 삼는다. 손잡이에 `touch-action: none` 이 있어야
 *   끄는 동안 화면이 스크롤되지 않는다(CSS).
 *
 * 두 목록(등급·항목)이 한 화면에 있어 줄은 목록 안에서만 찾는다. 목록은 `bindList` 를 목록 요소의
 * `ref` 에 건다 — 콜백 ref 라 렌더 중에 ref 를 읽지 않는다(react-hooks/refs).
 *
 * `onReorder(from, to)` — `from` 줄을 빼서 `to` 자리에 넣는다.
 */
export function useHandleReorder({ count, onReorder }) {
  const [listEl, setListEl] = useState(null);
  const [armed, setArmed] = useState(null);
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  // 손가락으로 끄는 중인가 — 마우스 끌기(HTML 끌어 놓기)와 놓는 길이 달라 따로 든다.
  const [touching, setTouching] = useState(false);

  const reset = () => {
    setArmed(null);
    setDragIdx(null);
    setOverIdx(null);
    setTouching(false);
  };
  const move = (from, to) => {
    if (to < 0 || to >= count || from === to) return false;
    onReorder(from, to);
    return true;
  };

  const rowProps = (i) => ({
    'data-reorder-row': i,
    draggable: armed === i,
    onDragStart: (e) => {
      if (armed !== i) return;
      e.dataTransfer.effectAllowed = 'move';
      // Firefox 는 데이터가 없으면 드래그를 시작하지 않는다.
      e.dataTransfer.setData('text/plain', String(i));
      setDragIdx(i);
    },
    onDragOver: (e) => {
      if (dragIdx === null) return;
      e.preventDefault();
      setOverIdx(i);
    },
    onDrop: (e) => {
      e.preventDefault();
      if (dragIdx !== null) move(dragIdx, i);
      reset();
    },
    onDragEnd: reset,
  });

  const rowClass = (i) =>
    [overIdx === i && dragIdx !== i ? 'is-over' : '', dragIdx === i ? 'is-dragging' : '']
      .filter(Boolean)
      .join(' ');

  const rowAt = (x, y) => {
    const el = document.elementFromPoint?.(x, y)?.closest('[data-reorder-row]');
    if (!el || !listEl?.contains(el)) return null;
    return Number(el.getAttribute('data-reorder-row'));
  };

  const handleProps = (i) => ({
    'data-reorder-handle': i,
    role: 'button',
    tabIndex: 0,
    onMouseDown: () => {
      setArmed(i);
      // 손잡이 밖에서 떼도 풀어야 한다 — 안 풀면 그 줄이 draggable 로 남아 몸통을 끌어도 옮겨진다.
      // 끌기가 시작되면 브라우저가 mouseup 을 보내지 않고 dragend 가 대신 푼다.
      document.addEventListener('mouseup', () => setArmed(null), { once: true });
    },
    onKeyDown: (e) => {
      const dir = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      if (!dir) return;
      // 맨 끝에서도 막는다 — 안 막으면 화면이 스크롤된다.
      e.preventDefault();
      const to = i + dir;
      if (to < 0 || to >= count) return;
      // 옮긴 결과를 바로 그려야 옮겨진 줄의 손잡이를 찾아 포커스를 넘길 수 있다.
      flushSync(() => onReorder(i, to));
      listEl?.querySelector(`[data-reorder-handle="${to}"]`)?.focus();
    },
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse') return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setTouching(true);
      setDragIdx(i);
      setOverIdx(i);
    },
    onPointerMove: (e) => {
      if (!touching) return;
      const over = rowAt(e.clientX, e.clientY);
      if (over !== null) setOverIdx(over);
    },
    onPointerUp: () => {
      if (!touching) return;
      if (dragIdx !== null && overIdx !== null) move(dragIdx, overIdx);
      reset();
    },
    onPointerCancel: reset,
  });

  return { bindList: setListEl, rowProps, rowClass, handleProps };
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
