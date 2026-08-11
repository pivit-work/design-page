import { LEVEL_COLORS } from './constants.js';

export default function DeptCard({ node, onMouseDown, onClick, isDragging, isCollapsible, isCollapsed }) {
  const lc = LEVEL_COLORS[node.level];
  // 하위 조직이 있는 카드는 접기/펼치기 토글이다. 시각 요소는 더하지 않고
  // (카드 자체가 이미 pointer 커서다) 상태만 보조기술·테스트에 노출한다.
  return (
    <div
      className={`dept-card ${isDragging ? 'card-dragging' : ''}`}
      style={{ background: lc.bg }}
      onMouseDown={onMouseDown}
      onClick={onClick}
      aria-expanded={isCollapsible ? !isCollapsed : undefined}
      data-collapsed={isCollapsible ? String(!!isCollapsed) : undefined}
    >
      <div className="dept-name">{node.name}</div>
      <div className="dept-meta">
        <span className="dept-type">{node.type}</span>
        {node.count && <span className="dept-count" style={{ color: lc.countColor }}>{node.count}</span>}
      </div>
    </div>
  );
}
