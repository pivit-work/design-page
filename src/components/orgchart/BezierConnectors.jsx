import { useRef, useEffect } from 'react';

export default function BezierConnectors({ containerRef, scale }) {
  const svgRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const draw = () => {
      const svg = svgRef.current;
      const container = containerRef.current;
      if (!svg || !container) return;

      const s = scale || 1;
      const containerRect = container.getBoundingClientRect();
      let pathData = '';

      const orgNodes = container.querySelectorAll('.org-node');
      orgNodes.forEach(parentNode => {
        const childrenRow = parentNode.querySelector(':scope > .children-row');
        if (!childrenRow) return;

        const membersList = parentNode.querySelector(':scope > .members-list');
        const deptCard = parentNode.querySelector(':scope > .dept-card');
        let parentBottom = deptCard;
        if (membersList) {
          const attachedMembers = membersList.querySelectorAll(':scope > .member-node:not([data-detached="true"])');
          parentBottom = attachedMembers.length > 0 ? attachedMembers[attachedMembers.length - 1] : deptCard;
        }
        if (!parentBottom) return;

        const parentRect = parentBottom.getBoundingClientRect();
        const px = (parentRect.left + parentRect.width / 2 - containerRect.left) / s;
        const py = (parentRect.bottom - containerRect.top) / s;

        const branches = childrenRow.querySelectorAll(':scope > .child-branch');
        branches.forEach(branch => {
          const childDept = branch.querySelector(':scope > .org-node > .dept-card');
          if (!childDept) return;
          const childRect = childDept.getBoundingClientRect();
          const cx = (childRect.left + childRect.width / 2 - containerRect.left) / s;
          const cy = (childRect.top - containerRect.top) / s;
          const midY = (py + cy) / 2;
          pathData += `M ${px} ${py} C ${px} ${midY}, ${cx} ${midY}, ${cx} ${cy} `;
        });
      });

      orgNodes.forEach(node => {
        const deptCard = node.querySelector(':scope > .dept-card');
        const membersList = node.querySelector(':scope > .members-list');
        if (!deptCard || !membersList) return;

        const deptRect = deptCard.getBoundingClientRect();
        const dx = (deptRect.left + deptRect.width / 2 - containerRect.left) / s;
        const dy = (deptRect.bottom - containerRect.top) / s;

        const members = membersList.querySelectorAll(':scope > .member-node');
        let lastX = dx;
        let lastY = dy;
        members.forEach((memberEl) => {
          const isDetached = memberEl.dataset.detached === 'true';
          if (isDetached) return;

          const mRect = memberEl.getBoundingClientRect();
          const targetX = (mRect.left + mRect.width / 2 - containerRect.left) / s;
          const targetY = (mRect.top - containerRect.top) / s;

          const midY = (lastY + targetY) / 2;
          pathData += `M ${lastX} ${lastY} C ${lastX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY} `;

          lastX = targetX;
          lastY = (mRect.bottom - containerRect.top) / s;
        });
      });

      svg.innerHTML = `<path d="${pathData}" fill="none" stroke="#d2d6db" stroke-width="1"/>`;
      rafRef.current = requestAnimationFrame(draw);
    };

    const timer = setTimeout(() => { rafRef.current = requestAnimationFrame(draw); }, 150);
    return () => { clearTimeout(timer); cancelAnimationFrame(rafRef.current); };
  }, [containerRef, scale]);

  return (
    <svg ref={svgRef} className="connector-svg" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }} />
  );
}
