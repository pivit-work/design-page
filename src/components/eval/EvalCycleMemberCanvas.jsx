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
  rationalePlaceholder: '점수 근거를 서술하세요.',
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

// 템플릿 미지정 사이클용 기본 폼(back-compat).
const DEFAULT_FIELDS = [
  { key: 'work', category: 'work_achievement', growthType: null, score: false, sectionKey: 'workTitle', labelKey: 'workTitle', phKey: 'workPlaceholder' },
  { key: 'comp', category: 'competency', growthType: null, score: true, sectionKey: 'competencyTitle', labelKey: 'competencyTitle', phKey: 'competencyPlaceholder' },
  { key: 'str', category: 'growth', growthType: 'strengths', score: false, sectionKey: 'growthTitle', labelKey: 'strengthsLabel', phKey: 'strengthsPlaceholder' },
  { key: 'imp', category: 'growth', growthType: 'improvements', score: false, sectionKey: 'growthTitle', labelKey: 'improvementsLabel', phKey: 'improvementsPlaceholder' },
  { key: 'gro', category: 'growth', growthType: 'growth_demonstrated', score: false, sectionKey: 'growthTitle', labelKey: 'growthDemoLabel', phKey: 'growthDemoPlaceholder' },
];

// 셀프 응답 폼 필드 도출 — 템플릿(eval_templates) 있으면 항목에서 동적 생성,
// 없으면 기본 폼. 시안 buildSelfTemplate: '최종 등급 결정' 제외, grade→textarea(피평가자).
function buildFields(template, L) {
  if (template && Array.isArray(template.items) && template.items.length) {
    return template.items
      .filter((it) => it.category !== '최종 등급 결정')
      .map((it) => {
        // eval_template_items.responseType: text/scale/grade/checkbox → 폼 입력 유형.
        // 시안: 피평가자는 grade 부여 대신 코멘트 → textarea.
        const type =
          it.responseType === 'scale'
            ? 'rating'
            : it.responseType === 'checkbox'
              ? 'checkbox'
              : 'textarea';
        return {
          key: it.id,
          templateItemId: it.id,
          category: it.category,
          growthType: null,
          type,
          label: it.label,
          placeholder: it.label,
          section: it.category || '평가 항목',
          requiresRationale: !!it.requiresRationale,
          score: type === 'rating',
        };
      });
  }
  return DEFAULT_FIELDS.map((f) => ({
    key: f.key,
    templateItemId: null,
    category: f.category,
    growthType: f.growthType,
    type: f.score ? 'rating' : 'textarea',
    label: L[f.labelKey],
    placeholder: L[f.phKey],
    section: L[f.sectionKey],
    requiresRationale: false,
    score: f.score,
  }));
}

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

function seedState(answers, fields) {
  const state = {};
  for (const f of fields) state[f.key] = { textAnswer: '', score: null, rationale: '' };
  for (const a of answers ?? []) {
    const f = fields.find((x) =>
      x.templateItemId
        ? x.templateItemId === a.templateItemId
        : x.category === a.itemCategory && (x.growthType ?? null) === (a.growthType ?? null),
    );
    if (f) {
      state[f.key] = {
        textAnswer: a.textAnswer ?? '',
        score: a.score ?? null,
        rationale: a.rationale ?? '',
      };
    }
  }
  return state;
}

