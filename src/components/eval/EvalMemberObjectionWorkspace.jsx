import { useEffect, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Button from '../shared/Button.jsx';
import { isNotifiedFailure } from '../shared/notifiedFailure.js';
import DueBadge from '../shared/DueBadge.jsx';
import Avatar from '../shared/Avatar.jsx';
import { FieldError } from '../shared/FormField.jsx';
import Radio from '../shared/Radio.jsx';
import TextArea from '../shared/TextArea.jsx';
import Stack from '../shared/Stack.jsx';
import Toast from '../shared/Toast.jsx';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';
import { NoteText } from '../shared/SharedText.jsx';
import {
  ObjectionContent,
  ObjectionDecisionForm,
  ObjectionDecisionResult,
  ObjectionStatusBadge,
} from './EvalObjectionShared.jsx';
import {
  OBJECTION_WORKSPACE_LABELS,
  OBJECTION_STATUS_META,
  fillObjectionText as fill,
} from './evalObjectionLabels.js';

/**
 * 리포트 검수 › 구성원 이의 — 인사 담당자의 «운영» 칸 (pivit-work PW-2636 · 2026-11-14 David 결정 ·
 * hr.policy §8.7-A · spec-eval-cycle §17.4-A).
 *
 * 인사 담당자는 이의를 판단하지 않는다 — 열람 · 독촉 · 중간 안내 · 판단자 지정만 하고, 결정 칸은 위원회 경로에서
 * 결정 입력자가 인사 담당자인 건(`canDecide`)에만 열린다(«위원회의 판단을 입력하는 칸»). 종전 [검토 시작] ·
 * 답변(유지/일부 반영/변경) · [위원회 재검토 요청]은 없다.
 *
 * 좌 목록 · 우 운영 패널. 목록 줄은 어필 재검토 인박스 줄(`.evs-cw-appeal*`), 패널 칸은 1인 재검토 칸(`.evs-cw-review-*`)과
 * 판단 측 공용 부품(`EvalObjectionShared.jsx`)을 그대로 쓴다. 디자이너 원본 없음 — design-review.
 *
 * Props
 *   data        { calibrationEnabled, openCount, items: HrObjectionItem[] } | null(불러오는 중)
 *   loadFailed  true 면 «이의 목록을 불러오지 못했습니다» + [다시 시도](onRetry)
 *   selectedId · onSelect(id)
 *   onNudge(id) · onSendInterim(id, note) · onAssignJudge(id, userId) — Promise. 실패하면 던진다(버튼 아래 인라인 문구 · 입력 유지).
 *   onDecide(id, input) — Promise. 실패하면 던진다. `err.objectionConflict` 가 'decided'(다른 인사 담당자가 먼저 결정) ·
 *     'withdrawn'(본인이 먼저 철회)이면 그 문구를 띄운다.
 *   onRefresh() — [새로고침](동시 결정 뒤)
 *   onDownload(file) — Promise. 증빙을 새 창으로 연다.
 *   fmtDate(iso) · fmtDateTime(iso) · fmtTime(iso)(HH:MM) · fmtSize(bytes)
 *   dueLabel(item) → { label, tone } (D-n · 기한 초과) — 결정 전에만 부른다
 *   interimMaxLength · decisionMaxLength
 *   labels       이 칸 문구(기본 `OBJECTION_WORKSPACE_LABELS`)
 *   judgeLabels  공용 부품 문구(기본 `OBJECTION_JUDGE_LABELS`)
 */

const TARGET = { grade: 'targetGrade', content: 'targetContent', ai: 'targetAi' };
const isOpen = (s) => s === 'submitted' || s === 'in_review';

/** 정렬 — 결정 전 먼저, 그 안에서 판단자 없음 → 기한 초과 → 기한 가까운 순. 결정 완료·철회는 아래(hr §8.7-A «정렬»). */
function sortObjections(items) {
  const rank = (o) => (!isOpen(o.status) ? 3 : o.judgeMissing ? 0 : o.daysLeft < 0 ? 1 : 2);
  return [...items].sort((a, b) => {
    const d = rank(a) - rank(b);
    if (d !== 0) return d;
    return Date.parse(a.dueAt) - Date.parse(b.dueAt);
  });
}

/** 독촉 받는 사람 이름 — 평가자 경로 = 판단자 · 위원회 경로 = 결정 입력자인 위원장. */
function nudgeRecipient(item) {
  return item.route === 'committee' ? item.committee?.chairName ?? '' : item.judgeName ?? '';
}

/** 목록 줄의 판단자 이름(hr §8.7-A «판단자 이름»). */
function judgeText(item, L) {
  if (item.route === 'committee') {
    return item.committee?.inputter === 'hr' ? L.judgeHr : item.committee?.chairName ?? '';
  }
  return item.judgeName ?? '';
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

function RouteBadge({ item, L }) {
  return (
    <StatusBadge tone="neutral" className="evs-cw-appeal-badge" data-testid="evrr-obj-route">
      {item.route === 'committee' ? L.routeCommittee : L.routeEvaluator}
    </StatusBadge>
  );
}

/** 버튼 하나의 보내는 중 · 실패 상태. run(fn) 이 던지면 실패 문구를 남긴다(입력은 호출한 쪽이 지우지 않는다). */
function useSend() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    setFailed(false);
    try {
      await fn();
      return true;
    } catch (e) {
      // 앱이 이미 알린 실패(이용 정지 등)는 글을 겹쳐 쓰지 않는다(PW-2907).
      if (!isNotifiedFailure(e)) setFailed(true);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, failed, run };
}

function NudgeButton({ item, onNudge, onToast, fmtTime, L }) {
  const send = useSend();
  const done = item.nudgedToday;
  return (
    <Stack gap="xs">
      <div className="evc-card-buttons">
        <Button
          className="evc-btn"
          disabled={!!done || send.busy}
          onClick={async () => {
            const ok = await send.run(() => onNudge?.(item.id));
            if (ok) onToast(fill(L.nudgeToast, { name: nudgeRecipient(item) }));
          }}
          data-testid="evrr-obj-nudge"
        >
          {send.busy
            ? L.sending
            : done
              ? fill(L.nudgedToday, { name: done.byName, time: fmtTime(done.at) })
              : L.nudge}
        </Button>
      </div>
      {send.failed ? <FieldError data-testid="evrr-obj-nudge-error">{L.sendFailed}</FieldError> : null}
    </Stack>
  );
}

function InterimBox({ item, onSendInterim, maxLength, L }) {
  const [text, setText] = useState('');
  const send = useSend();
  return (
    <div className="evs-cw-review-form" data-testid="evrr-obj-interim-box">
      <Stack gap="md">
        <div className="evs-cw-review-k">{L.interimTitle}</div>
        <TextArea
          rows={2}
          value={text}
          maxLength={maxLength}
          placeholder={L.interimPlaceholder}
          onChange={(e) => setText(e.target.value)}
          aria-label={L.interimTitle}
          data-testid="evrr-obj-interim"
        />
        {send.failed ? <FieldError data-testid="evrr-obj-interim-error">{L.sendFailed}</FieldError> : null}
        <div className="evc-card-buttons">
          <Button
            className="evc-btn"
            disabled={send.busy || !text.trim()}
            onClick={async () => {
              const ok = await send.run(() => onSendInterim?.(item.id, text.trim()));
              if (ok) setText('');
            }}
            data-testid="evrr-obj-interim-send"
          >
            {send.busy ? L.sending : L.interimSend}
          </Button>
        </div>
      </Stack>
    </div>
  );
}

function AssignJudge({ item, onAssignJudge, L }) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(null);
  const [step, setStep] = useState('pick');
  const send = useSend();
  const cand = (item.judgeCandidates ?? []).find((c) => c.userId === pick);
  const candLabel = (c) =>
    c.label === 'head'
      ? L.candidateHead
      : fill(L.candidateRound, { round: String(c.label).replace('round:', '') });
  const close = () => {
    setOpen(false);
    setStep('pick');
  };
  return (
    <Stack gap="xs">
      <div className="evc-card-buttons">
        <Button
          className="evc-btn is-primary"
          disabled={send.busy}
          onClick={() => setOpen(true)}
          data-testid="evrr-obj-assign"
        >
          {send.busy ? L.sending : L.assignJudge}
        </Button>
      </div>
      {send.failed ? <FieldError data-testid="evrr-obj-assign-error">{L.sendFailed}</FieldError> : null}
      {open && step === 'pick' ? (
        <ConfirmModal
          title={L.assignTitle}
          testId="evrr-obj-assign-dialog"
          body={
            <Stack gap="md">
              <NoteText>{L.assignHint}</NoteText>
              {(item.judgeCandidates ?? []).length ? (
                item.judgeCandidates.map((c) => (
                  <Radio
                    key={c.userId}
                    name={`evrr-obj-judge-${item.id}`}
                    value={c.userId}
                    checked={pick === c.userId}
                    onChange={() => setPick(c.userId)}
                    label={`${c.name} · ${candLabel(c)}`}
                    data-testid={`evrr-obj-judge-${c.userId}`}
                  />
                ))
              ) : (
                <NoteText>{L.assignNone}</NoteText>
              )}
            </Stack>
          }
          confirmLabel={L.assignNext}
          cancelLabel={L.cancel}
          confirmDisabled={!cand}
          onCancel={close}
          onConfirm={() => setStep('confirm')}
        />
      ) : null}
      {open && step === 'confirm' && cand ? (
        <ConfirmModal
          title={L.assignConfirmTitle}
          testId="evrr-obj-assign-confirm"
          body={fill(L.assignConfirmBody, { name: cand.name })}
          confirmLabel={send.busy ? L.sending : L.assignConfirm}
          cancelLabel={L.cancel}
          busy={send.busy}
          onCancel={close}
          onConfirm={async () => {
            close();
            await send.run(() => onAssignJudge?.(item.id, cand.userId));
          }}
        />
      ) : null}
    </Stack>
  );
}

