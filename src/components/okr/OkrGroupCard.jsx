import OkrProgressBar from './OkrProgressBar.jsx';

/**
 * OkrGroupCard — Company OKR / 조직 단위 / 개인 요약 카드 (그룹 헤드).
 * type 'company' 는 brand-50 배경 + 서브타이틀(기수·분기),
 * type 'person' 은 흰 카드 + 역할 표기(폭 축소),
 * 그 외(조직 단위)는 blue-50 배경 + Lead 표기.
 * 드래그는 OkrGroupNode 가 소유 — 여기서는 onMouseDown 만 전달받는다.
 */
export default function OkrGroupCard({ group, onMouseDown, isDragging }) {
  const isCompany = group.type === 'company';
  const isPerson = group.type === 'person';
  const tone = isCompany ? 'is-company' : isPerson ? 'is-person' : 'is-team';
  return (
    <div
      className={`okr-group-card ${tone}${isDragging ? ' okr-block-dragging' : ''}`}
      onMouseDown={onMouseDown}
    >
      <p className="okr-group-name">{group.name}</p>
      {isCompany ? (
        <div className="okr-group-sub">
          <span className="okr-sub-period">{group.subtitle}</span>
          <span className="okr-sub-quarter">{group.quarter}</span>
        </div>
      ) : isPerson ? (
        // 개인 카드의 보조 줄은 역할(소속·직책)이다 — 없으면 줄 자체를 그리지 않는다.
        group.lead ? <div className="okr-group-lead"><span>{group.lead}</span></div> : null
      ) : group.lead ? (
        <div className="okr-group-lead">
          <span>Lead</span>
          <span>{group.lead}</span>
        </div>
      ) : null}
      <OkrProgressBar percent={group.progress} variant={group.progressVariant} />
      <p className={`okr-group-percent is-${group.progressVariant}`}>{group.progress}%</p>
      <p className="okr-group-summary">{group.summary}</p>
    </div>
  );
}
