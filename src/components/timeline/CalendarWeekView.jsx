import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  SNIPPET_COLORS,
  WEEKDAY_LABELS,
  formatIsoDate,
  getWeekDates,
  getTodayStr,
} from './constants.js';
import useTimelineData from './useTimelineData.js';

// 시간 그리드 레이아웃 상수.
const HOUR_H = 56;            // 1시간 행 높이(px)
const HOURS = 24;
const GRID_H = HOUR_H * HOURS; // 전체 그리드 높이 = 1344
const MIN_EVENT_H = 22;        // 아주 짧은 이벤트도 클릭 가능하도록 최소 높이
const LANE_GAP = 2;            // 같은 시간대 겹침 블록 사이 간격(px)
const GUTTER_W = 64;           // 좌측 시간 라벨 거터 폭(px) — 헤더 거터와 동일해야 컬럼 정렬
const DEFAULT_SCROLL_HOUR = 8; // 오늘이 아닌 주: 마운트 시 오전 8시로 스크롤

// 0~23 시 → "오전/오후 N시" 라벨.
function hourLabel(h) {
  if (h === 0) return '오전 12시';
  if (h < 12) return `오전 ${h}시`;
  if (h === 12) return '오후 12시';
  return `오후 ${h - 12}시`;
}

// 자정 기준 분 → 이벤트 시작 시각 라벨. 정시는 "오전 11시", 그 외는 "오전 11:30".
// (ev.time 은 시 단위로 반올림돼 있어 시간 그리드의 블록 위치와 어긋나므로
//  주간 뷰는 startMinutes 에서 분까지 정확히 표기한다.)
function eventTimeLabel(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${period} ${h12}시`
    : `${period} ${h12}:${String(m).padStart(2, '0')}`;
}

// 이벤트의 시작/종료 분을 안전하게 정규화. startMinutes/endMinutes 가 없으면
// (디자인 프리뷰용 mock 등) 오전 9시 1시간 블록으로 폴백.
function normalizeEvent(ev) {
  const start = Number.isFinite(ev.startMinutes) ? ev.startMinutes : 9 * 60;
  let end = Number.isFinite(ev.endMinutes) ? ev.endMinutes : start + 60;
  if (end <= start) end = start + 60;
  return { ...ev, _start: start, _end: Math.min(end, 24 * 60) };
}

// 한 날짜의 이벤트들을 겹침 cluster 로 묶고 lane(가로 분할 컬럼) 을 배정한다.
// 구글 캘린더처럼 겹치는 이벤트는 컬럼을 나눠 side-by-side 로 보여준다.
function assignLanes(events) {
  const sorted = [...events].sort(
    (a, b) => a._start - b._start || a._end - b._end,
  );
  const out = [];
  let cluster = [];
  let clusterMaxEnd = -Infinity;
  const flush = () => {
    // cluster 내 greedy lane 배정 — lanes[i] = 그 lane 마지막 이벤트의 종료분.
    const lanes = [];
    for (const ev of cluster) {
      let lane = lanes.findIndex((end) => end <= ev._start);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(ev._end);
      } else {
        lanes[lane] = ev._end;
      }
      ev._lane = lane;
    }
    for (const ev of cluster) ev._laneCount = lanes.length;
    out.push(...cluster);
  };
  for (const ev of sorted) {
    // 연속(9-10, 10-11)은 겹침이 아니므로 strict '<' 로 cluster 판정.
    if (cluster.length && ev._start < clusterMaxEnd) {
      cluster.push(ev);
      clusterMaxEnd = Math.max(clusterMaxEnd, ev._end);
    } else {
      if (cluster.length) flush();
      cluster = [ev];
      clusterMaxEnd = ev._end;
    }
  }
  if (cluster.length) flush();
  return out;
}

/**
 * CalendarWeekView — 캘린더 탭의 주간 시간 그리드 뷰.
 *
 * - 세로 시간축(0~23시) × 7일 컬럼. 구글 캘린더 주간 뷰와 동일한 레이아웃.
 * - 이벤트는 startMinutes/endMinutes 로 블록 top/height 를 잡고, 겹치면 lane 분할.
 * - 오늘 컬럼에 현재 시각 NOW 가로선.
 * - 헤더(요일+날짜)·이벤트 pill 스타일은 기존 design-page 토큰을 그대로 재사용.
 */
export default function CalendarWeekView({ selectedDate, onEventClick }) {
  const { getEventsForDate } = useTimelineData();
  const days = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const scrollRef = useRef(null);

  const todayStr = getTodayStr();
  const now = new Date();
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

  return (
    <div className="tl-week-cal">
      <div className="tl-week-cal-scroll" ref={scrollRef}>
        {/* sticky 헤더 — 스크롤 컨테이너 안에 두어 본문 컬럼과 폭이 정확히 정렬됨 */}
        <div className="tl-week-cal-header">
          <div className="tl-week-cal-gutter" style={{ width: GUTTER_W }} />
          {days.map((d) => {
            const iso = formatIsoDate(d);
            const isToday = iso === todayStr;
            return (
              <div key={iso} className="tl-week-cal-head-cell">
                <span className="tl-week-header-dow">
                  {WEEKDAY_LABELS[d.getDay()]}
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

        <div className="tl-week-cal-grid" style={{ height: GRID_H }}>
          {/* 좌측 시간 라벨 거터 */}
          <div className="tl-week-cal-hours" style={{ width: GUTTER_W }}>
            {Array.from({ length: HOURS }, (_, h) => (
              <div
                key={h}
                className="tl-week-cal-hour-label"
                style={{ height: HOUR_H }}
              >
                {h === 0 ? '' : hourLabel(h)}
              </div>
            ))}
          </div>

          {/* 7일 컬럼 */}
          {days.map((d) => {
            const iso = formatIsoDate(d);
            const isToday = iso === todayStr;
            const events = assignLanes(
              (getEventsForDate?.(iso) ?? []).map(normalizeEvent),
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
                  const palette = SNIPPET_COLORS[ev.color] || SNIPPET_COLORS.gray;
                  const top = (ev._start / 60) * HOUR_H;
                  const rawH = ((ev._end - ev._start) / 60) * HOUR_H;
                  const height = Math.min(
                    Math.max(rawH, MIN_EVENT_H),
                    GRID_H - top,
                  );
                  const widthPct = 100 / ev._laneCount;
                  return (
                    <div
                      key={ev.id}
                      className="tl-cal-event tl-week-cal-event"
                      style={{
                        top,
                        height,
                        left: `${ev._lane * widthPct}%`,
                        width: `calc(${widthPct}% - ${LANE_GAP}px)`,
                        '--event-bg': palette.bg,
                        '--event-bg-hover': palette.bgHover,
                        borderColor: palette.border,
                        cursor: 'pointer',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(
                          ev,
                          e.currentTarget.getBoundingClientRect(),
                        );
                      }}
                    >
                      <span
                        className="tl-cal-event-time"
                        style={{ color: palette.timeText }}
                      >
                        {eventTimeLabel(ev._start)}
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
