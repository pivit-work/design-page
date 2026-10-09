import { useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Skeleton from '../shared/Skeleton.jsx';
import Button from '../shared/Button.jsx';

/**
 * EvalLeaderPriorRounds — 하향 리뷰 작성 화면 좌측 근거 칸 맨 위의 「앞 차수 리뷰」 (PW-1594 ·
 * 리더 정책 §5.13.3). 2차 이후 평가자가 가장 먼저 확인할 근거다.
 *
 * 앞 차수마다 한 장(아래 차수부터). 머리는 `{j}차 · {작성자} · 제출 MM/DD HH:MM` + 등급 딱지, 본문은
 * 항목별 점수·서술. 기본 펼침은 바로 아래 차수(제출된 것 가운데 가장 높은 차수) 한 장이다.
 * 건너뛴 차수·HR 이 앞 차수 없이 연 차수는 한 줄로, 제출 뒤 고친 카드는 warning 딱지를 붙인다.
 *
 * 비공개 코멘트·승진/보상은 서버가 응답에서 이미 뺐다(화면이 숨기는 것이 아니다) — 그 사실만
 * 카드 아래에 알린다. 공개 범위 딱지는 그리지 않는다(이 열람은 공개 범위와 다른 축이다).
 *
 * 불러오는 중이면 자리 한 장, 실패면 「다시 시도」 — 작성은 막지 않는다(다른 근거와 같다).
 *
 * @param {{status:'loading'}|{status:'failed'}|{status:'ready', rounds:object[]}|null} state
 * @param {() => void} [onRetry]
 * @param {(answer) => string} labelOf 답 → 항목 이름(호출부의 평가지 매핑)
 * @param {(answer) => number} scaleMaxOf 답 → 척도 끝값
 * @param {(gradeKey) => string} gradeLabelOf 등급 저장값 → 이름
 * @param {object} L 문구(`{round}`·`{name}`·`{at}`·`{date}` 자리를 채운다)
 */

const fill = (tpl, vars) =>
  String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));

const pad = (n) => String(n).padStart(2, '0');
const asDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};
const mmdd = (iso) => {
  const d = asDate(iso);
  return d ? `${pad(d.getMonth() + 1)}/${pad(d.getDate())}` : '';
};
const mmddhhmm = (iso) => {
  const d = asDate(iso);
  return d ? `${mmdd(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
};

function PriorCard({ r, open, onToggle, labelOf, scaleMaxOf, gradeLabelOf, L }) {
  const late = !!r.openedByHrAt;
  return (
    <div className="evl-evi-item" data-testid={`evl-prior-card-${r.round}`}>
      <div className="evl-prior-head">
        <span className="evc-field-label">
          {fill(L.priorHead, {
            round: r.round,
            name: r.evaluatorName || L.priorUnknownEvaluator || '—',
            at: mmddhhmm(r.submittedAt),
          })}
        </span>
        {r.gradeKey && (
          <StatusBadge tone="info" data-testid={`evl-prior-grade-${r.round}`}>
            {gradeLabelOf(r.gradeKey)}
          </StatusBadge>
        )}
        {late && (
          <StatusBadge tone="neutral" data-testid={`evl-prior-late-${r.round}`}>
            {L.priorLate}
          </StatusBadge>
        )}
        {r.editedAfterSubmitAt && (
          <StatusBadge tone="warning" data-testid={`evl-prior-edited-${r.round}`}>
            {fill(L.priorEdited, { at: mmddhhmm(r.editedAfterSubmitAt) })}
          </StatusBadge>
        )}
        <button
          type="button"
          className="evl-sec-toggle"
          aria-expanded={open}
          onClick={onToggle}
          data-testid={`evl-prior-toggle-${r.round}`}
        >
          {open ? L.sectionCollapse : L.sectionExpand}
        </button>
      </div>
      {open && (
        <>
          {(r.answers || []).length === 0 ? (
            <p className="evc-empty-sub">{L.priorNoAnswers}</p>
          ) : (
            r.answers.map((a, i) => (
              <div key={`${a.templateItemId ?? a.itemCategory ?? ''}-${i}`} data-testid="evl-prior-answer">
                <span className="evc-field-label">
                  {labelOf(a)}
                  {a.score != null ? ` · ${a.score}/${scaleMaxOf(a)}` : ''}
                </span>
                {a.textAnswer ? <p className="evl-evi-text">{a.textAnswer}</p> : null}
                {a.rationale ? (
                  <p className="evl-evi-text">
                    {L.evidenceRationaleLabel} · {a.rationale}
                  </p>
                ) : null}
              </div>
            ))
          )}
          <p className="evl-prior-private" data-testid={`evl-prior-private-${r.round}`}>
            {L.priorPrivateNote}
          </p>
        </>
      )}
    </div>
  );
}

export default function EvalLeaderPriorRounds({ state, onRetry, labelOf, scaleMaxOf, gradeLabelOf, L }) {
  const rounds = state?.status === 'ready' ? [...(state.rounds || [])].sort((a, b) => a.round - b.round) : [];
  const nearest = rounds.filter((r) => !r.skipped && r.submittedAt).map((r) => r.round).pop() ?? null;
  // 사용자가 연·접은 카드만 기억한다 — 나머지는 «바로 아래 차수만 펼침» 규칙을 따른다.
  const [toggled, setToggled] = useState({});
  if (!state) return null;
  const isOpen = (round) => (round in toggled ? toggled[round] : round === nearest);

  return (
    <section className="evl-prior" data-testid="evl-prior">
      <h3 className="evc-card-name">{L.priorTitle}</h3>
      {state.status === 'loading' && <Skeleton height={92} data-testid="evl-prior-loading" />}
      {state.status === 'failed' && (
        <div data-testid="evl-prior-failed">
          <p className="evc-empty-sub">{L.priorLoadFailed}</p>
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry} data-testid="evl-prior-retry">
              {L.priorRetry}
            </Button>
          )}
        </div>
      )}
      {rounds.map((r) => {
        if (r.skipped) {
          return (
            <p key={r.round} className="evc-empty-sub" data-testid={`evl-prior-skipped-${r.round}`}>
              {fill(L.priorSkipped, { round: r.round })}
            </p>
          );
        }
        if (!r.submittedAt) {
          return (
            <p key={r.round} className="evc-empty-sub" data-testid={`evl-prior-pending-${r.round}`}>
              {r.openedByHrAt
                ? fill(L.priorOpenedByHr, { round: r.round, date: mmdd(r.openedByHrAt) })
                : fill(L.priorPending, { round: r.round })}
            </p>
          );
        }
        return (
          <PriorCard
            key={r.round}
            r={r}
            open={isOpen(r.round)}
            onToggle={() => setToggled((t) => ({ ...t, [r.round]: !isOpen(r.round) }))}
            labelOf={labelOf}
            scaleMaxOf={scaleMaxOf}
            gradeLabelOf={gradeLabelOf}
            L={L}
          />
        );
      })}
    </section>
  );
}
