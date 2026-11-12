import OkrProgressBar from './OkrProgressBar.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import OkrUnalignedBadge from './OkrUnalignedBadge.jsx';
import { useOkrLabels } from './okr-labels.jsx';

/**
 * ObjectiveRow — Q# 뱃지 + 목표 제목 + 진행바 + % 카드 (디자이너 한 줄 .okr-objective-row, 406px).
 * badge: 'gray'(기본) | 'blue' — 뱃지 배경색.
 * 제목은 160px 에서 말줄임되므로 전체 제목을 마우스 올림 글(title)로 단다.
 * 개인 칸도 같은 한 줄 카드를 쓴다 — 개발이 덧칠한 두 줄 카드(is-stacked, PW-2086)는
 * 디자이너 원래 모양으로 되돌렸다(PW-2219).
 * 행은 노드의 일부라 따로 끌어 옮기지 않는다 — 누르면 노드의 끌기(onMouseDown)를 그대로 받아
 * 노드 블록 전체가 움직이고, 제자리 클릭이면 상세 창이 열린다 (okr-policy §3.4-B L5 · PW-2772).
 * 종전엔 행마다 따로 끌려 하위 조직 선이 옮긴 행을 따라갔다.
 */
export default function ObjectiveRow({ objective, onMouseDown }) {
  const L = useOkrLabels();
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
      title={L('unaligned.rowTitle', { count: objective.unalignedCount })}
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
    <div className="okr-objective-row" onMouseDown={onMouseDown}>
      {badge}{title}{unaligned}{progress}{percent}
    </div>
  );
}
