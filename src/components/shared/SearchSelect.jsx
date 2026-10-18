import { useEffect, useId, useRef, useState } from 'react';
import AnchoredLayer from './AnchoredLayer.jsx';
import useDismissLayer from './useDismissLayer.js';
import { controlClass, useFieldControl } from './formField.js';
import { isKoreanLocale } from './uiLocale.js';
import { CheckGlyph, ChevronDownGlyph } from './lineIcons.jsx';
import { filterSearchOptions, hasNoSearchResult } from './searchOptions.js';

const WORDS = {
  ko: { search: '검색', noResult: '일치하는 항목이 없습니다' },
  en: { search: 'Search', noResult: 'No matches' },
};

/**
 * SearchSelect — 이름을 쳐서 찾을 수 있는 «하나 고르기» 칸 (PW-1879).
 *
 * 팀·부서·직급처럼 회사마다 개수가 다른 값은 200개가 넘기도 하는데, 브라우저 기본 목록(`Select`)은
 * 첫 글자로 건너뛰는 것밖에 안 돼 스크롤로 하나씩 찾아야 했다. 겉은 `Select` 칸 그대로이고,
 * 펼치면 위에 검색칸, 아래에 거른 목록이 뜬다. 펼친 모양은 직원 관리 매니저 고르기의 검색칸·목록
 * (`admin-emp-select-menu`·`-search`·`-item`·`-empty`, PW-292)을 값 그대로 꺼낸 것이다(search-select.css).
 *
 *   <SearchSelect value={v} onChange={setV} options={[{ value, label }]} />
 *
 * Props
 *  - options: [{ value, label, depth?, pathLabel?, group?, disabled? }]
 *      depth — 계층 들여쓰기(한 단계 12px). 검색 중에는 들여쓰지 않고 `pathLabel`(있으면)을 보인다.
 *      group — 고를 수 없는 묶음 머리. 검색 중엔 아래 남은 것이 있을 때만 남는다.
 *  - onChange(value) — 이벤트가 아니라 값을 받는다.
 *  - placeholder — 값이 없을 때 칸에 보일 글(고를 수 없다)
 *  - searchPlaceholder · noResultLabel — 비우면 화면 언어(ko/en) 기본 문구
 *  - searchable — false 면 검색칸 없이 목록만 편다(PW-1955). 실행 항목 상태처럼 고를 것이 몇 개뿐인 칸에
 *      검색칸이 뜨면 어색해서다. 이때 키보드는 목록이 받는다(↑↓ · Enter · Esc), 처음엔 지금 값에 서 있다.
 *  - className — 칸 모양 클래스. 주면 공용 기본 모양 대신 그것만 쓴다(`Select` 와 같은 규칙)
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
  className,
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

  const openMenu = () => {
    // 검색칸이 없으면 ↑↓ 가 지금 값에서 시작한다 — 검색칸이 있을 때는 치는 대로 첫 줄부터라 그대로 둔다.
    if (!searchable) setActive(pickable.indexOf(selected));
    setOpen(true);
  };

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
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // 검색 중 Enter 는 «찾은» 첫 값을 고른다 — 늘 남는 「전체」 줄(keep)은 찾은 것이 아니라 건너뛴다.
      const o = pickable[active] ?? (searching ? pickable.find((x) => !x.keep) : null);
      if (o) pick(o);
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${controlClass('dp-input dp-select', className, isInvalid)} dp-search-select-trigger`}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        data-testid={testId}
        {...a11y}
        {...rest}
        onClick={() => (open ? close(false) : openMenu())}
      >
        <span className={`dp-search-select-value${selected ? '' : ' is-placeholder'}`}>
          {selected ? selected.label : (placeholder ?? '')}
        </span>
        <span className="dp-search-select-chevron" aria-hidden="true"><ChevronDownGlyph size={14} /></span>
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
              'aria-activedescendant': active >= 0 ? `${listId}-${active}` : undefined,
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
              const isActive = pickable[active] === o;
              const label = searching && o.pathLabel ? o.pathLabel : o.label;
              return (
                <button
                  key={`${o.value}`}
                  id={isActive ? `${listId}-${active}` : undefined}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  disabled={o.disabled}
                  title={o.pathLabel || undefined}
                  className={`dp-search-select-item${isSel ? ' is-selected' : ''}${isActive ? ' is-active' : ''}`}
                  // 계층(조직)은 한 단계 12px 들여쓴다 — 직원 관리 필터와 같은 규칙. 검색 중엔 경로로 보인다.
                  style={!searching && o.depth ? { paddingLeft: 10 + o.depth * 12 } : undefined}
                  onClick={() => pick(o)}
                >
                  <span className="dp-search-select-item-label">{label}</span>
                  {isSel && <span className="dp-search-select-item-check"><CheckGlyph size={15} /></span>}
                </button>
              );
            })}
            {hasNoSearchResult(shown, query) && (
              <div className="dp-search-select-empty" role="status">{noResultLabel ?? words.noResult}</div>
            )}
          </div>
        </AnchoredLayer>
      )}
    </>
  );
}
