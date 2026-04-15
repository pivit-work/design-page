import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Custom mouse-based drag-and-drop reorder.
// groups 는 외부에서 controlled 로 주입된다. 드래그 완료 시 setGroups(next) 를
// 호출해 상위에 알린다. 내부 상태는 drag 진행 중인 floating preview 좌표만 보유.
//
// We DO NOT use the HTML5 drag-and-drop API. The native API forces a
// semi-transparent drag image and has many edge cases (image elements
// hijacking dragstart, dragend not firing when the source is removed, etc).
// Instead we listen to mousedown/mousemove/mouseup directly and render the
// floating preview ourselves — fully solid, fully under our control.
export default function useTimelineDnD({ groups, setGroups }) {
  const [dragState, setDragState] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const dragStateRef = useRef(null);
  const dragOverRef = useRef(null);
  // 최신 groups / setGroups 를 window 핸들러에서 참조할 수 있게 ref 에 미러.
  // commit 직후에 동기화해야 핸들러가 최신 값을 본다.
  const groupsRef = useRef(groups);
  const setGroupsRef = useRef(setGroups);
  useLayoutEffect(() => {
    groupsRef.current = groups;
    setGroupsRef.current = setGroups;
  });

  const computeDropTarget = (clientX, clientY) => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;

    const memberRow = el.closest('.tl-member-row[data-tl-member]');
    if (memberRow) {
      const groupId = memberRow.getAttribute('data-tl-group');
      const filteredIdx = parseInt(memberRow.getAttribute('data-tl-filtered-idx'), 10);
      if (Number.isNaN(filteredIdx)) return null;
      const rect = memberRow.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const insertIdx = clientY < midY ? filteredIdx : filteredIdx + 1;
      return { groupId, index: insertIdx };
    }

    const groupHeader = el.closest('.tl-group-header[data-tl-group]');
    if (groupHeader) {
      return { groupId: groupHeader.getAttribute('data-tl-group'), index: 0 };
    }

    const placeholder = el.closest('.tl-member-placeholder-wrap[data-tl-group]');
    if (placeholder) {
      const groupId = placeholder.getAttribute('data-tl-group');
      const idx = parseInt(placeholder.getAttribute('data-tl-index'), 10);
      if (!Number.isNaN(idx)) return { groupId, index: idx };
    }

    return null;
  };

  const startDrag = (e, member, fromGroupId, fromIndex) => {
    e.preventDefault();
    const sourceEl = e.currentTarget;
    const rect = sourceEl.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    const drag = {
      member,
      fromGroupId,
      fromIndex,
      offsetX,
      offsetY,
      clientX: e.clientX,
      clientY: e.clientY,
      width: rect.width,
      height: rect.height,
    };
    const initialOver = { groupId: fromGroupId, index: fromIndex };
    dragStateRef.current = drag;
    dragOverRef.current = initialOver;
    setDragState(drag);
    setDragOver(initialOver);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  };

  const isDragging = dragState !== null;
  useEffect(() => {
    if (!isDragging) return;

    const moveDrag = (clientX, clientY) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const next = { ...drag, clientX, clientY };
      dragStateRef.current = next;
      setDragState(next);

      const target = computeDropTarget(clientX, clientY);
      if (target) {
        const prev = dragOverRef.current;
        if (!prev || prev.groupId !== target.groupId || prev.index !== target.index) {
          dragOverRef.current = target;
          setDragOver(target);
        }
      }
    };

    const endDrag = (commit) => {
      const drag = dragStateRef.current;
      const target = dragOverRef.current;

      const clear = () => {
        dragStateRef.current = null;
        dragOverRef.current = null;
        setDragState(null);
        setDragOver(null);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      };

      if (!commit || !drag || !target) {
        clear();
        return;
      }

      const prevGroups = groupsRef.current;
      const next = prevGroups.map((g) => ({
        ...g,
        memberIds: g.memberIds.filter((id) => id !== drag.member.id),
      }));
      const toG = next.find((g) => g.id === target.groupId);
      if (toG) {
        const clamped = Math.max(0, Math.min(target.index, toG.memberIds.length));
        toG.memberIds.splice(clamped, 0, drag.member.id);
        setGroupsRef.current?.(next);
      }

      clear();
    };

    const onMove = (e) => {
      e.preventDefault();
      moveDrag(e.clientX, e.clientY);
    };
    const onUp = (e) => {
      e.preventDefault();
      moveDrag(e.clientX, e.clientY);
      endDrag(true);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') endDrag(false);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKey);
    };
  }, [isDragging]);

  return { dragState, dragOver, startDrag };
}
