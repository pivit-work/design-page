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
 *   filterMembers   (members, query, groupId) => 보여 줄 후보. 찾는 기준·개수 제한·순서를 호출부가 정한다.
 *                   groupId 는 지금 골라진 그룹 — 그 그룹에 이미 든 사람을 빼는 데 쓴다 (PW-1513)
 *   initialGroupId  처음 골라져 있을 그룹 (groups 에 있을 때만)
 *   initialColor    처음 골라져 있을 색
 *   quickAdd        «바로 넣기» (pivit-work PW-1513 · 피드 정책서 §2.3) — 그룹 머리 [+] 로 열어 그룹이 정해졌을 때.
 *                   그룹·색 칸을 빼고 후보 목록을 늘 펼쳐 두며, 후보를 누르면 곧바로 onSubmit 하고 창은 열어 둔다
 *                   (이어서 넣기). 넣은 사람은 호출부의 filterMembers 가 빼서 목록에서 사라진다. 아래는 [닫기] 하나.
 *                   후보 줄은 키보드(Enter·Space)로도 고른다. 남은 후보가 없으면 labels.noCandidates 한 줄
 *   busy            넣는 저장이 도는 중 — 후보 줄을 잠근다. 한 사람이 빠지며 아래 사람이 그 자리로 올라와
 *                   두 번 누른 것이 엉뚱한 사람에게 가지 않게 (quickAdd 일 때)
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
  noCandidates: '더할 수 있는 사람이 없습니다.',
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
  quickAdd = false,
  busy = false,
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

  const filtered = filterMembers(members, query, groupId);

  const handleSubmit = () => {
    onSubmit({ memberId: selectedMember.id, groupId, color });
  };
  const listOpen = quickAdd ? true : searchOpen && !selectedMember;
  const pick = (m) => {
    if (quickAdd) {
      onSubmit({ memberId: m.id, groupId, color });
      return;
    }
    setSelectedMember(m);
    setSearchOpen(false);
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
      footer={
        quickAdd ? (
          <button
            type="button"
            className="tl-group-modal-btn tl-group-modal-btn-secondary"
            onClick={onClose}
          >
            {l.close}
          </button>
        ) : undefined
      }
    >
      {/* 직원 검색 */}
      <div className="tl-emp-field">
        <label className="tl-emp-label">{l.searchLabel}</label>
        <div className="tl-emp-search-wrap" ref={searchWrapRef}>
          {selectedMember && !quickAdd ? (
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
          {quickAdd && filtered.length === 0 && (
            <div className="tl-emp-search-menu">
              <div className="tl-emp-search-item">
                <span className="tl-emp-search-title">{l.noCandidates}</span>
              </div>
            </div>
          )}
          {listOpen && filtered.length > 0 && (
            <div className="tl-emp-search-menu" role="listbox">
              {filtered.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="tl-emp-search-item"
                  role="option"
                  aria-selected={false}
                  disabled={quickAdd && busy}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (!quickAdd) pick(m);
                  }}
                  // «바로 넣기»는 목록이 늘 펼쳐져 있어 Tab 으로 줄까지 온다 — Enter·Space(=click)로도 넣는다.
                  // 펼쳤다 닫히는 종전 목록은 마우스를 누르는 순간 고른다(검색칸이 흐려지며 닫히기 전에).
                  onClick={quickAdd ? () => pick(m) : undefined}
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

      {/* 그룹·색상 — «바로 넣기»는 그룹이 정해져 있고 색은 호출부가 정한 기본값이라 칸을 그리지 않는다 */}
      {!quickAdd && (
        <>
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
        </>
      )}
    </EmployeeModalShell>
  );
}
