import { useState, useMemo } from 'react';

/**
 * EvalCycleLeaderCanvas — 매니저 하향 리뷰 (근거↔작성 2단 패널).
 *
 * 좌: 근거 데이터(피평가자 셀프 리뷰). 우: 하향 리뷰 작성(업적/역량+점수/성장) + 최종 등급.
 * selfAnswers/leaderAnswers/gradeKey 로 시드, onSave(items,gradeKey)/onSubmit 위임.
 */

const DEFAULT_LABELS = {
  title: '하향 리뷰',
  evidenceTitle: '근거 · 셀프 리뷰',
  evidenceEmpty: '피평가자가 아직 셀프 리뷰를 작성하지 않았습니다.',
  submittedBanner: '제출 완료 — 마감 전까지 다시 제출할 수 있습니다.',
  workTitle: '업적 (What)',
  workPlaceholder: '업적에 대한 평가를 작성하세요.',
  competencyTitle: '역량 (How)',
  competencyPlaceholder: '역량에 대한 평가를 작성하세요.',
  scoreLabel: '평가 점수',
  growthTitle: '강점 · 보완 · 성장',
  strengthsLabel: '강점',
  strengthsPlaceholder: '강점을 작성하세요.',
  improvementsLabel: '보완점',
  improvementsPlaceholder: '보완점을 작성하세요.',
  growthDemoLabel: '성장 기대',
  growthDemoPlaceholder: '성장 기대를 작성하세요.',
  gradeTitle: '최종 등급',
  gradeRequired: '제출하려면 최종 등급을 선택하세요.',
  save: '임시저장',
  submit: '제출하기',
  // category labels for evidence
  catWork: '업적',
  catCompetency: '역량',
  catStrengths: '강점',
  catImprovements: '보완점',
  catGrowthDemo: '성장',
};

const DEFAULT_GRADES = [
  { key: 'exceeds', label: '탁월' },
  { key: 'meets', label: '충족' },
  { key: 'below', label: '미흡' },
];

const FIELDS = [
  { key: 'work', category: 'work_achievement', growthType: null, score: false, labelKey: 'workTitle', phKey: 'workPlaceholder', single: true },
  { key: 'comp', category: 'competency', growthType: null, score: true, labelKey: 'competencyTitle', phKey: 'competencyPlaceholder', single: true },
  { key: 'str', category: 'growth', growthType: 'strengths', score: false, labelKey: 'strengthsLabel', phKey: 'strengthsPlaceholder', single: false },
  { key: 'imp', category: 'growth', growthType: 'improvements', score: false, labelKey: 'improvementsLabel', phKey: 'improvementsPlaceholder', single: false },
  { key: 'gro', category: 'growth', growthType: 'growth_demonstrated', score: false, labelKey: 'growthDemoLabel', phKey: 'growthDemoPlaceholder', single: false },
];

