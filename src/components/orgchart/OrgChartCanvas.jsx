import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import Icon from '../shared/Icon.jsx';
import { ConnectorCurveGlyph, ConnectorElbowGlyph, PlusSquareGlyph, MinusSquareGlyph } from '../shared/lineIcons.jsx';
import usePanZoom from '../shared/usePanZoom.js';
import DateInput from '../shared/DateInput.jsx';
import OrgNode from './OrgNode.jsx';
import BezierConnectors from './BezierConnectors.jsx';
import ProfileModal from './ProfileModal.jsx';
import { PositionsContext, ModalContext, MoveContext, DragContext, CollapseContext } from './contexts.js';
import { loadPositions, savePositions, collapsedStorageKey, loadCollapsed, saveCollapsed, clearCollapsed } from './hooks.js';
import { OrgLabelsContext, makeOrgLabels } from './orgchart-labels.jsx';

/**
 * [전체 접기](⊟)가 접는 노드 = **루트를 뺀 모든 하위 조직**. 회사 카드와 최상위 조직 카드만 남는다.
 *
 * 2026-10-10 까지는 이것이 첫 화면이었다(PW-63). 2026-10-11 기획서 개정으로 첫 화면은
 * 전체 펼침이 됐고 이 모양은 ⊟ 의 결과로 남았다(PW-1952 · §5.4 「초기 펼침 범위」).
 *
 * **사람만 있는 조직도 접는다** — 하위 조직만 세면 사람만 있는 최상위 조직이 펼쳐진 채
 * 열려, 기획서의 「회사 카드 + 최상위 조직 카드까지 · 그 안은 접힘」과 어긋난다
 * (pivit-specs org-chart-public-card-spec.md §5.4 · TC-ORG-105).
 */
function collapsedBelowRoot(root) {
  const ids = new Set();
  const walk = (node) => {
    if (!node?.children?.length) return;
    for (const child of node.children) {
      if (child.children?.length || child.members?.length) ids.add(child.id);
      walk(child);
    }
  };
  walk(root);
  return ids;
}

/** 지금 곡선이다 — 누르면 직각으로. */
function CurveLineIcon() {
  return <ConnectorCurveGlyph size={20} />;
}

/** 지금 직각이다 — 누르면 곡선으로. */
function OrthoLineIcon() {
  return <ConnectorElbowGlyph size={20} />;
}

