import { LEVEL_COLORS } from './constants.js';

export default function DeptCard({ node, onMouseDown, isDragging }) {
  const lc = LEVEL_COLORS[node.level];
  return (
    <div
      className={`dept-card ${isDragging ? 'card-dragging' : ''}`}
      style={{ background: lc.bg }}
      onMouseDown={onMouseDown}
    >
      <div className="dept-name">{node.name}</div>
      <div className="dept-meta">
        <span className="dept-type">{node.type}</span>
        {node.count && <span className="dept-count" style={{ color: lc.countColor }}>{node.count}</span>}
      </div>
    </div>
  );
}
