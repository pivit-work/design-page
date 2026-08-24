import React, { useState, useRef, useCallback } from 'react';
import Icon from '../shared/Icon.jsx';
import { MEMBER_STATUSES } from './constants.js';
import { ModalContext, DragContext, MoveContext } from './contexts.js';
import { usePositions, useDrag } from './hooks.js';
import assetUrl from '../shared/assetUrl.js';

export default function MemberCard({ member, parentId, index, showWorkHours, showVacation, showGrade, editMode, adminMode, baseUrl = '', onMemberClick }) {
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
  const absX = Math.abs(pos.x);
  // detach 히스테리시스: 200 을 넘어야 detach, 50 아래로 돌아와야 복귀.
  // 단위는 **캔버스 로컬 px**(카드 폭과 같은 좌표계)이라 배율과 무관하게
  // "카드 한 장 폭쯤 끌어냈으면 떼어낸 것" 으로 일정하게 판정된다(PW-248).
  // "Adjusting state while rendering" 패턴으로 state 로 관리 — ref 를
  // 렌더 중 읽는 안티패턴을 피한다.
  const [isDetached, setIsDetached] = useState(false);
  const targetDetached = !editMode
    ? false
    : isDetached
    ? absX > 50
    : absX > 200;
  if (targetDetached !== isDetached) setIsDetached(targetDetached);

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
      {showVacation && member.onVacation && <img src={assetUrl(baseUrl, 'vacation.png')} alt="" className="vacation-img" />}
      <div className="member-content">
        <div className="member-row">
          <div className="avatar-wrap">
            <img src={member.avatar} alt="" className="avatar-sm" />
            <span className="online-dot" style={{ background: status.dotColor }} />
          </div>
          <span className="member-name">{member.name}</span>
          {member.role && <span className={`role-badge role-badge-${member.role.toLowerCase()}`}>{member.role}</span>}
          {/* 조직 구조상의 대표 1인. isCeo 만 근거로 삼는다 — 권한이 대표거나
              직책 문자열이 '대표'인 것만으로는 붙지 않는다. */}
          {member.isCeo && <span className="role-badge role-badge-ceo">{member.ceoLabel || '대표'}</span>}
          {/* 로그인한 본인 표식. 문구는 소비 측이 로케일에 맞춰 넘긴다(selfLabel) —
              ceoLabel 과 같은 규약. 안 넘기면 한국어로 폴백한다. */}
          {member.isSelf && <span className="role-badge role-badge-self">{member.selfLabel || '나'}</span>}
        </div>
        {showGrade && (member.grade || member.position) && (
          <div className="member-grade">
            {[member.grade, member.position].filter(Boolean).join(' · ')}
          </div>
        )}
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
        {adminMode && member.hcScore != null && (() => {
          const score = member.hcScore;
          const hcColor = score >= 7 ? '#2dbd82' : score >= 5 ? '#f79009' : '#f04438';
          return (
            <div className="hc-score-section">
              <div className="hc-score-bar">
                <div className="hc-score-active" style={{ width: `${score * 10}%`, background: hcColor }} />
              </div>
              <div className="hc-score-info" style={{ color: hcColor }}>
                <Icon src="/icons/check-heart.svg" size={14} color={hcColor} baseUrl={baseUrl} />
                <span>{score}</span>
              </div>
            </div>
          );
        })()}
      </div>
      <span className="status-badge-member" style={{ background: status.badgeBg }}>{statusLabel}</span>
    </div>
  );
}
