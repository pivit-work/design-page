/**
 * 매니저 페이지 KPI 단일 통계 타일.
 * label + value 2단.
 */
export default function StatTile({ label, value }) {
  return (
    <div className="manager-kpi-card manager-stat-tile">
      <p className="manager-stat-label">{label}</p>
      <p className="manager-stat-value">{value}</p>
    </div>
  );
}