function RouteSection({ item, fmtDateTime, L }) {
  if (item.route === 'committee') {
    const c = item.committee;
    const inputter = !c
      ? ''
      : c.inputter === 'chair'
        ? L.inputterChair
        : c.inputterFallback
          ? L.inputterFallback
          : L.inputterHr;
    return (
      <div data-testid="evrr-obj-route-section">
        <div className="evs-cw-review-k">{L.routeTitle}</div>
        <div className="evs-cw-review-grid">
          <Field k={L.sessionLabel}>{c?.sessionName || '—'}</Field>
          <Field k={L.chairLabel}>{c?.chairName || '—'}</Field>
          <Field k={L.inputterLabel} testId="evrr-obj-inputter">
            {inputter}
          </Field>
        </div>
      </div>
    );
  }
  return (
    <div data-testid="evrr-obj-route-section">
      <div className="evs-cw-review-k">{L.routeTitle}</div>
      <Stack gap="xs">
        {item.judgeMissing ? (
          <NoteText data-testid="evrr-obj-judge-missing-note">{L.judgeMissingNote}</NoteText>
        ) : (
          <div className="evs-cw-review-v" data-testid="evrr-obj-judge">
            {item.judgeRound != null
              ? fill(L.judgeRound, { name: item.judgeName ?? '', round: item.judgeRound })
              : item.judgeName ?? '—'}
          </div>
        )}
        {item.judgeAssigned && !item.judgeMissing ? (
          <NoteText data-testid="evrr-obj-judge-assigned">
            {fill(L.judgeAssigned, {
              name: item.judgeAssigned.byName ?? '',
              date: fmtDateTime(item.judgeAssigned.at),
            })}
          </NoteText>
        ) : null}
      </Stack>
    </div>
  );
}

