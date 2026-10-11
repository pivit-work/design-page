import { useState, useMemo } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Radio from '../shared/Radio.jsx';
import { CloseGlyph, PlusGlyph } from '../shared/lineIcons.jsx';
import { AlertIcon, CheckCircleIcon } from './evalIcons.jsx';

/**
 * EvalPeerVolunteerCanvas — 자발적(언솔리시티드) 동료 리뷰 신청 (F3, 멤버용).
 *
 * 기획서 `eval-app.jsx` 의 `PeerVolunteer` 를 옮겼다(멤버 정책 §4V · PW-1464).
 *
 * - 후보는 부서별로 묶는다 — 부서 머리(부서명·인원수)는 스크롤해도 위에 붙어 있고, 검색하면
 *   결과가 있는 부서만 남는다. 전체/검색 인원을 센다.
 * - 대상 1명 + 사유 20자 이상이면 「신청 담기」로 담고, 여러 명을 담은 뒤 「신청 제출 (N건)」으로
 *   한 번에 보낸다(`onSubmit(requests)` — 서버는 전부 넣거나 전부 거절한다).
 * - 이미 신청한 대상(내역·담은 목록)은 「신청함」, 이미 그 사람의 리뷰어로 배정된 대상은
 *   「이미 리뷰 대상입니다」로 표시하고 고를 수 없다.
 * - 보내고 나면 완료 블록을 띄운다. 아래 「내 신청 내역」은 언제나 보인다.
 * - 보내기에 실패하면 담은 목록을 그대로 두고 화면 안에 안내한다. `onSubmit` 이 던진 에러에
 *   `inlineMessage` 가 있으면 그 문구를 쓴다.
 *
 * 상태 코드값(`pending_leader_review` 등)은 화면에 그대로 내지 않는다 — 라벨로 바꾸고, 모르는
 * 값은 `statusUnknown` 으로 그린다.
 *
 * `segment` 는 헤더 아래에 그대로 놓는다 — 본인 지명 사이클에서 상위 화면이
 * [내 리뷰어 지정 | 자발적 리뷰 신청] 두 칸을 넣는 자리다(멤버 정책 §3.1.1 · PW-561).
 */

const MIN_REASON = 20;

const DEFAULT_LABELS = {
  title: '자발적 동료 리뷰 신청',
  subtitle:
    '지정받지 않았지만 리뷰를 써주고 싶은 동료를 신청할 수 있습니다. 신청은 담당 매니저 채택 후 확정됩니다.',
  guideTitle: '자발적 리뷰란?',
  guide:
    "공식적으로 리뷰어로 지정되지 않았더라도, 특정 동료에 대해 남기고 싶은 리뷰가 있다면 사유와 함께 신청할 수 있습니다. 여러 명을 신청하려면 대상·사유를 입력해 '신청 담기'로 추가한 뒤 한 번에 제출하세요. 신청 내용은 매니저(리더)가 검토하여 채택 여부를 결정하며, 채택된 경우에만 리뷰 작성 요청이 전달됩니다. 제출한 신청의 진행 상태는 아래 '내 신청 내역'에서 확인할 수 있습니다.",
  pickTitle: '리뷰 대상 선택',
  required: '필수',
  pickPrompt: '리뷰를 남길 동료를 선택하세요',
  pickSelected: '{{name}} 선택됨',
  countAll: '전체 {{n}}명',
  countSearch: '검색 {{n}}명',
  targetPlaceholder: '이름·부서로 검색',
  groupHead: '{{dept}} · {{n}}명',
  noDepartment: '부서 없음',
  targetEmpty: '신청 가능한 동료가 없습니다.',
  noResult: '검색 결과 없음',
  badgeRequested: '신청함',
  badgeAssigned: '이미 리뷰 대상입니다',
  reasonLabel: '신청 사유',
  reasonGuide: '선택한 대상별로 작성 — 함께 일한 맥락과 리뷰 필요성을 적어주세요',
  reasonPlaceholder: '이 동료를 리뷰하고 싶은 이유를 구체적으로 작성해 주세요. (최소 20자)',
  reasonCount: '{{n}}자',
  reasonMin: '(최소 {{min}}자)',
  addDraft: '신청 담기',
  draftsTitle: '담은 신청 · {{n}}건',
  removeDraft: '{{name}} 신청 빼기',
  submit: '신청 제출',
  submitCount: '신청 제출 ({{n}}건)',
  submitting: '제출 중…',
  submitHint: '{{n}}건을 매니저에게 채택 검토 요청합니다',
  submitEmpty: '먼저 신청을 담아주세요',
  submitError: '신청을 보내지 못했습니다. 담은 목록은 그대로 있으니 잠시 후 다시 제출해 주세요.',
  doneTitle: '자발적 리뷰 신청 완료',
  doneStatus: '매니저 채택 검토 대기',
  doneBody:
    "매니저에게 채택 검토 요청이 전달되었습니다. 진행 상태는 아래 '내 신청 내역'에서 확인할 수 있습니다.",
  historyTitle: '내 신청 내역',
  historyCount: '{{n}}건',
  historySub: '이번 사이클에 내가 제출한 자발적 리뷰 신청과 매니저 검토 상태입니다.',
  historyEmpty: '아직 신청 내역이 없습니다.',
  historyFailed: '신청 내역을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.',
  historyRequestedAt: '{{date}} 신청',
  excludeReason: '제외 사유: {{reason}}',
  statusPending: '매니저 검토 대기',
  statusApproved: '채택됨 · 리뷰 작성 요청',
  statusDeclined: '제외됨',
  statusUnknown: '상태 확인 중',
  emptyTitle: '신청 가능한 단계가 아닙니다',
  emptySub: '동료 배정 단계에서만 자발적 리뷰를 신청할 수 있습니다.',
};

