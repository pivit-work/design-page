import React from 'react';
import DeptCard from './DeptCard';
import MemberCard from './MemberCard';
import { DragContext } from './contexts';
import { useDrag } from './hooks';

export default function OrgNode({ node, depth = 0, showWorkHours, showVacation, editMode, baseUrl = '', onMemberClick }) {
  const hasChildren = node.children && node.children.length > 0;
  const { isDragging, onDown, style } = useDrag(node.id);
  const { dropTarget } = React.useContext(DragContext);
  const isDropTarget = dropTarget && dropTarget.targetNodeId === node.id;

  return (
    <div
      className={`org-node ${hasChildren ? 'has-children' : ''} ${isDragging ? 'org-node-dragging' : ''}`}
      data-node-id={node.id}
      style={style}
    >
      <DeptCard node={node} onMouseDown={onDown} isDragging={isDragging} />
      {node.members && (
        <div className={`members-list ${isDropTarget ? 'drop-target' : ''}`}>
          {node.members.map((m, i) => (
            <React.Fragment key={`${node.id}_${m.name}_${i}`}>
              {isDropTarget && dropTarget.insertIndex === i && (
                <div className="drop-indicator" />
              )}
              <MemberCard member={m} parentId={node.id} index={i} showWorkHours={showWorkHours} showVacation={showVacation} editMode={editMode} baseUrl={baseUrl} onMemberClick={onMemberClick} />
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
      {hasChildren && (
        <div className="children-row">
          {node.children.map(child => (
            <div key={child.id} className="child-branch">
              <OrgNode node={child} depth={depth + 1} showWorkHours={showWorkHours} showVacation={showVacation} editMode={editMode} baseUrl={baseUrl} onMemberClick={onMemberClick} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
