import Button from './Button.jsx';
import Spinner from './Spinner.jsx';
import RecordingPlayerRow from './RecordingPlayerRow.jsx';
import { CloseGlyph, ExpandScreenGlyph, MinusGlyph, PauseGlyph, PlayGlyph, ShrinkScreenGlyph } from './lineIcons.jsx';

/**
 * 튜토리얼 영상 창 (pivit-work PW-2430) — 화면 오른쪽 아래에 떠서 «보면서 따라 하기».
 *
 * 모양만 그린다. 영상 주소·재생 상태·위치는 호출부가 쥔다. 소리를 내는 `<video>` 는 호출부가 `video` 로
 * 넣고, 세 모양(펼침·접힘·크게) 사이에서 **같은 자리에 그대로 둔다** — 모양이 바뀔 때 영상이 다시
 * 불려 처음부터 돌지 않게. 접힘에서는 영상 자리만 숨기고 재생은 계속된다.
 * 셸은 회의 녹음 위젯(`.mtg-rec-widget`), 조작 줄은 공용 녹음 재생기(`RecordingPlayerRow`).
 * 규격: pivit-specs `8. onboarding/screen-tutorial-help.policy.md` §2.3·§3·§4.
 *
 * @param {object} props
 * @param {'open'|'mini'|'big'} props.mode
 * @param {string} props.title
 * @param {boolean} [props.narrow]        화면 폭 1024 미만 — 창 폭 320
 * @param {{right:number,bottom:number}} props.place  펼침·접힘일 때 화면 오른쪽·아래에서 띄운 거리(px)
 * @param {Function} [props.onHeadPointerDown]  머리를 잡아 끌기 시작(펼침에서만)
 * @param {React.ReactNode} props.video   `<video>` 요소
 * @param {'loading'|'error'|'ended'|'ready'} props.status
 * @param {boolean} props.playing
 * @param {number|null} props.progress    0~1
 * @param {string} props.timeText         «0:12 / 0:38»
 * @param {string} props.speedText        «1×»
 * @param {Function} props.onToggle · onSeek(ratio) · onSpeed · onRetry · onReplay · onMode(mode) · onClose
 * @param {object} props.labels  { collapse, expand, shrink, close, reopen, play, pause, seek, speed, error, retry, replay, loading }
 */
export default function TutorialVideoDock({
  mode,
  title,
  narrow = false,
  place,
  onHeadPointerDown,
  video,
  status,
  playing,
  progress,
  timeText,
  speedText,
  onToggle,
  onSeek,
  onSpeed,
  onRetry,
  onReplay,
  onMode,
  onClose,
  labels = {},
}) {
  const big = mode === 'big';
  const mini = mode === 'mini';
  const cls = ['tvh-dock', `is-${mode}`, narrow && !big ? 'is-narrow' : ''].filter(Boolean).join(' ');
  const style = big ? undefined : { right: place.right, bottom: place.bottom };
  const disabled = status === 'loading' || status === 'error';

  return (
    <>
      {big && <div className="tvh-big-scrim" aria-hidden data-testid="tutorial-dock-scrim" />}
      <div
        className={cls}
        style={style}
        role="dialog"
        aria-modal={big ? 'true' : undefined}
        aria-label={title}
        data-testid="tutorial-dock"
        data-mode={mode}
      >
        {mini && (
          <Button
            className="tvh-dock-pill"
            aria-label={labels.reopen}
            onClick={() => onMode('open')}
            data-testid="tutorial-dock-pill"
          >
            <span className="tvh-dock-pill-icon">{playing ? <PauseGlyph size={14} /> : <PlayGlyph />}</span>
            <span className="tvh-dock-pill-title">{title}</span>
            <span className="tvh-dock-pill-time">· {timeText}</span>
          </Button>
        )}
        <div
          className="tvh-dock-head"
          onPointerDown={big ? undefined : onHeadPointerDown}
          data-testid="tutorial-dock-head"
        >
          <span className="tvh-dock-title" data-testid="tutorial-dock-title">
            {title}
          </span>
          {!big && (
            <Button
              className="tvh-dock-icon"
              aria-label={labels.collapse}
              title={labels.collapse}
              onClick={() => onMode('mini')}
              data-testid="tutorial-dock-collapse"
            >
              <MinusGlyph size={16} />
            </Button>
          )}
          <Button
            className="tvh-dock-icon"
            aria-label={big ? labels.shrink : labels.expand}
            title={big ? labels.shrink : labels.expand}
            onClick={() => onMode(big ? 'open' : 'big')}
            data-testid="tutorial-dock-size"
          >
            {big ? <ShrinkScreenGlyph size={16} /> : <ExpandScreenGlyph size={16} />}
          </Button>
          <Button
            className="tvh-dock-icon"
            aria-label={labels.close}
            title={labels.close}
            onClick={onClose}
            data-testid="tutorial-dock-close"
          >
            <CloseGlyph size={16} />
          </Button>
        </div>
        <div className="tvh-dock-video" onContextMenu={(e) => e.preventDefault()}>
          {video}
          {status === 'loading' && (
            <div className="tvh-dock-cover" aria-busy="true" aria-label={labels.loading} data-testid="tutorial-dock-loading">
              <Spinner size={24} />
            </div>
          )}
          {status === 'error' && (
            <div className="tvh-dock-cover is-error" role="alert" data-testid="tutorial-dock-error">
              <span className="tvh-dock-error-text">{labels.error}</span>
              <Button variant="secondary" size="sm" onClick={onRetry} data-testid="tutorial-dock-retry">
                {labels.retry}
              </Button>
            </div>
          )}
          {status === 'ended' && (
            <div className="tvh-dock-cover is-ended" data-testid="tutorial-dock-ended">
              <Button variant="secondary" onClick={onReplay} data-testid="tutorial-dock-replay">
                {labels.replay}
              </Button>
            </div>
          )}
        </div>
        <RecordingPlayerRow
          className={disabled ? 'is-disabled' : ''}
          playing={playing}
          onToggle={onToggle}
          toggleDisabled={disabled}
          progress={progress}
          onSeek={onSeek}
          timeText={timeText}
          labels={{ play: labels.play, pause: labels.pause, seek: labels.seek }}
          testIdPrefix="tutorial-dock"
        >
          <Button
            variant="secondary"
            size="sm"
            aria-label={labels.speed}
            onClick={onSpeed}
            disabled={disabled}
            data-testid="tutorial-dock-speed"
          >
            {speedText}
          </Button>
        </RecordingPlayerRow>
      </div>
    </>
  );
}
