import { useRef, useEffect } from 'react';
import { connectorPath } from '../orgchart/connectorPath.js';

/**
 * OkrConnectors — OKR 트리 연결선.
 *
 * BezierConnectors 와 같은 방식으로 rAF 루프에서 DOM 을 측정해 SVG path 를
 * 그린다. 좌표는 scale 로 나눠 canvas-inner 의 transform 과 무관하게 유지.
 *
 * 출발점은 부모 노드 블록(카드 + Objective 요약 묶음) 아래 가운데, 끝점은 자식 카드 위 가운데
 * (okr-policy §3.4-B · PW-2772). 노드를 끌면 블록이 함께 움직여 선이 따라온다.
 *
 * 모양 · 굵기 · 색은 조직도 연결선과 같다 — 조직도 `connectorPath` 'ortho' 를 그대로 써 자식마다
 * 출발점에서 내려가 «출발점과 그 카드 위의 가운데» 높이에서 꺾고 카드 위로 내려간다 · 1px 회색 실선
 * (okr-policy §3.4-B L4 v10.51 · C5 · C6 · C7 · PW-3079 · PW-3112). 같은 부모의 자식 카드 높이가 같으면
 * 가로 구간이 한 높이에서 겹쳐 가로줄 하나로 보인다. 종전 곡선은 자식이 옆으로 넓게 퍼지면 사선 다발이 됐다.
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

      // 처음 불러오는 중(골격)에는 선을 그리지 않는다 (okr-policy §3.4-B L7).
      const skeleton = container.querySelector('[data-testid="okr-tree-skeleton"]');
      // 부모 노드마다 «블록»(카드 + Objective 요약 묶음) 맨 아래 가운데 한 점에서 자식 카드 위
      // 가운데로 잇는다 — 전사도 예외 없다 (okr-policy §3.4-B L2·L3 · PW-2772). 요약 행 · «외 N개 …» ·
      // «등록된 Objective 없음» 은 모두 `.okr-objective-list` 안이라 그 아래가 블록 아래다. 접힌 노드는
      // 묶음이 없어 카드 아래. 종전엔 마지막 요약 행에서 출발해 행을 끌면 선이 행을 따라갔고,
      // 전사만 빈 자리 상자를 뚫고 나왔다.
      if (!skeleton) container.querySelectorAll('.okr-group-root, .okr-team-col').forEach(node => {
        const anchor = node.querySelector(':scope > .okr-objective-list')
          || node.querySelector(':scope > .okr-group-card');
        if (!anchor) return;
        const anchorRect = anchor.getBoundingClientRect();
        const from = { x: centerX(anchorRect), y: (anchorRect.bottom - containerRect.top) / s };
        // 아래 조직(사이 조직 포함 · T3) · 개인 노드 · «개인 OKR 없음» 상자(개인 노드 자리 · L1).
        const targets = node.querySelectorAll(
          ':scope > .okr-teams-row > .okr-team-col > .okr-group-card,'
          + ' :scope > .okr-persons-row > .okr-person-col > .okr-group-card,'
          + ' :scope > .okr-persons-row > .okr-persons-empty,'
          + ' :scope > .okr-members > .okr-member-chip:first-child',
        );
        // 위로 끌어 올린 자식(C5)은 꺾는 높이가 출발점 위라 출발점에서 위로 올라간다 — 기획서가 정한 모양(조직도와 같다).
        targets.forEach((target) => {
          const r = target.getBoundingClientRect();
          pathData += connectorPath(from.x, from.y, centerX(r), (r.top - containerRect.top) / s, 'ortho');
        });
      });

      // 조직도와 같은 선 — 1px 회색 실선 · 둥근 이음 (L4). 색은 조직도 `.connector-svg path` 가 쓰는 토큰
      // `--border-primary`(#d2d6db)를 그대로 — 두 화면이 같은 값을 읽는다.
      svg.innerHTML = `<path d="${pathData}" fill="none" style="stroke: var(--border-primary)" stroke-width="1" stroke-linejoin="round"/>`;
      rafRef.current = requestAnimationFrame(draw);
    };

    const timer = setTimeout(() => { rafRef.current = requestAnimationFrame(draw); }, 150);
    return () => { clearTimeout(timer); cancelAnimationFrame(rafRef.current); };
  }, [containerRef, scale]);

  return (
    <svg ref={svgRef} className="connector-svg" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }} />
  );
}
