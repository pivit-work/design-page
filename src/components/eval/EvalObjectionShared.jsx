import { useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Button from '../shared/Button.jsx';
import Chip from '../shared/Chip.jsx';
import FormField, { FieldError } from '../shared/FormField.jsx';
import Radio from '../shared/Radio.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import TextArea from '../shared/TextArea.jsx';
import Stack from '../shared/Stack.jsx';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import { NoteText } from '../shared/SharedText.jsx';
import {
  OBJECTION_JUDGE_LABELS,
  OBJECTION_STATUS_META,
  fillObjectionText as fill,
  seatLabel,
} from './evalObjectionLabels.js';

/**
 * 구성원 본인 이의 — 판단 측(평가자 · 위원 · 인사 담당자)이 함께 쓰는 칸 (pivit-work PW-2636 · 2026-11-14 David 결정 ·
 * spec-eval-cycle §17.4-A · leader.policy §7.0-A · spec-calibration §7.5.5 · hr.policy §8.7-A).
 *
 * - `ObjectionContent` — 이의 내용(대상 · 사유 원문 · 증빙 · 공개 시작 단계 · 의견). 이의 내용 범위에게만 그린다.
 * - `ObjectionDecisionForm` — 결정 칸(수용/거부 · 새 등급 · 결정 사유(늘 필수) · AI 관여 설명 · 공유 대상 + 확인 창).
 * - `ObjectionDecisionResult` — 결정 뒤 읽기 전용(결과 · 전·후 등급 · 결정 사유 · AI 관여 설명 · 공유 대상 · 결정한 사람).
 *
 * 생김새는 같은 화면 묶음의 어필 재검토 칸(`.evs-cw-review-*`)과 공용 부품만 쓴다. 디자이너 원본 없음 — design-review.
 * 문구는 `labels` 로 덮는다(기본값 `OBJECTION_JUDGE_LABELS`).
 */

const TARGET_KEY = { grade: 'targetGrade', content: 'targetContent', ai: 'targetAi' };


export function ObjectionStatusBadge({ status, labels }) {
  const L = { ...OBJECTION_JUDGE_LABELS, ...labels };
  const meta = OBJECTION_STATUS_META[status];
  if (!meta) return null;
  return (
    <StatusBadge tone={meta.tone} className="evs-cw-appeal-badge" data-testid="evobj-status">
      {L[meta.key]}
    </StatusBadge>
  );
}


/**
 * 이의 내용 — 대상 칩 · 사유 원문(접지 않는다) · 증빙(누르면 내려받기) · 공개 시작 단계 · 의견 목록.
 *
 * Props
 *   item        ObjectionContentView(앱 응답 그대로)
 *   onDownload(file)  증빙을 누르면
 *   fmtDate(iso)      날짜 글자
 *   showLine    공개 시작 단계를 평가 라인 차수별(«보는지»)로 펼쳐 보일지(위원회 1인 재검토 · 운영 패널)
 *   opinionSlot 의견 목록 아래(입력칸 등)
 */
export function ObjectionContent({
  item,
  onDownload,
  fmtDate = (iso) => String(iso ?? '').slice(0, 10),
  showLine = false,
  opinionSlot = null,
  /** 증빙 크기 글자(바이트 → «1.2 MB») — 주면 파일 이름 옆에 붙인다(hr §8.7-A «파일 이름 · 크기»). */
  fmtSize = null,
  labels,
}) {
  const L = { ...OBJECTION_JUDGE_LABELS, ...labels };
  return (
    <Stack gap="lg">
      <div>
        <div className="evs-cw-review-k">{L.targetsLabel}</div>
        <div className="evs-cw-review-v" data-testid="evobj-targets">
          <div className="evc-type-badges">
            {(item.targets ?? []).map((t) => (
              <Chip key={t}>{L[TARGET_KEY[t]]}</Chip>
            ))}
          </div>
        </div>
      </div>
      <div>
        <div className="evs-cw-review-k">{L.reasonLabel}</div>
        <div className="evs-cw-review-reason">
          <div className="evs-cw-review-reason-body" data-testid="evobj-reason">
            {item.reason}
          </div>
        </div>
      </div>
      {item.files?.length ? (
        <div>
          <div className="evs-cw-review-k">{L.filesLabel}</div>
          <div className="evs-cw-review-v" data-testid="evobj-files">
            <div className="evc-type-badges">
              {item.files.map((f) => (
                <Chip key={f.id} onClick={() => onDownload?.(f)}>
                  {fmtSize ? `${f.name} · ${fmtSize(f.size)}` : f.name}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      ) : showLine ? (
        <div>
          <div className="evs-cw-review-k">{L.filesLabel}</div>
          <div className="evs-cw-review-v">{L.filesNone}</div>
        </div>
      ) : null}
      <div>
        <div className="evs-cw-review-k">{L.disclosureLabel}</div>
        <div className="evs-cw-review-v" data-testid="evobj-disclosure">
          <Stack gap="xs">
            <span>{fill(L.disclosureFrom, { round: item.disclosureRound ?? '' })}</span>
            {item.disclosureWidenedAt && item.initialDisclosureRound !== item.disclosureRound ? (
              <NoteText>
                {fill(L.disclosureWidened, {
                  date: fmtDate(item.disclosureWidenedAt),
                  round: item.disclosureRound ?? '',
                })}
              </NoteText>
            ) : null}
            {showLine
              ? item.line.map((l) => (
                  <NoteText key={l.round} data-testid={`evobj-line-${l.round}`}>
                    {fill(L.lineItem, { round: l.round, name: l.name })} · {l.sees ? L.lineSees : L.lineHidden}
                  </NoteText>
                ))
              : null}
          </Stack>
        </div>
      </div>
      <div>
        <div className="evs-cw-review-k">{L.opinionsTitle}</div>
        <Stack gap="md">
          <NoteText>{L.opinionsHint}</NoteText>
          {item.opinions?.length ? (
            item.opinions.map((op) => (
              <div key={op.id} className="evs-cw-review-reason" data-testid="evobj-opinion">
                <NoteText>
                  {op.authorName} · {seatLabel(op, L)} · {fmtDate(op.createdAt)}
                </NoteText>
                <div className="evs-cw-review-reason-body">{op.body}</div>
              </div>
            ))
          ) : (
            <NoteText data-testid="evobj-opinions-empty">{L.opinionsEmpty}</NoteText>
          )}
          {opinionSlot}
        </Stack>
      </div>
    </Stack>
  );
}

/**
 * 의견 입력칸 — 빈칸이면 [의견 남기기] 꺼짐 · 실패하면 쓴 글을 남기고 빨간 줄.
 * onSubmit(body) → Promise.
 */
export function ObjectionOpinionInput({ onSubmit, maxLength, labels }) {
  const L = { ...OBJECTION_JUDGE_LABELS, ...labels };
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Stack gap="xs">
      <TextArea
        rows={3}
        value={text}
        maxLength={maxLength}
        placeholder={L.opinionPlaceholder}
        aria-label={L.opinionsTitle}
        onChange={(e) => setText(e.target.value)}
        data-testid="evobj-opinion-input"
      />
      <NoteText>{L.opinionInputHint}</NoteText>
      {failed ? <FieldError data-testid="evobj-opinion-error">{L.opinionFailed}</FieldError> : null}
      <div className="evc-card-buttons">
        <Button
          className="evc-btn is-ghost"
          disabled={busy || !text.trim()}
          onClick={async () => {
            setBusy(true);
            setFailed(false);
            try {
              await onSubmit?.(text.trim());
              setText('');
            } catch {
              setFailed(true);
            } finally {
              setBusy(false);
            }
          }}
          data-testid="evobj-opinion-send"
        >
          {L.opinionSend}
        </Button>
      </div>
    </Stack>
  );
}

/**
 * 결정 칸 — 결과(미리 안 고름) · 수용이고 대상에 «최종 등급»이 있으면 새 등급(지금 등급은 못 고름) ·
 * 결정 사유(늘 필수) · AI 관여 설명(요청 시 필수 · 기록 요약이 미리 채워짐) · 공유 대상(기본 전원 체크).
 * [결정 보내기] → 확인 창 → onSubmit(input) — Promise. 실패하면 확인 창 안에 문구 · 입력 유지.
 *
 * Props
 *   item            ObjectionContentView — targets · currentGradeKey · currentGradeLabel
 *   grades          [{ gradeKey, label }]
 *   shareCandidates [{ userId, name, round, sees }]
 *   aiSummary       기록에서 만든 AI 관여 사실 요약 | null
 *   intro           칸 위 안내(«위원회의 판단을 입력하는 칸입니다» 등) | null
 *   confirmBody     확인 창 본문(경로마다 다르다)
 *   onSubmit(input) · conflictMessage(err) → 이미 결정됐을 때 문구(없으면 일반 실패 문구)
 *   maxLength
 */
export function ObjectionDecisionForm({
  item,
  grades = [],
  shareCandidates = [],
  aiSummary = null,
  intro = null,
  confirmTitle,
  confirmBody,
  onSubmit,
  errorText,
  maxLength,
  labels,
}) {
  const L = { ...OBJECTION_JUDGE_LABELS, ...labels };
  const [result, setResult] = useState(null);
  const [grade, setGrade] = useState(null);
  const [reason, setReason] = useState('');
  const [aiEdited, setAiEdited] = useState(null);
  const [share, setShare] = useState(() => shareCandidates.map((c) => c.userId));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(null);
  const needsAi = (item.targets ?? []).includes('ai');
  const gradeTarget = (item.targets ?? []).includes('grade');
  const aiText = aiEdited ?? aiSummary ?? '';
  const ready =
    !!result && !!reason.trim() && (!needsAi || !!aiText.trim());
  const gradeLabel = (k) => grades.find((g) => g.gradeKey === k)?.label ?? k;
  const changed = result === 'accepted' && gradeTarget && grade && grade !== item.currentGradeKey;
  return (
    <div className="evs-cw-review-form" data-testid="evobj-decision-form">
      <Stack gap="lg">
        <div className="evs-cw-review-k">{L.decisionTitle}</div>
        {intro ? <NoteText data-testid="evobj-decision-intro">{intro}</NoteText> : null}
        <FormField label={L.resultLabel} required group>
          <Stack gap="md">
            {['accepted', 'rejected'].map((r) => (
              <Radio
                key={r}
                name={`evobj-result-${item.id}`}
                value={r}
                checked={result === r}
                onChange={() => setResult(r)}
                label={r === 'accepted' ? L.resultAccepted : L.resultRejected}
                data-testid={`evobj-result-${r}`}
              />
            ))}
          </Stack>
        </FormField>
        {result === 'accepted' && gradeTarget ? (
          <FormField label={L.newGradeLabel} group hint={L.newGradeHint}>
            <Stack gap="md">
              {grades.map((g) => {
                const isNow = g.gradeKey === item.currentGradeKey;
                return (
                  <Radio
                    key={g.gradeKey}
                    name={`evobj-grade-${item.id}`}
                    value={g.gradeKey}
                    checked={grade === g.gradeKey}
                    disabled={isNow}
                    onChange={() => setGrade(g.gradeKey)}
                    label={isNow ? `${g.label} · ${L.currentGradeTag}` : g.label}
                    data-testid={`evobj-grade-${g.gradeKey}`}
                  />
                );
              })}
            </Stack>
          </FormField>
        ) : null}
        <FormField label={L.decisionReasonLabel} required hint={L.decisionReasonHint}>
          <TextArea
            rows={4}
            value={reason}
            maxLength={maxLength}
            aria-label={L.decisionReasonLabel}
            onChange={(e) => setReason(e.target.value)}
            data-testid="evobj-reason-input"
          />
        </FormField>
        {needsAi ? (
          <FormField label={L.aiExplanationLabel} required hint={L.aiExplanationHint}>
            <TextArea
              rows={5}
              value={aiText}
              maxLength={maxLength}
              aria-label={L.aiExplanationLabel}
              onChange={(e) => setAiEdited(e.target.value)}
              data-testid="evobj-ai-input"
            />
          </FormField>
        ) : null}
        <FormField label={L.shareLabel} group hint={L.shareHint}>
          {shareCandidates.length ? (
            <Stack gap="md">
              {shareCandidates.map((c) => (
                <Checkbox
                  key={c.userId}
                  checked={share.includes(c.userId)}
                  onChange={() =>
                    setShare((cur) =>
                      cur.includes(c.userId) ? cur.filter((x) => x !== c.userId) : [...cur, c.userId],
                    )
                  }
                  label={
                    c.sees
                      ? fill(L.shareItem, { round: c.round, name: c.name })
                      : `${fill(L.shareItem, { round: c.round, name: c.name })} · ${L.shareReasonOnly}`
                  }
                  data-testid={`evobj-share-${c.userId}`}
                />
              ))}
            </Stack>
          ) : (
            <NoteText>{L.shareNone}</NoteText>
          )}
        </FormField>
        {errorText ? <FieldError data-testid="evobj-decision-error">{errorText}</FieldError> : null}
        <div className="evc-card-buttons">
          <Button
            className="evc-btn is-primary"
            disabled={!ready}
            onClick={() => {
              setFailed(null);
              setConfirming(true);
            }}
            data-testid="evobj-decide"
          >
            {L.decideButton}
          </Button>
        </div>
      </Stack>
      {confirming ? (
        <ConfirmModal
          title={confirmTitle ?? L.confirmTitle}
          body={
            <Stack gap="md">
              <span>{confirmBody ?? L.confirmBody}</span>
              <NoteText data-testid="evobj-confirm-summary">
                {result === 'accepted' ? L.resultAccepted : L.resultRejected}
                {changed ? ` · ${gradeLabel(item.currentGradeKey)} → ${gradeLabel(grade)}` : ''}
              </NoteText>
              <NoteText>{fill(L.confirmRecipients, { n: share.length })}</NoteText>
              {failed ? <FieldError data-testid="evobj-confirm-error">{failed}</FieldError> : null}
            </Stack>
          }
          confirmLabel={busy && L.sending ? L.sending : L.confirmSend}
          cancelLabel={L.cancel}
          busy={busy}
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            setBusy(true);
            setFailed(null);
            try {
              await onSubmit?.({
                result,
                reason: reason.trim(),
                aiExplanation: needsAi ? aiText.trim() : null,
                newGradeKey: changed ? grade : null,
                shareWith: share,
              });
              setConfirming(false);
            } catch (err) {
              setFailed(err?.objectionMessage || L.decideFailed);
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

/** 결정 뒤 읽기 전용 — 결과 · (바뀌었으면) 전·후 등급 · 결정 사유 · AI 관여 설명 · 공유 대상 · 결정한 사람 · 시각. */
export function ObjectionDecisionResult({
  decision,
  fmtDate = (iso) => String(iso ?? '').slice(0, 10),
  showShare = true,
  labels,
}) {
  const L = { ...OBJECTION_JUDGE_LABELS, ...labels };
  if (!decision) return null;
  return (
    <div className="evs-cw-review-form" data-testid="evobj-decision-result">
      <Stack gap="lg">
        <div className="evc-type-badges">
          <StatusBadge tone={decision.result === 'accepted' ? 'success' : 'neutral'} className="evs-cw-appeal-badge">
            {decision.result === 'accepted' ? L.resultAccepted : L.resultRejected}
          </StatusBadge>
          <NoteText>
            {fmtDate(decision.decidedAt)} · {decision.deciderName ?? ''}
          </NoteText>
        </div>
        {decision.gradeAfterLabel ? (
          <div>
            <div className="evs-cw-review-k">{L.changedGradeLabel}</div>
            <div className="evs-cw-review-v" data-testid="evobj-result-grade">
              {decision.gradeBeforeLabel ?? '-'} → {decision.gradeAfterLabel}
            </div>
          </div>
        ) : null}
        <div>
          <div className="evs-cw-review-k">{L.decisionReasonLabel}</div>
          <div className="evs-cw-review-reason">
            <div className="evs-cw-review-reason-body" data-testid="evobj-result-reason">
              {decision.reason}
            </div>
          </div>
        </div>
        {decision.aiExplanation ? (
          <div>
            <div className="evs-cw-review-k">{L.aiExplanationLabel}</div>
            <div className="evs-cw-review-reason">
              <div className="evs-cw-review-reason-body">{decision.aiExplanation}</div>
            </div>
          </div>
        ) : null}
        {showShare && decision.shareWithNames ? (
          <div>
            <div className="evs-cw-review-k">{L.shareLabel}</div>
            <div className="evs-cw-review-v" data-testid="evobj-result-share">
              {decision.shareWithNames.length ? decision.shareWithNames.join(', ') : L.shareNone}
            </div>
          </div>
        ) : null}
      </Stack>
    </div>
  );
}
