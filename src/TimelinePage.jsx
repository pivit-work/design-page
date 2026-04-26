import { TimelineCanvas } from './components';
import {
  MEMBERS,
  GROUPS,
  MEETINGS,
  SNIPPETS,
  getEventsForDate,
} from './timeline-demo-data.js';

/**
 * TimelinePage — 타임라인 demo wrapper.
 *
 * design-page 의 "데이터는 wrapper 에서, 컴포넌트는 props 로만" 패턴.
 * TimelineCanvas 는 순수 컴포넌트이며 내부 fallback 이 없으므로 wrapper 가
 * 모든 데이터/초기 그룹을 주입한다. pivit-work 는 자체 Page 컴포넌트에서
 * 실 데이터로 TimelineCanvas 를 렌더하므로 이 wrapper 는 사용하지 않는다.
 *
 * Weekly 탭은 weeklyReport 미주입 → "지금 생성하기" 빈 상태로 보임.
 * 데모 wrapper 는 백엔드가 없으므로 버튼이 눌려도 아무 일도 일어나지 않는다.
 */
export default function TimelinePage({ icons, baseUrl }) {
  return (
    <TimelineCanvas
      icons={icons}
      baseUrl={baseUrl}
      members={MEMBERS}
      meetings={MEETINGS}
      snippets={SNIPPETS}
      getEventsForDate={getEventsForDate}
      initialGroups={GROUPS}
    />
  );
}
