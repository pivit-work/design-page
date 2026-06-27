import { useMemo } from 'react';

/**
 * EvalCycleMonitoringCanvas — HR 진행 현황 (단계 진행·완료율·멤버 상태·리마인더·비상정지).
 * 순수 표현: stages/members/completionPct + 콜백(onRemind/onEmergencyStop/onReopen).
 */

const DEFAULT_LABELS = {
  title: '진행 현황',
  completion: '전체 완료율',
  stagesTitle: '단계별 진행',
  membersTitle: '구성원 현황',
  colMember: '구성원',
  colSelf: '셀프',
  colPeer: '동료 확정',
  colLeader: '하향',
  colGrade: '등급',
  remind: '미완료자 리마인더',
  reminded: '{{count}}명에게 리마인더 발송',
  emergencyStop: '🛑 비상 정지',
  stoppedBanner: '이 사이클은 비상 정지되었습니다. 제출이 차단됩니다.',
  reopen: '재개',
  done: '완료',
  notDone: '미완료',
  // stage keys
  stageSelfReview: '셀프 리뷰',
  stagePeerAssign: '동료 배정',
  stagePeerReview: '동료 리뷰',
  stageLeaderReview: '하향 리뷰',
  stageCalibration: '캘리브레이션',
  // self status
  selfNotStarted: '시작 전',
  selfInProgress: '작성 중',
  selfSubmitted: '제출',
};

const STAGE_KEY = {
  self_review: 'stageSelfReview',
  peer_assign: 'stagePeerAssign',
  peer_review: 'stagePeerReview',
  leader_review: 'stageLeaderReview',
  calibration: 'stageCalibration',
};
const SELF_KEY = {
  not_started: 'selfNotStarted',
  in_progress: 'selfInProgress',
  submitted: 'selfSubmitted',
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
const fill = (s, vars) => {
  let out = s == null ? '' : String(s);
  for (const k of Object.keys(vars)) out = out.replace(`{{${k}}}`, vars[k]);
  return out;
};

function Check({ ok }) {
  return (
    <span className={`evmon-check${ok ? ' is-on' : ''}`} aria-hidden="true">
      {ok ? '✓' : '·'}
    </span>
  );
}

export default function EvalCycleMonitoringCanvas({
  cycle,
  stages = [],
  completionPct = 0,
  members = [],
  status,
  labels: providedLabels,
  onRemind,
  onEmergencyStop,
  onReopen,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const stopped = status === 'emergency_stopped';
  const canStop = status && !['draft', 'done', 'emergency_stopped'].includes(status);

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          {cycle?.name && <p className="evc-summary">{cycle.name}</p>}
        </div>
        <div className="evmon-controls">
          {!stopped && onRemind && (
            <button type="button" className="evc-btn is-ghost" onClick={() => onRemind()} data-testid="evmon-remind">
              {L.remind}
            </button>
          )}
          {stopped
            ? onReopen && (
                <button type="button" className="evc-btn is-primary" onClick={() => onReopen()} data-testid="evmon-reopen">
                  {L.reopen}
                </button>
              )
            : canStop && onEmergencyStop && (
                <button type="button" className="evc-btn is-danger-ghost" onClick={() => onEmergencyStop()} data-testid="evmon-stop">
                  {L.emergencyStop}
                </button>
              )}
        </div>
      </header>

      {stopped && (
        <p className="evx-notice" data-testid="evmon-stopped" style={{ maxWidth: 1080, margin: '0 auto 12px', background: 'var(--utility-error-50)', color: 'var(--utility-error-500)' }}>
          {L.stoppedBanner}
        </p>
      )}

      <div className="evc-list">
        {/* 완료율 + 단계 진행 */}
        <section className="evc-card">
          <div className="evmon-completion">
            <span className="evc-field-label">{L.completion}</span>
            <span className="evmon-completion-value" data-testid="evmon-completion">{completionPct}%</span>
          </div>
          <h3 className="evc-card-name">{L.stagesTitle}</h3>
          <div className="evmon-stages">
            {stages.map((s) => {
              const pct = s.total > 0 ? Math.round((100 * s.done) / s.total) : 0;
              return (
                <div className="evmon-stage" key={s.key} data-testid="evmon-stage">
                  <span className="evmon-stage-label">{L[STAGE_KEY[s.key]] ?? s.key}</span>
                  <div className="evs-dist-track">
                    <div className="evs-dist-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="evmon-stage-count">{s.done}/{s.total}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* 멤버 현황 */}
        <section className="evc-card">
          <h3 className="evc-card-name">{L.membersTitle}</h3>
          <div className="evmon-table" role="table">
            <div className="evmon-row evmon-head" role="row">
              <span className="evmon-c-name">{L.colMember}</span>
              <span>{L.colSelf}</span>
              <span>{L.colPeer}</span>
              <span>{L.colLeader}</span>
              <span>{L.colGrade}</span>
            </div>
            {members.map((m) => (
              <div className="evmon-row" role="row" key={m.memberId} data-testid="evmon-member">
                <span className="evmon-c-name">{m.name || m.memberId}</span>
                <span className="evmon-self">{L[SELF_KEY[m.selfStatus]] ?? m.selfStatus}</span>
                <Check ok={m.peerConfirmed} />
                <Check ok={m.leaderSubmitted} />
                <Check ok={m.graded} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
