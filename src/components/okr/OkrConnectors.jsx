import { useRef, useEffect } from 'react';

/**
 * OkrConnectors — OKR 트리 연결선.
 *
 * BezierConnectors 와 같은 방식으로 rAF 루프에서 DOM 을 측정해 SVG path 를
 * 그린다. 좌표는 scale 로 나눠 canvas-inner 의 transform 과 무관하게 유지.
 *
 * 앵커는 드래그 가능한 블록 요소 자체를 측정한다(블록을 끌면 선이 따라옴).
 * - 루트 마지막 objective 행 하단 중앙 → 각 팀 그룹 카드 상단 중앙: 베지어
 * - 팀 마지막 objective 행 하단 → 첫 구성원 칩 상단: 수직선
 */
export default function OkrConnectors({ containerRef, scale }) {
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
      const centerX = (rect) => (rect.left + rect.width / 2 - containerRect.left) / s;
      let pathData = '';

      const rootAnchor = container.querySelector('.okr-group-root > .okr-objective-list > .okr-objective-row:last-child')
        || container.querySelector('.okr-group-root > .okr-group-card');
      if (rootAnchor) {
        const rootRect = rootAnchor.getBoundingClientRect();
        const px = centerX(rootRect);
        const py = (rootRect.bottom - containerRect.top) / s;

        container.querySelectorAll('.okr-team-col').forEach(col => {
          const card = col.querySelector(':scope > .okr-group-card');
          if (!card) return;
          const cardRect = card.getBoundingClientRect();
          const cx = centerX(cardRect);
          const cy = (cardRect.top - containerRect.top) / s;
          const midY = (py + cy) / 2;
          pathData += `M ${px} ${py} C ${px} ${midY}, ${cx} ${midY}, ${cx} ${cy} `;
        });
      }

      container.querySelectorAll('.okr-team-col').forEach(col => {
        const lastRow = col.querySelector(':scope > .okr-objective-list > .okr-objective-row:last-child');
        const firstChip = col.querySelector(':scope > .okr-members .okr-member-chip');
        if (!lastRow || !firstChip) return;
        const rowRect = lastRow.getBoundingClientRect();
        const chipRect = firstChip.getBoundingClientRect();
        const x1 = centerX(rowRect);
        const y1 = (rowRect.bottom - containerRect.top) / s;
        const x2 = centerX(chipRect);
        const y2 = (chipRect.top - containerRect.top) / s;
        const midY = (y1 + y2) / 2;
        pathData += `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2} `;
      });

      // 팀 → 개인 노드 (PW-413). 팀 컬럼의 마지막 Objective 행(없으면 빈 자리
      // 플레이스홀더, 그것도 없으면 카드)에서 각 개인 카드 상단으로 잇는다.
      container.querySelectorAll('.okr-team-col').forEach(col => {
        const anchor = col.querySelector(':scope > .okr-objective-list > .okr-objective-row:last-child')
          || col.querySelector(':scope > .okr-objective-empty')
          || col.querySelector(':scope > .okr-group-card');
        if (!anchor) return;
        const anchorRect = anchor.getBoundingClientRect();
        const ax = centerX(anchorRect);
        const ay = (anchorRect.bottom - containerRect.top) / s;
        col.querySelectorAll(':scope > .okr-persons-row > .okr-person-col > .okr-group-card').forEach(card => {
          const cardRect = card.getBoundingClientRect();
          const cx = centerX(cardRect);
          const cy = (cardRect.top - containerRect.top) / s;
          const midY = (ay + cy) / 2;
          pathData += `M ${ax} ${ay} C ${ax} ${midY}, ${cx} ${midY}, ${cx} ${cy} `;
        });
      });

      svg.innerHTML = `<path d="${pathData}" fill="none" stroke="var(--utility-blue-300)" stroke-width="1" stroke-dasharray="4 4"/>`;
      rafRef.current = requestAnimationFrame(draw);
    };

    const timer = setTimeout(() => { rafRef.current = requestAnimationFrame(draw); }, 150);
    return () => { clearTimeout(timer); cancelAnimationFrame(rafRef.current); };
  }, [containerRef, scale]);

  return (
    <svg ref={svgRef} className="connector-svg" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }} />
  );
}
