import { useMemo } from 'react';

/**
 * EvalCyclePeerConfirmCanvas — 동료 리뷰어 확정 (리더 게이트, 신규).
 *
 * 피평가자별 추천 동료 리뷰어 목록을 검토·가감하고 최종 확정→발송하는 순수 컴포넌트.
 * groups/candidates + 콜백(onAddNominee/onRemoveNominee/onConfirm)을 받아 렌더.
 */

const DEFAULT_LABELS = {
  title: '동료 리뷰어 확정',
  subtitle: 'AI·본인·HR이 추천한 동료 리뷰어를 검토하고, 가감 후 최종 확정하세요.',
  emptyTitle: '확정할 대상이 없습니다',
  emptySub: '피평가자별 동료 리뷰어 후보를 추가해 주세요.',
  nominees: '확정 대상 {{count}}명',
  confirmedBadge: '✓ 확정 · {{count}}명에게 발송됨',
  confirm: '최종 확정 → 발송',
  addPlaceholder: '+ 동료 추가',
  remove: '제외',
  modeAiRecommend: 'AI 추천',
  modeSelfSelect: '본인 지명',
  modeLeaderAssign: '리더 추가',
  modeHrAssign: 'HR 지정',
  statusAssigned: '대기',
  statusCompleted: '제출 완료',
  statusLeaderApproved: '확정',
  statusLeaderRejected: '반려',
};

const MODE_KEY = {
  ai_recommend: 'modeAiRecommend',
  self_select: 'modeSelfSelect',
  leader_assign: 'modeLeaderAssign',
  hr_assign: 'modeHrAssign',
};
const STATUS_KEY = {
  assigned: 'statusAssigned',
  completed: 'statusCompleted',
  leader_approved: 'statusLeaderApproved',
  leader_rejected: 'statusLeaderRejected',
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

function PeerGroupCard({ group, candidates, labels: L, onAddNominee, onRemoveNominee, onConfirm }) {
  const takenIds = new Set([
    group.evaluatee.id,
    ...group.nominees.map((n) => n.evaluator.id),
  ]);
  const addable = candidates.filter((c) => !takenIds.has(c.id));

  return (
    <section className="evc-card" data-testid="evp-group">
      <div className="evc-card-head">
        <h3 className="evc-card-name">{group.evaluatee.name || group.evaluatee.id}</h3>
        {group.confirmed ? (
          <span className="evc-status-badge tone-success">
            {fill(L.confirmedBadge, { count: group.nominees.length })}
          </span>
        ) : (
          <span className="evc-pending">
            {fill(L.nominees, { count: group.nominees.length })}
          </span>
        )}
      </div>

      <div className="evp-nominees">
        {group.nominees.map((n) => (
          <div className="evp-nominee" key={n.id} data-testid="evp-nominee">
            <span className="evp-nominee-name">{n.evaluator.name || n.evaluator.id}</span>
            <span className="evc-type-badge">{L[MODE_KEY[n.assignMode]] ?? n.assignMode}</span>
            <span className={`evc-status-badge tone-${n.status === 'leader_approved' ? 'success' : 'neutral'}`}>
              {L[STATUS_KEY[n.status]] ?? n.status}
            </span>
            {!group.confirmed && (
              <button
                type="button"
                className="evp-remove"
                onClick={() => onRemoveNominee(n.id)}
                aria-label={L.remove}
                data-testid="evp-remove"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {!group.confirmed && (
        <div className="evc-card-actions">
          {addable.length > 0 && (
            <select
              className="evc-input evp-add-select"
              value=""
              onChange={(e) => {
                if (e.target.value) onAddNominee(group.evaluatee.id, e.target.value);
              }}
              data-testid="evp-add"
            >
              <option value="">{L.addPlaceholder}</option>
              {addable.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.department ? ` · ${c.department}` : ''}
                </option>
              ))}
            </select>
          )}
          <div className="evc-card-buttons">
            <button
              type="button"
              className="evc-btn is-primary"
              disabled={group.nominees.length === 0}
              onClick={() => onConfirm(group.evaluatee.id)}
              data-testid="evp-confirm"
            >
              {L.confirm}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function EvalCyclePeerConfirmCanvas({
  groups = [],
  candidates = [],
  labels: providedLabels,
  onAddNominee,
  onRemoveNominee,
  onConfirm,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          <p className="evc-summary">{L.subtitle}</p>
        </div>
      </header>

      {groups.length === 0 ? (
        <div className="evc-empty" data-testid="evp-empty">
          <p className="evc-empty-title">{L.emptyTitle}</p>
          <p className="evc-empty-sub">{L.emptySub}</p>
        </div>
      ) : (
        <div className="evc-list">
          {groups.map((g) => (
            <PeerGroupCard
              key={g.evaluatee.id}
              group={g}
              candidates={candidates}
              labels={L}
              onAddNominee={onAddNominee}
              onRemoveNominee={onRemoveNominee}
              onConfirm={onConfirm}
            />
          ))}
        </div>
      )}
    </div>
  );
}
