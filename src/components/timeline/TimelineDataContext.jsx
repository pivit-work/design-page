import { useMemo } from 'react';
import {
  MEMBERS as DEFAULT_MEMBERS,
  MEETINGS as DEFAULT_MEETINGS,
  SNIPPETS as DEFAULT_SNIPPETS,
  getEventsForDate as defaultGetEventsForDate,
} from './constants.js';
import { TimelineDataContext } from './timelineDataContext.js';

export function TimelineDataProvider({ members, meetings, snippets, getEventsForDate, children }) {
  const value = useMemo(
    () => ({
      members: members ?? DEFAULT_MEMBERS,
      meetings: meetings ?? DEFAULT_MEETINGS,
      snippets: snippets ?? DEFAULT_SNIPPETS,
      getEventsForDate: getEventsForDate ?? defaultGetEventsForDate,
    }),
    [members, meetings, snippets, getEventsForDate]
  );
  return (
    <TimelineDataContext.Provider value={value}>
      {children}
    </TimelineDataContext.Provider>
  );
}
