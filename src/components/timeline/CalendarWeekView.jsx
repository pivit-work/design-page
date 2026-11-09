import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  SNIPPET_COLORS,
  formatIsoDate,
  getWeekDates,
  getTodayStr,
} from './constants.js';
import useTimelineData from './useTimelineData.js';
import { layoutDayEvents } from './weekEventLayout.js';
import {
  formatWeekdayShort,
  formatHour12,
  formatMinutesOfDay,
  useTimelineLabels,
} from './timelineLabels.js';
import { layoutAllDayWeek } from './allDayLayout.js';

// 시간 그리드 레이아웃 상수.
const HOUR_H = 56;            // 1시간 행 높이(px)
const HOURS = 24;
const GRID_H = HOUR_H * HOURS; // 전체 그리드 높이 = 1344
const MIN_EVENT_H = 22;        // 아주 짧은 이벤트도 클릭 가능하도록 최소 높이
const GUTTER_W = 64;           // 좌측 시간 라벨 거터 폭(px) — 헤더 거터와 동일해야 컬럼 정렬
const DEFAULT_SCROLL_HOUR = 8; // 오늘이 아닌 주: 마운트 시 오전 8시로 스크롤
// «종일» 줄에 보이는 막대 줄 수 — 넘치면 그 요일에 «+N» (pivit-work PW-2462). 디자이너 그림 전 임시 값.
const ALL_DAY_MAX_LANES = 2;

// 이벤트의 시작/종료 분을 안전하게 정규화. startMinutes/endMinutes 가 없으면
// (디자인 프리뷰용 mock 등) 오전 9시 1시간 블록으로 폴백.
function normalizeEvent(ev) {
  const start = Number.isFinite(ev.startMinutes) ? ev.startMinutes : 9 * 60;
  let end = Number.isFinite(ev.endMinutes) ? ev.endMinutes : start + 60;
  if (end <= start) end = start + 60;
  return { ...ev, _start: start, _end: Math.min(end, 24 * 60) };
}

/**
 * CalendarWeekView — 캘린더 탭의 주간 시간 그리드 뷰.
 *
 * - 세로 시간축(0~23시) × 7일 컬럼. 구글 캘린더 주간 뷰와 동일한 레이아웃.
 * - 이벤트는 startMinutes/endMinutes 로 블록 top/height 를 잡고, 겹치면 weekEventLayout 규칙으로 나누거나 얹는다.
 * - 나란히 놓을 일정이 넘치면 «+N» 을 두고, 누르면 onMoreClick(iso, events, rect) — 월 보기와 같다.
 * - 오늘 컬럼에 현재 시각 NOW 가로선.
 * - 헤더(요일+날짜)·이벤트 pill 스타일은 기존 design-page 토큰을 그대로 재사용.
 */
