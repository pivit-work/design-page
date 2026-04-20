import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * GroupAddModal — 간트 그룹 추가 모달.
 * Figma "group add modal" (node 16713:37970): panel 520x428, radius 16.
 *   - Top bar (pad 20/48): 닫기 X 버튼
 *   - Content (pad 0/48/0/48, gap 48 vertical):
 *       header: "그룹 추가" title + description (gap 8)
 *       field: "그룹명" label + "AI가 자동 생성 해줘요." hint + input (gap 12)
 *   - Footer (pad 24/48/24/48, gap 12 horizontal): 취소 / 추가 (각 206px)
 *
 * Portal 로 document.body 에 렌더 → .tl-page(position:fixed)의
 * stacking context 밖에서 overlay 가 전체 viewport 를 확실히 덮음.
 */
export default function GroupAddModal({ onClose, onSubmit }) {
  const [groupName, setGroupName] = useState('');
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    inputRef.current?.focus();
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

  const canSubmit = groupName.trim().length > 0;
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(groupName.trim());
  };

  return createPortal(
    <div className="tl-modal-overlay" onMouseDown={handleOverlayMouseDown} role="presentation">
      <form
        ref={panelRef}
        className="tl-group-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tl-group-modal-title"
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

        <div className="tl-group-modal-content">
          <div className="tl-group-modal-header">
            <h2 id="tl-group-modal-title" className="tl-group-modal-title">그룹 추가</h2>
            <p className="tl-group-modal-desc">
              간트 차트에서 보여질 새 그룹명을 만들어 주세요.
            </p>
          </div>

          <div className="tl-group-modal-field">
            <label htmlFor="tl-group-name" className="tl-group-modal-label">그룹명</label>
            <input
              ref={inputRef}
              id="tl-group-name"
              type="text"
              className="tl-group-modal-input"
              placeholder="그룹명을 입력해 주세요."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
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
