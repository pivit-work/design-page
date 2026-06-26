import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

/**
 * EvalFeedbackCanvas — 상시 피드백 (멤버용: 받은/보낸 + 작성).
 * received/given/candidates + onSend 콜백을 받는 순수 컴포넌트.
 */

const DEFAULT_LABELS = {
  title: '피드백',
  tabReceived: '받은 피드백',
  tabGiven: '보낸 피드백',
  compose: '피드백 작성',
  emptyReceived: '아직 받은 피드백이 없습니다.',
  emptyGiven: '아직 보낸 피드백이 없습니다.',
  fromPrefix: '',
  toPrefix: '→ ',
  // modal
  modalTitle: '피드백 작성',
  targetLabel: '대상',
  targetPlaceholder: '구성원 선택',
  textLabel: '내용',
  textPlaceholder: '구체적 상황·행동·영향(SBI)을 담아 작성하세요.',
  cancel: '취소',
  send: '보내기',
  toastSent: '피드백을 보냈습니다',
  toastError: '오류가 발생했습니다',
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

function ComposeModal({ labels: L, candidates, onSend, onCancel }) {
  const [target, setTarget] = useState('');
  const [text, setText] = useState('');
  const canSend = target && text.trim();
  return (
    <div className="evc-modal-overlay" onClick={onCancel}>
      <div className="evc-modal is-wide" onClick={(e) => e.stopPropagation()}>
        <h3 className="evc-modal-title">{L.modalTitle}</h3>
        <label className="evc-field-label" htmlFor="fb-target">{L.targetLabel}</label>
        <select
          id="fb-target"
          className="evc-input"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          data-testid="fb-target"
        >
          <option value="">{L.targetPlaceholder}</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.department ? ` · ${c.department}` : ''}
            </option>
          ))}
        </select>
        <label className="evc-field-label" htmlFor="fb-text">{L.textLabel}</label>
        <textarea
          id="fb-text"
          className="evm-textarea"
          rows={4}
          value={text}
          placeholder={L.textPlaceholder}
          onChange={(e) => setText(e.target.value)}
          data-testid="fb-text"
        />
        <div className="evc-modal-actions">
          <button type="button" className="evc-btn is-ghost" onClick={onCancel}>{L.cancel}</button>
          <button
            type="button"
            className="evc-btn is-primary"
            disabled={!canSend}
            onClick={() => onSend(target, text.trim())}
            data-testid="fb-send"
          >
            {L.send}
          </button>
        </div>
      </div>
    </div>
  );
}

function FeedbackList({ items, prefix, empty }) {
  if (items.length === 0) return <p className="evc-empty-sub">{empty}</p>;
  return (
    <div className="fb-list">
      {items.map((f) => (
        <div className="evc-card fb-item" key={f.id} data-testid="fb-item">
          <div className="fb-item-head">
            <span className="fb-person">{prefix}{f.person?.name || f.person?.id}</span>
          </div>
          <p className="fb-text">{f.text}</p>
        </div>
      ))}
    </div>
  );
}

export default function EvalFeedbackCanvas({
  received = [],
  given = [],
  candidates = [],
  labels: providedLabels,
  onSend,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [tab, setTab] = useState('received');
  const [showCompose, setShowCompose] = useState(false);

  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const handleSend = async (target, text) => {
    setShowCompose(false);
    try {
      await onSend?.(target, text);
      showToast(L.toastSent);
    } catch {
      showToast(L.toastError, 'error');
    }
  };

  return (
    <div className="evc-root">
      {toast && (
        <div className={`evc-toast ${toast.type === 'success' ? 'is-success' : 'is-error'}`} role="status">
          {toast.msg}
        </div>
      )}

      <header className="evc-header">
        <h1 className="evc-title">{L.title}</h1>
        <button type="button" className="evc-btn is-primary" onClick={() => setShowCompose(true)} data-testid="fb-compose">
          + {L.compose}
        </button>
      </header>

      <div className="fb-tabs">
        <button
          type="button"
          className={`fb-tab${tab === 'received' ? ' is-on' : ''}`}
          onClick={() => setTab('received')}
          data-testid="fb-tab-received"
        >
          {L.tabReceived}
        </button>
        <button
          type="button"
          className={`fb-tab${tab === 'given' ? ' is-on' : ''}`}
          onClick={() => setTab('given')}
          data-testid="fb-tab-given"
        >
          {L.tabGiven}
        </button>
      </div>

      {tab === 'received' ? (
        <FeedbackList items={received} prefix={L.fromPrefix} empty={L.emptyReceived} />
      ) : (
        <FeedbackList items={given} prefix={L.toPrefix} empty={L.emptyGiven} />
      )}

      {showCompose && (
        <ComposeModal
          labels={L}
          candidates={candidates}
          onSend={handleSend}
          onCancel={() => setShowCompose(false)}
        />
      )}
    </div>
  );
}