// now — 「지금」을 로컬 Date 그릇으로 돌려주는 함수. 없으면 브라우저 시계 (PW-781).
export default function CalendarWeekView({
  selectedDate,
  onEventClick,
  onMoreClick,
  now: nowProp,
  onEventHover,
  onEventHoverEnd,
  // 보이는 주가 바뀔 때마다 { fromDate, toDate }('YYYY-MM-DD') — 호스트가 그 범위의 일정을 받아 오게 한다
  onVisibleRangeChange,
}) {
  const { getEventsForDate } = useTimelineData();
  const L = useTimelineLabels();
  const days = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const weekFrom = formatIsoDate(days[0]);
  const weekTo = formatIsoDate(days[days.length - 1]);
  useEffect(() => {
    onVisibleRangeChange?.({ fromDate: weekFrom, toDate: weekTo });
  }, [weekFrom, weekTo, onVisibleRangeChange]);
  const scrollRef = useRef(null);

  const now = nowProp ? nowProp() : new Date();
  const todayStr = nowProp ? formatIsoDate(now) : getTodayStr();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // 마운트/주 변경 시 스크롤 위치 — 오늘이 포함된 주면 현재 시각 중앙, 아니면 오전 8시.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const weekHasToday = days.some((d) => formatIsoDate(d) === todayStr);
    const target = weekHasToday
      ? (nowMinutes / 60) * HOUR_H - el.clientHeight / 2
      : DEFAULT_SCROLL_HOUR * HOUR_H;
    el.scrollTop = Math.max(0, Math.min(target, GRID_H - el.clientHeight));
  }, [days, todayStr, nowMinutes]);

  // «종일» 줄 — 걸친 요일 칸을 잇는 막대 하나씩. 칸 나눔은 CSS 격자(7칸)가 맡아 시간 격자의 요일 칸과 폭이 같다.
  function renderAllDayRow() {
    const isos = days.map(formatIsoDate);
    const { bars, byCol } = layoutAllDayWeek(isos, getEventsForDate);
    const shown = bars.filter((b) => b.lane < ALL_DAY_MAX_LANES);
    const hiddenByCol = byCol.map((list) => list.filter((b) => b.lane >= ALL_DAY_MAX_LANES).length);
    const hasMore = hiddenByCol.some((n) => n > 0);
    // 빈 주도 줄 하나 높이를 둔다 — 정책서 §13.9 G «주 보기는 «종일» 줄을 비워 둔다»
    const laneRows = Math.max(1, Math.min(ALL_DAY_MAX_LANES, bars.reduce((m, b) => Math.max(m, b.lane + 1), 0)));
    const rows = laneRows + (hasMore ? 1 : 0);
    return (
      <div className="tl-week-cal-allday">
        <div className="tl-week-cal-gutter tl-week-cal-allday-label" style={{ width: GUTTER_W }}>
          {L.allDay}
        </div>
        <div className="tl-week-cal-allday-days">
          {isos.map((iso, c) => (
            <div
              key={`col-${iso}`}
              className="tl-week-cal-allday-col"
              style={{ gridColumn: c + 1, gridRow: `1 / span ${rows}` }}
            />
          ))}
          {shown.length === 0 && (
            <div className="tl-cal-event tl-cal-allday-spacer" style={{ gridColumn: 1, gridRow: 1 }} aria-hidden="true">
              <span className="tl-cal-event-title">&nbsp;</span>
            </div>
          )}
          {shown.map((bar) => {
            const ev = bar.ev;
            const palette = SNIPPET_COLORS[ev.color] || SNIPPET_COLORS.gray;
            return (
              <div
                key={ev.id}
                className={`tl-cal-event tl-week-cal-allday-bar${bar.cutLeft ? ' is-cut-left' : ''}${bar.cutRight ? ' is-cut-right' : ''}`}
                style={{
                  gridColumn: `${bar.startCol + 1} / ${bar.endCol + 2}`,
                  gridRow: bar.lane + 1,
                  '--event-bg': palette.bg,
                  '--event-bg-hover': palette.bgHover,
                  borderColor: palette.border,
                  cursor: ev.noOpen ? 'default' : 'pointer',
                }}
                onMouseEnter={(e) => onEventHover?.(ev, e.currentTarget.getBoundingClientRect())}
                onMouseLeave={() => onEventHoverEnd?.()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!ev.noOpen) onEventClick?.(ev, e.currentTarget.getBoundingClientRect());
                }}
              >
                <span className="tl-cal-event-title" style={{ color: palette.titleText }}>
                  {ev.title}
                </span>
              </div>
            );
          })}
          {hiddenByCol.map((n, c) =>
            n > 0 ? (
              <button
                key={`more-${isos[c]}`}
                type="button"
                className="tl-cal-more"
                style={{ gridColumn: c + 1, gridRow: laneRows + 1 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoreClick?.(isos[c], getEventsForDate?.(isos[c]) ?? [], e.currentTarget.getBoundingClientRect());
                }}
              >
                +{n}
              </button>
            ) : null,
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="tl-week-cal">
      <div className="tl-week-cal-scroll" ref={scrollRef}>
        {/* 머리줄과 «종일» 줄을 함께 위에 붙여 둔다 — 시간 격자를 넘겨도 그 자리에 있다 (PW-2462 · 정책서 §13.9 A) */}
        <div className="tl-week-cal-top">
        {/* sticky 헤더 — 스크롤 컨테이너 안에 두어 본문 컬럼과 폭이 정확히 정렬됨 */}
        <div className="tl-week-cal-header">
          <div className="tl-week-cal-gutter" style={{ width: GUTTER_W }} />
          {days.map((d) => {
            const iso = formatIsoDate(d);
            const isToday = iso === todayStr;
            return (
              <div key={iso} className="tl-week-cal-head-cell">
                <span className="tl-week-header-dow">
                  {formatWeekdayShort(d)}
                </span>
                <span
                  className={`tl-week-header-date ${isToday ? 'is-today' : ''}`}
                >
                  {d.getDate()}
                </span>
              </div>
            );
          })}
        </div>
        {renderAllDayRow()}
        </div>

        <div className="tl-week-cal-grid" style={{ height: GRID_H }}>
          {/* 좌측 시간 라벨 거터 */}
          <div className="tl-week-cal-hours" style={{ width: GUTTER_W }}>
            {Array.from({ length: HOURS }, (_, h) => (
              <div
                key={h}
                className="tl-week-cal-hour-label"
                style={{ height: HOUR_H }}
              >
                {h === 0 ? '' : formatHour12(h)}
              </div>
            ))}
          </div>

          {/* 7일 컬럼 */}
          {days.map((d) => {
            const iso = formatIsoDate(d);
            const isToday = iso === todayStr;
            const dayEvents = getEventsForDate?.(iso) ?? [];
            // 종일 일정은 위 «종일» 줄에만 — 시간 격자에는 시각 있는 일정만 놓는다 (PW-2462)
            const events = layoutDayEvents(
              dayEvents.filter((ev) => !ev.allDay).map(normalizeEvent),
            );
            return (
              <div key={iso} className="tl-week-cal-day-col">
                {/* 시간 구분선 배경 */}
                {Array.from({ length: HOURS }, (_, h) => (
                  <div
                    key={h}
                    className="tl-week-cal-hour-line"
                    style={{ height: HOUR_H }}
                  />
                ))}

                {/* 이벤트 블록 */}
                {events.map((ev) => {
                  // 넘친 줄의 «+N» — 월 보기와 같이 그날 전체 일정을 날짜별 일정 창으로 연다.
                  if (ev._more) {
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        className="tl-cal-more tl-week-cal-more"
                        style={{
                          top: (ev._start / 60) * HOUR_H,
                          left: ev._left,
                          width: ev._width,
                          zIndex: ev._z,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoreClick?.(
                            iso,
                            dayEvents,
                            e.currentTarget.getBoundingClientRect(),
                          );
                        }}
                      >
                        +{ev._hidden.length}
                      </button>
                    );
                  }
                  const palette = SNIPPET_COLORS[ev.color] || SNIPPET_COLORS.gray;
                  const top = (ev._start / 60) * HOUR_H;
                  const rawH = ((ev._end - ev._start) / 60) * HOUR_H;
                  const height = Math.min(
                    Math.max(rawH, MIN_EVENT_H),
                    GRID_H - top,
                  );
                  return (
                    <div
                      key={ev.id}
                      className={`tl-cal-event tl-week-cal-event${ev._overlapped ? ' tl-week-cal-event--overlap' : ''}`}
                      style={{
                        top,
                        height,
                        left: ev._left,
                        width: ev._width,
                        zIndex: ev._z,
                        '--event-bg': palette.bg,
                        '--event-bg-hover': palette.bgHover,
                        borderColor: palette.border,
                        cursor: ev.noOpen ? 'default' : 'pointer',
                      }}
                      // 호버 카드(PW-1515) — 0.3초 대기·닫기는 호스트가 정한다. 칸 위치만 올린다.
                      onMouseEnter={(e) =>
                        onEventHover?.(ev, e.currentTarget.getBoundingClientRect())
                      }
                      onMouseLeave={() => onEventHoverEnd?.()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!ev.noOpen) onEventClick?.(
                          ev,
                          e.currentTarget.getBoundingClientRect(),
                        );
                      }}
                    >
                      <span
                        className="tl-cal-event-time"
                        style={{ color: palette.timeText }}
                      >
                        {formatMinutesOfDay(ev._start)}
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

                {/* NOW 가로선 — 오늘 컬럼에만 */}
                {isToday && (
                  <div
                    className="tl-now-line tl-week-cal-now"
                    style={{ top: (nowMinutes / 60) * HOUR_H }}
                  >
                    <span className="tl-now-label">NOW</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
