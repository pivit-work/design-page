import { useRef } from 'react';
import useMicWave from '../shared/useMicWave.js';

/**
 * 1on1 진행 중 녹음 미니 위젯 — Figma 16972:15514.
 *
 * StartOneOnOneView 내부의 sticky 위젯으로도, pivit-work 등에서 다른 탭으로
 * 이동 시 Document Picture-in-Picture 창으로도 동일 마크업을 재사용한다.
 *
 * props:
 *   - member       : { name, avatar, badge? }
 *   - meetingTime  : "2026.04.08 · 11:00 ~" 같은 시작 시각 라벨 (선택)
 *   - elapsed      : "04:29" 포맷 경과 시간 문자열. 외부에서 타이머로 갱신.
 *   - wave         : 파형 막대 높이 배열 (선택). 지정 시 실시간 마이크 분석 대신
 *                    이 값을 그대로 그린다 (호스트가 자체 오디오 파이프라인을
 *                    가진 경우).
 *   - paused       : 녹음 일시정지 여부. true 면 제목·타이머·파형이 정지 색으로 바뀌고
 *                    「재개」 버튼과 안내 문구가 뜬다.
 *   - onPause      : "일시정지" 버튼 클릭 콜백. 없으면 일시정지 버튼 자체를 그리지
 *                    않는다 (일시정지를 지원하지 않는 소비처의 기존 화면 유지).
 *   - onResume     : "재개" 버튼 클릭 콜백
 *   - onStop       : "종료" 버튼 클릭 콜백
 *   - variant      : 'sticky' (기본) | 'pip' — pip 은 위치 고정 스타일 제거
 *   - notice       : 녹음 바 아래에 한 줄로 덧붙일 안내(문자열 또는 노드). 없으면
 *                    그 줄 자체를 그리지 않는다. 문구·노출 조건은 소비처가 쥔다 —
 *                    이 컴포넌트는 「어떻게 보이는가」만 정한다.
 *   - idle         : 마이크를 잡고 있지 않은 상태. 녹음 바(제목·경과·파형·일시정지·
 *                    종료)를 통째로 그리지 않고 `notice` 줄만 남긴다. `notice` 도
 *                    `onStart` 도 없으면 **아무것도 그리지 않는다**.
 *
 *                    화면이 「녹음 중」이라고 말하는 동안에는 실제로 마이크가 열려
 *                    있어야 한다 (기획 policy §5.4.4 R1). 새로고침·탭 재진입으로
 *                    되살린 회차에는 마이크가 없는데, 회차가 진행 중이라는 이유로
 *                    이 위젯을 그리면 화면이 사실이 아닌 것을 말하게 된다.
 *   - onStart      : `idle` 일 때 안내 줄 안에 그리는 다시 시작 버튼의 콜백. 없으면
 *                    버튼 자체를 그리지 않는다 — 눌러도 아무 일이 없는 버튼은 「녹음이
 *                    안 되는구나」를 더 헷갈리게 만든다.
 *   - startLabel   : 그 버튼의 문구. 로케일은 소비처에 있다.
 *   - onNoticeClose: 안내를 닫는 콜백. 없으면 닫기 버튼을 그리지 않는다.
 *   - closeLabel   : 닫기 버튼의 접근성 이름.
 *
 * 이퀄라이저: wave prop 이 없으면 마이크 입력을 AnalyserNode 로 분석해 6개
 * 막대 높이를 실시간(rAF) 반영한다. 마이크 권한이 없으면 CSS 데모 애니메이션
 * 폴백이 그대로 남는다.
 */

// 기본 정적 패턴 — Figma 16817:40677 (막대 4×h, 최대 20px)
export const DEFAULT_WAVE = [5, 5, 20, 12, 9, 12];
// 마이크 분석/튜닝(게이트·게인)은 shared/useMicWave.js 로 옮겼다 —
// 회의 진행 중 모달 등 다른 소비처와 공유한다.
export { default as useMicWave } from '../shared/useMicWave.js';

/* 일시정지 — 세로 막대 둘. 색은 부모의 currentColor 를 상속한다. */
function PauseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="9" y1="5" x2="9" y2="19" />
      <line x1="15" y1="5" x2="15" y2="19" />
    </svg>
  );
}

/* 재개 — 삼각형. fill 도 currentColor 라 상태 색을 그대로 따른다. */
function ResumeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 4.5 19 12 7 19.5Z" />
    </svg>
  );
}

