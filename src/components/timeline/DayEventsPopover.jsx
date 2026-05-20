import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SNIPPET_COLORS, WEEKDAY_LABELS } from './constants.js';

const parseIsoDate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * DayEventsPopover — 캘린더 월 그리드 셀의 "+N more" 를 클릭했을 때 뜨는
 * 일별 이벤트 전체 목록 팝오버. 구글 캘린더 "더보기" 팝업과 동일한 역할.
 *
 * - 클릭된 날짜 셀의 DOMRect(anchorRect)에 가로 중앙 정렬해 겹쳐 띄우고,
 *   뷰포트 밖으로 나가지 않도록 clamp.
 * - 헤더: 요일 라벨 + 날짜 숫자 + 닫기 버튼.
 * - 본문: 해당 날짜의 모든 이벤트를 .tl-cal-event pill 로 나열 (월 그리드와 동일 스타일).
 * - 이벤트 클릭 시 onEventClick 으로 위임 — 상위에서 미팅 모달을 연다.
 * - ESC / 바깥 클릭으로 닫힘.
 */
export default function DayEventsPopover({
  dateIso,
  events = [],
  anchorRect,
  onClose,
  onEventClick,
}) {
  const popoverRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, opacity: 0 });

  // 팝오버가 마운트되어 실제 크기를 알 수 있게 된 뒤 위치를 계산한다.
  useLayoutEffect(() => {
    const el = popoverRef.current;
    if (!el || !anchorRect) return;
    const m = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MARGIN = 8;

    // 클릭한 셀의 가로 중앙에 팝오버 중앙을 맞춘다.
    const anchorCenterX = (anchorRect.left + anchorRect.right) / 2;
    let left = anchorCenterX - m.width / 2;
    left = Math.max(MARGIN, Math.min(left, vw - m.width - MARGIN));

    // 셀 상단에 살짝 겹치게 띄우고, 아래로 넘치면 위로 끌어올린다.
    let top = anchorRect.top - 4;
    if (top + m.height > vh - MARGIN) top = vh - m.height - MARGIN;
    top = Math.max(MARGIN, top);

    setPos({ left, top, opacity: 1 });
  }, [anchorRect]);

  // ESC 로 닫기
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const d = parseIsoDate(dateIso);
  const weekday = WEEKDAY_LABELS[d.getDay()];

  // Portal 로 body 에 렌더 — content-area(position:fixed)의 stacking context
  // 에서 탈출해 사이드바/탑네비 위로 올라오도록.
  return createPortal(
    <div className="tl-day-popover-overlay" onClick={onClose}>
      <div
        ref={popoverRef}
        className="tl-day-popover"
        style={{ left: pos.left, top: pos.top, opacity: pos.opacity }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일 일정`}
      >
        <div className="tl-day-popover-header">
          <div className="tl-day-popover-date">
            <span className="tl-day-popover-weekday">{weekday}</span>
            <span className="tl-day-popover-daynum">{d.getDate()}</span>
          </div>
          <button
            type="button"
            className="tl-day-popover-close"
            onClick={onClose}
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="var(--colors-foreground-fgPrimary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="tl-day-popover-events">
          {events.map((ev) => {
            const palette = SNIPPET_COLORS[ev.color] || SNIPPET_COLORS.gray;
            return (
              <div
                key={ev.id}
                className="tl-cal-event"
                style={{
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
        </div>
      </div>
    </div>,
    document.body,
  );
}
