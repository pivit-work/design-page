import { useEffect, useRef, useState, useLayoutEffect } from 'react';

/**
 * CustomSelect — 시스템 <select> 를 대체하는 공용 드롭다운.
 *
 * Figma "Select" 인풋 스타일:
 *   - Trigger: bg rgba(0,0,0,0.03), r=10, pad 6/12 (md: 8/12),
 *     focused/open 시 brand border
 *   - Menu: r=10, pad 4 0, white, 2 drop shadows (Figma Menu 스펙)
 *   - Item: pad 8 10 8 8, radius 6, hover 시 bg-secondary
 *
 * API:
 *   <CustomSelect
 *     value={v}
 *     onChange={setV}
 *     placeholder="선택해 주세요."
 *     options={[{value, label, subLabel?}]}
 *     size="sm" | "md"  // default sm (36px), md (40px)
 *     disabled?
 *     id? name?         // label for/htmlFor
 *     ariaLabel?
 *   />
 */
export default function CustomSelect({
  value,
  onChange,
  placeholder = '선택해 주세요.',
  options = [],
  size = 'sm',
  disabled = false,
  id,
  ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ placement: 'below' });

  // 외부 클릭 / ESC 로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  // 아래 공간이 부족하면 위로 뒤집어서 띄움
  useLayoutEffect(() => {
    if (!isOpen || !wrapRef.current || !menuRef.current) return;
    const trig = wrapRef.current.getBoundingClientRect();
    const menuH = menuRef.current.getBoundingClientRect().height;
    const spaceBelow = window.innerHeight - trig.bottom;
    const placement = spaceBelow < menuH + 16 && trig.top > menuH + 16 ? 'above' : 'below';
    setMenuPos({ placement });
  }, [isOpen]);

  const selected = options.find((o) => o.value === value);
  const triggerLabel = selected ? selected.label : placeholder;

  return (
    <div
      ref={wrapRef}
      className={`tl-select tl-select-size-${size} ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
    >
      <button
        type="button"
        id={id}
        className="tl-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setIsOpen((v) => !v)}
      >
        <span className={`tl-select-value ${!selected ? 'is-placeholder' : ''}`}>
          {triggerLabel}
        </span>
        <span className="tl-select-chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className={`tl-select-menu tl-select-menu-${menuPos.placement}`}
          role="listbox"
        >
          {options.length === 0 ? (
            <div className="tl-select-empty">옵션이 없습니다</div>
          ) : (
            options.map((opt) => {
              const isSel = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  className={`tl-select-item ${isSel ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  <span className="tl-select-item-label">{opt.label}</span>
                  {opt.subLabel && (
                    <span className="tl-select-item-sub">{opt.subLabel}</span>
                  )}
                  {isSel && (
                    <svg
                      className="tl-select-item-check"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="3 8 7 12 13 4" />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
