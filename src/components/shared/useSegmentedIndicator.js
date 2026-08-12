import { useLayoutEffect, useRef, useState } from 'react';

// Segmented control sliding indicator.
// 활성 세그먼트의 offset/size 를 측정해 indicator 박스를 절대 배치하고
// transition 으로 이동.
//
// 주의: 측정값이 같으면 같은 state 를 반환해 re-render 를 피한다. 호출부가
// inline 으로 새 배열(values)을 넘기더라도 무한 re-render 루프에 빠지지 않음.
export default function useSegmentedIndicator(values, active, enabled = true) {
  const itemsRef = useRef([]);
  const [indicator, setIndicator] = useState(null);
  const activeIdx = values.findIndex((v) => v === active);

  useLayoutEffect(() => {
    if (!enabled) return;
    const node = itemsRef.current[activeIdx];
    if (!node) return;
    const next = {
      left: node.offsetLeft,
      top: node.offsetTop,
      width: node.offsetWidth,
      height: node.offsetHeight,
    };
    setIndicator((prev) => {
      if (
        prev &&
        prev.left === next.left &&
        prev.top === next.top &&
        prev.width === next.width &&
        prev.height === next.height
      ) {
        return prev;
      }
      return next;
    });
    // values 는 호출부가 매 렌더 새 배열로 넘기는 경우가 많다 — 그래서 이 effect 는
    // 사실상 매 렌더 다시 측정한다(폰트 로드·리사이즈 후 위치 보정). 의도된 동작이라
    // 그대로 둔다. 측정값이 같으면 같은 state 를 반환해 루프에 빠지지 않는다.
  }, [values, active, activeIdx, enabled]);

  // active 가 items 에 없으면(예: 어느 프리셋에도 안 맞는 사용자 지정 값) 아무
  // segment 도 선택되지 않은 상태다 — 직전 위치에 pill 을 남기지 않는다.
  return { itemsRef, indicator: activeIdx < 0 ? null : indicator };
}
