import { useMemo } from 'react';

/**
 * EvalCycleExcludedCanvas — 평가 제외 안내 화면 (멤버용).
 *
 * 진행 중 사이클에서 본인이 제외됐을 때 사유별 안내를 렌더하는 순수 컴포넌트.
 * exclusion 이 null 이면 "제외되지 않음" 빈 상태.
 */

const DEFAULT_LABELS = {
  pageTitle: '평가 제외 안내',
  excludedBadge: '평가 제외',
  cycleOngoing: '진행 중',
  cyclePeriod: '평가 기간',
  noticeBanner: '이번 평가 사이클의 평가 대상에서 제외되었습니다.',
  referenceDate: '평가 기준일',
  reasonNote: '사유',
  home: '홈으로',
  contactManager: '매니저에게 문의',
  notExcludedTitle: '평가 대상입니다',
  notExcludedSub: '진행 중인 사이클에서 제외되지 않았습니다.',
  // reason titles
  probationTitle: '수습 기간 중 평가 제외',
  probationMsg: '입사일 기준 수습 기간이 종료되지 않아 이번 평가에서 제외됩니다. 수습 종료 후 첫 사이클부터 참여합니다.',
  leaveTitle: '휴직 기간 중 평가 제외',
  leaveMsg: '휴직 중이므로 이번 평가에서 제외됩니다. 복직 후 첫 평가 사이클부터 참여합니다.',
  manualTitle: '이번 사이클 평가 대상에서 제외되었습니다',
  manualMsg: '자세한 사유는 HR 또는 담당 매니저에게 문의해 주세요.',
  roleChangeTitle: '직무 변경으로 이번 사이클 제외',
  roleChangeMsg: '평가 기간 중 직무가 변경되어 이번 사이클에서 제외됩니다. 다음 사이클부터 새로운 역할 기준으로 평가됩니다.',
  notInScopeTitle: '이번 사이클 평가 대상에 포함되지 않았습니다',
  notInScopeMsg: '이번 사이클은 특정 대상만 평가합니다. 다음 전사 사이클에서 참여하게 됩니다.',
};

const REASON_META = {
  probation: { emoji: '🌱', titleKey: 'probationTitle', msgKey: 'probationMsg', tone: 'success' },
  leave: { emoji: '🌿', titleKey: 'leaveTitle', msgKey: 'leaveMsg', tone: 'success' },
  manual: { emoji: 'ℹ️', titleKey: 'manualTitle', msgKey: 'manualMsg', tone: 'neutral' },
  role_change: { emoji: '🔄', titleKey: 'roleChangeTitle', msgKey: 'roleChangeMsg', tone: 'purple' },
  not_in_scope: { emoji: '🎯', titleKey: 'notInScopeTitle', msgKey: 'notInScopeMsg', tone: 'neutral' },
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

export default function EvalCycleExcludedCanvas({
  member,
  cycle,
  exclusion,
  labels: providedLabels,
  onHome,
  onContactManager,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);

  if (!exclusion || !cycle) {
    return (
      <div className="evc-root">
        <div className="evc-empty" data-testid="evx-not-excluded">
          <p className="evc-empty-title">{L.notExcludedTitle}</p>
          <p className="evc-empty-sub">{L.notExcludedSub}</p>
          {onHome && (
            <button type="button" className="evc-btn is-primary" onClick={onHome}>
              {L.home}
            </button>
          )}
        </div>
      </div>
    );
  }

  const meta = REASON_META[exclusion.exclusionType] ?? REASON_META.manual;

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div className="evx-identity">
          <h1 className="evc-title">{member?.name ?? ''}</h1>
          {member?.department && <span className="evx-dept">{member.department}</span>}
          <span className="evc-status-badge tone-neutral">{L.excludedBadge}</span>
        </div>
      </header>

      <div className="evc-list">
        {/* 사이클 배너 */}
        <section className="evc-card" data-testid="evx-cycle-banner">
          <div className="evc-card-head">
            <h3 className="evc-card-name">{cycle.name}</h3>
            <span className="evc-status-badge tone-info">{L.cycleOngoing}</span>
          </div>
          <div className="evc-card-meta">
            <span>{L.cyclePeriod}: {cycle.startDate} ~ {cycle.endDate}</span>
          </div>
          <p className="evx-notice">{L.noticeBanner}</p>
        </section>

        {/* 제외 사유 */}
        <section className={`evc-card evx-reason tone-${meta.tone}`} data-testid="evx-reason">
          <div className="evx-reason-head">
            <span className="evx-emoji" aria-hidden="true">{meta.emoji}</span>
            <h3 className="evc-card-name">{L[meta.titleKey]}</h3>
          </div>
          <p className="evx-reason-msg">{L[meta.msgKey]}</p>
          <div className="evx-detail-row">
            <span>{L.referenceDate}</span>
            <b>{exclusion.referenceDate}</b>
          </div>
          {exclusion.reason && (
            <div className="evx-detail-row">
              <span>{L.reasonNote}</span>
              <b>{exclusion.reason}</b>
            </div>
          )}
          <div className="evc-card-actions">
            <div className="evc-card-buttons">
              {onHome && (
                <button type="button" className="evc-btn is-ghost" onClick={onHome} data-testid="evx-home">
                  {L.home}
                </button>
              )}
              {exclusion.exclusionType === 'manual' && onContactManager && (
                <button type="button" className="evc-btn is-primary" onClick={onContactManager} data-testid="evx-contact">
                  {L.contactManager}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
