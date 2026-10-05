import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { datePickerLabels } from './uiLocale.js';
import useDismissLayer from './useDismissLayer.js';
import { ChevronDownGlyph, ChevronLeftGlyph, ChevronRightGlyph } from './lineIcons.jsx';

/**
 * DatePicker — 날짜 picker 버튼 아래에 뜨는 미니 캘린더 팝오버.
 * Figma "_Date picker menu" (16961:24216).
 *
 * - 월~일(Monday-first) 그리드, 헤더 "January 2025" + chevron, "Today" 버튼 row.
 * - 보기 셋 — 일 · 월 · 연도 (PW-1301). 머리 글자를 누르면 위 단계로 올라가고(일 → 월 → 연도),
 *   칸을 누르면 아래로 내려간다. 연도·월을 고르는 것은 보는 자리만 바꾸고, 값은 일을 눌렀을
 *   때만 바뀐다. 연도 쪽은 20의 배수에서 시작하는 20년(1980–1999). 크기는 세 보기가 같다.
 * - 선택일: bg-brand-solid + white. 오늘: bg-primary_hover. 다른 달: text-disabled.
 * - anchorRect 기준 아래쪽 4px gap, 아래 공간 부족 시 위로 뒤집음.
 * - ESC / 바깥 클릭으로 닫힘 (앵커 버튼 클릭은 제외).
 *
 * Props:
 *   anchorRect   클릭한 버튼의 DOMRect
 *   anchorEl     클릭한 버튼 element (outside-click 판정에서 제외)
 *   selectedDate Date | null — 현재 선택일. null 이면 어느 보기에도 선택 표시가 없다
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
 *   today        Date — 「오늘」로 칠 날(로컬 자정 그릇 · 연·월·일만 읽는다). 없으면 브라우저
 *                시계의 오늘. 앱이 사용자 설정 시간대로 오늘을 정할 때 넘긴다 — 브라우저가
 *                다른 나라 시간대면 오늘 강조·「Today」 버튼이 하루 어긋나지 않게 (PW-781)
 *   startView    'day'(기본) | 'year' — 'year' 면 선택일이 없을 때 연도 보기로 열고,
 *                (오늘 연도 − 30)이 든 20년 쪽을 보여 준다. 생년월일 칸이 쓴다 (PW-1301)
 *   ...rest      data-*·aria-label 등은 겉 상자에 그대로 붙는다
 *
 * Esc 는 달력만 닫고 **바깥으로 올려 보내지 않는다** — 창 안에서 연 달력의 Esc 가
 * 창까지 닫아 쓰던 내용을 날리면 안 된다 (PW-762).
 */
