import { useMemo } from 'react';

/**
 * EvalCyclePeerTasksCanvas — 내가 작성해야 할 동료 리뷰 대상 목록.
 * tasks[{evaluateeId, evaluateeName, submitted}] + onSelect(evaluateeId).
 */

const DEFAULT_LABELS = {
  title: '동료 리뷰',
  subtitle: '배정된 동료를 평가하세요.',
  empty: '배정된 동료 리뷰가 없습니다.',
  write: '작성',
  edit: '수정',
  done: '제출 완료',
  pending: '미작성',
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

export default function EvalCyclePeerTasksCanvas({
  cycle,
  tasks = [],
  labels: providedLabels,
  onSelect,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          <p className="evc-summary">{cycle?.name ? cycle.name : L.subtitle}</p>
        </div>
      </header>

      <div className="evc-list">
        {tasks.length === 0 ? (
          <div className="evc-empty" data-testid="evpt-empty">
            <p className="evc-empty-sub">{L.empty}</p>
          </div>
        ) : (
          tasks.map((t) => (
            <div className="evc-card evpt-row" key={t.evaluateeId} data-testid="evpt-row">
              <div>
                <span className="evc-card-name">{t.evaluateeName || t.evaluateeId}</span>
                <span className={`evc-status-badge tone-${t.submitted ? 'success' : 'neutral'}`} style={{ marginLeft: 'var(--spacing-md, 8px)' }}>
                  {t.submitted ? L.done : L.pending}
                </span>
              </div>
              <button
                type="button"
                className={`evc-btn ${t.submitted ? 'is-ghost' : 'is-primary'}`}
                onClick={() => onSelect && onSelect(t.evaluateeId)}
                data-testid="evpt-write"
              >
                {t.submitted ? L.edit : L.write}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
