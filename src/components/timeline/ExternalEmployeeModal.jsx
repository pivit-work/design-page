import { useState } from 'react';
import EmployeeModalShell from './EmployeeModalShell.jsx';
import ColorPicker from './ColorPicker.jsx';
import CustomSelect from './CustomSelect.jsx';

/**
 * ExternalEmployeeModal — "외부 직원 추가".
 * 4 필드: 이름, 소속/회사, 그룹(Select), 색상(ColorPicker).
 * Figma "add_outside_poeple_modal" 기반.
 *
 * 앱이 이 창을 그대로 쓰도록 넘길 자리를 둔다 (PW-762). **안 주면 지금 모양·동작 그대로다.**
 *   initialColor  처음 골라져 있을 색
 *   maxLength     이름·소속 입력 글자 수 상한 (안 주면 제한 없음)
 *   labels        { title, nameLabel, namePlaceholder, companyLabel, companyPlaceholder,
 *                   groupLabel, groupPlaceholder, noGroups, colorLabel, submit, cancel, close }
 */
const DEFAULT_LABELS = {
  title: '외부 직원 추가',
  nameLabel: '이름',
  namePlaceholder: '이름을 입력해 주세요.',
  companyLabel: '소속/회사',
  companyPlaceholder: '예: 카카오, 네이버',
  groupLabel: '그룹',
  groupPlaceholder: '그룹을 선택 해주세요.',
  noGroups: '옵션이 없습니다',
  colorLabel: '색상',
  colorAriaLabel: '색상 선택',
  submit: '추가',
  cancel: '취소',
  close: '닫기',
};

export default function ExternalEmployeeModal({
  groups,
  onClose,
  onSubmit,
  initialColor = '',
  maxLength,
  labels,
}) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [groupId, setGroupId] = useState('');
  const [color, setColor] = useState(initialColor);

  const canSubmit = name.trim() && company.trim() && groupId && color;

  const handleSubmit = () => {
    onSubmit({ name: name.trim(), company: company.trim(), groupId, color });
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
      {/* 이름 */}
      <div className="tl-emp-field">
        <label htmlFor="tl-emp-name" className="tl-emp-label">{l.nameLabel}</label>
        <input
          id="tl-emp-name"
          type="text"
          className="tl-emp-input"
          placeholder={l.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={maxLength}
        />
      </div>

      {/* 소속/회사 */}
      <div className="tl-emp-field">
        <label htmlFor="tl-emp-company" className="tl-emp-label">{l.companyLabel}</label>
        <input
          id="tl-emp-company"
          type="text"
          className="tl-emp-input"
          placeholder={l.companyPlaceholder}
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          maxLength={maxLength}
        />
      </div>

      {/* 그룹 */}
      <div className="tl-emp-field">
        <label htmlFor="tl-emp-ext-group" className="tl-emp-label">{l.groupLabel}</label>
        <CustomSelect
          id="tl-emp-ext-group"
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
