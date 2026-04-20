import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * EmployeeModalShell — 내부/외부 직원 추가 모달의 공통 쉘.
 * Figma "add_inside_people_modal" / "add_outside_poeple_modal" 모두 동일 구조:
 *   Top bar (pad 20/48/0/48) — 닫기 X
 *   Content (pad 0/48, gap 48) — header + body(props.children)
 *   Footer (pad 24/48) — 취소 / 추가, border-top 1px border-tertiary
 *
 * Portal 로 body 에 렌더. ESC / 오버레이 클릭 / 닫기 버튼으로 닫힘.
 */
export default function EmployeeModalShell({
  title,
  description,
  canSubmit,
  onClose,
  onSubmit,
  children,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleOverlayMouseDown = (e) => {
    if (panelRef.current && panelRef.current.contains(e.target)) return;
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  };

  return createPortal(
    <div className="tl-modal-overlay" onMouseDown={handleOverlayMouseDown} role="presentation">
      <form
        ref={panelRef}
        className="tl-group-modal tl-emp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tl-emp-modal-title"
        onSubmit={handleSubmit}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="tl-group-modal-top">
          <button
            type="button"
            className="tl-group-modal-close"
            aria-label="닫기"
            onClick={onClose}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="tl-group-modal-content tl-emp-modal-content">
          <div className="tl-group-modal-header">
            <h2 id="tl-emp-modal-title" className="tl-group-modal-title">{title}</h2>
            {description && (
              <p className="tl-group-modal-desc">{description}</p>
            )}
          </div>

          <div className="tl-emp-modal-body">{children}</div>
        </div>

        <div className="tl-group-modal-actions">
          <button
            type="button"
            className="tl-group-modal-btn tl-group-modal-btn-secondary"
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="submit"
            className="tl-group-modal-btn tl-group-modal-btn-primary"
            disabled={!canSubmit}
          >
            추가
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
