import { createContext } from 'react';

// 블록(그룹 카드·objective 행·구성원 칩) 드래그 오프셋 공유 컨텍스트.
// OkrDashboardCanvas 가 provider, 각 블록 컴포넌트가 useOkrDrag 로 소비.
export const OkrPositionsContext = createContext({ positions: {}, updatePosition: () => {} });
