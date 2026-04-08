import React, { useState, useRef, useCallback } from 'react';
import Icon from '../shared/Icon';
import { MEMBER_STATUSES } from './constants';
import { ModalContext, DragContext, MoveContext } from './contexts';
import { usePositions, useDrag } from './hooks';

export default function MemberCard({ member, parentId, index, showWorkHours, showVacation, editMode, baseUrl = '', onMemberClick }) {
  const memberId = `${parentId}_member_${index}`;
  const modalCtx = React.useContext(ModalContext);
  const openModal = onMemberClick || modalCtx?.openModal;
  const { positions, updatePosition } = usePositions();
  const { moveMember } = React.useContext(MoveContext);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const memberNodeRef = useRef(null);

  const { setDropTarget } = React.useContext(DragContext);

  const findDropTarget = useCallback((cardEl) => {
    if (!cardEl) return null;
    const allLists = document.querySelectorAll('.members-list');
    const cardRect = cardEl.getBoundingClientRect();
    const cardCenterX = cardRect.left + cardRect.width / 2;
    const cardCenterY = cardRect.top + cardRect.height / 2;

    let bestList = null;
    let bestDist = 150;

    allLists.forEach(list => {
      const listRect = list.getBoundingClientRect();
      const expandedTop = listRect.top - 40;
      const expandedBottom = listRect.bottom + 40;
      const listCenterX = listRect.left + listRect.width / 2;
      const dx = Math.abs(cardCenterX - listCenterX);
      const isVerticallyClose = cardCenterY >= expandedTop && cardCenterY <= expandedBottom;
      if (dx < bestDist && isVerticallyClose) {
        bestDist = dx;
        bestList = list;
      }
    });

    if (!bestList) return null;

    const targetOrgNode = bestList.closest('.org-node');
    const targetNodeId = targetOrgNode?.dataset.nodeId;
    if (!targetNodeId || targetNodeId === parentId) return null;

    const memberNodes = bestList.querySelectorAll(':scope > .member-node');
    let insertIdx = memberNodes.length;
    for (let i = 0; i < memberNodes.length; i++) {
      const mRect = memberNodes[i].getBoundingClientRect();
      if (cardCenterY < mRect.top + mRect.height / 2) {
        insertIdx = i;
        break;
      }
    }

    return { targetNodeId, insertIndex: insertIdx };
  }, [parentId]);

  const handleDragMove = useCallback((ev, pos) => {
    if (!editMode || Math.abs(pos.x) < 200) {
      setDropTarget(null);
      return;
    }
    const target = findDropTarget(memberNodeRef.current);
    setDropTarget(target);
  }, [editMode, findDropTarget, setDropTarget]);

  const handleDrop = useCallback((ev) => {
    setDropTarget(null);
    if (!editMode) return;
    const pos = positions[memberId] || { x: 0, y: 0 };
    if (Math.abs(pos.x) < 200) return;

    const target = findDropTarget(memberNodeRef.current);
    if (!target) return;

    moveMember(parentId, index, target.targetNodeId, target.insertIndex);
    updatePosition(memberId, { x: 0, y: 0 });
  }, [memberId, parentId, index, positions, moveMember, updatePosition, findDropTarget, setDropTarget, editMode]);

  const { isDragging, onDown, style } = useDrag(memberId, handleDrop, handleDragMove);

  const handleMouseDown = (e) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    onDown(e);
  };

  const handleClick = (e) => {
    const dx = Math.abs(e.clientX - dragStartPos.current.x);
    const dy = Math.abs(e.clientY - dragStartPos.current.y);
    if (dx < 5 && dy < 5) {
      openModal(member);
    }
  };

  const status = member.statusColors || MEMBER_STATUSES[member.status] || MEMBER_STATUSES.working;
  const statusLabel = member.statusLabel || status.label;
  const pos = positions[memberId] || { x: 0, y: 0 };
  const wasDetached = useRef(false);
  const absX = Math.abs(pos.x);
  if (!editMode) {
    wasDetached.current = false;
  } else if (wasDetached.current) {
    wasDetached.current = absX > 50;
  } else {
    wasDetached.current = absX > 200;
  }
  const isDetached = wasDetached.current;

  return (
    <div
      ref={memberNodeRef}
      className={`member-node ${isDragging ? 'member-dragging' : ''} ${isDetached ? 'member-detached' : ''}`}
      data-detached={isDetached ? 'true' : undefined}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      style={{
        ...style,
        '--member-border-color': status.borderColor,
      }}
    >
      {showVacation && member.onVacation && <img src={`${baseUrl}vacation.png`} alt="" className="vacation-img" />}
      <div className="member-content">
        <div className="member-row">
          <div className="avatar-wrap">
            <img src={member.avatar} alt="" className="avatar-sm" />
            <span className="online-dot" style={{ background: status.dotColor }} />
          </div>
          <span className="member-name">{member.name}</span>
          {member.role && <span className={`role-badge role-badge-${member.role.toLowerCase()}`}>{member.role}</span>}
        </div>
        {showWorkHours && member.workHours && (
          <>
            <div className="working-time-bar">
              <div className="active-bar" style={{ width: `${member.attendance || 0}%` }} />
            </div>
            <div className="working-time-info">
              <div className="working-time-left">
                <Icon src="/icons/clock-stopwatch.svg" size={14} color="#b1b6be" baseUrl={baseUrl} />
                <span>{member.attendance || 0}%</span>
              </div>
              <span className="working-time-right">{member.workHours}</span>
            </div>
          </>
        )}
      </div>
      <span className="status-badge-member" style={{ background: status.badgeBg }}>{statusLabel}</span>
    </div>
  );
}
