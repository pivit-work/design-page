import { useState, useRef } from 'react';
import EmployeeModalShell from './EmployeeModalShell.jsx';
import ColorPicker from './ColorPicker.jsx';
import CustomSelect from './CustomSelect.jsx';
import useTimelineData from './useTimelineData.js';

/**
 * InternalEmployeeModal — "내부 직원 추가".
 * 3 필드: 직원 검색(TimelineDataProvider 에서 받은 members 중 선택), 그룹(Select), 색상(ColorPicker).
 * Figma "add_inside_people_modal" 기반.
 */
export default function InternalEmployeeModal({ groups, onClose, onSubmit }) {
  const { members } = useTimelineData();
  const [query, setQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [groupId, setGroupId] = useState('');
  const [color, setColor] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef(null);

  const canSubmit = !!selectedMember && !!groupId && !!color;

  const filtered = members.filter((m) =>
    !query || m.name.includes(query) || (m.title || '').includes(query)
  );

  const handleSubmit = () => {
    onSubmit({ memberId: selectedMember.id, groupId, color });
  };

  return (
    <EmployeeModalShell
      title="내부 직원 추가"
      canSubmit={canSubmit}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      {/* 직원 검색 */}
      <div className="tl-emp-field">
        <label className="tl-emp-label">직원 검색</label>
        <div className="tl-emp-search-wrap" ref={searchWrapRef}>
          {selectedMember ? (
            <div className="tl-emp-search-selected">
              <span className="tl-emp-tag">
                <span className="tl-emp-tag-avatar" aria-hidden="true">
                  {selectedMember.name.charAt(0)}
                </span>
                {selectedMember.name}
                <button
                  type="button"
                  className="tl-emp-tag-x"
                  aria-label="선택 해제"
                  onClick={() => {
                    setSelectedMember(null);
                    setQuery('');
                  }}
                >
                  ×
                </button>
              </span>
            </div>
          ) : (
            <input
              type="text"
              className="tl-emp-input"
              placeholder="이름, 직함, 부서로 검색해 보세요."
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
        <label htmlFor="tl-emp-group" className="tl-emp-label">그룹</label>
        <CustomSelect
          id="tl-emp-group"
          value={groupId}
          onChange={setGroupId}
          placeholder="그룹을 선택 해주세요."
          options={groups.map((g) => ({ value: g.id, label: g.label }))}
        />
      </div>

      {/* 색상 */}
      <div className="tl-emp-field">
        <label className="tl-emp-label">색상</label>
        <ColorPicker value={color} onChange={setColor} />
      </div>
    </EmployeeModalShell>
  );
}
