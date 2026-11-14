import Button from '../shared/Button.jsx';
import DueBadge from '../shared/DueBadge.jsx';
import Skeleton from '../shared/Skeleton.jsx';
import Stack from '../shared/Stack.jsx';
import { NoteText } from '../shared/SharedText.jsx';
import {
  ObjectionContent,
  ObjectionDecisionForm,
  ObjectionDecisionResult,
  ObjectionOpinionInput,
  ObjectionStatusBadge,
} from './EvalObjectionShared.jsx';
import { LEADER_OBJECTION_LABELS, fillObjectionText as fill } from './evalObjectionLabels.js';

/**
 * 하향 리뷰 «구성원 이의» 블록 (pivit-work PW-2636 · leader.policy §7.0-A · 2026-11-14 David 결정).
 *
 * 머리(이름 · 차수 줄) 바로 아래 · 근거/작성 2단 패널 위에 `.evc-card` 한 장. 판단 측 칸은 공용 부품
 * (`EvalObjectionShared.jsx`)을 그대로 쓴다. 디자이너 원본 없음 — design-review.
 *
 * Props — `objection` 하나(캔버스가 그대로 넘긴다). null 이면 아무것도 그리지 않는다(빈 문구도 없음 —
 * 아래 차수에게 «없다»와 «못 본다»가 갈려 보이면 흔적이 된다).
 *   state      'loading' | 'failed' | 'ready'
 *   view       LeaderObjectionView(앱 응답 그대로) — kind 'full' | 'decision'. ready 인데 null 이면 그리지 않는다.
 *   labels     이 블록 문구(`LEADER_OBJECTION_LABELS` 덮기) + `judge`(공용 부품 문구 · `OBJECTION_JUDGE_LABELS` 덮기)
 *   fmtDate(iso)  날짜 글자
 *   onRetry · onOpinion(body)→Promise · onDecide(input)→Promise · onDownload(file)
 *   opinionMaxLength · decisionMaxLength  의견 칸 · 결정 사유/AI 관여 설명 칸 글자 한도(앱이 서버 정본을 넘긴다)
 */

const PATH_KEY = {
  judge: 'pathJudge',
  assigned: 'pathAssigned',
  evaluator: 'pathEvaluator',
  committee: 'pathCommittee',
};

function DueLine({ view, L, fmtDate }) {
  if (view.daysLeft < 0) {
    return <DueBadge label={L.overdue} tone="overdue" data-testid="evl-objection-due" />;
  }
  return (
    <DueBadge
      label={fill(L.due, { n: view.daysLeft, date: fmtDate(view.dueAt) })}
      tone={view.daysLeft <= 2 ? 'warning' : undefined}
      data-testid="evl-objection-due"
    />
  );
}

export default function EvalLeaderObjectionBlock({ objection }) {
  if (!objection) return null;
  const { state, view, onRetry, onOpinion, onDecide, onDownload, opinionMaxLength, decisionMaxLength } = objection;
  const fmtDate = objection.fmtDate ?? ((iso) => String(iso ?? '').slice(0, 10));
  const { judge: judgeLabels, ...own } = objection.labels ?? {};
  const L = { ...LEADER_OBJECTION_LABELS, ...own };

  if (state === 'loading') {
    return (
      <section className="evc-card" aria-busy="true" data-testid="evl-objection-loading">
        <Stack gap="sm">
          <Skeleton width="40%" />
          <Skeleton width="80%" />
        </Stack>
      </section>
    );
  }
  if (state === 'failed') {
    return (
      <section className="evc-card" role="alert" data-testid="evl-objection-failed">
        <Stack gap="md">
          <NoteText>{L.loadFailed}</NoteText>
          {onRetry ? (
            <div className="evc-card-buttons">
              <Button className="evc-btn is-ghost" onClick={onRetry} data-testid="evl-objection-retry">
                {L.retry}
              </Button>
            </div>
          ) : null}
        </Stack>
      </section>
    );
  }
  if (!view) return null;

  // 공유 대상 — 결정 사유만 받는다(대상 · 사유 원문 · 증빙 · 의견 · AI 관여 설명 없음).
  if (view.kind === 'decision') {
    return (
      <section className="evc-card" data-testid="evl-objection-decision">
        <Stack gap="lg">
          <h3 className="evc-card-name">{L.decisionTitle}</h3>
          <ObjectionDecisionResult
            decision={{ ...view.decision, aiExplanation: null }}
            fmtDate={fmtDate}
            showShare={false}
            labels={judgeLabels}
          />
        </Stack>
      </section>
    );
  }

  const withdrawn = view.status === 'withdrawn';
  const decided = view.status === 'decided' || !!view.decision;
  const open = !withdrawn && !decided;
  const path = fill(L[PATH_KEY[view.pathLine]] ?? '', { name: view.judgeName ?? '' });
  return (
    <section className="evc-card" data-testid="evl-objection">
      <Stack gap="lg">
        <div className="evc-type-badges">
          <h3 className="evc-card-name">{L.title}</h3>
          <ObjectionStatusBadge status={view.status} labels={judgeLabels} />
          {open ? <DueLine view={view} L={L} fmtDate={fmtDate} /> : null}
        </div>
        {withdrawn ? (
          <NoteText data-testid="evl-objection-withdrawn">{L.withdrawn}</NoteText>
        ) : path ? (
          <NoteText data-testid="evl-objection-path">{path}</NoteText>
        ) : null}
        <ObjectionContent
          item={view}
          onDownload={onDownload}
          fmtDate={fmtDate}
          labels={judgeLabels}
          opinionSlot={
            open && view.canOpinion && onOpinion ? (
              <ObjectionOpinionInput onSubmit={onOpinion} maxLength={opinionMaxLength} labels={judgeLabels} />
            ) : null
          }
        />
        {view.decision ? (
          <ObjectionDecisionResult decision={view.decision} fmtDate={fmtDate} labels={judgeLabels} />
        ) : open && view.canDecide && onDecide ? (
          <ObjectionDecisionForm
            item={view}
            grades={view.grades}
            shareCandidates={view.shareCandidates}
            aiSummary={view.aiSummary}
            onSubmit={onDecide}
            maxLength={decisionMaxLength}
            labels={judgeLabels}
          />
        ) : null}
      </Stack>
    </section>
  );
}

/** 하향 리뷰 등급 칸 옆 — 이의 결정으로 바뀐 등급이면 처음 등급을 함께 보인다. */
export function LeaderObjectionGradeNote({ objection }) {
  const from = objection?.gradeChangedFrom;
  if (!from) return null;
  const L = { ...LEADER_OBJECTION_LABELS, ...(objection.labels ?? {}) };
  return (
    <p className="evl-grade-round-note" data-testid="evl-objection-grade-note">
      {fill(L.gradeChangedNote, { from })}
    </p>
  );
}
