import OkrProgressBar from './OkrProgressBar.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import OkrUnalignedBadge from './OkrUnalignedBadge.jsx';
import { useOkrDrag } from './hooks.js';

/**
 * ObjectiveRow — Q# 뱃지 + 목표 제목 + 진행바 + % 카드.
 * badge: 'gray'(기본) | 'blue' — 뱃지 배경색.
 * stacked: 개인 칸(170px)용 두 줄 배치 — 윗줄 뱃지+제목(두 줄까지), 아랫줄 진행바+%.
 *   팀 칸(406px)용 한 줄 배치를 좁은 칸에 그대로 쓰면 제목이 한두 글자로 줄고
 *   % 가 세로로 꺾인다(PW-2086). 제목 전체는 마우스를 올리면 뜬다.
 * 드래그로 자유 배치, 제자리 클릭이면 onClick(상세 모달).
 */
export default function ObjectiveRow({ objective, dragId, onClick, stacked = false }) {
  const { isDragging, onDown, style } = useOkrDrag(dragId, onClick);
  const badge = <StatusBadge className={`okr-q-badge is-${objective.badge || 'gray'}`}>{objective.q}</StatusBadge>;
  const title = (
    <span className="okr-objective-title" title={stacked ? objective.title : undefined}>
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
      width={stacked ? undefined : 116}
    />
  );
  const percent = <span className="okr-objective-percent">{objective.progress}%</span>;
  return (
    <div
      className={`okr-objective-row${stacked ? ' is-stacked' : ''}${isDragging ? ' okr-block-dragging' : ''}`}
      style={style}
      onMouseDown={onDown}
    >
      {stacked ? (
        <>
          <div className="okr-objective-row-top">{badge}{title}{unaligned}</div>
          <div className="okr-objective-row-bottom">{progress}{percent}</div>
        </>
      ) : (
        <>{badge}{title}{unaligned}{progress}{percent}</>
      )}
    </div>
  );
}
