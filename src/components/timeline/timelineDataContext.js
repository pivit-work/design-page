import { createContext } from 'react';

// TimelineCanvas 하위 컴포넌트에게 동일한 데이터 세트를 내려주기 위한 컨텍스트.
// TimelineDataProvider 가 항상 감싸며, Provider 바깥에서는 null 이다.
export const TimelineDataContext = createContext(null);
