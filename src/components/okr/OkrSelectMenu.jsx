import Icon from '../shared/Icon.jsx';

/**
 * OkrSelectMenu — 연도/분기 선택 드롭다운 메뉴.
 * options: [{ value, label }], 선택된 항목에 체크 아이콘 표시.
 */
export default function OkrSelectMenu({ options, selected, onSelect, icons, baseUrl = '' }) {
  return (
    <div className="okr-select-menu">
      {options.map((option) => (
        <div className="okr-select-item" key={option.value}>
          <div
            className="okr-select-item-inner"
            onClick={() => onSelect(option.value)}
          >
            <span>{option.label}</span>
            {option.value === selected && (
              <Icon src={icons.check} size={16} color="var(--text-brand-tertiary)" baseUrl={baseUrl} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
