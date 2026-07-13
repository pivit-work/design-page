import { useCallback, useRef, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import usePanZoom from '../shared/usePanZoom.js';
import OkrConnectors from './OkrConnectors.jsx';
import OkrGroupCard from './OkrGroupCard.jsx';
import ObjectiveRow from './ObjectiveRow.jsx';
import OkrMemberChip from './OkrMemberChip.jsx';
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
export default function OkrDashboardCanvas({ data, icons, baseUrl = '', onBlockClick }) {
  const { canvasRef, scale, translate, isDragging, canvasProps, zoomIn, zoomOut, resetView } = usePanZoom({
    ignoreSelector: '.zoom-controls, .okr-group-card, .okr-objective-row, .okr-member-chip',
  });
  const canvasInnerRef = useRef(null);

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
    <OkrPositionsContext.Provider value={{ positions, updatePosition }}>
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
            <div className="okr-group-root">
              <OkrGroupCard group={data} dragId={data.id} onClick={() => openGroup(data.id)} />
              <div className="okr-objective-list">
                {data.objectives.map((objective, i) => (
                  <ObjectiveRow
                    key={objective.title}
                    objective={objective}
                    dragId={`${data.id}:obj:${i}`}
                    onClick={() => openGroup(data.id)}
                  />
                ))}
              </div>
            </div>
            <div className="okr-teams-row">
              {data.teams.map((team) => (
                <div className="okr-team-col" key={team.id}>
                  <OkrGroupCard group={team} dragId={team.id} onClick={() => openGroup(team.id)} />
                  <div className="okr-objective-list">
                    {team.objectives.map((objective, i) => (
                      <ObjectiveRow
                        key={objective.title}
                        objective={objective}
                        dragId={`${team.id}:obj:${i}`}
                        onClick={() => openGroup(team.id)}
                      />
                    ))}
                  </div>
                  {team.members?.length > 0 && (
                    <div className="okr-members">
                      {team.members.map((member) => (
                        <OkrMemberChip
                          key={member.name}
                          member={member}
                          dragId={`${team.id}:member:${member.name}`}
                          onClick={() => openGroup(team.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
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
    </OkrPositionsContext.Provider>
  );
}
