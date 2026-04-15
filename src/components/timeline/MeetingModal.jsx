import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import useTimelineData from './useTimelineData.js';

/**
 * MeetingModal — popover-style modal that opens when a meeting block is
 * clicked. Position is computed relative to the clicked block's bounding
 * rect: if the block sits in the right half of the viewport, the modal is
 * placed to its LEFT; otherwise it's placed to its RIGHT. Vertical center
 * is anchored to the block, then clamped to keep the modal in view.
 */
export default function MeetingModal({ meeting, anchorRect, onClose }) {
  const { members } = useTimelineData();
  const modalRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, opacity: 0 });

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
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!meeting) return null;

  // Resolve participants from member ids
  const participants = (meeting.participants || [])
    .map((pid) => members.find((m) => m.id === pid))
    .filter(Boolean);

  return (
    <div className="tl-meeting-modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="tl-meeting-modal"
        style={{ left: pos.left, top: pos.top, opacity: pos.opacity }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="tl-meeting-modal-title"
      >
        {/* Header (close button) */}
        <div className="tl-meeting-modal-header">
          <button
            type="button"
            className="tl-meeting-modal-close"
            onClick={onClose}
            aria-label="닫기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
                <span>참석자 {participants.length}명</span>
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
                        <span className="tl-meeting-modal-attendee-role">주최자</span>
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
    </div>
  );
}
