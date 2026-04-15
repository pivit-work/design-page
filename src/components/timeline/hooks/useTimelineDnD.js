import { useEffect, useRef, useState } from 'react';

// Custom mouse-based drag-and-drop reorder.
// We DO NOT use the HTML5 drag-and-drop API. The native API forces a
// semi-transparent drag image and has many edge cases (image elements
// hijacking dragstart, dragend not firing when the source is removed, etc).
// Instead we listen to mousedown/mousemove/mouseup directly and render the
// floating preview ourselves — fully solid, fully under our control.
export default function useTimelineDnD(initialGroups) {
  const [groups, setGroups] = useState(initialGroups);
  // dragState: { member, fromGroupId, fromIndex, offsetX, offsetY,
  //              clientX, clientY, width, height } | null
  const [dragState, setDragState] = useState(null);
  // dragOver: { groupId, index } | null — placeholder position (filtered space)
  const [dragOver, setDragOver] = useState(null);
  // Refs mirror state so handlers attached to window can read latest values.
  const dragStateRef = useRef(null);
  const dragOverRef = useRef(null);

  // Compute the drop target based on the current cursor (clientX, clientY).
  // Uses elementFromPoint to find the row under the cursor. For each member
  // row found, we check if the cursor is in the upper or lower half of that
  // row to decide insert-before vs insert-after (in filtered space).
  const computeDropTarget = (clientX, clientY) => {
    // The floating preview has pointer-events:none in CSS, so
    // elementFromPoint sees the underlying row.
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

  // NameColumn calls this from each row's onMouseDown with (e, member, groupId, idx)
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

  // Global mousemove + mouseup listeners — attached only while dragging.
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

      setGroups((prev) => {
        const next = prev.map((g) => ({
          ...g,
          memberIds: g.memberIds.filter((id) => id !== drag.member.id),
        }));
        const toG = next.find((g) => g.id === target.groupId);
        if (!toG) return prev;
        const clamped = Math.max(0, Math.min(target.index, toG.memberIds.length));
        toG.memberIds.splice(clamped, 0, drag.member.id);
        return next;
      });

      clear();
    };

    const onMove = (e) => {
      e.preventDefault();
      moveDrag(e.clientX, e.clientY);
    };
    const onUp = (e) => {
      e.preventDefault();
      // Recompute target one final time at the cursor's current position
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

  return { groups, dragState, dragOver, startDrag };
}
