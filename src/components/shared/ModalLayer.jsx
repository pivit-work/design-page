import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { confirmOpen, isTopLayer, pushLayer } from './dismissStack.js';

/**
 * ModalLayer — 창의 **바탕**: 뒤를 덮는 어두운 막과 닫히는 동작만 갖는다 (PW-1013).
 *
 * `ModalShell` 은 이 위에 «닫기 X · 제목 · 취소/확인» 틀을 얹은 것이다. 틀이 다른 창
 * (3D 프로필 카드, 스니핏 작성 창처럼 머리·꼬리를 직접 그리는 창)은 이것만 쓰고 안은 제
 * 마크업을 그린다. 그래서 **막의 색·겹침 순서·닫히는 동작은 모든 창이 같다.**
 *
 * 하는 일:
 *   - `document.body` 직속 포털 — 본문 칸(`.content-area`)은 `position: fixed` 라 자기
 *     스태킹 컨텍스트를 만든다. 그 안에 그리면 막이 왼쪽 메뉴를 못 덮는다(PW-513).
 *   - 막(`.tl-modal-overlay`)을 누르면 닫는다. 창 안을 누른 것은 막을 누른 것이 아니다.
 *   - Esc 로 닫는다 — 단 **맨 위 층일 때만**(`dismissStack.js`). 창 안에서 연 메뉴가 있으면
 *     그 메뉴가 먼저 닫힌다. 공용 확인 창이 위에 떠 있으면 받지 않는다.
 *   - 떠 있는 동안 `body` 스크롤을 잠근다.
 *   - **나중에 연 창이 위에 뜬다.** 막은 모두 같은 겹침 순서(CSS)라 문서 순서가 위아래를 정한다.
 *     미리 그려 두는 창(`keepMounted`)은 먼저 문서에 붙어 있어서 나중에 열어도 밑에 깔리므로
 *     (조직 스냅숏의 명단 창 위 프로필 창), 열 때 막을 body 맨 뒤로 옮긴다. 겹침 순서 숫자를
 *     올리지 않는 이유: 앱이 같은 막 클래스로 그리는 창(간단 프로필 카드 등)이 그 숫자 밑에 깔린다.
 *
 * Props:
 *   open             false 면 닫힌 것. 기본 true(호출부가 조건부로 그리는 창).
 *   keepMounted      닫혀 있어도 안을 그려 둔다(숨김) — 3D 씬을 미리 받아 두는 프로필 카드처럼
 *                    첫 열기를 빠르게 하려는 창. 닫혀 있는 동안은 Esc·스크롤 잠금을 걸지 않는다
 *   onClose          닫을 때 (Esc · 막 누르기)
 *   busy             요청이 도는 중 — Esc·막 누르기를 받지 않는다
 *   onOverlayClick   막을 눌렀을 때. undefined 면 닫기, null 이면 아무 일도 안 한다(긴 작성 폼),
 *                    함수면 닫는 대신 그 함수를 부른다(PW-836)
 *   closeOnEscape    false 면 Esc 로 닫지 않는다(안에서 Esc 를 직접 다루는 창). 기본 true
 *   zIndex           막의 겹침 순서 (기본은 CSS 값)
 *   className        막에 덧붙일 변형 클래스 (창 배치를 바꿀 때)
 *   testId           막의 data-testid
 */
export default function ModalLayer({
  open = true,
  keepMounted = false,
  onClose,
  busy = false,
  onOverlayClick,
  closeOnEscape = true,
  zIndex,
  className = '',
  style,
  testId,
  children,
}) {
  // onClose·busy 는 ref 로 읽는다 — 호출측이 onClose 를 인라인 함수로 넘기면 렌더마다
  // 효과가 다시 걸려 Esc 듣기와 body 스크롤 잠금이 매번 풀렸다 걸린다.
  const busyRef = useRef(busy);
  const onCloseRef = useRef(onClose);
  const escRef = useRef(closeOnEscape);
  const keepMountedRef = useRef(keepMounted);
  useLayoutEffect(() => {
    busyRef.current = busy;
    onCloseRef.current = onClose;
    escRef.current = closeOnEscape;
    keepMountedRef.current = keepMounted;
  });

  const overlayRef = useRef(null);

  // 층 올리기·겹침 순서는 그리기 전에 한다(layout) — 한 프레임이라도 밑에 깔려 보이지 않게.
  useLayoutEffect(() => {
    if (!open) return undefined;
    const token = {};
    const popLayer = pushLayer(token);
    const el = overlayRef.current;
    // 미리 그려 둔 창만 옮긴다 — 막 열린 창은 이미 맨 뒤에 붙었고, 옮기면 안에서 막 초점을 받은
    // 입력칸이 초점을 잃는다. React 는 이 포털의 자식을 붙이고 떼기만 해서 옮겨도 어긋나지 않는다.
    if (keepMountedRef.current && el && el.parentNode === document.body && el !== document.body.lastElementChild) {
      document.body.appendChild(el);
    }
    const onKey = (e) => {
      if (e.key !== 'Escape' || busyRef.current || !escRef.current) return;
      if (!isTopLayer(token) || confirmOpen()) return;
      onCloseRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      popLayer();
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open && !keepMounted) return null;

  const handleOverlayMouseDown = (e) => {
    // 창 안(자식)을 누른 것은 막을 누른 것이 아니다. 포털로 따로 그린 날짜 고르기처럼 React
    // 트리로만 이어진 것도 target 이 막이 아니라서 여기서 걸러진다.
    if (e.target !== e.currentTarget) return;
    if (onOverlayClick === null || busy) return;
    if (onOverlayClick) onOverlayClick();
    else onClose?.();
  };

  return createPortal(
    <div
      ref={overlayRef}
      className={`tl-modal-overlay ${className}`.trim()}
      onMouseDown={handleOverlayMouseDown}
      // 포털 안의 클릭도 React 트리를 따라 부모로 올라간다. 창을 그린 자리가 눌러서 무언가를
      // 여닫는 요소 안이면, 창 안의 버튼 한 번이 그 요소의 onClick 까지 불러 창이 다시 열리거나
      // 뒤의 화면이 반응한다(PW-832).
      onClick={(e) => e.stopPropagation()}
      role="presentation"
      style={{
        ...style,
        ...(zIndex != null ? { zIndex } : null),
        ...(open ? null : { display: 'none' }),
      }}
      data-testid={testId}
    >
      {children}
    </div>,
    document.body,
  );
}
