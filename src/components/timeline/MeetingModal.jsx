import { useLayoutEffect, useRef, useState } from 'react';
import ModalLayer from '../shared/ModalLayer.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';
import { CloseGlyph, MoreGlyph, PencilGlyph, TrashGlyph } from '../shared/lineIcons.jsx';
import useTimelineData from './useTimelineData.js';
import { useTimelineLabels } from './timelineLabels.js';

/**
 * MeetingModal — popover-style modal that opens when a meeting block is
 * clicked. Position is computed relative to the clicked block's bounding
 * rect: if the block sits in the right half of the viewport, the modal is
 * placed to its LEFT; otherwise it's placed to its RIGHT. Vertical center
 * is anchored to the block, then clamped to keep the modal in view.
 *
 * 「···」 더보기 (PW-1515, 기획서 screen-timeline-feed §13.4 · timeline-feed-view-spec §14-A):
 * `onEdit`·`onDelete` 를 주면 닫기 버튼 왼쪽에 같은 모양의 「···」 버튼이 생기고, 누르면
 * 「수정」·「삭제」 메뉴가 뜬다. 누가 고칠 수 있는지는 호스트가 정한다 — 못 고치는 일정이면
 * 두 콜백을 넘기지 않는다. 메뉴의 면·항목은 같은 타임라인의 셀 피커 메뉴(`.tl-cell-picker*`)이고,
 * 그 모양은 디자이너 필터 메뉴(`.tl-filter-menu`)다.
 * `actionLabels` = { more, edit, delete } (없으면 한국어 기본값).
 */
