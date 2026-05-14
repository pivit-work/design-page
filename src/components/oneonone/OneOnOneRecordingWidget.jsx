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
 *   - onStop       : "종료" 버튼 클릭 콜백
 *   - variant      : 'sticky' (기본) | 'pip' — pip 은 위치 고정 스타일 제거
 */

const DEFAULT_WAVE = [5, 5, 14, 9, 9, 12];

export default function OneOnOneRecordingWidget({
  member,
  meetingTime,
  elapsed,
  wave,
  onStop,
  variant = 'sticky',
}) {
  const bars = wave && wave.length > 0 ? wave : DEFAULT_WAVE;
  return (
    <div className={`ono-start-rec-wrap ${variant === 'pip' ? 'is-pip' : ''}`}>
      <div className="ono-start-rec-mini">
        <div className="ono-start-rec-head">
          <p className="ono-start-rec-title">1on1 녹음 중...</p>
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
          <button type="button" className="ono-start-rec-stop" onClick={onStop}>
            종료
          </button>
        </div>
      </div>
    </div>
  );
}
