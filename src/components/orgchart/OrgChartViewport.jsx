import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import Icon from '../shared/Icon.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import {
  CornerAngleGlyph,
  CornerSmoothGlyph,
  ContractVerticalGlyph,
  ExpandVerticalGlyph,
  ExpandScreenGlyph,
  DownloadSolidGlyph,
  AutoArrangeGlyph,
} from '../shared/lineIcons.jsx';
import usePanZoom from '../shared/usePanZoom.js';
import OrgNode from './OrgNode.jsx';
import BezierConnectors from './BezierConnectors.jsx';
import { CollapseContext, PositionsContext } from './contexts.js';
import { saveCollapsed, clearCollapsed, countMovedCards } from './hooks.js';
import exportOrgChartImage from './exportOrgChartImage.js';
import AsOfButton from './AsOfButton.jsx';
import { ISO, toIso, pad2 } from './asOfDate.js';

/**
 * [전체 접기]가 접는 노드 = **루트를 뺀 모든 하위 조직**. 회사 카드와 최상위 조직 카드만 남는다.
 *
 * 2026-10-10 까지는 이것이 첫 화면이었다(PW-63). 2026-10-11 기획서 개정으로 첫 화면은
 * 전체 펼침이 됐고 이 모양은 «전체 접기»의 결과로 남았다(PW-1952 · §5.4 「초기 펼침 범위」).
 *
 * **사람만 있는 조직도 접는다** — 하위 조직만 세면 사람만 있는 최상위 조직이 펼쳐진 채
 * 열려, 기획서의 「회사 카드 + 최상위 조직 카드까지 · 그 안은 접힘」과 어긋난다
 * (pivit-specs org-chart-public-card-spec.md §5.4 · TC-ORG-105).
 */
