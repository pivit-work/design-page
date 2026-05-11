import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * SnippetDatePicker — 날짜 picker 버튼 아래에 뜨는 미니 캘린더 팝오버.
 * Figma "_Date picker menu" (16961:24216).
 *
 * - 월~일(Monday-first) 그리드, 헤더 "January 2025" + chevron, "Today" 버튼 row.
 * - 선택일: bg-brand-solid + white. 오늘: bg-primary_hover. 다른 달: text-disabled.
 * - anchorRect 기준 아래쪽 4px gap, 아래 공간 부족 시 위로 뒤집음.
 * - ESC / 바깥 클릭으로 닫힘 (앵커 버튼 클릭은 제외).
 *
 * Props:
 *   anchorRect   클릭한 버튼의 DOMRect
 *   anchorEl     클릭한 버튼 element (outside-click 판정에서 제외)
 *   selectedDate Date — 현재 선택일
 *   onSelect     (Date) => void
 *   onClose      () => void
 */
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Monday-first 6주 그리드.
function buildGrid(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  // getDay(): 0=Sun..6=Sat → Monday-first index 0..6
  const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = prevDays - i;
    cells.push({ day: d, month: month === 0 ? 11 : month - 1, year: month === 0 ? year - 1 : year, outside: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, outside: false });
  }
  let next = 1;
  while (cells.length < 42) {
    cells.push({ day: next++, month: month === 11 ? 0 : month + 1, year: month === 11 ? year + 1 : year, outside: true });
  }
  return cells;
}

function ChevronLeft() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function SnippetDatePicker({ anchorRect, anchorEl, selectedDate, onSelect, onClose }) {
  const popoverRef = useRef(null);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

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
  }, [anchorRect, viewYear, viewMonth]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onDown = (e) => {
      if (popoverRef.current?.contains(e.target)) return;
      if (anchorEl?.contains(e.target)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => window.addEventListener('mousedown', onDown), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
      clearTimeout(t);
    };
  }, [onClose, anchorEl]);

  const goMonth = (delta) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewYear(y);
    setViewMonth(m);
  };
  const goToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
  };

  const cells = buildGrid(viewYear, viewMonth);
  const today = new Date();
  const sameDay = (c, d) =>
    c.year === d.getFullYear() && c.month === d.getMonth() && c.day === d.getDate();

  return (
    <div ref={popoverRef} className="snippet-datepicker" style={{ left: 0, top: 0, opacity: 0 }} role="dialog">
      <div className="snippet-datepicker-content">
        {/* 월 라벨 + chevron (흐린 톤) */}
        <div className="snippet-datepicker-month">
          <button type="button" className="snippet-datepicker-nav is-faint" onClick={() => goMonth(-1)} aria-label="이전 달">
            <ChevronLeft />
          </button>
          <span className="snippet-datepicker-label">{MONTHS[viewMonth]} {viewYear}</span>
          <button type="button" className="snippet-datepicker-nav is-faint" onClick={() => goMonth(1)} aria-label="다음 달">
            <ChevronRight />
          </button>
        </div>
        {/* Today 버튼 row */}
        <div className="snippet-datepicker-today-row">
          <button type="button" className="snippet-datepicker-today" onClick={goToday}>Today</button>
        </div>
        {/* 그리드 */}
        <div className="snippet-datepicker-grid">
          {WEEKDAYS.map((w) => (
            <div key={w} className="snippet-datepicker-cell is-head">{w}</div>
          ))}
          {cells.map((c, i) => {
            const selected = sameDay(c, selectedDate) && !c.outside;
            const isToday = sameDay(c, today);
            const cls = [
              'snippet-datepicker-cell',
              c.outside ? 'is-outside' : '',
              selected ? 'is-selected' : '',
              !selected && isToday ? 'is-today' : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={i}
                type="button"
                className={cls}
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