export default function MeetingModal({
  meeting,
  anchorRect,
  onClose,
  variant,
  onEdit,
  onDelete,
  actionLabels,
}) {
  const { members } = useTimelineData();
  const modalRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, opacity: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const hasActions = !!(onEdit || onDelete);
  const words = useTimelineLabels();
  const L = { more: '더보기', edit: '수정', delete: '삭제', ...actionLabels };
  // 메뉴 바깥(창 안의 다른 곳)을 누르거나 Esc 면 메뉴만 닫는다 — 창은 남는다.
  useDismissLayer(() => setMenuOpen(false), menuRef, '.tl-meeting-modal-more', menuOpen);

  // Compute position after the modal is mounted so we know its real size.
  useLayoutEffect(() => {
    if (!modalRef.current || !anchorRect) return;
    const m = modalRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 16;
    // Mandatory viewport margins. The modal must stay >= 40 px from the top
    // and >= 40 px from the bottom of the viewport, even if that means it no
    // longer vertically centers on the meeting block.
    const VERT_MARGIN = 40;
    const HORIZ_MARGIN = 8;

    const anchorCenterX = (anchorRect.left + anchorRect.right) / 2;
    const placeOnLeft = anchorCenterX > vw / 2;

    let left = placeOnLeft
      ? anchorRect.left - m.width - gap
      : anchorRect.right + gap;
    left = Math.max(
      HORIZ_MARGIN,
      Math.min(left, vw - m.width - HORIZ_MARGIN)
    );

    const anchorCenterY = (anchorRect.top + anchorRect.bottom) / 2;
    let top = anchorCenterY - m.height / 2;
    top = Math.max(
      VERT_MARGIN,
      Math.min(top, vh - m.height - VERT_MARGIN)
    );

    setPos({ left, top, opacity: 1 });
  }, [anchorRect]);

  // Close on Escape
  if (!meeting) return null;

  // Resolve participants from member ids
  const participants = (meeting.participants || [])
    .map((pid) => members.find((m) => m.id === pid))
    .filter(Boolean);

  // Portal 로 body 에 렌더 — content-area(position:fixed)의 stacking context
  // 에서 탈출해서 사이드바/탑네비 등 모든 상위 요소를 덮도록.
  // 막·Esc·바깥 누르기는 공용 창 바탕(`ModalLayer`)이 갖는다(PW-1013). 누른 블록 옆에 붙어 뜨는
  // 창이라 막은 투명하게 둔다(`is-clear`) — 생김새는 그대로, 닫히는 동작만 다른 창과 같다.
  return (
    <ModalLayer onClose={onClose} className="is-clear">
      <div
        ref={modalRef}
        className={`tl-meeting-modal ${variant === 'calendar' ? 'is-calendar' : ''}`}
        style={{ left: pos.left, top: pos.top, opacity: pos.opacity }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="tl-meeting-modal-title"
      >
        {/* Header (close button) */}
        <div className="tl-meeting-modal-header">
          {hasActions && (
            <button
              type="button"
              className="tl-meeting-modal-close tl-meeting-modal-more"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={L.more}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              data-testid="meeting-modal-more"
            >
              <MoreGlyph size={24} color="var(--colors-foreground-fgPrimary)" />
            </button>
          )}
          {hasActions && menuOpen && (
            <div ref={menuRef} className="tl-cell-picker tl-meeting-modal-menu" role="menu">
              {onEdit && (
                <button
                  type="button"
                  className="tl-cell-picker-item"
                  role="menuitem"
                  data-testid="meeting-modal-edit"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(meeting);
                  }}
                >
                  <span className="tl-cell-picker-ico">
                    <PencilGlyph size={16} color="var(--colors-foreground-fgSecondary)" />
                  </span>
                  <span className="tl-cell-picker-body">
                    <span className="tl-cell-picker-title">{L.edit}</span>
                  </span>
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="tl-cell-picker-item"
                  role="menuitem"
                  data-testid="meeting-modal-delete"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(meeting);
                  }}
                >
                  <span className="tl-cell-picker-ico">
                    <TrashGlyph size={16} color="var(--colors-foreground-fgSecondary)" />
                  </span>
                  <span className="tl-cell-picker-body">
                    <span className="tl-cell-picker-title">{L.delete}</span>
                  </span>
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            className="tl-meeting-modal-close"
            onClick={onClose}
            aria-label={words.close}
          >
            <CloseGlyph size={24} color="var(--colors-foreground-fgPrimary)" />
          </button>
        </div>

        {/* Body */}
        <div className="tl-meeting-modal-body">
          {/* Title block */}
          <div className="tl-meeting-modal-title-wrap">
            <div className="tl-meeting-modal-title-row">
              <div
                className="tl-meeting-modal-color-tag"
                style={{ background: meeting.color || '#15b79e' }}
              />
              <h2 id="tl-meeting-modal-title" className="tl-meeting-modal-title">
                {meeting.title}
              </h2>
            </div>
            <div className="tl-meeting-modal-time">
              <p>{meeting.timeLabel}</p>
              {meeting.repeatLabel && <p>{meeting.repeatLabel}</p>}
            </div>
          </div>

          {/* Attendees + notification group */}
          <div className="tl-meeting-modal-sections">
            <section className="tl-meeting-modal-section">
              <div className="tl-meeting-modal-section-header">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M13.333 17.5v-1.667a3.333 3.333 0 0 0-3.333-3.333H5a3.333 3.333 0 0 0-3.333 3.333V17.5M14.167 9.167l1.666 1.666 3.334-3.333M11.25 5.833a3.333 3.333 0 1 1-6.667 0 3.333 3.333 0 0 1 6.667 0z"
                    stroke="var(--colors-text-textSecondary)"
                    strokeWidth="1.67"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{L.attendees ? L.attendees(participants.length) : `참석자 ${participants.length}명`}</span>
              </div>
              <ul className="tl-meeting-modal-attendees">
                {participants.map((p) => (
                  <li key={p.id} className="tl-meeting-modal-attendee">
                    <div className="tl-meeting-modal-avatar">
                      <img src={p.photo} alt={p.name} />
                    </div>
                    <div className="tl-meeting-modal-attendee-text">
                      <span className="tl-meeting-modal-attendee-name">{p.name}</span>
                      {meeting.organizer === p.id && (
                        <span className="tl-meeting-modal-attendee-role">{words.organizer}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {meeting.notification && (
              <section className="tl-meeting-modal-section">
                <div className="tl-meeting-modal-section-header">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M5.833 6.667a4.167 4.167 0 0 1 8.334 0c0 2.341.591 3.943 1.252 4.961.557.859.835 1.288.825 1.408-.012.133-.04.184-.147.264-.097.072-.532.072-1.402.072H4.305c-.87 0-1.305 0-1.402-.072-.107-.08-.135-.131-.147-.264-.01-.12.268-.55.825-1.408.661-1.018 1.252-2.62 1.252-4.961zM7.5 16.667a2.5 2.5 0 0 0 5 0"
                      stroke="var(--colors-text-textSecondary)"
                      strokeWidth="1.67"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{meeting.notification}</span>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </ModalLayer>
  );
}
