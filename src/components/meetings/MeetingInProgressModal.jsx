import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import MeetingEndConfirmModal from './MeetingEndConfirmModal.jsx';
import MeetingRecordContent from './MeetingRecordContent.jsx';
import MeetingShareContent from './MeetingShareContent.jsx';

/**
 * MeetingInProgressModal — "시작" 버튼 클릭 시 뜨는 회의 진행 중 모달.
 *
 * Figma node-id=16708-27390. 650x920, 녹음 중 배지 + 타이머 + 실시간 메모/전사 + "회의 종료" 버튼.
 * "회의 종료" 클릭 시 MeetingEndConfirmModal 이 그 위에 뜬다.
 *
 * 모든 데이터/라벨은 caller 가 주입한다. 패키지 내부에는 fallback 이 없다.
 *
 * meeting.participants 가 "David · Kurt" 형식 문자열 또는 배열 둘 다 지원.
 */
function normalizeParticipants(participants) {
  if (!participants) return [];
  if (Array.isArray(participants)) return participants;
  return String(participants)
    .split(/[·,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function MeetingInProgressModal({
  meeting,
  baseUrl = '',
  onClose,
  // 진행 phase props — 모두 caller 주입
  timer,
  transcript,
  memo: memoProp,
  onMemoChange,
  // record/share phase 에 그대로 forward (caller 주입)
  recordData,
  shareData,
  // 라벨 (caller 주입)
  labels,
  // 시작 phase: 'progress' (기본) | 'record' — completed 회의의 기록 보기용.
  initialPhase = 'progress',
  // 회의 "종료" 확정 콜백 — status=completed 등 서버 반영을 caller 에서 처리.
  onEnd,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [internalMemo, setInternalMemo] = useState('');
  const memo = memoProp !== undefined ? memoProp : internalMemo;
  const handleMemoChange = onMemoChange ?? setInternalMemo;
  // 'progress' = 회의 진행 중, 'record' = 종료 → 생성된 회의록, 'share' = 공유.
  const [phase, setPhase] = useState(initialPhase);
  const isRecord = phase === 'record';
  const isShare = phase === 'share';

  const participants = normalizeParticipants(meeting?.participants);
  const subtitle = `${meeting.title}  •  ${meeting.time} ${labels.startedSuffix}`;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (confirmOpen) setConfirmOpen(false);
      else onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmOpen, onClose]);

  return createPortal(
    <>
      <div className="mtg-progress-overlay" onClick={onClose}>
        <div
          className="mtg-progress-modal"
          role="dialog"
          aria-labelledby="mtg-progress-title"
          onClick={(e) => e.stopPropagation()}
        >
          {/* top close area — height 60, close X 우측 */}
          <div className="mtg-progress-close-area">
            <button
              type="button"
              className="mtg-progress-close-btn"
              aria-label={labels.close}
              onClick={onClose}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6L6 18M6 6l12 12"
                  stroke="var(--colors-foreground-fgQuaternary, #98a1b2)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* 스크롤 영역 */}
          <div className="mtg-progress-body">
            {isShare ? (
              <MeetingShareContent
                meeting={meeting}
                baseUrl={baseUrl}
                {...shareData}
              />
            ) : isRecord ? (
              <MeetingRecordContent
                meeting={meeting}
                baseUrl={baseUrl}
                {...recordData}
              />
            ) : (
              <>
                <div className="mtg-progress-header-block">
                  <div className="mtg-progress-titlewrap">
                    <h2 id="mtg-progress-title" className="mtg-progress-title">
                      {labels.title}
                    </h2>
                    <p className="mtg-progress-subtitle">{subtitle}</p>
                  </div>
                  <div className="mtg-progress-participants">
                    {participants.map((p) => (
                      <span key={p} className="mtg-progress-pill">{p}</span>
                    ))}
                  </div>
                </div>

                {/* 녹음 중 + 타이머 */}
                <div className="mtg-progress-timer">
                  <span className="mtg-progress-rec-badge">
                    {labels.recording}
                  </span>
                  <span className="mtg-progress-time">{timer}</span>
                </div>

                {/* 실시간 메모 — 공용 .tl-snippet-textarea 재사용 (focus brand primary) */}
                <section className="mtg-progress-section">
                  <label htmlFor="mtg-memo" className="mtg-progress-section-label">
                    {labels.memoLabel}
                  </label>
                  <textarea
                    id="mtg-memo"
                    className="tl-snippet-textarea mtg-progress-field"
                    placeholder={labels.memoPlaceholder}
                    value={memo}
                    onChange={(e) => handleMemoChange(e.target.value)}
                  />
                </section>

                {/* 실시간 전사 */}
                <section className="mtg-progress-section">
                  <span className="mtg-progress-section-label">
                    {labels.transcriptLabel}
                  </span>
                  <div className="tl-snippet-textarea mtg-progress-field mtg-progress-transcript">
                    {transcript}
                  </div>
                </section>
              </>
            )}
          </div>

          {/* Sticky bottom — phase 에 따라 다른 버튼 */}
          <div className="mtg-progress-actions">
            {isShare ? (
              <button
                type="button"
                className="mtg-progress-share-btn"
                onClick={onClose}
              >
                {labels.shareDoneButton}
              </button>
            ) : isRecord ? (
              <button
                type="button"
                className="mtg-progress-share-btn"
                onClick={() => setPhase('share')}
              >
                {labels.shareButton}
              </button>
            ) : (
              <button
                type="button"
                className="mtg-progress-end-btn"
                onClick={() => setConfirmOpen(true)}
              >
                {labels.endButton}
              </button>
            )}
          </div>
        </div>
      </div>

      {confirmOpen && (
        <MeetingEndConfirmModal
          labels={labels.endConfirm}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            onEnd?.();
            setPhase('record');
          }}
        />
      )}
    </>,
    document.body
  );
}
