import { useState, useMemo, useRef, useCallback, useEffect } from 'react';

/**
 * EvalPeerVolunteerCanvas — 자발적(언솔리시티드) 동료 리뷰 신청 (F3, 멤버용).
 *
 * 지정받지 않은 대상자 1명을 검색해 선택하고, 신청 사유(최소 20자)를 작성해 제출한다.
 * 제출 시 신청자의 매니저에게 채택 게이트가 생성된다. spec-eval-cycle §4.3.5 F3.
 */

const MIN_REASON = 20;

const DEFAULT_LABELS = {
  title: '자발적 동료 리뷰 신청',
  subtitle:
    '지정받지 않았지만 리뷰를 써주고 싶은 동료를 신청할 수 있습니다. 신청은 담당 매니저 채택 후 확정됩니다.',
  targetLabel: '리뷰 대상',
  targetPlaceholder: '이름·부서로 검색',
  targetEmpty: '신청 가능한 동료가 없습니다.',
  reasonLabel: '신청 사유',
  reasonPlaceholder: '이 동료를 리뷰하고 싶은 이유를 구체적으로 작성해 주세요. (최소 20자)',
  reasonHint: '최소 {{min}}자 · 현재 {{n}}자',
  submit: '신청 제출',
  submitting: '제출 중…',
  toastSent: '자발적 리뷰를 신청했습니다. 매니저 채택을 기다립니다.',
  toastError: '신청에 실패했습니다.',
  emptyTitle: '신청 가능한 단계가 아닙니다',
  emptySub: '동료 배정 단계에서만 자발적 리뷰를 신청할 수 있습니다.',
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

export default function EvalPeerVolunteerCanvas({
  available = true,
  candidates = [],
  labels: providedLabels,
  onSubmit,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) =>
      [c.name, c.department].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [candidates, query]);

  const reasonOk = reason.trim().length >= MIN_REASON;
  const canSubmit = target && reasonOk && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onSubmit?.(target, reason.trim());
      setTarget('');
      setReason('');
      setQuery('');
      showToast(L.toastSent);
    } catch {
      showToast(L.toastError, 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!available) {
    return (
      <div className="evc-root">
        <div className="evc-empty" data-testid="evpv-empty">
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
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          <p className="evc-summary">{L.subtitle}</p>
        </div>
      </header>

      <div className="evc-list">
        <section className="evc-card">
          <label className="evc-field-label" htmlFor="evpv-search">{L.targetLabel}</label>
          <input
            id="evpv-search"
            className="evc-input"
            type="text"
            value={query}
            placeholder={L.targetPlaceholder}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="evpv-search"
          />
          <div className="evpv-candidates" data-testid="evpv-candidates">
            {filtered.length === 0 ? (
              <p className="evc-empty-sub">{L.targetEmpty}</p>
            ) : (
              filtered.slice(0, 40).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`evpv-candidate${target === c.id ? ' is-on' : ''}`}
                  onClick={() => setTarget(c.id)}
                  data-testid={`evpv-cand-${c.id}`}
                >
                  <span className="evpv-cand-name">{c.name}</span>
                  {c.department && <span className="evpv-cand-dept">{c.department}</span>}
                </button>
              ))
            )}
          </div>

          <label className="evc-field-label" htmlFor="evpv-reason">{L.reasonLabel}</label>
          <textarea
            id="evpv-reason"
            className="evm-textarea"
            rows={4}
            value={reason}
            placeholder={L.reasonPlaceholder}
            onChange={(e) => setReason(e.target.value)}
            data-testid="evpv-reason"
          />
          <p className={`evc-empty-sub${reasonOk ? '' : ' evpv-reason-warn'}`}>
            {fill(L.reasonHint, { min: MIN_REASON, n: reason.trim().length })}
          </p>

          <div className="evc-card-buttons">
            <button
              type="button"
              className="evc-btn is-primary"
              disabled={!canSubmit}
              onClick={submit}
              data-testid="evpv-submit"
            >
              {busy ? L.submitting : L.submit}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
