import { useMemo } from 'react';
import { TimelineDataContext } from './timelineDataContext.js';

// TimelineCanvas 하위 컴포넌트가 같은 데이터 세트를 공유하도록 주입하는
// Provider. Caller 는 members/meetings/snippets/getEventsForDate 를 모두 넘겨야
// 한다. 데모용 고정 데이터를 원하면 ../timeline-demo-data.js 를 import 해서
// 넘겨라. 패키지 내부에는 더 이상 fallback 이 없다.
export function TimelineDataProvider({ members, meetings, snippets, getEventsForDate, children }) {
  const value = useMemo(
    () => ({ members, meetings, snippets, getEventsForDate }),
    [members, meetings, snippets, getEventsForDate]
  );
  return (
    <TimelineDataContext.Provider value={value}>
      {children}
    </TimelineDataContext.Provider>
  );
}
