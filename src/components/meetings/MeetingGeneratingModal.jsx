import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';

/**
 * MeetingGeneratingModal — 회의 종료 직후 뜨는 "회의록 생성 중" 안내 다이얼로그.
 *
 * Figma node-id=16920-37316. 파일 아이콘 + 타이틀 + 소요시간 안내 + 확인 버튼.
 * 모든 라벨은 caller 주입. 내부 fallback 없음.
 */
export default function MeetingGeneratingModal({ baseUrl = '', labels, onConfirm }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onConfirm?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onConfirm]);

  return createPortal(
    <div className="mtg-overlay" onClick={onConfirm}>
      <div
        className="mtg-generating-modal"
        role="dialog"
        aria-labelledby="mtg-generating-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mtg-generating-body">
          <span className="mtg-generating-icon" aria-hidden="true">
            <Icon src="/icons-solid/file-02.svg" size={28} color="var(--text-tertiary, #b1b6be)" baseUrl={baseUrl} />
          </span>
          <h2 id="mtg-generating-title" className="mtg-generating-title">{labels.title}</h2>
          <p className="mtg-generating-desc">{labels.desc}</p>
        </div>
        <button type="button" className="mtg-generating-confirm" onClick={onConfirm}>
          {labels.confirm}
        </button>
      </div>
    </div>,
    document.body
  );
}
