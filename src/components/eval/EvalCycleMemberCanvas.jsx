import { useState, useMemo } from 'react';

/**
 * EvalCycleMemberCanvas — 멤버 셀프 리뷰 작성 화면.
 *
 * 업적(work_achievement) / 역량(competency, 1-5 점수) / 성장(growth: 강점·보완·성장입증)
 * 섹션을 작성해 임시저장·제출하는 순수 컴포넌트. answers(서버 저장본)로 폼을 시드하고
 * onSave(items)/onSubmit 로 상위에 위임. 제출 완료 상태면 읽기 전용.
 */

const DEFAULT_LABELS = {
  title: '셀프 리뷰',
  notActive: '셀프 리뷰 기간이 아닙니다',
  notActiveSub: '셀프 리뷰 단계가 시작되면 작성할 수 있습니다.',
  submittedBanner: '제출 완료 — 마감 전까지 다시 제출할 수 있습니다.',
  workTitle: '업적 (What)',
  workPlaceholder: '이번 기간의 핵심 성과와 결과를 기록하세요.',
  competencyTitle: '역량 (How)',
  competencyPlaceholder: '업무 수행 방식·협업·리더십 등 역량을 기록하세요.',
  scoreLabel: '자기 평가 점수',
  growthTitle: '강점 · 보완 · 성장',
  strengthsLabel: '강점',
  strengthsPlaceholder: '이번 기간 발휘한 강점을 기록하세요.',
  improvementsLabel: '보완점',
  improvementsPlaceholder: '앞으로 보완할 점을 기록하세요.',
  growthDemoLabel: '성장 입증',
  growthDemoPlaceholder: '지난 기간 대비 성장한 부분을 기록하세요.',
  save: '임시저장',
  submit: '제출하기',
  progress: '{{filled}}/{{total}} 작성됨',
  aiPolish: '✨ AI 다듬기',
  aiPolishing: '다듬는 중…',
  aiError: 'AI 다듬기에 실패했습니다. 작성 내용은 그대로 유지됩니다.',
};

const FIELDS = [
  { key: 'work', category: 'work_achievement', growthType: null, score: false, sectionKey: 'workTitle', labelKey: 'workTitle', phKey: 'workPlaceholder' },
  { key: 'comp', category: 'competency', growthType: null, score: true, sectionKey: 'competencyTitle', labelKey: 'competencyTitle', phKey: 'competencyPlaceholder' },
  { key: 'str', category: 'growth', growthType: 'strengths', score: false, sectionKey: 'growthTitle', labelKey: 'strengthsLabel', phKey: 'strengthsPlaceholder' },
  { key: 'imp', category: 'growth', growthType: 'improvements', score: false, sectionKey: 'growthTitle', labelKey: 'improvementsLabel', phKey: 'improvementsPlaceholder' },
  { key: 'gro', category: 'growth', growthType: 'growth_demonstrated', score: false, sectionKey: 'growthTitle', labelKey: 'growthDemoLabel', phKey: 'growthDemoPlaceholder' },
];

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
const fill = (s, vars) => {
  let out = s == null ? '' : String(s);
  for (const k of Object.keys(vars)) out = out.replace(`{{${k}}}`, vars[k]);
  return out;
};

function seedState(answers) {
  const state = {};
  for (const f of FIELDS) state[f.key] = { textAnswer: '', score: null };
  for (const a of answers ?? []) {
    const f = FIELDS.find(
      (x) => x.category === a.itemCategory && (x.growthType ?? null) === (a.growthType ?? null),
    );
    if (f) state[f.key] = { textAnswer: a.textAnswer ?? '', score: a.score ?? null };
  }
  return state;
}

