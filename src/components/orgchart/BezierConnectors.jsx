import { useRef, useEffect } from 'react';

// 대표 직속 곁가지가 부서 카드에 닿는 높이 — 카드 제목 줄의 가운데(padding 20 + 줄 높이 28 / 2).
const STAFF_STUB_Y = 34;

/**
 * 부모-자식 연결선 한 가닥. 곡선(기본)은 베지어, 직각은 수직-수평-수직.
 * pivit-specs org-chart-public-card-spec.md §5.1 — 세 화면이 같은 모양을 쓴다.
 */
function connectorPath(x1, y1, x2, y2, lineStyle = 'curve') {
  const midY = (y1 + y2) / 2;
  return lineStyle === 'ortho'
    ? `M ${x1} ${y1} V ${midY} H ${x2} V ${y2} `
    : `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2} `;
}

export default function BezierConnectors({ containerRef, scale, lineStyle = 'curve' }) {
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
        const staffBlock = parentNode.querySelector(':scope > .staff-branches');
        if (!childrenRow && !staffBlock) return;

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
        let py = (parentRect.bottom - containerRect.top) / s;

        // 대표 직속 곁가지(§5.6) — 세로선에서 조직마다 오른쪽으로 가지 하나. 연결선 모양과
        // 무관하게 직선이다. 최상위 조직 줄로 가는 선은 이 블록 아래에서 이어진다.
        if (staffBlock) {
          let trunkEnd = py;
          staffBlock.querySelectorAll(':scope > .staff-branch').forEach(branch => {
            const card = branch.querySelector(':scope > .org-node > .dept-card');
            if (!card) return;
            const r = card.getBoundingClientRect();
            const by = (r.top - containerRect.top) / s + Math.min(STAFF_STUB_Y, r.height / s / 2);
            const cardLeft = (r.left - containerRect.left) / s;
            pathData += `M ${px} ${by} H ${cardLeft} `;
            trunkEnd = by;
          });
          if (childrenRow) trunkEnd = (staffBlock.getBoundingClientRect().bottom - containerRect.top) / s;
          pathData += `M ${px} ${py} V ${trunkEnd} `;
          py = trunkEnd;
        }
        if (!childrenRow) return;

        const branches = childrenRow.querySelectorAll(':scope > .child-branch');
        branches.forEach(branch => {
          const childDept = branch.querySelector(':scope > .org-node > .dept-card');
          if (!childDept) return;
          const childRect = childDept.getBoundingClientRect();
          const cx = (childRect.left + childRect.width / 2 - containerRect.left) / s;
          const cy = (childRect.top - containerRect.top) / s;
          pathData += connectorPath(px, py, cx, cy, lineStyle);
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

          pathData += connectorPath(lastX, lastY, targetX, targetY, lineStyle);

          lastX = targetX;
          lastY = (mRect.bottom - containerRect.top) / s;
        });
      });

      svg.innerHTML = `<path d="${pathData}" fill="none" stroke="#d2d6db" stroke-width="1" stroke-linejoin="round"/>`;
      rafRef.current = requestAnimationFrame(draw);
    };

    const timer = setTimeout(() => { rafRef.current = requestAnimationFrame(draw); }, 150);
    return () => { clearTimeout(timer); cancelAnimationFrame(rafRef.current); };
  }, [containerRef, scale, lineStyle]);

  return (
    <svg ref={svgRef} className="connector-svg" data-line-style={lineStyle} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }} />
  );
}
