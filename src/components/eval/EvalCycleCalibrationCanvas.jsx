import { useMemo } from 'react';
import { AlertIcon } from './evalIcons.jsx';

/**
 * EvalCycleCalibrationCanvas — 캘리브레이션(위원회 등급 조정).
 * 등급 분포(+이상치 경고) + 구성원별 등급 조정 select. onAdjust(memberId, gradeKey).
 */

const DEFAULT_LABELS = {
  title: '캘리브레이션',
  distributionTitle: '등급 분포',
  membersTitle: '구성원 등급 조정',
  colMember: '구성원',
  colGrade: '등급',
  total: '대상',
  unit: '명',
  warnHigh: '탁월 비율이 30%를 초과합니다. 분포를 재검토하세요.',
  empty: '등급이 확정된 구성원이 없습니다.',
  unset: '미지정',
};

const WARN_GRADE = 'exceeds';
const WARN_RATIO = 0.3;

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

export default function EvalCycleCalibrationCanvas({
  cycle,
  total = 0,
  distribution = [],
  members = [],
  gradeOptions = [],
  gradeLabels = {},
  labels: providedLabels,
  onAdjust,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));
  const exceeds = distribution.find((d) => d.gradeKey === WARN_GRADE);
  const warnHigh = total > 0 && exceeds && exceeds.count / total > WARN_RATIO;

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          {cycle?.name && <p className="evc-summary">{cycle.name}</p>}
        </div>
        <span className="evc-field-label">
          {L.total} {total} {L.unit}
        </span>
      </header>

      <div className="evc-list">
        <section className="evc-card">
          <h3 className="evc-card-name">{L.distributionTitle}</h3>
          {warnHigh && (
            <p className="evx-notice" data-testid="evcal-warn" style={{ background: 'var(--utility-warning-50)', color: 'var(--utility-warning-700, var(--utility-warning-500))' }}>
              <AlertIcon size={14} />
              <span>{L.warnHigh}</span>
            </p>
          )}
          {distribution.length === 0 ? (
            <p className="evc-empty-sub">{L.empty}</p>
          ) : (
            <div className="evs-dist">
              {distribution.map((d) => {
                const pct = total > 0 ? Math.round((100 * d.count) / total) : 0;
                return (
                  <div className="evs-dist-row" key={d.gradeKey} data-testid="evcal-dist-row">
                    <span className="evs-dist-label">{gradeLabels[d.gradeKey] ?? d.gradeKey}</span>
                    <div className="evs-dist-track">
                      <div className="evs-dist-fill" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                    </div>
                    <span className="evs-dist-count">{d.count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="evc-card">
          <h3 className="evc-card-name">{L.membersTitle}</h3>
          <div className="evmon-table">
            <div className="evmon-row evmon-head" style={{ gridTemplateColumns: '2fr 1fr' }}>
              <span className="evmon-c-name">{L.colMember}</span>
              <span>{L.colGrade}</span>
            </div>
            {members.map((m) => (
              <div className="evmon-row" style={{ gridTemplateColumns: '2fr 1fr' }} key={m.memberId} data-testid="evcal-member-row">
                <span className="evmon-c-name">{m.name || m.memberId}</span>
                <select
                  className="evc-select"
                  value={m.gradeKey ?? ''}
                  onChange={(e) => onAdjust && onAdjust(m.memberId, e.target.value)}
                  data-testid="evcal-grade-select"
                >
                  <option value="" disabled>
                    {L.unset}
                  </option>
                  {gradeOptions.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
