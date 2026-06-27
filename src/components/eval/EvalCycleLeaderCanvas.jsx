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
  // F5 evidence + assessment
  peerEvidenceTitle: '동료 피드백 요약 (익명)',
  peerEvidenceEmpty: '제출된 동료 피드백이 없습니다.',
  historyTitle: '과거 등급 추이',
  historyEmpty: '등급 변경 이력이 없습니다.',
  assessmentTitle: '승진 · 보상 · 비밀 코멘트',
  confidentialLabel: '비밀 코멘트 (위원회 전용)',
  confidentialPh: '캘리브레이션 위원회만 열람합니다.',
  promotionLabel: '승진 고려 대상',
  compLabel: '보상 메모',
  compPh: '보상 조정 의견',
  saveAssessment: '부가 평가 저장',
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
  peerAnswers = [],
  gradeHistory = [],
  assessment = null,
  gradeKey: initialGrade = null,
  gradeOptions = DEFAULT_GRADES,
  gradeLabels = {},
  submitted = false,
  labels: providedLabels,
  onSave,
  onSubmit,
  onSaveAssessment,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [state, setState] = useState(() => seedState(leaderAnswers));
  const [grade, setGrade] = useState(initialGrade);
  const [confidentialComment, setConfidentialComment] = useState(assessment?.confidentialComment ?? '');
  const [promotionReady, setPromotionReady] = useState(assessment?.promotionReady ?? false);
  const [compensationNote, setCompensationNote] = useState(assessment?.compensationNote ?? '');

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

          <h3 className="evc-card-name" style={{ marginTop: 'var(--spacing-xl, 16px)' }}>{L.peerEvidenceTitle}</h3>
          {peerAnswers.length === 0 ? (
            <p className="evc-empty-sub" data-testid="evl-peer-empty">{L.peerEvidenceEmpty}</p>
          ) : (
            peerAnswers.map((a) => (
              <div className="evl-evi-item" key={a.id} data-testid="evl-peer-item">
                <span className="evc-field-label">{evidenceLabel(a, L)}</span>
                <p className="evl-evi-text">{a.textAnswer}</p>
              </div>
            ))
          )}

          <h3 className="evc-card-name" style={{ marginTop: 'var(--spacing-xl, 16px)' }}>{L.historyTitle}</h3>
          {gradeHistory.length === 0 ? (
            <p className="evc-empty-sub" data-testid="evl-history-empty">{L.historyEmpty}</p>
          ) : (
            <ul className="evl-history" data-testid="evl-history">
              {gradeHistory.map((h, i) => (
                <li key={i} className="evl-evi-text">
                  {(h.fromGradeKey ? (gradeLabels[h.fromGradeKey] ?? h.fromGradeKey) : '—')}
                  {' → '}
                  {gradeLabels[h.toGradeKey] ?? h.toGradeKey}
                </li>
              ))}
            </ul>
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

          {/* F5 승진·보상·비밀 코멘트 */}
          <section className="evc-card" data-testid="evl-assessment">
            <h3 className="evc-card-name">{L.assessmentTitle}</h3>
            <div className="evm-field">
              <span className="evc-field-label">{L.confidentialLabel}</span>
              <textarea
                className="evm-textarea"
                rows={2}
                value={confidentialComment}
                placeholder={L.confidentialPh}
                onChange={(e) => setConfidentialComment(e.target.value)}
                data-testid="evl-confidential"
              />
            </div>
            <label className="evl-promo-row">
              <input
                type="checkbox"
                checked={promotionReady}
                onChange={(e) => setPromotionReady(e.target.checked)}
                data-testid="evl-promotion"
              />
              <span>{L.promotionLabel}</span>
            </label>
            <div className="evm-field">
              <span className="evc-field-label">{L.compLabel}</span>
              <textarea
                className="evm-textarea"
                rows={2}
                value={compensationNote}
                placeholder={L.compPh}
                onChange={(e) => setCompensationNote(e.target.value)}
                data-testid="evl-comp"
              />
            </div>
            <div className="evc-card-buttons">
              <button
                type="button"
                className="evc-btn is-ghost"
                onClick={() =>
                  onSaveAssessment?.({
                    confidentialComment,
                    promotionReady,
                    compensationNote,
                  })
                }
                data-testid="evl-save-assessment"
              >
                {L.saveAssessment}
              </button>
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
