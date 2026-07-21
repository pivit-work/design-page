import { useMemo, useState } from 'react';

/**
 * EvalCycleReportCanvas — 내 평가 리포트 (멤버, 읽기 전용, 원페이지).
 *
 * v2(G9) 강화: 등급 hero(앵커 툴팁) + **목표(OKR) 리뷰**(최대 차별점) + **자기평가 갭**
 * (셀프 vs 평가 점수 비교) + 리더 코멘트 + 동료 요약(익명) + **성장 영역 & 개선** + 셀프 리뷰.
 * 근거: research-global-report-sample.md / plan §G9.
 */

const DEFAULT_LABELS = {
  title: '내 평가 리포트',
  emptyTitle: '리포트가 아직 준비되지 않았습니다',
  emptySub: '평가가 마무리되면 결과를 확인할 수 있습니다.',
  gradeLabel: '최종 평가 등급',
  gradeAnchorHint: '등급 기준 보기',
  okrTitle: '목표(OKR) 리뷰',
  okrEmpty: '이 기간에 등록된 개인 OKR이 없습니다.',
  okrProgress: '달성률',
  okrSelfAchieve: '자기신고',
  gapTitle: '자기평가 갭',
  gapSub: '내 셀프 평가와 최종 평가 점수를 비교합니다.',
  gapSelf: '나(셀프)',
  gapReviewed: '평가 결과',
  gapDiff: '갭',
  leaderTitle: '리더 코멘트',
  peerTitle: '동료 피드백 요약 (익명)',
  growthTitle: '성장 영역 & 개선',
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

function krColor(p) {
  if (p >= 80) return 'var(--utility-success-500, #17b26a)';
  if (p >= 50) return 'var(--utility-warning-500, #f79009)';
  return 'var(--utility-error-500, #f04438)';
}

/** 카테고리별 평균 점수(scale 항목만, growth 제외). */
function avgByCat(answers) {
  const acc = {};
  for (const a of answers) {
    if (a.score == null || !a.itemCategory || a.itemCategory === 'growth') continue;
    (acc[a.itemCategory] ??= []).push(a.score);
  }
  const out = {};
  for (const k of Object.keys(acc)) {
    out[k] = acc[k].reduce((s, n) => s + n, 0) / acc[k].length;
  }
  return out;
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

// ── 자기평가 갭: 셀프 vs 평가 점수 카테고리 비교 ──
function SelfGap({ selfAnswers, leaderAnswers, L }) {
  const self = useMemo(() => avgByCat(selfAnswers), [selfAnswers]);
  const reviewed = useMemo(() => avgByCat(leaderAnswers), [leaderAnswers]);
  const cats = [...new Set([...Object.keys(self), ...Object.keys(reviewed)])].filter(
    (c) => CAT_KEY[c],
  );
  if (cats.length === 0) return null;
  return (
    <section className="evc-card" data-testid="evr-gap">
      <h3 className="evc-card-name">{L.gapTitle}</h3>
      <p className="evc-empty-sub">{L.gapSub}</p>
      <div className="evr-gap-grid">
        <div className="evr-gap-head">
          <span />
          <span>{L.gapSelf}</span>
          <span>{L.gapReviewed}</span>
          <span>{L.gapDiff}</span>
        </div>
        {cats.map((c) => {
          const s = self[c];
          const r = reviewed[c];
          const diff = s != null && r != null ? Math.round((s - r) * 10) / 10 : null;
          return (
            <div className="evr-gap-row" key={c}>
              <span className="evc-field-label">{L[CAT_KEY[c]]}</span>
              <span>{s != null ? `${Math.round(s * 10) / 10}/5` : '—'}</span>
              <span>{r != null ? `${Math.round(r * 10) / 10}/5` : '—'}</span>
              <span
                style={{
                  fontWeight: 700,
                  color:
                    diff == null
                      ? 'var(--text-tertiary)'
                      : diff > 0
                        ? 'var(--utility-warning-600, #dc6803)'
                        : diff < 0
                          ? 'var(--utility-success-600, #079455)'
                          : 'var(--text-secondary)',
                }}
              >
                {diff == null ? '—' : diff > 0 ? `+${diff}` : diff}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── 목표(OKR) 리뷰 섹션 (최대 차별점) ──
function OkrReview({ okrReview, L }) {
  return (
    <section className="evc-card" data-testid="evr-okr">
      <h3 className="evc-card-name">{L.okrTitle}</h3>
      {!okrReview || okrReview.length === 0 ? (
        <p className="evc-empty-sub">{L.okrEmpty}</p>
      ) : (
        <div className="evr-okr-list">
          {okrReview.map((o) => (
            <div className="evr-okr-obj" key={o.id}>
              <div className="evr-okr-obj-head">
                <span className="evr-okr-obj-title">{o.title}</span>
                <span className="evr-okr-obj-prog" style={{ color: krColor(o.progress ?? 0) }}>
                  {L.okrProgress} {o.progress ?? 0}%
                </span>
              </div>
              {(o.keyResults ?? []).map((kr) => (
                <div className="evr-okr-kr" key={kr.id}>
                  <span className="evr-okr-kr-title">{kr.title}</span>
                  <span className="evr-okr-kr-bar">
                    <span
                      className="evr-okr-kr-fill"
                      style={{ width: `${kr.progress ?? 0}%`, background: krColor(kr.progress ?? 0) }}
                    />
                  </span>
                  <span className="evr-okr-kr-pct">
                    {kr.progress ?? 0}%
                    {kr.selfAchievePct != null ? ` · ${L.okrSelfAchieve} ${kr.selfAchievePct}%` : ''}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── 성장 영역 & 개선 ──
function GrowthAreas({ selfAnswers, L }) {
  const byType = useMemo(() => {
    const g = { strengths: [], improvements: [], growth_demonstrated: [] };
    for (const a of selfAnswers) {
      if (a.itemCategory === 'growth' && a.growthType && g[a.growthType]) {
        g[a.growthType].push(a);
      }
    }
    return g;
  }, [selfAnswers]);
  const order = ['strengths', 'improvements', 'growth_demonstrated'];
  const has = order.some((k) => byType[k].length > 0);
  if (!has) return null;
  return (
    <section className="evc-card" data-testid="evr-growth">
      <h3 className="evc-card-name">{L.growthTitle}</h3>
      <div className="evr-growth-grid">
        {order.map((k) =>
          byType[k].length === 0 ? null : (
            <div className="evr-growth-block" key={k}>
              <span className="evc-field-label">{L[GROWTH_KEY[k]]}</span>
              {byType[k].map((a) => (
                <p className="evr-answer-text" key={a.id}>
                  {a.textAnswer}
                </p>
              ))}
            </div>
          ),
        )}
      </div>
    </section>
  );
}

export default function EvalCycleReportCanvas({
  cycle,
  published = true,
  gradeKey,
  gradeLabel,
  gradeDescription,
  okrReview = [],
  selfAnswers = [],
  leaderAnswers = [],
  peerAnswers = [],
  labels: providedLabels,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [showAnchor, setShowAnchor] = useState(false);

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
            {gradeDescription && (
              <span className="evr-grade-anchor">
                <button
                  type="button"
                  className="evr-grade-anchor-btn"
                  onClick={() => setShowAnchor((v) => !v)}
                  aria-expanded={showAnchor}
                  data-testid="evr-grade-anchor"
                >
                  ⓘ {L.gradeAnchorHint}
                </button>
                {showAnchor && (
                  <span className="evr-grade-anchor-pop" role="tooltip">
                    {gradeDescription}
                  </span>
                )}
              </span>
            )}
          </section>
        )}

        <OkrReview okrReview={okrReview} L={L} />

        <SelfGap selfAnswers={selfAnswers} leaderAnswers={leaderAnswers} L={L} />

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

        <GrowthAreas selfAnswers={selfAnswers} L={L} />

        {selfAnswers.length > 0 && (
          <section className="evc-card">
            <h3 className="evc-card-name">{L.selfTitle}</h3>
            <AnswerList answers={selfAnswers.filter((a) => a.itemCategory !== 'growth')} L={L} />
          </section>
        )}
      </div>
    </div>
  );
}
