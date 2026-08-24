import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';

/**
 * ManagerAssignModal — 마이크 권한 안내 다음 단계, 매니저(퍼실리테이터) 지정 모달.
 * Figma 17416:27850. 650px, AI 추천 배너 + 후보 라디오 리스트 + [나중에 | 확인].
 *
 * candidates: [{ id, name, role, avatar, recommended?: boolean }]
 * 추천 후보가 기본 선택되며, 배너 문구도 추천 후보 이름으로 만든다.
 * onConfirm(candidate) / onLater() / onClose().
 */
export default function ManagerAssignModal({ candidates = [], icons, baseUrl = '', onClose, onConfirm, onLater }) {
  const recommended = candidates.find((c) => c.recommended) ?? candidates[0];
  const [selectedId, setSelectedId] = useState(recommended?.id);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const selected = candidates.find((c) => c.id === selectedId);

  return createPortal(
    <div className="ons-overlay" onClick={onClose}>
      <div className="ons-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ons-close" onClick={onClose} aria-label="닫기">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="ons-head">
          <h2 className="ons-title">매니저(퍼실리테이터) 지정</h2>
          <p className="ons-desc">AI가 대화 내용을 기반으로 역할을 자동 감지합니다. 직접 지정하시면 AI 자동 분류보다 우선 적용됩니다.</p>
        </div>
        {recommended && (
          <div className="ons-ai-banner">
            <Icon src={icons?.aiChat} size={14} color="var(--utility-purple-500)" baseUrl={baseUrl} />
            <span>AI 추천: {recommended.name} 님을 매니저로 추천합니다.</span>
          </div>
        )}
        <div className="ons-candidates">
          {candidates.map((c) => {
            const isSelected = c.id === selectedId;
            return (
              <button
                key={c.id}
                type="button"
                className={`ons-candidate${isSelected ? ' is-selected' : ''}`}
                onClick={() => setSelectedId(c.id)}
              >
                <span className={`ons-radio${isSelected ? ' is-on' : ''}`} />
                <span className="ons-candidate-avatar">
                  {c.avatar && <img src={c.avatar} alt="" draggable={false} />}
                </span>
                <span className="ons-candidate-info">
                  <b className="ons-candidate-name">{c.name}</b>
                  <span className="ons-candidate-role">{c.role}</span>
                </span>
                {c.recommended && (
                  <span className="ons-ai-tag">
                    <Icon src={icons?.aiChat} size={14} color="var(--utility-purple-500)" baseUrl={baseUrl} />
                    <span>AI 추천</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="ons-actions">
          <button type="button" className="ons-btn is-outline" onClick={() => onLater?.()}>나중에 (AI 분류 사용)</button>
          <button type="button" className="ons-btn is-brand" onClick={() => onConfirm?.(selected)}>확인</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
