import { useEffect, useLayoutEffect, useRef } from 'react';
import { confirmOpen, isTopLayer, pushLayer } from './dismissStack.js';

/**
 * 바깥 누르기·Esc 로 닫는 펼침 메뉴·팝오버 — 화면마다 따로 짜던 것을 여기 하나로 모았다
 * (PW-109 에서 조직도가 먼저 만들었고, PW-1013 에서 공용으로 올렸다).
 *
 * **화면을 덮는 투명 백드롭을 쓰지 않는다.** `position: fixed; inset: 0` 백드롭은 클릭만
 * 막는 게 아니라 그 위에서 굴린 휠까지 먹는다 — 앱 셸의 `body` 는 `overflow: hidden` 이라
 * 휠이 실제 스크롤러(`.content-area`)까지 못 가서, 메뉴를 열면 뒤 화면 전체가 잠긴 것처럼
 * 보였다(PW-109 제보 2026-08-18).
 *
 * 🔴 **트리거 자신을 바깥에서 뺀다**(`inside`). 빼지 않으면 `mousedown` 이 닫고 이어진
 * `click` 이 다시 열어, 트리거를 눌러도 닫히지 않는다.
 *
 * Esc 는 **맨 위 층만** 닫는다 — 창 안에서 연 메뉴에 Esc 를 누르면 메뉴만 닫히고 창은 남는다
 * (`dismissStack.js` + 캡처 단계에서 전파 끊기). 공용 확인 창이 위에 떠 있으면 Esc 를 받지 않는다.
 *
 * **여는 그 이벤트는 흘려보낸다.** `mousedown` 으로 여는 트리거는 React 가 그 이벤트를 처리하는
 * 도중에 효과를 돌려서, 방금 건 리스너가 여는 이벤트를 window 에서 받아 곧장 닫는다(공용 달력이
 * 예전에 `setTimeout 0` 으로 미뤄 막던 것). 리스너를 걸 때 처리 중이던 이벤트를 기억해 두고 그것만 거른다.
 *
 * 화면 전체를 막는 **창**에는 쓰지 않는다 — 창은 `ModalLayer`/`ModalShell` 이다.
 *
 * @param {() => void} onClose  닫을 때. 매 렌더 새 함수를 넘겨도 리스너를 다시 걸지 않는다.
 * @param {{ current: Node | null } | null} panelRef  패널(또는 트리거+패널을 감싼 요소)의 ref.
 *        그 안을 누른 것은 바깥이 아니다.
 * @param {string | { current: Node | null } | Array<string | { current: Node | null }>} [inside]
 *        바깥에서 더 뺄 것 — 트리거의 셀렉터나 ref, 또는 그 목록. 포털로 따로 그린 하위 메뉴도 여기 넣는다.
 * @param {boolean} [enabled=true]  열려 있을 때만 true. false 면 아무것도 듣지 않는다.
 */
export default function useDismissLayer(onClose, panelRef, inside, enabled = true) {
  const onCloseRef = useRef(onClose);
  const insideRef = useRef(inside);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    insideRef.current = inside;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const token = {};
    const popLayer = pushLayer(token);
    const isInside = (t) => {
      if (panelRef?.current && t instanceof Node && panelRef.current.contains(t)) return true;
      const extra = insideRef.current;
      const list = Array.isArray(extra) ? extra : extra != null ? [extra] : [];
      return list.some((x) => {
        if (typeof x === 'string') return t instanceof Element && !!t.closest(x);
        return !!x?.current && t instanceof Node && x.current.contains(t);
      });
    };
    const openingEvent = typeof window !== 'undefined' ? window.event : undefined;
    const onDown = (e) => {
      if (e === openingEvent) return;
      if (isInside(e.target)) return;
      onCloseRef.current();
    };
    // Esc 는 캡처 단계에서 받고, 이 메뉴가 닫았으면 전파를 끊는다. 창(앱 쪽 창 포함)은 Esc 를
    // window 버블에서 듣는다 — 여기서 끊지 않으면 메뉴만 닫으려던 키가 창째로 닫아 쓰던 글을
    // 날린다(OKR 작성 창의 구성원 고르기가 먼저 이렇게 막았다).
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (!isTopLayer(token) || confirmOpen()) return;
      // 이 층이 Esc 를 «썼다» — 기본 동작도, 뒤의 창이 듣는 것도 막는다.
      e.preventDefault();
      e.stopPropagation();
      onCloseRef.current();
    };
    // 누르기도 캡처 단계에서 받는다 — 창 틀(ModalShell·일정 추가 창의 form)이 막 닫힘을 피하려고
    // mousedown 전파를 끊어서, 버블로 들으면 창 안에서 연 목록은 창 안 다른 곳을 눌러도 안 닫혔다.
    window.addEventListener('mousedown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('mousedown', onDown, true);
      window.removeEventListener('keydown', onKey, true);
      popLayer();
    };
  }, [panelRef, enabled]);
}