export default function EvalCycleMemberCanvas({
  cycle,
  status,
  answers,
  template = null,
  active = true,
  labels: providedLabels,
  onSave,
  onSubmit,
  onAiPolish,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const fields = useMemo(() => buildFields(template, L), [template, L]);
  const [state, setState] = useState(() => seedState(answers, fields));
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState(false);
  const submitted = status === 'submitted';

  // 템플릿/답변이 나중에 도착하면(async 로드) 재시드. fields 는 useMemo,
  // answers 는 부모 ref 라 편집 중엔 안 바뀌고 로드·저장 시점에만 재시드된다.
  // effect-setState 대신 during-render 리셋(React 공식 "adjust state during render")로
  // fields/answers 참조 변경 시에만 재시드 — 편집 중에는 유지.
  const [seededFor, setSeededFor] = useState({ fields, answers });
  if (seededFor.fields !== fields || seededFor.answers !== answers) {
    setSeededFor({ fields, answers });
    setState(seedState(answers, fields));
  }

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
    fields
      .filter((f) => state[f.key].textAnswer.trim() || state[f.key].score != null)
      .map((f) => ({
        templateItemId: f.templateItemId,
        itemCategory: f.category,
        growthType: f.growthType,
        textAnswer: state[f.key].textAnswer,
        score: state[f.key].score,
        rationale: state[f.key].rationale || null,
      }));

  const handleAiPolish = async () => {
    if (!onAiPolish) return;
    const items = fields
      .map((f, i) => ({
        index: i,
        itemCategory: f.category,
        growthType: f.growthType,
        textAnswer: state[f.key].textAnswer,
      }))
      .filter((it) => it.textAnswer.trim());
    if (items.length === 0) return;
    setAiError(false);
    setAiBusy(true);
    try {
      const polished = await onAiPolish(items);
      setState((prev) => {
        const next = { ...prev };
        for (const p of polished) {
          const f = fields[p.index];
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

  // 텍스트 항목만 필수 채움 판정(척도는 점수로). requiresRationale 은 사유도 필요.
  const textFields = fields.filter((f) => f.type !== 'rating');
  const filled = textFields.filter((f) => state[f.key].textAnswer.trim()).length;
  const ratingOk = fields
    .filter((f) => f.type === 'rating')
    .every((f) => state[f.key].score != null && (!f.requiresRationale || state[f.key].rationale.trim()));
  const canSubmit = filled === textFields.length && ratingOk;

  // 섹션(section) 별 그룹핑 — 등장 순서 유지.
  const sections = [];
  fields.forEach((f) => {
    let g = sections.find((s) => s.title === f.section);
    if (!g) {
      g = { title: f.section, fields: [] };
      sections.push(g);
    }
    g.fields.push(f);
  });

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
          <section className="evc-card" key={sec.title} data-testid={`evm-section-${sec.title}`}>
            <h3 className="evc-card-name">{sec.title}</h3>
            {sec.fields.map((f) => (
              <div className="evm-field" key={f.key}>
                {sec.fields.length > 1 && (
                  <span className="evc-field-label">{f.label}</span>
                )}
                {f.type === 'rating' ? (
                  <>
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
                    {f.requiresRationale && (
                      <textarea
                        className={`evm-textarea${!submitted && state[f.key].score && !state[f.key].rationale.trim() ? ' is-empty' : ''}`}
                        rows={2}
                        value={state[f.key].rationale}
                        placeholder={L.rationalePlaceholder}
                        disabled={submitted}
                        onChange={(e) => setField(f.key, { rationale: e.target.value })}
                        data-testid={`evm-rationale-${f.key}`}
                      />
                    )}
                  </>
                ) : f.type === 'checkbox' ? (
                  <label className="evl-promo-row">
                    <input
                      type="checkbox"
                      checked={state[f.key].score === 1}
                      disabled={submitted}
                      onChange={(e) => setField(f.key, { score: e.target.checked ? 1 : 0 })}
                      data-testid={`evm-check-${f.key}`}
                    />
                    <span>{f.label}</span>
                  </label>
                ) : (
                  <textarea
                    className={`evm-textarea${!submitted && !state[f.key].textAnswer.trim() ? ' is-empty' : ''}`}
                    rows={4}
                    value={state[f.key].textAnswer}
                    placeholder={f.placeholder}
                    disabled={submitted}
                    onChange={(e) => setField(f.key, { textAnswer: e.target.value })}
                    data-testid={`evm-text-${f.key}`}
                  />
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
            {fill(L.progress, { filled, total: textFields.length })}
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
