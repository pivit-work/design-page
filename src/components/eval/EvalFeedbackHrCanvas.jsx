import { useMemo } from 'react';

/**
 * EvalFeedbackHrCanvas — HR 피드백 현황.
 * KPI(총 피드백·수신자·작성자·SBI 준수율) + 작성자(매니저) 활동.
 */

const DEFAULT_LABELS = {
  title: '피드백 현황',
  subtitle: '조직 전체 피드백 활동',
  total: '총 피드백',
  recipients: '수신자',
  contributors: '작성자',
  sbiRate: 'SBI 준수율',
  unit: '건',
  people: '명',
  sendersTitle: '작성자 활동',
  empty: '아직 피드백이 없습니다.',
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

export default function EvalFeedbackHrCanvas({
  stats,
  labels: providedLabels,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const s = stats ?? {
    total: 0,
    recipients: 0,
    contributors: 0,
    sbiCompliantRate: 0,
    senders: [],
  };
  const maxCount = Math.max(1, ...s.senders.map((x) => x.count));

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          <p className="evc-summary">{L.subtitle}</p>
        </div>
      </header>

      <div className="evc-list">
        <div className="evs-stats" data-testid="evfh-stats">
          {[
            { k: 't', label: L.total, value: s.total, unit: L.unit },
            { k: 'r', label: L.recipients, value: s.recipients, unit: L.people },
            { k: 'c', label: L.contributors, value: s.contributors, unit: L.people },
            { k: 's', label: L.sbiRate, value: `${s.sbiCompliantRate}%`, unit: '' },
          ].map((x) => (
            <div className="evs-stat" key={x.k}>
              <span className="evs-stat-value">{x.value}</span>
              <span className="evs-stat-label">
                {x.label}
                {x.unit ? <span className="evs-stat-unit"> {x.unit}</span> : null}
              </span>
            </div>
          ))}
        </div>

        <section className="evc-card">
          <h3 className="evc-card-name">{L.sendersTitle}</h3>
          {s.senders.length === 0 ? (
            <p className="evc-empty-sub">{L.empty}</p>
          ) : (
            <div className="evs-dist">
              {s.senders.map((sd) => (
                <div className="evs-dist-row" key={sd.authorId} data-testid="evfh-sender-row">
                  <span className="evs-dist-label">{sd.name || sd.authorId}</span>
                  <div className="evs-dist-track">
                    <div className="evs-dist-fill" style={{ width: `${(sd.count / maxCount) * 100}%` }} />
                  </div>
                  <span className="evs-dist-count">{sd.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
