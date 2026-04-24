import { useLayoutEffect, useRef, useState } from 'react';
import {
  SNIPPET_COLORS,
  WEEKDAY_LABELS,
  TODAY_STR,
  formatIsoDate,
} from './constants.js';
import useTimelineData from './useTimelineData.js';

// 주말(일/토) 컬럼은 그대로 보여주되 이벤트만 비움.
const COL_COUNT = 7;
const ROW_COUNT = 6;

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
// 최소 1 — 2 로 두면 셀 높이가 부족한 화면(예: ~65px)에서 이벤트 2개 + "+N more"
// 공간이 cell(overflow:hidden) 을 넘어 more 링크가 잘린다. 1 이면 최소 1 이벤트 +
// more 가 보장되어 사용자가 숨은 이벤트 존재를 항상 확인 가능.
const MIN_VISIBLE = 1;

// 선택된 달의 첫 주 일요일부터 6주(42일) 분량의 Date 배열.
// 이전/다음 달 날짜까지 포함해서 그리드가 항상 7×6 으로 고정.
function buildMonthGrid(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0 = Sun
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - startWeekday);
  return Array.from(
    { length: ROW_COUNT * COL_COUNT },
    (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    }
  );
}

/**
 * CalendarMonthView — 캘린더 탭의 월별 그리드.
 *
 * - 7 column × 6 row + sticky 요일 header, 가로/세로 모두 1fr 로 fill
 * - 각 셀: day number(+ 1일은 "X월 Y일"), 이벤트 pill 최대 2개, "+N more..."
 * - 오늘 날짜는 녹색 원형 배경 하이라이트
 * - 현재 달이 아닌 날짜는 text-disabled 로 dim
 */
export default function CalendarMonthView({ selectedDate, onEventClick }) {
  const { getEventsForDate } = useTimelineData();
  const cells = buildMonthGrid(selectedDate);
  const currentMonth = selectedDate.getMonth();

  // 그리드 전체 높이를 측정해 각 셀(=grid/6)에 몇 개의 이벤트 pill 이
  // 들어갈 수 있는지 런타임에 계산. 창 높이가 늘어나면 3, 4 ... 로 증가.
  const gridRef = useRef(null);
  const [maxVisible, setMaxVisible] = useState(MIN_VISIBLE);
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const compute = () => {
      const cellH = grid.clientHeight / ROW_COUNT;
      const availForEvents = cellH - CELL_FIXED_H;
      const n = Math.floor((availForEvents - MORE_RESERVED) / EVENT_STEP);
      setMaxVisible((prev) => {
        const next = Math.max(MIN_VISIBLE, n);
        return prev === next ? prev : next;
      });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(grid);
    return () => ro.disconnect();
  }, []);


  return (
    <div className="tl-cal">
      <div className="tl-cal-header">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="tl-cal-header-cell">
            {label}
          </div>
        ))}
      </div>
      <div className="tl-cal-grid" ref={gridRef}>
        {cells.map((d, i) => {
          const iso = formatIsoDate(d);
          const isToday = iso === TODAY_STR;
          const isCurrentMonth = d.getMonth() === currentMonth;
          // 주말(일=0, 토=6) 컬럼은 그대로 렌더링하되 이벤트 내용은 비움.
          const dow = d.getDay();
          const isWeekend = dow === 0 || dow === 6;
          const events = isWeekend ? [] : getEventsForDate(iso);
          const visible = events.slice(0, maxVisible);
          const moreCount = Math.max(0, events.length - maxVisible);
          // 1일은 "X월 Y일" 라벨, 나머지는 숫자
          const dayLabel =
            d.getDate() === 1
              ? `${d.getMonth() + 1}월 ${d.getDate()}일`
              : String(d.getDate());
          return (
            <div
              key={i}
              className={`tl-cal-cell ${isCurrentMonth ? '' : 'is-outside'}`}
            >
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
                    <div className="tl-cal-more">+{moreCount} more...</div>
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
