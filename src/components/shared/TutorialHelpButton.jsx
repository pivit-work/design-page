import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button.jsx';
import { HelpCircleGlyph, PlayGlyph } from './lineIcons.jsx';
import { placeAnchored } from './anchoredPlacement.js';

/** 말풍선이 뜨기까지·닫히기까지 (pivit-specs `screen-tutorial-help.policy.md` §2.2). */
export const TUTORIAL_TIP_OPEN_MS = 300;
export const TUTORIAL_TIP_CLOSE_MS = 150;
const TIP_GAP = 8;
const TIP_MARGIN = 8;

/**
 * 기능 화면 제목 오른쪽의 «?» 튜토리얼 도움말 버튼 + 말풍선 (pivit-work PW-2430).
 *
 * 0.3초 올리거나 Tab 으로 포커스하면 말풍선(제목 · 짧은 설명 2줄 · «▶ 영상 보기 · 길이»)이 뜨고,
 * 버튼·말풍선 밖으로 나가 0.15초 지나거나 Esc 면 닫힌다. 버튼·말풍선을 누르면(Enter·Space 포함)
 * `onOpen` — 영상 창을 여는 것은 호출부 몫이다. 말풍선은 body 로 띄워 조상의 overflow 에 안 잘린다.
 * 버튼 아래 8 에 뜨고 화면 밖이면 위로 뒤집으며, 좌우는 버튼 가운데 기준으로 화면 안에 밀어 넣는다.
 * 모양은 `tutorial-help.css`.
 *
 * @param {object} props
 * @param {string} props.title           영상 제목(말풍선 줄 1)
 * @param {string} [props.summary]       짧은 설명(줄 2). 없으면 줄을 뺀다
 * @param {string} props.watchText       줄 3 글자 «영상 보기 · 0:38» — 앞의 ▶ 는 그림으로 붙인다. 조립은 호출부가 한다
 * @param {string} props.ariaLabel       «「제목」 튜토리얼 영상 보기»
 * @param {boolean} [props.active]       영상 창에서 이 영상이 재생 중이면 브랜드색을 유지한다
 * @param {Function} props.onOpen
 * @param {string} [props.testId]
 */
export default function TutorialHelpButton({
  title,
  summary,
  watchText,
  ariaLabel,
  active = false,
  onOpen,
  testId = 'tutorial-help',
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const wrapRef = useRef(null);
  const tipRef = useRef(null);
  const openTimer = useRef(null);
  const closeTimer = useRef(null);
  const tipId = useId();

  const clearTimers = () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
  };
  useEffect(() => clearTimers, []);

  const scheduleOpen = () => {
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(true), TUTORIAL_TIP_OPEN_MS);
  };
  const scheduleClose = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), TUTORIAL_TIP_CLOSE_MS);
  };
  const keepOpen = () => clearTimeout(closeTimer.current);
  const close = () => {
    clearTimers();
    setOpen(false);
  };
  const activate = (e) => {
    e?.stopPropagation();
    close();
    onOpen?.();
  };

  // 배치는 ref 콜백에서 한다 — 붙는 순간 크기를 알 수 있고 effect 안 setState 를 만들지 않는다(Tooltip 과 같다).
  const attachTip = useCallback((tip) => {
    tipRef.current = tip;
    const btn = wrapRef.current?.getBoundingClientRect();
    if (!tip || !btn) {
      setPos(null);
      return;
    }
    const vw = window.innerWidth;
    const w = tip.offsetWidth;
    const { top } = placeAnchored({
      anchor: btn,
      contentH: tip.scrollHeight,
      contentW: w,
      viewportW: vw,
      viewportH: window.innerHeight,
      gap: TIP_GAP,
      margin: TIP_MARGIN,
    });
    const centered = (btn.left + btn.right) / 2 - w / 2;
    const left = Math.min(Math.max(TIP_MARGIN, centered), Math.max(TIP_MARGIN, vw - w - TIP_MARGIN));
    setPos({ top, left });
  }, []);

  return (
    <span className="tvh-help" ref={wrapRef} data-testid={testId}>
      <Button
        className={`tvh-help-btn${active || open ? ' is-active' : ''}`}
        aria-label={ariaLabel}
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={() => {
          clearTimers();
          setOpen(true);
        }}
        onBlur={close}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && open) {
            e.stopPropagation();
            close();
          }
        }}
        onClick={activate}
        data-testid={`${testId}-button`}
      >
        <HelpCircleGlyph size={16} />
      </Button>
      {open &&
        createPortal(
          <div
            ref={attachTip}
            id={tipId}
            role="tooltip"
            className="tvh-tip"
            style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: 'hidden' }}
            onMouseEnter={keepOpen}
            onMouseLeave={scheduleClose}
            onMouseDown={(e) => e.preventDefault()}
            onClick={activate}
            data-testid={`${testId}-tip`}
          >
            <div className="tvh-tip-title">{title}</div>
            {summary && <div className="tvh-tip-summary">{summary}</div>}
            <div className="tvh-tip-cta">
              <PlayGlyph size={10} />
              {watchText}
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}
