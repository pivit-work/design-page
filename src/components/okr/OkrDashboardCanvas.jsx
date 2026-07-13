import { useRef } from 'react';
import Icon from '../shared/Icon.jsx';
import usePanZoom from '../shared/usePanZoom.js';
import OkrConnectors from './OkrConnectors.jsx';
import OkrGroupCard from './OkrGroupCard.jsx';
import ObjectiveRow from './ObjectiveRow.jsx';
import OkrMemberChip from './OkrMemberChip.jsx';

/**
 * OkrDashboardCanvas — OKR 대시보드 pan/zoom 캔버스.
 *
 * data(회사 → 팀 트리)는 props 로만 받는다. 블록(그룹 카드·objective 행)
 * 클릭 시 onBlockClick(groupId) 를 호출해 wrapper 가 상세 모달을 연다.
 */
export default function OkrDashboardCanvas({ data, icons, baseUrl = '', onBlockClick }) {
  const { canvasRef, scale, translate, isDragging, canvasProps, zoomIn, zoomOut, resetView } = usePanZoom({
    ignoreSelector: '.zoom-controls, .okr-group-card, .okr-objective-row, .okr-member-chip',
  });
  const canvasInnerRef = useRef(null);
  const openGroup = (groupId) => onBlockClick && onBlockClick(groupId);

  return (
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
            <OkrGroupCard group={data} onClick={() => openGroup(data.id)} />
            <div className="okr-objective-list">
              {data.objectives.map((objective) => (
                <ObjectiveRow key={objective.title} objective={objective} onClick={() => openGroup(data.id)} />
              ))}
            </div>
          </div>
          <div className="okr-teams-row">
            {data.teams.map((team) => (
              <div className="okr-team-col" key={team.id}>
                <OkrGroupCard group={team} onClick={() => openGroup(team.id)} />
                <div className="okr-objective-list">
                  {team.objectives.map((objective) => (
                    <ObjectiveRow key={objective.title} objective={objective} onClick={() => openGroup(team.id)} />
                  ))}
                </div>
                {team.members?.length > 0 && (
                  <div className="okr-members">
                    {team.members.map((member) => (
                      <OkrMemberChip key={member.name} member={member} onClick={() => openGroup(team.id)} />
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
        <button className="zoom-btn" onClick={resetView}>
          <Icon src={icons.refresh} size={20} color="var(--text-primary)" baseUrl={baseUrl} />
        </button>
      </div>
    </div>
  );
}
