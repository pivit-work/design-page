import { useMemo } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';

/**
 * EvalCyclePeerTasksCanvas — 내가 작성해야 할 동료 리뷰 대상 목록.
 * tasks[{evaluateeId, evaluateeName, submitted}] + onSelect(evaluateeId).
 * waitsForSelf — 셀프 리뷰를 아직 안 냈다(member §3.2 「셀프 완료 후 오픈」). 목록 대신 빈 상태 칸에 안내만 둔다.
 */

const DEFAULT_LABELS = {
  title: '동료 리뷰',
  subtitle: '배정된 동료를 평가하세요.',
  empty: '배정된 동료 리뷰가 없습니다.',
  waitsForSelf: '셀프 리뷰를 제출하면 동료 리뷰가 열립니다.',
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
  waitsForSelf = false,
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
        {waitsForSelf ? (
          <div className="evc-empty" data-testid="evpt-waits-self">
            <p className="evc-empty-sub">{L.waitsForSelf}</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="evc-empty" data-testid="evpt-empty">
            <p className="evc-empty-sub">{L.empty}</p>
          </div>
        ) : (
          tasks.map((t) => (
            <div className="evc-card evpt-row" key={t.evaluateeId} data-testid="evpt-row">
              <div>
                <span className="evc-card-name">{t.evaluateeName || t.evaluateeId}</span>
                <StatusBadge className={`evc-status-badge tone-${t.submitted ? 'success' : 'neutral'}`} style={{ marginLeft: 'var(--spacing-md)' }}>
                  {t.submitted ? L.done : L.pending}
                </StatusBadge>
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
