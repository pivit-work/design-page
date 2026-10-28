import OrgChartCanvas from './OrgChartCanvas.jsx';

/**
 * OrgListCanvas — **옛 이름.** 「리스트」는 더 이상 탭이 아니라 조직도 탭 안의 보기(트리 ↔ 리스트)다
 * (Figma 17788:33051 · 2026-10-28). 이 부품은 `OrgChartCanvas` 를 `view="list"` 로 여는 껍데기만 남겼다 —
 * 아직 이 이름으로 리스트 화면을 그리는 호스트가 그대로 뜨게. 새로 쓰는 곳은 `OrgChartCanvas` 의
 * `view` / `onViewChange` 를 쓴다.
 *
 * 트리로 전환하면 `onSubTabChange('orgchart')` 를 부른다 — 옛 호스트는 트리를 조직도 탭으로 알고 있다.
 */
export default function OrgListCanvas({ onSubTabChange, ...props }) {
  return (
    <OrgChartCanvas
      {...props}
      onSubTabChange={onSubTabChange}
      view="list"
      onViewChange={(next) => { if (next === 'tree') onSubTabChange?.('orgchart'); }}
    />
  );
}
