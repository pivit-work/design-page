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

/**
 * highlightIds — 강조할 조직 단위 id 를 회사 루트부터 차례로 (§5.4-B 내 소속 연결선 강조). 안 주면 강조가 없다.
 * 두 id 가 모두 목록에 있는 부모→자식 선과, 그 길을 지나는 사람 카드 줄(마지막 단위에서는 본인 카드
 * `data-self` 까지)을 회색 위에 한 번 더 긋는다. 대표 직속 곁가지 아래면 트렁크는 함께 쓰는 선이라 회색으로 둔다.
 */
export default function BezierConnectors({ containerRef, scale, lineStyle = 'curve', highlightIds }) {
  const svgRef = useRef(null);
  const rafRef = useRef(null);
  // 배열은 렌더마다 새로 올 수 있다 — 문자열로 묶어 effect 를 다시 걸지 않는다.
  const highlightKey = highlightIds && highlightIds.length > 0 ? highlightIds.join('\n') : '';

  useEffect(() => {
    if (!containerRef.current) return;

    const draw = () => {
      const svg = svgRef.current;
      const container = containerRef.current;
      if (!svg || !container) return;

      const s = scale || 1;
      const containerRect = container.getBoundingClientRect();
      let pathData = '';
      // 직속 칸으로 가는 보고선 — 소속선과 가르려고 점선으로 따로 긋는다.
      let dashedPathData = '';
      const hi = highlightKey ? new Set(highlightKey.split('\n')) : null;
      let hiPathData = '';
      let hiDashedPathData = '';
      const isOn = el => !!(hi && el && hi.has(el.dataset.nodeId));
      // 강조 길이 이 노드에서 아래로 이어지나 — 하위 줄이나 곁가지 중 하나가 길 위에 있다.
      const childOnPath = el => isOn(el) && [...el.querySelectorAll(':scope > .children-row > .child-branch > .org-node, :scope > .staff-branches > .staff-branch > .org-node')].some(isOn);

      const orgNodes = container.querySelectorAll('.org-node');
      orgNodes.forEach(parentNode => {
        const childrenRow = parentNode.querySelector(':scope > .children-row');
        const staffBlock = parentNode.querySelector(':scope > .staff-branches');
        const directSlot = parentNode.querySelector(':scope > .direct-slot');
        if (!childrenRow && !staffBlock && !directSlot) return;

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

        // 직속 칸은 카드(와 소속 인원) 바로 아래다. 하위 조직으로 가는 선은 칸 아래에서 이어진다.
        const parentOn = isOn(parentNode);
        if (directSlot) {
          const r = directSlot.getBoundingClientRect();
          const seg = `M ${px} ${py} V ${(r.top - containerRect.top) / s} `;
          dashedPathData += seg;
          if (childOnPath(parentNode)) hiDashedPathData += seg;
          py = (r.bottom - containerRect.top) / s;
        }
        if (!childrenRow && !staffBlock) return;

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
            const stub = `M ${px} ${by} H ${cardLeft} `;
            pathData += stub;
            if (parentOn && isOn(branch.querySelector(':scope > .org-node'))) hiPathData += stub;
            trunkEnd = by;
          });
          if (childrenRow) trunkEnd = (staffBlock.getBoundingClientRect().bottom - containerRect.top) / s;
          pathData += `M ${px} ${py} V ${trunkEnd} `;
          // 아래 하위 줄로 가는 길이면 트렁크도 그 길이다. 곁가지로 가는 길이면 회색 그대로(§5.4-B).
          if (parentOn && childrenRow && [...childrenRow.querySelectorAll(':scope > .child-branch > .org-node')].some(isOn)) {
            hiPathData += `M ${px} ${py} V ${trunkEnd} `;
          }
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
          const seg = connectorPath(px, py, cx, cy, lineStyle);
          pathData += seg;
          if (parentOn && isOn(branch.querySelector(':scope > .org-node'))) hiPathData += seg;
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
        // 길 위의 단위면: 본인 카드가 있으면 거기까지, 없으면 하위로 가는 선이 마지막 카드에서 떠나므로 줄 전부.
        const hasSelf = !!membersList.querySelector(':scope > .member-node[data-self="true"]');
        let memberHi = isOn(node) && (hasSelf || childOnPath(node));
        let lastX = dx;
        let lastY = dy;
        members.forEach((memberEl) => {
          const isDetached = memberEl.dataset.detached === 'true';
          if (isDetached) return;

          const mRect = memberEl.getBoundingClientRect();
          const targetX = (mRect.left + mRect.width / 2 - containerRect.left) / s;
          const targetY = (mRect.top - containerRect.top) / s;

          const seg = connectorPath(lastX, lastY, targetX, targetY, lineStyle);
          pathData += seg;
          if (memberHi) hiPathData += seg;
          if (memberEl.dataset.self === 'true') memberHi = false;

          lastX = targetX;
          lastY = (mRect.bottom - containerRect.top) / s;
        });
      });

      svg.innerHTML = `<path d="${pathData}" fill="none" stroke="#d2d6db" stroke-width="1" stroke-linejoin="round"/>`
        + (dashedPathData ? `<path class="connector-direct" d="${dashedPathData}" fill="none" stroke="#d2d6db" stroke-width="1" stroke-dasharray="4 3"/>` : '')
        // 강조선은 회색선 위에 — 나중에 넣는 것이 위에 그려진다.
        + (hiPathData ? `<path class="connector-highlight" d="${hiPathData}" fill="none" stroke-linejoin="round"/>` : '')
        + (hiDashedPathData ? `<path class="connector-highlight connector-direct" d="${hiDashedPathData}" fill="none" stroke-dasharray="4 3"/>` : '');
      rafRef.current = requestAnimationFrame(draw);
    };

    const timer = setTimeout(() => { rafRef.current = requestAnimationFrame(draw); }, 150);
    return () => { clearTimeout(timer); cancelAnimationFrame(rafRef.current); };
  }, [containerRef, scale, lineStyle, highlightKey]);

  return (
    <svg ref={svgRef} className="connector-svg" data-line-style={lineStyle} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }} />
  );
}
