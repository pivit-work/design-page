import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { datePickerLabels } from './uiLocale.js';

/**
 * DatePicker — 날짜 picker 버튼 아래에 뜨는 미니 캘린더 팝오버.
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
 *   labels       { months: string[12], weekdays: string[7], today, monthLabel(y,m), prevMonth, nextMonth }
 *                — 화면 언어를 따르게 하는 문구 (PW-528). **없는 키는 `locale` 로 만든 문구로
 *                채운다** (PW-793) — 종전에는 영어 기본값이라 한국어 화면에서 「September
 *                2026 · Today」 가 나왔다.
 *   locale       화면 언어. 없으면 `<html lang>` (uiLocale.js)
 *   minDate      Date — 이 날짜 이전은 고를 수 없다(경계 포함). 없으면 하한 없음
 *   initialMonth Date — 처음 보여 줄 달. 없으면 selectedDate 의 달
 *   maxDate      Date — 이 날짜 이후는 고를 수 없다(경계 포함). 없으면 상한 없음 (PW-762)
 *   todaySelects boolean — true 면 「Today」 가 오늘 달로 넘기면서 오늘을 고른다
 *                (고를 수 있는 범위 안일 때만). 기본 false = 달만 넘긴다 (PW-762)
 *   ...rest      data-*·aria-label 등은 겉 상자에 그대로 붙는다
 *
 * Esc 는 달력만 닫고 **바깥으로 올려 보내지 않는다** — 창 안에서 연 달력의 Esc 가
 * 창까지 닫아 쓰던 내용을 날리면 안 된다 (PW-762).
 */
/** 하루 단위 비교용 — 시·분을 떨어내지 않으면 「같은 날」이 하한에 걸린다. */
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

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

export default function DatePicker({
  anchorRect,
  anchorEl,
  selectedDate,
  onSelect,
  onClose,
  labels,
  minDate,
  initialMonth,
  maxDate,
  todaySelects = false,
  locale,
  ...rest
}) {
  const auto = useMemo(() => datePickerLabels(locale), [locale]);
  const popoverRef = useRef(null);
  // PW-528 ② — 값이 비어 있으면 호출부가 `new Date()`(오늘)를 넘겨 오므로, 그대로 두면
  // 「시작일은 9월인데 빈 종료일 달력은 8월에서 열린다」가 된다. 여는 달을 따로 받는다.
  const openAt = initialMonth ?? selectedDate;
  const [viewYear, setViewYear] = useState(openAt.getFullYear());
  const [viewMonth, setViewMonth] = useState(openAt.getMonth());

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
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    const onDown = (e) => {
      if (popoverRef.current?.contains(e.target)) return;
      if (anchorEl?.contains(e.target)) return;
      onClose();
    };
    // 캡처 단계에서 받아야 창의 Esc 처리(window 버블)보다 먼저 멈출 수 있다.
    window.addEventListener('keydown', onKey, true);
    const t = setTimeout(() => window.addEventListener('mousedown', onDown), 0);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('mousedown', onDown);
      clearTimeout(t);
    };
  }, [onClose, anchorEl]);

  const min = minDate ? startOfDay(minDate) : null;
  const max = maxDate ? startOfDay(maxDate) : null;
  // 하한이 있는 달보다 앞으로는 넘길 필요가 없다 — 넘겨 봐야 전부 비활성이다.
  const canGoPrev =
    !min ||
    viewYear > min.getFullYear() ||
    (viewYear === min.getFullYear() && viewMonth > min.getMonth());

  const goMonth = (delta) => {
    if (delta < 0 && !canGoPrev) return;
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
    const today0 = startOfDay(t);
    if (todaySelects && (!min || today0 >= min) && (!max || today0 <= max)) onSelect(today0);
  };

  const cells = buildGrid(viewYear, viewMonth);
  const today = new Date();
  const sameDay = (c, d) =>
    c.year === d.getFullYear() && c.month === d.getMonth() && c.day === d.getDate();

  /* 문구는 «있으면 쓴다»가 아니라 «제대로 된 배열이면 쓴다». 호출부가 라벨을 Proxy 로
     넘겨 어떤 키에도 문자열을 돌려주는 경우가 있어(테스트 픽스처가 그렇다), 있는지만
     보면 문자열에 .map 을 걸어 렌더 중에 터진다. */
  const months =
    Array.isArray(labels?.months) && labels.months.length === 12 ? labels.months : auto.months;
  const weekdays =
    Array.isArray(labels?.weekdays) && labels.weekdays.length === 7
      ? labels.weekdays
      : auto.weekdays;
  const todayText = typeof labels?.today === 'string' ? labels.today : auto.today;
  const prevText = typeof labels?.prevMonth === 'string' ? labels.prevMonth : auto.prevMonth;
  const nextText = typeof labels?.nextMonth === 'string' ? labels.nextMonth : auto.nextMonth;
  // 한국어는 「2026년 8월」, 영어는 「August 2026」 — 어순이 달라 문자열 조립을
  // 호출부에 맡길 수 있다. 달 이름만 넘기고 조립을 안 넘기면 영어 어순으로 잇는다.
  const monthLabel =
    typeof labels?.monthLabel === 'function'
      ? labels.monthLabel(viewYear, viewMonth)
      : Array.isArray(labels?.months) && labels.months.length === 12
        ? `${months[viewMonth]} ${viewYear}`
        : auto.monthLabel(viewYear, viewMonth);

  return (
    <div {...rest} ref={popoverRef} className="dp-datepicker" style={{ left: 0, top: 0, opacity: 0 }} role="dialog">
      <div className="dp-datepicker-content">
        {/* 월 라벨 + chevron (흐린 톤) */}
        <div className="dp-datepicker-month">
          <button
            type="button"
            className="dp-datepicker-nav is-faint"
            onClick={() => goMonth(-1)}
            disabled={!canGoPrev}
            aria-label={prevText}
          >
            <ChevronLeft />
          </button>
          <span className="dp-datepicker-label">{monthLabel}</span>
          <button type="button" className="dp-datepicker-nav is-faint" onClick={() => goMonth(1)} aria-label={nextText}>
            <ChevronRight />
          </button>
        </div>
        {/* Today 버튼 row */}
        <div className="dp-datepicker-today-row">
          <button type="button" className="dp-datepicker-today" onClick={goToday}>{todayText}</button>
        </div>
        {/* 그리드 */}
        <div className="dp-datepicker-grid">
          {weekdays.map((w, wi) => (
            <div key={`${w}-${wi}`} className="dp-datepicker-cell is-head">{w}</div>
          ))}
          {cells.map((c, i) => {
            const selected = sameDay(c, selectedDate) && !c.outside;
            const isToday = sameDay(c, today);
            // PW-528 ② — 종료일 달력은 시작일 이전을 고를 수 없다. 눌러도 값이 안
            // 바뀌는 게 아니라 «눌리지 않는 것»으로 보여야 왜 안 되는지 알 수 있다.
            const day = new Date(c.year, c.month, c.day);
            const disabled = (!!min && day < min) || (!!max && day > max);
            const cls = [
              'dp-datepicker-cell',
              c.outside ? 'is-outside' : '',
              selected ? 'is-selected' : '',
              !selected && isToday ? 'is-today' : '',
              disabled ? 'is-disabled' : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                key={i}
                type="button"
                className={cls}
                disabled={disabled}
                aria-disabled={disabled || undefined}
                aria-pressed={selected}
                data-date={`${c.year}-${String(c.month + 1).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`}
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
