import OkrProgressBar from './OkrProgressBar.jsx';

/**
 * OkrGroupCard — Company OKR / 팀 요약 카드.
 * type 'company' 는 brand-50 배경 + 서브타이틀(기수·분기),
 * 그 외(팀)는 blue-50 배경 + Lead 표기.
 */
export default function OkrGroupCard({ group, onClick }) {
  const isCompany = group.type === 'company';
  return (
    <div className={`okr-group-card ${isCompany ? 'is-company' : 'is-team'}`} onClick={onClick}>
      <p className="okr-group-name">{group.name}</p>
      {isCompany ? (
        <div className="okr-group-sub">
          <span className="okr-sub-period">{group.subtitle}</span>
          <span className="okr-sub-quarter">{group.quarter}</span>
        </div>
      ) : (
        <div className="okr-group-lead">
          <span>Lead</span>
          <span>{group.lead}</span>
        </div>
      )}
      <OkrProgressBar percent={group.progress} variant={group.progressVariant} />
      <p className={`okr-group-percent is-${group.progressVariant}`}>{group.progress}%</p>
      <p className="okr-group-summary">{group.summary}</p>
    </div>
  );
}
