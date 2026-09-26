import {
  Fragment,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { placeTooltip } from './tooltipPlacement.js';
import { TOOLTIP_DELAY, TOOLTIP_SKIP_WINDOW, tooltipGroup as group } from './tooltipGroup.js';

/**
 * 말풍선 — 마우스를 올리면 뜨는 작은 설명 글상자 (PW-1123).
 *
 * 설명을 브라우저 기본 말풍선(`title`)에만 두면 약 1초를 가만히 있어야 뜨고, 휴대폰·키보드로는
 * 안 뜨고, 꺼진 버튼 위에서는 안 뜨는 브라우저가 있다. 이 부품이 그 자리를 대신한다.
 *
 *   - 마우스를 올리고 **0.3초 뒤** 뜬다(`delay`).
 *   - 하나가 떠 있거나 방금 닫혔으면(0.3초 안) 옆 항목은 **기다림 없이** 바로 뜬다.
 *   - Tab 으로 옮겨 가도 뜬다(마우스로 눌러 생긴 포커스에는 안 뜬다). Esc 로 닫는다.
 *   - `document.body` 직속 포털 + `position: fixed` 라 스크롤 상자·화면 가장자리에 잘리지 않는다.
 *     위가 좁으면 아래로 뒤집고, 꼬리는 늘 앵커 가운데를 가리킨다.
 *
 * ## 쓰는 법
 *
 *   <Tooltip content="캐파 사용이 지정되지 않았습니다"><span>—</span></Tooltip>
 *
 * 자식 요소 하나에 마우스·포커스 핸들러를 얹는다(자식이 컴포넌트면 그 핸들러를 DOM 까지
 * 넘겨야 한다 — `Button`·`StatusBadge` 는 넘긴다). 자식 모양은 그대로다.
 *
 * **꺼진 버튼**은 버튼 자체가 마우스 이벤트를 삼키므로 바깥에 `<span class="dp-tip-wrap">` 을
 * 두르고 거기에 건다. 자식에 `disabled` prop 이 있으면(값이 false 여도 — 켜졌다 꺼질 때
 * 자리가 흔들리지 않게) 자동으로 두른다. `wrap` 으로 직접 고를 수도 있다.
 * 꺼진 버튼은 Tab 으로 못 가므로, 꺼져 있는 동안은 두른 쪽이 Tab 을 받아 이유를 띄운다.
 *
 * `content` 가 비었으면(null·''·false) 말풍선을 달지 않는다(꺼질 수 있는 버튼은 바깥 두름만 남긴다) —
 * `title={locked ? reason : undefined}` 을 그대로 옮길 수 있다.
 *
 * @param {import('react').ReactNode} content 말풍선 내용. 줄바꿈(`\n`)은 줄바꿈으로 보인다
 * @param {number} [delay=300]     뜨기까지 기다리는 시간(ms)
 * @param {number} [closeDelay=0]  떠난 뒤 닫히기까지 기다리는 시간(ms)
 * @param {'top'|'bottom'} [placement='top'] 먼저 시도할 쪽
 * @param {'neutral'|'brand'} [tone='neutral'] 말풍선 색. `color` 를 주면 그 색으로 칠한다
 * @param {string} [color]  말풍선 바탕색(CSS 색 값) — OKR 리소스 막대처럼 막대 색을 따를 때
 * @param {boolean} [wrap]  바깥을 두를지. 안 주면 위 규칙으로 정한다
 * @param {string} [className] 두른 쪽(`dp-tip-wrap`)에 더할 클래스
 * @param {number} [maxWidth] 말풍선 최대 폭(px). 기본은 CSS 의 280px
 * @param {boolean} [open] 밖에서 열고 닫는다. true 면 기다림 없이 뜨고, false 면 마우스를 올려도 안 뜬다.
 *   안 주면 마우스·포커스로 뜬다. 끄는 도중(드래그 중)에는 마우스 올림 신호가 오지 않으므로 놓는
 *   자리가 «지금 이 위에 있다»를 알 때 `open={isOver || undefined}` 로 띄운다.
 */

function isEmpty(content) {
  return content == null || content === false || content === '';
}

// 마지막 입력이 키보드였나 — 마우스로 눌러 생긴 포커스에는 말풍선을 띄우지 않으려고 잰다.
// `:focus-visible` 판정은 브라우저·jsdom 마다 달라 직접 센다. 누르기는 두 곳에서 받는다:
//   - 말풍선을 단 요소 자신의 mousedown — 그 누르기로 생기는 포커스보다 먼저 온다.
//   - 문서의 click(capture) — 누른 결과로 열린 창이 버튼에 포커스를 줄 때를 잡는다.
// 문서에 mousedown 을 걸지 않는 것은 그 자리를 바깥 누르기 공용 훅(useDismissLayer)만 쓰기 때문이다.
let lastInputKeyboard = true;
let modalityListening = false;
function listenInputModality() {
  if (modalityListening || typeof document === 'undefined') return;
  modalityListening = true;
  document.addEventListener('keydown', () => { lastInputKeyboard = true; }, true);
  document.addEventListener('click', (e) => {
    // 키보드 Enter/Space 로 누른 click 은 detail 이 0 이다 — 그건 키보드로 친다.
    if (e.detail > 0) lastInputKeyboard = false;
  }, true);
}

function joinIds(...ids) {
  const s = ids.filter(Boolean).join(' ');
  return s || undefined;
}

export default function Tooltip({
  content,
  children,
  delay = TOOLTIP_DELAY,
  closeDelay = 0,
  placement = 'top',
  tone = 'neutral',
  color,
  wrap,
  className,
  maxWidth,
  open: openProp,
}) {
  const [anchor, setAnchor] = useState(null);
  const openTimer = useRef(null);
  const closeTimer = useRef(null);
  const tipId = `dp-tip-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const empty = isEmpty(content);

  const clearTimers = useCallback(() => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  const show = useCallback(
    (el, immediate = false) => {
      clearTimers();
      const warm = group.open > 0 || Date.now() - group.lastClosedAt < TOOLTIP_SKIP_WINDOW;
      if (immediate || warm || delay <= 0) {
        setAnchor(el);
        return;
      }
      openTimer.current = setTimeout(() => setAnchor(el), delay);
    },
    [clearTimers, delay],
  );

  const hide = useCallback(
    (immediate = false) => {
      clearTimers();
      if (immediate || closeDelay <= 0) {
        setAnchor(null);
        return;
      }
      closeTimer.current = setTimeout(() => setAnchor(null), closeDelay);
    },
    [clearTimers, closeDelay],
  );

  // 밖에서 열 때 쓰는 앵커 찾기 — 렌더마다 새 함수가 되면 말풍선이 매번 다시 재어 멈추지 않는다.
  const findTrigger = useCallback(
    () => document.querySelector(`[data-tooltip-trigger="${tipId}"]`),
    [tipId],
  );
  const forced = openProp === true;
  const open = (forced || (openProp !== false && !!anchor)) && !empty;

  // 떠 있는 수를 화면 전체와 나눈다 — 옆 항목이 기다림 없이 뜨는 근거.
  useEffect(() => {
    if (!open) return undefined;
    group.open += 1;
    const onKey = (e) => {
      if (e.key === 'Escape') hide(true);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      group.open = Math.max(0, group.open - 1);
      group.lastClosedAt = Date.now();
      document.removeEventListener('keydown', onKey);
    };
  }, [open, hide]);

  useEffect(() => {
    listenInputModality();
    return clearTimers;
  }, [clearTimers]);

  const canDisable = isValidElement(children) && 'disabled' in (children.props ?? {});
  const useWrap =
    wrap ?? (!isValidElement(children) || children.type === Fragment || canDisable);
  const childProps = isValidElement(children) ? children.props : {};

  if (empty) {
    // 켜졌다 꺼지는 버튼은 설명이 없는 동안에도 바깥을 둘러 둔다 — 두름이 생겼다 사라지면 버튼이
    // 새 요소로 다시 만들어져 포커스를 잃고 자리가 흔들린다.
    if (!canDisable || wrap === false) return children;
    return (
      <span className={['dp-tip-wrap', className].filter(Boolean).join(' ')}>{children}</span>
    );
  }

  const handlers = {
    onMouseEnter: (e) => {
      childProps.onMouseEnter?.(e);
      show(e.currentTarget);
    },
    onMouseLeave: (e) => {
      childProps.onMouseLeave?.(e);
      hide();
    },
    // 눌렀을 때는 닫는다 — 말풍선이 누른 결과(메뉴·창)를 가리지 않게.
    onMouseDown: (e) => {
      childProps.onMouseDown?.(e);
      lastInputKeyboard = false;
      hide(true);
    },
    onFocus: (e) => {
      childProps.onFocus?.(e);
      if (lastInputKeyboard) show(e.currentTarget, true);
    },
    onBlur: (e) => {
      childProps.onBlur?.(e);
      hide(true);
    },
  };

  const bubble = open ? (
    <TooltipBubble
      id={tipId}
      anchor={anchor ?? findTrigger}
      forced={forced}
      placement={placement}
      tone={tone}
      color={color}
      maxWidth={maxWidth}
      onLost={() => hide(true)}
    >
      {content}
    </TooltipBubble>
  ) : null;

  if (useWrap) {
    const childDisabled = !!childProps.disabled;
    return (
      <>
        <span
          className={['dp-tip-wrap', className].filter(Boolean).join(' ')}
          tabIndex={childDisabled || typeof children === 'string' || typeof children === 'number' ? 0 : undefined}
          aria-describedby={open ? tipId : undefined}
          data-tooltip-trigger={tipId}
          {...handlers}
        >
          {children}
        </span>
        {bubble}
      </>
    );
  }

  return (
    <>
      <Trigger
        element={children}
        handlers={handlers}
        describedBy={joinIds(childProps['aria-describedby'], open ? tipId : null)}
        tipId={tipId}
      />
      {bubble}
    </>
  );
}

// 자식 요소에 핸들러를 얹는다. 따로 둔 것은 렌더 검사(react-hooks/refs)가 본문의 cloneElement 를
// 「ref 를 렌더 중에 읽는다」로 보기 때문이다 — 여기서는 ref 를 쥔 값이 닿지 않는다.
// 스스로 Tab 을 받는 태그. 이 밖의 글 조각(span·div…)은 말풍선을 달면 Tab 을 받게 한다 —
// 안 그러면 「(캐파 —)」 같은 설명은 키보드로 영영 못 본다. 컴포넌트(대문자)는 무엇을 그릴지
// 몰라 건드리지 않는다(안에 버튼이 있으면 Tab 이 두 번 걸린다).
const FOCUSABLE_TAGS = new Set(['a', 'button', 'input', 'select', 'textarea', 'summary', 'iframe']);

function needsTabStop(element) {
  if (!isValidElement(element) || typeof element.type !== 'string') return false;
  if (FOCUSABLE_TAGS.has(element.type)) return false;
  return element.props?.tabIndex === undefined;
}

function Trigger({ element, handlers, describedBy, tipId }) {
  return cloneElement(element, {
    ...handlers,
    ...(needsTabStop(element) ? { tabIndex: 0 } : null),
    'aria-describedby': describedBy,
    'data-tooltip-trigger': tipId,
  });
}

function TooltipBubble({ id, anchor: anchorOrFind, forced, placement, tone, color, maxWidth, onLost, children }) {
  const [pos, setPos] = useState(null);
  const nodeRef = useRef(null);
  const onLostRef = useRef(onLost);
  useEffect(() => {
    onLostRef.current = onLost;
  });

  const measure = useCallback(() => {
    const node = nodeRef.current;
    if (!node) return;
    // 밖에서 연(open) 말풍선은 앵커를 그때그때 찾는다 — 마우스 올림으로 잡은 요소가 없다.
    const anchor = typeof anchorOrFind === 'function' ? anchorOrFind() : anchorOrFind;
    // 목록이 다시 그려져 앵커가 문서에서 떨어졌으면 닫는다 — 떨어진 노드의 좌표는 전부 0 이다.
    if (!anchor || !anchor.isConnected) {
      if (!forced) onLostRef.current?.();
      return;
    }
    const r = anchor.getBoundingClientRect();
    setPos(
      placeTooltip({
        anchor: r,
        width: node.offsetWidth,
        height: node.offsetHeight,
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        placement,
      }),
    );
  }, [anchorOrFind, forced, placement]);

  // 배치는 ref 콜백에서 한다 — 붙는 순간 크기를 알 수 있고 effect 안 setState 를 만들지 않는다.
  const attach = useCallback(
    (node) => {
      nodeRef.current = node;
      if (node) measure();
    },
    [measure],
  );

  useEffect(() => {
    // capture 로 받아야 안쪽 스크롤 상자(목록·창 본문)의 스크롤도 잡힌다.
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const classes = [
    'dp-tooltip',
    tone === 'brand' || color ? 'is-brand' : null,
  ].filter(Boolean).join(' ');

  return createPortal(
    <div
      ref={attach}
      id={id}
      role="tooltip"
      className={classes}
      data-side={pos?.side ?? placement}
      style={{
        ...(color ? { '--tip-color': color } : null),
        ...(maxWidth ? { maxWidth } : null),
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        // 실측 전에는 안 보이게 둔다 — (0,0) 에 한 프레임 번쩍이는 것을 막는다.
        opacity: pos ? 1 : 0,
      }}
    >
      {children}
      <span className="dp-tooltip-arrow" style={{ left: pos?.arrowX }} aria-hidden="true" />
    </div>,
    document.body,
  );
}
