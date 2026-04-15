import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { HEADER_H, BOTTOM_H, WEEK_DAY_COL_W } from '../constants.js';

// 주별 뷰의 day 컬럼 min width. 이 값 아래로는 줄어들지 않음(가로 스크롤 발생).
const WEEK_DAY_COL_MIN = 130;

// 좌/우 높이와 scroll range 가 서로 달라서 1:1 scrollTop sync 로는 끝에서
// 필연적으로 어긋난다(한쪽이 먼저 clamp). 그래서 왼쪽 컬럼은 자체 스크롤을
// 포기하고, 오른쪽의 scrollTop 을 그대로 transform: translateY 로 mirror
// 한다. 왼쪽에서 휠이 발생하면 오른쪽 scrollTop 을 대신 갱신해서 동일한
// 경로로 흐르게 한다. 단일 스크롤 소스 → 경쟁 상태 없음, clamp 없음.
//
// 오른쪽 inner 에는 spacerH 만큼의 빈 영역이 아래에 추가되는데, 이 spacer
// 가 있어야 오른쪽을 끝까지 스크롤했을 때 왼쪽 마지막 멤버가 가시 영역
// 하단에 정확히 걸린다.
export default function useScrollMirror({ enabled, dayCount }) {
  const leftMidRef = useRef(null);
  const leftContentRef = useRef(null);
  const rightScrollRef = useRef(null);

  const [spacerH, setSpacerH] = useState(BOTTOM_H);
  const [dayColW, setDayColW] = useState(WEEK_DAY_COL_W);

  useLayoutEffect(() => {
    if (!enabled) return;
    const leftMid = leftMidRef.current;
    const rightScroll = rightScrollRef.current;
    if (!leftMid || !rightScroll) return;
    const compute = () => {
      const targetSpacer = Math.max(
        0,
        rightScroll.clientHeight - leftMid.clientHeight - HEADER_H
      );
      setSpacerH((prev) => (prev === targetSpacer ? prev : targetSpacer));
      const targetColW = Math.max(
        WEEK_DAY_COL_MIN,
        rightScroll.clientWidth / dayCount
      );
      setDayColW((prev) => (prev === targetColW ? prev : targetColW));
    };
    compute();
    // view 가 바뀌면 새로 mount 된 grid 로 scrollTop 이 reset 되므로 왼쪽
    // transform 도 따라 0 으로 동기화.
    if (leftContentRef.current) {
      leftContentRef.current.style.transform = `translateY(${-rightScroll.scrollTop}px)`;
    }
    const ro = new ResizeObserver(compute);
    ro.observe(leftMid);
    ro.observe(rightScroll);
    return () => ro.disconnect();
  }, [enabled, dayCount]);

  // 왼쪽 컬럼 영역에서 휠이 발생하면 오른쪽 scrollTop 에 deltaY 를 더해서
  // 스크롤을 forward 한다. React 17+ 는 root 에 onWheel 을 passive 로 붙이기
  // 때문에 React 의 onWheel 에서는 preventDefault 가 무시된다 → 여기서
  // passive:false 로 직접 addEventListener 한다.
  useEffect(() => {
    if (!enabled) return;
    const el = leftMidRef.current;
    if (!el) return;
    const onWheel = (e) => {
      const right = rightScrollRef.current;
      if (!right) return;
      e.preventDefault();
      right.scrollTop += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [enabled]);

  // 오른쪽이 세로로 스크롤될 때 왼쪽 컬럼 content wrapper 에 같은 양의
  // translateY 를 적용해 mirror. DOM 직접 조작으로 매 스크롤마다 React
  // 렌더를 피한다.
  const handleRightScroll = (e) => {
    const content = leftContentRef.current;
    if (!content) return;
    content.style.transform = `translateY(${-e.target.scrollTop}px)`;
  };

  return {
    leftMidRef,
    leftContentRef,
    rightScrollRef,
    spacerH,
    dayColW,
    handleRightScroll,
  };
}
