import { useMemo, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import { ChevronRightIcon } from './evalIcons.jsx';

/**
 * EvalCyclePeerConfirmCanvas — 동료 리뷰어 확정 (리더 게이트, 신규).
 *
 * 피평가자별 추천 동료 리뷰어 목록을 검토·가감하고 최종 확정→발송하는 순수 컴포넌트.
 * groups/candidates + 콜백(onAddNominee/onRemoveNominee/onConfirm)을 받아 렌더.
 *
 * [PW-561] 피평가자 카드는 아코디언이다(리더 정책 §6.3.0) — 기본 접힘, 머리(이름·확정 대상 수·확정 버튼)는
 * 접혀도 보인다. 머리를 누르면 펼치고, 목록 위 「전체 펼치기/접기」로 한꺼번에 바꾼다. 접힘 상태는 화면에만 있다.
 *
 * [PW-561] `group.nominationChanged` 이면 머리에 「지정이 변경되었습니다」(§6.3.3). 판정은 서버 몫이다.
 *   - 그 카드를 펼치면 `onSeen(evaluateeId)` 를 부른다 — 상위가 서버에 «봤다»를 알리고 다시 읽는다.
 *   - 표시가 붙은 채 **접힌** 카드의 확정 버튼은 확정하지 않고 카드를 펼치며 안내를 띄운다.
 */

const DEFAULT_LABELS = {
  title: '동료 리뷰어 확정',
  subtitle: 'AI·본인·HR이 추천한 동료 리뷰어를 검토하고, 가감 후 최종 확정하세요.',
  emptyTitle: '확정할 대상이 없습니다',
  emptySub: '피평가자별 동료 리뷰어 후보를 추가해 주세요.',
  nominees: '확정 대상 {{count}}명',
  confirmedBadge: '✓ 확정 · {{count}}명에게 발송됨',
  confirm: '최종 확정 → 발송',
  nominationChanged: '지정이 변경되었습니다',
  nominationChangedConfirmHint: '지정이 변경되었습니다. 목록을 확인한 뒤 확정해 주세요.',
  evaluateeCount: '피평가자 {{count}}명',
  expandAll: '전체 펼치기',
  collapseAll: '전체 접기',
  addPlaceholder: '+ 동료 추가',
  remove: '제외',
  modeAiRecommend: 'AI 추천',
  modeSelfSelect: '본인 지명',
  modeLeaderAssign: '리더 추가',
  modeHrAssign: 'HR 지정',
  statusAssigned: '대기',
  statusCompleted: '제출 완료',
  statusLeaderApproved: '확정',
  statusLeaderReviewing: '검토 중',
  statusLeaderRejected: '반려',
  // F3 자발적 요청 대기
  unsolicitedTitle: '자발적 리뷰 신청 대기',
  unsolicitedSub: '팀원이 직접 신청한 동료 리뷰입니다. 채택하면 리뷰어에게 작성 요청이 발송됩니다.',
  unsolicitedBadge: '자발적 요청',
  volunteerArrow: '→ 리뷰 대상',
  reasonLabel: '신청 사유',
  adopt: '채택',
  reject: '제외',
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
  leader_reviewing: 'statusLeaderReviewing',
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

function PeerGroupCard({
  group,
  candidates,
  labels: L,
  expanded,
  onToggle,
  onAddNominee,
  onRemoveNominee,
  onConfirm,
}) {
  const [confirmHint, setConfirmHint] = useState(false);
  const takenIds = new Set([
    group.evaluatee.id,
    ...group.nominees.map((n) => n.evaluator.id),
  ]);
  const addable = candidates.filter((c) => !takenIds.has(c.id));
  const changed = !group.confirmed && !!group.nominationChanged;

  // §6.3.3 — 표시가 붙은 채 접힌 카드는 확정하지 않고 펼친다. 펼친 뒤에는 종전대로 확정한다.
  const confirm = (e) => {
    e.stopPropagation();
    if (changed && !expanded) {
      setConfirmHint(true);
      onToggle(true);
      return;
    }
    setConfirmHint(false);
    onConfirm(group.evaluatee.id);
  };

  return (
    <section className={`evc-card evp-group${expanded ? ' is-open' : ''}`} data-testid="evp-group">
      <div className="evc-card-head evp-group-head" onClick={() => onToggle(!expanded)}>
        <button
          type="button"
          className="evp-toggle"
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(!expanded);
          }}
          data-testid="evp-toggle"
        >
          <span className="evp-chevron" aria-hidden="true">
            <ChevronRightIcon size={16} />
          </span>
          <h3 className="evc-card-name">{group.evaluatee.name || group.evaluatee.id}</h3>
        </button>
        {changed && (
          <StatusBadge className="evc-status-badge evp-changed" data-testid="evp-changed">
            {L.nominationChanged}
          </StatusBadge>
        )}
        {group.confirmed ? (
          <StatusBadge className="evc-status-badge tone-success">
            {fill(L.confirmedBadge, { count: group.nominees.length })}
          </StatusBadge>
        ) : (
          <>
            <span className="evc-pending">
              {fill(L.nominees, { count: group.nominees.length })}
            </span>
            <button
              type="button"
              className="evc-btn is-primary evp-head-confirm"
              disabled={group.nominees.length === 0}
              onClick={confirm}
              data-testid="evp-confirm"
            >
              {L.confirm}
            </button>
          </>
        )}
      </div>

      {confirmHint && !group.confirmed && (
        <p className="evp-changed-hint" role="alert" data-testid="evp-changed-hint">
          {L.nominationChangedConfirmHint}
        </p>
      )}

      {expanded && (
        <>
          <div className="evp-nominees">
            {group.nominees.map((n) => (
              <div className="evp-nominee" key={n.id} data-testid="evp-nominee">
                <span className="evp-nominee-name">{n.evaluator.name || n.evaluator.id}</span>
                <StatusBadge className="evc-type-badge">{L[MODE_KEY[n.assignMode]] ?? n.assignMode}</StatusBadge>
                <StatusBadge className={`evc-status-badge tone-${n.status === 'leader_approved' ? 'success' : 'neutral'}`}>
                  {L[STATUS_KEY[n.status]] ?? n.status}
                </StatusBadge>
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

          {!group.confirmed && addable.length > 0 && (
            <div className="evc-card-actions">
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
            </div>
          )}
        </>
      )}
    </section>
  );
}

function UnsolicitedSection({ items, L, onAdopt, onReject }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="evc-card" data-testid="evp-unsolicited" style={{ borderColor: 'var(--utility-warning-200)' }}>
      <div className="evc-card-head">
        <h3 className="evc-card-name">{L.unsolicitedTitle}</h3>
        <StatusBadge className="evc-status-badge tone-warning">{items.length}</StatusBadge>
      </div>
      <p className="evc-empty-sub">{L.unsolicitedSub}</p>
      <div className="evp-nominees">
        {items.map((r) => (
          <div key={r.id} className="evp-unsol-row" data-testid={`evp-unsol-${r.id}`}>
            <div className="evp-unsol-head">
              <span className="evp-nominee-name">{r.volunteer?.name || r.volunteer?.id}</span>
              <StatusBadge className="evc-type-badge">{L.unsolicitedBadge}</StatusBadge>
              <span className="evp-unsol-target">{L.volunteerArrow}: {r.evaluatee?.name || r.evaluatee?.id}</span>
            </div>
            {r.requestReason && (
              <p className="evp-unsol-reason"><b>{L.reasonLabel}</b> · {r.requestReason}</p>
            )}
            <div className="evc-card-buttons">
              <button type="button" className="evc-btn is-ghost" onClick={() => onReject(r.id)} data-testid={`evp-reject-${r.id}`}>
                {L.reject}
              </button>
              <button type="button" className="evc-btn is-primary" onClick={() => onAdopt(r.id)} data-testid={`evp-adopt-${r.id}`}>
                {L.adopt}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function EvalCyclePeerConfirmCanvas({
  groups = [],
  candidates = [],
  unsolicited = [],
  labels: providedLabels,
  onAddNominee,
  onRemoveNominee,
  onConfirm,
  onAdopt,
  onReject,
  onSeen,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  // 접힘 상태는 화면에만 있다 — 서버에 남기지 않고, 다시 들어오면 접혀 있다(§6.3.0).
  const [open, setOpen] = useState({});
  const setExpanded = (group, next) => {
    setOpen((prev) => ({ ...prev, [group.evaluatee.id]: next }));
    if (next && group.nominationChanged && !group.confirmed) onSeen?.(group.evaluatee.id);
  };
  const setAll = (next) => {
    setOpen(Object.fromEntries(groups.map((g) => [g.evaluatee.id, next])));
    if (next) {
      for (const g of groups) {
        if (g.nominationChanged && !g.confirmed && !open[g.evaluatee.id]) onSeen?.(g.evaluatee.id);
      }
    }
  };

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          <p className="evc-summary">{L.subtitle}</p>
        </div>
      </header>

      {unsolicited.length > 0 && (
        <div className="evc-list">
          <UnsolicitedSection items={unsolicited} L={L} onAdopt={onAdopt} onReject={onReject} />
        </div>
      )}

      {groups.length === 0 && unsolicited.length === 0 ? (
        <div className="evc-empty" data-testid="evp-empty">
          <p className="evc-empty-title">{L.emptyTitle}</p>
          <p className="evc-empty-sub">{L.emptySub}</p>
        </div>
      ) : (
        <div className="evc-list">
          {groups.length > 0 && (
            <div className="evp-toolbar">
              <span className="evp-toolbar-count">{fill(L.evaluateeCount, { count: groups.length })}</span>
              <button type="button" className="evc-btn is-ghost" onClick={() => setAll(true)} data-testid="evp-expand-all">
                {L.expandAll}
              </button>
              <button type="button" className="evc-btn is-ghost" onClick={() => setAll(false)} data-testid="evp-collapse-all">
                {L.collapseAll}
              </button>
            </div>
          )}
          {groups.map((g) => (
            <PeerGroupCard
              key={g.evaluatee.id}
              group={g}
              candidates={candidates}
              labels={L}
              expanded={!!open[g.evaluatee.id]}
              onToggle={(next) => setExpanded(g, next)}
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
