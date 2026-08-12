import { memberPalette } from './constants.js';
import { healthTier } from './snippetHealth.js';

/**
 * SnippetBlock — 간트 일 뷰에서 "이 사람이 이 시각에 스니핏을 썼다" 를 나타내는 블록.
 *
 * 시각 사양은 디자이너가 이미 정의해 둔 `.tl-snippet`(timeline.css,
 * Figma "_Calendar event / Day and week view")을 그대로 쓴다:
 *   배경 = 멤버 팔레트 bg(50) / hover bgHover(100) / 테두리 border(200)
 *   본문 = titleText(700), 시각 라벨 = timeText(600)
 * 색은 멤버 색을 그대로 물려받아, 같은 행의 미팅 블록·이름 컬럼과 한 색으로 읽힌다.
 *
 * 위치는 "작성 시각" 이다. 스니핏은 미팅처럼 시작~종료 구간이 아니라 한 시점의
 * 기록이므로, 블록 왼쪽 모서리가 작성 시각에 정확히 걸리고 폭은 한 시간 칸으로
 * 고정한다(칸 안에 본문이 읽힐 만큼은 필요).
 *
 * Props:
 *   snippet  { id, text, timeLabel, health, ... }
 *   member   멤버 객체 (color 키 보유)
 *   left/top/width/height  그리드 본문 좌표(px)
 *   onClick  (snippet, rect) — 상세 모달을 여는 콜백
 */
export default function SnippetBlock({ snippet, member, left, top, width, height, onClick }) {
  const palette = memberPalette(member);
  const hasHealth = typeof snippet.health === 'number' && !Number.isNaN(snippet.health);

  return (
    <button
      type="button"
      className="tl-snippet tl-snippet-block"
      style={{
        left,
        top,
        width,
        height,
        borderColor: palette.border,
        color: palette.titleText,
        '--snip-bg': palette.bg,
        '--snip-bg-hover': palette.bgHover,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(snippet, e.currentTarget.getBoundingClientRect());
      }}
      aria-label={`${member?.name ?? ''} 스니핏 ${snippet.timeLabel ?? ''} 작성`.trim()}
    >
      <span className="tl-snippet-block-inner">
        <span className="tl-snippet-block-head">
          <svg
            className="tl-snippet-block-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M14 3v4a1 1 0 0 0 1 1h4" />
            <path d="M19 8v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7z" />
            <path d="M9 12h6M9 16h4" />
          </svg>
          {snippet.timeLabel && (
            <span className="tl-snippet-block-time" style={{ color: palette.timeText }}>
              {snippet.timeLabel}
            </span>
          )}
          {hasHealth && (
            <span
              className={`tl-snippet-block-health tl-snippet-block-health--${healthTier(snippet.health)}`}
              aria-hidden
            />
          )}
        </span>
        <span className="tl-snippet-text">{snippet.text}</span>
      </span>
    </button>
  );
}
