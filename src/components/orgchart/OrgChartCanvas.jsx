import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Icon from '../shared/Icon.jsx';
import usePanZoom from '../shared/usePanZoom.js';
import OrgNode from './OrgNode.jsx';
import BezierConnectors from './BezierConnectors.jsx';
import ProfileModal from './ProfileModal.jsx';
import { PositionsContext, ModalContext, MoveContext, DragContext, CollapseContext } from './contexts.js';
import { loadPositions, savePositions } from './hooks.js';

/**
 * 처음 열었을 때 접어 둘 노드 = **루트를 뺀 모든 하위 조직**.
 *
 * 트리를 전부 펼친 채 그리면 조직이 커질수록 캔버스가 뷰포트를 압도한다
 * (138명 조직 기준 9670×7464px vs 뷰포트 910×646px — 첫 화면에 부서 카드
 * 37개 중 1개만 들어왔다). 전체가 들어오게 축소하면 배율이 8.7% 라 글자를
 * 읽을 수 없다. 그래서 루트만 펼치고 아래는 접은 채 시작하고, 사용자가
 * 필요한 가지만 눌러서 내려간다.
 */
function collapsedBelowRoot(root) {
  const ids = new Set();
  const walk = (node) => {
    if (!node?.children?.length) return;
    for (const child of node.children) {
      if (child.children?.length) ids.add(child.id);
      walk(child);
    }
  };
  walk(root);
  return ids;
}

// 첫 화면이 트리를 담도록 축소할 때의 하한. 이보다 더 줄이면 카드 글자를
// 못 읽어서 "보인다" 고 할 수 없다 — 나머지는 드래그로 본다.
const MIN_FIT_SCALE = 0.5;

