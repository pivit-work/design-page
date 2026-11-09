import { LEVEL_COLORS } from './constants.js';
import { FoldToggleGlyph } from '../shared/lineIcons.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import { useOrgLabels } from './orgchart-labels.jsx';

/**
 * 조직 카드 — 이름 · 계층 · 인원.
 *
 * pivit-work 어드민 «조직단위 설정»(PW-2645)이 같은 카드 머리를 쓰려고 연 자리 — 안 넘기면 조직도 모양 그대로다.
 * - `nameSlot` — 이름 글자 대신 그릴 것(이름 고치기 입력칸 등). 자리·글씨(`.dept-name`)는 그대로.
 * - `titleExtra` — 이름 줄 끝에 붙일 것(손잡이 자리 등).
 * - `children` — 머리 아래 흰 칸(`.dept-card-body`)에 그릴 것(조직장 줄·사람 칩).
 * - `toggleCount` — 접혔을 때 접기 버튼에 함께 보일 하위 조직 수.
 * - `toggleLabel` — 접기 버튼의 읽기 이름을 쓰는 쪽 문구로 바꿀 때.
 * - `toggleProps` — 접기 버튼에 더 붙일 속성(data-testid 등).
 *
 * 스쿼드 그림 보기 «구조»(pivit-work PW-2599 3회차)가 조직도와 같은 카드를 쓰려고 연 자리 — 안 넘기면 조직도 모양 그대로다.
 * - `metaExtra` — 둘째 줄(계층 이름 · 인원) 끝에 붙일 것(«리드 미지정» 등).
 * - `cardProps` — 카드 틀에 더 붙일 속성. `className` 은 덧붙고 `style` 은 바탕 위에 덮인다(묶음 색 바탕 등).
 * - `node.countColor` — 인원 글자색을 계층 색 대신 쓸 때(묶음 색).
 * - `node.level` 이 계층 색표에 없으면 바탕을 칠하지 않는다(쓰는 쪽 클래스가 칠한다).
 */
export default function DeptCard({ node, onMouseDown, onClick, isDragging, isCollapsible, isCollapsed, onToggle, nameSlot, titleExtra, children, toggleCount, toggleLabel, toggleProps, metaExtra, cardProps }) {
  const lc = LEVEL_COLORS[node.level] || {};
  const { className: cardClass, style: cardStyle, ...cardRest } = cardProps || {};
  const L = useOrgLabels();
  // 하위(멤버·하위 조직)가 있는 카드는 접기/펼치기 토글이다. 카드 클릭 토글에 더해
  // 하단 중앙에 시각 토글 버튼을 둔다 — Figma 16558:19978(펼침 ∧)/17501:19709(접힘 ∨).
  return (
    <div
      className={`dept-card ${isDragging ? 'card-dragging' : ''}${cardClass ? ` ${cardClass}` : ''}`}
      style={{ background: lc.bg, ...cardStyle }}
      onMouseDown={onMouseDown}
      onClick={onClick}
      aria-expanded={isCollapsible ? !isCollapsed : undefined}
      data-collapsed={isCollapsible ? String(!!isCollapsed) : undefined}
      {...cardRest}
    >
      <div className="dept-title">
        <div className="dept-name">{nameSlot ?? node.name}</div>
        {/* 대표 직속 조직(§5.6) — 문구는 소비자가 로케일로 준다(staffLabel). */}
        {node.isStaff && <StatusBadge className="role-badge role-badge-staff">{node.staffLabel || L('org.staffBadge')}</StatusBadge>}
        {titleExtra}
      </div>
      <div className="dept-meta">
        <span className="dept-type">{node.type}</span>
        {node.count && <span className="dept-count" style={{ color: node.countColor ?? lc.countColor }}>{node.count}</span>}
        {metaExtra}
      </div>
      {/* 어드민 As Of 조직도의 «인건비»(보상 표시가 켜졌을 때만 · pivit-work PW-1998). 다른 화면은 넘기지 않는다.
          compLines 를 주면 이름표 오른쪽에 통화마다 한 줄을 세로로 쌓는다 — 통화가 섞여도 카드 폭이 늘지 않게(정책 E27). */}
      {node.compLines ? (
        <div className="dept-comp dept-comp-stack" data-testid="org-dept-comp">
          <span>{node.compLabel}</span>
          <span className="dept-comp-lines">
            {node.compLines.map((line) => <span key={line}>{line}</span>)}
          </span>
        </div>
      ) : node.compLine && <div className="dept-comp" data-testid="org-dept-comp">{node.compLine}</div>}
      {children != null && children !== false && <div className="dept-card-body">{children}</div>}
      {isCollapsible && (
        <button
          type="button"
          className={`dept-toggle${isCollapsed ? ' is-collapsed' : ''}${isCollapsed && toggleCount ? ' has-count' : ''}`}
          aria-label={toggleLabel ?? L(isCollapsed ? 'org.expandChildren' : 'org.collapseChildren', { name: node.name })}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          {...toggleProps}
        >
          {isCollapsed && toggleCount ? <span>{toggleCount}</span> : null}
          {/* 17px 는 Figma 아이콘 프레임 크기 — 실제 글리프는 12px 로 그려야 시안 비율. */}
          <FoldToggleGlyph />
        </button>
      )}
    </div>
  );
}
