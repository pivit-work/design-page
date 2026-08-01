import { useState, useMemo, useRef, useEffect } from 'react';
import { FieldInfo, FieldVisibility } from './evalFieldMeta.jsx';
import {
  TrendIcon,
  TargetIcon,
  ChatIcon,
  NoteIcon,
  UsersIcon,
  SparkleIcon,
  AlertIcon,
  CheckCircleIcon,
} from './evalIcons.jsx';

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
  // §4.2 활동 요약 박스
  actTitle: '아래 정보는 작성 참고용입니다 — 리뷰 기간 활동 요약',
  actSub: '셀프 리뷰 작성 전 아래 내용을 참고하세요. 잘 기억나지 않는 성과를 확인하고 정리해보세요.',
  actOneOnOne: '1:1 미팅',
  actFeedback: '받은 피드백',
  actSnippets: '스니핏 하이라이트',
  // §4.2.1 OKR KR 달성률 수기입력
  actKrTitle: 'OKR 달성 현황 — KR별 달성률을 직접 입력하세요',
  actKrHint: 'AI 자동 산출은 제공하지 않습니다 · 매니저 화면에 실시간 반영',
  actKrMemoPlaceholder: '달성 근거를 간략히 메모하세요 (선택)',
  actKrSave: '달성률 저장',
  actKrSaved: '저장되었습니다',
  actKrEmpty: '이 기간에 입력할 개인 KR이 없습니다.',
  // TC-140 달성률 미입력 경고(제출은 가능)
  actKrUnfilledWarn: '달성률 미입력 KR {{count}}개 — 제출 전 입력을 권장합니다(제출은 가능).',
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
  incompleteWarn: '미입력 항목이 있습니다. 빨간 항목을 작성해주세요.',
  // TC-135 자동저장 상태 표시
  autoSaving: '자동 저장 중…',
  autoSaved: '자동 저장됨 · {{time}}',
  saveError: '저장에 실패했습니다. 작성 내용은 유지되며, 잠시 후 다시 시도됩니다.',
  aiPolish: 'AI 다듬기',
  aiPolishing: '다듬는 중…',
  aiError: 'AI 다듬기에 실패했습니다. 작성 내용은 그대로 유지됩니다.',
  // TC-012 지난 사이클 평가 이력
  historyTitle: '내 평가 이력',
  historySub: '지난 사이클에서 받은 최종 등급입니다. 이번 자기평가 작성에 참고하세요.',
  historyEmpty: '지난 평가 이력이 아직 없습니다.',
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
          description: it.description ?? null,
          visibleToRoles: it.visibleToRoles ?? null,
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
    description: null,
    visibleToRoles: null,
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

// §4.2.1 KR 입력 폼 시드 — krProgress 항목별 {percent, note}.
function seedKrState(krList) {
  const state = {};
  for (const kr of krList) {
    state[kr.id] = {
      percent: kr.percent == null ? '' : String(kr.percent),
      note: kr.note ?? '',
    };
  }
  return state;
}

