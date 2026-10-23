import { useEffect, useEffectEvent, useId, useRef, useState } from 'react';
import AnchoredLayer from './AnchoredLayer.jsx';
import useDismissLayer from './useDismissLayer.js';
import { controlClass, useFieldControl } from './formField.js';
import { isKoreanLocale } from './uiLocale.js';
import { CheckGlyph, ChevronDownGlyph } from './lineIcons.jsx';
import { filterSearchOptions, hasNoSearchResult } from './searchOptions.js';
import { isEnterKey } from './enterKey.js';

const WORDS = {
  ko: { search: '검색', noResult: '일치하는 항목이 없습니다', empty: '고를 항목이 없습니다' },
  en: { search: 'Search', noResult: 'No matches', empty: 'Nothing to choose' },
};

/**
 * SearchSelect — design-page 의 «하나 고르기» 칸은 이것 하나다 (PW-1879 · PW-1954).
 *
 * 공용 `Select`(PW-1012) · 타임라인 `CustomSelect` · CSV 가져오기 `CsvSelect` 는 이름과 닫힌 칸 모양만
 * 남은 얇은 껍데기이고, 펼친 목록·키보드·화면 읽기 동작은 모두 여기서 온다. 브라우저 기본 `<select>` 는
 * 펼친 목록을 운영체제가 그려 디자이너 모양이 아니고 데모 영상에도 안 찍혀서 쓰지 않는다 — lint 가 막는다.
 *
 * 팀·부서·직급처럼 회사마다 개수가 다른 값은 200개가 넘기도 하는데, 브라우저 기본 목록(`Select`)은
 * 첫 글자로 건너뛰는 것밖에 안 돼 스크롤로 하나씩 찾아야 했다. 겉은 `Select` 칸 그대로이고,
 * 펼치면 위에 검색칸, 아래에 거른 목록이 뜬다. 펼친 모양은 직원 관리 매니저 고르기의 검색칸·목록
 * (`admin-emp-select-menu`·`-search`·`-item`·`-empty`, PW-292)을 값 그대로 꺼낸 것이다(search-select.css).
 *
 *   <SearchSelect value={v} onChange={setV} options={[{ value, label }]} />
 *
 * Props
 *  - options: [{ value, label, subLabel?, depth?, pathLabel?, group?, disabled?, keep? }]
 *      subLabel — 이름 옆에 옅게 붙는 보조 글(타임라인 드롭다운에서 왔다).
 *      depth — 계층 들여쓰기(한 단계 12px). 검색 중에는 들여쓰지 않고 `pathLabel`(있으면)을 보인다.
 *      group — 고를 수 없는 묶음 머리. 검색 중엔 아래 남은 것이 있을 때만 남는다.
 *  - onChange(value) — 이벤트가 아니라 값을 받는다.
 *  - placeholder — 값이 없을 때 칸에 보일 글(고를 수 없다)
 *  - searchPlaceholder · noResultLabel — 비우면 화면 언어(ko/en) 기본 문구
 *  - searchable — false 면 검색칸 없이 목록만 편다(PW-1955). 실행 항목 상태처럼 고를 것이 몇 개뿐인 칸에
 *      검색칸이 뜨면 어색해서다. 이때 키보드는 목록이 받는다(↑↓ · Enter · Esc), 처음엔 지금 값에 서 있다.
 *  - emptyLabel — 고를 것이 하나도 없을 때 목록에 보일 글(비우면 화면 언어 기본 문구)
 *  - className — 칸 모양 클래스. 주면 공용 기본 모양 대신 그것만 쓴다(`Select` 와 같은 규칙)
 *  - valueClassName · chevronClassName · chevron — 닫힌 칸 안 글·꺾쇠에 화면 고유 모양을 그대로 두고 싶을 때.
 *      `chevron={false}` 는 꺾쇠를 안 그린다 — 화면이 칸 배경이나 옆 아이콘으로 이미 화살표를 그릴 때
 *  - onOpenChange(open) — 펼침/닫힘을 바깥(칸을 감싼 요소의 `is-open` 등)이 알아야 할 때
 *  - autoOpen — 참이 되는 순간 칸에 초점을 두고 목록을 편다(직무 칸이 후보만 남겼을 때 — 기본 목록의 showPicker 자리)
 *  - 칸과 줄에는 `data-value` 가 붙는다 — 테스트·자동화가 글자 대신 값으로 찾게.
 *  - ref — 칸(버튼)에 붙는다
 *  키보드: 닫힌 칸에서 ↑↓ 로 편다. 펼치면 ↑↓ · Home · End 로 옮기고 Enter 로 고른다. Esc 는 닫고 칸으로 돌아온다.
 *  화면 읽기: 칸은 `combobox`, 목록은 `listbox`, 줄마다 `option` + 몇 번째인지(aria-posinset/setsize).
 *  - disabled · invalid · id · aria-label · data-testid(칸에 붙는다. 검색칸은 `-search`, 목록은 `-list`)
 */
