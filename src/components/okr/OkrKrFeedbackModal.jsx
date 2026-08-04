import { useEffect, useState } from 'react';
import Icon from '../shared/Icon.jsx';

/**
 * OkrKrFeedbackModal — KR 피드백 전체보기 모달.
 *
 * detail: { krId, krLabel, objective, comments: [{ id, author, role, roleTone
 *   ('blue'|'gray'), avatar, date, badge, text, replies?: [{ author, avatar,
 *   date, text }] }] }
 * 각 코멘트의 '답변 달기' 클릭 시 인라인 답변 입력(취소/등록)이 열리고,
 * 하단 고정 버튼으로 피드백 요청 작성(onRequestFeedback)을 연다.
 *
 * onSubmitReply(commentId, text): 답변 저장. 저장 실패(reject)면 입력을 유지하고
 * 인라인 에러를 띄운다 — 작성 중 본문을 삼키지 않는다.
 */
export default function OkrKrFeedbackModal({ detail, icons, baseUrl = '', onClose, onSubmitReply, onRequestFeedback }) {
  const [replyOpen, setReplyOpen] = useState({});
  const [replyText, setReplyText] = useState({});
  const [replyError, setReplyError] = useState({});
  const [replyBusy, setReplyBusy] = useState({});
  const toggleReply = (i) => {
    setReplyOpen((prev) => ({ ...prev, [i]: !prev[i] }));
    setReplyError((prev) => ({ ...prev, [i]: null }));
  };

  const submitReply = async (i, comment) => {
    const text = (replyText[i] ?? '').trim();
    if (!text) return;
    if (!onSubmitReply || !comment.id) {
      // 저장 경로가 없으면 입력을 지우지 않고 그대로 닫는다(무언 유실 방지).
      setReplyOpen((prev) => ({ ...prev, [i]: false }));
      return;
    }
    setReplyBusy((prev) => ({ ...prev, [i]: true }));
    setReplyError((prev) => ({ ...prev, [i]: null }));
    try {
      await onSubmitReply(comment.id, text);
      setReplyText((prev) => ({ ...prev, [i]: '' }));
      setReplyOpen((prev) => ({ ...prev, [i]: false }));
    } catch {
      setReplyError((prev) => ({ ...prev, [i]: '답변 등록에 실패했습니다. 잠시 후 다시 시도해주세요.' }));
    } finally {
      setReplyBusy((prev) => ({ ...prev, [i]: false }));
    }
  };

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
            <div className="okr-krfb-comment" key={comment.id ?? comment.author + comment.date}>
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

              {(comment.replies ?? []).map((reply, ri) => (
                <div className="okr-krfb-reply-item" key={reply.id ?? `${ri}-${reply.date}`}>
                  <div className="okr-krfb-comment-head">
                    <div className="okr-krfb-author">
                      <img src={reply.avatar} alt={reply.author} draggable={false} />
                      <span className="okr-krfb-author-name">{reply.author}</span>
                    </div>
                    <span className="okr-krfb-date">{reply.date}</span>
                  </div>
                  <p className="okr-krfb-text">{reply.text}</p>
                </div>
              ))}

              <p className="okr-krfb-reply-link" onClick={() => toggleReply(i)}>답변 달기</p>
              {replyOpen[i] && (
                <div className="okr-krfb-reply">
                  <textarea
                    className="okr-textarea is-compact"
                    placeholder="답변을 입력해 주세요."
                    value={replyText[i] ?? ''}
                    onChange={(e) => setReplyText((prev) => ({ ...prev, [i]: e.target.value }))}
                  />
                  {replyError[i] && <p className="okr-krfb-reply-error">{replyError[i]}</p>}
                  <div className="okr-krfb-reply-actions">
                    <button className="okr-btn is-outline is-sm" onClick={() => toggleReply(i)}>취소</button>
                    <button
                      className="okr-btn is-brand is-sm"
                      disabled={replyBusy[i] || !(replyText[i] ?? '').trim()}
                      onClick={() => submitReply(i, comment)}
                    >
                      {replyBusy[i] ? '등록 중…' : '등록'}
                    </button>
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