function Logs({ item, fmtDateTime, L }) {
  if (!item.logs?.length) return null;
  return (
    <div data-testid="evrr-obj-logs">
      <div className="evs-cw-review-k">{L.logsTitle}</div>
      <Stack gap="md">
        {item.logs.map((log, i) => (
          <div key={`${log.createdAt}-${i}`} className="evs-cw-review-reason" data-testid="evrr-obj-log">
            <NoteText>
              {fill(L.logLine, {
                kind: log.kind === 'interim' ? L.logInterim : L.logNudge,
                author: log.authorName,
                recipient: log.recipientName ?? '',
                date: fmtDateTime(log.createdAt),
              })}
            </NoteText>
            {log.body ? <div className="evs-cw-review-reason-body evrr-obj-pre">{log.body}</div> : null}
          </div>
        ))}
      </Stack>
    </div>
  );
}

function GradeChange({ change, fmtDateTime, L }) {
  if (!change) return null;
  const route =
    change.route === 'member_objection_committee'
      ? L.gradeRouteCommittee
      : change.route === 'member_objection_evaluator'
        ? L.gradeRouteEvaluator
        : '—';
  return (
    <div className="evs-cw-review-form" data-testid="evrr-obj-grade-change">
      <Stack gap="md">
        <div className="evs-cw-review-k">{L.gradeChangeTitle}</div>
        <div className="evs-cw-review-v" data-testid="evrr-obj-grade-change-grades">
          {change.fromLabel ?? '-'} → {change.toLabel}
        </div>
        <div className="evs-cw-review-grid">
          <Field k={L.gradeChangeBy}>{change.changedByName ?? '—'}</Field>
          <Field k={L.gradeChangeAt}>{fmtDateTime(change.at)}</Field>
          <Field k={L.gradeChangeRoute} testId="evrr-obj-grade-change-route">
            {route}
          </Field>
        </div>
        {change.note ? <Field k={L.gradeChangeNote}>{change.note}</Field> : null}
      </Stack>
    </div>
  );
}

