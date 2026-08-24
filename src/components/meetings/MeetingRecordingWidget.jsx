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
 */
export default function MeetingRecordingWidget({
  meeting,
  elapsed,
  baseUrl = '',
  labels,
  onStop,
  onExpand,
}) {
  const waveRef = useRef(null);
  // 위젯이 떠 있는 동안 = 녹음 중 — 항상 실시간 파형.
  useMicWave(waveRef, { enabled: true, barCount: 6, minPx: 3, maxPx: 14 });

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
    </div>,
    document.body
  );
}
