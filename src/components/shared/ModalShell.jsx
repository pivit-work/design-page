import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * ModalShell — 공용 모달 껍데기.
 *   Top bar (pad 20/48/0/48) — 닫기 X
 *   Content (pad 0/48, gap 48) — header(title/description) + body(props.children)
 *   Footer (pad 24/48) — 취소 / 확인, border-top 1px border-tertiary
 *
 * Portal 로 body 에 렌더. ESC / 오버레이 클릭 / 닫기 버튼으로 닫힘.
 *
 * 원래 timeline 의 `EmployeeModalShell` 이었다. 같은 껍데기를 매니저 화면에서도
 * 쓰게 되면서 shared 로 올렸고, **마크업과 클래스는 한 글자도 바꾸지 않았다** —
 * 기존 소비처(내부/외부 직원 추가 모달)의 DOM 이 그대로여야 시각이 안 변한다.
 * 스타일은 `styles/modal-shell.css`.
 *
 * 라벨은 caller 가 주입한다. 예전에는 '취소'/'추가'/'닫기' 가 컴포넌트 안에
 * 한국어로 박혀 있었는데, 그러면 다른 화면이 자기 문구를 쓸 수 없고 i18n 도 못 건다.
 * (기존 소비처의 문구는 `timeline/EmployeeModalShell` 이 그대로 넘겨 준다.)
 *
 * Props:
 *   title, description   헤더 문구 (description 없으면 미출력)
 *   titleId              aria-labelledby 로 쓰이는 id
 *   submitLabel          확인 버튼 문구
 *   cancelLabel          취소 버튼 문구
 *   closeLabel           닫기 X 의 aria-label
 *   canSubmit            false 면 확인 버튼 disabled
 *   onSubmit, onClose
 *   className            카드에 덧붙일 변형 클래스 (예: 'tl-emp-modal')
 *   contentClassName     content 래퍼에 덧붙일 변형 클래스
 *   bodyClassName        body 에 덧붙일 변형 클래스
 *   children             body 내용
 */
export default function ModalShell({
  title,
  description,
  titleId,
  submitLabel,
  cancelLabel,
  closeLabel,
  canSubmit,
  onClose,
  onSubmit,
  className = '',
  contentClassName = '',
  bodyClassName = '',
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
        className={`tl-group-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={handleSubmit}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="tl-group-modal-top">
          <button
            type="button"
            className="tl-group-modal-close"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={`tl-group-modal-content ${contentClassName}`.trim()}>
          <div className="tl-group-modal-header">
            <h2 id={titleId} className="tl-group-modal-title">{title}</h2>
            {description && (
              <p className="tl-group-modal-desc">{description}</p>
            )}
          </div>

          <div className={bodyClassName}>{children}</div>
        </div>

        <div className="tl-group-modal-actions">
          <button
            type="button"
            className="tl-group-modal-btn tl-group-modal-btn-secondary"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className="tl-group-modal-btn tl-group-modal-btn-primary"
            disabled={!canSubmit}
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
