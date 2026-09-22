import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import { AlertIcon, CheckCircleIcon, LockIcon } from './evalIcons.jsx';

/**
 * EvalPeerNominateCanvas — 동료 리뷰어 지정 (본인 지명 · self_select, 멤버용).
 *
 * 기획서 `eval-app.jsx` 의 `PeerNominate` 를 옮겼다(멤버 정책 §4Z · PW-561).
 * 나를 평가할 동료를 골라(최소 2명 · 상한 없음) 제출하면 리더가 최종 확정한다.
 *
 * 잠금(리더 확정 / 단계 종료)은 **화면이 계산하지 않는다** — `locked`·`lockReason` 을 받아 그리기만 한다
 * (§4Z.3-3 ②). 제출 후에도 잠기기 전까지는 고칠 수 있고 버튼이 「지정 수정」으로 바뀐다(§4Z.3-2).
 *
 * `segment` 는 헤더 아래에 그대로 놓는다 — 상위 화면이 [내 리뷰어 지정 | 자발적 리뷰 신청] 두 칸을 넣는 자리다.
 *
 * onSubmit(ids) 가 throw 하면 `err.toastMessage` 가 있으면 그 문구로, 없으면 `labels.toastError` 로 알린다.
 */

const DEFAULT_LABELS = {
  title: '동료 리뷰어 지정',
  subtitle: '나를 평가할 동료 리뷰어를 직접 선택하세요. 선택 후 리더가 최종 확정합니다.',
  guideTitle: '본인 지명 방식',
  guide:
    'HR이 이번 사이클의 동료 리뷰어를 본인 지명으로 설정했습니다. 나를 평가할 동료 리뷰어를 직접 선택하세요. 선택 후 리더가 최종 확정합니다.',
  pickTitle: '동료 리뷰어 선택',
  required: '필수',
  countSelected: '{{count}}명 선택됨',
  countShort: '(최소 {{min}}명 필요)',
  rule: '최소 {{min}}명 · 상한 없음',
  searchPlaceholder: '이름 또는 부서로 검색',
  noResult: '검색 결과 없음',
  noCandidates: '지정할 수 있는 동료가 없습니다.',
  hintBefore: '제출 시 리더에게 확정 요청이 전달됩니다',
  hintAfter: '리더가 확정하기 전까지 고칠 수 있습니다. 저장하면 리더의 확정 대기 목록이 갱신됩니다',
  submit: '지정 완료',
  resubmit: '지정 수정',
  submitting: '저장 중…',
  lockLeaderConfirmed: '리더가 확정했습니다. 변경이 필요하면 리더에게 말씀해 주세요.',
  lockPhaseClosed: '동료 리뷰어 확정 단계가 끝났습니다.',
  lockUnknown: '지금은 지정을 바꿀 수 없습니다.',
  belowMinimum:
    '지정한 동료 중 일부가 목록에서 빠져 {{min}}명에 못 미칩니다. 동료를 더 골라 다시 저장해 주세요.',
  toastSent: '동료 리뷰어 지정을 제출했습니다. 리더가 확정하면 리뷰 요청이 발송됩니다.',
  toastUpdated: '동료 리뷰어 지정을 수정했습니다.',
  toastError: '저장하지 못했습니다. 다시 시도해 주세요.',
  emptyTitle: '지정할 수 있는 단계가 아닙니다',
  emptySub: '동료 리뷰어 지정 단계에서만 리뷰어를 고를 수 있습니다.',
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

// 기본값을 매 렌더 새 배열로 두면 아래 «서버 값으로 다시 맞추기»가 렌더마다 돌아 고른 것이 지워진다.
const EMPTY = [];

const LOCK_KEY = {
  leader_confirmed: 'lockLeaderConfirmed',
  phase_closed: 'lockPhaseClosed',
};

export default function EvalPeerNominateCanvas({
  available = true,
  candidates = EMPTY,
  selected = EMPTY,
  submitted = false,
  locked = false,
  lockReason = null,
  belowMinimum = false,
  minimum = 2,
  segment = null,
  labels: providedLabels,
  onSubmit,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const serverIds = useMemo(() => selected.map((p) => p.id), [selected]);
  const [picked, setPicked] = useState(() => new Set(serverIds));
  // 서버가 새 지정을 내려 주면(저장·새로 읽기) 그 값으로 다시 맞춘다 — 렌더 중에 이전 값과 비교한다.
  const [seenServerIds, setSeenServerIds] = useState(serverIds);
  if (seenServerIds !== serverIds) {
    setSeenServerIds(serverIds);
    setPicked(new Set(serverIds));
  }
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // 후보 + 이미 지정한 사람(후보에서 빠졌어도 목록에는 보인다).
  const people = useMemo(() => {
    const byId = new Map();
    for (const p of [...selected, ...candidates]) if (!byId.has(p.id)) byId.set(p.id, p);
    return [...byId.values()];
  }, [candidates, selected]);

  const shown = useMemo(() => {
    const base = locked ? people.filter((p) => picked.has(p.id)) : people;
    const q = query.trim().toLowerCase();
    if (!q || locked) return base;
    return base.filter((p) =>
      [p.name, p.department].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [people, picked, query, locked]);

  const count = picked.size;
  const enough = count >= minimum;
  const canSubmit = !locked && enough && !busy;

  const toggle = (id) => {
    if (locked) return;
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onSubmit?.([...picked]);
      showToast(submitted ? L.toastUpdated : L.toastSent);
    } catch (err) {
      showToast(err?.toastMessage || L.toastError, 'error');
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <header className="evc-header">
      <div>
        <h1 className="evc-title">{L.title}</h1>
        <p className="evc-summary">{L.subtitle}</p>
      </div>
    </header>
  );

  if (!available) {
    return (
      <div className="evc-root">
        {header}
        {segment}
        <div className="evc-empty" data-testid="evpn-empty">
          <p className="evc-empty-title">{L.emptyTitle}</p>
          <p className="evc-empty-sub">{L.emptySub}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="evc-root">
      {toast && (
        <div className={`evc-toast ${toast.type === 'success' ? 'is-success' : 'is-error'}`} role="status">{toast.msg}</div>
      )}
      {header}
      {segment}

      <div className="evc-list">
        <section className="evc-card evpn-guide" data-testid="evpn-guide">
          <p className="evpn-guide-title">{L.guideTitle}</p>
          <p className="evc-empty-sub">{L.guide}</p>
        </section>

        {belowMinimum && (
          <div className="evc-onhold-banner evpn-banner" role="alert" data-testid="evpn-below-min">
            <AlertIcon size={16} />
            <span>{fill(L.belowMinimum, { min: minimum })}</span>
          </div>
        )}

        <section className="evc-card" data-testid="evpn-card">
          <div className="evc-card-head">
            <h3 className="evc-card-name">{L.pickTitle}</h3>
            <StatusBadge className="evc-status-badge tone-error">{L.required}</StatusBadge>
          </div>

          <div className="evpn-counter">
            <span className={enough ? 'evpn-count is-ok' : 'evpn-count is-short'} data-testid="evpn-count">
              {fill(L.countSelected, { count })}
              {!enough && ` ${fill(L.countShort, { min: minimum })}`}
            </span>
            <span className="evpn-rule">{fill(L.rule, { min: minimum })}</span>
          </div>

          {!locked && (
            <input
              className="evc-input"
              type="text"
              value={query}
              placeholder={L.searchPlaceholder}
              aria-label={L.searchPlaceholder}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="evpn-search"
            />
          )}

          <div className="evpv-candidates evpn-candidates" data-testid="evpn-candidates">
            {shown.length === 0 ? (
              <p className="evc-empty-sub">{people.length === 0 ? L.noCandidates : L.noResult}</p>
            ) : (
              shown.map((p) => {
                const on = picked.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    disabled={locked}
                    className={`evpv-candidate evpn-candidate${on ? ' is-on' : ''}`}
                    onClick={() => toggle(p.id)}
                    data-testid={`evpn-cand-${p.id}`}
                  >
                    <span className="evpn-cand-row">
                      <span className="evpv-cand-name">{p.name}</span>
                      {on && (
                        <span className="evpn-check" aria-hidden="true">
                          <CheckCircleIcon size={14} />
                        </span>
                      )}
                    </span>
                    {p.department && <span className="evpv-cand-dept">{p.department}</span>}
                  </button>
                );
              })
            )}
          </div>

          {locked ? (
            <div className="evc-hold-banner evpn-lock" role="status" data-testid="evpn-lock">
              <LockIcon size={16} />
              <span>{L[LOCK_KEY[lockReason]] || L.lockUnknown}</span>
            </div>
          ) : (
            <div className="evpn-actions">
              <span className="evpn-hint">{submitted ? L.hintAfter : L.hintBefore}</span>
              <button
                type="button"
                className="evc-btn is-primary"
                disabled={!canSubmit}
                onClick={submit}
                data-testid="evpn-submit"
              >
                {busy ? L.submitting : submitted ? L.resubmit : L.submit}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
