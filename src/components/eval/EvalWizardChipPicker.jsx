import { useState } from 'react';
import TextInput from '../shared/TextInput.jsx';
import { fill } from './evalTemplateItemModel.js';
import { CHIP_PICKER_SEARCH_MIN, filterByQuery } from './chipPickerFilter.js';

/* PW-1875 — 회사가 정한 값(조직·직급)은 회사마다 개수가 달라 100~200개도 온다.
   칩을 전부 늘어놓으면 창이 버튼 벽이 되므로, 칩 줄은 약 3줄 높이에서 멈춰 칸 안에서 스크롤하고,
   값이 많으면 검색칸을 세운다. 고른 값은 검색·스크롤에 가려져도 위 요약에 늘 보인다.
   모양은 같은 단계의 「위원 후보 고르기」(검색칸 + 상한 목록 + 선택 요약)를 따른다. */
export default function EvalWizardChipPicker({
  options,
  selected,
  onToggle,
  testIdPrefix,
  labels: L,
  // 고를 수 있는 값 밖의 옛 선택(예: 이전 판 직급). 고른 칩으로 함께 보이고 누르면 지운다.
  extraSelected = [],
  onRemoveExtra,
  extraTestIdPrefix,
}) {
  const [query, setQuery] = useState('');
  const many = options.length > CHIP_PICKER_SEARCH_MIN;
  const visible = many ? filterByQuery(options, query) : options;
  const selectedCount = selected.length + extraSelected.length;

  const chip = (value, on, onClick, testId) => (
    <button
      type="button"
      key={testId}
      className={`evc-wiz-calibscope-chip${on ? ' is-on' : ''}`}
      aria-pressed={on}
      onClick={onClick}
      data-testid={testId}
    >
      {value}
    </button>
  );

  return (
    <>
      {many && (
        <TextInput
          className="evc-wiz-committee-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={L.wizardValueSearch}
          aria-label={L.wizardValueSearch}
          data-testid={`${testIdPrefix}s-search`}
        />
      )}
      {many && selectedCount > 0 && (
        <div className="evc-wiz-chippicker-selected" data-testid={`${testIdPrefix}s-selected`}>
          <span className="evc-wiz-committee-summary-count">
            {fill(L.wizardValueSelected, { count: selectedCount })}
          </span>
          {selected.map((v) => chip(v, true, () => onToggle(v), `${testIdPrefix}s-selected-${v}`))}
          {extraSelected.map((v) =>
            chip(v, true, () => onRemoveExtra(v), `${testIdPrefix}s-selected-extra-${v}`),
          )}
        </div>
      )}
      <div className="evc-wiz-calibscope-chips evc-wiz-chippicker-list" data-testid={`${testIdPrefix}s-list`}>
        {visible.map((v) =>
          chip(v, selected.includes(v), () => onToggle(v), `${testIdPrefix}-${v}`),
        )}
        {/* 옛 선택은 검색과 무관하게 칩 줄 끝에 둔다(전과 같다). */}
        {extraSelected.map((v) =>
          chip(v, true, () => onRemoveExtra(v), `${extraTestIdPrefix}-${v}`),
        )}
        {query.trim() && visible.length === 0 && (
          <span className="evc-wiz-hint" data-testid={`${testIdPrefix}s-empty`}>
            {fill(L.wizardValueSearchEmpty, { query: query.trim() })}
          </span>
        )}
      </div>
    </>
  );
}
