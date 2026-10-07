import { useMemo, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';
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
  // 리더 정책 §6.0 — 동료 리뷰 = 피드백 전용
  feedbackOnlyNotice: '',
  emptyTitle: '확정할 대상이 없습니다',
  emptySub: '피평가자별 동료 리뷰어 후보를 추가해 주세요.',
  // PW-1227 — 후보가 0명인 카드. 추천이 없어도 리더가 직접 넣을 수 있다고 알린다.
  noNominees: '아직 지명된 동료 리뷰어가 없습니다.',
  nominees: '확정 대상 {{count}}명',
  confirmedBadge: '✓ 확정 · {{count}}명에게 발송됨',
  confirm: '최종 확정 → 발송',
  nominationChanged: '지정이 변경되었습니다',
  nominationChangedConfirmHint: '지정이 변경되었습니다. 목록을 확인한 뒤 확정해 주세요.',
  evaluateeCount: '피평가자 {{count}}명',
  expandAll: '전체 펼치기',
  collapseAll: '전체 접기',
  addPlaceholder: '+ 동료 리뷰어 직접 추가',
  // §6.3.2 조직 + 이름(한글·영문) 검색 — 2글자 이상, 최대 10건
  searchDeptAll: '전체 조직',
  searchPlaceholder: '이름 (한글·영문)',
  searchHint: '이름을 2글자 이상 입력하세요.',
  searchEmpty: '일치하는 구성원이 없습니다.',
  searchAdd: '추가',
  // §6.3.0·§6.4.1 확정 뒤 진행 추적
  submittedProgress: '제출 {{done}}/{{total}}',
  allSubmitted: '제출 완료',
  statusNotSubmitted: '미제출',
  // §6.3.1 자발적 신청 — 출처 배지 · 카드 머리 대기 배지
  modeUnsolicited: '자발적',
  unsolicitedPending: '자발적 리뷰 {{count}}건 검토 대기',
  remove: '제외',
  restore: '복원',
  modeAiRecommend: 'AI 추천',
  modeSelfSelect: '본인 지명',
  modeLeaderAssign: '리더 추가',
  modeHrAssign: 'HR 지정',
  statusAssigned: '대기',
  statusCompleted: '제출 완료',
  statusLeaderApproved: '확정',
  statusLeaderReviewing: '검토 중',
  statusLeaderRejected: '제외됨',
  statusPendingLeaderReview: '채택 대기',
  statusDeclined: '제외됨',
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
  unsolicited: 'modeUnsolicited',
};
const STATUS_KEY = {
  assigned: 'statusAssigned',
  completed: 'statusCompleted',
  leader_reviewing: 'statusLeaderReviewing',
  leader_approved: 'statusLeaderApproved',
  leader_rejected: 'statusLeaderRejected',
  pending_leader_review: 'statusPendingLeaderReview',
  declined: 'statusDeclined',
};

/** 리더가 뺀 후보 — 확정·발송 대상이 아니다. `leader_rejected` 만 복원할 수 있다(§6.3.0). */
const REMOVED = new Set(['leader_rejected', 'declined']);
/** 확정·발송에 들어가는 후보 — 뺀 후보와 아직 채택하지 않은 자발적 신청을 뺀 나머지(§6.4). */
const isKept = (n) => !REMOVED.has(n.status) && n.status !== 'pending_leader_review';

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
/** §6.3.2 — 이름 표기 원값(이름·닉네임·영문 닉네임·영문 이름) 중 하나라도 키워드를 품나. */
const matchesName = (c, q) => {
  const needle = q.trim().toLowerCase();
  return (c.searchTerms ?? [c.name]).some((v) => v && String(v).toLowerCase().includes(needle));
};
const SEARCH_MIN = 2;
const SEARCH_MAX = 10;

