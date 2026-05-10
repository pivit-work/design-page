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

  useLayoutEffect(() => {
    if (!enabled) return;
    const idx = values.findIndex((v) => v === active);
    const node = itemsRef.current[idx];
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
  }, [values, active, enabled]);

  return { itemsRef, indicator };
}
