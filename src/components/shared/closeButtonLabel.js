import { useLayoutEffect } from 'react';

/**
 * 창 오른쪽 위 X 의 읽어 주는 이름(aria-label)을 아래 버튼 글자와 겹치지 않게 고른다 (pivit-work PW-2744).
 *
 * X 는 보통 «닫기»인데, 창 아래 버튼 글자도 «닫기»인 창이 있다(«저장하지 않고 닫을까요?»의 확인 ·
 * «퇴사 예약을 취소할까요?»의 [닫기] — 둘 다 기획서가 정한 글자). 이름이 같으면 화면 읽기 프로그램·
 * 자동 시험이 둘을 가르지 못하므로, 겹칠 때만 X 를 «창 닫기»로 읽힌다. 보이는 글자는 바뀌지 않는다.
 */
export const WINDOW_CLOSE_LABEL = '창 닫기';

export function closeButtonLabel(closeLabel, footerLabels) {
  if (typeof closeLabel !== 'string') return closeLabel;
  const name = closeLabel.trim();
  const clash = footerLabels.some((l) => typeof l === 'string' && l.trim() === name);
  return clash ? WINDOW_CLOSE_LABEL : closeLabel;
}

function accessibleName(el) {
  const label = el.getAttribute('aria-label');
  return (label ?? el.textContent ?? '').trim();
}

/** 부르는 쪽이 X 에 달아 두면 `useDistinctCloseName(scopeRef, CLOSE_X_SELECTOR, …)` 가 찾는다. */
export const CLOSE_X_ATTR = 'data-close-x';
export const CLOSE_X_SELECTOR = '[data-close-x]';

/**
 * 아래 버튼을 부르는 쪽이 직접 그리는 창(footer · 본문 버튼 · 옆 패널)은 글자를 미리 알 수 없다.
 * 그려진 버튼을 보고, 창 안에 X 와 같은 이름의 버튼이 있으면 X 를 «창 닫기»로 읽힌다.
 * 버튼 글자가 나중에 바뀌어도(불러오기 끝 · 막힘 상태로 바뀜) 다시 본다.
 *
 * @param scopeRef    창(또는 옆 패널) 전체 요소
 * @param closeTarget 오른쪽 위 X — ref, 또는 scope 안에서 찾을 선택자(CLOSE_X_SELECTOR)
 * @param closeLabel  부르는 쪽이 정한 X 이름
 */
export function useDistinctCloseName(scopeRef, closeTarget, closeLabel) {
  useLayoutEffect(() => {
    const scope = scopeRef.current;
    if (!scope || typeof closeLabel !== 'string') return undefined;
    const apply = () => {
      const x = typeof closeTarget === 'string' ? scope.querySelector(closeTarget) : closeTarget.current;
      if (!x) return;
      const clash = Array.from(scope.querySelectorAll('button')).some(
        (b) => b !== x && accessibleName(b) === closeLabel.trim(),
      );
      const want = clash ? WINDOW_CLOSE_LABEL : closeLabel;
      if (x.getAttribute('aria-label') !== want) x.setAttribute('aria-label', want);
    };
    apply();
    if (typeof MutationObserver === 'undefined') return undefined;
    const observer = new MutationObserver(apply);
    observer.observe(scope, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  });
}
