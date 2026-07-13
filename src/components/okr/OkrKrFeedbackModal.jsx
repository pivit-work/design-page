import { useEffect, useState } from 'react';
import Icon from '../shared/Icon.jsx';

/**
 * OkrKrFeedbackModal — KR 피드백 전체보기 모달.
 *
 * detail: { krLabel, objective, comments: [{ author, role, roleTone
 *   ('blue'|'gray'), avatar, date, badge, text }] }
 * 각 코멘트의 '답변 달기' 클릭 시 인라인 답변 입력(취소/등록)이 열리고,
 * 하단 고정 버튼으로 피드백 요청 작성(onRequestFeedback)을 연다.
 */
export default function OkrKrFeedbackModal({ detail, icons, baseUrl = '', onClose, onRequestFeedback }) {
  const [replyOpen, setReplyOpen] = useState({});
  const toggleReply = (i) => setReplyOpen((prev) => ({ ...prev, [i]: !prev[i] }));

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="okr-modal-overlay" onClick={onClose}>
      <div className="okr-krfb-modal" onClick={(e) => e.stopPropagation()}>
        <button className="okr-modal-close" onClick={onClose}>
          <Icon src={icons.xClose} size={24} color="var(--text-secondary)" baseUrl={baseUrl} />
        </button>
        <div className="okr-krfb-body">
          <div className="okr-krfb-header">
            <p className="okr-krfb-eyebrow">KR 피드백</p>
            <h2 className="okr-krfb-title">{detail.krLabel}</h2>
            <p className="okr-krfb-objective">{detail.objective}</p>
          </div>

          {detail.comments.map((comment, i) => (
            <div className="okr-krfb-comment" key={comment.author + comment.date}>
              <div className="okr-krfb-comment-head">
                <div className="okr-krfb-author">
                  <img src={comment.avatar} alt={comment.author} draggable={false} />
                  <span className="okr-krfb-author-name">{comment.author}</span>
                  <span className={`okr-role-badge is-${comment.roleTone}`}>{comment.role}</span>
                </div>
                <div className="okr-krfb-meta">
                  <span className="okr-krfb-date">{comment.date}</span>
                  <span className="okr-krfb-badge">{comment.badge}</span>
                </div>
              </div>
              <p className="okr-krfb-text">{comment.text}</p>
              <p className="okr-krfb-reply-link" onClick={() => toggleReply(i)}>답변 달기</p>
              {replyOpen[i] && (
                <div className="okr-krfb-reply">
                  <textarea className="okr-textarea is-compact" placeholder="답변을 입력해 주세요." />
                  <div className="okr-krfb-reply-actions">
                    <button className="okr-btn is-outline is-sm" onClick={() => toggleReply(i)}>취소</button>
                    <button className="okr-btn is-brand is-sm" onClick={() => toggleReply(i)}>등록</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="okr-modal-footer">
          <button className="okr-btn is-brand" onClick={onRequestFeedback}>피드백 요청 보내기</button>
        </div>
      </div>
    </div>
  );
}
