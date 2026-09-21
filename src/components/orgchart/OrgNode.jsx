import React from 'react';
import DeptCard from './DeptCard.jsx';
import MemberCard from './MemberCard.jsx';
import { DragContext, CollapseContext } from './contexts.js';
import { useDrag } from './hooks.js';
import { useOrgLabels } from './orgchart-labels.jsx';

export default function OrgNode({ node, depth = 0, showWorkHours, showVacation, showGrade, editMode, adminMode, baseUrl = '', onMemberClick }) {
  const L = useOrgLabels();
  const hasChildren = node.children && node.children.length > 0;
  // 조직 없이 이 카드의 주인(대표·조직장)에게 바로 보고하는 사람 — «직속» 칸(pivit-specs
  // spec-org-hierarchy-exceptions.md §3 D1~D6). 조직이 아니라 사람이라 계층 이름을 달지 않고,
  // 소속 인원(members)과 섞지 않는다. 연결선은 점선(BezierConnectors)이다.
  const directReports = Array.isArray(node.directReports) ? node.directReports : [];
  // 멤버만 있는 팀/파트 카드도 접을 수 있다 — 시안(17501:19709)에서 파트 카드가
  // 멤버 리스트를 접는다. 접힘은 멤버·하위 조직을 함께 숨긴다.
  const hasBelow = hasChildren || (node.members && node.members.length > 0);
  const { isDragging, onDown, style, didDragRef } = useDrag(node.id);
  const { dropTarget } = React.useContext(DragContext);
  const isDropTarget = dropTarget && dropTarget.targetNodeId === node.id;

  // 대표 직속 조직(isStaff)은 회사 카드 바로 아래 자식에서만 뜻이 있다 — 최상위 조직
  // 줄에 세우지 않고 회사 카드 아래 세로선의 «곁가지»로 뺀다(pivit-specs
  // org-chart-public-card-spec.md §5.6). 하위 조직의 값은 무시한다.
  const staffChildren = depth === 0 && hasChildren ? node.children.filter((c) => c.isStaff) : [];
  const lineChildren = hasChildren ? (depth === 0 ? node.children.filter((c) => !c.isStaff) : node.children) : [];

  // 접기/펼치기. context 가 없으면(단독 사용) 항상 펼친 상태로 동작한다.
  const collapse = React.useContext(CollapseContext);
  const isCollapsed = hasBelow && !!collapse?.isCollapsed(node.id);
  const onDeptClick = () => {
    // 카드를 끌어 옮긴 직후에도 click 이 뒤따라 온다 — 그건 토글이 아니다.
    if (didDragRef.current) return;
    if (!hasBelow || !collapse) return;
    collapse.toggleCollapse(node.id);
  };

  const renderChild = (child) => (
    <OrgNode node={child} depth={depth + 1} showWorkHours={showWorkHours} showVacation={showVacation} showGrade={showGrade} editMode={editMode} adminMode={adminMode} baseUrl={baseUrl} onMemberClick={onMemberClick} />
  );

  return (
    <div
      className={`org-node ${hasChildren ? 'has-children' : ''} ${isDragging ? 'org-node-dragging' : ''}`}
      data-node-id={node.id}
      style={style}
    >
      <DeptCard
        node={node}
        onMouseDown={onDown}
        onClick={onDeptClick}
        isDragging={isDragging}
        isCollapsible={hasBelow && !!collapse}
        isCollapsed={isCollapsed}
        onToggle={() => collapse?.toggleCollapse(node.id)}
      />
      {node.members && !isCollapsed && (
        <div className={`members-list ${isDropTarget ? 'drop-target' : ''}`}>
          {node.members.map((m, i) => (
            <React.Fragment key={`${node.id}_${m.name}_${i}`}>
              {isDropTarget && dropTarget.insertIndex === i && (
                <div className="drop-indicator" />
              )}
              <MemberCard member={m} parentId={node.id} index={i} showWorkHours={showWorkHours} showVacation={showVacation} showGrade={showGrade} editMode={editMode} adminMode={adminMode} baseUrl={baseUrl} onMemberClick={onMemberClick} />
            </React.Fragment>
          ))}
          {isDropTarget && dropTarget.insertIndex >= node.members.length && (
            <div className="drop-indicator" />
          )}
        </div>
      )}
      {directReports.length > 0 && !isCollapsed && (
        <div className="direct-slot" data-testid="org-direct-slot">
          <div className="direct-slot-label">{node.directReportsLabel || L('org.directSlot', { count: directReports.length })}</div>
          {directReports.map((m, i) => (
            <MemberCard key={`${node.id}_direct_${m.id ?? i}`} member={m} parentId={`${node.id}__direct`} index={i} showWorkHours={showWorkHours} showVacation={showVacation} showGrade={showGrade} editMode={false} adminMode={adminMode} baseUrl={baseUrl} onMemberClick={onMemberClick} />
          ))}
        </div>
      )}
      {!node.members && isDropTarget && (
        <div className={`members-list drop-target`}>
          <div className="drop-indicator" />
        </div>
      )}
      {/* 곁가지 블록은 폭 0 이다 — 회사 카드가 조직도 가운데에 그대로 남고, 조직마다 세로선에서
          오른쪽으로 뻗어 위아래로 선다. 높이는 흐름에 남아 최상위 조직 줄을 아래로 민다.
          세로선·가지 선은 BezierConnectors 가 긋는다. */}
      {staffChildren.length > 0 && !isCollapsed && (
        <div className="staff-branches">
          {staffChildren.map((child) => (
            <div key={child.id} className="staff-branch">
              {renderChild(child)}
            </div>
          ))}
        </div>
      )}
      {lineChildren.length > 0 && !isCollapsed && (
        <div className="children-row">
          {lineChildren.map((child) => (
            <div key={child.id} className="child-branch">
              {renderChild(child)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
