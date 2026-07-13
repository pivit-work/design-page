import React, { useState, useRef, useCallback, useEffect } from 'react';
import Icon from '../shared/Icon.jsx';
import usePanZoom from '../shared/usePanZoom.js';
import OrgNode from './OrgNode.jsx';
import BezierConnectors from './BezierConnectors.jsx';
import ProfileModal from './ProfileModal.jsx';
import { PositionsContext, ModalContext, MoveContext, DragContext } from './contexts.js';
import { loadPositions, savePositions } from './hooks.js';

export default function OrgChartCanvas({ orgData: initialOrgData, icons, statIcons, baseUrl = '', onMemberClick, renderAvatar, editMode = false, onSubTabChange, findSubordinates, adminMode: adminModeProp = false, onAdminModeChange }) {
  const [orgData, setOrgData] = useState(initialOrgData);
  const [dropTarget, setDropTarget] = useState(null);

  // 외부 데이터가 바뀌면 로컬 편집 상태를 재초기화 (render 중 조정 패턴)
  const [prevInitialOrgData, setPrevInitialOrgData] = useState(initialOrgData);
  if (prevInitialOrgData !== initialOrgData) {
    setPrevInitialOrgData(initialOrgData);
    setOrgData(initialOrgData);
  }

  const [positions, setPositions] = useState(loadPositions);
  const updatePosition = useCallback((id, pos) => {
    setPositions(prev => {
      const next = { ...prev, [id]: pos };
      savePositions(next);
      return next;
    });
  }, []);
  const resetPositions = useCallback(() => {
    setPositions({});
    savePositions({});
  }, []);

  const moveMember = useCallback((sourceNodeId, sourceIndex, targetNodeId, insertIndex) => {
    setOrgData(prev => {
      const next = JSON.parse(JSON.stringify(prev));

      function findNode(node, id) {
        if (node.id === id) return node;
        if (node.children) {
          for (const child of node.children) {
            const found = findNode(child, id);
            if (found) return found;
          }
        }
        return null;
      }

      const sourceNode = findNode(next, sourceNodeId);
      const targetNode = findNode(next, targetNodeId);
      if (!sourceNode || !targetNode || !sourceNode.members) return prev;

      const [member] = sourceNode.members.splice(sourceIndex, 1);
      if (!member) return prev;
      if (!targetNode.members) targetNode.members = [];
      targetNode.members.splice(insertIndex, 0, member);

      return next;
    });
  }, []);

  // 출퇴근 시간 / 휴가는 항상 표시. adminMode 는 consumer 가 사용자 role 기반으로 제어.
  const adminMode = adminModeProp;

  const [selectedMember, setSelectedMember] = useState(null);
  const openModal = useCallback((member) => {
    if (onMemberClick) onMemberClick(member);
    else setSelectedMember(member);
  }, [onMemberClick]);
  const closeModal = useCallback(() => setSelectedMember(null), []);

  const { canvasRef, scale, translate, isDragging, canvasProps, zoomIn, zoomOut, resetView } = usePanZoom({
    ignoreSelector: '.zoom-controls, .member-node, .dept-card',
  });
  const canvasInnerRef = useRef(null);

  return (
    <PositionsContext.Provider value={{ positions, updatePosition }}>
    <ModalContext.Provider value={{ openModal }}>
    <MoveContext.Provider value={{ moveMember }}>
    <DragContext.Provider value={{ dropTarget, setDropTarget }}>
      {!onMemberClick && <ProfileModal member={selectedMember} onClose={closeModal} statIcons={statIcons} baseUrl={baseUrl} renderAvatar={renderAvatar} adminMode={adminMode} findSubordinates={findSubordinates} />}

      <div className="content-header">
        <div className="tab-nav">
          <span className="tab-active">조직도</span>
          <span className="tab-inactive" onClick={() => onSubTabChange && onSubTabChange('project')}>프로젝트</span>
        </div>
        <div className="header-subtitle">
          <b>전체 인원</b>
          <span className="dot">&#8729;</span>
          <span className="brand-count">{orgData?.count ?? ''}</span>
        </div>
      </div>

      <div
        className="canvas-area"
        ref={canvasRef}
        {...canvasProps}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="drag-hint">
          <Icon src={icons.expand} size={14} color="var(--text-brand-tertiary)" baseUrl={baseUrl} />
          <span>화면을 드래그하면 좀 더 쉽게 조직도를 보실 수 있습니다.</span>
        </div>

        <div className="canvas-inner" ref={canvasInnerRef} style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          position: 'relative',
        }}>
          <BezierConnectors containerRef={canvasInnerRef} scale={scale} />
          <OrgNode node={orgData} showWorkHours={true} showVacation={true} editMode={editMode} adminMode={adminMode} baseUrl={baseUrl} />
        </div>

        <div className="zoom-controls">
          <button className="zoom-btn" onClick={zoomIn}>
            <Icon src={icons.plus} size={20} color="var(--text-primary)" baseUrl={baseUrl} />
          </button>
          <button className="zoom-btn" onClick={zoomOut}>
            <Icon src={icons.minus} size={20} color="var(--text-primary)" baseUrl={baseUrl} />
          </button>
          <button className="zoom-btn" onClick={() => { resetView(); resetPositions(); }}>
            <Icon src={icons.refresh} size={20} color="var(--text-primary)" baseUrl={baseUrl} />
          </button>
        </div>
      </div>
    </DragContext.Provider>
    </MoveContext.Provider>
    </ModalContext.Provider>
    </PositionsContext.Provider>
  );
}
