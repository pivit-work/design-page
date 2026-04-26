import { useRef, useState } from 'react';
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
 * Weekly 탭은 데모용으로 4초 가짜 생성 후 DEMO_WEEKLY_REPORT 주입.
 */
export default function TimelinePage({ icons, baseUrl }) {
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [weeklyIsGenerating, setWeeklyIsGenerating] = useState(false);
  const generateTimerRef = useRef(null);

  const handleWeeklyGenerate = () => {
    if (weeklyIsGenerating) return;
    setWeeklyIsGenerating(true);
    if (generateTimerRef.current) clearTimeout(generateTimerRef.current);
    generateTimerRef.current = setTimeout(() => {
      setWeeklyReport(DEMO_WEEKLY_REPORT);
      setWeeklyIsGenerating(false);
    }, 4000);
  };

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
      weeklyIsGenerating={weeklyIsGenerating}
      onWeeklyGenerate={handleWeeklyGenerate}
    />
  );
}
