import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';

/**
 * RecordMethodModal — "시작" 클릭 직후 뜨는 기록 방식 선택 모달.
 *
 * Figma node-id=16920-36771. 중앙 정렬 카드. 직접 녹음 / 메모만 작성 2-카드.
 * 모든 데이터/라벨은 caller 주입. 내부 fallback 없음.
 *
 * meeting.participants: "David · Kurt" 문자열 또는 배열 둘 다 지원.
 */
function normalizeParticipants(participants) {
  if (!participants) return [];
  if (Array.isArray(participants)) return participants;
  return String(participants).split(/[·,]/).map((s) => s.trim()).filter(Boolean);
}

export default function RecordMethodModal({ meeting, baseUrl = '', labels, onSelect, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const participants = normalizeParticipants(meeting?.participants);
  const subtitle = `${meeting.title} · ${meeting.time} ${labels.subtitleSuffix}`;

  return createPortal(
    <div className="mtg-overlay" onClick={onClose}>
      <div
        className="mtg-method-modal"
        role="dialog"
        aria-labelledby="mtg-method-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mtg-method-head">
          <h2 id="mtg-method-title" className="mtg-method-title">{labels.title}</h2>
          <button type="button" className="mtg-modal-close" aria-label={labels.close} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="var(--colors-foreground-fgQuaternary, #98a1b2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <p className="mtg-method-subtitle">{subtitle}</p>

        <div className="mtg-method-participants">
          {participants.map((p) => (
            <span key={p} className="mtg-progress-pill">{p}</span>
          ))}
        </div>

        <div className="mtg-method-cards">
          <button type="button" className="mtg-method-card" onClick={() => onSelect('record')}>
            <Icon src="/icons-solid/microphone-01.svg" size={28} color="var(--text-primary)" baseUrl={baseUrl} />
            <span className="mtg-method-card-title">{labels.record.title}</span>
            <span className="mtg-method-card-desc">{labels.record.desc}</span>
          </button>
          <button type="button" className="mtg-method-card" onClick={() => onSelect('memo')}>
            <Icon src="/icons-solid/file-02.svg" size={28} color="var(--text-primary)" baseUrl={baseUrl} />
            <span className="mtg-method-card-title">{labels.memo.title}</span>
            <span className="mtg-method-card-desc">{labels.memo.desc}</span>
          </button>
        </div>

        <p className="mtg-method-footnote">{labels.footnote}</p>
      </div>
    </div>,
    document.body
  );
}
