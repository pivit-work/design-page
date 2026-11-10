import Button from '../shared/Button.jsx';
import { useEffect, useRef, useState } from 'react';
import TextInput from '../shared/TextInput.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import Chip from '../shared/Chip.jsx';
import AnchoredLayer from '../shared/AnchoredLayer.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';
import { CheckGlyph, ChevronDownGlyph, SearchGlyph } from '../shared/lineIcons.jsx';
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
  /* PW-2646 (RULES 9) — 이름표를 부품이 그려 오른쪽에 «N곳 선택 · 모두 해제»를 둔다.
     목록은 테두리 상자 안 8줄 높이에서 내린다. */
  label,
  countLabel,
  onClear,
  // 검색 칸 — 'always'(조직) · 'many'(값이 많을 때만 — 직급).
  search = 'always',
  searchPlaceholder,
  /* PW-2683 — 'dropdown' 이면 «선택» 버튼 + 고른 것만 칩(앞 chipMax 개 + «외 N개»), 고르기는 버튼 밑에 뜨는
     검색·스크롤 목록(원온원 만들기 창 메뉴 .ono-add-modal-menu 값 · 시안 eval-look-2026-11-08 admin_wizard-4).
     기본 'list' 는 전과 같은 테두리 상자 목록이다 — 지금 쓰는 곳은 그대로 돈다. */
  mode = 'list',
  /** dropdown — 버튼 글씨(없으면 label). */
  buttonLabel,
  /** dropdown — 값 → 보이는 이름(조직 id → 조직 이름 등). 검색도 이 이름으로 거른다. */
  optionLabel,
  /** dropdown — 칩으로 보이는 최대 개수. 넘으면 «외 N개» 가 남은 것을 목록 맨 위에 띄워 연다. */
  chipMax = 6,
  /** dropdown — «외 {{count}}개». */
  moreLabel,
  /** dropdown — 칩 X 의 읽는 이름(값 이름을 받는다). */
  removeLabel,
  /** dropdown — 시험용 이름을 지금 쓰는 이름에 맞출 때: { button, chip(v), remove(v), item(v) } */
  testIds,
  disabled = false,
}) {
  if (mode === 'dropdown') {
    return (
      <ChipPickerDropdown
        options={options}
        selected={selected}
        onToggle={onToggle}
        testIdPrefix={testIdPrefix}
        labels={L}
        extraSelected={extraSelected}
        onRemoveExtra={onRemoveExtra}
        extraTestIdPrefix={extraTestIdPrefix}
        label={label}
        countLabel={countLabel}
        onClear={onClear}
        search={search}
        searchPlaceholder={searchPlaceholder}
        buttonLabel={buttonLabel}
        optionLabel={optionLabel}
        chipMax={chipMax}
        moreLabel={moreLabel}
        removeLabel={removeLabel}
        testIds={testIds}
        disabled={disabled}
      />
    );
  }
  return (
    <ChipPickerList
      options={options}
      selected={selected}
      onToggle={onToggle}
      testIdPrefix={testIdPrefix}
      labels={L}
      extraSelected={extraSelected}
      onRemoveExtra={onRemoveExtra}
      extraTestIdPrefix={extraTestIdPrefix}
      label={label}
      countLabel={countLabel}
      onClear={onClear}
      search={search}
      searchPlaceholder={searchPlaceholder}
    />
  );
}

