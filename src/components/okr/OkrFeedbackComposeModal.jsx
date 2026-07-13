import { useEffect, useState } from 'react';
import Icon from '../shared/Icon.jsx';

/**
 * OkrFeedbackComposeModal — 피드백 작성/피드백 요청 작성 공용 모달.
 * 제목·placeholder·확인 버튼 라벨만 다르다 (작성=완료, 요청=보내기).
 */
export default function OkrFeedbackComposeModal({ title, placeholder, submitLabel, icons, baseUrl = '', onClose, onSubmit }) {
  const [text, setText] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="okr-modal-overlay" onClick={onClose}>
      <div className="okr-compose-modal" onClick={(e) => e.stopPropagation()}>
        <button className="okr-modal-close" onClick={onClose}>
          <Icon src={icons.xClose} size={24} color="var(--text-secondary)" baseUrl={baseUrl} />
        </button>
        <div className="okr-compose-body">
          <h2 className="okr-compose-title">{title}</h2>
          <textarea
            className="okr-textarea"
            placeholder={placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="okr-modal-footer">
          <button className="okr-btn is-outline" onClick={onClose}>취소</button>
          <button className="okr-btn is-brand" onClick={() => { if (onSubmit) onSubmit(text); onClose(); }}>{submitLabel}</button>
        </div>
      </div>
    </div>
  );
}
