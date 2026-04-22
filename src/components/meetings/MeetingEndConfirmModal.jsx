import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';

/**
 * MeetingEndConfirmModal — 회의 종료 확인 alert.
 *
 * Figma node-id=16708-28310. 400 max, "회의 종료하기" 타이틀 + desc + 취소/종료 버튼.
 * Spring scale-up 등장 (back.out).
 */
export default function MeetingEndConfirmModal({ onCancel, onConfirm, labels }) {
  const modalRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' }
      );
    }
    if (overlayRef.current) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.2, ease: 'power2.out' }
      );
    }
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return createPortal(
    <div className="mtg-end-confirm-overlay" ref={overlayRef} onClick={onCancel}>
      <div
        className="mtg-end-confirm-modal"
        ref={modalRef}
        role="dialog"
        aria-labelledby="mtg-end-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="mtg-end-confirm-close"
          aria-label={labels.close}
          onClick={onCancel}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="var(--colors-foreground-fgQuaternary, #98a1b2)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="mtg-end-confirm-header">
          <p id="mtg-end-confirm-title" className="mtg-end-confirm-title">{labels.title}</p>
          <p className="mtg-end-confirm-desc">
            {labels.descLine1}<br />
            {labels.descLine2}
          </p>
        </div>

        <div className="mtg-end-confirm-actions">
          <button
            type="button"
            className="mtg-end-confirm-btn mtg-end-confirm-btn-cancel"
            onClick={onCancel}
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            className="mtg-end-confirm-btn mtg-end-confirm-btn-danger"
            onClick={onConfirm}
          >
            {labels.confirm}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
