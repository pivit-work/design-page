import { useEffect, useRef } from 'react';
import ModalLayer from '../shared/ModalLayer.jsx';
import { CloseGlyph } from '../shared/lineIcons.jsx';
import gsap from 'gsap';
import { useTimelineLabels } from './timelineLabels.js';

/**
 * SnippetPromptModal — 타임라인 진입 시 자동으로 뜨는 스니핏 작성 유도 모달.
 *
 * 모션: 등장 시 scale 0.9 → 1 + opacity 0 → 1 (back.out spring 이징).
 * 문구는 타임라인 문구 묶음(`TimelineCanvas` 의 `labels`)에서 — 영어 화면은 앱이 넘긴다 (pivit-work PW-2329).
 */
export default function SnippetPromptModal({ onCancel, onConfirm }) {
  const modalRef = useRef(null);
  const L = useTimelineLabels();

  useEffect(() => {
    if (modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' }
      );
    }
  }, []);

  // 막·Esc·바깥 누르기는 공용 창 바탕(`ModalLayer`)이 갖는다(PW-1013) — 다른 창과 같은 막이
  // 사이드바/탑네비까지 덮는다. 막이 나타나는 모션도 그쪽 CSS 가 한다.
  return (
    <ModalLayer onClose={() => onCancel?.()}>
      <div
        className="tl-snippet-prompt-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tl-snippet-prompt-title"
      >
        <button
          type="button"
          className="tl-snippet-prompt-close"
          aria-label={L.close}
          onClick={onCancel}
        >
          <CloseGlyph size={24} color="var(--colors-foreground-fgQuaternary, #98a1b2)" />
        </button>

        <div className="tl-snippet-prompt-header">
          <p id="tl-snippet-prompt-title" className="tl-snippet-prompt-title">
            {L.promptTitle}
          </p>
          <p className="tl-snippet-prompt-desc">
            {L.promptDesc}
          </p>
        </div>

        <div className="tl-snippet-prompt-actions">
          <button
            type="button"
            className="tl-snippet-prompt-btn tl-snippet-prompt-btn-secondary"
            onClick={onCancel}
          >
            {L.promptCancel}
          </button>
          <button
            type="button"
            className="tl-snippet-prompt-btn tl-snippet-prompt-btn-primary"
            onClick={onConfirm}
          >
            {L.promptConfirm}
          </button>
        </div>
      </div>
    </ModalLayer>
  );
}
