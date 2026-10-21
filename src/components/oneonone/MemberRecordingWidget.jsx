import { createPortal } from 'react-dom';
import StatusBadge from '../shared/StatusBadge.jsx';
import { MaximizeIcon } from './OneOnOneRecordingWidget.jsx';

/**
 * 멤버(대상자) 쪽 녹음 상태 위젯 — Figma 17556:25936 (네 단계).
 *
 * 매니저 위젯(`OneOnOneRecordingWidget`)과 같은 틀이지만 **누르는 것이 없다.** 녹음의 시작·일시정지·
 * 종료는 매니저(퍼실리테이터)만 할 수 있고 멤버에게는 「녹취 중」 표시만 보인다
 * (policy §11.1 · §5.3). 그래서 종료·일시정지 버튼을 prop 으로도 받지 않는다 — 받으면 그 버튼이
 * 멤버 화면에 새어 나온다.
 *
 * 단계(`status`):
 *  - waiting   매니저가 아직 시작하지 않음 — 시계 `--:--` · 납작한 파형
 *  - recording 녹음 중 — 경과 시계 · 정지 파형(멤버에게는 마이크가 없어 실시간 파형을 그리지 않는다)
 *  - recorded  녹음 끝 · 매니저가 완료 처리 중 — 파란 안내
 *  - saved     녹음 저장 끝 · AI 분석 중 — 초록 안내
 *
 * variant: 'overlay'(기본 · 본문 카드 오른쪽 위에 겹쳐 뜸) | 'mini'(다른 탭·페이지로 갔을 때 오른쪽 아래 · body 포털).
 * `onExpand` 가 있으면 우상단 펼치기를 그린다 — 매니저 미니 위젯과 같은 모서리·같은 모양.
 */
const WAVE_FLAT = [5, 5, 5, 5, 5, 5];
const WAVE_RECORDING = [5, 20, 14, 10, 7, 5];

const DEFAULT_LABELS = {
  waitingTitle: '매니저가 미팅을 아직 시작하지 않았습니다',
  recordingTitle: '원온원 녹음 중',
  recordedTitle: '녹음 완료',
  savedTitle: '녹음 저장 완료 - AI 분석 중',
  finishingSub: '매니저가 미팅을 완료 처리 중입니다',
  recordedNote: '완료 처리 후 AI가 녹음을 분석해 요약을 생성합니다.',
  savedNote: '잠시 후 AI 요약 및 액션아이템이 생성되어 DONE 화면에 표시됩니다.',
  noClock: '--:--',
  expand: '내 원온원으로 돌아가기',
};

export default function MemberRecordingWidget({
  status = 'waiting',
  manager,
  meetingTime,
  elapsed,
  recordedAt,
  variant = 'overlay',
  onExpand,
  labels: providedLabels,
}) {
  const L = { ...DEFAULT_LABELS, ...(providedLabels ?? {}) };
  const isClock = status === 'waiting' || status === 'recording';
  const title =
    status === 'waiting' ? L.waitingTitle
    : status === 'recording' ? L.recordingTitle
    : status === 'recorded' ? `${L.recordedTitle}${recordedAt ? ` - ${recordedAt}` : ''}`
    : L.savedTitle;
  const bars = status === 'recording' ? WAVE_RECORDING : WAVE_FLAT;

  const node = (
    <div
      className={`ono-start-rec-wrap ono-my-widget ${variant === 'mini' ? 'is-mini' : 'is-overlay'}`}
      data-testid="ono-my-widget"
      data-status={status}
    >
      <div className="ono-start-rec-mini">
        {onExpand && (
          <button type="button" className="ono-start-rec-expand" aria-label={L.expand} title={L.expand} onClick={onExpand}>
            <MaximizeIcon />
          </button>
        )}
        <div className="ono-start-rec-head">
          <p className="ono-start-rec-title">{title}</p>
          {!isClock && <p className="ono-my-widget-sub">{L.finishingSub}</p>}
          <div className="ono-start-rec-member">
            <div className="ono-start-rec-avatar">{manager?.avatar && <img src={manager.avatar} alt="" />}</div>
            <div className="ono-start-rec-member-info">
              <div className="ono-start-rec-name-row">
                <span className="ono-start-rec-name">{manager?.name ?? ''}</span>
                {manager?.badge && <StatusBadge className="ono-start-rec-badge">{manager.badge}</StatusBadge>}
              </div>
              {meetingTime && <span className="ono-start-rec-time">{meetingTime}</span>}
            </div>
          </div>
        </div>
        {isClock ? (
          <div className="ono-start-rec-bar">
            <div className="ono-start-rec-timer">
              <span className="ono-start-rec-elapsed">{status === 'waiting' ? L.noClock : elapsed ?? '00:00'}</span>
              <div className="ono-start-rec-wave" aria-hidden="true">
                {bars.map((h, i) => (
                  <span key={i} style={{ height: `${h}px` }} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className={`ono-my-widget-note${status === 'saved' ? ' is-saved' : ''}`} role="status">
            {status === 'saved' ? L.savedNote : L.recordedNote}
          </p>
        )}
      </div>
    </div>
  );
  if (variant === 'mini' && typeof document !== 'undefined') return createPortal(node, document.body);
  return node;
}
