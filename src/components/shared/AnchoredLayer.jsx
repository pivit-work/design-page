import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { placeAnchored, ANCHOR_GAP } from './anchoredPlacement.js';

/**
 * 앵커(트리거 요소 또는 클릭 지점)에 붙어 뜨는 패널의 **껍데기** (PW-313).
 *
 * 배치만 소유한다 — 배경·테두리·그림자·패딩·항목 스타일 같은 **면은 호출부가**
 * `className` / `style` 로 정한다. 프리미티브가 시각까지 정하면 디자이너 정본과
 * 어긋난다.
 *
 * 하는 일:
 *   - `document.body` 직속 포털로 그린다 → 조상의 `overflow: hidden` 에 잘리지 않는다.
 *     (클리핑은 스태킹이 아니라 페인트 영역의 문제라 z-index 로는 못 뚫는다.)
 *   - `position: fixed` + 앵커 실측 좌표 + 아래가 좁으면 위로 뒤집기 + 뷰포트 클램프.
 *     계산은 `anchoredPlacement.js` 의 순수 함수가 한다.
 *   - 열려 있는 동안 스크롤(capture)·리사이즈·내용 크기 변화를 따라 다시 배치한다.
 *
 * 바깥 클릭 처리는 **호출부가 이미 갖고 있는 백드롭**을 그대로 쓴다 — 스쿼드 카드
 * 메뉴·셀 피커 모두 `position: fixed; inset: 0` 백드롭이 있어서, 여기서 또 닫으면
 * 닫혔다 다시 열리는 깜빡임이 생긴다.
 */
export default function AnchoredLayer({
  /**
   * 앵커를 **셀렉터로** 지정한다. 노드가 아니라 문자열로 들고 있다가 잴 때마다 다시
   * 찾는 이유는 PW-109 에서 배운 것이다 — 목록이 다시 그려지면 붙들고 있던 노드가
   * 문서에서 떨어져 나가고, 떨어진 노드의 `getBoundingClientRect()` 는 전부 0 이라
   * 앵커를 잃는다. 문자열이라 `useCallback` 의 의존성 비교도 값으로 된다.
   */
  anchorSelector,
  /** 앵커 요소를 직접 줄 때(셀렉터가 없을 때만 쓴다). */
  anchorEl,
  /** 점 앵커(클릭 좌표) 등, 사각형을 직접 줄 때. 위 둘보다 우선한다. */
  anchorRect,
  align = 'left',
  gap = ANCHOR_GAP,
  /** 바깥 클릭 감지(`useDismissLayer`) 등에 쓸 패널 노드 ref. */
  panelRef,
  className,
  style,
  children,
  ...rest
}) {
  const [pos, setPos] = useState(null);
  const nodeRef = useRef(null);

  // 🔴 `anchorRect` 를 객체째로 의존성에 넣으면 안 된다. 호출부가 매 렌더 새 객체를
  // 만들면 `measure` → `attach` 의 정체성이 매번 바뀌고, ref 콜백이 떨어졌다 붙으며
  // `setPos(null)` → 재렌더 → 다시 붙음을 반복하는 **무한 루프**가 된다.
  // 숫자 네 개로 풀어서 값으로 비교되게 한다.
  const hasRect = !!anchorRect;
  const rTop = anchorRect?.top ?? 0;
  const rBottom = anchorRect?.bottom ?? 0;
  const rLeft = anchorRect?.left ?? 0;
  const rRight = anchorRect?.right ?? 0;

  const measure = useCallback(() => {
    const el = nodeRef.current;
    if (!el) return;
    const anchor = hasRect
      ? { top: rTop, bottom: rBottom, left: rLeft, right: rRight }
      : (anchorSelector
        ? document.querySelector(anchorSelector)
        : anchorEl
      )?.getBoundingClientRect();
    if (!anchor) return;

    // 높이는 `getBoundingClientRect` 가 아니라 **콘텐츠 높이**로 잰다. 이미 걸어 둔
    // maxHeight 안에서 재면 잰 값이 그 제한에 갇혀, 다시 재는 순간 "더 낮아도 되네"
    // 로 판정이 흔들린다(스크롤·리사이즈마다 위/아래가 튄다).
    const contentH = el.scrollHeight + (el.offsetHeight - el.clientHeight);
    const contentW = el.getBoundingClientRect().width || el.offsetWidth;

    setPos(
      placeAnchored({
        anchor,
        contentH,
        contentW,
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,
        align,
        gap,
      }),
    );
  }, [align, anchorEl, anchorSelector, gap, hasRect, rTop, rBottom, rLeft, rRight]);

  // 배치는 effect 가 아니라 ref 콜백에서 한다 — 패널이 DOM 에 붙는 순간 크기를 알 수
  // 있고, effect 안 setState 로 캐스케이드 렌더를 만들지 않는다.
  const attach = useCallback(
    (node) => {
      nodeRef.current = node;
      if (panelRef) panelRef.current = node;
      if (node) measure();
      else setPos(null);
    },
    [measure, panelRef],
  );

  useEffect(() => {
    // capture 로 받아야 안쪽 스크롤 컨테이너(카드 목록·모달 본문)의 스크롤도 잡힌다.
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    const node = nodeRef.current;
    const observer =
      typeof ResizeObserver !== 'undefined' && node
        ? new ResizeObserver(() => measure())
        : null;
    if (node && observer) observer.observe(node);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [measure]);

  return createPortal(
    <div
      {...rest}
      ref={attach}
      className={className}
      data-anchored-layer=""
      style={{
        // 내용이 상한을 넘으면 패널이 스스로 스크롤한다. 안쪽에 자체 스크롤 영역을 둔
        // 호출부는 `style` 로 덮어쓴다.
        overflowY: 'auto',
        boxSizing: 'border-box',
        ...style,
        // 🔴 배치는 `style` 뒤에 둔다 — 호출부가 `maxHeight` 나 `position` 을 덮어쓰면
        // 뷰포트 클램프가 무력화돼 패널이 화면 밖으로 나간다.
        position: 'fixed',
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        maxHeight: pos?.maxHeight,
        // 실측 전에는 안 보이게 둔다 — (0,0) 에 한 프레임 번쩍이는 것을 막는다.
        opacity: pos ? 1 : 0,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
