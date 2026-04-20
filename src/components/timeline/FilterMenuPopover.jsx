import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from '../shared/Icon.jsx';

export const FILTER_TYPES = ['회의', '1on1', '집중작업', '리뷰', '외부미팅', '기타'];

/**
 * FilterMenuPopover — 필터 버튼 아래에 뜨는 멀티 셀렉트 드롭다운.
 * Figma _Select menu item 구조: content padding 8/10/8/8, radius 6,
 * 선택 시 우측에 16x16 브랜드 체크 아이콘 노출.
 * DatePickerPopover 와 동일한 앵커 배치/외부 클릭 닫기 패턴을 따른다.
 */
export default function FilterMenuPopover({
  anchorRect,
  anchorEl,
  selected,
  onToggle,
  onClose,
  baseUrl,
}) {
  const popoverRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, opacity: 0 });

  useLayoutEffect(() => {
    if (!popoverRef.current || !anchorRect) return;
    const m = popoverRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 4;
    const MARGIN = 8;

    let left = anchorRect.left;
    if (left + m.width > vw - MARGIN) left = vw - m.width - MARGIN;
    if (left < MARGIN) left = MARGIN;

    let top = anchorRect.bottom + gap;
    if (top + m.height > vh - MARGIN) {
      const above = anchorRect.top - m.height - gap;
      top = above >= MARGIN ? above : Math.max(MARGIN, vh - m.height - MARGIN);
    }

    setPos({ left, top, opacity: 1 });
  }, [anchorRect]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e) => {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      if (anchorEl && anchorEl.contains(e.target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [anchorEl, onClose]);

  return (
    <div
      ref={popoverRef}
      className="tl-filter-menu"
      role="menu"
      style={{ left: pos.left, top: pos.top, opacity: pos.opacity }}
    >
      {FILTER_TYPES.map((type) => {
        const isSelected = selected.includes(type);
        return (
          <button
            key={type}
            type="button"
            role="menuitemcheckbox"
            aria-checked={isSelected}
            className={`tl-filter-menu-item ${isSelected ? 'is-selected' : ''}`}
            onClick={() => onToggle(type)}
          >
            <span className="tl-filter-menu-label">{type}</span>
            {isSelected && (
              <Icon
                src="/icons-solid/check.svg"
                size={16}
                color="var(--colors-foreground-fgBrandPrimary, #2dbd82)"
                baseUrl={baseUrl}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