/** 상태 코드값 → 라벨 키 · 딱지 색. 표에 없는 값은 `statusUnknown`(회색)으로 그린다. */
const STATUS_VIEW = {
  pending_leader_review: { key: 'statusPending', tone: 'warn' },
  leader_approved: { key: 'statusApproved', tone: 'success' },
  declined: { key: 'statusDeclined', tone: 'neutral' },
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
  for (const k of Object.keys(vars)) out = out.split(`{{${k}}}`).join(String(vars[k]));
  return out;
};

/** 신청 일자 — 「MM/DD」. 읽지 못하면 비운다. */
function shortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export default function EvalPeerVolunteerCanvas({
  available = true,
  candidates = [],
  requests = [],
  requestsFailed = false,
  labels: providedLabels,
  onSubmit,
  segment = null,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const history = useMemo(() => (Array.isArray(requests) ? requests : []), [requests]);

  // 이미 신청한 대상 — 서버가 표시한 것 + 내 신청 내역 + 지금 담은 것. 중복 담기·신청 불가.
  const requestedIds = useMemo(
    () =>
      new Set([
        ...candidates.filter((c) => c.relation === 'requested').map((c) => c.id),
        ...history.map((r) => r.evaluatee?.id).filter(Boolean),
        ...drafts.map((d) => d.id),
      ]),
    [candidates, history, drafts],
  );
  const blockOf = (c) =>
    requestedIds.has(c.id) ? 'requested' : c.relation === 'assigned' ? 'assigned' : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) =>
      [c.name, c.department].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [candidates, query]);

  // 부서별 묶음 — 부서 이름 순, 부서 없는 사람은 맨 뒤. 결과가 없는 부서는 안 나온다.
  const groups = useMemo(() => {
    const byDept = new Map();
    for (const c of filtered) {
      const key = c.department || '';
      if (!byDept.has(key)) byDept.set(key, []);
      byDept.get(key).push(c);
    }
    return [...byDept.entries()]
      .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
      .map(([dept, members]) => ({ dept, members }));
  }, [filtered]);

  const picked = candidates.find((c) => c.id === target) || null;
  const reasonLen = reason.trim().length;
  const reasonOk = reasonLen >= MIN_REASON;
  const canAdd = !!picked && !blockOf(picked) && reasonOk && !busy;
  const canSubmit = drafts.length > 0 && !busy;

  const addDraft = () => {
    if (!canAdd) return;
    setDrafts((prev) => [
      ...prev,
      { id: picked.id, name: picked.name, department: picked.department, reason: reason.trim() },
    ]);
    // 다음 대상을 고를 수 있게 입력을 비운다.
    setTarget('');
    setReason('');
    setError(null);
  };
  const removeDraft = (id) => setDrafts((prev) => prev.filter((d) => d.id !== id));

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit?.(drafts.map((d) => ({ evaluateeId: d.id, requestReason: d.reason })));
      setDrafts([]);
      setTarget('');
      setReason('');
      setQuery('');
      setDone(true);
    } catch (err) {
      // 담은 목록은 그대로 둔다 — 다시 누르면 같은 것이 간다.
      setError(err?.inlineMessage || L.submitError);
    } finally {
      setBusy(false);
    }
  };

  if (!available) {
    return (
      <div className="evc-root">
        {segment}
        <div className="evc-empty" data-testid="evpv-empty">
          <p className="evc-empty-title">{L.emptyTitle}</p>
          <p className="evc-empty-sub">{L.emptySub}</p>
        </div>
      </div>
    );
  }

  const form = (
    <>
      <section className="evc-card evpv-guide" data-testid="evpv-guide">
        <p className="evpv-guide-title">{L.guideTitle}</p>
        <p className="evc-empty-sub">{L.guide}</p>
      </section>

      <section className="evc-card" data-testid="evpv-pick">
        <div className="evc-card-head">
          <h3 className="evc-card-name">{L.pickTitle}</h3>
          <StatusBadge className="evc-status-badge tone-error">{L.required}</StatusBadge>
        </div>
        <div className="evpv-pick-bar">
          <span className={`evpv-pick-state${picked ? ' is-on' : ''}`} data-testid="evpv-pick-state">
            {picked ? fill(L.pickSelected, { name: picked.name }) : L.pickPrompt}
          </span>
          <span className="evpv-count" data-testid="evpv-count">
            {fill(L.countAll, { n: candidates.length })}
            {query.trim() && ` · ${fill(L.countSearch, { n: filtered.length })}`}
          </span>
        </div>
        <input
          id="evpv-search"
          className="evc-input"
          type="text"
          value={query}
          placeholder={L.targetPlaceholder}
          aria-label={L.targetPlaceholder}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="evpv-search"
        />
        <div className="evpv-groups" data-testid="evpv-candidates">
          {filtered.length === 0 ? (
            <p className="evpv-groups-empty" data-testid="evpv-candidates-empty">
              {candidates.length === 0 ? L.targetEmpty : L.noResult}
            </p>
          ) : (
            groups.map(({ dept, members }) => (
              <div key={dept || '-'} data-testid={`evpv-group-${dept || '-'}`}>
                <div className="evpv-group-head" data-testid="evpv-group-head">
                  {fill(L.groupHead, { dept: dept || L.noDepartment, n: members.length })}
                </div>
                {members.map((c) => {
                  const block = blockOf(c);
                  return (
                    <Radio
                      key={c.id}
                      className="evpv-row"
                      name="evpv-target"
                      value={c.id}
                      checked={target === c.id}
                      disabled={!!block || busy}
                      onChange={() => setTarget(c.id)}
                      data-testid={`evpv-cand-${c.id}`}
                    >
                      <span className="evpv-row-body">
                        <span className="evpv-cand-name">{c.name}</span>
                        {c.department && <span className="evpv-cand-dept">{c.department}</span>}
                      </span>
                      {block === 'requested' && (
                        <StatusBadge
                          className="evc-status-badge tone-neutral"
                          data-testid={`evpv-requested-${c.id}`}
                        >
                          {L.badgeRequested}
                        </StatusBadge>
                      )}
                      {block === 'assigned' && (
                        <StatusBadge
                          className="evc-status-badge tone-info"
                          data-testid={`evpv-assigned-${c.id}`}
                        >
                          {L.badgeAssigned}
                        </StatusBadge>
                      )}
                    </Radio>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="evc-card" data-testid="evpv-reason-card">
        <div className="evc-card-head">
          <label className="evc-card-name" htmlFor="evpv-reason">{L.reasonLabel}</label>
          <StatusBadge className="evc-status-badge tone-error">{L.required}</StatusBadge>
          <span className="evpv-reason-guide">{L.reasonGuide}</span>
        </div>
        <textarea
          id="evpv-reason"
          className={`evm-textarea evpv-reason${reasonLen > 0 && !reasonOk ? ' is-invalid' : ''}`}
          rows={4}
          value={reason}
          placeholder={L.reasonPlaceholder}
          onChange={(e) => setReason(e.target.value)}
          data-testid="evpv-reason"
        />
        <div className="evpv-reason-bar">
          <span
            className={`evpv-reason-count${reasonOk ? '' : ' evpv-reason-warn'}`}
            data-testid="evpv-reason-count"
          >
            {fill(L.reasonCount, { n: reasonLen })}
            {!reasonOk && ` ${fill(L.reasonMin, { min: MIN_REASON })}`}
          </span>
          <button
            type="button"
            className="evc-btn"
            disabled={!canAdd}
            onClick={addDraft}
            data-testid="evpv-add"
          >
            <PlusGlyph size={14} />
            {L.addDraft}
          </button>
        </div>
      </section>

      {drafts.length > 0 && (
        <section className="evc-card" data-testid="evpv-drafts">
          <h3 className="evc-card-name">{fill(L.draftsTitle, { n: drafts.length })}</h3>
          <ul className="evpv-draft-list">
            {drafts.map((d) => (
              <li key={d.id} className="evpv-draft" data-testid={`evpv-draft-${d.id}`}>
                <span className="evpv-row-body">
                  <span className="evpv-cand-name">
                    {d.name}
                    {d.department && <span className="evpv-cand-dept"> · {d.department}</span>}
                  </span>
                  <span className="evpv-draft-reason">{d.reason}</span>
                </span>
                <button
                  type="button"
                  className="evp-remove"
                  aria-label={fill(L.removeDraft, { name: d.name })}
                  disabled={busy}
                  onClick={() => removeDraft(d.id)}
                  data-testid={`evpv-remove-${d.id}`}
                >
                  <CloseGlyph size={14} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <p className="evx-notice is-error" role="alert" data-testid="evpv-submit-error">
          <AlertIcon size={16} />
          <span>{error}</span>
        </p>
      )}

      <div className="evpv-submit-bar">
        <span className="evpv-submit-hint" data-testid="evpv-submit-hint">
          {drafts.length > 0 ? fill(L.submitHint, { n: drafts.length }) : L.submitEmpty}
        </span>
        <button
          type="button"
          className="evc-btn is-primary"
          disabled={!canSubmit}
          onClick={submit}
          data-testid="evpv-submit"
        >
          {busy
            ? L.submitting
            : drafts.length > 0
              ? fill(L.submitCount, { n: drafts.length })
              : L.submit}
        </button>
      </div>
    </>
  );

  const doneBlock = (
    <section className="evc-card evpv-done" role="status" data-testid="evpv-done">
      <span className="evpv-done-icon" aria-hidden="true">
        <CheckCircleIcon size={28} />
      </span>
      <h3 className="evpv-done-title">{L.doneTitle}</h3>
      <StatusBadge className="evc-status-badge tone-warn">{L.doneStatus}</StatusBadge>
      <p className="evc-empty-sub">{L.doneBody}</p>
    </section>
  );

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          <p className="evc-summary">{L.subtitle}</p>
        </div>
      </header>
      {segment}

      <div className="evc-list">
        {done ? doneBlock : form}

        <section className="evc-card" data-testid="evpv-history">
          <div className="evc-card-head">
            <h3 className="evc-card-name">{L.historyTitle}</h3>
            {!requestsFailed && (
              <StatusBadge className="evc-status-badge tone-neutral">
                {fill(L.historyCount, { n: history.length })}
              </StatusBadge>
            )}
          </div>
          <p className="evc-empty-sub">{L.historySub}</p>
          {requestsFailed ? (
            <p className="evx-notice is-warn" role="alert" data-testid="evpv-history-failed">
              <AlertIcon size={16} />
              <span>{L.historyFailed}</span>
            </p>
          ) : history.length === 0 ? (
            <p className="evpv-groups-empty" data-testid="evpv-history-empty">{L.historyEmpty}</p>
          ) : (
            <ul className="evpv-draft-list">
              {history.map((r) => {
                const view = STATUS_VIEW[r.status];
                const date = shortDate(r.createdAt);
                return (
                  <li key={r.id} className="evpv-history-row" data-testid={`evpv-history-${r.id}`}>
                    <span className="evpv-row-body">
                      <span className="evpv-history-head">
                        <span className="evpv-cand-name">{r.evaluatee?.name}</span>
                        {r.evaluatee?.department && (
                          <span className="evpv-cand-dept">· {r.evaluatee.department}</span>
                        )}
                        {date && (
                          <span className="evpv-history-date">
                            {fill(L.historyRequestedAt, { date })}
                          </span>
                        )}
                      </span>
                      {r.requestReason && <span className="evpv-draft-reason">{r.requestReason}</span>}
                      <span>
                        <StatusBadge
                          className={`evc-status-badge tone-${view ? view.tone : 'neutral'}`}
                          data-testid={`evpv-status-${r.id}`}
                        >
                          {view ? L[view.key] : L.statusUnknown}
                        </StatusBadge>
                      </span>
                      {r.status === 'declined' && r.excludeReason && (
                        <span className="evpv-exclude-reason" data-testid={`evpv-exclude-${r.id}`}>
                          {fill(L.excludeReason, { reason: r.excludeReason })}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
