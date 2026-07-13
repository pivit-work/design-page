import OkrProgressBar from './OkrProgressBar.jsx';

/**
 * ObjectiveRow — Q# 뱃지 + 목표 제목 + 진행바 + % 한 줄 카드.
 * badge: 'gray'(기본) | 'blue' — 뱃지 배경색.
 */
export default function ObjectiveRow({ objective, onClick }) {
  return (
    <div className="okr-objective-row" onClick={onClick}>
      <span className={`okr-q-badge is-${objective.badge || 'gray'}`}>{objective.q}</span>
      <span className="okr-objective-title">{objective.title}</span>
      <OkrProgressBar percent={objective.progress} variant={objective.progressVariant || 'blue'} width={116} />
      <span className="okr-objective-percent">{objective.progress}%</span>
    </div>
  );
}