export default function OneOnOneRecordingWidget({
  member,
  meetingTime,
  elapsed,
  wave,
  paused = false,
  onPause,
  onResume,
  onStop,
  variant = 'sticky',
  notice = null,
  idle = false,
  onStart,
  startLabel = '녹음 다시 시작',
  onNoticeClose,
  closeLabel = '안내 닫기',
}) {
  const bars = wave && wave.length > 0 ? wave : DEFAULT_WAVE;
  // 실시간 마이크 이퀄라이저 — 호스트가 wave 를 직접 주면 그 값을 존중한다.
  // 🔴 `idle` 에서는 켜지 않는다. 마이크가 없는 화면에서 분석기를 열면 브라우저가
  // 권한 프롬프트를 예고 없이 띄우고, 파형은 어차피 그리지 않는다.
  const waveRef = useRef(null);
  useMicWave(waveRef, {
    enabled: !idle && (!wave || wave.length === 0),
    paused,
  });
  // 일시정지 토글은 소비처가 콜백을 준 경우에만 노출한다 — 콜백 없이 버튼만 뜨면
  // 눌러도 아무 일이 없어 "녹음이 멈췄나?" 를 더 헷갈리게 만든다.
  const canPause = !!onPause || !!onResume;

  // 마이크가 없는 화면 — 남기는 것은 안내 한 줄과 다시 시작 버튼뿐이다. 제목·경과·
  // 파형·종료를 여기서 그리면 그 자체가 「녹음 중」이라는 주장이 된다(R1).
  //
  // 할 말도 할 일도 없으면 **아무것도 그리지 않는다.** 빈 카드는 「무언가 있었는데
  // 비었다」로 읽히고, 잃은 것이 없는 회차(녹음을 아예 시작하지 않은 회차)에까지
  // 자리를 남기면 그 자리가 곧 일상이 된다.
  if (idle && !notice && !onStart) return null;

  if (idle) {
    return (
      <div className={`ono-start-rec-wrap ${variant === 'pip' ? 'is-pip' : ''}`}>
        <div className="ono-start-rec-mini is-idle" data-testid="ono-rec-idle">
          <div className="ono-start-rec-notice is-actionable" role="status">
            <span className="ono-start-rec-notice-text">{notice}</span>
            <div className="ono-start-rec-notice-actions">
              {onStart && (
                <button
                  type="button"
                  className="ono-start-rec-restart"
                  onClick={onStart}
                >
                  {startLabel}
                </button>
              )}
              {onNoticeClose && (
                <button
                  type="button"
                  className="ono-start-rec-notice-close"
                  aria-label={closeLabel}
                  onClick={onNoticeClose}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`ono-start-rec-wrap ${variant === 'pip' ? 'is-pip' : ''}`}
    >
      <div className={`ono-start-rec-mini ${paused ? 'is-paused' : ''}`}>
        <div className="ono-start-rec-head">
          <p className="ono-start-rec-title">
            {paused ? '1on1 녹음 일시정지됨' : '1on1 녹음 중...'}
          </p>
          <div className="ono-start-rec-member">
            <div className="ono-start-rec-avatar">
              {member?.avatar && <img src={member.avatar} alt="" />}
            </div>
            <div className="ono-start-rec-member-info">
              <div className="ono-start-rec-name-row">
                <span className="ono-start-rec-name">{member?.name ?? ''}</span>
                {member?.badge && (
                  <span className="ono-start-rec-badge">{member.badge}</span>
                )}
              </div>
              {meetingTime && (
                <span className="ono-start-rec-time">{meetingTime}</span>
              )}
            </div>
          </div>
        </div>
        <div className="ono-start-rec-bar">
          <div className="ono-start-rec-timer">
            <span className="ono-start-rec-elapsed">{elapsed ?? '00:00'}</span>
            <div className="ono-start-rec-wave" ref={waveRef}>
              {bars.map((h, i) => (
                <span key={i} style={{ height: `${h}px` }} />
              ))}
            </div>
          </div>
          {canPause && (
            <button
              type="button"
              className="ono-start-rec-pause"
              aria-label={paused ? '녹음 재개' : '녹음 일시정지'}
              aria-pressed={paused}
              onClick={paused ? onResume : onPause}
            >
              {paused ? <ResumeIcon /> : <PauseIcon />}
            </button>
          )}
          <button type="button" className="ono-start-rec-stop" onClick={onStop}>
            종료
          </button>
        </div>
        {/* 아이콘만 바뀌면 녹음이 계속되는 줄 알고 자리를 뜬다 — 글로도 알린다. */}
        {paused && (
          <p className="ono-start-rec-paused-note" role="status">
            녹취가 일시정지되었습니다.
          </p>
        )}
        {/* 녹음이 아직 이 브라우저에만 있다는 사전 고지. 브라우저의 이탈 확인창은
            자기 문구를 띄우고 커스텀 메시지를 무시하므로, "무엇을 잃는가" 는 화면이
            미리 말해야 닿는다. 문구는 소비처가 준다(로케일이 소비처에 있다). */}
        {notice && (
          <p className="ono-start-rec-notice" role="status">
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}
