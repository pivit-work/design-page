import { useCallback, useRef, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import FilterMenuPopover from './FilterMenuPopover.jsx';

/**
 * FilterDropdown — 호스트가 항목을 주는 툴바 다중 선택 필터 (「보기」).
 *
 * 모양은 디자이너가 그린 툴바 아이콘 필터 버튼(`.tl-filter-btn`)과 그 목록
 * (FilterMenuPopover — 라벨 + 선택 체크) 그대로다. 달라지는 것은 항목뿐이다.
 * `label` 은 화면에 글자로 그리지 않고 버튼의 aria-label 로만 쓴다.
 *
 * API:
 *   <FilterDropdown
 *     label="보기"
 *     items={[{ id, label }]}
 *     selected={['snippet', ...]}   // controlled
 *     onChange={(ids) => ...}       // items 순서를 유지한 새 배열
 *     allLabel="전체"               // 목록 맨 위 「전체」 줄 — 하나라도 꺼져 있으면 모두 켜고, 모두 켜져 있으면 모두 끈다
 *   />
 */
export default function FilterDropdown({
  label,
  items,
  selected,
  onChange,
  allLabel = '전체',
  baseUrl,
  testId,
}) {
  const triggerRef = useRef(null);
  const [anchor, setAnchor] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = anchor !== null;
  const allOn = items.every((item) => selected.includes(item.id));

  const close = useCallback(() => {
    setAnchor(null);
    setAnchorEl(null);
  }, []);

  const toggleOpen = () => {
    if (open) {
      close();
      return;
    }
    const el = triggerRef.current;
    if (!el) return;
    setAnchor(el.getBoundingClientRect());
    setAnchorEl(el);
  };

  const handleToggle = (id) => {
    const nextSet = new Set(selected);
    if (nextSet.has(id)) nextSet.delete(id);
    else nextSet.add(id);
    onChange(items.map((item) => item.id).filter((itemId) => nextSet.has(itemId)));
  };

  const handleToggleAll = () => {
    onChange(allOn ? [] : items.map((item) => item.id));
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`tl-filter-btn ${open ? 'is-open' : ''}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid={testId}
        onClick={toggleOpen}
      >
        <Icon src="/icons/filter-lines.svg" size={20} color="var(--colors-foreground-fgPrimary)" baseUrl={baseUrl} />
      </button>
      {open && (
        <FilterMenuPopover
          anchorRect={anchor}
          anchorEl={anchorEl}
          items={items}
          selected={selected}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
          allLabel={allLabel}
          onClose={close}
          baseUrl={baseUrl}
        />
      )}
    </>
  );
}
