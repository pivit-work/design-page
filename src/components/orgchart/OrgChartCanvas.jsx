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

  const { canvasRef, scale, translate, isDragging, canvasProps, zoomIn, zoomOut, resetView, setView } = usePanZoom({
    ignoreSelector: '.zoom-controls, .member-node, .dept-card',
  });
  const canvasInnerRef = useRef(null);

  // 초기 카메라를 root 노드가 화면 가로 중앙에 오도록 맞춘다.
  // 트리는 canvas-inner 안에서 justify-content:center 로 가운데 정렬되므로,
  // 인원이 많아 트리가 뷰포트보다 넓으면 root 가 오른쪽으로 밀려 초기 뷰(translate 0)
  // 에서 빈 화면처럼 보인다. 마운트 후(레이아웃·커넥터 안정화 대기) 한 번만 보정한다.
  const didCenterRef = useRef(false);
  useEffect(() => { didCenterRef.current = false; }, [initialOrgData]);
  useEffect(() => {
    if (didCenterRef.current) return;
    const area = canvasRef.current;
    const inner = canvasInnerRef.current;
    if (!area || !inner) return;
    let raf = 0;
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(() => {
        // root(회사) 노드의 카드를 뷰포트 가로 중앙에 맞춘다. 트리는 비대칭이라
        // 콘텐츠 폭의 절반이 아니라 root 카드 실제 위치를 기준으로 보정해야 한다.
        const rootDept = inner.querySelector(':scope > .org-node > .dept-card');
        if (!rootDept) return;
        const areaRect = area.getBoundingClientRect();
        const deptRect = rootDept.getBoundingClientRect();
        if (!areaRect.width || !deptRect.width) return;
        // 이 effect 는 마운트 직후(translate 0) 한 번만 실행되므로, root 카드 중심을
        // 뷰포트 중심으로 옮기는 이동량이 곧 목표 translate.x 가 된다.
        const areaCenterX = areaRect.left + areaRect.width / 2;
        const deptCenterX = deptRect.left + deptRect.width / 2;
        setView(1, { x: Math.round(areaCenterX - deptCenterX), y: 0 });
        didCenterRef.current = true;
      });
    }, 160);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [orgData, setView, canvasRef]);

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
