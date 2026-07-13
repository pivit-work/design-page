import Icon from '../shared/Icon.jsx';

/**
 * OkrToolbar — 연도/분기 선택 버튼 + 우측 정렬 버튼 줄.
 * 데모에서는 정적 표시(드롭다운 미구현).
 */
export default function OkrToolbar({ year, quarter, icons, baseUrl = '' }) {
  return (
    <div className="okr-toolbar">
      <div className="okr-toolbar-left">
        <button className="okr-select-btn">
          <span>{year}</span>
          <Icon src={icons.chevronDown} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
        </button>
        <button className="okr-select-btn">
          <span>{quarter}</span>
          <Icon src={icons.chevronDown} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
        </button>
      </div>
      <button className="okr-icon-btn">
        <Icon src={icons.chevronSelector} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
      </button>
    </div>
  );
}
