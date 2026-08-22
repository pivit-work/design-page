import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import usePanZoom from '../shared/usePanZoom.js';
import OkrConnectors from './OkrConnectors.jsx';
import OkrGroupNode from './OkrGroupNode.jsx';
import { OkrPositionsContext } from './contexts.js';
import { loadOkrPositions, saveOkrPositions } from './hooks.js';

/**
 * OkrDashboardCanvas — OKR 대시보드 pan/zoom 캔버스.
 *
 * data(회사 → 팀 트리)는 props 로만 받는다. 블록은 조직도처럼 드래그로
 * 자유 배치(오프셋은 localStorage 저장), 제자리 클릭이면
 * onBlockClick(groupId) 로 wrapper 가 상세 모달을 연다. 리셋 버튼은
 * 뷰와 블록 배치를 함께 초기화한다.
 */
/** 초기 맞춤 배율 하한 — 더 줄이면 카드 글자가 읽히지 않는다 (OrgChartCanvas 와 동일). */
const MIN_FIT_SCALE = 0.5;

export default function OkrDashboardCanvas({
  data,
  icons,
  baseUrl = '',
  onBlockClick,
  emptyObjectivesLabel = '등록된 Objective 없음',
  emptyPersonsLabel = '개인 OKR 없음',
}) {
  const { canvasRef, scale, translate, isDragging, canvasProps, zoomIn, zoomOut, resetView, setView } = usePanZoom({
    ignoreSelector: '.zoom-controls, .okr-group-card, .okr-objective-row, .okr-member-chip',
  });
  const canvasInnerRef = useRef(null);

  /**
   * 초기 카메라 — 루트(회사) 카드를 가로 중앙에 두고, 트리가 뷰포트를 넘으면
   * 들어올 만큼 축소한다. 조직도 캔버스가 PW-63 에서 먼저 겪은 것과 같은 문제다:
   * 트리는 `justify-content:center` 로 가운데 정렬되므로 **노드가 많아지면 루트가
   * 오른쪽으로 밀려** translate 0 인 초기 뷰가 빈 화면처럼 보인다.
   *
   * 트리 노드를 조직에서 만들면서(PW-413) OKR 이 없는 조직까지 다 서기 때문에
   * 이 조건이 OKR 대시보드에도 그대로 생겼다.
   */
  const didCenterRef = useRef(false);
  const [fitNonce, setFitNonce] = useState(0);
  const refitView = useCallback(() => {
    didCenterRef.current = false;
    setFitNonce((n) => n + 1);
  }, []);
  useEffect(() => { didCenterRef.current = false; }, [data]);
  useEffect(() => {
    if (didCenterRef.current) return;
    const area = canvasRef.current;
    const inner = canvasInnerRef.current;
    if (!area || !inner) return;
    // 🔴 아래 실측은 「지금 화면 좌표 = 콘텐츠 로컬 좌표」를 전제한다. 계층을 바꿔
    //    다시 맞출 때는 직전 뷰가 남아 있으므로, 재기 전에 항등 변환으로 되돌린다.
    //    (안 그러면 새 트리가 옛 translate 만큼 밀려 빈 캔버스처럼 보인다.)
    setView(1, { x: 0, y: 0 });
    let raf = 0;
    const timer = setTimeout(() => {
      raf = requestAnimationFrame(() => {
        const rootCard = inner.querySelector('.okr-group-root > .okr-group-card');
        if (!rootCard) return;
        const areaRect = area.getBoundingClientRect();
        const innerRect = inner.getBoundingClientRect();
        const cardRect = rootCard.getBoundingClientRect();
        if (!areaRect.width || !cardRect.width) return;
        // 크기는 레이아웃 박스로 잰다 — scrollWidth 는 배경 점무늬까지 콘텐츠로 센다.
        const fit = Math.min(areaRect.width / inner.offsetWidth, areaRect.height / inner.offsetHeight);
        // 확대는 하지 않는다(작은 조직을 억지로 키우면 카드가 흐려진다). 축소만.
        const nextScale = Math.min(1, Math.max(MIN_FIT_SCALE, fit));
        const areaCenterX = areaRect.left + areaRect.width / 2;
        const cardCenterX = cardRect.left + cardRect.width / 2;
        setView(nextScale, {
          x: Math.round(areaCenterX - innerRect.left - nextScale * (cardCenterX - innerRect.left)),
          y: Math.round(areaRect.top - innerRect.top),
        });
        didCenterRef.current = true;
      });
    }, 160);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [data, fitNonce, setView, canvasRef]);

  const [positions, setPositions] = useState(loadOkrPositions);
  const updatePosition = useCallback((id, pos) => {
    setPositions(prev => {
      const next = { ...prev, [id]: pos };
      saveOkrPositions(next);
      return next;
    });
  }, []);
  const resetPositions = useCallback(() => {
    setPositions({});
    saveOkrPositions({});
  }, []);

  const openGroup = (groupId) => onBlockClick && onBlockClick(groupId);

  return (
    // scale 은 블록 드래그가 화면 좌표를 캔버스 로컬 좌표로 되돌릴 때 쓴다(PW-248).
    <OkrPositionsContext.Provider value={{ positions, updatePosition, scale }}>
      <div
        className="canvas-area okr-canvas-area"
        ref={canvasRef}
        {...canvasProps}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className="drag-hint">
          <Icon src={icons.expand} size={14} color="var(--text-brand-tertiary)" baseUrl={baseUrl} />
          <span>화면을 드래그하면 좀 더 쉽게 OKR를 보실 수 있습니다.</span>
        </div>

        <div className="canvas-inner okr-canvas-inner" ref={canvasInnerRef} style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          position: 'relative',
        }}>
          <OkrConnectors containerRef={canvasInnerRef} scale={scale} />
          <div className="okr-tree">
            <OkrGroupNode group={data} isRoot onOpen={openGroup} emptyObjectivesLabel={emptyObjectivesLabel}>
              <div className="okr-teams-row">
                {data.teams.map((team) => (
                  <OkrGroupNode
                    key={team.id}
                    group={team}
                    onOpen={openGroup}
                    emptyObjectivesLabel={emptyObjectivesLabel}
                  >
                    {/* 개인 계층 — `persons` 가 배열이면(빈 배열 포함) 운영 중이라는 뜻이다.
                        `undefined` 는 개인 OKR 미운영이라 계층 자체를 그리지 않는다
                        (okr-policy.md §3.4-A T3-b, PW-413). */}
                    {team.persons && (
                      <div className="okr-persons-row">
                        {team.persons.length > 0 ? (
                          team.persons.map((person) => (
                            <OkrGroupNode
                              key={person.id}
                              group={{ ...person, type: 'person' }}
                              onOpen={openGroup}
                              emptyObjectivesLabel={emptyObjectivesLabel}
                            />
                          ))
                        ) : (
                          <div className="okr-persons-empty">{emptyPersonsLabel}</div>
                        )}
                      </div>
                    )}
                  </OkrGroupNode>
                ))}
              </div>
            </OkrGroupNode>
          </div>
        </div>

        <div className="zoom-controls">
          <button className="zoom-btn" onClick={zoomIn}>
            <Icon src={icons.plus} size={20} color="var(--text-primary)" baseUrl={baseUrl} />
          </button>
          <button className="zoom-btn" onClick={zoomOut}>
            <Icon src={icons.minus} size={20} color="var(--text-primary)" baseUrl={baseUrl} />
          </button>
          <button className="zoom-btn" onClick={() => { resetView(); resetPositions(); refitView(); }}>
            <Icon src={icons.refresh} size={20} color="var(--text-primary)" baseUrl={baseUrl} />
          </button>
        </div>
      </div>
    </OkrPositionsContext.Provider>
  );
}
