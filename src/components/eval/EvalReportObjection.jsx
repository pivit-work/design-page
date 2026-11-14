import { useRef, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Button from '../shared/Button.jsx';
import Chip from '../shared/Chip.jsx';
import FormField, { FieldError } from '../shared/FormField.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import Radio from '../shared/Radio.jsx';
import TextArea from '../shared/TextArea.jsx';
import Stack from '../shared/Stack.jsx';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import { NoteText, ReadonlyBox, MetaLabel } from '../shared/SharedText.jsx';
import { resolveKoreanParticles } from '../shared/koreanParticle.js';
import { OBJECTION_TARGETS, OBJECTION_STATUS_META, fillObjectionText as fill } from './evalObjectionLabels.js';

/**
 * 내 평가 리포트 — 구성원 본인 이의 (pivit-work PW-2636 · member.policy §7.6-A · spec-eval-cycle §17.4-A · 2026-11-14 David 결정).
 *
 * 판단은 «최종 확정 단계»(위원회 경로 = 평가위원회 · 평가자 경로 = 최종 평가자)가 하고 인사 담당자는 운영만 한다.
 * 버튼·블록은 서버가 정한 상태(`objection.state`)를 그대로 그린다 — 접수 기간·진행 건 여부를 화면이 다시 계산하지 않는다.
 *
 *   state: 'none'(버튼 없음) · 'open'(접수 가능) · 'closed'(기간 지남) · 'active'(접수됨·검토 중) · 'decided'(결정 완료)
 *
 * `objection` 모양(서버 응답 그대로 + 날짜는 앱이 글자로 만들어 넘긴다):
 *   { state, windowEndsLabel, replyDays,
 *     line: { round, name }[],                       // 공개 시작 단계 선택지(차수 순)
 *     judge: { route: 'committee'|'evaluator', name }, // 판단자 표기
 *     item: { status, targets, reason, dueLabel, overdue, disclosureRound, files: { id, name }[],
 *             interimNote,
 *             decision: { result: 'accepted'|'rejected', reason, aiExplanation, gradeBeforeLabel, gradeAfterLabel,
 *                         decidedLabel, deciderName, route } | null } | null }
 *
 * 판단 측이 남긴 의견·결정 사유 공유 대상은 응답에도 화면에도 없다(§7.6-A «보이지 않는 것»).
 * 생김새는 이 화면의 카드(`.evc-card`)·버튼과 공용 부품만 쓴다. 디자이너 원본 없음 — design-review.
 * 헤더 아래 블록은 인쇄(PDF 저장)에서 빠진다(`data-print-hide`). 리포트 본문에 붙는 표시는 `ObjectionGradeTag`·`ObjectionDecisionNote`.
 */

const TARGET_LABEL = {
  grade: 'objectionTargetGrade',
  content: 'objectionTargetContent',
  ai: 'objectionTargetAi',
};

/** 증빙 규칙(정본 §17.4-A «증빙» · 서버 `OBJECTION_FILE_RULE` 와 같은 값). */
const FILE_MAX = 3;
const FILE_MAX_BYTES = 10 * 1024 * 1024;
const FILE_EXT = /\.(pdf|jpe?g|png)$/i;
const FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png';

/** 판단자 표기 — `평가위원회` / `최종 평가자({이름})`. */
function objectionJudgeText(judge, L) {
  if (!judge) return '';
  if (judge.route === 'committee') return L.objectionJudgeCommittee;
  return fill(L.objectionJudgeEvaluator, { name: judge.name ?? '' });
}

/** 결정한 쪽 표기 — 결정의 경로로 고른다(평가자 경로면 결정한 사람 이름, 없으면 접수 때 판단자). */
function decisionJudgeText(decision, judge, L) {
  if (!decision) return objectionJudgeText(judge, L);
  return objectionJudgeText(
    { route: decision.route, name: decision.deciderName ?? judge?.name ?? '' },
    L,
  );
}

const stageText = (l, L) => fill(L.objectionLineItem, { round: l.round, name: l.name });

/** `{key}` 자리만 굵게 — 나머지 자리는 글자로 채운다. */
function BoldFill({ template, boldKey, bold, vars = {} }) {
  const [before, after = ''] = fill(template, vars).split(`{${boldKey}}`);
  return (
    <>
      {before}
      <strong>{bold}</strong>
      {after}
    </>
  );
}

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
  if (state === 'decided') {
    return (
      <StatusBadge tone="success" className="evc-status-badge" data-testid="evr-objection-badge">
        {L.objectionDecidedBadge}
      </StatusBadge>
    );
  }
  const closed = state === 'closed';
  return (
    <Button
      className="evc-btn is-ghost"
      disabled={closed}
      title={closed ? L.objectionClosedTip : undefined}
      aria-expanded={closed ? undefined : formOpen}
      onClick={onToggleForm}
      data-testid="evr-objection-open"
    >
      {L.objectionButton}
    </Button>
  );
}

