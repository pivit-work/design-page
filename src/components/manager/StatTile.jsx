/**
 * 매니저 페이지 KPI 단일 통계 타일.
 * label + value 2단.
 *
 * 누를 수 없는 카드다 — PW-912 에서 더했던 누르기·눌린 모양은 디자이너 요청으로
 * 걷어 냈다(PW-2177). 원래 모양은 2026-05-09 디자이너 판 그대로다.
 */
export default function StatTile({ label, value }) {
  return (
    <div className="manager-kpi-card manager-stat-tile">
      <p className="manager-stat-label">{label}</p>
      <p className="manager-stat-value">{value}</p>
    </div>
  );
}