export default function EvalCycleMemberCanvas({
  cycle,
  status,
  answers,
  active = true,
  labels: providedLabels,
  onSave,
  onSubmit,
  onAiPolish,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [state, setState] = useState(() => seedState(answers));
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState(false);
  const submitted = status === 'submitted';

  if (!active) {
    return (
      <div className="evc-root">
        <div className="evc-empty" data-testid="evm-not-active">
          <p className="evc-empty-title">{L.notActive}</p>
          <p className="evc-empty-sub">{L.notActiveSub}</p>
        </div>
      </div>
    );
  }

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

  const handleAiPolish = async () => {
    if (!onAiPolish) return;
    const items = FIELDS.map((f, i) => ({
      index: i,
      itemCategory: f.category,
      growthType: f.growthType,
      textAnswer: state[f.key].textAnswer,
    })).filter((it) => it.textAnswer.trim());
    if (items.length === 0) return;
    setAiError(false);
    setAiBusy(true);
    try {
      const polished = await onAiPolish(items);
      setState((prev) => {
        const next = { ...prev };
        for (const p of polished) {
          const f = FIELDS[p.index];
          if (f) next[f.key] = { ...next[f.key], textAnswer: p.textAnswer };
        }
        return next;
      });
    } catch {
      setAiError(true);
    } finally {
      setAiBusy(false);
    }
  };

  const filled = FIELDS.filter((f) => state[f.key].textAnswer.trim()).length;
  const canSubmit = filled === FIELDS.length;

  // 섹션 그룹핑 (growth 3필드는 한 카드)
  const sections = [
    { titleKey: 'workTitle', fields: FIELDS.filter((f) => f.key === 'work') },
    { titleKey: 'competencyTitle', fields: FIELDS.filter((f) => f.key === 'comp') },
    { titleKey: 'growthTitle', fields: FIELDS.filter((f) => f.category === 'growth') },
  ];

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          {cycle?.name && <p className="evc-summary">{cycle.name}</p>}
        </div>
      </header>

      {submitted && (
        <div className="evc-list">
          <p className="evx-notice" data-testid="evm-submitted">{L.submittedBanner}</p>
        </div>
      )}

      <div className="evc-list">
        {sections.map((sec) => (
          <section className="evc-card" key={sec.titleKey} data-testid={`evm-section-${sec.titleKey}`}>
            <h3 className="evc-card-name">{L[sec.titleKey]}</h3>
            {sec.fields.map((f) => (
              <div className="evm-field" key={f.key}>
                {sec.fields.length > 1 && (
                  <span className="evc-field-label">{L[f.labelKey]}</span>
                )}
                <textarea
                  className="evm-textarea"
                  rows={4}
                  value={state[f.key].textAnswer}
                  placeholder={L[f.phKey]}
                  disabled={submitted}
                  onChange={(e) => setField(f.key, { textAnswer: e.target.value })}
                  data-testid={`evm-text-${f.key}`}
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
                          data-testid={`evm-score-${f.key}-${n}`}
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
      </div>

      {!submitted && aiError && (
        <div className="evc-list">
          <p className="evx-notice" data-testid="evm-ai-error" style={{ background: 'var(--utility-error-50)', color: 'var(--utility-error-500)' }}>
            {L.aiError}
          </p>
        </div>
      )}

      {!submitted && (
        <div className="evm-submit-bar">
          <span className="evm-progress">
            {fill(L.progress, { filled, total: FIELDS.length })}
          </span>
          <div className="evc-card-buttons">
            {onAiPolish && (
              <button type="button" className="evc-btn is-ghost" disabled={aiBusy} onClick={handleAiPolish} data-testid="evm-ai-polish">
                {aiBusy ? L.aiPolishing : L.aiPolish}
              </button>
            )}
            <button type="button" className="evc-btn is-ghost" onClick={() => onSave?.(toItems())} data-testid="evm-save">
              {L.save}
            </button>
            <button
              type="button"
              className="evc-btn is-primary"
              disabled={!canSubmit}
              onClick={() => onSubmit?.(toItems())}
              data-testid="evm-submit"
            >
              {L.submit}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