/**
 * 머리 아래 — 접수 칸 · 접수 뒤 블록 · 결정 완료 블록 · 기간 지남 안내.
 *
 * onSubmit({ targets, reason, disclosureRound, fileIds }) → Promise<boolean>(성공이면 칸을 비운다)
 * onUploadFile(file) → Promise<{ id, name }> — 하나씩. 던진 에러에 `objectionFileInvalid` 가 있으면 «형식·크기» 거절.
 * onWiden(round) → Promise<boolean>(false 면 확인 창 안에 실패 문구)
 * onWithdraw() → Promise
 */
export function ObjectionPanel({
  objection,
  formOpen,
  onCloseForm,
  onSubmit,
  onUploadFile,
  onWiden,
  onWithdraw,
  busy = false,
  error = null,
  /** 사유 글자 한도 — 앱이 서버 한도(INPUT_LIMITS.memberObjectionReason)를 넘긴다. */
  reasonMaxLength,
  L,
}) {
  const [targets, setTargets] = useState([]);
  const [reason, setReason] = useState('');
  const [round, setRound] = useState(null);
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [widenRound, setWidenRound] = useState(null);
  const [widenFailed, setWidenFailed] = useState(false);
  const fileInput = useRef(null);
  const fileSeq = useRef(0);
  const state = objection?.state;
  if (!state || state === 'none') return null;
  const line = objection.line ?? [];
  const judge = objectionJudgeText(objection.judge, L);

  if (state === 'open') {
    if (!formOpen) return null;
    // 차수가 하나뿐이면 그 하나가 골라져 있다 · 둘 이상이면 미리 고르지 않는다(§7.6-A «공개 시작 단계»).
    const pickedRound = round ?? (line.length === 1 ? line[0].round : null);
    const fileBusy = files.some((f) => f.status !== 'done');
    const ready =
      targets.length > 0 &&
      reason.trim().length > 0 &&
      (line.length === 0 || pickedRound != null) &&
      !fileBusy;
    const toggle = (t) =>
      setTargets((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

    const upload = async (key, file) => {
      setFiles((prev) => prev.map((f) => (f.key === key ? { ...f, status: 'uploading' } : f)));
      try {
        const saved = await onUploadFile?.(file);
        setFiles((prev) =>
          prev.map((f) => (f.key === key ? { ...f, status: 'done', id: saved?.id ?? null } : f)),
        );
      } catch (err) {
        if (err?.objectionFileInvalid) {
          setFiles((prev) => prev.filter((f) => f.key !== key));
          setFileError(L.objectionFileInvalid);
          return;
        }
        setFiles((prev) => prev.map((f) => (f.key === key ? { ...f, status: 'failed' } : f)));
      }
    };
    const pickFile = (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      if (file.size > FILE_MAX_BYTES || !FILE_EXT.test(file.name)) {
        setFileError(L.objectionFileInvalid);
        return;
      }
      setFileError(null);
      fileSeq.current += 1;
      const key = `f${fileSeq.current}`;
      setFiles((prev) => [...prev, { key, name: file.name, file, status: 'uploading', id: null }]);
      upload(key, file);
    };

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
              maxLength={reasonMaxLength}
              placeholder={L.objectionReasonPlaceholder}
              onChange={(e) => setReason(e.target.value)}
              data-testid="evr-objection-reason"
            />
          </FormField>
          {line.length > 0 ? (
            <FormField label={L.objectionDisclosureLabel} hint={L.objectionDisclosureHint} hintAbove required group>
              <Stack gap="md" data-testid="evr-objection-line">
                {line.map((l) => {
                  const sees = line.filter((x) => x.round >= l.round).map((x) => x.name).join(', ');
                  const hidden = line.filter((x) => x.round < l.round).map((x) => x.name).join(', ');
                  return (
                    <Radio
                      key={l.round}
                      name="evr-objection-line"
                      value={String(l.round)}
                      checked={pickedRound === l.round}
                      onChange={() => setRound(l.round)}
                      data-testid={`evr-objection-line-${l.round}`}
                      label={
                        <Stack gap="xs" as="span">
                          <span>{stageText(l, L)}</span>
                          <NoteText as="span" data-testid={`evr-objection-line-note-${l.round}`}>
                            {fill(L.objectionLineSees, { names: sees })}
                            {hidden ? ` · ${fill(L.objectionLineHidden, { names: hidden })}` : ''}
                          </NoteText>
                        </Stack>
                      }
                    />
                  );
                })}
              </Stack>
            </FormField>
          ) : null}
          <FormField label={L.objectionFilesLabel} group>
            <Stack gap="xs">
              <div className="evc-type-badges" data-testid="evr-objection-files">
                {files.map((f) => (
                  <span key={f.key} className="evc-type-badges" data-testid="evr-objection-file">
                    <Chip
                      onRemove={() => setFiles((prev) => prev.filter((x) => x.key !== f.key))}
                      removeLabel={fill(L.objectionFileRemove, { name: f.name })}
                      removeProps={{ 'data-testid': 'evr-objection-file-remove' }}
                    >
                      {f.name}
                      {f.status === 'uploading' ? ` · ${L.objectionFileUploading}` : ''}
                      {f.status === 'failed' ? ` · ${L.objectionFileFailed}` : ''}
                    </Chip>
                    {f.status === 'failed' ? (
                      <Button
                        className="evc-link-btn"
                        onClick={() => upload(f.key, f.file)}
                        data-testid="evr-objection-file-retry"
                      >
                        {L.objectionFileRetry}
                      </Button>
                    ) : null}
                  </span>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={files.length >= FILE_MAX}
                  onClick={() => fileInput.current?.click()}
                  data-testid="evr-objection-file-add"
                >
                  {L.objectionFileAdd}
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept={FILE_ACCEPT}
                  hidden
                  onChange={pickFile}
                  data-testid="evr-objection-file-input"
                />
              </div>
              <NoteText>{L.objectionFileRule}</NoteText>
              {fileError ? <FieldError data-testid="evr-objection-file-error">{fileError}</FieldError> : null}
            </Stack>
          </FormField>
          <Stack gap="xs" data-testid="evr-objection-notice">
            <NoteText>{L.objectionNoticeSafe}</NoteText>
            <NoteText>{fill(L.objectionNoticeScope, { judge })}</NoteText>
            <NoteText>{resolveKoreanParticles(fill(L.objectionReplyNotice, { judge, days: objection.replyDays }))}</NoteText>
          </Stack>
          {error ? <FieldError data-testid="evr-objection-error">{error}</FieldError> : null}
          <div className="evc-card-buttons">
            <Button
              className="evc-btn is-ghost"
              onClick={onCloseForm}
              disabled={busy}
              data-testid="evr-objection-cancel"
            >
              {L.objectionCancel}
            </Button>
            <Button
              className="evc-btn is-primary"
              disabled={!ready || busy}
              onClick={async () => {
                const ok = await onSubmit?.({
                  targets,
                  reason,
                  disclosureRound: line.length > 0 ? pickedRound : null,
                  fileIds: files.map((f) => f.id).filter(Boolean),
                });
                // 접수되면 칸을 비운다 — 철회 뒤 다시 낼 때 공개 시작 단계를 처음부터 고른다(§8 «결정 전 이의를 철회»).
                if (ok === true) {
                  setTargets([]);
                  setReason('');
                  setRound(null);
                  setFiles([]);
                  setFileError(null);
                }
              }}
              data-testid="evr-objection-submit"
            >
              {L.objectionSubmit}
            </Button>
          </div>
        </Stack>
      </section>
    );
  }

  if (state === 'closed') {
    return (
      <section className="evc-card" data-print-hide data-testid="evr-objection-closed">
        <p className="evc-empty-sub">{fill(L.objectionClosedNotice, { date: objection.windowEndsLabel })}</p>
      </section>
    );
  }

  const item = objection.item;
  if (!item) return null;
  const targetText = (item.targets ?? []).map((t) => L[TARGET_LABEL[t]] ?? '').filter(Boolean).join(' · ');

  if (state === 'decided') {
    const d = item.decision;
    if (!d) return null;
    const accepted = d.result === 'accepted';
    const gradeChanged = accepted && (item.targets ?? []).includes('grade') && d.gradeAfterLabel;
    return (
      <section className="evc-card" data-print-hide data-testid="evr-objection-decided">
        <Stack gap="lg">
          <div className="evs-cw-review-head">
            <StatusBadge tone="success" className="evc-status-badge">
              {L.objectionDecidedBadge}
            </StatusBadge>
            <span data-testid="evr-objection-result">
              <BoldFill
                template={L.objectionResultLine}
                boldKey="result"
                bold={accepted ? L.objectionResultAccepted : L.objectionResultRejected}
              />
            </span>
            <NoteText className="evs-cw-review-status" data-testid="evr-objection-decided-meta">
              {fill(L.objectionDecidedMeta, { date: d.decidedLabel, judge: decisionJudgeText(d, objection.judge, L) })}
            </NoteText>
          </div>
          {gradeChanged ? (
            <NoteText data-testid="evr-objection-changed-grade">
              <BoldFill
                template={L.objectionChangedGrade}
                boldKey="after"
                bold={d.gradeAfterLabel}
                vars={{ before: d.gradeBeforeLabel ?? '-' }}
              />
            </NoteText>
          ) : null}
          <Stack gap="xs">
            <MetaLabel>{L.objectionDecisionReasonLabel}</MetaLabel>
            <ReadonlyBox data-testid="evr-objection-decision-reason">{d.reason}</ReadonlyBox>
          </Stack>
          {(item.targets ?? []).includes('ai') && d.aiExplanation ? (
            <Stack gap="xs">
              <MetaLabel>{L.objectionAiLabel}</MetaLabel>
              <ReadonlyBox data-testid="evr-objection-ai">{d.aiExplanation}</ReadonlyBox>
            </Stack>
          ) : null}
          <NoteText>{L.objectionDecidedFollowup}</NoteText>
        </Stack>
      </section>
    );
  }

  // 접수됨 · 검토 중
  const statusMeta = OBJECTION_STATUS_META[item.status] ?? OBJECTION_STATUS_META.submitted;
  const statusLabel = item.status === 'in_review' ? L.objectionStatusInReview : L.objectionStatusSubmitted;
  const current = line.find((l) => l.round === item.disclosureRound) ?? null;
  const lower = current ? line.filter((l) => l.round < current.round) : [];
  const widenOpen = widenRound != null;
  const newcomers = widenOpen
    ? line.filter((l) => l.round >= widenRound && l.round < current.round).map((l) => l.name).join(', ')
    : '';
  return (
    <section className="evc-card" data-print-hide data-testid="evr-objection-active">
      <Stack gap="lg">
        <div className="evs-cw-review-head">
          <StatusBadge tone={statusMeta.tone} className="evc-status-badge" data-testid="evr-objection-status">
            {statusLabel}
          </StatusBadge>
          <span data-testid="evr-objection-due">{resolveKoreanParticles(fill(L.objectionActiveHead, { due: item.dueLabel, judge }))}</span>
          {onWithdraw ? (
            <Button
              className="evc-link-btn evs-cw-review-status"
              onClick={() => setConfirmWithdraw(true)}
              disabled={busy}
              data-testid="evr-objection-withdraw"
            >
              {L.objectionWithdraw}
            </Button>
          ) : null}
        </div>
        {item.overdue ? (
          <NoteText data-testid="evr-objection-overdue">{fill(L.objectionOverdue, { judge })}</NoteText>
        ) : null}
        <Stack gap="xs">
          <MetaLabel>{L.objectionYourTargets}</MetaLabel>
          <NoteText data-testid="evr-objection-targets">{targetText}</NoteText>
        </Stack>
        <Stack gap="xs">
          <MetaLabel>{L.objectionYourReason}</MetaLabel>
          <ReadonlyBox data-testid="evr-objection-reason-readonly">{item.reason}</ReadonlyBox>
        </Stack>
        {item.files?.length ? (
          <Stack gap="xs">
            <MetaLabel>{L.objectionYourFiles}</MetaLabel>
            <div className="evc-type-badges" data-testid="evr-objection-files-readonly">
              {item.files.map((f) => (
                <Chip key={f.id}>{f.name}</Chip>
              ))}
            </div>
          </Stack>
        ) : null}
        {current ? (
          <div className="evs-cw-review-head">
            <span data-testid="evr-objection-disclosure">
              <BoldFill template={L.objectionDisclosureNow} boldKey="stage" bold={stageText(current, L)} />
            </span>
            {lower.length > 0 && !widenOpen ? (
              <Button
                variant="secondary"
                size="sm"
                className="evs-cw-review-status"
                onClick={() => {
                  setWidenFailed(false);
                  setWidenRound(lower[lower.length - 1].round);
                }}
                disabled={busy}
                data-testid="evr-objection-widen"
              >
                {L.objectionWiden}
              </Button>
            ) : null}
          </div>
        ) : null}
        {widenOpen ? (
          <div className="evs-cw-review-form" data-testid="evr-objection-widen-confirm">
            <Stack gap="md">
              {lower.map((l) => (
                <Radio
                  key={l.round}
                  name="evr-objection-widen"
                  value={String(l.round)}
                  checked={widenRound === l.round}
                  onChange={() => setWidenRound(l.round)}
                  label={fill(L.objectionWidenOption, { stage: stageText(l, L) })}
                  data-testid={`evr-objection-widen-${l.round}`}
                />
              ))}
              <NoteText data-testid="evr-objection-widen-body">{fill(L.objectionWidenBody, { names: newcomers })}</NoteText>
              {widenFailed ? (
                <FieldError data-testid="evr-objection-widen-error">{L.objectionWidenFailed}</FieldError>
              ) : null}
              <div className="evc-card-buttons">
                <Button
                  className="evc-btn is-ghost"
                  onClick={() => setWidenRound(null)}
                  disabled={busy}
                  data-testid="evr-objection-widen-cancel"
                >
                  {L.objectionCancel}
                </Button>
                <Button
                  className="evc-btn is-primary"
                  disabled={busy}
                  onClick={async () => {
                    setWidenFailed(false);
                    const ok = await onWiden?.(widenRound);
                    if (ok === false) setWidenFailed(true);
                    else setWidenRound(null);
                  }}
                  data-testid="evr-objection-widen-submit"
                >
                  {L.objectionWidenConfirm}
                </Button>
              </div>
            </Stack>
          </div>
        ) : null}
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

/**
 * 리포트 본문에 붙는 결정(§7.6-A «리포트 본문에 붙는 것») — 결정 완료 · 수용일 때만. 거부면 본문은 그대로다.
 *   gradeChanged — `최종 등급` 수용으로 등급이 바뀜 → 등급 카드 딱지
 *   contentNote  — `평가 내용` 수용 → «리더 코멘트» 칸 아래 «이의 결정» 블록
 */
function bodyMarks(objection, L) {
  const item = objection?.state === 'decided' ? objection.item : null;
  const d = item?.decision;
  if (!d || d.result !== 'accepted') return { gradeChanged: false, contentNote: null };
  const targets = item.targets ?? [];
  return {
    gradeChanged: targets.includes('grade') && !!d.gradeAfterLabel,
    contentNote: targets.includes('content')
      ? {
          meta: fill(L.objectionDecidedMeta, { date: d.decidedLabel, judge: decisionJudgeText(d, objection.judge, L) }),
          reason: d.reason,
        }
      : null,
  };
}

/** 등급 카드 안 «이의 결정으로 바뀐 등급» 딱지 — `최종 등급` 수용으로 등급이 바뀌었을 때만. 인쇄에도 실린다. */
export function ObjectionGradeTag({ objection, L }) {
  if (!bodyMarks(objection, L).gradeChanged) return null;
  return (
    <StatusBadge tone="info" className="evc-status-badge" data-testid="evr-objection-grade-tag">
      {L.objectionGradeChangedTag}
    </StatusBadge>
  );
}

/**
 * «리더 코멘트» 칸 아래 «이의 결정» 블록(결정일 · 판단자 · 결정 사유) — `평가 내용` 수용일 때만.
 * 원 서술은 고치지 않는다. 인쇄에도 실린다.
 */
export function ObjectionDecisionNote({ objection, L }) {
  const note = bodyMarks(objection, L).contentNote;
  if (!note) return null;
  return (
    <div className="evr-answers">
      <div className="evr-answer" data-testid="evr-objection-decision-note">
        <span className="evc-field-label">{L.objectionDecisionNoteTitle}</span>
        <NoteText>{note.meta}</NoteText>
        <p className="evr-answer-text">{note.reason}</p>
      </div>
    </div>
  );
}
