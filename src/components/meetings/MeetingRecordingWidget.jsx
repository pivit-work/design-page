import { useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';
import useMicWave from '../shared/useMicWave.js';

/**
 * MeetingRecordingWidget — 회의 진행 중 모달을 dimmed 클릭으로 닫았을 때
 * 우측 하단에 뜨는 녹음 유지 미니 위젯. Figma 16817:40938 (241px).
 *
 * 녹음은 계속되는 상태 — 타이틀 + 회의명/태그/참석자 + 타이머(mm:ss) +
 * 실시간 마이크 파형 + [종료]. 우상단 maximize 아이콘으로 모달 복귀.
 *
 * 데이터/라벨은 caller 주입: meeting { title, participants }, labels
 * { title, tag, stop, expand }. elapsed 는 "04:29" 포맷 문자열.
 *
 * ## 1on1 이 함께 쓴다 (PW-578)
 *
 * 원온원도 「앱 안 다른 메뉴로 이동했을 때」 같은 틀을 쓰기로 정해졌다
 * (`screen-oneonone-session.policy.md` §5.7.3 「위치·크기」 · David 2026-09-06).
 * 새 틀을 만들지 않기 위해 이 컴포넌트에 **선택 prop 둘**을 더한다 —
 * 둘 다 안 주면 회의록이 쓰던 화면 그대로다.
 *
 * - `recording` — `false` 면 타이머·파형·[종료] 줄 자체를 그리지 않는다. 원온원의
 *   「녹음 없이 진행하는 회차」(policy §5.0 T4)가 그 상태다. 녹음이 없는데 녹음 줄을
 *   그리면 위젯이 사실이 아닌 것을 말한다.
 * - `guide` — 위젯 **아래 한 줄**로 붙는 대화 내비게이터(policy §5.7.4 (ㄱ) 「한 몸」).
 *   `{ stageLabel, stageIndex, stageCount, paceText, nextLabel, closeLabel,
 *      onNext, onClose }`. 스크립트 전문은 **여기 넣지 않는다**(N1) — 담는 것은
 *   현재 단계 제목과 `n / 7`, 늦었을 때의 페이스 한 줄, 「다음」, 줄을 닫는 `×` 뿐이다.
 *   경과 시계는 녹음 줄이 이미 보이므로 **한 번만** 보인다(§5.7.3).
 */
export default function MeetingRecordingWidget({
  meeting,
  elapsed,
  baseUrl = '',
  labels,
  onStop,
  onExpand,
  recording = true,
  guide = null,
}) {
  const waveRef = useRef(null);
  // 녹음 줄이 있는 동안 = 녹음 중 — 그때만 실시간 파형을 돌린다.
  useMicWave(waveRef, { enabled: recording, barCount: 6, minPx: 3, maxPx: 14 });

  const participants = Array.isArray(meeting?.participants)
    ? meeting.participants
    : String(meeting?.participants ?? '').split(/[·,]/).map((s) => s.trim()).filter(Boolean);

  return createPortal(
    <div className="mtg-rec-widget">
      <button type="button" className="mtg-rec-widget-expand" aria-label={labels.expand} onClick={onExpand}>
        {/* fg-quaternary 는 이 토큰 셋에서 #f9fafb(거의 흰색)라 배경에 묻힌다 — fg-tertiary 사용 */}
        <Icon src="/icons-solid/maximize-01.svg" size={20} color="var(--fg-tertiary)" baseUrl={baseUrl} />
      </button>
      <div className="mtg-rec-widget-head">
        <p className="mtg-rec-widget-title">{labels.title}</p>
        <div className="mtg-rec-widget-meta">
          <div className="mtg-rec-widget-name-row">
            <span>{meeting?.title}</span>
            <span className="mtg-rec-widget-tag">{labels.tag}</span>
          </div>
          <div className="mtg-rec-widget-people">
            {participants.map((p, i) => (
              <span key={p}>{i > 0 && '• '}{p}</span>
            ))}
          </div>
        </div>
      </div>
      {recording && (
        <div className="mtg-rec-widget-bar">
          <div className="mtg-rec-widget-timer">
            <span className="mtg-rec-widget-time">{elapsed}</span>
            <div className="mtg-rec-widget-wave" aria-hidden="true" ref={waveRef}>
              {[5, 5, 14, 9, 9, 12].map((h, i) => (
                <span key={i} style={{ height: `${h}px` }} />
              ))}
            </div>
          </div>
          <button type="button" className="mtg-rec-widget-stop" onClick={onStop}>{labels.stop}</button>
        </div>
      )}
      {guide && (
        <div className="mtg-rec-widget-guide" data-testid="mtg-rec-widget-guide">
          <div className="mtg-rec-widget-guide-head">
            <span className="mtg-rec-widget-guide-stage">{guide.stageLabel}</span>
            <span className="mtg-rec-widget-guide-count">
              {guide.stageIndex} / {guide.stageCount}
            </span>
            {guide.onClose && (
              <button
                type="button"
                className="mtg-rec-widget-guide-close"
                aria-label={guide.closeLabel}
                onClick={guide.onClose}
              >
                <Icon src="/icons-solid/x-close.svg" size={14} color="var(--fg-tertiary)" baseUrl={baseUrl} />
              </button>
            )}
          </div>
          {/* 늦었을 때만 뜬다 — 제때 가고 있을 때 매번 말하면 아무도 안 읽는다. */}
          {guide.paceText && (
            <p className="mtg-rec-widget-guide-pace" role="status">{guide.paceText}</p>
          )}
          {guide.onNext && (
            <button
              type="button"
              className="mtg-rec-widget-guide-next"
              onClick={guide.onNext}
              disabled={guide.nextDisabled}
            >
              {guide.nextLabel}
              <Icon src="/icons-solid/chevron-right.svg" size={14} color="currentColor" baseUrl={baseUrl} />
            </button>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}
