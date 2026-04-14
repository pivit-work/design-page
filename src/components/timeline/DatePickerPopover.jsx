import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function buildGrid(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();

  const cells = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, month: m, year: y, outside: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, outside: false });
  }
  let next = 1;
  while (cells.length < 42) {
    const m = month === 11 ? 0 : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ day: next++, month: m, year: y, outside: true });
  }
  return cells;
}

/**
 * DatePickerPopover — 날짜 피커 버튼 아래에 뜨는 미니 캘린더.
 * - anchorRect(클릭한 버튼의 DOMRect)를 기준으로 아래쪽에 4px gap 으로 배치.
 * - 하단에 공간이 부족하면 위로 뒤집어서 띄움.
 * - 좌우 chevron 으로 월 이동, 날짜 클릭 시 onSelect 호출.
 * - ESC / 바깥 클릭으로 닫힘. 앵커 버튼 클릭은 제외(토글 동작 유지).
 */
export default function DatePickerPopover({
  anchorRect,
  anchorEl,
  selectedDate,
  onSelect,
  onClose,
}) {
  const popoverRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, opacity: 0 });
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

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
  }, [anchorRect, viewYear, viewMonth]);

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
    const t = setTimeout(() => {
      window.addEventListener('mousedown', onDown);
    }, 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
      clearTimeout(t);
    };
  }, [onClose, anchorEl]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const cells = buildGrid(viewYear, viewMonth);
  const today = new Date();
  const isToday = (c) =>
    c.year === today.getFullYear() &&
    c.month === today.getMonth() &&
    c.day === today.getDate();
  const isSelected = (c) =>
    c.year === selectedDate.getFullYear() &&
    c.month === selectedDate.getMonth() &&
    c.day === selectedDate.getDate();

  return (
    <div
      ref={popoverRef}
      className="tl-datepicker-popover"
      style={{ left: pos.left, top: pos.top, opacity: pos.opacity }}
      role="dialog"
    >
      <div className="tl-datepicker-content">
        <div className="tl-datepicker-month">
          <button
            type="button"
            className="tl-datepicker-nav"
            onClick={prevMonth}
            aria-label="이전 달"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="1.67"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <p className="tl-datepicker-month-label">
            {viewYear}년 {viewMonth + 1}월
          </p>
          <button
            type="button"
            className="tl-datepicker-nav"
            onClick={nextMonth}
            aria-label="다음 달"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M7.5 15L12.5 10L7.5 5"
                stroke="currentColor"
                strokeWidth="1.67"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="tl-datepicker-grid">
          {WEEKDAYS.map((w) => (
            <div key={w} className="tl-datepicker-cell tl-datepicker-weekday">
              {w}
            </div>
          ))}
          {cells.map((c, i) => {
            const selected = isSelected(c);
            const classes = [
              'tl-datepicker-cell',
              'tl-datepicker-day',
              c.outside && 'is-outside',
              selected && 'is-selected',
              !selected && !c.outside && isToday(c) && 'is-today',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={i}
                type="button"
                className={classes}
                onClick={() => onSelect(new Date(c.year, c.month, c.day))}
              >
                {c.day}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