// 조직 축 탭 노출 여부. 소비처가 아직 구현이 끝나지 않은 축을 닫을 수 있게 한다
// (pivit-work PW-249 — 프로젝트 축 phase 게이트). 기본값은 노출이라 기존 화면은 그대로다.
// highlight `{ unitIds }` — 회사 루트부터 내 소속까지의 단위 id. 주면 그 길의 연결선을 강조한다
// (pivit-specs org-chart-public-card-spec.md §5.4-B). 안 주면 강조가 없다 — 다른 화면은 넘기지 않는다.
// workspaceId — 접힘 상태를 조직마다 브라우저에 기억할 때 쓴다(§5.4 「상태 유지」). 안 주면 이번 화면에서만 기억한다.
export default function OrgChartCanvas({ orgData: initialOrgData, icons, statIcons, baseUrl = '', onMemberClick, renderAvatar, editMode = false, onSubTabChange, findSubordinates, adminMode: adminModeProp = false, onAdminModeChange, showGrade = false, showProjectTab = true, lineStyleLabel: lineStyleLabelProp, labels, asOf, highlight, workspaceId }) {
  // 화면 문구 — 소비자가 번역을 넘긴다(PW-705). 안 넘기면 한국어 기본값.
  const L = useMemo(() => makeOrgLabels(labels), [labels]);
  // `lineStyleLabel` 은 `labels` 보다 먼저 생긴 자리라 그대로 받는다 — 주면 그것이 이긴다.
  const lineStyleLabel = lineStyleLabelProp || L('org.lineStyle');
  const [orgData, setOrgData] = useState(initialOrgData);
  const [dropTarget, setDropTarget] = useState(null);
  // 연결선 직각(기본) ↔ 곡선 — 세션 상태다. 새로고침하면 직각으로 돌아온다.
  // 직각이 기본인 까닭: 형제 조직의 선이 상위 부서 아래 한 가로줄에서 갈라진다(pivit-work PW-1820, 2026-10-14 회의).
  // 전체 펼치기(⊞)·접기(⊟)는 트리 모양을 바꾸는 버튼이라 이 값은 건드리지 않는다.
  const [lineStyle, setLineStyle] = useState('ortho');
  // 첫 화면은 전체 펼침(빈 집합)이다. 기억해 둔 접힘이 있으면 그대로 연다(§5.4 엣지 8).
  // 기억해 둔 id 가 지금 트리에 없으면(조직 개편) 아무 노드도 안 접힐 뿐이다(엣지 3).
  const collapseKey = collapsedStorageKey(workspaceId);
  const [collapsedIds, setCollapsedIds] = useState(() => loadCollapsed(collapseKey));

  // 외부 데이터가 바뀌면 로컬 편집 상태를 재초기화 (render 중 조정 패턴).
  // 접힘은 사용자가 고른 상태라 두고 간다 — 기준일을 바꿔도 접어 둔 조직은 접힌 채다.
  const [prevInitialOrgData, setPrevInitialOrgData] = useState(initialOrgData);
  if (prevInitialOrgData !== initialOrgData) {
    setPrevInitialOrgData(initialOrgData);
    setOrgData(initialOrgData);
  }

  const canvasInnerRef = useRef(null);
  // 배지로 한 조직을 여닫으면 트리 폭이 바뀌고, 트리는 가운데 정렬이라 화면 전체가 옆으로 밀린다
  // (브라우저 실측: 최상위 조직 하나를 접자 632px 튀었다). 기획서는 «보던 자리가 튀면 안 된다» —
  // 누른 카드의 화면 위치를 재 두었다가, 다시 그린 직후 그만큼 이동값을 되돌린다(§5.4 「첫 화면 위치」).
  const toggleAnchorRef = useRef(null);
  const findDeptCard = useCallback((id) => {
    const inner = canvasInnerRef.current;
    if (!inner) return null;
    const node = [...inner.querySelectorAll('[data-node-id]')].find(el => el.dataset.nodeId === String(id));
    return node?.querySelector(':scope > .dept-card') ?? null;
  }, []);

  const isCollapsed = useCallback((id) => collapsedIds.has(id), [collapsedIds]);
  const toggleCollapse = useCallback((id) => {
    const rect = findDeptCard(id)?.getBoundingClientRect();
    toggleAnchorRef.current = rect ? { id, left: rect.left, top: rect.top } : null;
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveCollapsed(collapseKey, next);
      return next;
    });
  }, [collapseKey, findDeptCard]);
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

  const { canvasRef, scale, translate, isDragging, canvasProps, zoomIn, zoomOut, setView } = usePanZoom({
    ignoreSelector: '.zoom-controls, .member-node, .dept-card',
  });

  // 첫 화면 위치 — 회사 카드를 캔버스 가로 가운데 · 맨 위에 둔다. **줌 배율은 바꾸지 않는다**
  // (pivit-specs §5.4 「첫 화면 위치」 2026-10-11). 트리는 canvas-inner 안에서
  // justify-content:center 로 가운데 정렬되므로, 전체 펼침이면 트리가 뷰포트보다 넓어
  // translate 0 에서는 회사 카드가 오른쪽 끝(줌 버튼 밑)에 걸린다.
  // 마운트 후(레이아웃·커넥터 안정화 대기) 한 번 맞추고, ⊞·⊟ 를 누른 직후에도 다시 맞춘다 —
  // nonce 를 올려 effect 를 한 번 더 태운다. 배지로 한 조직을 여닫을 때는 맞추지 않는다(보던 자리가 튀면 안 된다).
  // 지금 배율·이동값은 ref 로 읽는다 — effect 의존성에 넣으면 끌 때마다 다시 맞춰 버린다.
  const viewRef = useRef({ scale, translate });
  useEffect(() => { viewRef.current = { scale, translate }; }, [scale, translate]);
  useLayoutEffect(() => {
    const anchor = toggleAnchorRef.current;
    if (!anchor) return;
    toggleAnchorRef.current = null;
    const rect = findDeptCard(anchor.id)?.getBoundingClientRect();
    if (!rect) return;
    const dx = anchor.left - rect.left;
    const dy = anchor.top - rect.top;
    if (!dx && !dy) return;
    // 배율·이동값은 ref 로 읽는다 — 의존성에 넣으면 끄는 동안에도 돌아 카메라가 붙잡힌다.
    const { scale: s, translate: t } = viewRef.current;
    setView(s, { x: Math.round(t.x + dx), y: Math.round(t.y + dy) });
  }, [collapsedIds, setView, findDeptCard]);
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

        // 재는 좌표는 지금 화면(배율·이동이 걸린 뒤)이다. 배율은 그대로 두고 이동만 그 차이만큼
        // 옮기면 된다 — transformOrigin 이 0 0 이라 이동은 화면 좌표에 그대로 더해진다.
        const { scale: s, translate: t } = viewRef.current;
        const areaCenterX = areaRect.left + areaRect.width / 2;
        const deptCenterX = deptRect.left + deptRect.width / 2;
        setView(s, {
          x: Math.round(t.x + areaCenterX - deptCenterX),
          y: Math.round(t.y + areaRect.top - innerRect.top),
        });
        didCenterRef.current = true;
      });
    }, 160);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [orgData, fitNonce, setView, canvasRef]);

  return (
    // scale 은 카드 드래그가 화면 좌표를 캔버스 로컬 좌표로 되돌릴 때 쓴다(PW-248).
    <OrgLabelsContext.Provider value={L}>
    <PositionsContext.Provider value={{ positions, updatePosition, scale }}>
    <ModalContext.Provider value={{ openModal }}>
    <MoveContext.Provider value={{ moveMember }}>
    <CollapseContext.Provider value={collapseContext}>
    <DragContext.Provider value={{ dropTarget, setDropTarget }}>
      {!onMemberClick && <ProfileModal member={selectedMember} onClose={closeModal} statIcons={statIcons} baseUrl={baseUrl} renderAvatar={renderAvatar} adminMode={adminMode} findSubordinates={findSubordinates} />}

      <div className="content-header">
        <div className="tab-nav">
          <span className="tab-active">{L('tab.orgchart')}</span>
          {showProjectTab && (
            <span className="tab-inactive" onClick={() => onSubTabChange && onSubTabChange('project')}>{L('tab.project')}</span>
          )}
          <span className="tab-inactive" onClick={() => onSubTabChange && onSubTabChange('squad')}>{L('tab.squad')}</span>
        </div>
        <div className="header-subtitle">
          <b>{L('org.totalHeadcount')}</b>
          <span className="dot">&#8729;</span>
          {/* 머리글은 회사 카드와 다른 문구를 받을 수 있다 — 회사 카드에만 `· 미배정 N` 을
              붙이는 소비자가 `summaryCount` 로 머리글 문구를 따로 준다. 없으면 카드와 같다. */}
          <span className="brand-count">{orgData?.summaryCount ?? orgData?.count ?? ''}</span>
          {/* 지난 날짜를 보는 중이면 그 사실을 인원 줄에 잇는다 — 「2026-03-01 기준 · 보기 전용」 */}
          {asOf?.note && (
            <>
              <span className="dot">&#8729;</span>
              <b data-testid="org-asof-note">{asOf.note}</b>
            </>
          )}
        </div>
      </div>

      {/* 기준일 칸(pivit-work PW-1836) — 어드민 As Of 탭의 날짜 칸과 같은 모양.
          min 은 기록 시작일, max 는 오늘이다. 캡션은 경계를 만나기 전에 늘 보인다. */}
      {asOf && (
        <div className="org-asof" data-testid="org-asof">
          {asOf.caption && <div className="org-asof-caption">{asOf.caption}</div>}
          <div className="org-asof-picker">
            <span className="org-asof-label">{asOf.label}</span>
            <DateInput
              min={asOf.min}
              max={asOf.max}
              value={asOf.value}
              locale={asOf.locale}
              today={asOf.max}
              onChange={(v) => asOf.onChange?.(v)}
            />
          </div>
        </div>
      )}

      <div
        className="canvas-area"
        ref={canvasRef}
        {...canvasProps}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="drag-hint">
          <Icon src={icons.expand} size={14} color="var(--text-brand-tertiary)" baseUrl={baseUrl} />
          <span>{L('org.dragHint')}</span>
        </div>

        <div className="canvas-inner" ref={canvasInnerRef} style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          position: 'relative',
        }}>
          <BezierConnectors containerRef={canvasInnerRef} scale={scale} lineStyle={lineStyle} highlightIds={highlight?.unitIds} />
          <OrgNode node={orgData} showWorkHours={true} showVacation={true} editMode={editMode} adminMode={adminMode} showGrade={showGrade} baseUrl={baseUrl} />
        </div>

        <div className="zoom-controls">
          <button className="zoom-btn" onClick={zoomIn}>
            <Icon src={icons.plus} size={20} color="var(--text-primary)" baseUrl={baseUrl} />
          </button>
          <button className="zoom-btn" onClick={zoomOut}>
            <Icon src={icons.minus} size={20} color="var(--text-primary)" baseUrl={baseUrl} />
          </button>
          {/* ⊞ 전체 펼치기 — 종전 ↺(처음 화면으로) 자리를 잇는다: 접힘을 비우고 기억도 지우고,
              끌어 옮긴 카드도 제자리로. ⊟ 전체 접기 — 회사·최상위 조직 카드만 남기고 그 상태를 기억한다.
              둘 다 연결선 모양·줌 배율은 그대로 둔다(§5.4 「전체 펼치기·접기」). */}
          <button
            type="button"
            className="zoom-btn"
            title={L('org.expandAll')}
            aria-label={L('org.expandAll')}
            data-action="expand-all"
            style={{ color: 'var(--text-primary)' }}
            onClick={() => { resetPositions(); setCollapsedIds(new Set()); clearCollapsed(collapseKey); refitView(); }}
          >
            <PlusSquareGlyph size={20} />
          </button>
          <button
            type="button"
            className="zoom-btn"
            title={L('org.collapseAll')}
            aria-label={L('org.collapseAll')}
            data-action="collapse-all"
            style={{ color: 'var(--text-primary)' }}
            onClick={() => { const next = collapsedBelowRoot(orgData); setCollapsedIds(next); saveCollapsed(collapseKey, next); refitView(); }}
          >
            <MinusSquareGlyph size={20} />
          </button>
          {/* 다섯 번째 버튼 — 아이콘은 «지금» 모양을 그린다(어드민 조직단위 설정과 같다).
              직각(상위 부서 라인 맞춤)일 때 눌린 모양이라 지금 상태가 아이콘 말고도 보인다(PW-1820). */}
          <button
            type="button"
            className="zoom-btn"
            title={L(lineStyle === 'ortho' ? 'org.lineStyleOrtho' : 'org.lineStyleCurve')}
            aria-label={lineStyleLabel}
            aria-pressed={lineStyle === 'ortho'}
            data-line-style={lineStyle}
            style={lineStyle === 'ortho'
              ? { color: 'var(--text-brand-secondary)', background: 'var(--bg-brand-secondary)' }
              : { color: 'var(--text-primary)' }}
            onClick={() => setLineStyle(prev => (prev === 'ortho' ? 'curve' : 'ortho'))}
          >
            {lineStyle === 'ortho' ? <OrthoLineIcon /> : <CurveLineIcon />}
          </button>
        </div>
      </div>
    </DragContext.Provider>
    </CollapseContext.Provider>
    </MoveContext.Provider>
    </ModalContext.Provider>
    </PositionsContext.Provider>
    </OrgLabelsContext.Provider>
  );
}
