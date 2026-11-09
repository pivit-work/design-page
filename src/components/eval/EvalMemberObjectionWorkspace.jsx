import { useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Button from '../shared/Button.jsx';
import DueBadge from '../shared/DueBadge.jsx';
import FormField, { FieldError } from '../shared/FormField.jsx';
import Radio from '../shared/Radio.jsx';
import TextArea from '../shared/TextArea.jsx';
import Stack from '../shared/Stack.jsx';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import { NoteText } from '../shared/SharedText.jsx';
import { OBJECTION_WORKSPACE_LABELS } from './evalObjectionLabels.js';

/**
 * 리포트 검수 › 구성원 이의 (pivit-work PW-2636 · hr.policy §8.7 · spec-eval-cycle §17.4).
 *
 * 좌 목록 · 우 처리 패널. 목록 줄·패널 칸은 같은 화면 묶음(eval-cycle.css)의 «어필 재검토 인박스»
 * 줄(`.evs-cw-appeal*`)과 1인 재검토 칸(`.evs-cw-review-*`)·빈 상태(`.evs-cw-empty`)를 그대로 쓴다.
 * 디자이너 원본 없음 — design-review.
 *
 * Props
 *   data        { calibrationEnabled, openCount, items: HrObjectionItem[] } | null(불러오는 중)
 *   loadFailed  true 면 실패 안내 + [다시 시도](onRetry)
 *   selectedId · onSelect(id)
 *   aiSummary   고른 이의의 AI 관여 사실 요약 글(기록 조회) | null
 *   busy        처리 요청 중
 *   error       처리 실패 문구(입력 유지)
 *   onStartReview(id) · onSendInterim(id, note) · onEscalate(id) · onAnswer(id, { result, answer, aiExplanation })
 *     — Promise. 성공하면 칸을 비운다(answer·interim).
 *   fmtDate(iso) 날짜 글자 · dueLabel(item) → { label, tone } (D-n · 기한 초과)
 *   labels
 */


const TARGET = { grade: 'targetGrade', content: 'targetContent', ai: 'targetAi' };
const STATUS = {
  submitted: { key: 'statusSubmitted', tone: 'info' },
  in_review: { key: 'statusInReview', tone: 'neutral' },
  escalated: { key: 'statusEscalated', tone: 'accent' },
  answered: { key: 'statusAnswered', tone: 'success' },
  withdrawn: { key: 'statusWithdrawn', tone: 'neutral' },
};
const RESULT = { keep: 'resultKeep', partial: 'resultPartial', changed: 'resultChanged' };
const isOpen = (s) => s === 'submitted' || s === 'in_review' || s === 'escalated';

function StatusTag({ status, L }) {
  const meta = STATUS[status];
  if (!meta) return null;
  return (
    <StatusBadge tone={meta.tone} className="evs-cw-appeal-badge" data-testid="evrr-obj-status">
      {L[meta.key]}
    </StatusBadge>
  );
}

function Field({ k, children, testId }) {
  return (
    <div>
      <div className="evs-cw-review-k">{k}</div>
      <div className="evs-cw-review-v" data-testid={testId}>
        {children}
      </div>
    </div>
  );
}

function Panel({
  item,
  calibrationEnabled,
  aiSummary,
  busy,
  error,
  onStartReview,
  onSendInterim,
  onEscalate,
  onAnswer,
  fmtDate,
  interimMaxLength,
  answerMaxLength,
  L,
}) {
  const [interim, setInterim] = useState('');
  const [result, setResult] = useState('');
  const [answer, setAnswer] = useState('');
  // AI 관여 설명 칸은 요약으로 미리 채운다 — HR 이 고쳐 확정한다(hr §8.7). 손대기 전에는 요약을 그대로 보인다.
  const [aiEdited, setAiEdited] = useState(null);
  const [confirmEscalate, setConfirmEscalate] = useState(false);
  const needsAi = item.targets.includes('ai');
  const aiText = aiEdited ?? aiSummary ?? '';

  const canChange = item.committee?.status === 'accepted';
  const ready = result && answer.trim() && (!needsAi || aiText.trim()) && (result !== 'changed' || canChange);
  const open = isOpen(item.status);

  return (
    <div className="evc-card evs-cw-review-card" data-testid="evrr-obj-panel">
      <div className="evs-cw-appeal-name">
        {item.memberName} <StatusTag status={item.status} L={L} />
      </div>
      <div className="evs-cw-review-grid">
        <Field k={L.finalGrade}>{item.finalGradeLabel || '—'}</Field>
        <Field k={L.submittedAt}>{fmtDate(item.submittedAt)}</Field>
        <Field k={L.dueAt}>{fmtDate(item.dueAt)}</Field>
        <Field k={L.handler}>{item.handlerName || '—'}</Field>
      </div>
      <div>
        <div className="evs-cw-review-k">
          {L.reason} · {item.targets.map((t) => L[TARGET[t]]).join(' · ')}
        </div>
        <div className="evs-cw-review-reason">
          <div className="evs-cw-review-reason-body" data-testid="evrr-obj-reason">{item.reason}</div>
        </div>
      </div>

      {item.status === 'withdrawn' ? (
        <NoteText data-testid="evrr-obj-withdrawn">{L.withdrawn}</NoteText>
      ) : null}

      {aiSummary && item.status !== 'withdrawn' ? (
        <div>
          <div className="evs-cw-review-k">{L.aiSummaryTitle}</div>
          <div className="evs-cw-review-reason">
            <div className="evs-cw-review-reason-body evrr-obj-pre" data-testid="evrr-obj-ai-summary">
              {aiSummary}
            </div>
          </div>
          <NoteText>{L.aiSummaryHint}</NoteText>
        </div>
      ) : null}

      {item.committee ? (
        <div data-testid="evrr-obj-committee">
          <div className="evs-cw-review-k">{L.committeeTitle}</div>
          {item.committee.status === 'accepted' || item.committee.status === 'rejected' ? (
            <div className="evs-cw-review-grid">
              <Field k={L.committeeTitle}>
                {item.committee.status === 'accepted' ? L.committeeAccepted : L.committeeRejected}
              </Field>
              {item.committee.revisedGradeLabel ? (
                <Field k={L.committeeRevised}>{item.committee.revisedGradeLabel}</Field>
              ) : null}
              {item.committee.reviewNote ? <Field k={L.committeeNote}>{item.committee.reviewNote}</Field> : null}
            </div>
          ) : (
            <NoteText>{L.committeePending}</NoteText>
          )}
        </div>
      ) : null}

      {item.status === 'answered' ? (
        <div className="evs-cw-review-form" data-testid="evrr-obj-answered">
          <div className="evs-cw-review-grid">
            <Field k={L.resultLabel}>{L[RESULT[item.result]] ?? '—'}</Field>
            <Field k={L.answeredBy}>
              {[item.answeredByName, item.answeredAt ? fmtDate(item.answeredAt) : null].filter(Boolean).join(' · ')}
            </Field>
          </div>
          <Field k={L.answerLabel} testId="evrr-obj-answer-readonly">{item.answer}</Field>
          {item.aiExplanation ? <Field k={L.aiExplanationLabel}>{item.aiExplanation}</Field> : null}
        </div>
      ) : null}

      {open ? (
        <>
          <div className="evc-card-buttons">
            {item.status === 'submitted' ? (
              <Button
                className="evc-btn"
                disabled={busy}
                onClick={() => onStartReview?.(item.id)}
                data-testid="evrr-obj-start"
              >
                {L.startReview}
              </Button>
            ) : null}
            {item.canEscalate ? (
              <Button
                className="evc-btn"
                disabled={busy}
                onClick={() => setConfirmEscalate(true)}
                data-testid="evrr-obj-escalate"
              >
                {L.escalate}
              </Button>
            ) : null}
          </div>
          {!calibrationEnabled && item.targets.includes('grade') ? (
            <NoteText data-testid="evrr-obj-calibration-off">{L.calibrationOff}</NoteText>
          ) : null}

          <div className="evs-cw-review-form">
            <Stack gap="md">
              <div className="evs-cw-review-k">{L.interimTitle}</div>
              {item.interimNote ? (
                <NoteText data-testid="evrr-obj-interim-sent">
                  {L.interimSent}
                  {item.interimAt ? ` · ${fmtDate(item.interimAt)}` : ''} — {item.interimNote}
                </NoteText>
              ) : null}
              <TextArea
                rows={2}
                value={interim}
                maxLength={interimMaxLength}
                placeholder={L.interimPlaceholder}
                onChange={(e) => setInterim(e.target.value)}
                aria-label={L.interimTitle}
                data-testid="evrr-obj-interim"
              />
              <div className="evc-card-buttons">
                <Button
                  className="evc-btn"
                  disabled={busy || !interim.trim()}
                  onClick={async () => {
                    const ok = await onSendInterim?.(item.id, interim);
                    if (ok !== false) setInterim('');
                  }}
                  data-testid="evrr-obj-interim-send"
                >
                  {L.interimSend}
                </Button>
              </div>
            </Stack>
          </div>

          <div className="evs-cw-review-form">
            <Stack gap="lg">
              <div className="evs-cw-review-k">{L.answerTitle}</div>
              <FormField label={L.resultLabel} required group hint={canChange ? undefined : L.resultChangedHint}>
                <Stack gap="md">
                  {['keep', 'partial', 'changed'].map((r) => (
                    <Radio
                      key={r}
                      name={`evrr-obj-result-${item.id}`}
                      value={r}
                      checked={result === r}
                      disabled={r === 'changed' && !canChange}
                      onChange={() => setResult(r)}
                      label={L[RESULT[r]]}
                      data-testid={`evrr-obj-result-${r}`}
                    />
                  ))}
                </Stack>
              </FormField>
              <FormField label={L.answerLabel} required>
                <TextArea
                  rows={4}
                  value={answer}
                  maxLength={answerMaxLength}
                  placeholder={L.answerPlaceholder}
                  onChange={(e) => setAnswer(e.target.value)}
                  data-testid="evrr-obj-answer"
                />
              </FormField>
              {needsAi ? (
                <FormField label={L.aiExplanationLabel} required>
                  <TextArea
                    rows={5}
                    value={aiText}
                    maxLength={answerMaxLength}
                    onChange={(e) => setAiEdited(e.target.value)}
                    data-testid="evrr-obj-ai"
                  />
                </FormField>
              ) : null}
              <div className="evc-card-buttons">
                <Button
                  className="evc-btn is-primary"
                  disabled={busy || !ready}
                  onClick={() =>
                    onAnswer?.(item.id, { result, answer, aiExplanation: needsAi ? aiText : null })
                  }
                  data-testid="evrr-obj-send"
                >
                  {L.send}
                </Button>
              </div>
            </Stack>
          </div>
        </>
      ) : null}

      {/* 처리 실패·거절 문구 — 다른 담당자가 먼저 답했거나 구성원이 철회해 칸이 읽기 전용으로 바뀌어도 이유가 남게
          상태와 상관없이 패널 끝에 둔다. */}
      {error ? <FieldError data-testid="evrr-obj-error">{error}</FieldError> : null}

      {confirmEscalate ? (
        <ConfirmModal
          title={L.escalateTitle}
          body={L.escalateBody}
          confirmLabel={L.escalateConfirm}
          cancelLabel={L.cancel}
          busy={busy}
          onCancel={() => setConfirmEscalate(false)}
          onConfirm={async () => {
            await onEscalate?.(item.id);
            setConfirmEscalate(false);
          }}
        />
      ) : null}
    </div>
  );
}

export default function EvalMemberObjectionWorkspace({
  data = null,
  loadFailed = false,
  onRetry,
  selectedId = null,
  onSelect,
  aiSummary = null,
  busy = false,
  error = null,
  onStartReview,
  onSendInterim,
  onEscalate,
  onAnswer,
  fmtDate = (iso) => String(iso ?? '').slice(0, 10),
  dueLabel = () => null,
  /** 중간 안내·답변(AI 설명 포함) 글자 한도 — 앱이 서버 한도(INPUT_LIMITS)를 넘긴다. */
  interimMaxLength,
  answerMaxLength,
  labels,
}) {
  const L = { ...OBJECTION_WORKSPACE_LABELS, ...(labels ?? {}) };

  if (loadFailed) {
    return (
      <div className="evs-cw-empty" role="alert" data-testid="evrr-obj-load-failed">
        <span className="evs-cw-empty-title">{L.loadFailed}</span>
        <Button className="evc-btn" onClick={onRetry} data-testid="evrr-obj-retry">
          {L.retry}
        </Button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="evrr-obj-cols" aria-busy="true" data-testid="evrr-obj-loading">
        <Stack gap="md">
          {[0, 1, 2].map((i) => (
            <div key={i} className="evs-cw-appeal" aria-hidden>
              <span className="evs-cw-appeal-sub">&nbsp;</span>
            </div>
          ))}
        </Stack>
      </div>
    );
  }
  if (data.items.length === 0) {
    return (
      <div className="evs-cw-empty" data-testid="evrr-obj-empty">
        <span className="evs-cw-empty-title">{L.empty}</span>
      </div>
    );
  }
  const selected = data.items.find((o) => o.id === selectedId) ?? null;
  return (
    <div className="evrr-obj-cols" data-testid="evrr-objections">
      <Stack gap="md" as="ul" className="evrr-obj-list">
        {data.items.map((o) => {
          const due = isOpen(o.status) ? dueLabel(o) : null;
          return (
            <li key={o.id}>
              <Button
                className={`evs-cw-appeal${o.id === selectedId ? ' is-selected' : ''}`}
                aria-pressed={o.id === selectedId}
                onClick={() => onSelect?.(o.id)}
                data-testid="evrr-obj-row"
              >
                <div className="evs-cw-appeal-main">
                  <div className="evs-cw-appeal-name">{o.memberName}</div>
                  <div className="evs-cw-appeal-meta">
                    {o.targets.map((t) => L[TARGET[t]]).join(' · ')}
                  </div>
                </div>
                <Stack gap="xs">
                  <StatusTag status={o.status} L={L} />
                  {due ? <DueBadge label={due.label} tone={due.tone} data-testid="evrr-obj-due" /> : null}
                </Stack>
              </Button>
            </li>
          );
        })}
      </Stack>
      {selected ? (
        <Panel
          key={selected.id}
          item={selected}
          calibrationEnabled={data.calibrationEnabled}
          aiSummary={aiSummary}
          busy={busy}
          error={error}
          onStartReview={onStartReview}
          onSendInterim={onSendInterim}
          onEscalate={onEscalate}
          onAnswer={onAnswer}
          fmtDate={fmtDate}
          interimMaxLength={interimMaxLength}
          answerMaxLength={answerMaxLength}
          L={L}
        />
      ) : (
        <p className="evc-empty-sub" data-testid="evrr-obj-pick">{L.pickHint}</p>
      )}
    </div>
  );
}