/** 하루 단위 비교용 — 시·분을 떨어내지 않으면 「같은 날」이 하한에 걸린다. */
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** 연도 쪽은 20의 배수에서 시작한다 — 어느 해가 어느 쪽에 드는지 늘 같아야 몇 번 넘길지 안다. */
const YEAR_PAGE = 20;
const pageStartOf = (y) => Math.floor(y / YEAR_PAGE) * YEAR_PAGE;
/** 생년월일 빈 칸이 처음 보여 줄 해 — 구성원 대부분이 20~50대라 이 쪽에서 0~1번만 넘기면 된다. */
const BIRTH_YEAR_OFFSET = 30;

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
  today: todayProp,
  locale,
  startView = 'day',
  ...rest
}) {
  const auto = useMemo(() => datePickerLabels(locale), [locale]);
  const popoverRef = useRef(null);
  const today = todayProp ?? new Date();
  // PW-528 ② — 값이 비어 있으면 호출부가 `new Date()`(오늘)를 넘겨 오므로, 그대로 두면
  // 「시작일은 9월인데 빈 종료일 달력은 8월에서 열린다」가 된다. 여는 달을 따로 받는다.
  const openAt = initialMonth ?? selectedDate ?? today;
  // 값이 있으면 이미 그 달에 와 있으므로 연도부터 다시 고르게 하지 않는다.
  const initialView = startView === 'year' && !selectedDate ? 'year' : 'day';
  const [view, setView] = useState(initialView);
  const [viewYear, setViewYear] = useState(openAt.getFullYear());
  const [viewMonth, setViewMonth] = useState(openAt.getMonth());
  const [pageStart, setPageStart] = useState(() =>
    pageStartOf(initialView === 'year' ? today.getFullYear() - BIRTH_YEAR_OFFSET : openAt.getFullYear()),
  );

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
  }, [anchorRect, viewYear, viewMonth, view]);

  useDismissLayer(onClose, popoverRef, anchorEl ? { current: anchorEl } : null);

  const min = minDate ? startOfDay(minDate) : null;
  const max = maxDate ? startOfDay(maxDate) : null;
  // 해·달은 «그 전체가» 범위 밖일 때만 막는다 — 일부라도 안이면 그 안에서 일 보기가 막는다.
  const yearOff = (y) => (!!max && new Date(y, 0, 1) > max) || (!!min && new Date(y, 11, 31) < min);
  const monthOff = (y, m) =>
    (!!max && new Date(y, m, 1) > max) || (!!min && new Date(y, m + 1, 0) < min);

  // 넘겨 갈 쪽 전체가 범위 밖이면 그 방향은 막는다 — 넘겨 봐야 전부 비활성이다.
  // 일 보기는 종전대로 하한만 본다(상한 › 비활성은 이번 범위 밖 · 기획 §11).
  let canGoPrev;
  let canGoNext = true;
  if (view === 'year') {
    canGoPrev = !min || pageStart - 1 >= min.getFullYear();
    canGoNext = !max || pageStart + YEAR_PAGE <= max.getFullYear();
  } else if (view === 'month') {
    canGoPrev = !min || viewYear - 1 >= min.getFullYear();
    canGoNext = !max || viewYear + 1 <= max.getFullYear();
  } else {
    canGoPrev =
      !min ||
      viewYear > min.getFullYear() ||
      (viewYear === min.getFullYear() && viewMonth > min.getMonth());
  }

  const go = (delta) => {
    if ((delta < 0 && !canGoPrev) || (delta > 0 && !canGoNext)) return;
    if (view === 'year') {
      setPageStart(pageStart + YEAR_PAGE * delta);
      return;
    }
    if (view === 'month') {
      setViewYear(viewYear + delta);
      return;
    }
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewYear(y);
    setViewMonth(m);
  };
  const goUp = () => {
    if (view === 'day') setView('month');
    else if (view === 'month') {
      setPageStart(pageStartOf(viewYear));
      setView('year');
    }
  };
  const pickYear = (y) => {
    setViewYear(y);
    setView('month');
  };
  const pickMonth = (m) => {
    setViewMonth(m);
    setView('day');
  };
  const goToday = () => {
    setView('day');
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    const today0 = startOfDay(today);
    if (todaySelects && (!min || today0 >= min) && (!max || today0 <= max)) onSelect(today0);
  };

  const cells = buildGrid(viewYear, viewMonth);
  const sameDay = (c, d) =>
    !!d && c.year === d.getFullYear() && c.month === d.getMonth() && c.day === d.getDate();

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

  // 연도·월 보기 문구는 호출부가 넘기는 일이 없어 화면 언어에서만 만든다.
  const head = {
    year: `${pageStart} – ${pageStart + YEAR_PAGE - 1}`,
    month: auto.yearLabel(viewYear),
    day: monthLabel,
  }[view];
  const navText = {
    year: [auto.prevYears, auto.nextYears],
    month: [auto.prevYear, auto.nextYear],
    day: [prevText, nextText],
  }[view];

  // 칸 상태는 세 보기가 같다 — 선택 · 오늘(선택과 겹치면 선택) · 고를 수 없음.
  const cellClass = ({ selected, isToday, disabled, outside }) =>
    [
      'dp-datepicker-cell',
      outside ? 'is-outside' : '',
      selected ? 'is-selected' : '',
      !selected && isToday ? 'is-today' : '',
      disabled ? 'is-disabled' : '',
    ].filter(Boolean).join(' ');
  const pad2 = (n) => String(n).padStart(2, '0');

  return (
    <div
      {...rest}
      ref={popoverRef}
      className="dp-datepicker"
      style={{ left: 0, top: 0, opacity: 0 }}
      role="dialog"
      data-view={view}
    >
      <div className="dp-datepicker-content">
        {/* 머리 글자 + chevron (흐린 톤) */}
        <div className="dp-datepicker-month">
          <button
            type="button"
            className="dp-datepicker-nav is-faint"
            onClick={() => go(-1)}
            disabled={!canGoPrev}
            aria-label={navText[0]}
          >
            <ChevronLeftGlyph size={20} />
          </button>
          {view === 'year' ? (
            <span className="dp-datepicker-label">{head}</span>
          ) : (
            <button
              type="button"
              className="dp-datepicker-label is-button"
              onClick={goUp}
              aria-label={view === 'day' ? auto.toMonthView : auto.toYearView}
            >
              {head}
              <ChevronDownGlyph size={16} />
            </button>
          )}
          <button
            type="button"
            className="dp-datepicker-nav is-faint"
            onClick={() => go(1)}
            disabled={!canGoNext}
            aria-label={navText[1]}
          >
            <ChevronRightGlyph size={20} />
          </button>
        </div>
        {/* Today 버튼 row */}
        <div className="dp-datepicker-today-row">
          <button type="button" className="dp-datepicker-today" onClick={goToday}>{todayText}</button>
        </div>
        {view === 'year' && (
          <div className="dp-datepicker-grid is-years">
            {Array.from({ length: YEAR_PAGE }, (_, i) => pageStart + i).map((y) => {
              const selected = !!selectedDate && selectedDate.getFullYear() === y;
              const disabled = yearOff(y);
              return (
                <button
                  key={y}
                  type="button"
                  className={cellClass({ selected, isToday: today.getFullYear() === y, disabled })}
                  disabled={disabled}
                  aria-disabled={disabled || undefined}
                  aria-pressed={selected}
                  data-year={y}
                  onClick={() => pickYear(y)}
                >
                  {y}
                </button>
              );
            })}
          </div>
        )}
        {view === 'month' && (
          <div className="dp-datepicker-grid is-months">
            {auto.monthsShort.map((name, m) => {
              const selected =
                !!selectedDate &&
                selectedDate.getFullYear() === viewYear &&
                selectedDate.getMonth() === m;
              const isToday = today.getFullYear() === viewYear && today.getMonth() === m;
              const disabled = monthOff(viewYear, m);
              return (
                <button
                  key={m}
                  type="button"
                  className={cellClass({ selected, isToday, disabled })}
                  disabled={disabled}
                  aria-disabled={disabled || undefined}
                  aria-pressed={selected}
                  data-month={`${viewYear}-${pad2(m + 1)}`}
                  onClick={() => pickMonth(m)}
                >
                  {name}
                </button>
              );
            })}
          </div>
        )}
        {view === 'day' && (
          <div className="dp-datepicker-grid">
            {weekdays.map((w, wi) => (
              <div key={`${w}-${wi}`} className="dp-datepicker-cell is-head">{w}</div>
            ))}
            {cells.map((c, i) => {
              const selected = sameDay(c, selectedDate) && !c.outside;
              // PW-528 ② — 종료일 달력은 시작일 이전을 고를 수 없다. 눌러도 값이 안
              // 바뀌는 게 아니라 «눌리지 않는 것»으로 보여야 왜 안 되는지 알 수 있다.
              const day = new Date(c.year, c.month, c.day);
              const disabled = (!!min && day < min) || (!!max && day > max);
              return (
                <button
                  key={i}
                  type="button"
                  className={cellClass({ selected, isToday: sameDay(c, today), disabled, outside: c.outside })}
                  disabled={disabled}
                  aria-disabled={disabled || undefined}
                  aria-pressed={selected}
                  data-date={`${c.year}-${pad2(c.month + 1)}-${pad2(c.day)}`}
                  onClick={() => onSelect(new Date(c.year, c.month, c.day))}
                >
                  {c.day}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