function Panel({
  item,
  onNudge,
  onSendInterim,
  onAssignJudge,
  onDecide,
  onRefresh,
  onDownload,
  onToast,
  fmtDate,
  fmtDateTime,
  fmtTime,
  fmtSize,
  dueLabel,
  interimMaxLength,
  decisionMaxLength,
  L,
  JL,
}) {
  // 결정이 부딪힌 이유 — 'decided'(다른 인사 담당자가 먼저) · 'withdrawn'(본인이 먼저 철회). 패널이 읽기 전용으로 바뀌어도 남긴다.
  const [conflict, setConflict] = useState(null);
  const [fileFailed, setFileFailed] = useState(false);
  const open = isOpen(item.status);
  const withdrawn = item.status === 'withdrawn';
  const due = open ? dueLabel(item) : null;
  const meta = OBJECTION_STATUS_META[item.status];

  const download = async (f) => {
    setFileFailed(false);
    try {
      await onDownload?.(f);
    } catch {
      setFileFailed(true);
    }
  };

  return (
    <div className="evc-card evs-cw-review-card" data-testid="evrr-obj-panel">
      <Stack gap="lg">
        <div className="evc-type-badges">
          <Avatar name={item.memberName} photo={item.memberAvatar} size={32} />
          <span className="evs-cw-appeal-name">{item.memberName}</span>
          {meta ? <ObjectionStatusBadge status={item.status} labels={JL} /> : null}
          <RouteBadge item={item} L={L} />
        </div>
        <div className="evs-cw-review-grid">
          <Field k={L.finalGrade} testId="evrr-obj-final-grade">
            {item.finalGradeLabel || '—'}
          </Field>
          <Field k={L.submittedAt}>{fmtDateTime(item.submittedAt)}</Field>
          <Field k={L.dueAt}>
            <span className="evc-type-badges">
              {fmtDate(item.dueAt)}
              {due ? <DueBadge label={due.label} tone={due.tone} data-testid="evrr-obj-panel-due" /> : null}
            </span>
          </Field>
        </div>

        {withdrawn ? (
          <NoteText data-testid="evrr-obj-withdrawn">
            {fill(L.withdrawn, { date: item.withdrawnAt ? fmtDateTime(item.withdrawnAt) : '' })}
          </NoteText>
        ) : null}
        {conflict === 'withdrawn' ? (
          <FieldError data-testid="evrr-obj-conflict">{L.withdrawnConflict}</FieldError>
        ) : null}

        <ObjectionContent
          item={item}
          showLine
          onDownload={download}
          fmtDate={fmtDateTime}
          fmtSize={fmtSize}
          labels={JL}
        />
        {fileFailed ? <FieldError data-testid="evrr-obj-file-error">{L.fileFailed}</FieldError> : null}

        <RouteSection item={item} fmtDateTime={fmtDateTime} L={L} />

        {item.aiSummary ? (
          <div>
            <div className="evs-cw-review-k">{L.aiSummaryTitle}</div>
            <div className="evs-cw-review-reason">
              <div className="evs-cw-review-reason-body evrr-obj-pre" data-testid="evrr-obj-ai-summary">
                {item.aiSummary}
              </div>
            </div>
            <NoteText>{L.aiSummaryHint}</NoteText>
          </div>
        ) : null}

        <Logs item={item} fmtDateTime={fmtDateTime} L={L} />

        {item.status === 'decided' && item.decision ? (
          <div data-testid="evrr-obj-decision">
            <div className="evs-cw-review-k">{L.decisionTitle}</div>
            <ObjectionDecisionResult decision={item.decision} fmtDate={fmtDateTime} labels={JL} />
          </div>
        ) : null}

        <GradeChange change={item.gradeChange} fmtDateTime={fmtDateTime} L={L} />

        {open ? (
          <>
            {item.canNudge ? (
              <NudgeButton item={item} onNudge={onNudge} onToast={onToast} fmtTime={fmtTime} L={L} />
            ) : null}
            {item.canAssignJudge ? <AssignJudge item={item} onAssignJudge={onAssignJudge} L={L} /> : null}
            <InterimBox item={item} onSendInterim={onSendInterim} maxLength={interimMaxLength} L={L} />
            {item.canDecide ? (
              <Stack gap="xs">
                <ObjectionDecisionForm
                  item={item}
                  grades={item.grades}
                  shareCandidates={item.shareCandidates}
                  aiSummary={item.aiSummary}
                  intro={L.decideIntro}
                  confirmBody={L.decideConfirmBody}
                  errorText={conflict === 'decided' ? L.decidedConflict : null}
                  maxLength={decisionMaxLength}
                  labels={{ ...JL, sending: L.sending }}
                  onSubmit={async (input) => {
                    setConflict(null);
                    try {
                      await onDecide?.(item.id, input);
                      onToast(L.decidedToast);
                    } catch (err) {
                      // 앱이 이미 알린 실패(이용 정지 등)는 그대로 넘겨 창이 글을 겹쳐 쓰지 않게 한다(PW-2907).
                      if (isNotifiedFailure(err)) throw err;
                      const kind = err?.objectionConflict ?? null;
                      setConflict(kind);
                      if (kind === 'decided') {
                        // 입력은 지우지 않는다 — 창만 닫고 칸 아래에 문구 + [새로고침].
                        return;
                      }
                      const e = new Error('decide failed');
                      e.objectionMessage = kind === 'withdrawn' ? L.withdrawnConflict : L.sendFailed;
                      throw e;
                    }
                  }}
                />
                {conflict === 'decided' ? (
                  <div className="evc-card-buttons">
                    <Button className="evc-btn" onClick={() => onRefresh?.()} data-testid="evrr-obj-refresh">
                      {L.refresh}
                    </Button>
                  </div>
                ) : null}
              </Stack>
            ) : null}
          </>
        ) : null}
      </Stack>
    </div>
  );
}