// 조직 축 탭 노출 여부. 소비처가 아직 구현이 끝나지 않은 축을 닫을 수 있게 한다
// (pivit-work PW-249 — 프로젝트 축 phase 게이트). 기본값은 노출이라 기존 화면은 그대로다.
export default function OrgChartCanvas({ orgData: initialOrgData, icons, statIcons, baseUrl = '', onMemberClick, renderAvatar, editMode = false, onSubTabChange, findSubordinates, adminMode: adminModeProp = false, onAdminModeChange, showGrade = false, showProjectTab = true }) {
  const [orgData, setOrgData] = useState(initialOrgData);
  const [dropTarget, setDropTarget] = useState(null);
  const [collapsedIds, setCollapsedIds] = useState(() => collapsedBelowRoot(initialOrgData));

  // 외부 데이터가 바뀌면 로컬 편집 상태를 재초기화 (render 중 조정 패턴)
  const [prevInitialOrgData, setPrevInitialOrgData] = useState(initialOrgData);
  if (prevInitialOrgData !== initialOrgData) {
    setPrevInitialOrgData(initialOrgData);
    setOrgData(initialOrgData);
    setCollapsedIds(collapsedBelowRoot(initialOrgData));
  }

  const isCollapsed = useCallback((id) => collapsedIds.has(id), [collapsedIds]);
  const toggleCollapse = useCallback((id) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const collapseContext = useMemo(
    () => ({ isCollapsed, toggleCollapse }),
    [isCollapsed, toggleCollapse],
  );

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

  // 초기 카메라를 root 노드가 화면 가로 중앙에 오도록 맞추고, 트리가 뷰포트를
  // 넘으면 들어올 만큼 축소한다.
  // 트리는 canvas-inner 안에서 justify-content:center 로 가운데 정렬되므로,
  // 인원이 많아 트리가 뷰포트보다 넓으면 root 가 오른쪽으로 밀려 초기 뷰(translate 0)
  // 에서 빈 화면처럼 보인다. 마운트 후(레이아웃·커넥터 안정화 대기) 한 번만 보정한다.
  // 가로 중앙 정렬만으로는 부족하다 — 루트 직속 인원이 세로로 쌓이면 그 아래
  // 하위 조직 줄이 뷰포트 밖으로 밀려서, 스크롤바도 없는 캔버스에서는 "하위 조직이
  // 아예 없다" 로 보인다(PW-63 제보 경로). 그래서 세로도 함께 맞춘다.
  // 되돌리기 버튼도 이 계산을 다시 쓴다 — nonce 를 올려 effect 를 한 번 더 태운다.
  // (resetView() 가 먼저 scale 1 / translate 0 으로 돌려놓으므로 아래 실측 전제가 유지된다.)
  const didCenterRef = useRef(false);
  const [fitNonce, setFitNonce] = useState(0);
  const refitView = useCallback(() => {
    didCenterRef.current = false;
    setFitNonce(n => n + 1);
  }, []);
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
        const innerRect = inner.getBoundingClientRect();
        const deptRect = rootDept.getBoundingClientRect();
        if (!areaRect.width || !deptRect.width) return;

        // 이 effect 는 마운트 직후(scale 1 · translate 0) 한 번만 실행되므로,
        // 지금 재는 좌표가 곧 콘텐츠 로컬 좌표다.
        // 크기는 **레이아웃 박스**(offsetWidth/Height)로 잰다 — scrollWidth 를 쓰면
        // 배경 점무늬(`.canvas-inner::before`, 사방 5000px)까지 콘텐츠로 세어서
        // 트리가 실제보다 훨씬 큰 것으로 나오고 배율이 하한까지 떨어진다.
        const contentW = inner.offsetWidth;
        const contentH = inner.offsetHeight;
        const fit = Math.min(areaRect.width / contentW, areaRect.height / contentH);
        // 확대는 하지 않는다(작은 조직을 억지로 키우면 카드가 흐려진다). 축소만, 하한까지.
        const scale = Math.min(1, Math.max(MIN_FIT_SCALE, fit));

        // transformOrigin 이 0 0 이라 로컬 좌표 p 는 innerLeft + tx + scale*p 로 간다.
        // root 카드 중심을 뷰포트 가로 중앙에 두고, 콘텐츠 위쪽을 캔버스 위에 붙인다.
        const areaCenterX = areaRect.left + areaRect.width / 2;
        const deptCenterX = deptRect.left + deptRect.width / 2;
        setView(scale, {
          x: Math.round(areaCenterX - innerRect.left - scale * (deptCenterX - innerRect.left)),
          y: Math.round(areaRect.top - innerRect.top),
        });
        didCenterRef.current = true;
      });
    }, 160);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [orgData, fitNonce, setView, canvasRef]);

  return (
    // scale 은 카드 드래그가 화면 좌표를 캔버스 로컬 좌표로 되돌릴 때 쓴다(PW-248).
    <PositionsContext.Provider value={{ positions, updatePosition, scale }}>
    <ModalContext.Provider value={{ openModal }}>
    <MoveContext.Provider value={{ moveMember }}>
    <CollapseContext.Provider value={collapseContext}>
    <DragContext.Provider value={{ dropTarget, setDropTarget }}>
      {!onMemberClick && <ProfileModal member={selectedMember} onClose={closeModal} statIcons={statIcons} baseUrl={baseUrl} renderAvatar={renderAvatar} adminMode={adminMode} findSubordinates={findSubordinates} />}

      <div className="content-header">
        <div className="tab-nav">
          <span className="tab-active">조직도</span>
          {showProjectTab && (
            <span className="tab-inactive" onClick={() => onSubTabChange && onSubTabChange('project')}>프로젝트</span>
          )}
          <span className="tab-inactive" onClick={() => onSubTabChange && onSubTabChange('squad')}>스쿼드</span>
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
          <OrgNode node={orgData} showWorkHours={true} showVacation={true} editMode={editMode} adminMode={adminMode} showGrade={showGrade} baseUrl={baseUrl} />
        </div>

        <div className="zoom-controls">
          <button className="zoom-btn" onClick={zoomIn}>
            <Icon src={icons.plus} size={20} color="var(--text-primary)" baseUrl={baseUrl} />
          </button>
          <button className="zoom-btn" onClick={zoomOut}>
            <Icon src={icons.minus} size={20} color="var(--text-primary)" baseUrl={baseUrl} />
          </button>
          <button className="zoom-btn" onClick={() => { resetView(); resetPositions(); setCollapsedIds(collapsedBelowRoot(initialOrgData)); refitView(); }}>
            <Icon src={icons.refresh} size={20} color="var(--text-primary)" baseUrl={baseUrl} />
          </button>
        </div>
      </div>
    </DragContext.Provider>
    </CollapseContext.Provider>
    </MoveContext.Provider>
    </ModalContext.Provider>
    </PositionsContext.Provider>
  );
}
