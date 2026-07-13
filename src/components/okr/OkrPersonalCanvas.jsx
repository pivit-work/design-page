import OkrLinkedParents from './OkrLinkedParents.jsx';
import OkrAiInsights from './OkrAiInsights.jsx';
import OkrOverallCard from './OkrOverallCard.jsx';
import OkrObjectiveSection from './OkrObjectiveSection.jsx';

/**
 * OkrPersonalCanvas — 개인 OKR 탭 콘텐츠 (스크롤 페이지).
 *
 * data: { person: { name, role, avatar }, periodLabel, links, parents,
 *   insights, overall, theme, objectives }
 * 데모 데이터는 wrapper(OkrPage)가 소유한다.
 */
export default function OkrPersonalCanvas({ data, icons, baseUrl = '' }) {
  const { person, periodLabel, links, parents, insights, overall, theme, objectives } = data;

  return (
    <div className="okr-personal-area">
      <div className="okr-p-profile">
        <img className="okr-p-avatar" src={person.avatar} alt={person.name} draggable={false} />
        <div>
          <p className="okr-p-name">{person.name}</p>
          <p className="okr-p-role">{person.role}</p>
        </div>
      </div>

      <div className="okr-p-period">
        <button className="okr-p-period-btn is-active">{periodLabel}</button>
        <button className="okr-p-period-btn">히스토리</button>
      </div>

      <OkrLinkedParents links={links} parents={parents} />
      <OkrAiInsights insights={insights} icons={icons} baseUrl={baseUrl} />
      <OkrOverallCard percent={overall.percent} status={overall.status} />

      <div className="okr-p-table-head">
        <span className="okr-p-theme">{theme}</span>
        <span className="okr-p-table-col okr-p-weight-head">Weight</span>
        <span className="okr-p-table-col okr-p-pic-head">PIC</span>
      </div>

      <div className="okr-p-objectives">
        {objectives.map((objective, i) => (
          <OkrObjectiveSection key={objective.label} objective={objective} defaultExpanded={i === 0} />
        ))}
      </div>
    </div>
  );
}
