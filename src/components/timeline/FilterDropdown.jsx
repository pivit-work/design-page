import { useCallback, useRef, useState } from 'react';
import FilterMenuPopover from './FilterMenuPopover.jsx';

/**
 * FilterDropdown — 툴바의 라벨 달린 다중 선택 필터 (「보기」·「프로젝트」).
 *
 * 시안 `pivit-specs/B. TimeLine/timeline-app.jsx` 의 `FilterDropdown` 포팅.
 * 트리거는 툴바의 보기 단위 드롭다운(CustomSelect sm)과 같은 모양이고, 일부만
 * 선택됐을 때 라벨 옆에 선택된 항목의 색 점을 보여준다(시안과 같음). 목록은
 * FilterMenuPopover(position: fixed, 창 안으로 위치 보정)로 띄운다.
 *
 * API:
 *   <FilterDropdown
 *     label="보기"
 *     items={[{ id, label, color? }]}
 *     selected={['snippet', ...]}   // controlled
 *     onChange={(ids) => ...}       // items 순서를 유지한 새 배열
 *     allLabel="전체"
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
  const selectedItems = items.filter((item) => selected.includes(item.id));

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
    <div
      className={`tl-select tl-select-size-sm tl-filter-dropdown ${open ? 'is-open' : ''} ${allOn ? '' : 'is-partial'}`}
      data-testid={testId}
    >
      <button
        ref={triggerRef}
        type="button"
        className="tl-select-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggleOpen}
      >
        <span className="tl-select-value">{label}</span>
        {!allOn && selectedItems.some((item) => item.color) && (
          <span className="tl-filter-dropdown-dots" aria-hidden="true">
            {selectedItems.map((item) => (
              <span
                key={item.id}
                className="tl-filter-menu-dot"
                style={{ background: item.color }}
              />
            ))}
          </span>
        )}
        <span className="tl-select-chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </span>
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
    </div>
  );
}
