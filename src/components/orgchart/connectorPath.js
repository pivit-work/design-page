/**
 * 부모-자식 연결선 한 가닥. 직각(기본)은 수직-수평-수직, 곡선은 베지어.
 * pivit-specs org-chart-public-card-spec.md §5.1 — 세 화면이 같은 모양을 쓴다.
 * OKR 대시보드 트리 선도 이 식을 그대로 쓴다(okr-policy §3.4-B L4 «대시보드 선 = 조직도 선» · pivit-work PW-3079).
 */
export function connectorPath(x1, y1, x2, y2, lineStyle = 'ortho') {
  const midY = (y1 + y2) / 2;
  return lineStyle === 'ortho'
    ? `M ${x1} ${y1} V ${midY} H ${x2} V ${y2} `
    : `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2} `;
}
