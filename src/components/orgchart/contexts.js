import React from 'react';

export const PositionsContext = React.createContext();
export const ModalContext = React.createContext();
export const MoveContext = React.createContext();
export const DragContext = React.createContext();
// 접힘 상태 — { isCollapsed(nodeId), toggleCollapse(nodeId) }.
// OrgNode 가 재귀 렌더라 prop 으로 내리면 전 depth 를 관통해야 해서 context 로 둔다.
export const CollapseContext = React.createContext(null);
