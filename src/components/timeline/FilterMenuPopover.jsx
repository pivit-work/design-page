import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';

export const FILTER_TYPES = ['회의', '1on1', '집중작업', '리뷰', '외부미팅', '기타'];

/**
 * FilterMenuPopover — 필터 버튼 아래에 뜨는 멀티 셀렉트 드롭다운.
 * Figma _Select menu item 구조: content padding 8/10/8/8, radius 6,
 * 선택 시 우측에 16x16 브랜드 체크 아이콘 노출.
 * DatePickerPopover 와 동일한 앵커 배치/외부 클릭 닫기 패턴을 따른다.
 *
 * 항목 두 모드:
 *   - `items` 미주입 — 레거시. FILTER_TYPES 한글 라벨 자체가 id.
 *   - `items=[{ id, label }]` — 호스트가 항목을 준다. 모양은 레거시와 같다(라벨 + 선택 체크).
 *     `onToggleAll` 을 주면 맨 위에 「전체」(`allLabel`) 줄을 더한다 — 다른 줄과 같은 모양이고,
 *     항목이 모두 선택됐을 때만 체크가 붙는다.
 * 목록이 창 높이보다 길면 목록 안에서 스크롤한다(CSS max-height).
 *
 * document.body 로 포털한다 — 앱 셸(.app)이 transform 을 가져 그 안의 position: fixed 가
 * 창이 아니라 스크롤되는 셸 기준으로 잡힌다. 셸 안에 두면 스크롤한 만큼 버튼에서 어긋난다
 * (CellPicker 와 같은 이유).
 */
export default function FilterMenuPopover({
  anchorRect,
  anchorEl,
  selected,
  onToggle,
  onClose,
  baseUrl,
  items,
  allLabel = '전체',
  onToggleAll,
}) {
  const popoverRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, opacity: 0 });

  // 목록은 position: fixed 라 열린 채로 화면이 스크롤되면 버튼에서 떨어져 남는다.
  // anchorEl 이 있으면 스크롤·창 크기 변경 때마다 버튼의 현재 위치로 다시 잰다.
  const place = useCallback(() => {
    const a = anchorEl ? anchorEl.getBoundingClientRect() : anchorRect;
    if (!popoverRef.current || !a) return;
    const m = popoverRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 4;
    const MARGIN = 8;

    let left = a.left;
    if (left + m.width > vw - MARGIN) left = vw - m.width - MARGIN;
    if (left < MARGIN) left = MARGIN;

    let top = a.bottom + gap;
    if (top + m.height > vh - MARGIN) {
      const above = a.top - m.height - gap;
      top = above >= MARGIN ? above : Math.max(MARGIN, vh - m.height - MARGIN);
    }

    setPos((prev) =>
      prev.left === left && prev.top === top && prev.opacity === 1
        ? prev
        : { left, top, opacity: 1 },
    );
  }, [anchorEl, anchorRect]);

  useLayoutEffect(() => {
    place();
  }, [place]);

  useEffect(() => {
    if (!anchorEl) return undefined;
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [anchorEl, place]);

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

  const rows = items ?? FILTER_TYPES.map((type) => ({ id: type, label: type }));
  const allOn = rows.every((row) => selected.includes(row.id));
  const checkIcon = (
    <Icon
      src="/icons-solid/check.svg"
      size={16}
      color="var(--colors-foreground-fgBrandPrimary, #2dbd82)"
      baseUrl={baseUrl}
    />
  );

  return createPortal(
    <div
      ref={popoverRef}
      className="tl-filter-menu"
      role="menu"
      style={{ left: pos.left, top: pos.top, opacity: pos.opacity }}
    >
      {items && onToggleAll && (
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={allOn}
          className={`tl-filter-menu-item ${allOn ? 'is-selected' : ''}`}
          onClick={onToggleAll}
        >
          <span className="tl-filter-menu-label">{allLabel}</span>
          {allOn && checkIcon}
        </button>
      )}
      {rows.map((row) => {
        const isSelected = selected.includes(row.id);
        return (
          <button
            key={row.id}
            type="button"
            role="menuitemcheckbox"
            aria-checked={isSelected}
            className={`tl-filter-menu-item ${isSelected ? 'is-selected' : ''}`}
            onClick={() => onToggle(row.id)}
          >
            <span className="tl-filter-menu-label">{row.label}</span>
            {isSelected && checkIcon}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
