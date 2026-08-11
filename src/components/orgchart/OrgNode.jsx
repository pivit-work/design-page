import React from 'react';
import DeptCard from './DeptCard.jsx';
import MemberCard from './MemberCard.jsx';
import { DragContext, CollapseContext } from './contexts.js';
import { useDrag } from './hooks.js';

export default function OrgNode({ node, depth = 0, showWorkHours, showVacation, showGrade, editMode, adminMode, baseUrl = '', onMemberClick }) {
  const hasChildren = node.children && node.children.length > 0;
  const { isDragging, onDown, style, didDragRef } = useDrag(node.id);
  const { dropTarget } = React.useContext(DragContext);
  const isDropTarget = dropTarget && dropTarget.targetNodeId === node.id;

  // 접기/펼치기. context 가 없으면(단독 사용) 항상 펼친 상태로 동작한다.
  const collapse = React.useContext(CollapseContext);
  const isCollapsed = hasChildren && !!collapse?.isCollapsed(node.id);
  const onDeptClick = () => {
    // 카드를 끌어 옮긴 직후에도 click 이 뒤따라 온다 — 그건 토글이 아니다.
    if (didDragRef.current) return;
    if (!hasChildren || !collapse) return;
    collapse.toggleCollapse(node.id);
  };

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
        isCollapsible={hasChildren && !!collapse}
        isCollapsed={isCollapsed}
      />
      {node.members && (
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
      {!node.members && isDropTarget && (
        <div className={`members-list drop-target`}>
          <div className="drop-indicator" />
        </div>
      )}
      {hasChildren && !isCollapsed && (
        <div className="children-row">
          {node.children.map(child => (
            <div key={child.id} className="child-branch">
              <OrgNode node={child} depth={depth + 1} showWorkHours={showWorkHours} showVacation={showVacation} showGrade={showGrade} editMode={editMode} adminMode={adminMode} baseUrl={baseUrl} onMemberClick={onMemberClick} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
