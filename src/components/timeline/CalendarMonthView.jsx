import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  SNIPPET_COLORS,
  TODAY_STR,
  formatIsoDate,
} from './constants.js';
import useTimelineData from './useTimelineData.js';
import { weekdayShortLabels, formatMonthDay } from './timelineLabels.js';

// 주말(일/토) 컬럼은 그대로 보여주되 이벤트만 비움.
const COL_COUNT = 7;
// 처음 보이는 주 수 — 한 화면이 6주(시안의 월 달력). 줄 높이는 이 값으로 화면을 나눠 정한다.
const ROW_COUNT = 6;
// 끝없이 잇는 단위 — 한 번에 붙이는 주 수 · 한 번에 들고 있는 최대 주 수(넘치면 반대쪽을 버린다)
const WEEK_CHUNK = 6;
const WEEK_MAX = 60;
// 줄 하나의 최소 높이 — 122 = CELL_FIXED_H(44) + 2 events × EVENT_STEP(30) + MORE_RESERVED(18)
const ROW_MIN_H = 122;

// 셀 내부 레이아웃 상수 — ResizeObserver 로 측정된 cell height 에서
// 몇 개의 이벤트 pill 을 보여줄 수 있을지 역산하는 데 사용.
//
// 셀 구조: padding 8/8 + day-head(min 24) + gap 4 + events(flex column gap 4) + more(18)
//   → 고정 영역 = 8 + 24 + 4 + 8 = 44 (padding 위/아래, day-head, gap)
//   → more 링크(+gap): 18 + 4 = 22
//   → 이벤트 하나당 26 + 4(gap) = 30, 단 첫 이벤트는 gap 없음 → 전체 = 30N - 4
//   → 필요 height = 30N - 4 + 22 = 30N + 18 (more 포함)
//   → N = floor((cellAvail - 18) / 30)
const CELL_FIXED_H = 44;
const EVENT_STEP = 30;
const MORE_RESERVED = 18;
// 디자인 요구: 셀마다 최소 이벤트 pill 2개 + "+N more..." 가 항상 보이도록.
// 이 값을 낮추면 빈 셀처럼 보일 수 있어서 2 로 유지. 대신 grid-template-rows
// 의 minmax 를 122px 이상으로 설정해 수용 공간을 보장한다 (timeline.css).
const MIN_VISIBLE = 2;

const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

// 선택된 달의 첫 주 일요일 — 끝없는 주 목록은 여기서 시작한다(처음 화면이 종전 6주 달력과 같다).
function gridStartOf(date) {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  return addDays(firstOfMonth, -firstOfMonth.getDay()); // 0 = Sun
}

// `start`(일요일)부터 `weeks` 주 분량의 Date 배열 — 7 × weeks.
function buildWeeks(start, weeks) {
  return Array.from({ length: weeks * COL_COUNT }, (_, i) => addDays(start, i));
}

/**
 * CalendarMonthView — 캘린더 탭의 월 그리드. **주 단위로 끝없이 이어진다**(2026-10-25).
 *
 * - 7 column × 주 목록 + sticky 요일 header. 줄 높이는 「칸 높이 ÷ 6」(최소 122)로 못 박아
 *   처음 화면이 종전 6주 달력과 같고, 아래로 밀면 다음 주들이 붙고 위로 밀면 앞 주들이 붙는다
 *   (앞에 붙일 때는 스크롤 위치를 그만큼 내려 화면이 튀지 않는다). 들고 있는 주가 WEEK_MAX 를
 *   넘으면 반대쪽 끝을 버린다. 스크롤바는 그리지 않는다(timeline.css).
 * - 각 셀: day number(+ 1일은 "X월 Y일"), 이벤트 pill 최대 N개, "+N more..."
 * - 오늘 날짜는 녹색 원형 배경 하이라이트. 달이 이어져 보이므로 「이번 달 밖」 흐림은 두지 않는다 —
 *   달의 경계는 1일의 「X월 1일」 라벨이 말한다.
 * - 날짜(selectedDate)가 바뀌면 그 달의 첫 주로 돌아가 맨 위부터 다시 그린다.
 * - "+N more..." 클릭 시 onMoreClick(iso, events, cellRect) 호출 — 상위에서
 *   일별 이벤트 팝오버(DayEventsPopover)를 연다.
 */
