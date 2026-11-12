import MetricTile from './MetricTile.jsx';
import HealthChart from './HealthChart.jsx';

/** 「헬스 트렌드」 탭 (Figma 17873:34062) — 지표 세 칸 · 꺾은선 · 감지된 플래그. */
export default function HealthTrendTab({ trend, labels: L }) {
  return (
    <div className="profile-tab-body">
      <div className="profile-trend-grid">
        <MetricTile label={L.healthCurrent} value={trend.current} />
        <MetricTile label={L.healthChange} value={trend.change} />
        <MetricTile label={L.teamAverage} value={trend.teamAvg} />
      </div>

      <HealthChart points={trend.points || []} teamAverage={trend.teamAverage} dates={trend.dates || []} teamAverageLabel={L.teamAverage} />

      {trend.flags?.length > 0 && (
        <div className="profile-agenda-item">
          <p className="profile-section-title">{L.detectedFlags}</p>
          <div className="profile-flags">
            {trend.flags.map((f, i) => (
              <p key={i} className={`profile-flag profile-flag-${f.severity}`}>
                {f.label}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
