/** PW-2115 — 진행바(디자이너 OKR 묶음 카드 진행바 값). 0 이면 끝에 점만 남는다. */
export default function EvalProgressBar({ done = 0, total = 0, pct: pctProp, className = '', testId }) {
  const pct =
    pctProp != null ? Math.max(0, Math.min(100, pctProp)) : total > 0 ? Math.round((100 * done) / total) : 0;
  return (
    <span className={`evc-progress-track ${className}`.trim()} data-testid={testId} aria-hidden="true">
      <span className={`evc-progress-fill${pct === 0 ? ' is-zero' : ''}`} style={{ width: `${pct}%` }} />
    </span>
  );
}
