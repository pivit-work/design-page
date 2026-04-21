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
 */

const SAMPLE_TRANSCRIPT =
  '"1on1 준비 화면 QA가 이번 주 안에 완료되어야 4월 30일 런치 일정을 맞출 수 있습니다. SH 담당으로 확정하고, 결과는 Discord 채널에 공유…"';

// 참석자 이름 → 태그로 렌더할 문자열.
// meeting.participants 가 "David · Kurt" 형식이면 split 하고, 배열이면 그대로 사용.
function normalizeParticipants(participants) {
  if (!participants) return [];
  if (Array.isArray(participants)) return participants;
  return String(participants)
    .split(/[·,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function MeetingInProgressModal({ meeting, baseUrl = '', onClose }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [memo, setMemo] = useState('');
  // 'progress' = 회의 진행 중, 'record' = 종료 → 생성된 회의록, 'share' = 공유.
  const [phase, setPhase] = useState('progress');
  const isRecord = phase === 'record';
  const isShare = phase === 'share';
  // 데모용: 고정된 샘플 타이머. 실제 연동 전엔 static.
  const timer = '00:27:07';

  // Figma: "David", "Kurt", "Ernest", "SH", "John" (5명).
  // meeting.participants 에 데이터 없으면 샘플.
  const participantsRaw = meeting?.participants ?? ['David', 'Kurt', 'Ernest', 'SH', 'John'];
  const participants = normalizeParticipants(participantsRaw).length >= 2
    ? normalizeParticipants(participantsRaw)
    : ['David', 'Kurt', 'Ernest', 'SH', 'John'];

  const title = meeting?.title ?? '스프린트 리뷰';
  const timeLabel = meeting?.time ?? '10:00';
  const subtitle = `${title}  •  ${timeLabel} 시작`;

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
              aria-label="닫기"
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
              <MeetingShareContent meeting={meeting} baseUrl={baseUrl} />
            ) : isRecord ? (
              <MeetingRecordContent meeting={meeting} baseUrl={baseUrl} />
            ) : (
              <>
                <div className="mtg-progress-header-block">
                  <div className="mtg-progress-titlewrap">
                    <h2 id="mtg-progress-title" className="mtg-progress-title">회의 진행 중</h2>
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
                  <span className="mtg-progress-rec-badge">녹음 중</span>
                  <span className="mtg-progress-time">{timer}</span>
                </div>

                {/* 실시간 메모 — 공용 .tl-snippet-textarea 재사용 (focus brand primary) */}
                <section className="mtg-progress-section">
                  <label htmlFor="mtg-memo" className="mtg-progress-section-label">실시간 메모</label>
                  <textarea
                    id="mtg-memo"
                    className="tl-snippet-textarea mtg-progress-field"
                    placeholder="회의 중 중요한 내용을 메모하세요 (선택)"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                  />
                </section>

                {/* 실시간 전사 */}
                <section className="mtg-progress-section">
                  <span className="mtg-progress-section-label">실시간 전사</span>
                  <div className="tl-snippet-textarea mtg-progress-field mtg-progress-transcript">
                    {SAMPLE_TRANSCRIPT}
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
                공유 완료
              </button>
            ) : isRecord ? (
              <button
                type="button"
                className="mtg-progress-share-btn"
                onClick={() => setPhase('share')}
              >
                공유하기
              </button>
            ) : (
              <button
                type="button"
                className="mtg-progress-end-btn"
                onClick={() => setConfirmOpen(true)}
              >
                회의 종료 - AI 회의록 생성
              </button>
            )}
          </div>
        </div>
      </div>

      {confirmOpen && (
        <MeetingEndConfirmModal
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            setPhase('record');
          }}
        />
      )}
    </>,
    document.body
  );
}