export default function EvalCycleMemberCanvas({
  cycle,
  status,
  answers,
  template = null,
  active = true,
  activitySummary = null,
  krProgress = null,
  // TC-012 지난 사이클 본인 최종 등급 이력(최신순). [{cycleId,cycleName,endDate,gradeKey,gradeLabel,gradeScore}]
  evaluationHistory = null,
  labels: providedLabels,
  onSave,
  onSubmit,
  onAiPolish,
  onKrProgressSave,
  // TC-053 동료 리뷰 등 타인 평가 시 항목별 공개 대상 안내 노출(셀프는 미노출)
  showVisibility = false,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const fields = useMemo(() => buildFields(template, L), [template, L]);
  const [state, setState] = useState(() => seedState(answers, fields));
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState(false);
  const submitted = status === 'submitted';

  // §4.2.1 KR 달성률 입력 — krProgress(부모 로드본)로 시드, 편집 중엔 유지.
  const krList = useMemo(
    () => (Array.isArray(krProgress) ? krProgress : krProgress ? [krProgress] : []),
    [krProgress],
  );
  const [krState, setKrState] = useState(() => seedKrState(krList));
  const [krSeededFor, setKrSeededFor] = useState(krList);
  if (krSeededFor !== krList) {
    setKrSeededFor(krList);
    setKrState(seedKrState(krList));
  }
  const [krBusy, setKrBusy] = useState(false);
  const [krSaved, setKrSaved] = useState(false);
  // TC-140: 달성률 미입력 KR 개수(제출은 허용, 경고만 노출).
  const krUnfilledCount = krList.filter((kr) => {
    const p = krState[kr.id]?.percent;
    return p == null || String(p).trim() === '';
  }).length;
  // TC-063/134: 제출 시 미입력 항목 자동 스크롤·빨강 강조용 훅(early-return 앞에 선언).
  const fieldRefs = useRef({});
  const [triedSubmit, setTriedSubmit] = useState(false);
  // TC-135: 30초 자동저장 — 사용자 편집 후 디바운스로 onSave 호출(early-return 앞 선언).
  const dirtyRef = useRef(false);
  const [autoSavedAt, setAutoSavedAt] = useState(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [saveError, setSaveError] = useState(false); // TC-136 저장 실패 배너
  useEffect(() => {
    // 제출 완료·저장 콜백 없음·사용자 편집 없음이면 자동저장 안 함.
    if (submitted || !onSave || !dirtyRef.current) return undefined;
    const timer = setTimeout(() => {
      const items = fields
        .filter(
          (f) => state[f.key].textAnswer.trim() || state[f.key].score != null,
        )
        .map((f) => ({
          templateItemId: f.templateItemId,
          itemCategory: f.category,
          growthType: f.growthType,
          textAnswer: state[f.key].textAnswer,
          score: state[f.key].score,
          rationale: state[f.key].rationale || null,
        }));
      setAutoSaving(true);
      Promise.resolve(onSave(items))
        .then(() => {
          dirtyRef.current = false;
          setAutoSavedAt(new Date());
          setSaveError(false);
        })
        .catch(() => {
          // TC-136 자동저장 실패 → 배너로 알림(dirty 유지해 다음 편집 때 재시도)
          setSaveError(true);
        })
        .finally(() => setAutoSaving(false));
    }, 30000);
    return () => clearTimeout(timer);
  }, [state, submitted, onSave, fields]);

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

  const setField = (key, patch) => {
    dirtyRef.current = true; // TC-135 사용자 편집 표시 → 자동저장 트리거
    setState((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const setKrField = (id, patch) =>
    setKrState((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const clampPct = (raw) => {
    const n = Math.round(Number(raw));
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  };

  const handleKrSave = async () => {
    if (!onKrProgressSave) return;
    const inputs = krList.map((kr) => ({
      krId: kr.id,
      achievePct: clampPct(krState[kr.id]?.percent),
      note: (krState[kr.id]?.note ?? '').trim(),
    }));
    setKrBusy(true);
    try {
      await onKrProgressSave(inputs);
      setKrSaved(true);
    } finally {
      setKrBusy(false);
    }
  };

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

  // TC-063/134: 제출 시 미입력 항목 자동 스크롤·빨강 강조(훅은 위에서 선언).
  const isIncomplete = (f) => {
    if (f.type === 'rating')
      return (
        state[f.key].score == null ||
        (f.requiresRationale && !state[f.key].rationale.trim())
      );
    if (f.type === 'checkbox') return false;
    return !state[f.key].textAnswer.trim();
  };
  const handleSubmitClick = () => {
    const inc = fields.find(isIncomplete);
    if (inc) {
      setTriedSubmit(true);
      fieldRefs.current[inc.key]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return;
    }
    onSubmit?.(toItems());
  };

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

      {/* TC-012 지난 사이클 본인 최종 등급 이력 — 읽기전용 참고(제출 후에도 노출). 이력 있을 때만 */}
      {Array.isArray(evaluationHistory) && evaluationHistory.length > 0 && (
       <div className="evc-list">
        <section className="evm-history" data-testid="evm-history">
          <div className="evm-history-head">
            <div className="evm-history-title">
              <TrendIcon size={15} />
              <span>{L.historyTitle}</span>
            </div>
            <div className="evm-history-sub">{L.historySub}</div>
          </div>
          <div className="evm-history-rows">
            {evaluationHistory.map((h) => (
              <div
                className="evm-history-row"
                key={h.cycleId}
                data-testid={`evm-history-${h.cycleId}`}
              >
                <span className="evm-history-cycle">{h.cycleName}</span>
                <span className="evm-history-grade">{h.gradeLabel}</span>
                {h.endDate && (
                  <span className="evm-history-date">
                    {String(h.endDate).slice(0, 7).replace('-', '.')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
       </div>
      )}

      {/* §4.2 활동 요약 박스 — 작성 참고용(리뷰 기간 활동 집계). 데이터 있는 블록만 노출 */}
      {/* §4.2.1 KR 달성률 수기입력 — 참고 영역과 같은 오렌지 박스에 full-width 로 노출 */}
      {!submitted && (activitySummary || krList.length > 0) && (() => {
        const blocks = activitySummary
          ? [
              { key: 'oneOnOne', icon: <UsersIcon size={14} />, label: L.actOneOnOne, items: activitySummary.oneOnOne },
              { key: 'feedback', icon: <ChatIcon size={14} />, label: L.actFeedback, items: activitySummary.receivedFeedback },
              { key: 'snippets', icon: <NoteIcon size={14} />, label: L.actSnippets, items: activitySummary.snippets },
            ].filter((b) => Array.isArray(b.items) && b.items.length > 0)
          : [];
        if (blocks.length === 0 && krList.length === 0) return null;
        return (
          <div className="evc-list">
            <section className="evm-activity" data-testid="evm-activity">
              <div className="evm-activity-head">
                <div className="evm-activity-title">{L.actTitle}</div>
                <div className="evm-activity-sub">{L.actSub}</div>
              </div>
              <div className="evm-activity-grid">
                {blocks.map((b) => (
                  <div className="evm-activity-block" key={b.key} data-testid={`evm-activity-${b.key}`}>
                    <div className="evm-activity-block-title">{b.icon}<span>{b.label}</span></div>
                    {b.items.map((item, i) => (
                      <div className="evm-activity-item" key={i}>· {item}</div>
                    ))}
                  </div>
                ))}
                {krList.length > 0 && (
                  <div className="evm-activity-block evm-kr" data-testid="evm-kr">
                    <div className="evm-kr-head">
                      <div className="evm-activity-block-title">
                        <TargetIcon size={14} />
                        <span>{L.actKrTitle}</span>
                      </div>
                      <div className="evm-kr-hint">{L.actKrHint}</div>
                    </div>
                    <div className="evm-kr-rows">
                      {krList.map((kr, idx) => (
                        <div className="evm-kr-row" key={kr.id} data-testid={`evm-kr-row-${kr.id}`}>
                          <span className="evm-kr-idx">KR{idx + 1}</span>
                          <span className="evm-kr-title">{kr.title}</span>
                          <div className="evm-kr-pct">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              className="evm-kr-input"
                              value={krState[kr.id]?.percent ?? ''}
                              onChange={(e) => {
                                setKrSaved(false);
                                setKrField(kr.id, { percent: e.target.value });
                              }}
                              onBlur={(e) => {
                                const v = e.target.value === '' ? '' : String(clampPct(e.target.value));
                                setKrField(kr.id, { percent: v });
                              }}
                              data-testid={`evm-kr-pct-${kr.id}`}
                            />
                            <span className="evm-kr-pct-sign">%</span>
                          </div>
                          <input
                            type="text"
                            className="evm-kr-memo"
                            maxLength={200}
                            placeholder={L.actKrMemoPlaceholder}
                            value={krState[kr.id]?.note ?? ''}
                            onChange={(e) => {
                              setKrSaved(false);
                              setKrField(kr.id, { note: e.target.value });
                            }}
                            data-testid={`evm-kr-memo-${kr.id}`}
                          />
                        </div>
                      ))}
                    </div>
                    {krUnfilledCount > 0 && (
                      <div
                        className="evm-kr-warn"
                        data-testid="evm-kr-unfilled-warn"
                      >
                        <AlertIcon size={14} />
                        <span>{fill(L.actKrUnfilledWarn, { count: krUnfilledCount })}</span>
                      </div>
                    )}
                    <div className="evm-kr-actions">
                      {krSaved && (
                        <span className="evm-kr-saved" data-testid="evm-kr-saved">
                          <CheckCircleIcon size={13} />
                          <span>{L.actKrSaved}</span>
                        </span>
                      )}
                      <button
                        type="button"
                        className="evm-kr-save"
                        disabled={krBusy}
                        onClick={handleKrSave}
                        data-testid="evm-kr-save"
                      >
                        {L.actKrSave}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        );
      })()}

      {submitted && (
        <div className="evc-list">
          <p className="evx-notice is-success" data-testid="evm-submitted">
            <CheckCircleIcon size={16} />
            <span>{L.submittedBanner}</span>
          </p>
        </div>
      )}

      <div className="evc-list">
        {sections.map((sec) => (
          <section className="evc-card" key={sec.title} data-testid={`evm-section-${sec.title}`}>
            <h3 className="evc-card-name">{sec.title}</h3>
            {sec.fields.map((f) => (
              <div
                className="evm-field"
                key={f.key}
                ref={(el) => {
                  fieldRefs.current[f.key] = el;
                }}
              >
                {(sec.fields.length > 1 || f.description) && (
                  <span className="evc-field-label">
                    {f.label}
                    <FieldInfo description={f.description} />
                  </span>
                )}
                {f.type === 'rating' ? (
                  <>
                    <div className="evm-score-row">
                      <span className="evc-field-label">{L.scoreLabel}</span>
                      <div
                        className={`evm-score-btns${triedSubmit && state[f.key].score == null ? ' is-invalid' : ''}`}
                      >
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
                        className={`evm-textarea${!submitted && state[f.key].score && !state[f.key].rationale.trim() ? ' is-empty' : ''}${triedSubmit && isIncomplete(f) ? ' is-invalid' : ''}`}
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
                    className={`evm-textarea${!submitted && !state[f.key].textAnswer.trim() ? ' is-empty' : ''}${triedSubmit && isIncomplete(f) ? ' is-invalid' : ''}`}
                    rows={4}
                    value={state[f.key].textAnswer}
                    placeholder={f.placeholder}
                    disabled={submitted}
                    onChange={(e) => setField(f.key, { textAnswer: e.target.value })}
                    data-testid={`evm-text-${f.key}`}
                  />
                )}
                {showVisibility && (
                  <FieldVisibility
                    visibleToRoles={f.visibleToRoles}
                    labels={L}
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

      {!submitted && saveError && (
        <div className="evm-save-error" role="alert" data-testid="evm-save-error">
          {L.saveError}
        </div>
      )}
      {!submitted && (
        <div className="evm-submit-bar">
          <span className="evm-progress">
            {triedSubmit && !canSubmit ? (
              <span className="evm-incomplete-warn" data-testid="evm-incomplete-warn">
                {L.incompleteWarn}
              </span>
            ) : (
              fill(L.progress, { filled, total: textFields.length })
            )}
          </span>
          {(autoSaving || autoSavedAt) && (
            <span className="evm-autosave" data-testid="evm-autosave">
              {autoSaving
                ? L.autoSaving
                : fill(L.autoSaved, {
                    time: autoSavedAt.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  })}
            </span>
          )}
          <div className="evc-card-buttons">
            {onAiPolish && (
              <button type="button" className="evc-btn is-ghost" disabled={aiBusy} onClick={handleAiPolish} data-testid="evm-ai-polish">
                {!aiBusy && <SparkleIcon size={15} />}
                {aiBusy ? L.aiPolishing : L.aiPolish}
              </button>
            )}
            <button
              type="button"
              className="evc-btn is-ghost"
              onClick={() =>
                Promise.resolve(onSave?.(toItems()))
                  .then(() => {
                    dirtyRef.current = false;
                    setAutoSavedAt(new Date());
                    setSaveError(false);
                  })
                  .catch(() => setSaveError(true))
              }
              data-testid="evm-save"
            >
              {L.save}
            </button>
            <button
              type="button"
              className="evc-btn is-primary"
              onClick={handleSubmitClick}
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
