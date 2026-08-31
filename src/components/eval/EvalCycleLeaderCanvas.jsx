import { useState, useMemo, useRef } from 'react';
import { FieldInfo, FieldVisibility } from './evalFieldMeta.jsx';
import { AlertIcon, ZapIcon } from './evalIcons.jsx';

/**
 * EvalCycleLeaderCanvas — 매니저 하향 리뷰 (근거↔작성 2단 패널).
 *
 * 좌: 근거 데이터(피평가자 셀프 리뷰). 우: 하향 리뷰 작성(업적/역량+점수/성장) + 최종 등급.
 * selfAnswers/leaderAnswers/gradeKey 로 시드, onSave(items,gradeKey)/onSubmit 위임.
 */

const DEFAULT_LABELS = {
  title: '하향 리뷰',
  notActive: '진행 중인 하향 리뷰가 없습니다',
  notActiveSub: '동료 리뷰 단계가 시작되면 이곳에서 팀원 평가를 작성할 수 있습니다.',
  evidenceTitle: '근거 · 셀프 리뷰',
  evidenceEmpty: '피평가자가 아직 셀프 리뷰를 작성하지 않았습니다.',
  // TC-149 셀프 미제출 안내(작성은 허용 — 게이팅 아님)
  selfNotSubmitted:
    '피평가자가 아직 셀프 리뷰를 제출하지 않았습니다. 셀프 리뷰 참고 없이 작성하실 수 있습니다.',
  submittedBanner: '제출이 완료되었습니다.',
  workTitle: '업적 (What)',
  workPlaceholder: '업적에 대한 평가를 작성하세요.',
  competencyTitle: '역량 (How)',
  competencyPlaceholder: '역량에 대한 평가를 작성하세요.',
  scoreLabel: '평가 점수',
  rationalePlaceholder: '점수 근거를 서술하세요.',
  rationaleOptionalPlaceholder: '점수 근거를 서술하세요. (선택)',
  growthTitle: '강점 · 보완 · 성장',
  strengthsLabel: '강점',
  strengthsPlaceholder: '강점을 작성하세요.',
  improvementsLabel: '보완점',
  improvementsPlaceholder: '보완점을 작성하세요.',
  growthDemoLabel: '성장 기대',
  growthDemoPlaceholder: '성장 기대를 작성하세요.',
  gradeTitle: '최종 등급',
  gradeRequired: '제출하려면 최종 등급을 선택하세요.',
  // PW-486 캘리브레이션을 끈 사이클 — 조정 단계가 없다는 사실을 채점 «전에» 알린다.
  // 「뒤에서 조정된다」고 믿고 매긴 등급과 「이게 최종」임을 알고 매긴 등급은 다르다.
  calibOffGradeNote:
    '이 사이클은 캘리브레이션을 사용하지 않습니다 — 지금 고른 등급이 그대로 최종 등급이 됩니다.',
  calibOffSubmittedNote: '제출한 등급이 최종 등급으로 확정되었습니다.',
  rationaleRequired: '사유가 입력되지 않은 항목이 있습니다.',
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
  // TC-046/047 상단고정(Freeze) 안내
  freezeNote: '헤더 프리즈 중 — 스크롤해도 상단 고정',
  assessmentTitle: '승진 · 보상 · 비밀 코멘트',
  // TC-054 상위(위원회) 전용 섹션 배지 — 피평가자에게 노출되지 않음을 명시
  committeeOnlyBadge: '상위 전용',
  committeeOnlyHint: '이 섹션은 캘리브레이션 위원회만 열람하며, 피평가자에게는 공개되지 않습니다.',
  confidentialLabel: '비밀 코멘트 (위원회 전용)',
  confidentialPh: '캘리브레이션 위원회만 열람합니다.',
  promotionLabel: '승진 고려 대상',
  // TC-098 승진 요청서 4항목
  promoReqHistory: '① 평가 이력 요약 (과거 등급·성과)',
  promoReqBackground: '② 검토 배경·필요성',
  promoReqExamples: '③ 상위 레벨 역할 수행 사례',
  promoReqNotes: '④ 추가 사항',
  promoReqSubmit: '승진 요청서 제출',
  promoReqSaved: '제출됨',
  // TC-055 승진 사유 작성 가이드
  promotionGuide:
    '승진 고려로 표시하면 위원회 검토 대상이 됩니다. 비밀 코멘트에 근거(성과·역량·기여)를 함께 남겨주세요.',
  compLabel: '보상 메모',
  compPh: '보상 조정 의견',
  saveAssessment: '부가 평가 저장',
};

