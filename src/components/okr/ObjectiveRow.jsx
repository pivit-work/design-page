import OkrProgressBar from './OkrProgressBar.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import OkrUnalignedBadge from './OkrUnalignedBadge.jsx';
import { useOkrDrag } from './hooks.js';

/**
 * ObjectiveRow — Q# 뱃지 + 목표 제목 + 진행바 + % 카드 (디자이너 한 줄 .okr-objective-row, 406px).
 * badge: 'gray'(기본) | 'blue' — 뱃지 배경색.
 * 제목은 160px 에서 말줄임되므로 전체 제목을 마우스 올림 글(title)로 단다.
 * 개인 칸도 같은 한 줄 카드를 쓴다 — 개발이 덧칠한 두 줄 카드(is-stacked, PW-2086)는
 * 디자이너 원래 모양으로 되돌렸다(PW-2219).
 * 드래그로 자유 배치, 제자리 클릭이면 onClick(상세 모달).
 */
export default function ObjectiveRow({ objective, dragId, onClick }) {
  const { isDragging, onDown, style } = useOkrDrag(dragId, onClick);
  const badge = <StatusBadge className={`okr-q-badge is-${objective.badge || 'gray'}`}>{objective.q}</StatusBadge>;
  const title = (
    <span className="okr-objective-title" title={objective.title}>
      {objective.title}
    </span>
  );
  // 아무 하위도 받지 못한 KR 수 — 전사 노드에서만 채워 넘긴다(경영자 시점).
  // 0·undefined 면 아무것도 그리지 않는다. 집계는 소비자가 파생해 넘기며 저장하지 않는다.
  const unaligned = objective.unalignedCount > 0 && (
    <OkrUnalignedBadge
      variant="pill"
      count={objective.unalignedCount}
      title={`상위 연결이 없는 KR ${objective.unalignedCount}개 — 아직 어느 팀도 받지 않았습니다`}
    />
  );
  const progress = (
    <OkrProgressBar
      percent={objective.progress}
      variant={objective.progressVariant || 'blue'}
      width={116}
    />
  );
  const percent = <span className="okr-objective-percent">{objective.progress}%</span>;
  return (
    <div
      className={`okr-objective-row${isDragging ? ' okr-block-dragging' : ''}`}
      style={style}
      onMouseDown={onDown}
    >
      {badge}{title}{unaligned}{progress}{percent}
    </div>
  );
}
