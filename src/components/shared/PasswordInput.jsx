import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import TextInput from './TextInput.jsx';
import { isEnterKey } from './enterKey.js';

/**
 * PasswordInput — 비밀번호 칸. 방금 친 한 글자만 잠깐 보이고 곧 별표(*)로 바뀐다 (PW-3315).
 *
 * 휴대폰 비밀번호 칸처럼 오타를 바로 알아채게 하려는 것이다.
 * - 한 글자를 치면 그 글자만 평문 → 1초가 지나거나 다음 글자를 치면 `*`. 앞 글자는 언제나 `*`.
 * - 붙여넣기·브라우저 자동 채움·지우기는 아무 글자도 보이지 않는다.
 * - 칸을 나가거나 Enter·폼 제출이면 1초를 기다리지 않고 곧바로 전부 `*`.
 *
 * ## 어떻게
 * 칸은 그대로 `<input type="password">` 이고 **진짜 값**을 담는다 — 브라우저 비밀번호 저장·채움,
 * 서버로 가는 값, 규칙 검사가 바뀌지 않는다. 칸의 원래 글자(검은 점)만 투명하게 칠하고
 * (`form-field.css` 의 `.dp-pw`), 그 위에 `*` 줄을 겹친다. `*` 한 칸의 폭은 같은 글꼴로 그린
 * 검은 점 하나의 폭이라 깜빡이는 커서·선택 영역이 별표와 어긋나지 않는다. 칸이 길어 옆으로
 * 밀리면 겹친 줄도 같이 민다.
 *
 * 페이지를 열 때 브라우저가 미리 채운 비밀번호는 사용자가 페이지를 누르기 전까지 스크립트가
 * 값을 못 읽는다(크롬). 그동안은 겹친 줄 대신 브라우저 원래 글자를 보인다 — 안 그러면 칸이
 * 비어 보인다.
 *
 * Props: `TextInput` 과 같다(`type` 은 늘 password). `as` — 칸 부품을 바꿀 때(예: `OnbInput`).
 * 감싼 상자에 붙일 클래스는 `wrapClassName`.
 */
export const REVEAL_MS = 1000;
export const MASK_CHAR = '*';

const SINGLE_INPUT_TYPES = new Set(['insertText', 'insertCompositionText']);
const AUTOFILL_ANIMATION = 'dp-pw-autofill';

/** 같은 글꼴로 그린 비밀번호 가림 글자 하나의 폭 — 숨은 비밀번호 칸 100자의 폭으로 잰다. */
const glyphCache = new Map();
function measureGlyph(cs) {
  const key = `${cs.font}|${cs.letterSpacing}`;
  if (glyphCache.has(key)) return glyphCache.get(key);
  const probe = document.createElement('input');
  probe.type = 'password';
  probe.value = 'x'.repeat(100);
  probe.setAttribute('aria-hidden', 'true');
  probe.tabIndex = -1;
  Object.assign(probe.style, {
    position: 'absolute',
    visibility: 'hidden',
    pointerEvents: 'none',
    left: '-9999px',
    top: '0',
    width: '0',
    padding: '0',
    border: '0',
    font: cs.font,
    letterSpacing: cs.letterSpacing,
  });
  document.body.appendChild(probe);
  const width = probe.scrollWidth / 100;
  probe.remove();
  // 글꼴이 아직 안 왔거나(0) 잴 수 없는 환경이면 저장하지 않고 다음에 다시 잰다.
  if (width > 0) glyphCache.set(key, width);
  return width;
}

function isAutofilled(el) {
  for (const sel of [':autofill', ':-webkit-autofill']) {
    try {
      if (el.matches(sel)) return true;
    } catch {
      // 그 선택자를 모르는 브라우저
    }
  }
  return false;
}

const codePoints = (s) => Array.from(s ?? '');

