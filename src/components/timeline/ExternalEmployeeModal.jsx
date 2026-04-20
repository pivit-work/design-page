import { useState } from 'react';
import EmployeeModalShell from './EmployeeModalShell.jsx';
import ColorPicker from './ColorPicker.jsx';
import CustomSelect from './CustomSelect.jsx';

/**
 * ExternalEmployeeModal — "외부 직원 추가".
 * 4 필드: 이름, 소속/회사, 그룹(Select), 색상(ColorPicker).
 * Figma "add_outside_poeple_modal" 기반.
 */
export default function ExternalEmployeeModal({ groups, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [groupId, setGroupId] = useState('');
  const [color, setColor] = useState('');

  const canSubmit = name.trim() && company.trim() && groupId && color;

  const handleSubmit = () => {
    onSubmit({ name: name.trim(), company: company.trim(), groupId, color });
  };

  return (
    <EmployeeModalShell
      title="외부 직원 추가"
      canSubmit={canSubmit}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      {/* 이름 */}
      <div className="tl-emp-field">
        <label htmlFor="tl-emp-name" className="tl-emp-label">이름</label>
        <input
          id="tl-emp-name"
          type="text"
          className="tl-emp-input"
          placeholder="이름을 입력해 주세요."
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* 소속/회사 */}
      <div className="tl-emp-field">
        <label htmlFor="tl-emp-company" className="tl-emp-label">소속/회사</label>
        <input
          id="tl-emp-company"
          type="text"
          className="tl-emp-input"
          placeholder="예: 카카오, 네이버"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      {/* 그룹 */}
      <div className="tl-emp-field">
        <label htmlFor="tl-emp-ext-group" className="tl-emp-label">그룹</label>
        <CustomSelect
          id="tl-emp-ext-group"
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