const EVIDENCE_CAT_KEY = {
  work_achievement: 'catWork',
  competency: 'catCompetency',
};
const EVIDENCE_GROWTH_KEY = {
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

function seedState(answers) {
  const state = {};
  for (const f of FIELDS) state[f.key] = { textAnswer: '', score: null };
  for (const a of answers ?? []) {
    const f = FIELDS.find(
      (x) =>
        x.category === a.itemCategory &&
        (x.growthType ?? null) === (a.growthType ?? null),
    );
    if (f) state[f.key] = { textAnswer: a.textAnswer ?? '', score: a.score ?? null };
  }
  return state;
}

function evidenceLabel(a, L) {
  if (a.itemCategory === 'growth') {
    return L[EVIDENCE_GROWTH_KEY[a.growthType]] ?? a.growthType ?? '';
  }
  return L[EVIDENCE_CAT_KEY[a.itemCategory]] ?? a.itemCategory ?? '';
}

export default function EvalCycleLeaderCanvas({
  evaluateeName,
  cycle,
  selfAnswers = [],
  leaderAnswers = [],
  gradeKey: initialGrade = null,
  gradeOptions = DEFAULT_GRADES,
  submitted = false,
  labels: providedLabels,
  onSave,
  onSubmit,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [state, setState] = useState(() => seedState(leaderAnswers));
  const [grade, setGrade] = useState(initialGrade);

  const setField = (key, patch) =>
    setState((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const toItems = () =>
    FIELDS.filter((f) => state[f.key].textAnswer.trim() || state[f.key].score != null).map(
      (f) => ({
        itemCategory: f.category,
        growthType: f.growthType,
        textAnswer: state[f.key].textAnswer,
        score: state[f.key].score,
      }),
    );

  const sections = [
    { titleKey: 'workTitle', fields: FIELDS.filter((f) => f.key === 'work') },
    { titleKey: 'competencyTitle', fields: FIELDS.filter((f) => f.key === 'comp') },
    { titleKey: 'growthTitle', fields: FIELDS.filter((f) => f.category === 'growth') },
  ];

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}{evaluateeName ? ` — ${evaluateeName}` : ''}</h1>
          {cycle?.name && <p className="evc-summary">{cycle.name}</p>}
        </div>
      </header>

      {submitted && (
        <p className="evx-notice" data-testid="evl-submitted" style={{ maxWidth: 1080, margin: '0 auto 12px' }}>
          {L.submittedBanner}
        </p>
      )}

      <div className="evl-2pane">
        {/* 좌: 근거 */}
        <aside className="evl-evidence" data-testid="evl-evidence">
          <h3 className="evc-card-name">{L.evidenceTitle}</h3>
          {selfAnswers.length === 0 ? (
            <p className="evc-empty-sub">{L.evidenceEmpty}</p>
          ) : (
            selfAnswers.map((a) => (
              <div className="evl-evi-item" key={a.id}>
                <span className="evc-field-label">
                  {evidenceLabel(a, L)}
                  {a.score != null ? ` · ${a.score}/5` : ''}
                </span>
                <p className="evl-evi-text">{a.textAnswer}</p>
              </div>
            ))
          )}
        </aside>

        {/* 우: 작성 */}
        <div className="evl-form">
          {sections.map((sec) => (
            <section className="evc-card" key={sec.titleKey}>
              <h3 className="evc-card-name">{L[sec.titleKey]}</h3>
              {sec.fields.map((f) => (
                <div className="evm-field" key={f.key}>
                  {!f.single && <span className="evc-field-label">{L[f.labelKey]}</span>}
                  <textarea
                    className="evm-textarea"
                    rows={3}
                    value={state[f.key].textAnswer}
                    placeholder={L[f.phKey]}
                    disabled={submitted}
                    onChange={(e) => setField(f.key, { textAnswer: e.target.value })}
                    data-testid={`evl-text-${f.key}`}
                  />
                  {f.score && (
                    <div className="evm-score-row">
                      <span className="evc-field-label">{L.scoreLabel}</span>
                      <div className="evm-score-btns">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            type="button"
                            key={n}
                            className={`evm-score-btn${state[f.key].score === n ? ' is-on' : ''}`}
                            disabled={submitted}
                            onClick={() => setField(f.key, { score: n })}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </section>
          ))}

          {/* 최종 등급 */}
          <section className="evc-card">
            <h3 className="evc-card-name">{L.gradeTitle}</h3>
            <div className="evl-grade-row">
              {gradeOptions.map((g) => (
                <button
                  type="button"
                  key={g.key}
                  className={`evl-grade-btn${grade === g.key ? ' is-on' : ''}`}
                  disabled={submitted}
                  onClick={() => setGrade(g.key)}
                  data-testid={`evl-grade-${g.key}`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </section>

          {!submitted && (
            <div className="evm-submit-bar">
              <span className="evm-progress">
                {grade ? '' : L.gradeRequired}
              </span>
              <div className="evc-card-buttons">
                <button type="button" className="evc-btn is-ghost" onClick={() => onSave?.(toItems(), grade)} data-testid="evl-save">
                  {L.save}
                </button>
                <button
                  type="button"
                  className="evc-btn is-primary"
                  disabled={!grade}
                  onClick={() => onSubmit?.()}
                  data-testid="evl-submit"
                >
                  {L.submit}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