// now — 「지금」을 로컬 Date 그릇으로 돌려주는 함수. 주면 그날을 오늘로 강조한다.
// 없으면 종전대로 데모 고정일(TODAY_STR) (PW-781).
export default function CalendarMonthView({
  selectedDate,
  onEventClick,
  onMoreClick,
  now,
  onEventHover,
  onEventHoverEnd,
  // 그리는 주가 바뀔 때마다 { fromDate, toDate }('YYYY-MM-DD') — 호스트가 그 범위의 일정을 받아 오게 한다
  onVisibleRangeChange,
}) {
  const { getEventsForDate } = useTimelineData();

  // 주 목록의 창 — 선택한 달의 첫 주부터 `weeks` 주. 날짜(달)가 바뀌면 처음으로 돌아간다.
  const monthKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}`;
  const [range, setRange] = useState(() => ({ start: gridStartOf(selectedDate), weeks: ROW_COUNT }));
  // 달이 바뀌면 그리는 중에 창을 처음으로 돌린다(React 의 「props 에서 state 를 다시 셈」 방식)
  const [rangeMonth, setRangeMonth] = useState(monthKey);
  if (rangeMonth !== monthKey) {
    setRangeMonth(monthKey);
    setRange({ start: gridStartOf(selectedDate), weeks: ROW_COUNT });
  }
  const gridRef = useRef(null);

  // 줄 높이 = 칸 높이 ÷ 6 (최소 122). 창이 커지면 줄도 커지고 칸에 들어가는 pill 도 3, 4 … 로 는다.
  const [rowH, setRowH] = useState(ROW_MIN_H);
  const maxVisible = Math.max(MIN_VISIBLE, Math.floor((rowH - CELL_FIXED_H - MORE_RESERVED) / EVENT_STEP));
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const compute = () => {
      const next = Math.max(ROW_MIN_H, Math.floor(grid.clientHeight / ROW_COUNT));
      setRowH((prev) => (prev === next ? prev : next));
      // 화면보다 주가 모자라면(아주 높은 창) 아래로 더 붙인다
      const needed = Math.ceil(grid.clientHeight / next) + 1;
      setRange((r) => (r.weeks < needed ? { ...r, weeks: needed + WEEK_CHUNK } : r));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(grid);
    return () => ro.disconnect();
  }, []);

  // 창의 첫 주가 옮겨지면(앞에 붙이거나 앞을 버리면) 그린 뒤 그 주 수만큼 스크롤을 옮겨 보이는 자리를 지킨다.
  // 달이 바뀌었으면 맨 위로 돌아간다. 보정은 여기서 «지난번 그린 첫 주와의 차이»로만 센다 —
  // setRange 계산 함수 안에서 스크롤을 만지면 StrictMode 가 그 함수를 두 번 돌려 보정이 두 배가 되고,
  // 한 틀에 두 번 붙이면 하나가 빠졌다(화면이 아래 끝으로 튀어 엉뚱한 달로 넘어갔다).
  const rendered = useRef({ start: range.start, monthKey });
  useLayoutEffect(() => {
    const prev = rendered.current;
    rendered.current = { start: range.start, monthKey };
    const grid = gridRef.current;
    if (!grid) return;
    if (prev.monthKey !== monthKey) {
      grid.scrollTop = 0;
      return;
    }
    const shiftedWeeks = Math.round((prev.start - range.start) / (COL_COUNT * 86400000));
    if (shiftedWeeks) grid.scrollTop += shiftedWeeks * rowH;
  }, [range.start, monthKey, rowH]);

  // 위·아래 끝에 주를 더 붙인다. 너무 많아지면 반대쪽 끝을 버린다(버린 만큼 스크롤 보정).
  const extend = useCallback((dir) => {
    setRange((r) => {
      const trim = r.weeks + WEEK_CHUNK > WEEK_MAX ? WEEK_CHUNK : 0;
      if (dir === 'down') {
        return { start: addDays(r.start, trim * COL_COUNT), weeks: r.weeks + WEEK_CHUNK - trim };
      }
      return { start: addDays(r.start, -WEEK_CHUNK * COL_COUNT), weeks: r.weeks + WEEK_CHUNK - trim };
    });
  }, []);

  // 끝에 가까워지면 주를 더 붙인다.
  const handleScroll = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const nearTop = grid.scrollTop < rowH * 2;
    const nearBottom = grid.scrollTop + grid.clientHeight > grid.scrollHeight - rowH * 2;
    if (nearBottom) extend('down');
    else if (nearTop) extend('up');
  }, [rowH, extend]);

  // 달을 연 직후는 맨 위(scrollTop 0)라 위로 굴려도 스크롤이 안 움직여 onScroll 이 안 온다 —
  // 맨 위에서 위로 미는 휠·터치를 따로 받아 앞 주를 붙인다.
  const touchY = useRef(null);
  const pushUpAtTop = useCallback(() => {
    if (gridRef.current && gridRef.current.scrollTop <= 0) extend('up');
  }, [extend]);
  const handleWheel = useCallback((e) => { if (e.deltaY < 0) pushUpAtTop(); }, [pushUpAtTop]);
  const handleTouchStart = useCallback((e) => { touchY.current = e.touches[0]?.clientY ?? null; }, []);
  const handleTouchMove = useCallback((e) => {
    const y = e.touches[0]?.clientY;
    if (touchY.current != null && y != null && y > touchY.current) pushUpAtTop();
    touchY.current = y ?? null;
  }, [pushUpAtTop]);

  const cells = buildWeeks(range.start, range.weeks);

  // 붙이거나 버린 주가 바뀌면 그 범위를 호스트에 알린다 — 호스트는 같은 범위를 다시 받아도 아무것도 안 해야 한다
  const rangeFrom = formatIsoDate(range.start);
  const rangeTo = formatIsoDate(addDays(range.start, range.weeks * COL_COUNT - 1));
  useEffect(() => {
    onVisibleRangeChange?.({ fromDate: rangeFrom, toDate: rangeTo });
  }, [rangeFrom, rangeTo, onVisibleRangeChange]);


  return (
    <div className="tl-cal">
      <div className="tl-cal-header">
        {weekdayShortLabels().map((label) => (
          <div key={label} className="tl-cal-header-cell">
            {label}
          </div>
        ))}
      </div>
      {/* 줄 높이는 데이터(칸 높이)에서 온 값이라 인라인 변수로 넘긴다 */}
      <div
        className="tl-cal-grid" ref={gridRef} onScroll={handleScroll}
        onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}
        style={{ '--tl-cal-row': `${rowH}px` }}>
        {cells.map((d) => {
          const iso = formatIsoDate(d);
          const isToday = iso === (now ? formatIsoDate(now()) : TODAY_STR);
          // 주말 칸도 일정을 그대로 보인다(PW-1063). 예전엔 토·일 칸을 비워, 같은 일정이
          // 주 보기엔 있고 월 보기엔 없었다.
          const events = getEventsForDate(iso);
          const visible = events.slice(0, maxVisible);
          const moreCount = Math.max(0, events.length - maxVisible);
          // 1일은 "X월 Y일" 라벨, 나머지는 숫자
          const dayLabel =
            d.getDate() === 1
              ? formatMonthDay(d)
              : String(d.getDate());
          return (
            <div key={iso} className="tl-cal-cell">
              <div className="tl-cal-day-head">
                <span
                  className={`tl-cal-day-num ${isToday ? 'is-today' : ''}`}
                >
                  {dayLabel}
                </span>
              </div>
              {visible.length > 0 && (
                <div className="tl-cal-events">
                  {visible.map((ev) => {
                    const palette = SNIPPET_COLORS[ev.color] || SNIPPET_COLORS.gray;
                    return (
                      <div
                        key={ev.id}
                        className="tl-cal-event"
                        style={{
                          // CSS variable 로 hover bg 주입 — :hover 시 bgHover 로 전환
                          '--event-bg': palette.bg,
                          '--event-bg-hover': palette.bgHover,
                          borderColor: palette.border,
                            cursor: 'pointer',
                        }}
                        // 호버 카드(PW-1515) — 0.3초 대기·닫기는 호스트가 정한다. 칸 위치만 올린다.
                        onMouseEnter={(e) =>
                          onEventHover?.(ev, e.currentTarget.getBoundingClientRect())
                        }
                        onMouseLeave={() => onEventHoverEnd?.()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(ev, e.currentTarget.getBoundingClientRect());
                        }}
                      >
                        <span
                          className="tl-cal-event-time"
                          style={{ color: palette.timeText }}
                        >
                          {ev.time}
                        </span>
                        <span
                          className="tl-cal-event-title"
                          style={{ color: palette.titleText }}
                        >
                          {ev.title}
                        </span>
                      </div>
                    );
                  })}
                  {moreCount > 0 && (
                    <button
                      type="button"
                      className="tl-cal-more"
                      onClick={(e) => {
                        e.stopPropagation();
                        const cell = e.currentTarget.closest('.tl-cal-cell');
                        onMoreClick?.(
                          iso,
                          events,
                          cell.getBoundingClientRect(),
                        );
                      }}
                    >
                      +{moreCount} more...
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
