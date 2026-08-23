import { LEVEL_COLORS } from './constants.js';

export default function DeptCard({ node, onMouseDown, onClick, isDragging, isCollapsible, isCollapsed, onToggle }) {
  const lc = LEVEL_COLORS[node.level];
  // 하위(멤버·하위 조직)가 있는 카드는 접기/펼치기 토글이다. 카드 클릭 토글에 더해
  // 하단 중앙에 시각 토글 버튼을 둔다 — Figma 16558:19978(펼침 ∧)/17501:19709(접힘 ∨).
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
      {isCollapsible && (
        <button
          type="button"
          className={`dept-toggle${isCollapsed ? ' is-collapsed' : ''}`}
          aria-label={`${node.name} 하위 조직 ${isCollapsed ? '펼치기' : '접기'}`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
        >
          {/* 17px 는 Figma 아이콘 프레임 크기 — 실제 글리프는 12px 로 그려야 시안 비율. */}
          <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2.5 7.5 6 4l3.5 3.5" />
          </svg>
        </button>
      )}
    </div>
  );
}