export function collapsedBelowRoot(root) {
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

/**
 * OrgChartViewport — 조직도를 **그리는 자리** (캔버스 + 툴바). Figma 16596:48857 (2026-10-25 개정).
 *
 * `OrgChartCanvas` 가 데이터·접힘·연결선 모양·보이는 양 같은 상태를 갖고, 이 부품은 그것을
 * 받아 한 뷰포트에 그린다. 같은 상태를 두 곳에 그릴 수 있어서 떼어 냈다 — 페이지 안의 캔버스와
 * «전체 화면»(17755:26946) 창이 같은 트리·같은 접힘을 본다. 팬·줌은 뷰포트마다 따로다.
 *
 * 툴바 (캔버스 안쪽 위 16px):
 *  - 왼쪽(17755:26880): 보이는 정보 양 세그먼트(전체 · 리더만 · 인원수만) + 기준일 버튼(날짜 고르기)
 *  - 오른쪽(17755:26881): 확대 · 축소 · 연결선 모양 토글 · 자동 정렬(PW-2347) · 전체 펼치기/접기 토글 · 「이미지로 다운」
 *    그리고 30px 띄워 «전체 화면» 버튼. 토글 둘은 **지금 상태의 아이콘**을 보인다 —
 *    직각이면 꺾인 모서리(17755:26882), 곡선이면 둥근 모서리(17755:26938);
 *    펼쳐져 있으면 모으기(17755:26898), 접혀 있으면 펼치기(17755:26941).
 */
export default function OrgChartViewport({
  orgData,
  collapsedIds,
  setCollapsedIds,
  collapseKey,
  resetPositions,
  lineStyle,
  onLineStyleChange,
  density,
  onDensityChange,
  asOf,
  highlight,
  icons,
  baseUrl = '',
  editMode = false,
  adminMode = false,
  showGrade = false,
  L,
  lineStyleLabel,
  onDownloadImage,
  onExpandView,
  expanded = false,
  // 왼쪽 툴바 맨 앞에 서는 것 — 페이지 캔버스의 트리/리스트 전환(17788:33262). 전체 화면 창은 안 넘긴다.
  toolbarLeading,
  // toolbars=false — 캔버스 안 툴바 둘을 그리지 않는다. 버튼을 화면 머리에 따로 두는 곳(어드민 As Of 조직도 ·
  // pivit-work PW-1998)이 쓴다. 트리·카드·연결선·끌기·확대는 그대로다.
  toolbars = true,
  // onInnerElement(el) — 트리 요소(canvas-inner)를 호스트에 알린다. 머리 버튼으로 이미지를 뜰 때 쓴다(PW-1998).
  onInnerElement,
  // fitKey — 값이 바뀌면 첫 화면 위치로 다시 맞춘다. 호스트가 펼침을 한꺼번에 바꿀 때(전체 펼치기·접기) 넘긴다.
  fitKey,
}) {
  const canvasInnerRef = useRef(null);
  const setInnerRef = useCallback((el) => {
    canvasInnerRef.current = el;
    onInnerElement?.(el);
  }, [onInnerElement]);
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
  }, [collapseKey, findDeptCard, setCollapsedIds]);
  const collapseContext = useMemo(
    () => ({ isCollapsed, toggleCollapse }),
    [isCollapsed, toggleCollapse],
  );

  // 전체 펼치기/접기 토글 — 접을 수 있는 하위 조직이 모두 접혀 있으면 «접힘»(누르면 펼친다).
  const belowRoot = useMemo(() => collapsedBelowRoot(orgData), [orgData]);
  const allCollapsed = belowRoot.size > 0 && [...belowRoot].every((id) => collapsedIds.has(id));

  const { canvasRef, scale, translate, isDragging, canvasProps, zoomIn, zoomOut, setView } = usePanZoom({
    ignoreSelector: '.org-toolbar, .member-node, .dept-card',
  });

  // 첫 화면 위치 — 회사 카드를 캔버스 가로 가운데 · 맨 위에 둔다. **줌 배율은 바꾸지 않는다**
  // (pivit-specs §5.4 「첫 화면 위치」 2026-10-11). 트리는 canvas-inner 안에서
  // justify-content:center 로 가운데 정렬되므로, 전체 펼침이면 트리가 뷰포트보다 넓어
  // translate 0 에서는 회사 카드가 오른쪽 끝(툴바 밑)에 걸린다.
  // 마운트 후(레이아웃·커넥터 안정화 대기) 한 번 맞추고, 전체 펼치기·접기 직후에도 다시 맞춘다 —
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
    const { scale: s, translate: t } = viewRef.current;
    setView(s, { x: Math.round(t.x + dx), y: Math.round(t.y + dy) });
  }, [collapsedIds, setView, findDeptCard]);
  const didCenterRef = useRef(false);
  const [fitNonce, setFitNonce] = useState(0);
  const refitView = useCallback(() => {
    didCenterRef.current = false;
    setFitNonce(n => n + 1);
  }, []);
  useEffect(() => { didCenterRef.current = false; }, [orgData]);
  const fitKeyRef = useRef(fitKey);
  useEffect(() => {
    if (fitKeyRef.current === fitKey) return;
    fitKeyRef.current = fitKey;
    refitView();
  }, [fitKey, refitView]);
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

  // 전체 펼치기 — 접힘을 비우고 기억도 지우고, 끌어 옮긴 카드도 제자리로.
  // 전체 접기 — 회사·최상위 조직 카드만 남기고 그 상태를 기억한다.
  // 둘 다 연결선 모양·줌 배율은 그대로 둔다(§5.4 「전체 펼치기·접기」).
  const expandAll = () => {
    resetPositions?.();
    setCollapsedIds(new Set());
    clearCollapsed(collapseKey);
    refitView();
  };
  const collapseAll = () => {
    const next = collapsedBelowRoot(orgData);
    setCollapsedIds(next);
    saveCollapsed(collapseKey, next);
    refitView();
  };
  // 자동 정렬 — 끌어 옮긴 위치만 지우고 첫 화면 위치로. 접힘·연결선·줌·보이는 양은 그대로(§5.4-D).
  // 흐린 버튼은 툴팁이 떠야 해서 disabled 대신 aria-disabled 라, 여기서 무동작으로 막는다.
  const positionsCtx = React.useContext(PositionsContext);
  const movedCount = useMemo(() => countMovedCards(orgData, positionsCtx?.positions), [orgData, positionsCtx?.positions]);
  const autoArrange = () => {
    if (!movedCount) return;
    resetPositions?.();
    refitView();
  };

  // 기준일 — 버튼·달력은 리스트 탭과 같은 AsOfButton 이다. 여기서는 내려받는 파일 이름에만 값을 쓴다.
  const asOfValid = !!asOf?.value && ISO.test(asOf.value);

  // 「이미지로 다운」 — 호스트가 `onDownloadImage` 를 주면 그것을, 아니면 여기서 바로 JPG 로 뜬다.
  // 뜨는 동안(글꼴·아바타 받기) 버튼을 잠근다 — 두 번 눌러 두 장 받지 않게.
  const [exporting, setExporting] = useState(false);
  const downloadImage = async () => {
    const element = canvasInnerRef.current;
    if (onDownloadImage) { onDownloadImage({ element, orgData }); return; }
    if (exporting || !element) return;
    setExporting(true);
    try {
      // 이름: 「조직도_2026-04-10_14-32-05」 — 날짜는 보고 있는 기준일(없으면 오늘), 시각은 내려받은 지금.
      const now = new Date();
      const date = asOfValid ? asOf.value : toIso(now);
      const time = `${pad2(now.getHours())}-${pad2(now.getMinutes())}-${pad2(now.getSeconds())}`;
      await exportOrgChartImage({ element, fileName: L('org.imageFileName', { date, time }) });
    } finally {
      setExporting(false);
    }
  };

  const densityItems = [
    { value: 'all', label: L('org.density.all'), testId: 'org-density-all' },
    { value: 'leaders', label: L('org.density.leaders'), testId: 'org-density-leaders' },
    { value: 'count', label: L('org.density.count'), testId: 'org-density-count' },
  ];

  // 카드 드래그가 화면 좌표를 캔버스 로컬 좌표로 되돌릴 때 쓰는 배율(PW-248)은 뷰포트마다 다르다 —
  // 바깥(OrgChartCanvas)의 위치 상태에 이 뷰포트의 배율만 얹어 다시 내린다.
  const positionsValue = useMemo(() => ({ ...positionsCtx, scale }), [positionsCtx, scale]);

  return (
    <PositionsContext.Provider value={positionsValue}>
    <CollapseContext.Provider value={collapseContext}>
      <div
        className={`canvas-area${expanded ? ' is-expanded' : ''}`}
        ref={canvasRef}
        {...canvasProps}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        data-testid={expanded ? 'org-canvas-expanded' : 'org-canvas'}
      >
        <div className="canvas-inner" ref={setInnerRef} style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          position: 'relative',
        }}>
          <BezierConnectors containerRef={canvasInnerRef} scale={scale} lineStyle={lineStyle} highlightIds={highlight?.unitIds} />
          <OrgNode node={orgData} showWorkHours={true} showVacation={true} editMode={editMode} adminMode={adminMode} showGrade={showGrade} density={density} baseUrl={baseUrl} />
        </div>

        {/* 왼쪽 툴바 — (트리/리스트) · 보이는 정보 양 · 기준일 (Figma 17755:26880 · 17788:33261) */}
        {toolbars && (<>
        <div className="org-toolbar org-toolbar-left" data-testid="org-toolbar-left">
          {toolbarLeading}
          <SegmentedControl
            className="org-density"
            items={densityItems}
            value={density}
            onChange={onDensityChange}
            ariaLabel={L('org.density')}
          />
          {asOf && <AsOfButton asOf={asOf} L={L} />}
        </div>

        {/* 오른쪽 툴바 — 확대·축소·연결선·펼침·이미지 + 전체 화면 (Figma 17755:26881 · 17755:26946) */}
        <div className="org-toolbar org-toolbar-right" data-testid="org-toolbar-right">
          <div className="org-toolbar-group">
            <button type="button" className="org-tool-btn" onClick={zoomIn} title={L('org.zoomIn')} aria-label={L('org.zoomIn')} data-action="zoom-in">
              <Icon src={icons.plus} size={20} color="var(--fg-primary)" baseUrl={baseUrl} />
            </button>
            <button type="button" className="org-tool-btn" onClick={zoomOut} title={L('org.zoomOut')} aria-label={L('org.zoomOut')} data-action="zoom-out">
              <Icon src={icons.minus} size={20} color="var(--fg-primary)" baseUrl={baseUrl} />
            </button>
            {/* 연결선 모양 토글 — 아이콘은 «지금» 모양을 그린다(어드민 조직단위 설정과 같다 · PW-1820). */}
            <button
              type="button"
              className="org-tool-btn"
              title={L(lineStyle === 'ortho' ? 'org.lineStyleOrtho' : 'org.lineStyleCurve')}
              aria-label={lineStyleLabel}
              aria-pressed={lineStyle === 'ortho'}
              data-line-style={lineStyle}
              onClick={() => onLineStyleChange(lineStyle === 'ortho' ? 'curve' : 'ortho')}
            >
              {lineStyle === 'ortho' ? <CornerAngleGlyph size={20} /> : <CornerSmoothGlyph size={20} />}
            </button>
            {/* 자동 정렬 — 연결선 모양 바로 다음 · 펼치기/접기 앞(pivit-specs §5.4-D · PW-2347). */}
            <button
              type="button"
              className="org-tool-btn"
              title={L(movedCount ? 'org.autoArrange' : 'org.autoArrangeEmpty')}
              aria-label={L('org.autoArrangeLabel')}
              aria-disabled={movedCount ? undefined : 'true'}
              data-action="auto-arrange"
              onClick={autoArrange}
            >
              <AutoArrangeGlyph size={20} />
            </button>
            {/* 전체 펼치기/접기 토글 — 속성은 «누르면 할 일»을 적는다. */}
            <button
              type="button"
              className="org-tool-btn"
              title={L(allCollapsed ? 'org.expandAll' : 'org.collapseAll')}
              aria-label={L(allCollapsed ? 'org.expandAll' : 'org.collapseAll')}
              aria-pressed={allCollapsed}
              data-action={allCollapsed ? 'expand-all' : 'collapse-all'}
              onClick={allCollapsed ? expandAll : collapseAll}
            >
              {allCollapsed ? <ExpandVerticalGlyph size={20} /> : <ContractVerticalGlyph size={20} />}
            </button>
            <button
              type="button"
              className="org-tool-btn has-label"
              onClick={downloadImage}
              disabled={exporting || undefined}
              aria-busy={exporting || undefined}
              data-action="download-image"
            >
              <DownloadSolidGlyph size={20} />
              <span>{L('org.downloadImage')}</span>
            </button>
          </div>
          {onExpandView && (
            <button
              type="button"
              className="org-tool-btn"
              title={L('org.expandView')}
              aria-label={L('org.expandView')}
              onClick={onExpandView}
              data-action="expand-view"
            >
              <ExpandScreenGlyph size={20} />
            </button>
          )}
        </div>
        </>)}
      </div>
    </CollapseContext.Provider>
    </PositionsContext.Provider>
  );
}