const DEFAULT_GRADES = [
  { key: 'exceeds', label: '탁월' },
  { key: 'meets', label: '충족' },
  { key: 'below', label: '미흡' },
];

// 템플릿 미지정 사이클용 기본 폼(back-compat).
const DEFAULT_FIELDS = [
  { key: 'work', category: 'work_achievement', growthType: null, score: false, labelKey: 'workTitle', phKey: 'workPlaceholder', single: true },
  { key: 'comp', category: 'competency', growthType: null, score: true, labelKey: 'competencyTitle', phKey: 'competencyPlaceholder', single: true },
  { key: 'str', category: 'growth', growthType: 'strengths', score: false, labelKey: 'strengthsLabel', phKey: 'strengthsPlaceholder', single: false },
  { key: 'imp', category: 'growth', growthType: 'improvements', score: false, labelKey: 'improvementsLabel', phKey: 'improvementsPlaceholder', single: false },
  { key: 'gro', category: 'growth', growthType: 'growth_demonstrated', score: false, labelKey: 'growthDemoLabel', phKey: 'growthDemoPlaceholder', single: false },
];

// 하향(leader) 응답 폼 필드 도출 — 셀프와 동일 규칙. '최종 등급 결정' 섹션은
// 별도 등급/평가 UI 가 처리하므로 제외. 유형별 렌더는 responseType 로 결정.
function buildFields(template, L) {
  if (template && Array.isArray(template.items) && template.items.length) {
    return template.items
      .filter((it) => it.category !== '최종 등급 결정')
      .map((it) => {
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
          // PW-433 ①③ — 척도 길이·앵커·선택지는 항목이 들고 온다.
          scaleMax: it.scaleMax ?? null,
          scaleAnchorMin: it.scaleAnchorMin ?? null,
          scaleAnchorMax: it.scaleAnchorMax ?? null,
          options: it.options ?? null,
          allowMultiple: !!it.allowMultiple,
        };
      });
  }
  const sectionKeyByCat = {
    work_achievement: 'workTitle',
    competency: 'competencyTitle',
    growth: 'growthTitle',
  };
  return DEFAULT_FIELDS.map((f) => ({
    key: f.key,
    templateItemId: null,
    category: f.category,
    growthType: f.growthType,
    type: f.score ? 'rating' : 'textarea',
    label: L[f.labelKey],
    placeholder: L[f.phKey],
    section: L[sectionKeyByCat[f.category] || 'workTitle'],
    requiresRationale: false,
    score: f.score,
    scaleMax: null,
    scaleAnchorMin: null,
    scaleAnchorMax: null,
    options: null,
    allowMultiple: false,
  }));
}

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

/* ── PW-433 항목 단위 설정을 읽는 쪽. 설정이 없으면 예전과 같이 5점·제목 1개 체크. */
const DEFAULT_SCALE_MAX = 5;
const scaleMaxOf = (f) => f?.scaleMax || DEFAULT_SCALE_MAX;
const filledOptions = (f) => (f?.options || []).filter((o) => o.label?.trim());
const selectedOptions = (v) => v?.checkedOptions?.selected ?? [];
const toggleOption = (cur, oid, allowMultiple) => {
  if (!allowMultiple) return cur.includes(oid) ? [] : [oid];
  return cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid];
};

