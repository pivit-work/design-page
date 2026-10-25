import React from 'react';

export const PositionsContext = React.createContext();
export const ModalContext = React.createContext();
export const MoveContext = React.createContext();
export const DragContext = React.createContext();
// 접힘 상태 — { isCollapsed(nodeId), toggleCollapse(nodeId) }.
// OrgNode 가 재귀 렌더라 prop 으로 내리면 전 depth 를 관통해야 해서 context 로 둔다.
export const CollapseContext = React.createContext(null);
// 카드 값 덧씌우기 — { [member.id]: { workHours, attendance, … } }. 조직도 데이터(orgData)를 새로 짓지 않고
// 카드 몇 칸만 바꿀 때 쓴다(pivit-work PW-2210 — 근무시간 저장 직후). orgData 가 새 객체면 캔버스가 첫 화면 위치로 돌아간다.
export const MemberPatchContext = React.createContext(null);
