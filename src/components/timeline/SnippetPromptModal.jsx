import { useEffect, useRef } from 'react';
import ModalLayer from '../shared/ModalLayer.jsx';
import { CloseGlyph } from '../shared/lineIcons.jsx';
import gsap from 'gsap';

/**
 * SnippetPromptModal — 타임라인 진입 시 자동으로 뜨는 스니핏 작성 유도 모달.
 *
 * 모션: 등장 시 scale 0.9 → 1 + opacity 0 → 1 (back.out spring 이징).
 */
export default function SnippetPromptModal({ onCancel, onConfirm }) {
  const modalRef = useRef(null);

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
          aria-label="닫기"
          onClick={onCancel}
        >
          <CloseGlyph size={24} color="var(--colors-foreground-fgQuaternary, #98a1b2)" />
        </button>

        <div className="tl-snippet-prompt-header">
          <p id="tl-snippet-prompt-title" className="tl-snippet-prompt-title">
            슬슬 스니핏 작성할 시간이에요
          </p>
          <p className="tl-snippet-prompt-desc">
            미리미리 작성하는 습관을 가지시면 중요한 업무를 빠트리지 않게 되요.
            지금 작성하시면 너무 좋구요 ^^
          </p>
        </div>

        <div className="tl-snippet-prompt-actions">
          <button
            type="button"
            className="tl-snippet-prompt-btn tl-snippet-prompt-btn-secondary"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="button"
            className="tl-snippet-prompt-btn tl-snippet-prompt-btn-primary"
            onClick={onConfirm}
          >
            작성하러 가기
          </button>
        </div>
      </div>
    </ModalLayer>
  );
}
