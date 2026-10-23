import { useEffect, useRef, useState } from 'react';
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
 *
 * overlay 는 **끌어서 옮길 수 있다.** 본문 카드 오른쪽 위에 겹쳐 뜨는 구조라 「준비완료」 안내 줄 뒷부분을
 * 덮는데(1280·1440 모두), 자리를 바꾸는 대신 사용자가 치우게 한다(Jira 1on1 위젯 최소화 티켓 · 2026-10-23).
 * 끌기 시작하는 순간 페이지 틀에서 꺼내 body 에 `position: fixed` 로 띄운다(`is-floating`) — 틀 안에 둔 채로는
 * 틀의 overflow 가 상단 바 위를 잘라내고 사이드바(z 100) 뒤로 들어가서, z-index 를 올려도 소용이 없다.
 * 띄운 뒤에는 스크롤해도 화면의 그 자리에 있고, 창 밖으로 나가 잃어버리지 않게만 막는다.
 * 펼치기 버튼을 누른 것은 끌기로 치지 않는다. 끌기 중 포인터 이벤트는 window 에서 받는다 — 포털로 옮겨지면서
 * DOM 노드가 바뀌어 요소 단위 포인터 캡처가 끊기기 때문이다.
 */
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

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
  const draggable = variant === 'overlay';
  // 띄운 자리(화면 좌표) — null 이면 아직 끌지 않아 카드 오른쪽 위에 흐름대로 붙어 있다
  const [floating, setFloating] = useState(null);
  const [dragging, setDragging] = useState(false);
  const drag = useRef(null);
  const onPointerDown = (e) => {
    if (!draggable || e.button !== 0 || e.target.closest('button, a, input')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current = { x: e.clientX, y: e.clientY, from: { x: rect.left, y: rect.top }, w: rect.width, h: rect.height };
    if (!floating) setFloating({ x: rect.left, y: rect.top });
    setDragging(true);
    e.preventDefault();
  };
  useEffect(() => {
    if (!dragging) return undefined;
    const onMove = (e) => {
      const d = drag.current;
      if (!d) return;
      // 창 밖으로 나가 잃어버리지 않게 — 상자 전체가 창 안에 남는 범위
      setFloating({
        x: clamp(d.from.x + e.clientX - d.x, 0, Math.max(0, window.innerWidth - d.w)),
        y: clamp(d.from.y + e.clientY - d.y, 0, Math.max(0, window.innerHeight - d.h)),
      });
    };
    const onUp = () => { drag.current = null; setDragging(false); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging]);
  const isClock = status === 'waiting' || status === 'recording';
  const title =
    status === 'waiting' ? L.waitingTitle
    : status === 'recording' ? L.recordingTitle
    : status === 'recorded' ? `${L.recordedTitle}${recordedAt ? ` - ${recordedAt}` : ''}`
    : L.savedTitle;
  const bars = status === 'recording' ? WAVE_RECORDING : WAVE_FLAT;

  const node = (
    <div
      className={`ono-start-rec-wrap ono-my-widget ${variant === 'mini' ? 'is-mini' : 'is-overlay'}${floating ? ' is-floating' : ''}`}
      style={floating ? { left: floating.x, top: floating.y } : undefined}
      data-testid="ono-my-widget"
      data-status={status}
    >
      <div
        className={`ono-start-rec-mini${draggable ? ' is-draggable' : ''}${dragging ? ' is-dragging' : ''}`}
        onPointerDown={draggable ? onPointerDown : undefined}
      >
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
  if ((variant === 'mini' || floating) && typeof document !== 'undefined') return createPortal(node, document.body);
  return node;
}
