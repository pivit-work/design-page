import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import StatusBadge from '../shared/StatusBadge.jsx';
import { isEnterKey } from '../shared/enterKey.js';
import { UsersGlyph } from '../shared/lineIcons.jsx';
import useTimelineData from './useTimelineData.js';

/**
 * EventHoverCard — 캘린더 보기에서 일정 칸 위에 마우스를 올리면 뜨는 요약 카드 (PW-1515,
 * 기획서 screen-timeline-feed §13.3).
 *
 * 디자이너 원본은 없다. 같은 정보를 보이는 일정 창(`MeetingModal`, 캘린더 보기 폭)의 칸을 그대로
 * 쓴다 — 색 태그+제목 줄, 시각 줄, 참석자 목록. 닫기 버튼 대신 빈 머리 띠를 두어 위 여백을 같게 한다.
 * 유형·«회의록 있음»은 같은 타임라인의 Weekly 화면에 디자이너가 그린 태그(Figma Tag · `.tl-weekly-entry-tag`) 모양이다. 마우스가 걸리지 않게 두어(카드 위로 마우스가 가도
 * 칸을 벗어난 것으로 본다) 기획서의 «마우스아웃 시 즉시 닫기»를 지킨다 — 회의록 링크가 있는 카드(interactive)만 예외다(§13.3-A).
 *
 * 0.3초 대기·닫기는 호스트(`TimelineCanvas`)가 한다. 이 부품은 그리고 자리만 잡는다 —
 * 칸이 화면 오른쪽 절반이면 왼쪽에, 아니면 오른쪽에 붙고 위아래는 화면 안으로 접는다(일정 창과 같은 규칙).
 *
 * Props:
 *   event        { title, color(hex), timeRangeLabel, participants(멤버 id[]), typeLabel?, minutesLabel?,
 *                  roomHoverLabel?, roomGone?, recurrenceLabel? } — 회의실 이름 · 반복 줄(pivit-work PW-2637)
 *                minutesLabel 이 있을 때만 «회의록 있음» 딱지를 그린다
 *   anchorRect   일정 칸의 getBoundingClientRect()
 *   attendeesLabel  참석자 줄 머리 문구 (예: 「참석자 3명」)
 *   aboveDayPopover 날짜 일정 목록 창(DayEventsPopover)이 떠 있을 때 true — 그 창의 막보다 위 층에 뜬다(pivit-work PW-2888)
 *   interactive  회의록 링크가 있는 카드면 true — 카드가 마우스를 받고 «회의록 있음» 딱지가 링크가 된다(pivit-work PW-3210 ·
 *                기획서 §13.3-A). 모양은 그대로다. 남아 있는 시간·닫기는 호스트가 onMouseEnter·onMouseLeave 로 정한다.
 *                카드의 다른 자리를 눌러도 아무 일이 없다 — 누름이 뒤의 칸·«+N more» 목록 막으로 가지 않는다.
 *   onMinutesOpen  interactive 일 때 «회의록 있음»을 누르면
 */
export default function EventHoverCard({
  event,
  anchorRect,
  attendeesLabel,
  aboveDayPopover = false,
  interactive = false,
  onMinutesOpen,
  onMouseEnter,
  onMouseLeave,
}) {
  const { members } = useTimelineData();
  const cardRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, opacity: 0 });

  useLayoutEffect(() => {
    if (!cardRef.current || !anchorRect) return;
    const m = cardRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 16;
    const VERT_MARGIN = 40;
    const HORIZ_MARGIN = 8;
    const placeOnLeft = (anchorRect.left + anchorRect.right) / 2 > vw / 2;
    let left = placeOnLeft ? anchorRect.left - m.width - gap : anchorRect.right + gap;
    left = Math.max(HORIZ_MARGIN, Math.min(left, vw - m.width - HORIZ_MARGIN));
    let top = (anchorRect.top + anchorRect.bottom) / 2 - m.height / 2;
    top = Math.max(VERT_MARGIN, Math.min(top, vh - m.height - VERT_MARGIN));
    setPos({ left, top, opacity: 1 });
  }, [anchorRect]);

  if (!event) return null;

  const participants = (event.participants || [])
    .map((pid) => members.find((m) => m.id === pid))
    .filter(Boolean);

  return createPortal(
    <div
      ref={cardRef}
      className={`tl-meeting-modal is-calendar tl-event-hover-card${aboveDayPopover ? ' is-above-day-popover' : ''}${
        interactive ? ' is-interactive' : ''
      }`}
      style={{ left: pos.left, top: pos.top, opacity: pos.opacity }}
      role="tooltip"
      data-testid="calendar-event-hover-card"
      {...(interactive
        ? {
            onMouseEnter,
            onMouseLeave,
            onClick: (e) => e.stopPropagation(),
            onMouseDown: (e) => e.stopPropagation(),
          }
        : {})}
    >
      <div className="tl-meeting-modal-header" />
      <div className="tl-meeting-modal-body">
        <div className="tl-meeting-modal-title-wrap">
          {(event.typeLabel || event.minutesLabel) && (
            <div className="tl-meeting-modal-title-row">
              {event.typeLabel && (
                <StatusBadge className="tl-weekly-entry-tag">{event.typeLabel}</StatusBadge>
              )}
              {event.minutesLabel && (
                <StatusBadge
                  className={`tl-weekly-entry-tag${interactive ? ' tl-event-hover-minutes-link' : ''}`}
                  data-testid="calendar-event-hover-minutes"
                  {...(interactive
                    ? {
                        role: 'link',
                        tabIndex: 0,
                        onClick: (e) => {
                          e.stopPropagation();
                          onMinutesOpen?.();
                        },
                        onKeyDown: (e) => {
                          if (isEnterKey(e)) {
                            e.preventDefault();
                            onMinutesOpen?.();
                          }
                        },
                      }
                    : {})}
                >
                  {event.minutesLabel}
                </StatusBadge>
              )}
            </div>
          )}
          <div className="tl-meeting-modal-title-row">
            <div
              className="tl-meeting-modal-color-tag"
              style={{ background: event.color || '#15b79e' }}
            />
            <h2 className="tl-meeting-modal-title">{event.title}</h2>
          </div>
          <div className="tl-meeting-modal-time">
            <p>{event.timeRangeLabel}</p>
            {/* 회의실(이름만) · 반복 — 시각 줄 아래 (pivit-work PW-2637 · 정책서 §7.6 B · §7.8 C) */}
            {event.roomHoverLabel && (
              <p className={event.roomGone ? 'tl-meeting-modal-room is-gone' : 'tl-meeting-modal-room'} data-testid="calendar-event-hover-room">
                {event.roomHoverLabel}
              </p>
            )}
            {event.recurrenceLabel && <p data-testid="calendar-event-hover-repeat">{event.recurrenceLabel}</p>}
          </div>
        </div>

        {participants.length > 0 && (
          <div className="tl-meeting-modal-sections">
            <section className="tl-meeting-modal-section">
              <div className="tl-meeting-modal-section-header">
                <UsersGlyph size={20} color="var(--colors-text-textSecondary)" />
                <span>{attendeesLabel}</span>
              </div>
              <ul className="tl-meeting-modal-attendees">
                {participants.map((p) => (
                  <li key={p.id} className="tl-meeting-modal-attendee">
                    <div className="tl-meeting-modal-avatar">
                      <img src={p.photo} alt={p.name} />
                    </div>
                    <div className="tl-meeting-modal-attendee-text">
                      <span className="tl-meeting-modal-attendee-name">{p.name}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
