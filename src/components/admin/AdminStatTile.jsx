/**
 * 어드민 요약 카드 한 칸 — manager StatTile 톤 (라벨 + display 폰트 큰 다크 숫자 + sub).
 */
export default function AdminStatTile({ label, value, sub }) {
  return (
    <div className="admin-stat-tile">
      <p className="admin-stat-label">{label}</p>
      <p className="admin-stat-value">{value}</p>
      {sub && <p className="admin-stat-sub">{sub}</p>}
    </div>
  );
}
