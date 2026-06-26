import { useMemo } from 'react';

/**
 * EvalCycleSummaryCanvas — HR 종합 리포트 (집계).
 * 참여/제출/등급 통계 + 등급 분포 막대. 순수 표현.
 */

const DEFAULT_LABELS = {
  title: '종합 리포트',
  statParticipants: '평가 대상',
  statSelfSubmitted: '셀프 제출',
  statGraded: '등급 확정',
  unit: '명',
  distributionTitle: '등급 분포',
  empty: '아직 집계할 데이터가 없습니다.',
};

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
function mergeLabels(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (isObj(provided[k])) out[k] = mergeLabels(base[k] || {}, provided[k]);
    else if (provided[k] !== undefined) out[k] = provided[k];
  }
  return out;
}

export default function EvalCycleSummaryCanvas({
  cycle,
  totalParticipants = 0,
  selfSubmittedCount = 0,
  gradedCount = 0,
  gradeDistribution = [],
  gradeLabels = {},
  labels: providedLabels,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const maxCount = Math.max(1, ...gradeDistribution.map((d) => d.count));

  const stats = [
    { key: 'p', label: L.statParticipants, value: totalParticipants },
    { key: 's', label: L.statSelfSubmitted, value: selfSubmittedCount },
    { key: 'g', label: L.statGraded, value: gradedCount },
  ];

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          {cycle?.name && <p className="evc-summary">{cycle.name}</p>}
        </div>
      </header>

      <div className="evc-list">
        <div className="evs-stats" data-testid="evs-stats">
          {stats.map((s) => (
            <div className="evs-stat" key={s.key}>
              <span className="evs-stat-value">{s.value}</span>
              <span className="evs-stat-label">
                {s.label}
                <span className="evs-stat-unit"> {L.unit}</span>
              </span>
            </div>
          ))}
        </div>

        <section className="evc-card">
          <h3 className="evc-card-name">{L.distributionTitle}</h3>
          {gradeDistribution.length === 0 ? (
            <p className="evc-empty-sub">{L.empty}</p>
          ) : (
            <div className="evs-dist">
              {gradeDistribution.map((d) => (
                <div className="evs-dist-row" key={d.gradeKey} data-testid="evs-dist-row">
                  <span className="evs-dist-label">
                    {gradeLabels[d.gradeKey] ?? d.gradeKey}
                  </span>
                  <div className="evs-dist-track">
                    <div
                      className="evs-dist-fill"
                      style={{ width: `${(d.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="evs-dist-count">{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
