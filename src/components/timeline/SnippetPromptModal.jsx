import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';

/**
 * SnippetPromptModal — 타임라인 진입 시 자동으로 뜨는 스니핏 작성 유도 모달.
 *
 * 모션: 등장 시 scale 0.9 → 1 + opacity 0 → 1 (back.out spring 이징).
 */
export default function SnippetPromptModal({ onCancel, onConfirm }) {
  const modalRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
      );
    }
    if (overlayRef.current) {
      gsap.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: 'power2.out' }
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

  // Portal 로 body 에 렌더 — tl-page 의 stacking context 에서 탈출해서
  // 사이드바/탑네비 등 모든 상위 요소를 덮도록.
  return createPortal(
    <div className="tl-snippet-prompt-overlay" ref={overlayRef} onClick={onCancel}>
      <div
        className="tl-snippet-prompt-modal"
        ref={modalRef}
        role="dialog"
        aria-labelledby="tl-snippet-prompt-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="tl-snippet-prompt-close"
          aria-label="닫기"
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

        <div className="tl-snippet-prompt-header">
          <p id="tl-snippet-prompt-title" className="tl-snippet-prompt-title">
            슬슬 스니핏 작성할 시간이에요
          </p>
          <p className="tl-snippet-prompt-desc">
            미리미리 작성하는 습관을 가지시면 중요한 업무를 빠트리지 않게 되요.
            지금 작성하시면 너무 좋구요 ^^
          </p>
        </div>

        <div className="tl-snippet-prompt-actions">
          <button
            type="button"
            className="tl-snippet-prompt-btn tl-snippet-prompt-btn-secondary"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="button"
            className="tl-snippet-prompt-btn tl-snippet-prompt-btn-primary"
            onClick={onConfirm}
          >
            작성하러 가기
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
