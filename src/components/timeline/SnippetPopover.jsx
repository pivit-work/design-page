import { createPortal } from 'react-dom';
import { memberPalette } from './constants.js';
import useTimelineData from './useTimelineData.js';

/**
 * SnippetPopover — 스니핏 블록 클릭 시 뜨는 상세 모달.
 * pivit-specs timeline-feed-view SnippetPopover 포팅: 화면 중앙 카드.
 *   헤더(아바타 · 이름/직책 · Health 뱃지 · 닫기) + 본문 + healthReason + 태그
 *   + (본인일 때) 1on1 / 평가 이동 버튼.
 *
 * Health 색상 티어는 SnippetModal 과 동일(8↑#16A34A / 6~7#D97706 / 6미만#DC2626).
 */
const healthColor = (v) => (v >= 8 ? '#16A34A' : v >= 6 ? '#D97706' : '#DC2626');

export default function SnippetPopover({ snippet, currentUserId, onClose, onNav }) {
  const { members } = useTimelineData();
  const member = members.find((m) => m.id === snippet.memberId);
  if (!member) return null;

  const palette = memberPalette(member);
  const isSelf = currentUserId != null && member.id === currentUserId;
  const hasHealth = snippet.health != null;
  const hc = hasHealth ? healthColor(snippet.health) : null;
  const tags = snippet.tags ?? [];

  return createPortal(
    <div className="tl-snip-pop-overlay" onClick={onClose}>
      <div
        className="tl-snip-pop"
        style={{ borderColor: `${palette.solid}40` }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="스니핏 상세"
      >
        <div className="tl-snip-pop-head">
          <img className="tl-snip-pop-avatar" src={member.photo} alt={member.name} draggable={false} />
          <div className="tl-snip-pop-id">
            <div className="tl-snip-pop-name">{member.name}</div>
            <div className="tl-snip-pop-title">{member.title}</div>
          </div>
          {hasHealth && (
            <div
              className="tl-snip-pop-health"
              style={{ background: `${hc}14`, borderColor: `${hc}40` }}
            >
              <span className="tl-snip-pop-health-dot" style={{ background: hc }} />
              <span className="tl-snip-pop-health-score" style={{ color: hc }}>
                {snippet.health}
              </span>
            </div>
          )}
          <button type="button" className="tl-snip-pop-close" aria-label="닫기" onClick={onClose}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {snippet.text && <p className="tl-snip-pop-text">{snippet.text}</p>}
        {snippet.healthReason && <p className="tl-snip-pop-reason">— {snippet.healthReason}</p>}

        {tags.length > 0 && (
          <div className="tl-snip-pop-tags">
            {tags.map((t) => (
              <span key={t} className="tl-snip-pop-tag">
                #{t}
              </span>
            ))}
          </div>
        )}

        {isSelf && onNav && (
          <div className="tl-snip-pop-actions">
            <button
              type="button"
              className="tl-snip-pop-action"
              onClick={() => {
                onClose();
                onNav('oneonone');
              }}
            >
              🤝 1on1 →
            </button>
            <button
              type="button"
              className="tl-snip-pop-action"
              onClick={() => {
                onClose();
                onNav('eval');
              }}
            >
              📊 평가 →
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
