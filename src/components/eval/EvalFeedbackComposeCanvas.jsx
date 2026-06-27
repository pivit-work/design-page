import { useState, useMemo } from 'react';

/**
 * EvalFeedbackComposeCanvas — 매니저 피드백 작성.
 * members[{id,name}] 중 대상 선택 + 본문 작성(SBI 힌트) → onSend({targetMemberId, text}).
 */

const DEFAULT_LABELS = {
  title: '피드백 작성',
  subtitle: '팀원에게 피드백을 보냅니다.',
  recipient: '대상',
  recipientPlaceholder: '팀원 선택',
  message: '내용',
  messagePlaceholder: '상황(Situation) · 행동(Behavior) · 영향(Impact) 순으로 구체적으로 작성하세요.',
  sbiHint: '💡 SBI: 상황 → 행동 → 영향 순으로 쓰면 더 효과적입니다.',
  send: '보내기',
  sending: '보내는 중…',
  sent: '피드백을 보냈습니다.',
  error: '전송에 실패했습니다. 내용은 그대로 유지됩니다.',
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

export default function EvalFeedbackComposeCanvas({
  members = [],
  labels: providedLabels,
  onSend,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [target, setTarget] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | sent | error

  const canSend = target && text.trim() && !busy;

  const handleSend = async () => {
    if (!onSend || !canSend) return;
    setBusy(true);
    setStatus('idle');
    try {
      await onSend({ targetMemberId: target, text: text.trim() });
      setText('');
      setStatus('sent');
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
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

      <div className="evc-list">
        <section className="evc-card">
          {status === 'sent' && (
            <p className="evx-notice" data-testid="evfc-sent" style={{ background: 'var(--utility-success-50)', color: 'var(--utility-success-700, var(--utility-green-600))' }}>
              {L.sent}
            </p>
          )}
          {status === 'error' && (
            <p className="evx-notice" data-testid="evfc-error" style={{ background: 'var(--utility-error-50)', color: 'var(--utility-error-500)' }}>
              {L.error}
            </p>
          )}

          <div className="evm-field">
            <span className="evc-field-label">{L.recipient}</span>
            <select
              className="evc-select"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              data-testid="evfc-recipient"
            >
              <option value="" disabled>
                {L.recipientPlaceholder}
              </option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.id}
                </option>
              ))}
            </select>
          </div>

          <div className="evm-field">
            <span className="evc-field-label">{L.message}</span>
            <textarea
              className="evm-textarea"
              rows={5}
              value={text}
              placeholder={L.messagePlaceholder}
              onChange={(e) => setText(e.target.value)}
              data-testid="evfc-text"
            />
            <p className="evc-empty-sub">{L.sbiHint}</p>
          </div>

          <div className="evc-card-buttons">
            <button type="button" className="evc-btn is-primary" disabled={!canSend} onClick={handleSend} data-testid="evfc-send">
              {busy ? L.sending : L.send}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
