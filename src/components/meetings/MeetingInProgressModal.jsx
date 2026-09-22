import { useRef, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import MeetingEndConfirmModal from './MeetingEndConfirmModal.jsx';
import MeetingRecordContent from './MeetingRecordContent.jsx';
import MeetingShareContent from './MeetingShareContent.jsx';
import assetUrl from '../shared/assetUrl.js';
import useMicWave from '../shared/useMicWave.js';

/**
 * MeetingInProgressModal — "시작" 버튼 클릭 시 뜨는 회의 진행 중 모달.
 *
 * Figma node-id=16708-27390. 650x712, 녹음 중 배지 + 타이머 + 실시간 메모 + "회의 종료" 버튼.
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
  mode = 'record',          // 'record' = 직접 녹음, 'memo' = 메모만 작성
  recorderName,             // 'record' 모드에서 "{recorderName}님이 녹음 중입니다."
  recorderAvatar,           // 녹음자 썸네일 이미지 URL (없으면 단색 원)
  timer,
  memo: memoProp,
  onMemoChange,
  onStopRecording,          // "녹음 종료만 하기" 클릭
  recordingStopped = false, // 'record' 모드에서 녹음만 종료된 상태 (회색 카드 "녹음만 종료됨.")
  // record/share phase 에 그대로 forward (caller 주입)
  recordData,
  shareData,
  // 라벨 (caller 주입)
  labels,
  // 시작 phase: 'progress' (기본) | 'record' — completed 회의의 기록 보기용.
  initialPhase = 'progress',
  /** dimmed 클릭 핸들러 override — 녹음 중엔 caller 가 모달을 닫는 대신
   *  미니 위젯으로 축소한다 (16817:40938). 미지정 시 기존처럼 onClose. */
  onOverlayClick,
  // 회의 "종료" 확정 콜백 — status=completed 등 서버 반영을 caller 에서 처리.
  onEnd,
  // 회의록 단계의 [공유하기] 버튼을 보일지. 회의 담당자가 아니면 caller 가 false 로
  // 준다 (기획 screen-minutes-review §4.4 "공유하기 버튼 숨김").
  canShare = true,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  // 녹음 중 파형 — 1on1 녹음 위젯과 같은 실시간 마이크 이퀄라이저 (9막대·28px).
  const waveRef = useRef(null);
  useMicWave(waveRef, {
    enabled: mode === 'record' && !recordingStopped,
    barCount: 6,
    minPx: 3,
    maxPx: 20,
  });
  const [internalMemo, setInternalMemo] = useState('');
  const memo = memoProp !== undefined ? memoProp : internalMemo;
  const handleMemoChange = onMemoChange ?? setInternalMemo;
  // 'progress' = 회의 진행 중, 'record' = 종료 → 생성된 회의록, 'share' = 공유.
  const [phase, setPhase] = useState(initialPhase);
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const isRecord = phase === 'record';
  const isShare = phase === 'share';
  // share content 의 imperative submit() 호출용. 내부 mode/members 상태를
  // 외부에서 모르므로 ref 패턴으로 wiring.
  const shareContentRef = useRef(null);

  /**
   * "공유 완료" 버튼 클릭. share content 의 submit() 호출 → caller 의
   * onShareSubmit 이 비동기면 끝날 때까지 대기 후 모달 닫기. 호출 자체가 없거나
   * onShareSubmit 미주입이면 그냥 닫기 (옛 동작 유지).
   */
  const handleShareDone = async () => {
    if (shareSubmitting) return;
    const ref = shareContentRef.current;
    const result = ref?.submit?.();
    if (result && typeof result.then === 'function') {
      setShareSubmitting(true);
      try {
        await result;
      } finally {
        setShareSubmitting(false);
      }
    }
    onClose?.();
  };

  const participants = normalizeParticipants(meeting?.participants);
  const subtitle = `${meeting.title}  •  ${meeting.time} ${labels.startedSuffix}`;

  // 하단 버튼 줄 — phase 에 따라 다른 버튼. 틀(ModalShell)의 푸터 칸에 끼운다.
  let footer;
  if (isShare) {
    footer = (
      <button
        type="button"
        className="mtg-progress-share-btn"
        onClick={handleShareDone}
        disabled={shareSubmitting}
      >
        {labels.shareDoneButton}
      </button>
    );
  } else if (isRecord) {
    footer = canShare ? (
      <button
        type="button"
        className="mtg-progress-share-btn"
        onClick={() => setPhase('share')}
      >
        {labels.shareButton}
      </button>
    ) : null;
  } else {
    footer = (
      <div className="mtg-progress-btn-row">
        {mode === 'record' && !recordingStopped && (
          <button
            type="button"
            className="mtg-progress-stoprec-btn"
            onClick={onStopRecording}
          >
            {labels.endRecordingOnly}
          </button>
        )}
        <button
          type="button"
          className="mtg-progress-end-btn"
          onClick={() => setConfirmOpen(true)}
        >
          {labels.endButton}
        </button>
      </div>
    );
  }

  // 회의록·공유 단계는 머리(제목·배너)를 본문 안에 직접 그린다 — 틀의 제목 줄을 비우고
  // 창 이름은 ariaLabel 로 준다. 진행 단계만 틀의 제목 줄(제목 + 부제)을 쓴다.
  const headerless = isRecord || isShare;
  const headerlessLabel = isShare ? shareData?.labels?.title : recordData?.labels?.title;

  // 공용 창 틀(ModalShell)로 그린다 (PW-836). Esc·닫기 X 는 onClose, 막 클릭은 caller 의
  // onOverlayClick(녹음 중엔 닫지 않고 미니 위젯으로 접기)이 있으면 그것, 없으면 onClose.
  // 종료 확인 창이 위에 떠 있을 때의 Esc 는 확인 창의 몫이다 — 틀이 공용 확인 창
  // (.pw-confirm-overlay)을 보면 밑의 창을 닫지 않고, 확인 창이 Esc 를 취소로 받는다.
  return (
    <>
      <ModalShell
        title={headerless ? undefined : labels.title}
        description={headerless ? undefined : subtitle}
        titleId={headerless ? undefined : 'mtg-progress-title'}
        ariaLabel={headerless ? headerlessLabel : undefined}
        closeLabel={labels.close}
        onClose={() => onClose?.()}
        onOverlayClick={onOverlayClick ?? undefined}
        footer={footer}
        zIndex={9000}
        className="mtg-progress-shell"
        contentClassName="mtg-progress-shell-content"
        bodyClassName="mtg-progress-shell-body"
      >
        {isShare ? (
          <MeetingShareContent
            ref={shareContentRef}
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
            {participants.length > 0 && (
              <div className="mtg-progress-participants">
                {participants.map((p) => (
                  <StatusBadge key={p} className="mtg-progress-pill">{p}</StatusBadge>
                ))}
              </div>
            )}

            {mode === 'record' && !recordingStopped && (
              <div className="mtg-progress-rec-card">
                <div className="mtg-progress-rec-who">
                  {recorderAvatar ? (
                    <img
                      className="mtg-progress-rec-avatar"
                      src={assetUrl(baseUrl, recorderAvatar)}
                      alt=""
                    />
                  ) : (
                    <span className="mtg-progress-rec-avatar" aria-hidden="true" />
                  )}
                  <span className="mtg-progress-rec-name">
                    <b>{recorderName}</b>{labels.recordingSuffix}
                  </span>
                </div>
                <span className="mtg-progress-rec-time">{timer}</span>
                <div className="mtg-progress-rec-wave" aria-hidden="true" ref={waveRef}>
                  {[5, 5, 20, 12, 9, 12].map((h, i) => (
                    <span key={i} style={{ height: `${h}px` }} />
                  ))}
                </div>
              </div>
            )}

            {mode === 'record' && recordingStopped && (
              <div className="mtg-progress-rec-card is-stopped">
                <span className="mtg-progress-rec-time-sm">{timer}</span>
                <span className="mtg-progress-rec-stopped">{labels.recordingStoppedText}</span>
              </div>
            )}

            <section className={`mtg-progress-section ${mode === 'memo' ? 'is-memo-only' : ''}`}>
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
          </>
        )}
      </ModalShell>

      {confirmOpen && (
        <MeetingEndConfirmModal
          labels={labels.endConfirm}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            onEnd?.();
          }}
        />
      )}
    </>
  );
}
