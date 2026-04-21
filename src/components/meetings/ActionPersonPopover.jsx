import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * ActionPersonPopover — 액션 아이템의 담당자 셀 클릭 시 뜨는 팝오버.
 *
 * Figma node-id=16745-46437 (중간 상태). anchor 셀 기준 아래에 배치,
 * 하단 공간 부족하면 위로 뒤집어짐. 아바타 + 이름 리스트, 선택 체크.
 */
export default function ActionPersonPopover({
  anchorRect,
  members,
  selected,
  onSelect,
  onClose,
}) {
  const popoverRef = useRef(null);

  useLayoutEffect(() => {
    const el = popoverRef.current;
    if (!el || !anchorRect) return;
    const m = el.getBoundingClientRect();
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
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.opacity = '1';
  }, [anchorRect]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    const onDown = (e) => {
      if (!popoverRef.current) return;
      if (popoverRef.current.contains(e.target)) return;
      onClose?.();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  return (
    <div ref={popoverRef} className="mtg-action-person-popover" style={{ opacity: 0 }}>
      <ul className="mtg-action-person-list">
        {members.map((m) => {
          const isSelected = m.name === selected;
          return (
            <li key={m.name}>
              <button
                type="button"
                className={`mtg-action-person-item ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onSelect(m.name)}
              >
                <span className="mtg-action-person-avatar">{m.name.charAt(0)}</span>
                <span className="mtg-action-person-name">{m.name}</span>
                {isSelected && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M13.5 4.5L6 12l-3.5-3.5"
                      stroke="var(--colors-foreground-fgBrandPrimary, #2dbd82)"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
