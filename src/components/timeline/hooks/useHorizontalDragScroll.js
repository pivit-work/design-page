import { useEffect, useRef } from 'react';

// Horizontal drag-to-scroll on right grid.
export default function useHorizontalDragScroll(rightScrollRef) {
  const dragRef = useRef({
    active: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    // Avoid dragging from interactive elements (buttons, blocks)
    if (e.target.closest('button, .tl-meeting-block')) return;
    const sc = rightScrollRef.current;
    if (!sc) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScrollLeft: sc.scrollLeft,
      moved: false,
    };
    sc.classList.add('is-dragging');
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.startX;
      if (Math.abs(dx) > 3) dragRef.current.moved = true;
      const sc = rightScrollRef.current;
      if (sc) sc.scrollLeft = dragRef.current.startScrollLeft - dx;
    };
    const handleMouseUp = () => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      const sc = rightScrollRef.current;
      if (sc) sc.classList.remove('is-dragging');
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [rightScrollRef]);

  return handleMouseDown;
}