export default function EvalMemberObjectionWorkspace({
  data = null,
  loadFailed = false,
  onRetry,
  selectedId = null,
  onSelect,
  onNudge,
  onSendInterim,
  onAssignJudge,
  onDecide,
  onRefresh,
  onDownload,
  fmtDate = (iso) => String(iso ?? '').slice(0, 10),
  fmtDateTime = (iso) => String(iso ?? '').slice(0, 16).replace('T', ' '),
  fmtTime = (iso) => String(iso ?? '').slice(11, 16),
  fmtSize = null,
  dueLabel = () => null,
  /** 중간 안내 · 결정 사유(AI 설명 포함) 글자 한도 — 앱이 서버 한도(INPUT_LIMITS)를 넘긴다. */
  interimMaxLength,
  decisionMaxLength,
  labels,
  judgeLabels,
}) {
  const L = { ...OBJECTION_WORKSPACE_LABELS, ...(labels ?? {}) };
  const JL = judgeLabels ?? {};
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

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
        <SkeletonList count={3} height={52} />
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
  const items = sortObjections(data.items);
  const selected = items.find((o) => o.id === selectedId) ?? null;
  return (
    <div className="evrr-obj-cols" data-testid="evrr-objections">
      <Stack gap="md" as="ul" className="evrr-obj-list">
        {items.map((o) => {
          const open = isOpen(o.status);
          const due = open ? dueLabel(o) : null;
          return (
            <li key={o.id}>
              <Button
                className={`evs-cw-appeal${o.id === selectedId ? ' is-selected' : ''}`}
                aria-pressed={o.id === selectedId}
                onClick={() => onSelect?.(o.id)}
                data-testid="evrr-obj-row"
              >
                <Avatar name={o.memberName} photo={o.memberAvatar} size={32} />
                <div className="evs-cw-appeal-main">
                  <div className="evs-cw-appeal-name" data-testid="evrr-obj-row-name">
                    {o.memberName}
                  </div>
                  <div className="evs-cw-appeal-meta">{o.targets.map((t) => L[TARGET[t]]).join(' · ')}</div>
                  <div className="evs-cw-appeal-meta" data-testid="evrr-obj-row-judge">
                    {open && o.judgeMissing ? null : judgeText(o, L)}
                  </div>
                </div>
                <Stack gap="xs">
                  <ObjectionStatusBadge status={o.status} labels={JL} />
                  <RouteBadge item={o} L={L} />
                  {open && o.judgeMissing ? (
                    <StatusBadge tone="danger" className="evs-cw-appeal-badge" data-testid="evrr-obj-judge-missing">
                      {L.judgeMissing}
                    </StatusBadge>
                  ) : null}
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
          onNudge={onNudge}
          onSendInterim={onSendInterim}
          onAssignJudge={onAssignJudge}
          onDecide={onDecide}
          onRefresh={onRefresh}
          onDownload={onDownload}
          onToast={setToast}
          fmtDate={fmtDate}
          fmtDateTime={fmtDateTime}
          fmtTime={fmtTime}
          fmtSize={fmtSize}
          dueLabel={dueLabel}
          interimMaxLength={interimMaxLength}
          decisionMaxLength={decisionMaxLength}
          L={L}
          JL={JL}
        />
      ) : (
        <p className="evc-empty-sub" data-testid="evrr-obj-pick">
          {L.pickHint}
        </p>
      )}
      <Toast message={toast} data-testid="evrr-obj-toast" />
    </div>
  );
}
