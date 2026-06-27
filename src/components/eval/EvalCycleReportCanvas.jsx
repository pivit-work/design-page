import { useMemo } from 'react';

/**
 * EvalCycleReportCanvas — 내 평가 리포트 (멤버, 읽기 전용, 원페이지).
 * 등급 hero + 리더 코멘트(하향) + 동료 요약(익명) + 셀프 요약. 순수 표현.
 */

const DEFAULT_LABELS = {
  title: '내 평가 리포트',
  emptyTitle: '리포트가 아직 준비되지 않았습니다',
  emptySub: '평가가 마무리되면 결과를 확인할 수 있습니다.',
  gradeLabel: '최종 평가 등급',
  leaderTitle: '리더 코멘트',
  peerTitle: '동료 피드백 요약 (익명)',
  selfTitle: '나의 셀프 리뷰',
  catWork: '업적',
  catCompetency: '역량',
  catStrengths: '강점',
  catImprovements: '보완점',
  catGrowthDemo: '성장',
};

const CAT_KEY = { work_achievement: 'catWork', competency: 'catCompetency' };
const GROWTH_KEY = {
  strengths: 'catStrengths',
  improvements: 'catImprovements',
  growth_demonstrated: 'catGrowthDemo',
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

function catLabel(a, L) {
  if (a.itemCategory === 'growth') return L[GROWTH_KEY[a.growthType]] ?? a.growthType ?? '';
  return L[CAT_KEY[a.itemCategory]] ?? a.itemCategory ?? '';
}

function AnswerList({ answers, L }) {
  return (
    <div className="evr-answers">
      {answers.map((a) => (
        <div className="evr-answer" key={a.id}>
          <span className="evc-field-label">
            {catLabel(a, L)}
            {a.score != null ? ` · ${a.score}/5` : ''}
          </span>
          <p className="evr-answer-text">{a.textAnswer}</p>
        </div>
      ))}
    </div>
  );
}

export default function EvalCycleReportCanvas({
  cycle,
  published = true,
  gradeKey,
  gradeLabel,
  selfAnswers = [],
  leaderAnswers = [],
  peerAnswers = [],
  labels: providedLabels,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);

  if (!published || (!gradeKey && leaderAnswers.length === 0)) {
    return (
      <div className="evc-root">
        <div className="evc-empty" data-testid="evr-empty">
          <p className="evc-empty-title">{L.emptyTitle}</p>
          <p className="evc-empty-sub">{L.emptySub}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          {cycle?.name && <p className="evc-summary">{cycle.name}</p>}
        </div>
      </header>

      <div className="evc-list">
        {gradeKey && (
          <section className="evr-grade-hero" data-testid="evr-grade">
            <span className="evr-grade-label">{L.gradeLabel}</span>
            <span className="evr-grade-value">{gradeLabel ?? gradeKey}</span>
          </section>
        )}

        {leaderAnswers.length > 0 && (
          <section className="evc-card">
            <h3 className="evc-card-name">{L.leaderTitle}</h3>
            <AnswerList answers={leaderAnswers} L={L} />
          </section>
        )}

        {peerAnswers.length > 0 && (
          <section className="evc-card">
            <h3 className="evc-card-name">{L.peerTitle}</h3>
            <AnswerList answers={peerAnswers} L={L} />
          </section>
        )}

        {selfAnswers.length > 0 && (
          <section className="evc-card">
            <h3 className="evc-card-name">{L.selfTitle}</h3>
            <AnswerList answers={selfAnswers} L={L} />
          </section>
        )}
      </div>
    </div>
  );
}
