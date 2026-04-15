import { createContext } from 'react';
import {
  MEMBERS as DEFAULT_MEMBERS,
  MEETINGS as DEFAULT_MEETINGS,
  SNIPPETS as DEFAULT_SNIPPETS,
  getEventsForDate as defaultGetEventsForDate,
} from './constants.js';

// TimelineCanvas 하위 컴포넌트에게 동일한 데이터 세트를 내려주기 위한 컨텍스트.
// 외부 주입이 없으면 constants 의 mock 데이터를 사용한다.
export const TimelineDataContext = createContext({
  members: DEFAULT_MEMBERS,
  meetings: DEFAULT_MEETINGS,
  snippets: DEFAULT_SNIPPETS,
  getEventsForDate: defaultGetEventsForDate,
});
