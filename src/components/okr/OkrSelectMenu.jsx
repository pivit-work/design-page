import Icon from '../shared/Icon.jsx';
import { NoteText } from '../shared/SharedText.jsx';

/**
 * OkrSelectMenu — 연도/분기 선택 드롭다운 메뉴.
 * options: [{ value, label, description? }], 선택된 항목에 체크 아이콘 표시.
 *
 * `description` 은 고르기 전에 알아야 할 한 줄(예: 개인 OKR 공개 범위 «같은 팀만 — 동일 팀 + 매니저 + 관리자»,
 * pivit-work PW-2671). 주면 라벨 아래 작은 보조 글씨(`NoteText`)로 늘 보이고, 안 주면 지금 모양 그대로다.
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
            {option.description ? (
              <span className="okr-select-item-text">
                <span>{option.label}</span>
                <NoteText as="span">{option.description}</NoteText>
              </span>
            ) : (
              <span>{option.label}</span>
            )}
            {option.value === selected && (
              <Icon src={icons.check} size={16} color="var(--text-brand-tertiary)" baseUrl={baseUrl} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
