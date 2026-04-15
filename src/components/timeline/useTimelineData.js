import { useContext } from 'react';
import { TimelineDataContext } from './timelineDataContext.js';

export default function useTimelineData() {
  return useContext(TimelineDataContext);
}
