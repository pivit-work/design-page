import { useState } from 'react';
import { TimelineCanvas } from './components';
import {
  MEMBERS,
  GROUPS,
  MEETINGS,
  SNIPPETS,
  getEventsForDate,
} from './timeline-demo-data.js';
import { DEMO_WEEKLY_REPORT } from './components/timeline/weekly-demo-data.js';

/**
 * TimelinePage — 타임라인 demo wrapper.
 *
 * design-page 의 "데이터는 wrapper 에서, 컴포넌트는 props 로만" 패턴.
 * TimelineCanvas 는 순수 컴포넌트이며 내부 fallback 이 없으므로 wrapper 가
 * 모든 데이터/초기 그룹을 주입한다. pivit-work 는 자체 Page 컴포넌트에서
 * 실 데이터로 TimelineCanvas 를 렌더하므로 이 wrapper 는 사용하지 않는다.
 *
 * Weekly 탭: 시연 목적으로 "지금 생성하기" 버튼 클릭 시 DEMO_WEEKLY_REPORT 를
 * 즉시 주입한다. 실 환경에서는 onWeeklyGenerate 가 백엔드 API 를 호출.
 */
export default function TimelinePage({ icons, baseUrl }) {
  const [weeklyReport, setWeeklyReport] = useState(null);
  return (
    <TimelineCanvas
      icons={icons}
      baseUrl={baseUrl}
      members={MEMBERS}
      meetings={MEETINGS}
      snippets={SNIPPETS}
      getEventsForDate={getEventsForDate}
      initialGroups={GROUPS}
      weeklyReport={weeklyReport}
      onWeeklyGenerate={() => setWeeklyReport(DEMO_WEEKLY_REPORT)}
    />
  );
}