function ChipPickerList({
  options,
  selected,
  onToggle,
  testIdPrefix,
  labels: L,
  extraSelected = [],
  onRemoveExtra,
  extraTestIdPrefix,
  label,
  countLabel,
  onClear,
  search = 'always',
  searchPlaceholder,
}) {
  const [query, setQuery] = useState('');
  const many = options.length > CHIP_PICKER_SEARCH_MIN;
  const showSearch = search === 'always' || many;
  // 검색 칸이 없으면 거르지 않는다 — 가려진 검색어가 목록을 줄이지 않게.
  const visible = showSearch ? filterByQuery(options, query) : options;
  const selectedCount = selected.length + extraSelected.length;
  const placeholder = searchPlaceholder ?? L.wizardValueSearch;

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
      {label != null && (
        <div className="evc-wiz-calibscope-label evc-wiz-chippicker-head" data-testid={`${testIdPrefix}s-head`}>
          <span>{label}</span>
          <span className="evc-wiz-chippicker-count" data-testid={`${testIdPrefix}s-count`}>
            {fill(countLabel ?? L.wizardValueSelected, { count: selectedCount })}
            {selectedCount > 0 && onClear && (
              <>
                {' · '}
                <Button
                  className="evc-wiz-chippicker-clear"
                  onClick={onClear}
                  data-testid={`${testIdPrefix}s-clear`}
                >
                  {L.wizardValueClear ?? '모두 해제'}
                </Button>
              </>
            )}
          </span>
        </div>
      )}
      <div className="evc-wiz-pick-frame" data-testid={`${testIdPrefix}s-box`}>
        {showSearch && (
          <TextInput
            className="evc-wiz-committee-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            data-testid={`${testIdPrefix}s-search`}
          />
        )}
        {many && selectedCount > 0 && (
          <div className="evc-wiz-chippicker-selected" data-testid={`${testIdPrefix}s-selected`}>
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
        {showSearch && query.trim() && visible.length === 0 && (
          <span className="evc-wiz-hint" data-testid={`${testIdPrefix}s-empty`}>
            {fill(L.wizardValueSearchEmpty, { query: query.trim() })}
          </span>
        )}
      </div>
    </>
  );
}

/* PW-2683 — «선택» 드롭다운. 버튼 옆에는 고른 것만 칩으로, 많으면 앞 chipMax 개 + «외 N개».
   목록은 창 본문 스크롤·overflow 에 잘리지 않게 포털(AnchoredLayer)로 버튼 밑 4px 에 띄운다.
   바깥을 누르거나 Esc 면 닫힌다 — Esc 는 이 목록만 닫고 만들기 창은 닫지 않는다(useDismissLayer).
   5단계 위원회 대상(조직·직급)도 이 모양이다(시안 admin_wizard-5) — 이름표(label)를 주면 이름표 오른쪽
   «N곳 선택 · 모두 해제»를 목록 상자 때와 같은 자리에 두고, 옛 선택(extraSelected)은 칩과 목록 끝 켜진 줄로
   보인다(누르면 지운다). search='many' 면 값이 CHIP_PICKER_SEARCH_MIN 을 넘을 때만 목록 위 검색칸(PW-1875). */
function ChipPickerDropdown({
  options,
  selected,
  onToggle,
  testIdPrefix,
  labels: L,
  extraSelected = [],
  onRemoveExtra,
  extraTestIdPrefix,
  label,
  countLabel,
  onClear,
  search = 'always',
  searchPlaceholder,
  buttonLabel,
  optionLabel,
  chipMax = 6,
  moreLabel,
  removeLabel,
  testIds = {},
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [chosenFirst, setChosenFirst] = useState(false);
  const [query, setQuery] = useState('');
  const btnRef = useRef(null);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  useDismissLayer(() => setOpen(false), menuRef, wrapRef, open);
  // 열자마자 검색칸으로 — 마우스 없이 바로 친다.
  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const nameOf = (v) => (optionLabel ? optionLabel(v) : v) ?? '';
  const ids = {
    button: testIds.button ?? `${testIdPrefix}s-pick`,
    chip: testIds.chip ?? ((v) => `${testIdPrefix}s-selected-${v}`),
    remove: testIds.remove ?? ((v) => `${testIdPrefix}s-remove-${v}`),
    item: testIds.item ?? ((v) => `${testIdPrefix}-${v}`),
  };
  const placeholder = searchPlaceholder ?? L.wizardValueSearch;
  const chosen = [
    ...options.filter((v) => selected.includes(v)),
    // 후보에서 사라진 옛 선택도 칩으로 남긴다 — X 로만 지운다.
    ...selected.filter((v) => !options.includes(v)),
  ];
  const chips = [
    ...chosen.map((v) => ({ v, remove: () => onToggle(v) })),
    ...extraSelected.map((v) => ({ v, remove: () => onRemoveExtra?.(v), extra: true })),
  ];
  const shown = chips.slice(0, chipMax);
  const hidden = chips.length - shown.length;
  const selectedCount = chips.length;

  const showSearch = search === 'always' || options.length > CHIP_PICKER_SEARCH_MIN;
  const q = showSearch ? query.trim().toLowerCase() : '';
  let rows = q ? options.filter((v) => nameOf(v).toLowerCase().includes(q)) : options;
  if (chosenFirst) rows = [...rows.filter((v) => selected.includes(v)), ...rows.filter((v) => !selected.includes(v))];

  const toggleOpen = (first) => {
    const next = !open;
    setChosenFirst(next && first);
    if (!next) setQuery('');
    setOpen(next);
  };

  return (
    <div className="evc-pick" ref={wrapRef} data-testid={`${testIdPrefix}s-box`}>
      {label != null && (
        <div className="evc-wiz-calibscope-label evc-wiz-chippicker-head" data-testid={`${testIdPrefix}s-head`}>
          <span>{label}</span>
          <span className="evc-wiz-chippicker-count" data-testid={`${testIdPrefix}s-count`}>
            {fill(countLabel ?? L.wizardValueSelected, { count: selectedCount })}
            {selectedCount > 0 && onClear && (
              <>
                {' · '}
                <Button
                  className="evc-wiz-chippicker-clear"
                  onClick={onClear}
                  data-testid={`${testIdPrefix}s-clear`}
                >
                  {L.wizardValueClear ?? '모두 해제'}
                </Button>
              </>
            )}
          </span>
        </div>
      )}
      <div className="evc-pick-row">
        <span className="evc-pick-anchor" ref={btnRef}>
          <Button
            variant="secondary"
            size="sm"
            className={`evc-pick-btn${open ? ' is-open' : ''}`}
            aria-haspopup="listbox"
            aria-expanded={open}
            disabled={disabled}
            onClick={() => toggleOpen(false)}
            data-testid={ids.button}
          >
            {buttonLabel ?? label}
            <ChevronDownGlyph size={16} aria-hidden="true" />
          </Button>
        </span>
        {shown.map(({ v, remove, extra }) => (
          <Chip
            key={`${extra ? 'x:' : ''}${v}`}
            selected
            className="evc-pick-chip"
            onRemove={disabled ? undefined : remove}
            removeLabel={removeLabel ? removeLabel(nameOf(v)) : nameOf(v)}
            removeProps={{
              'data-testid': extra ? `${testIdPrefix}s-remove-extra-${v}` : ids.remove(v),
            }}
            data-testid={extra ? `${testIdPrefix}s-selected-extra-${v}` : ids.chip(v)}
          >
            <span title={nameOf(v)}>{nameOf(v) || v}</span>
          </Chip>
        ))}
        {hidden > 0 && (
          <Button
            className="evc-pick-more"
            aria-haspopup="listbox"
            onClick={() => toggleOpen(true)}
            data-testid={`${testIdPrefix}s-more`}
          >
            {fill(moreLabel ?? '외 {{count}}개', { count: hidden })}
          </Button>
        )}
      </div>
      {open && (
        <AnchoredLayer
          anchorRef={btnRef}
          panelRef={menuRef}
          width={340}
          maxHeight={360}
          className="evc-pick-menu"
          data-testid={`${testIdPrefix}s-menu`}
        >
          {showSearch && (
            <label className="evc-pick-search">
              <SearchGlyph size={16} aria-hidden="true" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                data-testid={`${testIdPrefix}s-search`}
              />
            </label>
          )}
          <div
            className="evc-pick-list"
            role="listbox"
            aria-multiselectable="true"
            aria-label={buttonLabel ?? label}
            data-testid={`${testIdPrefix}s-list`}
          >
            {rows.map((v) => {
              const on = selected.includes(v);
              return (
                <Button
                  key={v}
                  role="option"
                  aria-selected={on}
                  className={`evc-pick-item${on ? ' is-on' : ''}`}
                  onClick={() => onToggle(v)}
                  data-testid={ids.item(v)}
                >
                  <span className="evc-pick-box" aria-hidden="true">
                    {on && <CheckGlyph size={11} />}
                  </span>
                  <span className="evc-pick-name" title={nameOf(v)}>
                    {nameOf(v)}
                  </span>
                </Button>
              );
            })}
            {/* 옛 선택은 검색과 무관하게 목록 끝에 켜진 줄로 둔다(목록 상자 때와 같다). 누르면 지운다. */}
            {extraSelected.map((v) => (
              <Button
                key={`x:${v}`}
                role="option"
                aria-selected
                className="evc-pick-item is-on"
                onClick={() => onRemoveExtra?.(v)}
                data-testid={`${extraTestIdPrefix ?? `${testIdPrefix}-extra`}-${v}`}
              >
                <span className="evc-pick-box" aria-hidden="true">
                  <CheckGlyph size={11} />
                </span>
                <span className="evc-pick-name" title={v}>
                  {v}
                </span>
              </Button>
            ))}
            {q && rows.length === 0 && (
              <span className="evc-pick-empty" data-testid={`${testIdPrefix}s-empty`}>
                {fill(L.wizardValueSearchEmpty ?? '"{{query}}"과(와) 맞는 값이 없습니다.', { query: query.trim() })}
              </span>
            )}
          </div>
          <div className="evc-pick-foot">
            <span data-testid={`${testIdPrefix}s-menu-count`}>
              {fill(countLabel ?? L.wizardValueSelected ?? '{{count}}개 선택', { count: selectedCount })}
            </span>
            {/* 이름표가 있으면 «모두 해제»는 이름표 오른쪽에 있다 — 같은 단추를 두 번 두지 않는다. */}
            {label == null && selectedCount > 0 && onClear && (
              <Button className="evc-pick-more" onClick={onClear} data-testid={`${testIdPrefix}s-clear`}>
                {L.wizardValueClear ?? '모두 해제'}
              </Button>
            )}
          </div>
        </AnchoredLayer>
      )}
    </div>
  );
}