/** §6.3 리더 직접 추가 — 조직 드롭다운 + 이름 키워드(AND). 「추가」나 Enter 로 넣는다. */
function PeerSearch({ addable, L, onPick }) {
  const [dept, setDept] = useState('');
  const [q, setQ] = useState('');
  const depts = useMemo(
    () => [...new Set(addable.map((c) => c.department).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [addable],
  );
  const ready = q.trim().length >= SEARCH_MIN;
  const results = ready
    ? addable.filter((c) => (!dept || c.department === dept) && matchesName(c, q)).slice(0, SEARCH_MAX)
    : [];
  const pick = (c) => {
    onPick(c.id);
    setQ('');
  };
  return (
    <div className="evp-search" data-testid="evp-search">
      <div className="evp-search-row">
        <select
          className="evc-input evp-search-dept"
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          data-testid="evp-search-dept"
        >
          <option value="">{L.searchDeptAll}</option>
          {depts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <input
          className="evc-input evp-search-input"
          value={q}
          placeholder={L.searchPlaceholder}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results.length > 0) {
              e.preventDefault();
              pick(results[0]);
            }
          }}
          data-testid="evp-search-input"
        />
      </div>
      {!ready ? (
        <p className="evc-empty-sub" data-testid="evp-search-hint">{L.searchHint}</p>
      ) : results.length === 0 ? (
        <p className="evc-empty-sub" data-testid="evp-search-empty">{L.searchEmpty}</p>
      ) : (
        <div className="evp-search-results">
          {results.map((c) => (
            <div className="evp-search-result" key={c.id} data-testid="evp-search-result">
              <span className="evp-nominee-name">{c.name}</span>
              {(c.department || c.job) && (
                <span className="evp-nominee-job">{[c.department, c.job].filter(Boolean).join(' · ')}</span>
              )}
              <button type="button" className="evc-btn is-ghost" onClick={() => pick(c)} data-testid="evp-search-add">
                {L.searchAdd}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
  onRestoreNominee,
  onConfirm,
  adoptableIds,
  onAdopt,
  onReject,
}) {
  const [confirmHint, setConfirmHint] = useState(false);
  const [adding, setAdding] = useState(false);
  const keptCount = group.nominees.filter(isKept).length;
  // §6.3.0 제출 진척 = 확정 명단 중 낸 사람. §6.4.1 전원 제출이면 「제출 완료」.
  const submittedCount = group.nominees.filter((n) => n.status === 'completed').length;
  const allSubmitted = group.confirmed && keptCount > 0 && submittedCount === keptCount;
  // §6.3.1 아직 채택하지 않은 자발적 신청 — 접혀 있어도 머리에서 보이게 센다.
  const pendingCount = group.confirmed ? 0 : group.nominees.filter((n) => n.status === 'pending_leader_review').length;
  // §6.4.1 — 확정 뒤에는 확정 명단만 보인다(뺀 후보는 숨긴다).
  const shown = group.confirmed
    ? group.nominees.filter((n) => !REMOVED.has(n.status))
    : group.nominees;
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
          {group.evaluatee.job && <span className="evp-nominee-job">{group.evaluatee.job}</span>}
        </button>
        {pendingCount > 0 && (
          <StatusBadge className="evc-status-badge evp-unsol-pending" data-testid="evp-unsol-pending">
            {fill(L.unsolicitedPending, { count: pendingCount })}
          </StatusBadge>
        )}
        {changed && (
          <StatusBadge className="evc-status-badge evp-changed" data-testid="evp-changed">
            {L.nominationChanged}
          </StatusBadge>
        )}
        {group.confirmed ? (
          <>
            <StatusBadge className="evc-status-badge tone-success" data-testid="evp-confirmed">
              {fill(L.confirmedBadge, { count: keptCount })} ·{' '}
              {fill(L.submittedProgress, { done: submittedCount, total: keptCount })}
            </StatusBadge>
            {allSubmitted && (
              <StatusBadge className="evc-status-badge tone-success" data-testid="evp-all-submitted">
                {L.allSubmitted}
              </StatusBadge>
            )}
          </>
        ) : (
          <>
            <span className="evc-pending">
              {fill(L.nominees, { count: keptCount })}
            </span>
            <button
              type="button"
              className="evc-btn is-primary evp-head-confirm"
              disabled={keptCount === 0}
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
            {group.nominees.length === 0 && !group.confirmed && (
              <p className="evc-empty-sub" data-testid="evp-no-nominees">{L.noNominees}</p>
            )}
            {shown.map((n) => {
              const pending = n.status === 'pending_leader_review';
              // §6.4.1 확정 뒤에는 동료별 제출 여부를 보인다(작성 중 여부는 받지 않는다).
              const statusText = group.confirmed
                ? n.status === 'completed'
                  ? L.statusCompleted
                  : L.statusNotSubmitted
                : (L[STATUS_KEY[n.status]] ?? n.status);
              const statusTone = group.confirmed
                ? n.status === 'completed' ? 'success' : 'neutral'
                : n.status === 'leader_approved' ? 'success' : 'neutral';
              return (
              <div
                className={`evp-nominee${REMOVED.has(n.status) ? ' is-removed' : ''}${pending ? ' is-pending-unsolicited' : ''}`}
                key={n.id}
                data-testid="evp-nominee"
              >
                <span className="evp-nominee-name">{n.evaluator.name || n.evaluator.id}</span>
                {n.evaluator.job && <span className="evp-nominee-job">{n.evaluator.job}</span>}
                {/* PW-1375 — «AI 추천» 근거(함께한 회의 N회 등)는 표시에 마우스를 올리면 뜬다 */}
                <StatusBadge
                  className={`evc-type-badge${n.assignMode === 'unsolicited' ? ' evp-unsolicited-badge' : ''}`}
                  title={n.evidenceText}
                >
                  {L[MODE_KEY[n.assignMode]] ?? n.assignMode}
                </StatusBadge>
                <StatusBadge className={`evc-status-badge tone-${statusTone}`}>
                  {statusText}
                </StatusBadge>
                {/* §6.3.1 자발적 신청은 「채택」 — 이 리더가 채택할 수 있는 신청(대기열에 있는 것)만 */}
                {!group.confirmed && pending && adoptableIds?.has(n.id) && (
                  <>
                    <button type="button" className="evc-btn is-ghost" onClick={() => onReject?.(n.id)} data-testid="evp-row-reject">
                      {L.reject}
                    </button>
                    <button type="button" className="evc-btn is-primary" onClick={() => onAdopt?.(n.id)} data-testid="evp-row-adopt">
                      {L.adopt}
                    </button>
                  </>
                )}
                {!group.confirmed && isKept(n) && (
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
                {!group.confirmed && n.status === 'leader_rejected' && onRestoreNominee && (
                  <button
                    type="button"
                    className="evc-btn is-ghost"
                    onClick={() => onRestoreNominee(n.id)}
                    data-testid="evp-restore"
                  >
                    {L.restore}
                  </button>
                )}
              </div>
              );
            })}
          </div>

          {!group.confirmed && addable.length > 0 && (
            <div className="evc-card-actions">
              {adding ? (
                <PeerSearch addable={addable} L={L} onPick={(id) => onAddNominee(group.evaluatee.id, id)} />
              ) : (
                <button type="button" className="evc-btn is-ghost" onClick={() => setAdding(true)} data-testid="evp-add-open">
                  {L.addPlaceholder}
                </button>
              )}
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
        <StatusBadge className="evc-status-badge tone-warn">{items.length}</StatusBadge>
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
  onRestoreNominee,
  onConfirm,
  onAdopt,
  onReject,
  onSeen,
  // 리더 정책 §6.2 — 상태를 다 받기 전에는 카드 자리에 스켈레톤(버튼이 눌리지 않게)
  loading = false,
  // 카드 목록 위에 끼우는 안내(앱이 그린다) — 예: 체험 AI 를 다 써 «AI 추천»을 건너뛰었다(PW-1394).
  // 캔버스가 화면에 고정돼 있어 밖에 두면 앱 위쪽 바 밑에 깔린다.
  notice = null,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  // §6.3.1 카드 안에서 채택·제외할 수 있는 신청 — 이 리더의 대기열에 든 것만(PW-931: 신청자의 조직장 몫)
  const adoptableIds = useMemo(() => new Set(unsolicited.map((r) => r.id)), [unsolicited]);
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

      {L.feedbackOnlyNotice && (
        <div className="evc-list">
          <p className="evx-notice" data-testid="evp-feedback-only">{L.feedbackOnlyNotice}</p>
        </div>
      )}

      {notice && <div className="evc-list">{notice}</div>}

      {loading && (
        <div className="evc-list" data-testid="evp-loading" aria-busy="true">
          <SkeletonList count={3} height={56} />
        </div>
      )}

      {!loading && unsolicited.length > 0 && (
        <div className="evc-list">
          <UnsolicitedSection items={unsolicited} L={L} onAdopt={onAdopt} onReject={onReject} />
        </div>
      )}

      {loading ? null : groups.length === 0 && unsolicited.length === 0 ? (
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
              onRestoreNominee={onRestoreNominee}
              onConfirm={onConfirm}
              adoptableIds={adoptableIds}
              onAdopt={onAdopt}
              onReject={onReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
