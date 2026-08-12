import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useTimelineData from './useTimelineData.js';
import { memberPalette } from './constants.js';
import { healthTier, healthLabel } from './snippetHealth.js';

/**
 * SnippetDetailModal — 간트의 스니핏 블록을 클릭하면 뜨는 상세 팝오버.
 *
 * 배치 로직·셸(반경/그림자/닫기 버튼)은 MeetingModal 과 동일하다 — 같은 간트
 * 위에서 열리는 같은 종류의 팝오버라 다르게 생길 이유가 없다. 폭만 좁다(410).
 *
 * 본문은 **넘겨받은 것만** 그린다. "누가 무엇까지 볼 수 있는가" 는 앱이 정해서
 * (member 는 팀원의 Summary·Tags·Health 만 — timeline-feed-view-spec §18)
 * text/health/tags 를 채워 보내고, 여기서는 없는 필드를 렌더하지 않는다.
 *
 * Props:
 *   snippet     { id, memberId, text, emptyText, timeLabel, dateLabel, health, healthNote, tags, canOpen }
 *   anchorRect  클릭한 블록의 DOMRect
 *   onClose     닫기
 *   onOpen      "스니핏 전체 보기" — 미주입이거나 canOpen=false 면 버튼을 숨긴다
 */
export default function SnippetDetailModal({ snippet, anchorRect, onClose, onOpen }) {
  const { members } = useTimelineData();
  const modalRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0, opacity: 0 });

  useLayoutEffect(() => {
    if (!modalRef.current || !anchorRect) return;
    const m = modalRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 16;
    const VERT_MARGIN = 40;
    const HORIZ_MARGIN = 8;

    const anchorCenterX = (anchorRect.left + anchorRect.right) / 2;
    const placeOnLeft = anchorCenterX > vw / 2;

    let left = placeOnLeft ? anchorRect.left - m.width - gap : anchorRect.right + gap;
    left = Math.max(HORIZ_MARGIN, Math.min(left, vw - m.width - HORIZ_MARGIN));

    const anchorCenterY = (anchorRect.top + anchorRect.bottom) / 2;
    let top = anchorCenterY - m.height / 2;
    top = Math.max(VERT_MARGIN, Math.min(top, vh - m.height - VERT_MARGIN));

    setPos({ left, top, opacity: 1 });
  }, [anchorRect]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!snippet) return null;

  const member = (members || []).find((m) => m.id === snippet.memberId);
  const palette = memberPalette(member);
  const hasHealth = typeof snippet.health === 'number' && !Number.isNaN(snippet.health);
  const tags = snippet.tags || [];

  return createPortal(
    <div className="tl-meeting-modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="tl-meeting-modal tl-snippet-detail-modal"
        data-testid="tl-snippet-detail"
        style={{ left: pos.left, top: pos.top, opacity: pos.opacity }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="tl-snippet-detail-title"
      >
        <div className="tl-meeting-modal-header">
          <button
            type="button"
            className="tl-meeting-modal-close"
            onClick={onClose}
            aria-label="닫기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="var(--colors-foreground-fgPrimary)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="tl-meeting-modal-body">
          {/* 작성자 + 작성 시각 */}
          <div className="tl-snippet-detail-head">
            <div className="tl-snippet-detail-avatar" style={{ borderColor: palette.border }}>
              {member?.photo ? (
                <img src={member.photo} alt="" />
              ) : (
                <span style={{ background: palette.solid }} />
              )}
            </div>
            <div className="tl-snippet-detail-who">
              <h2 id="tl-snippet-detail-title" className="tl-snippet-detail-name">
                {member?.name ?? '스니핏'}
              </h2>
              <p className="tl-snippet-detail-when">
                {[snippet.dateLabel, snippet.timeLabel && `${snippet.timeLabel} 작성`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            {hasHealth && (
              <span
                className={`tl-snippet-health-label tl-snippet-health-label--${healthTier(snippet.health)}`}
              >
                {healthLabel(snippet.health)} {snippet.health}
              </span>
            )}
          </div>

          {/* 본문 — 권한에 따라 요약만 올 수도 있다 */}
          {snippet.text ? (
            <p className="tl-snippet-detail-text">{snippet.text}</p>
          ) : (
            <p className="tl-snippet-detail-empty">
              {snippet.emptyText || '내용이 비어 있습니다.'}
            </p>
          )}

          {snippet.healthNote && (
            <p className="tl-snippet-detail-note">— {snippet.healthNote}</p>
          )}

          {tags.length > 0 && (
            <div className="tl-snippet-detail-tags">
              {tags.map((tag) => (
                <span key={tag} className="tl-snippet-tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {snippet.canOpen && onOpen && (
            <button
              type="button"
              className="tl-snippet-detail-open"
              onClick={() => {
                onClose();
                onOpen(snippet);
              }}
            >
              스니핏 전체 보기
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
