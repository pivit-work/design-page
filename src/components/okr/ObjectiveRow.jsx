import OkrProgressBar from './OkrProgressBar.jsx';
import OkrUnalignedBadge from './OkrUnalignedBadge.jsx';
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
      {/* 아무 하위도 받지 못한 KR 수 — 전사 노드에서만 채워 넘긴다(경영자 시점).
          0·undefined 면 아무것도 그리지 않는다. 집계는 소비자가 파생해 넘기며 저장하지 않는다. */}
      {objective.unalignedCount > 0 && (
        <OkrUnalignedBadge
          variant="pill"
          count={objective.unalignedCount}
          title={`상위 연결이 없는 KR ${objective.unalignedCount}개 — 아직 어느 팀도 받지 않았습니다`}
        />
      )}
      <OkrProgressBar percent={objective.progress} variant={objective.progressVariant || 'blue'} width={116} />
      <span className="okr-objective-percent">{objective.progress}%</span>
    </div>
  );
}
