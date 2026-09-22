import { useState, useRef } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import EmployeeModalShell from './EmployeeModalShell.jsx';
import ColorPicker from './ColorPicker.jsx';
import CustomSelect from './CustomSelect.jsx';
import useTimelineData from './useTimelineData.js';

/**
 * InternalEmployeeModal — "내부 직원 추가".
 * 3 필드: 직원 검색(TimelineDataProvider 에서 받은 members 중 선택), 그룹(Select), 색상(ColorPicker).
 * Figma "add_inside_people_modal" 기반.
 *
 * 앱이 이 창을 그대로 쓰도록 넘길 자리를 둔다 (PW-762). **안 주면 지금 모양·동작 그대로다.**
 *   members         후보 목록. 안 주면 TimelineDataProvider 의 members
 *   filterMembers   (members, query) => 보여 줄 후보. 찾는 기준·개수 제한을 호출부가 정한다
 *   initialGroupId  처음 골라져 있을 그룹 (groups 에 있을 때만)
 *   initialColor    처음 골라져 있을 색
 *   labels          { title, searchLabel, searchPlaceholder, clearSelection, groupLabel,
 *                     groupPlaceholder, noGroups, colorLabel, submit, cancel, close } — 화면 언어
 */
const DEFAULT_LABELS = {
  title: '내부 직원 추가',
  searchLabel: '직원 검색',
  searchPlaceholder: '이름, 직함, 부서로 검색해 보세요.',
  clearSelection: '선택 해제',
  groupLabel: '그룹',
  groupPlaceholder: '그룹을 선택 해주세요.',
  noGroups: '옵션이 없습니다',
  colorLabel: '색상',
  colorAriaLabel: '색상 선택',
  submit: '추가',
  cancel: '취소',
  close: '닫기',
};

const defaultFilter = (members, query) =>
  members.filter((m) => !query || m.name.includes(query) || (m.title || '').includes(query));

export default function InternalEmployeeModal({
  groups,
  onClose,
  onSubmit,
  members: membersProp,
  filterMembers = defaultFilter,
  initialGroupId,
  initialColor = '',
  labels,
}) {
  const data = useTimelineData();
  const members = membersProp ?? data?.members ?? [];
  const l = { ...DEFAULT_LABELS, ...labels };
  const [query, setQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [groupId, setGroupId] = useState(() =>
    initialGroupId && groups.some((g) => g.id === initialGroupId) ? initialGroupId : ''
  );
  const [color, setColor] = useState(initialColor);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef(null);

  const canSubmit = !!selectedMember && !!groupId && !!color;

  const filtered = filterMembers(members, query);

  const handleSubmit = () => {
    onSubmit({ memberId: selectedMember.id, groupId, color });
  };

  return (
    <EmployeeModalShell
      title={l.title}
      canSubmit={canSubmit}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel={l.submit}
      cancelLabel={l.cancel}
      closeLabel={l.close}
    >
      {/* 직원 검색 */}
      <div className="tl-emp-field">
        <label className="tl-emp-label">{l.searchLabel}</label>
        <div className="tl-emp-search-wrap" ref={searchWrapRef}>
          {selectedMember ? (
            <div className="tl-emp-search-selected">
              <StatusBadge className="tl-emp-tag">
                <span className="tl-emp-tag-avatar" aria-hidden="true">
                  {selectedMember.name.charAt(0)}
                </span>
                {selectedMember.name}
                <button
                  type="button"
                  className="tl-emp-tag-x"
                  aria-label={l.clearSelection}
                  onClick={() => {
                    setSelectedMember(null);
                    setQuery('');
                  }}
                >
                  ×
                </button>
              </StatusBadge>
            </div>
          ) : (
            <input
              type="text"
              className="tl-emp-input"
              placeholder={l.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
            />
          )}
          {searchOpen && !selectedMember && filtered.length > 0 && (
            <div className="tl-emp-search-menu" role="listbox">
              {filtered.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="tl-emp-search-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSelectedMember(m);
                    setSearchOpen(false);
                  }}
                >
                  <span className="tl-emp-search-avatar" aria-hidden="true">
                    {m.name.charAt(0)}
                  </span>
                  <span className="tl-emp-search-name">{m.name}</span>
                  <span className="tl-emp-search-title">{m.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 그룹 */}
      <div className="tl-emp-field">
        <label htmlFor="tl-emp-group" className="tl-emp-label">{l.groupLabel}</label>
        <CustomSelect
          id="tl-emp-group"
          value={groupId}
          onChange={setGroupId}
          placeholder={l.groupPlaceholder}
          emptyLabel={l.noGroups}
          options={groups.map((g) => ({ value: g.id, label: g.label }))}
        />
      </div>

      {/* 색상 */}
      <div className="tl-emp-field">
        <label className="tl-emp-label">{l.colorLabel}</label>
        <ColorPicker value={color} onChange={setColor} ariaLabel={l.colorAriaLabel} />
      </div>
    </EmployeeModalShell>
  );
}
