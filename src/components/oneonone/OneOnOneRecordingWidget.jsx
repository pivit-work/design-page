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
 *   - wave         : 파형 막대 높이 배열 (선택, 기본 정적 패턴)
 *   - paused       : 녹음 일시정지 여부. true 면 제목·타이머·파형이 정지 색으로 바뀌고
 *                    「재개」 버튼과 안내 문구가 뜬다.
 *   - onPause      : "일시정지" 버튼 클릭 콜백. 없으면 일시정지 버튼 자체를 그리지
 *                    않는다 (일시정지를 지원하지 않는 소비처의 기존 화면 유지).
 *   - onResume     : "재개" 버튼 클릭 콜백
 *   - onStop       : "종료" 버튼 클릭 콜백
 *   - variant      : 'sticky' (기본) | 'pip' — pip 은 위치 고정 스타일 제거
 */

const DEFAULT_WAVE = [5, 5, 14, 9, 9, 12];

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
}) {
  const bars = wave && wave.length > 0 ? wave : DEFAULT_WAVE;
  // 일시정지 토글은 소비처가 콜백을 준 경우에만 노출한다 — 콜백 없이 버튼만 뜨면
  // 눌러도 아무 일이 없어 "녹음이 멈췄나?" 를 더 헷갈리게 만든다.
  const canPause = !!onPause || !!onResume;
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
            <div className="ono-start-rec-wave">
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
      </div>
    </div>
  );
}
