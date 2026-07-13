import OkrProgressBar from './OkrProgressBar.jsx';
import { useOkrDrag } from './hooks.js';

/**
 * ObjectiveRow — Q# 뱃지 + 목표 제목 + 진행바 + % 한 줄 카드.
 * badge: 'gray'(기본) | 'blue' — 뱃지 배경색.
 * 드래그로 자유 배치, 제자리 클릭이면 onClick(상세 모달).
 */
export default function ObjectiveRow({ objective, dragId, onClick }) {
  const { isDragging, onDown, style } = useOkrDrag(dragId, onClick);
  return (
    <div
      className={`okr-objective-row${isDragging ? ' okr-block-dragging' : ''}`}
      style={style}
      onMouseDown={onDown}
    >
      <span className={`okr-q-badge is-${objective.badge || 'gray'}`}>{objective.q}</span>
      <span className="okr-objective-title">{objective.title}</span>
      <OkrProgressBar percent={objective.progress} variant={objective.progressVariant || 'blue'} width={116} />
      <span className="okr-objective-percent">{objective.progress}%</span>
    </div>
  );
}
