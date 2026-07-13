import { useRef, useEffect } from 'react';

/**
 * OkrConnectors — OKR 트리 연결선.
 *
 * BezierConnectors 와 같은 방식으로 rAF 루프에서 DOM 을 측정해 SVG path 를
 * 그린다. 좌표는 scale 로 나눠 canvas-inner 의 transform 과 무관하게 유지.
 *
 * - 루트 그룹(.okr-group-root) 하단 중앙 → 각 팀 컬럼(.okr-team-col)의
 *   그룹 카드 상단 중앙: 베지어 곡선
 * - 팀 objective 목록 하단 → 구성원 칩 목록 상단: 수직선
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

      const root = container.querySelector('.okr-group-root');
      if (root) {
        const rootRect = root.getBoundingClientRect();
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
        const list = col.querySelector(':scope > .okr-objective-list');
        const members = col.querySelector(':scope > .okr-members');
        if (!list || !members) return;
        const listRect = list.getBoundingClientRect();
        const membersRect = members.getBoundingClientRect();
        const x = centerX(listRect);
        const y1 = (listRect.bottom - containerRect.top) / s;
        const y2 = (membersRect.top - containerRect.top) / s;
        pathData += `M ${x} ${y1} L ${x} ${y2} `;
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
