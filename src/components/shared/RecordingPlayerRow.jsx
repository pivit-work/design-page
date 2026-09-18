/**
 * RecordingPlayerRow — 녹음 재생기 한 줄. 회의록·1on1 이 같은 부품을 쓴다.
 *
 * 담는 것은 기획서 시안(`1on1-app.jsx` 의 `RecordingPlayerRow`)이 정한다:
 * ▶ 재생/일시정지 · 진행 바 · 「경과 / 전체」 · 우측 「녹음 보관 D-n」, 그리고
 * 녹음이 없거나 지워졌을 때 **자리를 남긴 채** 바꿔 넣는 안내 한 줄.
 *
 * 생김새는 이 저장소 공용 규칙을 따른다 — 진행 바는 `.rsx-slider` 와 같은 방식으로
 * 네이티브 range 를 투명하게 덮고 트랙·볼을 직접 그려, 브라우저 기본 파란 썸 대신
 * brand 색으로 보인다. 스타일은 `recording-player.css`.
 *
 * ## 이 부품이 «모르는» 것
 *
 * 소리를 어떻게 여는지(주소 발급·만료·실패)는 화면마다 다르므로 여기 없다. 호스트가
 * `<audio>` 요소를 `children` 으로 넣고, 재생 상태·진행률·시간 글자를 prop 으로 준다.
 *
 * @param {object}   props
 * @param {string}   [props.notice]        값이 있으면 재생기 대신 이 안내 한 줄을 그린다.
 * @param {boolean}  [props.playing]       재생 중인가 — 버튼 모양과 aria-label 을 가른다.
 * @param {Function} [props.onToggle]      ▶ / ❚❚ 를 눌렀을 때.
 * @param {boolean}  [props.toggleDisabled] 주소를 받아오는 중 등 — 버튼을 잠근다.
 * @param {number|null} [props.progress]   진행률 0~1. `null` 이면 총 길이를 모르는 것.
 * @param {Function} [props.onSeek]        진행 바를 끌었을 때. 0~1 비율로 준다.
 * @param {string}   [props.timeText]      「0:12 / 15:32」 — 글자 조립은 호스트 몫이다.
 * @param {string}   [props.retentionText] 「녹음 보관 D-88」. 없으면 그 자리를 안 그린다.
 * @param {object}   [props.labels]        `{ play, pause, seek }` — 화면 낱말은 호스트가 준다.
 * @param {string}   [props.testIdPrefix]  `data-testid` 앞머리.
 * @param {string}   [props.noticeTestId]  안내 한 줄의 `data-testid` — 화면마다 사연(없음·만료)이
 *                                        달라 이름을 따로 주고 싶을 때만.
 * @param {React.ReactNode} [props.children] 소리를 내는 `<audio>` 요소.
 */
export default function RecordingPlayerRow({
  notice,
  playing = false,
  onToggle,
  toggleDisabled = false,
  progress = null,
  onSeek,
  timeText = '',
  retentionText,
  labels = {},
  testIdPrefix = 'recording',
  noticeTestId,
  children,
}) {
  if (notice) {
    return (
      <div
        className="rec-player is-notice"
        role="status"
        data-testid={noticeTestId ?? `${testIdPrefix}-notice`}
      >
        {notice}
      </div>
    );
  }

  const unknown = progress == null;
  const ratio = unknown ? 0 : Math.min(1, Math.max(0, progress));

  return (
    <div className="rec-player" data-testid={`${testIdPrefix}-player`}>
      <button
        type="button"
        className="rec-player-toggle"
        onClick={onToggle}
        disabled={toggleDisabled}
        aria-label={playing ? labels.pause : labels.play}
        data-testid={`${testIdPrefix}-toggle`}
      >
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M9 5v14M15 5v14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M7 4.5v15l13-7.5-13-7.5Z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      <span className={`rec-player-seek${unknown ? ' is-unknown' : ''}`}>
        <span className="rec-player-seek-track" aria-hidden>
          <i style={{ width: `${ratio * 100}%` }} />
        </span>
        <span
          className="rec-player-seek-ball"
          style={{ left: `${ratio * 100}%` }}
          aria-hidden
        />
        <input
          type="range"
          min={0}
          max={1000}
          step={1}
          value={Math.round(ratio * 1000)}
          onChange={(e) => onSeek?.(Number(e.target.value) / 1000)}
          disabled={unknown}
          aria-label={labels.seek}
          data-testid={`${testIdPrefix}-seek`}
        />
      </span>

      <span className="rec-player-time" data-testid={`${testIdPrefix}-time`}>
        {timeText}
      </span>
      {retentionText && (
        <span
          className="rec-player-retention"
          data-testid={`${testIdPrefix}-retention`}
        >
          {retentionText}
        </span>
      )}
      {children}
    </div>
  );
}

/**
 * 재생기와 아래 요약을 나누는 가는 선. 기획서가 「카드를 새로 만들지 않고 선으로
 * 나눈다」로 정한 자리다 — 위아래 여백은 감싸는 카드의 `gap` 이 준다.
 */
export function RecordingPlayerDivider() {
  return <div className="rec-player-divider" aria-hidden />;
}
