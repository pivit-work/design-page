import React, { useState, useRef, useCallback, useEffect } from 'react';
import Icon from '../shared/Icon.jsx';
import OrgNode from './OrgNode.jsx';
import BezierConnectors from './BezierConnectors.jsx';
import ProfileModal from './ProfileModal.jsx';
import { PositionsContext, ModalContext, MoveContext, DragContext } from './contexts.js';
import { loadPositions, savePositions } from './hooks.js';

export default function OrgChartCanvas({ orgData: initialOrgData, icons, statIcons, baseUrl = '', onMemberClick, renderAvatar }) {
  const [orgData, setOrgData] = useState(initialOrgData);
  const [dropTarget, setDropTarget] = useState(null);

  // Sync when external data changes
  useEffect(() => { setOrgData(initialOrgData); }, [initialOrgData]);

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

  const [showWorkHours, setShowWorkHours] = useState(true);
  const [showVacation, setShowVacation] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  const [selectedMember, setSelectedMember] = useState(null);
  const openModal = useCallback((member) => {
    if (onMemberClick) onMemberClick(member);
    else setSelectedMember(member);
  }, [onMemberClick]);
  const closeModal = useCallback(() => setSelectedMember(null), []);

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const canvasInnerRef = useRef(null);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const prevScale = scaleRef.current;
    const nextScale = Math.min(Math.max(0.2, prevScale - e.deltaY * 0.002), 3);
    const ratio = nextScale / prevScale;

    const prevT = translateRef.current;
    const nextT = {
      x: mouseX - ratio * (mouseX - prevT.x),
      y: mouseY - ratio * (mouseY - prevT.y),
    };

    scaleRef.current = nextScale;
    translateRef.current = nextT;
    setScale(nextScale);
    setTranslate(nextT);
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const onMouseDown = (e) => {
    if (e.target.closest('.zoom-controls, .member-node, .dept-card')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
  };
  const onMouseMove = (e) => {
    if (!isDragging) return;
    const t = {
      x: translateStart.current.x + (e.clientX - dragStart.current.x),
      y: translateStart.current.y + (e.clientY - dragStart.current.y),
    };
    translateRef.current = t;
    setTranslate(t);
  };
  const onMouseUp = () => setIsDragging(false);
  const resetView = () => { setScale(1); setTranslate({ x: 0, y: 0 }); scaleRef.current = 1; translateRef.current = { x: 0, y: 0 }; resetPositions(); };

  return (
    <PositionsContext.Provider value={{ positions, updatePosition }}>
    <ModalContext.Provider value={{ openModal }}>
    <MoveContext.Provider value={{ moveMember }}>
    <DragContext.Provider value={{ dropTarget, setDropTarget }}>
      {!onMemberClick && <ProfileModal member={selectedMember} onClose={closeModal} statIcons={statIcons} baseUrl={baseUrl} renderAvatar={renderAvatar} />}

      <div className="content-header">
        <div className="tab-nav">
          <span className="tab-active">조직도</span>
          <span className="tab-inactive">프로젝트</span>
          <span className="tab-inactive">리스트</span>
        </div>
        <div className="header-subtitle">
          <b>전체 인원</b>
          <span className="dot">&#8729;</span>
          <span className="brand-count">34명</span>
        </div>
      </div>

      <div
        className="canvas-area"
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="drag-hint">
          <Icon src={icons.expand} size={14} color="var(--text-brand-tertiary)" baseUrl={baseUrl} />
          <span>화면을 드래그하면 좀 더 쉽게 조직도를 보실 수 있습니다.</span>
        </div>

        <div className="canvas-toggles">
          <label className="canvas-toggle">
            <span className="canvas-toggle-label">출퇴근 시간</span>
            <button className={`toggle-switch ${showWorkHours ? 'toggle-on' : ''}`} onClick={() => setShowWorkHours(!showWorkHours)}>
              <span className="toggle-knob" />
            </button>
          </label>
          <label className="canvas-toggle">
            <span className="canvas-toggle-label">휴가</span>
            <button className={`toggle-switch ${showVacation ? 'toggle-on' : ''}`} onClick={() => setShowVacation(!showVacation)}>
              <span className="toggle-knob" />
            </button>
          </label>
          <label className="canvas-toggle">
            <span className="canvas-toggle-label">수정</span>
            <button className={`toggle-switch ${editMode ? 'toggle-on' : ''}`} onClick={() => setEditMode(!editMode)}>
              <span className="toggle-knob" />
            </button>
          </label>
          <label className="canvas-toggle">
            <span className="canvas-toggle-label">어드민</span>
            <button className={`toggle-switch ${adminMode ? 'toggle-on' : ''}`} onClick={() => setAdminMode(!adminMode)}>
              <span className="toggle-knob" />
            </button>
          </label>
        </div>

        <div className="canvas-inner" ref={canvasInnerRef} style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          position: 'relative',
        }}>
          <BezierConnectors containerRef={canvasInnerRef} scale={scale} />
          <OrgNode node={orgData} showWorkHours={showWorkHours} showVacation={showVacation} editMode={editMode} adminMode={adminMode} baseUrl={baseUrl} />
        </div>

        <div className="zoom-controls">
          <button className="zoom-btn" onClick={() => { const s = Math.min(scaleRef.current + 0.1, 3); scaleRef.current = s; setScale(s); }}>
            <Icon src={icons.plus} size={20} color="var(--text-primary)" baseUrl={baseUrl} />
          </button>
          <button className="zoom-btn" onClick={() => { const s = Math.max(scaleRef.current - 0.1, 0.2); scaleRef.current = s; setScale(s); }}>
            <Icon src={icons.minus} size={20} color="var(--text-primary)" baseUrl={baseUrl} />
          </button>
          <button className="zoom-btn" onClick={resetView}>
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