export default function SearchSelect({
  value,
  options = [],
  onChange,
  placeholder,
  searchPlaceholder,
  noResultLabel,
  searchable = true,
  emptyLabel,
  className,
  valueClassName,
  chevronClassName,
  chevron,
  onOpenChange,
  autoOpen = false,
  ref,
  disabled,
  invalid,
  id,
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
  'data-testid': testId,
  ...rest
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();
  const { isInvalid, ...a11y } = useFieldControl({ id, invalid, describedBy });
  const words = WORDS[isKoreanLocale() ? 'ko' : 'en'];

  // 펼침/닫힘을 바깥에 알린다 — 칸을 감싼 요소가 `is-open` 모양을 입는다(타임라인·CSV 칸).
  const openChange = useEffectEvent((next) => onOpenChange?.(next));
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) openChange(open);
    mounted.current = true;
  }, [open]);
  const close = (refocus) => {
    setOpen(false);
    setQuery('');
    setActive(-1);
    if (refocus) triggerRef.current?.focus();
  };
  // Esc 로 닫으면 칸으로 돌아온다 — 키보드로 고르다 그만둔 사람이 다음 칸으로 이어 갈 수 있게.
  useDismissLayer(() => close(false), panelRef, triggerRef, open, () => close(true));

  // 검색칸이 없으면 열자마자 목록에 선다 — React 의 autoFocus 는 div 에 먹지 않아 직접 옮긴다.
  useEffect(() => {
    if (open && !searchable) listRef.current?.focus();
  }, [open, searchable]);

  const selected = options.find((o) => !o.group && String(o.value) === String(value ?? ''));
  const searching = query.trim() !== '';
  const shown = filterSearchOptions(options, query);
  const pickable = shown.filter((o) => !o.group && !o.disabled);
  const optionId = (i) => `${listId}-${i}`;

  // 키보드로 옮긴 줄이 목록 밖이면 보이게 굴린다 — 긴 목록의 아래쪽을 ↓ 로 내려갈 때.
  useEffect(() => {
    if (!open || active < 0) return;
    document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
  });

  const openMenu = () => {
    // 검색칸이 없으면 ↑↓ 가 지금 값에서 시작한다 — 검색칸이 있을 때는 치는 대로 첫 줄부터라 그대로 둔다.
    if (!searchable) setActive(pickable.indexOf(selected));
    setOpen(true);
  };

  // autoOpen 이 참이 되는 순간에만 편다 — 닫은 뒤 다시 저절로 열리면 안 된다(그리는 중에 앞 값과 견준다).
  // 초점은 열린 목록(검색칸 또는 목록)이 가져간다.
  const wantAuto = autoOpen && !disabled;
  const [prevWantAuto, setPrevWantAuto] = useState(false);
  if (wantAuto !== prevWantAuto) {
    setPrevWantAuto(wantAuto);
    if (wantAuto && !open) openMenu();
  }

  const pick = (o) => {
    onChange?.(o.value);
    close(true);
  };

  const onSearchKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (pickable.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + pickable.length) % pickable.length);
    } else if ((e.key === 'Home' || e.key === 'End') && !searchable) {
      // 검색칸에서는 Home·End 가 글자 사이를 옮기는 키라 목록만 받는다.
      e.preventDefault();
      if (pickable.length > 0) setActive(e.key === 'Home' ? 0 : pickable.length - 1);
    } else if (isEnterKey(e)) {
      e.preventDefault();
      // 검색 중 Enter 는 «찾은» 첫 값을 고른다 — 늘 남는 「전체」 줄(keep)은 찾은 것이 아니라 건너뛴다.
      const o = pickable[active] ?? (searching ? pickable.find((x) => !x.keep) : null);
      if (o) pick(o);
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  // 닫힌 칸에서 ↑↓ 로 편다 — 브라우저 기본 목록과 같은 손버릇. Enter·Space 는 버튼이라 눌림으로 편다.
  const onTriggerKey = (e) => {
    if (!open && !disabled && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      openMenu();
    }
  };
  const setTriggerRef = (node) => {
    triggerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };
  const activeId = open && active >= 0 ? optionId(active) : undefined;

  return (
    <>
      <button
        ref={setTriggerRef}
        type="button"
        className={`${controlClass('dp-input dp-select', className, isInvalid)} dp-search-select-trigger`}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        data-testid={testId}
        data-value={value ?? ''}
        {...a11y}
        {...rest}
        onKeyDown={onTriggerKey}
        onClick={() => (open ? close(false) : openMenu())}
      >
        <span className={`dp-search-select-value${selected ? '' : ' is-placeholder'}${valueClassName ? ` ${valueClassName}` : ''}`}>
          {selected ? selected.label : (placeholder ?? '')}
        </span>
        {chevron !== false && (
          <span className={`dp-search-select-chevron${chevronClassName ? ` ${chevronClassName}` : ''}`} aria-hidden="true">
            {chevron ?? <ChevronDownGlyph size={14} />}
          </span>
        )}
      </button>
      {open && (
        <AnchoredLayer
          anchorRef={triggerRef}
          panelRef={panelRef}
          matchAnchorWidth
          minWidth={200}
          maxHeight={320}
          className="dp-search-select-menu"
          // 검색칸은 늘 위에 남고 목록만 스크롤한다 — 패널 전체가 스크롤하면 검색칸이 위로 밀려 사라진다.
          style={{ overflowY: 'hidden' }}
          data-testid={testId ? `${testId}-menu` : undefined}
        >
          {searchable && (
          <input
            autoFocus
            type="text"
            role="searchbox"
            autoComplete="off"
            className="dp-search-select-search"
            value={query}
            placeholder={searchPlaceholder ?? words.search}
            aria-label={searchPlaceholder ?? words.search}
            aria-controls={listId}
            aria-activedescendant={activeId}
            onChange={(e) => { setQuery(e.target.value); setActive(-1); }}
            onKeyDown={onSearchKey}
            data-testid={testId ? `${testId}-search` : undefined}
          />
          )}
          <div
            ref={listRef}
            id={listId}
            role="listbox"
            className="dp-search-select-list"
            aria-label={ariaLabel}
            data-testid={testId ? `${testId}-list` : undefined}
            // 검색칸이 없으면 목록이 키보드를 받는다 — 열자마자 목록에 서야 ↑↓ · Enter 가 먹는다.
            {...(searchable ? {} : {
              tabIndex: -1,
              onKeyDown: onSearchKey,
              'aria-activedescendant': activeId,
            })}
          >
            {shown.map((o, i) => {
              if (o.group) {
                return (
                  <div key={`group-${o.label}-${i}`} role="presentation" className="dp-search-select-group">
                    {o.label}
                  </div>
                );
              }
              const isSel = selected === o;
              const at = pickable.indexOf(o);
              const isActive = at >= 0 && at === active;
              const label = searching && o.pathLabel ? o.pathLabel : o.label;
              return (
                <button
                  key={`${o.value}`}
                  id={at >= 0 ? optionId(at) : undefined}
                  type="button"
                  role="option"
                  tabIndex={-1}
                  data-value={o.value}
                  aria-selected={isSel}
                  aria-posinset={at >= 0 ? at + 1 : undefined}
                  aria-setsize={at >= 0 ? pickable.length : undefined}
                  disabled={o.disabled}
                  title={o.pathLabel || undefined}
                  className={`dp-search-select-item${isSel ? ' is-selected' : ''}${isActive ? ' is-active' : ''}`}
                  // 계층(조직)은 한 단계 12px 들여쓴다 — 직원 관리 필터와 같은 규칙. 검색 중엔 경로로 보인다.
                  style={!searching && o.depth ? { paddingLeft: 10 + o.depth * 12 } : undefined}
                  onMouseEnter={at >= 0 ? () => setActive(at) : undefined}
                  onClick={() => pick(o)}
                >
                  <span className="dp-search-select-item-label">{label}</span>
                  {o.subLabel && <span className="dp-search-select-item-sub">{o.subLabel}</span>}
                  {isSel && <span className="dp-search-select-item-check"><CheckGlyph size={15} /></span>}
                </button>
              );
            })}
            {options.length === 0 && (
              <div className="dp-search-select-empty" role="status">{emptyLabel ?? words.empty}</div>
            )}
            {hasNoSearchResult(shown, query) && (
              <div className="dp-search-select-empty" role="status">{noResultLabel ?? words.noResult}</div>
            )}
          </div>
        </AnchoredLayer>
      )}
    </>
  );
}
