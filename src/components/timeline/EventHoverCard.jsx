import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import StatusBadge from '../shared/StatusBadge.jsx';
import { UsersGlyph } from '../shared/lineIcons.jsx';
import useTimelineData from './useTimelineData.js';

/**
 * EventHoverCard — 캘린더 보기에서 일정 칸 위에 마우스를 올리면 뜨는 요약 카드 (PW-1515,
 * 기획서 screen-timeline-feed §13.3).
 *
 * 디자이너 원본은 없다. 같은 정보를 보이는 일정 창(`MeetingModal`, 캘린더 보기 폭)의 칸을 그대로
 * 쓴다 — 색 태그+제목 줄, 시각 줄, 참석자 목록. 닫기 버튼 대신 빈 머리 띠를 두어 위 여백을 같게 한다.
 * 유형·«회의록 있음»은 같은 타임라인의 Weekly 화면에 디자이너가 그린 태그(Figma Tag · `.tl-weekly-entry-tag`) 모양이다. 마우스가 걸리지 않게 두어(카드 위로 마우스가 가도
 * 칸을 벗어난 것으로 본다) 기획서의 «마우스아웃 시 즉시 닫기»를 지킨다.
 *
 * 0.3초 대기·닫기는 호스트(`TimelineCanvas`)가 한다. 이 부품은 그리고 자리만 잡는다 —
 * 칸이 화면 오른쪽 절반이면 왼쪽에, 아니면 오른쪽에 붙고 위아래는 화면 안으로 접는다(일정 창과 같은 규칙).
 *
 * Props:
 *   event        { title, color(hex), timeRangeLabel, participants(멤버 id[]), typeLabel?, minutesLabel? }
 *                minutesLabel 이 있을 때만 «회의록 있음» 딱지를 그린다
 *   anchorRect   일정 칸의 getBoundingClientRect()
 *   attendeesLabel  참석자 줄 머리 문구 (예: 「참석자 3명」)
 */
export default function EventHoverCard({ event, anchorRect, attendeesLabel }) {
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
      className="tl-meeting-modal is-calendar tl-event-hover-card"
      style={{ left: pos.left, top: pos.top, opacity: pos.opacity }}
      role="tooltip"
      data-testid="calendar-event-hover-card"
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
                <StatusBadge className="tl-weekly-entry-tag" data-testid="calendar-event-hover-minutes">
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