function assignRef(ref, value) {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

export default function PasswordInput({
  as: Input = TextInput,
  ref,
  wrapClassName,
  onChange,
  onBlur,
  onKeyDown,
  onFocus,
  onSelect,
  onScroll,
  onAnimationStart,
  type: _type,
  ...rest
}) {
  const inputRef = useRef(null);
  const textRef = useRef('');
  const timerRef = useRef(null);
  const [text, setText] = useState('');
  const [reveal, setReveal] = useState(-1);
  const [native, setNative] = useState(false);
  const [scroll, setScroll] = useState(0);
  const [box, setBox] = useState(null);

  const setInputRef = useCallback(
    (el) => {
      inputRef.current = el;
      assignRef(ref, el);
    },
    [ref],
  );

  const stopTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };
  const hideAll = useCallback(() => {
    stopTimer();
    setReveal(-1);
  }, []);
  useEffect(() => stopTimer, []);

  const syncScroll = useCallback(() => {
    const el = inputRef.current;
    if (el) setScroll(el.scrollLeft);
  }, []);

  /** 겹친 줄을 칸의 글자 자리·글꼴에 맞춘다. 칸 모양(틀림 테두리·비활성 색)이 바뀌면 다시. */
  const measure = useCallback(() => {
    const el = inputRef.current;
    if (!el || typeof window === 'undefined') return;
    const cs = window.getComputedStyle(el);
    const px = (v) => parseFloat(v) || 0;
    const next = {
      left: el.offsetLeft + px(cs.borderLeftWidth) + px(cs.paddingLeft),
      top: el.offsetTop + px(cs.borderTopWidth) + px(cs.paddingTop),
      width: Math.max(0, el.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight)),
      height: Math.max(0, el.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom)),
      font: cs.font,
      color: cs.color,
      glyph: measureGlyph(cs),
    };
    setBox((prev) =>
      prev &&
      prev.left === next.left &&
      prev.top === next.top &&
      prev.width === next.width &&
      prev.height === next.height &&
      prev.font === next.font &&
      prev.color === next.color &&
      prev.glyph === next.glyph
        ? prev
        : next,
    );
  }, []);

  /** 칸의 실제 값과 겹친 줄을 맞춘다 — 화면이 값을 바꿨거나(제출 뒤 비우기) 이벤트 없이 채워졌을 때. */
  const syncFromDom = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const v = el.value;
    if (v !== textRef.current) {
      textRef.current = v;
      setText(v);
      hideAll();
    }
    setNative(v === '' && isAutofilled(el));
  }, [hideAll]);

  useLayoutEffect(() => {
    syncFromDom();
    measure();
  });

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts?.ready) return undefined;
    let alive = true;
    document.fonts.ready.then(() => {
      if (alive) measure();
    });
    return () => {
      alive = false;
    };
  }, [measure]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  // 폼 제출([로그인]·[저장])이면 곧바로 전부 가린다 — 버튼이 포커스를 가져가지 않는 브라우저도 있다.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return undefined;
    form.addEventListener('submit', hideAll);
    return () => form.removeEventListener('submit', hideAll);
  }, [hideAll]);

  const handleChange = (e) => {
    const el = e.target;
    const next = el.value;
    const prev = textRef.current;
    const ne = e.nativeEvent || {};
    const typedOne =
      SINGLE_INPUT_TYPES.has(ne.inputType) &&
      codePoints(ne.data).length === 1 &&
      codePoints(next).length >= 1 &&
      next !== prev;
    textRef.current = next;
    setText(next);
    setNative(false);
    stopTimer();
    if (typedOne) {
      const caret = el.selectionStart ?? next.length;
      const at = codePoints(next.slice(0, caret)).length - 1;
      setReveal(at);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setReveal(-1);
      }, REVEAL_MS);
    } else {
      setReveal(-1);
    }
    syncScroll();
    onChange?.(e);
  };

  const handleBlur = (e) => {
    hideAll();
    onBlur?.(e);
  };
  const handleKeyDown = (e) => {
    if (isEnterKey(e)) hideAll();
    onKeyDown?.(e);
  };
  const handleFocus = (e) => {
    syncFromDom();
    syncScroll();
    onFocus?.(e);
  };
  const handleSelect = (e) => {
    syncScroll();
    onSelect?.(e);
  };
  const handleScroll = (e) => {
    syncScroll();
    onScroll?.(e);
  };
  const handleAnimationStart = (e) => {
    if (e.animationName === AUTOFILL_ANIMATION) syncFromDom();
    onAnimationStart?.(e);
  };

  const chars = codePoints(text);
  const glyph = box?.glyph || 0;

  return (
    <span className={['dp-pw', native && 'is-native', wrapClassName].filter(Boolean).join(' ')}>
      <Input
        {...rest}
        ref={setInputRef}
        type="password"
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onSelect={handleSelect}
        onScroll={handleScroll}
        onAnimationStart={handleAnimationStart}
      />
      {box && chars.length > 0 && (
        <span
          className="dp-pw-mask"
          aria-hidden="true"
          data-testid="password-mask"
          style={{
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
            font: box.font,
            color: box.color,
          }}
        >
          <span className="dp-pw-mask-line" style={{ transform: `translateX(${-scroll}px)` }}>
            {chars.map((ch, i) => (
              <span
                key={i /* 글자 자리마다 한 칸 — 자리가 곧 열쇠다 */}
                className={i === reveal ? 'dp-pw-ch is-shown' : 'dp-pw-ch'}
                style={glyph ? { width: glyph } : undefined}
              >
                {i === reveal ? ch : MASK_CHAR}
              </span>
            ))}
          </span>
        </span>
      )}
    </span>
  );
}
