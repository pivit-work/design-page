import { useLayoutEffect, useRef, useState } from 'react';

// Segmented control sliding indicator.
// design-system-docs 의 SegmentedControl 모션 참고: 활성 세그먼트의
// offset/size 를 측정해 indicator 박스를 절대 배치하고 transition 으로 이동.
export default function useSegmentedIndicator(values, active, enabled = true) {
  const itemsRef = useRef([]);
  const [indicator, setIndicator] = useState(null);

  useLayoutEffect(() => {
    if (!enabled) return;
    const idx = values.findIndex((v) => v === active);
    const node = itemsRef.current[idx];
    if (!node) return;
    setIndicator({
      left: node.offsetLeft,
      top: node.offsetTop,
      width: node.offsetWidth,
      height: node.offsetHeight,
    });
  }, [values, active, enabled]);

  return { itemsRef, indicator };
}
