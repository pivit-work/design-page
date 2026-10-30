import React, { useState, useCallback, useMemo } from 'react';
import OrgChartViewport from './OrgChartViewport.jsx';
import { PositionsContext, ModalContext, MoveContext, DragContext, MemberPatchContext } from './contexts.js';
import { OrgLabelsContext, makeOrgLabels } from './orgchart-labels.jsx';

const NOOP = () => {};
const NO_MOVE = { moveMember: NOOP };

/**
 * OrgChartTreeView — 조직도 화면의 트리(회사 → 조직 단위 → 사람 카드 · 연결선)만 그린다.
 * 카드·연결선·확대 이동은 `OrgChartCanvas` 와 같은 부품(OrgChartViewport · OrgNode)이고, 캔버스 안 툴바·
 * 머리글·탭은 없다. 버튼을 화면 머리에 따로 두는 어드민 As Of 조직도(pivit-work PW-1998 ·
 * org-snapshot-spec §5-B «새 시각 언어를 만들지 않는다»)가 쓴다.
 *
 * - 접힘은 호스트가 갖는다(`collapsedIds` · `onCollapsedIdsChange`) — 머리의 «전체 펼치기/접기»가 바꾼다.
 *   브라우저에 기억하지 않는다(조직도 화면의 접힘 기억과 섞이지 않게).
 * - 끌어 옮긴 카드 위치도 이 화면 안에서만 기억한다 — 조직도 화면의 위치 기억(localStorage)과 섞지 않는다.
 * - `onInnerElement(el)` 로 트리 요소(canvas-inner)를 알린다 — 호스트가 «이미지»를 뜰 때 쓴다.
 * - `fitKey` 가 바뀌면 첫 화면 위치(회사 카드 가운데 위)로 다시 맞춘다.
 */
export default function OrgChartTreeView({
  orgData,
  collapsedIds,
  onCollapsedIdsChange,
  icons = {},
  baseUrl = '',
  labels,
  showGrade = true,
  onMemberClick,
  onInnerElement,
  fitKey,
  density = 'all',
}) {
  const L = useMemo(() => makeOrgLabels(labels), [labels]);
  const [positions, setPositions] = useState({});
  const updatePosition = useCallback((id, pos) => setPositions((prev) => ({ ...prev, [id]: pos })), []);
  const resetPositions = useCallback(() => setPositions({}), []);
  const [dropTarget, setDropTarget] = useState(null);
  const setCollapsedIds = useCallback((next) => {
    const value = typeof next === 'function' ? next(collapsedIds) : next;
    onCollapsedIdsChange?.(value);
  }, [collapsedIds, onCollapsedIdsChange]);
  const modal = useMemo(() => ({ openModal: onMemberClick ?? NOOP }), [onMemberClick]);

  return (
    <OrgLabelsContext.Provider value={L}>
    <MemberPatchContext.Provider value={null}>
    <PositionsContext.Provider value={{ positions, updatePosition }}>
    <ModalContext.Provider value={modal}>
    <MoveContext.Provider value={NO_MOVE}>
    <DragContext.Provider value={{ dropTarget, setDropTarget }}>
      <OrgChartViewport
        orgData={orgData}
        collapsedIds={collapsedIds}
        setCollapsedIds={setCollapsedIds}
        collapseKey={null}
        resetPositions={resetPositions}
        lineStyle="ortho"
        onLineStyleChange={NOOP}
        density={density}
        onDensityChange={NOOP}
        icons={icons}
        baseUrl={baseUrl}
        showGrade={showGrade}
        L={L}
        lineStyleLabel={L('org.lineStyle')}
        toolbars={false}
        onInnerElement={onInnerElement}
        fitKey={fitKey}
      />
    </DragContext.Provider>
    </MoveContext.Provider>
    </ModalContext.Provider>
    </PositionsContext.Provider>
    </MemberPatchContext.Provider>
    </OrgLabelsContext.Provider>
  );
}
