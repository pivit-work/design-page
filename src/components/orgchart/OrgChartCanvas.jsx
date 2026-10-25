import React, { useState, useCallback, useMemo } from 'react';
import Icon from '../shared/Icon.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import OrgChartViewport from './OrgChartViewport.jsx';
import OrgTabNav from './OrgTabNav.jsx';
import ProfileModal from './ProfileModal.jsx';
import { PositionsContext, ModalContext, MoveContext, DragContext, MemberPatchContext } from './contexts.js';
import { loadPositions, savePositions, collapsedStorageKey, loadCollapsed } from './hooks.js';
import { OrgLabelsContext, makeOrgLabels } from './orgchart-labels.jsx';

// 조직 축 탭 노출 여부. 소비처가 아직 구현이 끝나지 않은 축을 닫을 수 있게 한다
// (pivit-work PW-249 — 프로젝트 축 phase 게이트). 기본값은 노출이라 기존 화면은 그대로다.
// 가운데 탭은 「리스트」(Figma 16610:35972 · 2026-10-25) — 누르면 onSubTabChange('list'). prop 이름은 그대로 둔다.
// highlight `{ unitIds }` — 회사 루트부터 내 소속까지의 단위 id. 주면 그 길의 연결선을 강조한다
// (pivit-specs org-chart-public-card-spec.md §5.4-B). 안 주면 강조가 없다 — 다른 화면은 넘기지 않는다.
// workspaceId — 접힘 상태를 조직마다 브라우저에 기억할 때 쓴다(§5.4 「상태 유지」). 안 주면 이번 화면에서만 기억한다.
// asOf — 기준일 { value, min, max, onChange, label?, caption?, note?, locale?, display?, pickerLabels? }.
//   캔버스 왼쪽 툴바의 달력 버튼이 된다(Figma 17755:26872). 안 주면 버튼이 없다.
// density / onDensityChange — 보이는 정보의 양 'all' | 'leaders' | 'count' (Figma 17755:26846).
//   안 주면 캔버스가 세션 안에서 스스로 기억한다(기본 'all').
// onDownloadImage({ element, orgData }) — 「이미지로 다운」(17755:26909)을 호스트가 직접 처리할 때.
//   안 주면 캔버스가 지금 펼쳐진 조직도를 JPG 로 바로 내려받는다(exportOrgChartImage.js).
// memberPatches — { [member.id]: { workHours, attendance, … } }. 사람 카드 몇 칸만 바꿀 때 orgData 를 새로 넘기지
//   않고 이것으로 덧씌운다 — orgData 가 새 객체면 끌어 둔 위치·화면 자리가 처음으로 돌아간다(pivit-work PW-2210).
// expandable — «전체 화면»(17755:26946) 버튼. 기본 true. 누르면 같은 조직도를 화면 가득한 창에 띄운다 —
//   리포트 보기 창과 같은 틀(ModalShell)이다.
export default function OrgChartCanvas({ orgData: initialOrgData, icons, statIcons, baseUrl = '', onMemberClick, renderAvatar, editMode = false, onSubTabChange, findSubordinates, adminMode: adminModeProp = false, onAdminModeChange, showGrade = false, showProjectTab = false, showListTab = true, lineStyleLabel: lineStyleLabelProp, labels, asOf, highlight, workspaceId, density: densityProp, onDensityChange, onDownloadImage, expandable = true, memberPatches }) {
  // 화면 문구 — 소비자가 번역을 넘긴다(PW-705). 안 넘기면 한국어 기본값.
  const L = useMemo(() => makeOrgLabels(labels), [labels]);
  // `lineStyleLabel` 은 `labels` 보다 먼저 생긴 자리라 그대로 받는다 — 주면 그것이 이긴다.
  const lineStyleLabel = lineStyleLabelProp || L('org.lineStyle');
  const [orgData, setOrgData] = useState(initialOrgData);
  const [dropTarget, setDropTarget] = useState(null);
  // 연결선 직각(기본) ↔ 곡선 — 세션 상태다. 새로고침하면 직각으로 돌아온다.
  // 직각이 기본인 까닭: 형제 조직의 선이 상위 부서 아래 한 가로줄에서 갈라진다(pivit-work PW-1820, 2026-10-14 회의).
  // 전체 펼치기·접기는 트리 모양을 바꾸는 버튼이라 이 값은 건드리지 않는다.
  const [lineStyle, setLineStyle] = useState('ortho');
  // 보이는 정보의 양 — 호스트가 주면 그 값, 아니면 세션 상태(기본 전체).
  const [densityState, setDensityState] = useState('all');
  const density = densityProp ?? densityState;
  const changeDensity = useCallback((next) => {
    if (densityProp === undefined) setDensityState(next);
    onDensityChange?.(next);
  }, [densityProp, onDensityChange]);
  // 첫 화면은 전체 펼침(빈 집합)이다. 기억해 둔 접힘이 있으면 그대로 연다(§5.4 엣지 8).
  // 기억해 둔 id 가 지금 트리에 없으면(조직 개편) 아무 노드도 안 접힐 뿐이다(엣지 3).
  const collapseKey = collapsedStorageKey(workspaceId);
  const [collapsedIds, setCollapsedIds] = useState(() => loadCollapsed(collapseKey));
  // «전체 화면» 창 — 페이지 캔버스와 같은 트리·접힘·연결선·보이는 양을 본다. 팬·줌만 따로다.
  const [expanded, setExpanded] = useState(false);

  // 외부 데이터가 바뀌면 로컬 편집 상태를 재초기화 (render 중 조정 패턴).
  // 접힘은 사용자가 고른 상태라 두고 간다 — 기준일을 바꿔도 접어 둔 조직은 접힌 채다.
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

  // 뷰포트가 받는 것 — 페이지 캔버스와 전체 화면 창이 같은 값을 본다.
  const viewportProps = {
    orgData,
    collapsedIds,
    setCollapsedIds,
    collapseKey,
    resetPositions,
    lineStyle,
    onLineStyleChange: setLineStyle,
    density,
    onDensityChange: changeDensity,
    asOf,
    highlight,
    icons,
    baseUrl,
    editMode,
    adminMode,
    showGrade,
    L,
    lineStyleLabel,
    onDownloadImage,
  };

  return (
    // scale 은 카드 드래그가 화면 좌표를 캔버스 로컬 좌표로 되돌릴 때 쓴다(PW-248) — 뷰포트가 넣는다.
    <OrgLabelsContext.Provider value={L}>
    <MemberPatchContext.Provider value={memberPatches ?? null}>
    <PositionsContext.Provider value={{ positions, updatePosition }}>
    <ModalContext.Provider value={{ openModal }}>
    <MoveContext.Provider value={{ moveMember }}>
    <DragContext.Provider value={{ dropTarget, setDropTarget }}>
      {!onMemberClick && <ProfileModal member={selectedMember} onClose={closeModal} statIcons={statIcons} baseUrl={baseUrl} renderAvatar={renderAvatar} adminMode={adminMode} findSubordinates={findSubordinates} />}

      <div className="content-header">
        <OrgTabNav active="orgchart" onSubTabChange={onSubTabChange} showProjectTab={showProjectTab} showListTab={showListTab} L={L} />
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

      {/* 끌기 안내 — 시안(16596:49052)은 머리글 줄 오른쪽 끝, 캔버스 위에 둔다. */}
      <div className="drag-hint org-drag-hint">
        <Icon src={icons.expand} size={14} color="var(--text-brand-tertiary)" baseUrl={baseUrl} />
        <span>{L('org.dragHint')}</span>
      </div>

      <OrgChartViewport {...viewportProps} onExpandView={expandable ? () => setExpanded(true) : undefined} />

      {expanded && (
        <ModalShell
          ariaLabel={L('tab.orgchart')}
          closeLabel={L('org.closeExpandView')}
          onClose={() => setExpanded(false)}
          footer={null}
          className="org-expand-shell"
          bodyClassName="org-expand-body"
          testId="org-expand-modal"
          closeTestId="org-expand-close"
        >
          <OrgChartViewport {...viewportProps} expanded />
        </ModalShell>
      )}
    </DragContext.Provider>
    </MoveContext.Provider>
    </ModalContext.Provider>
    </PositionsContext.Provider>
    </MemberPatchContext.Provider>
    </OrgLabelsContext.Provider>
  );
}
