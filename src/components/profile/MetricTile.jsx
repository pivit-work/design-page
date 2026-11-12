/** 지표 칸 하나 — 회색 둥근 칸에 이름표 12/600 과 값 20/500 (Figma 17873:33554). */
export default function MetricTile({ label, value }) {
  return (
    <div className="profile-metric-tile">
      <p className="profile-metric-label">{label}</p>
      <p className="profile-metric-value">{value}</p>
    </div>
  );
}
