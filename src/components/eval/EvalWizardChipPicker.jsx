import { useState } from 'react';
import TextInput from '../shared/TextInput.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import { fill } from './evalTemplateItemModel.js';
import { CHIP_PICKER_SEARCH_MIN, filterByQuery } from './chipPickerFilter.js';

/* PW-1875 — 회사가 정한 값(조직·직급)은 회사마다 개수가 달라 100~200개도 온다.
   목록은 상한 높이에서 멈춰 칸 안에서 스크롤하고, 고른 값은 검색·스크롤에 가려져도 위 요약에 보인다.
   PW-1936 — 모양은 같은 단계의 「위원 후보 고르기」를 그대로 따른다: 검색칸(개수와 무관하게 늘)
   + 체크 줄 목록(.evc-wiz-committee-list / -item, 네모는 공용 Checkbox). 칩 줄은 쓰지 않는다.
   요약의 고른 값 칩은 위원 선택 요약처럼 값이 많을 때만 둔다(적으면 목록에 다 보인다). */
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
  const visible = filterByQuery(options, query);
  const selectedCount = selected.length + extraSelected.length;

  // 요약의 고른 값 — 누르면 푼다(위원 선택 요약의 칩과 같은 자리).
  const chip = (value, onClick, testId) => (
    <button
      type="button"
      key={testId}
      className="evc-wiz-calibscope-chip is-on"
      aria-pressed
      onClick={onClick}
      data-testid={testId}
    >
      {value}
    </button>
  );

  // 목록의 한 줄 — 위원 후보 줄(.evc-wiz-committee-item)과 같은 모양에 공용 체크박스.
  const row = (value, on, onChange, testId) => (
    <Checkbox
      key={testId}
      className={`evc-wiz-committee-item${on ? ' is-on' : ''}`}
      inputClassName="dp-check-input"
      checked={on}
      onChange={onChange}
      data-testid={testId}
      label={
        <span className="evc-wiz-committee-name">
          <span className="evc-wiz-committee-name-text" title={value}>
            {value}
          </span>
        </span>
      }
    />
  );

  return (
    <>
      <TextInput
        className="evc-wiz-committee-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={L.wizardValueSearch}
        aria-label={L.wizardValueSearch}
        data-testid={`${testIdPrefix}s-search`}
      />
      {many && selectedCount > 0 && (
        <div className="evc-wiz-chippicker-selected" data-testid={`${testIdPrefix}s-selected`}>
          <span className="evc-wiz-committee-summary-count">
            {fill(L.wizardValueSelected, { count: selectedCount })}
          </span>
          {selected.map((v) => chip(v, () => onToggle(v), `${testIdPrefix}s-selected-${v}`))}
          {extraSelected.map((v) =>
            chip(v, () => onRemoveExtra(v), `${testIdPrefix}s-selected-extra-${v}`),
          )}
        </div>
      )}
      <div className="evc-wiz-committee-list" data-testid={`${testIdPrefix}s-list`}>
        {visible.map((v) =>
          row(v, selected.includes(v), () => onToggle(v), `${testIdPrefix}-${v}`),
        )}
        {/* 옛 선택은 검색과 무관하게 목록 끝에 둔다(전과 같다). 끄면 지운다. */}
        {extraSelected.map((v) =>
          row(v, true, () => onRemoveExtra(v), `${extraTestIdPrefix}-${v}`),
        )}
      </div>
      {query.trim() && visible.length === 0 && (
        <span className="evc-wiz-hint" data-testid={`${testIdPrefix}s-empty`}>
          {fill(L.wizardValueSearchEmpty, { query: query.trim() })}
        </span>
      )}
    </>
  );
}
