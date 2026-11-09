import { useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import FormField, { FieldError } from '../shared/FormField.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import TextArea from '../shared/TextArea.jsx';
import Stack from '../shared/Stack.jsx';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import { NoteText, ReadonlyBox, MetaLabel } from '../shared/SharedText.jsx';
import { OBJECTION_TARGETS } from './evalObjectionLabels.js';

/**
 * 내 평가 리포트 — 구성원 본인 이의 (pivit-work PW-2636 · member.policy §7.6 · spec-eval-cycle §17.4).
 *
 * 버튼·안내 블록은 서버가 정한 상태(`objection.state`)를 그대로 그린다 — 접수 기간·진행 건 여부를
 * 화면이 다시 계산하지 않는다.
 *
 *   state: 'none'(버튼 없음) · 'open'(접수 가능) · 'closed'(기간 지남) · 'active'(접수됨·검토 중·위원회 재검토) · 'answered'
 *
 * `objection` 모양(날짜는 앱이 글자로 만들어 넘긴다):
 *   { state, windowEndsLabel, replyDays,
 *     item: { targets: ('grade'|'content'|'ai')[], reason, dueLabel, overdue,
 *             interimNote, result: 'keep'|'partial'|'changed'|null, answer, aiExplanation } | null }
 *
 * 생김새는 이 화면의 카드(`.evc-card`·`.evc-card-name`)·버튼(`.evc-btn`)과 공용 부품(FormField·Checkbox·
 * TextArea·StatusBadge·NoteText·ReadonlyBox·ConfirmModal)으로만 짓는다. 디자이너 원본 없음 — design-review.
 * 인쇄(PDF 저장)에는 버튼·블록 모두 빠진다(`data-print-hide`) — 이의 내용이 출력물로 퍼지지 않게.
 */


const TARGET_LABEL = {
  grade: 'objectionTargetGrade',
  content: 'objectionTargetContent',
  ai: 'objectionTargetAi',
};
const RESULT_LABEL = {
  keep: 'objectionResultKeep',
  partial: 'objectionResultPartial',
  changed: 'objectionResultChanged',
};

const fill = (s, key, v) => String(s || '').replace(`{${key}}`, v ?? '');

/** 머리 오른쪽 — [이의 제기] 버튼 또는 상태 딱지. */
export function ObjectionHeaderAction({ objection, formOpen, onToggleForm, L }) {
  const state = objection?.state;
  if (!state || state === 'none') return null;
  if (state === 'active') {
    return (
      <StatusBadge tone="info" className="evc-status-badge" data-testid="evr-objection-badge">
        {L.objectionSubmittedBadge}
      </StatusBadge>
    );
  }
  if (state === 'answered') {
    return (
      <StatusBadge tone="success" className="evc-status-badge" data-testid="evr-objection-badge">
        {L.objectionAnsweredBadge}
      </StatusBadge>
    );
  }
  const closed = state === 'closed';
  return (
    <button
      type="button"
      className="evc-btn is-ghost"
      disabled={closed}
      title={closed ? L.objectionClosedTip : undefined}
      aria-expanded={closed ? undefined : formOpen}
      onClick={onToggleForm}
      data-testid="evr-objection-open"
    >
      {L.objectionButton}
    </button>
  );
}

/** 머리 아래 — 접수 칸 · 진행 안내 · 답변 · 기간 지남 안내. */
export function ObjectionPanel({
  objection,
  formOpen,
  onCloseForm,
  onSubmit,
  onWithdraw,
  busy = false,
  error = null,
  L,
}) {
  const [targets, setTargets] = useState([]);
  const [reason, setReason] = useState('');
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const state = objection?.state;
  if (!state || state === 'none') return null;
  const item = objection.item;

  if (state === 'open') {
    if (!formOpen) return null;
    const ready = targets.length > 0 && reason.trim().length > 0;
    const toggle = (t) =>
      setTargets((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    return (
      <section className="evc-card" data-print-hide data-testid="evr-objection-form">
        <Stack gap="xl">
          <h3 className="evc-card-name">{L.objectionFormTitle}</h3>
          <FormField label={L.objectionTargetsLabel} required group>
            <Stack gap="md">
              {OBJECTION_TARGETS.map((t) => (
                <Checkbox
                  key={t}
                  checked={targets.includes(t)}
                  onChange={() => toggle(t)}
                  label={L[TARGET_LABEL[t]]}
                  data-testid={`evr-objection-target-${t}`}
                />
              ))}
            </Stack>
          </FormField>
          <FormField label={L.objectionReasonLabel} required>
            <TextArea
              rows={4}
              value={reason}
              placeholder={L.objectionReasonPlaceholder}
              onChange={(e) => setReason(e.target.value)}
              data-testid="evr-objection-reason"
            />
          </FormField>
          <Stack gap="xs">
            <NoteText data-testid="evr-objection-notice">{L.objectionNotice}</NoteText>
            <NoteText>{fill(L.objectionReplyNotice, 'days', objection.replyDays)}</NoteText>
          </Stack>
          {error ? <FieldError data-testid="evr-objection-error">{error}</FieldError> : null}
          <div className="evc-card-buttons">
            <button
              type="button"
              className="evc-btn is-ghost"
              onClick={onCloseForm}
              disabled={busy}
              data-testid="evr-objection-cancel"
            >
              {L.objectionCancel}
            </button>
            <button
              type="button"
              className="evc-btn is-primary"
              disabled={!ready || busy}
              aria-busy={busy || undefined}
              onClick={() => onSubmit?.({ targets, reason })}
              data-testid="evr-objection-submit"
            >
              {L.objectionSubmit}
            </button>
          </div>
        </Stack>
      </section>
    );
  }

  if (state === 'closed') {
    return (
      <section className="evc-card" data-print-hide data-testid="evr-objection-closed">
        <p className="evc-empty-sub">{fill(L.objectionClosedNotice, 'date', objection.windowEndsLabel)}</p>
      </section>
    );
  }

  if (!item) return null;
  const targetText = (item.targets ?? []).map((t) => L[TARGET_LABEL[t]] ?? '').filter(Boolean).join(' · ');

  if (state === 'answered') {
    return (
      <section className="evc-card" data-print-hide data-testid="evr-objection-answered">
        <Stack gap="lg">
          <h3 className="evc-card-name">{L.objectionAnsweredTitle}</h3>
          <Stack gap="xs">
            <MetaLabel>{L.objectionResultLabel}</MetaLabel>
            <span>
              <StatusBadge tone="neutral" className="evc-status-badge" data-testid="evr-objection-result">
                {L[RESULT_LABEL[item.result]] ?? ''}
              </StatusBadge>
            </span>
          </Stack>
          <Stack gap="xs">
            <MetaLabel>{L.objectionAnswerLabel}</MetaLabel>
            <ReadonlyBox data-testid="evr-objection-answer">{item.answer}</ReadonlyBox>
          </Stack>
          {item.aiExplanation ? (
            <Stack gap="xs">
              <MetaLabel>{L.objectionAiLabel}</MetaLabel>
              <ReadonlyBox data-testid="evr-objection-ai">{item.aiExplanation}</ReadonlyBox>
            </Stack>
          ) : null}
          <NoteText>{L.objectionAnsweredFollowup}</NoteText>
        </Stack>
      </section>
    );
  }

  // 접수됨 · 검토 중 · 위원회 재검토
  return (
    <section className="evc-card" data-print-hide data-testid="evr-objection-active">
      <Stack gap="lg">
        <div className="evc-card-head">
          <h3 className="evc-card-name">{fill(L.objectionActiveTitle, 'due', item.dueLabel)}</h3>
          {onWithdraw ? (
            <div className="evc-card-buttons">
              <button
                type="button"
                className="evc-link-btn"
                onClick={() => setConfirmWithdraw(true)}
                disabled={busy}
                data-testid="evr-objection-withdraw"
              >
                {L.objectionWithdraw}
              </button>
            </div>
          ) : null}
        </div>
        {item.overdue ? <NoteText data-testid="evr-objection-overdue">{L.objectionOverdue}</NoteText> : null}
        <Stack gap="xs">
          <MetaLabel>{L.objectionYourTargets}</MetaLabel>
          <NoteText data-testid="evr-objection-targets">{targetText}</NoteText>
        </Stack>
        <Stack gap="xs">
          <MetaLabel>{L.objectionYourReason}</MetaLabel>
          <ReadonlyBox data-testid="evr-objection-reason-readonly">{item.reason}</ReadonlyBox>
        </Stack>
        {item.interimNote ? (
          <Stack gap="xs">
            <MetaLabel>{L.objectionInterimLabel}</MetaLabel>
            <ReadonlyBox data-testid="evr-objection-interim">{item.interimNote}</ReadonlyBox>
          </Stack>
        ) : null}
        {error ? <FieldError data-testid="evr-objection-error">{error}</FieldError> : null}
      </Stack>
      {confirmWithdraw ? (
        <ConfirmModal
          title={L.objectionWithdrawTitle}
          body={L.objectionWithdrawBody}
          confirmLabel={L.objectionWithdrawConfirm}
          cancelLabel={L.objectionCancel}
          busy={busy}
          onCancel={() => setConfirmWithdraw(false)}
          onConfirm={async () => {
            await onWithdraw?.();
            setConfirmWithdraw(false);
          }}
        />
      ) : null}
    </section>
  );
}