function seedState(answers, fields) {
  const state = {};
  for (const f of fields)
    state[f.key] = { textAnswer: '', score: null, rationale: '', checkedOptions: null };
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
        checkedOptions: a.checkedOptions ?? null,
      };
    }
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
  template = null,
  active = true,
  submitted = false,
  /**
   * PW-486 — 이 사이클이 캘리브레이션(등급 조정) 단계를 쓰는가.
   * 판정 축은 `eval_cycles.review_sequence.enabled.calibration` 이고, **값이 없으면 켠 것**
   * 이다(호출부가 그렇게 넘긴다). 기본 `true` 라 켠 사이클의 렌더는 종전과 동일하다.
   */
  calibrationEnabled = true,
  // TC-149 피평가자 셀프 미제출 시 안내(게이팅 아님 — 작성은 허용).
  selfSubmitted = true,
  labels: providedLabels,
  onSave,
  onSubmit,
  onSaveAssessment,
  // TC-098 승진 요청서(4항목)
  promotionRequest = null,
  onSubmitPromotion,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const fields = useMemo(() => buildFields(template, L), [template, L]);
  const [state, setState] = useState(() => seedState(leaderAnswers, fields));
  const [grade, setGrade] = useState(initialGrade);
  const [confidentialComment, setConfidentialComment] = useState(assessment?.confidentialComment ?? '');
  // 승진 고려 = 체크값 또는 이미 승진 요청서가 제출돼 있으면 켠 상태(TC-098 프리필 노출).
  const [promotionReady, setPromotionReady] = useState(
    (assessment?.promotionReady ?? false) || !!promotionRequest,
  );
  // TC-098 승진 요청서 4항목
  const [promoForm, setPromoForm] = useState({
    evalHistorySummary: promotionRequest?.evalHistorySummary ?? '',
    reviewBackground: promotionRequest?.reviewBackground ?? '',
    levelRoleExamples: promotionRequest?.levelRoleExamples ?? '',
    additionalNotes: promotionRequest?.additionalNotes ?? '',
  });
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoSaved, setPromoSaved] = useState(false);
  const [compensationNote, setCompensationNote] = useState(assessment?.compensationNote ?? '');

  // 답변/템플릿 async 로드 시 재시드 — effect-setState 대신 during-render 리셋
  // (React 공식 "adjust state during render"), fields/leaderAnswers 참조 변경 시에만.
  const [seededFor, setSeededFor] = useState({ fields, leaderAnswers });
  if (seededFor.fields !== fields || seededFor.leaderAnswers !== leaderAnswers) {
    setSeededFor({ fields, leaderAnswers });
    setState(seedState(leaderAnswers, fields));
  }
  // TC-036: 미입력 자동 스크롤용 훅(early-return 앞에 선언).
  const fieldRefs = useRef({});
  const gradeRef = useRef(null);
  const [triedSubmit, setTriedSubmit] = useState(false);

  // 진행 중인 하향 리뷰 단계가 아니면(사이클 미해결) 빈 상태만 — 작동하지 않는 입력폼을
  // 노출하지 않는다(셀프 리뷰 캔버스와 동일한 가드).
  if (!active) {
    return (
      <div className="evc-root">
        <div className="evc-empty" data-testid="evl-not-active">
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
      .filter(
        (f) =>
          state[f.key].textAnswer.trim() ||
          state[f.key].score != null ||
          selectedOptions(state[f.key]).length > 0,
      )
      .map((f) => ({
        templateItemId: f.templateItemId,
        itemCategory: f.category,
        growthType: f.growthType,
        textAnswer: state[f.key].textAnswer,
        score: state[f.key].score,
        rationale: state[f.key].rationale || null,
        checkedOptions: state[f.key].checkedOptions,
      }));

  const sections = [];
  fields.forEach((f) => {
    let g = sections.find((s) => s.title === f.section);
    if (!g) {
      g = { title: f.section, fields: [] };
      sections.push(g);
    }
    g.fields.push(f);
  });
  // requiresRationale 척도 항목은 사유가 채워져야 제출 가능(시안 D4).
  const ratingOk = fields
    .filter((f) => f.type === 'rating')
    .every((f) => !f.requiresRationale || (state[f.key].rationale || '').trim());

  // TC-036: 사유 미입력 상태 제출 시 자동 스크롤·빨강 강조(훅은 위에서 선언).
  const isIncomplete = (f) =>
    f.type === 'rating' &&
    f.requiresRationale &&
    !(state[f.key].rationale || '').trim();
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
    if (!grade) {
      setTriedSubmit(true);
      gradeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    onSubmit?.(toItems(), grade);
  };

  // TC-046/047 최종 등급 카드 위치(HR 옵션): top·bottom·freeze(상단고정=슬림 sticky 헤더).
  const gradePos = cycle?.reviewSequence?.gradeCardPosition ?? 'bottom';
  const isFreeze = gradePos === 'freeze';
  const gradeAtTop = gradePos === 'top' || isFreeze;
  const gradeCard = (
    <section
      className={`evc-card evl-grade-card${isFreeze ? ' evl-grade-freeze' : ''}${triedSubmit && !grade ? ' evl-grade-missing' : ''}`}
      ref={gradeRef}
      data-testid="evl-grade-card"
      data-position={gradePos}
    >
      {isFreeze && <p className="evl-freeze-note"><ZapIcon size={14} /> {L.freezeNote}</p>}
      <h3 className="evc-card-name">{L.gradeTitle}</h3>
      {!calibrationEnabled && (
        <p className="evl-calib-off-note" data-testid="evl-calib-off-note">
          <AlertIcon size={14} /> {L.calibOffGradeNote}
        </p>
      )}
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
  );

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}{evaluateeName ? ` — ${evaluateeName}` : ''}</h1>
          {cycle?.name && <p className="evc-summary">{cycle.name}</p>}
        </div>
      </header>

      {submitted && (
        <p className="evx-notice is-success" data-testid="evl-submitted" style={{ maxWidth: 1080, margin: '0 auto 12px' }}>
          ✓ {L.submittedBanner}
          {!calibrationEnabled && (
            <span data-testid="evl-submitted-calib-off"> {L.calibOffSubmittedNote}</span>
          )}
        </p>
      )}

      <div className="evl-2pane">
        {/* 좌: 근거 */}
        <aside className="evl-evidence" data-testid="evl-evidence">
          <h3 className="evc-card-name">{L.evidenceTitle}</h3>
          {!selfSubmitted && (
            <p className="evl-self-pending" data-testid="evl-self-pending">
              {L.selfNotSubmitted}
            </p>
          )}
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
          {gradeAtTop && gradeCard}
          {sections.map((sec) => (
            <section className="evc-card" key={sec.title}>
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
                        <div className="evm-score-btns">
                          {f.scaleAnchorMin && (
                            <span className="evm-score-anchor">{f.scaleAnchorMin}</span>
                          )}
                          {Array.from({ length: scaleMaxOf(f) }, (_, i) => i + 1).map((n) => (
                            <button
                              type="button"
                              key={n}
                              className={`evm-score-btn${state[f.key].score === n ? ' is-on' : ''}`}
                              disabled={submitted}
                              onClick={() => setField(f.key, { score: n })}
                              data-testid={`evl-score-${f.key}-${n}`}
                            >
                              {n}
                            </button>
                          ))}
                          {f.scaleAnchorMax && (
                            <span className="evm-score-anchor">{f.scaleAnchorMax}</span>
                          )}
                          <span className="evm-score-of">/ {scaleMaxOf(f)}</span>
                        </div>
                      </div>
                      {/* PW-118 사유 서술칸은 척도 항목의 일부다(spec-eval-cycle §4.2.2 B6/D4).
                          requiresRationale 은 칸의 유무가 아니라 제출 게이팅만 정한다. */}
                      <textarea
                        className={`evm-textarea${triedSubmit && isIncomplete(f) ? ' is-invalid' : ''}`}
                        rows={2}
                        value={state[f.key].rationale}
                        placeholder={
                          f.requiresRationale
                            ? L.rationalePlaceholder
                            : L.rationaleOptionalPlaceholder
                        }
                        disabled={submitted}
                        onChange={(e) => setField(f.key, { rationale: e.target.value })}
                        data-testid={`evl-rationale-${f.key}`}
                      />
                    </>
                  ) : f.type === 'checkbox' ? (
                    /* PW-433 ③ 제목 + 선택지 2층. 선택지가 없는 구 항목은 구 동작으로 폴백. */
                    filledOptions(f).length > 0 ? (
                      <div className="evm-options" data-testid={`evl-options-${f.key}`}>
                        {filledOptions(f).map((o) => (
                          <label className="evl-promo-row" key={o.id}>
                            <input
                              type={f.allowMultiple ? 'checkbox' : 'radio'}
                              name={`evl-opt-${f.key}`}
                              checked={selectedOptions(state[f.key]).includes(o.id)}
                              disabled={submitted}
                              onChange={() =>
                                setField(f.key, {
                                  checkedOptions: {
                                    selected: toggleOption(
                                      selectedOptions(state[f.key]),
                                      o.id,
                                      !!f.allowMultiple,
                                    ),
                                  },
                                })
                              }
                              data-testid={`evl-option-${f.key}-${o.id}`}
                            />
                            <span>{o.label}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <label className="evl-promo-row">
                        <input
                          type="checkbox"
                          checked={state[f.key].score === 1}
                          disabled={submitted}
                          onChange={(e) => setField(f.key, { score: e.target.checked ? 1 : 0 })}
                          data-testid={`evl-check-${f.key}`}
                        />
                        <span>{f.label}</span>
                      </label>
                    )
                  ) : (
                    <textarea
                      className="evm-textarea"
                      rows={3}
                      value={state[f.key].textAnswer}
                      placeholder={f.placeholder}
                      disabled={submitted}
                      onChange={(e) => setField(f.key, { textAnswer: e.target.value })}
                      data-testid={`evl-text-${f.key}`}
                    />
                  )}
                  <FieldVisibility
                    visibleToRoles={f.visibleToRoles}
                    labels={L}
                  />
                </div>
              ))}
            </section>
          ))}

          {/* 최종 등급 — 하단 배치(기본)일 때만 여기 렌더 */}
          {!gradeAtTop && gradeCard}

          {/* F5 승진·보상·비밀 코멘트 — TC-054 상위(위원회) 전용 */}
          <section
            className="evc-card evl-committee-only"
            data-testid="evl-assessment"
          >
            <h3 className="evc-card-name">
              {L.assessmentTitle}
              <span
                className="evl-committee-badge"
                title={L.committeeOnlyHint}
                data-testid="evl-committee-badge"
              >
                {L.committeeOnlyBadge}
              </span>
            </h3>
            <p className="evl-committee-hint">{L.committeeOnlyHint}</p>
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
            {promotionReady && (
              <p className="evl-promo-guide" data-testid="evl-promo-guide">
                {L.promotionGuide}
              </p>
            )}
            {promotionReady && onSubmitPromotion && (
              <div className="evl-promo-req" data-testid="evl-promo-req">
                {[
                  ['evalHistorySummary', L.promoReqHistory],
                  ['reviewBackground', L.promoReqBackground],
                  ['levelRoleExamples', L.promoReqExamples],
                  ['additionalNotes', L.promoReqNotes],
                ].map(([field, label]) => (
                  <div className="evm-field" key={field}>
                    <span className="evc-field-label">{label}</span>
                    <textarea
                      className="evm-textarea"
                      rows={2}
                      value={promoForm[field]}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPromoForm((f) => ({ ...f, [field]: v }));
                        setPromoSaved(false);
                      }}
                      data-testid={`evl-promo-${field}`}
                    />
                  </div>
                ))}
                <div className="evc-card-buttons">
                  {promoSaved && (
                    <span
                      className="evm-kr-saved"
                      data-testid="evl-promo-saved"
                    >
                      ✓ {L.promoReqSaved}
                    </span>
                  )}
                  <button
                    type="button"
                    className="evc-btn is-ghost"
                    disabled={promoBusy}
                    onClick={() => {
                      setPromoBusy(true);
                      Promise.resolve(onSubmitPromotion(promoForm))
                        .then(() => setPromoSaved(true))
                        .catch(() => {})
                        .finally(() => setPromoBusy(false));
                    }}
                    data-testid="evl-promo-submit"
                  >
                    {L.promoReqSubmit}
                  </button>
                </div>
              </div>
            )}
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
              <span className={`evm-progress${triedSubmit && (!grade || !ratingOk) ? ' evm-incomplete-warn' : ''}`}>
                {triedSubmit && !ratingOk
                  ? L.rationaleRequired
                  : grade
                    ? ''
                    : L.gradeRequired}
              </span>
              <div className="evc-card-buttons">
                <button type="button" className="evc-btn is-ghost" onClick={() => onSave?.(toItems(), grade)} data-testid="evl-save">
                  {L.save}
                </button>
                <button
                  type="button"
                  className="evc-btn is-primary"
                  onClick={handleSubmitClick}
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
