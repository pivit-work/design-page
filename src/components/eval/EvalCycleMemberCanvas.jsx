import { useState, useMemo, useRef, useEffect } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Button from '../shared/Button.jsx';
import { FieldInfo, FieldVisibility } from './evalFieldMeta.jsx';
import EvalNoteBlock, { EvalMarkdownLite } from './EvalNoteBlock.jsx';
import { isNoteItem } from './evalTemplateItemModel.js';
import { resolveUiLocale } from '../shared/uiLocale.js';
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
import { fieldsShape, reseedKeepingEdits } from './reseedAnswers.js';

/**
 * EvalCycleMemberCanvas — 멤버 셀프 리뷰 작성 화면.
 *
 * 업적(work_achievement) / 역량(competency, 1-5 점수) / 성장(growth: 강점·보완·성장입증)
 * 섹션을 작성해 임시저장·제출하는 순수 컴포넌트. answers(서버 저장본)로 폼을 시드하고
 * onSave(items)/onSubmit 로 상위에 위임. 제출 완료 상태면 읽기 전용.
 */

/** spec-eval-cycle §4.3.4 E5 — 자동 임시저장 주기. */
export const AUTOSAVE_INTERVAL_MS = 60000;

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
  // spec-eval-cycle §13.4 — 지난 기간 피드백 기록이 아직 없어 AI 가 이번 기간 것만 본다.
  // 빈 문자열을 넘기면 줄을 그리지 않는다.
  actPeriodNote: '현재 기간 데이터만 사용됩니다',
  // spec-eval-cycle §10 — 이 기간 스니핏·OKR 이 비었을 때(`dataShortage`) 또는 AI 가 일부 항목을 못 채웠을 때.
  dataShortage: '데이터가 부족하여 일부 항목은 직접 작성이 필요합니다',
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
  rationaleOptionalPlaceholder: '점수 근거를 서술하세요. (선택)',
  // spec-eval-cycle §4.2.2 B6 — 「점수 이유 필수」 항목의 사유를 비우고 제출하면 그 칸 아래.
  rationaleRequired: '점수 사유를 입력해 주세요.',
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
  aiError: 'AI 다듬기에 실패했습니다.',
  // §4.3 AI 초안 생성 — 빈 칸이 아니라 근거가 붙은 초안에서 시작한다.
  aiDraft: '전체 AI 초안 생성',
  // spec-eval-cycle §4.3.4 E3 — 전체 생성과 함께 서술형 항목마다 그 항목만 만드는 단추.
  aiDraftItem: '항목별 AI 초안 생성',
  aiDrafting: '초안 만드는 중…',
  // feedback-ai-spec §8.3 실패 문구 그대로.
  aiDraftError: 'AI 초안 생성에 실패했습니다. 직접 작성하거나 다시 시도해 주세요.',
  // §8.3 AI 초안 상태 — 도착하면 노랑(미확인), [확인]을 누르면 초록. 고치면 배지만 «AI 수정됨».
  aiDraftUnconfirmed: 'AI 초안 · 미확인',
  aiDraftEdited: 'AI 수정됨',
  aiDraftConfirmed: 'AI 초안 확인됨',
  aiDraftConfirm: '확인',
  // PW-1614 기획서 절대 규칙 3 — 확인 안 한(노란) 초안 칸이 남으면 제출되지 않는다.
  aiDraftPendingWarn: 'AI 초안을 확인한 뒤 제출해 주세요.',
  // TC-012 지난 사이클 평가 이력
  historyTitle: '내 평가 이력',
  historySub: '지난 사이클에서 받은 최종 등급입니다. 이번 자기평가 작성에 참고하세요.',
  // [PW-1262 ③] 동료 리뷰 — 피평가자 셀프 리뷰 참조 영역
  selfRefTitle: '피평가자의 셀프 리뷰 참조 (작성 참고용)',
  selfRefNote: '이 내용은 작성 참고용으로만 제공됩니다.',
  selfRefNotSubmitted: '피평가자가 아직 셀프 리뷰를 제출하지 않았습니다.',
  selfRefCollapse: '접기',
  selfRefExpand: '펼치기',
  selfRefEmpty: '(작성하지 않음)',
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
// [PW-1072] 항목 제목(섹션 머리)은 `it.section` 이 있으면 그것을 쓴다. `category` 는 저장값
// (`work_achievement` 등)이라 답을 저장할 때 그대로 되돌려 보내야 하고, 화면에 옮긴 말은
// 앱이 `section` 으로 따로 싣는다. 없으면 종전대로 `category` 를 그린다.
function buildFields(template, L) {
  if (template && Array.isArray(template.items) && template.items.length) {
    return template.items
      .filter((it) => it.category !== '최종 등급 결정')
      .map((it) => {
        // [PW-602 ④] 설명 항목은 답을 받지 않는다 — 폼 필드가 아니라 «글»이다.
        // 아래 `questionFields` 가 이것들을 걸러 내므로, 진행률·미입력·필수 검증은
        // 계수 자리를 하나하나 고치지 않아도 자동으로 설명을 세지 않는다(불변식 ②).
        if (isNoteItem(it)) {
          return {
            key: it.id,
            templateItemId: it.id,
            category: it.category,
            type: 'note',
            section: it.section || it.category || '평가 항목',
            text: it.label ?? null,
            description: it.description ?? null,
          };
        }
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
          // [PW-882] HR 이 고른 리포트 「성장 영역」 칸. 저장할 때 서버가 항목 설정으로 다시 찍는다.
          growthType: it.growthType ?? null,
          type,
          label: it.label,
          placeholder: it.label,
          section: it.section || it.category || '평가 항목',
          requiresRationale: !!it.requiresRationale,
          score: type === 'rating',
          description: it.description ?? null,
          // [PW-602 ③] 가이드 문구를 «어떻게» 보여줄지는 설계자가 정한다(§5.11-D).
          // 개정 전 이 화면은 이 값을 통째로 무시하고 늘 툴팁으로만 그렸다 — 「표시 안 함」도
          // 「항목 아래 상시 표시」도 화면에 닿지 않았고, 서식이 그려질 자리가 아예 없었다.
          descriptionDisplay: it.descriptionDisplay || 'tooltip',
          visibleToRoles: it.visibleToRoles ?? null,
          // PW-433 ①③ — 척도 길이·양끝 의미·선택지는 **항목이 들고 온다**. 화면이
          // 5점을 고정하면 설계자가 정한 7점 척도가 작성 화면에서 5점으로 보인다.
          scaleMax: it.scaleMax ?? null,
          scaleAnchorMin: it.scaleAnchorMin ?? null,
          scaleAnchorMax: it.scaleAnchorMax ?? null,
          options: it.options ?? null,
          allowMultiple: !!it.allowMultiple,
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
    descriptionDisplay: 'tooltip',
    visibleToRoles: null,
    scaleMax: null,
    scaleAnchorMin: null,
    scaleAnchorMax: null,
    options: null,
    allowMultiple: false,
  }));
}

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
/**
 * [PW-1262 ③] 피평가자 셀프 리뷰 참조 — 읽기 전용, 접을 수 있다(policy §5.5).
 * 인라인에서 답 전문을 보여 주므로 «전체 보기» 창은 두지 않는다.
 */
function SelfReferencePanel({ reference, L }) {
  const [open, setOpen] = useState(true);
  const items = Array.isArray(reference.items) ? reference.items : [];
  return (
    <section className="evm-selfref" data-testid="evm-selfref">
      <div className="evm-selfref-head">
        <div className="evm-history-title">
          <NoteIcon size={15} />
          <span>{L.selfRefTitle}</span>
        </div>
        {reference.submitted && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            data-testid="evm-selfref-toggle"
          >
            {open ? L.selfRefCollapse : L.selfRefExpand}
          </Button>
        )}
      </div>
      {!reference.submitted ? (
        <div className="evm-history-sub" data-testid="evm-selfref-not-submitted">
          {L.selfRefNotSubmitted}
        </div>
      ) : (
        open && (
          <>
            <div className="evm-selfref-rows">
              {items.map((it) => {
                const hasScore = typeof it.score === 'number';
                const hasChoices = Array.isArray(it.choices) && it.choices.length > 0;
                const hasText = typeof it.text === 'string' && it.text.trim() !== '';
                return (
                  <div className="evm-selfref-row" key={it.id} data-testid={`evm-selfref-${it.id}`}>
                    <div className="evm-selfref-label">
                      <span>{it.label}</span>
                      {hasScore && (
                        <StatusBadge>
                          {it.scaleMax ? `${it.score} / ${it.scaleMax}` : String(it.score)}
                        </StatusBadge>
                      )}
                    </div>
                    {hasChoices && <div className="evm-selfref-text">{it.choices.join(', ')}</div>}
                    {hasText && <div className="evm-selfref-text">{it.text}</div>}
                    {!hasScore && !hasChoices && !hasText && (
                      <div className="evm-selfref-text is-empty">{L.selfRefEmpty}</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="evm-history-sub evm-selfref-note">{L.selfRefNote}</div>
          </>
        )
      )}
    </section>
  );
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

/* ── PW-433 항목 단위 설정을 읽는 쪽 ─────────────────────────────────────
   설계자가 정한 값이 없으면 예전과 같이 5점·제목 1개 체크로 읽는다. */
const DEFAULT_SCALE_MAX = 5;
const scaleMaxOf = (f) => f?.scaleMax || DEFAULT_SCALE_MAX;
/** 라벨이 빈 선택지는 렌더하지 않는다 (policy §5.11-B). */
const filledOptions = (f) => (f?.options || []).filter((o) => o.label?.trim());
const selectedOptions = (v) => v?.checkedOptions?.selected ?? [];
/** 복수 허용이 꺼져 있으면 라디오처럼 하나만 남긴다. */
const toggleOption = (cur, oid, allowMultiple) => {
  if (!allowMultiple) return cur.includes(oid) ? [] : [oid];
  return cur.includes(oid) ? cur.filter((x) => x !== oid) : [...cur, oid];
};

function seedState(answers, fields) {
  const state = {};
  for (const f of fields)
    state[f.key] = {
      textAnswer: '',
      score: null,
      rationale: '',
      checkedOptions: null,
      aiDraft: null,
      isConfirmed: false,
    };
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
        aiDraft: a.aiDraft ?? null,
        isConfirmed: !!a.isConfirmed,
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
  onAiDraft,
  onKrProgressSave,
  // TC-053 동료 리뷰 등 타인 평가 시 항목별 공개 대상 안내 노출(셀프는 미노출)
  showVisibility = false,
  // [PW-586] 머리 아래·폼 위에 끼우는 블록. 상향 리뷰는 평가 대상 카드와 접을 수 없는 익명
  // 안내를 여기 둔다 — 폼을 새로 그리지 않고 셀프·동료와 같은 폼을 쓰기 위한 자리다.
  headerSlot = null,
  // [PW-1262 ③] 동료 리뷰에서 피평가자 셀프 리뷰를 참고로 보이는 영역. null 이면 영역이 없다
  // (관리자가 «동료에게 보이기»를 켠 질문이 없을 때). 모양:
  // { submitted, items: [{ id, label, score, scaleMax, text, choices }] }
  // 셀프를 아직 안 냈으면 submitted=false 이고 안내 한 줄만 보인다(policy §6 예외 표).
  selfReference = null,
  // [PW-586] AI 초안을 만들 수 없는 이유. 있으면 버튼을 끄고 이유를 버튼 옆에 적는다
  // (근거가 0건인데 눌러 보게 한 뒤 실패로 알리지 않는다).
  aiDraftDisabledReason = null,
  // feedback-ai-spec §8.3 — AI 초안 칸을 노랑(미확인)/초록(확인)으로 그리고 [확인]을 둔다.
  // 확인 상태를 저장하는 화면(셀프 리뷰)만 켠다 — 저장하지 않는 화면에서 켜면 다시 열 때 사라진다.
  trackAiDraft = false,
  // [PW-1460] 이 기간 스니핏이나 OKR 이 비었는가 — 셀프 리뷰 화면이 판정해 넘긴다(spec §10).
  dataShortage = false,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  // 평가지에 놓인 순서 그대로의 «항목» 전부 — 질문과 설명이 섞여 있다.
  const entries = useMemo(() => buildFields(template, L), [template, L]);
  /**
   * [PW-602 ④ 불변식 ②] 답을 받는 항목만. 아래의 상태 시드·진행률·미입력·필수 검증은
   * 전부 이것을 본다 — 계수 자리를 하나씩 고치는 대신 **들어오는 자리에서 한 번** 가른다.
   * 「미입력에서 뺀다」로만 적으면 진행률과 배지가 남는다(policy §5.11-F).
   */
  const fields = useMemo(() => entries.filter((f) => f.type !== 'note'), [entries]);
  const [state, setState] = useState(() => seedState(answers, fields));
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState(false);
  /* [PW-1460] AI 초안 진행·실패는 «어디서 눌렀나»를 담는다 — 'all'(전체) 또는 항목 key.
     항목별 단추의 실패는 그 항목 아래에서 말한다. */
  const [draftBusy, setDraftBusy] = useState(null);
  const [draftError, setDraftError] = useState(null);
  /** AI 가 근거가 없어 빈 초안을 돌려준 항목이 있었나 — 데이터 부족 안내를 띄운다. */
  const [draftShort, setDraftShort] = useState(false);
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
  // TC-135 · spec-eval-cycle §4.3.4 E5 — 바뀐 것이 있으면 «60초마다» 자동 임시저장(early-return 앞 선언).
  // 종전에는 편집이 멈춘 뒤 30초를 기다렸다 — 쉬지 않고 쓰면 끝까지 한 번도 저장되지 않았다.
  const dirtyRef = useRef(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const [autoSavedAt, setAutoSavedAt] = useState(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [saveError, setSaveError] = useState(false); // TC-136 저장 실패 배너
  useEffect(() => {
    // 제출 완료·저장 콜백 없음이면 자동저장 안 함. 편집이 없던 주기는 요청을 보내지 않는다.
    if (submitted || !onSave) return undefined;
    const timer = setInterval(() => {
      if (!dirtyRef.current) return;
      const cur = stateRef.current;
      const items = fields
        .filter(
          (f) =>
            cur[f.key].textAnswer.trim() ||
            cur[f.key].score != null ||
            selectedOptions(cur[f.key]).length > 0,
        )
        .map((f) => ({
          templateItemId: f.templateItemId,
          itemCategory: f.category,
          growthType: f.growthType,
          textAnswer: cur[f.key].textAnswer,
          score: cur[f.key].score,
          rationale: cur[f.key].rationale || null,
          checkedOptions: cur[f.key].checkedOptions,
        }));
      // 보내는 순간 깨끗하게 둔다 — 저장 중에 고친 것은 다음 주기에 다시 보낸다.
      dirtyRef.current = false;
      setAutoSaving(true);
      Promise.resolve(onSave(items))
        .then(() => {
          setAutoSavedAt(new Date());
          setSaveError(false);
        })
        .catch(() => {
          // TC-136 자동저장 실패 → 배너로 알리고 다음 주기에 다시 보낸다
          dirtyRef.current = true;
          setSaveError(true);
        })
        .finally(() => setAutoSaving(false));
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [submitted, onSave, fields]);

  // 템플릿/답변이 나중에 도착하면(async 로드) 재시드. fields 는 useMemo,
  // answers 는 부모 ref 라 편집 중엔 안 바뀌고 로드·저장 시점에만 재시드된다.
  // effect-setState 대신 during-render 리셋(React 공식 "adjust state during render")로
  // fields/answers 참조 변경 시에만 재시드 — 편집 중에는 유지.
  const [seededFor, setSeededFor] = useState({ fields, answers });
  if (seededFor.fields !== fields || seededFor.answers !== answers) {
    setSeededFor({ fields, answers });
    // 칸 구성이 같고 답만 새로 왔으면(저장 응답) 그 사이 고친 칸은 둔다 (PW-966).
    // 구성은 참조가 아니라 모양으로 가른다 — 저장 응답마다 평가지·라벨이 새 객체로 온다.
    if (fieldsShape(seededFor.fields) !== fieldsShape(fields)) setState(seedState(answers, fields));
    else
      setState((cur) =>
        reseedKeepingEdits(cur, seedState(seededFor.answers, fields), seedState(answers, fields)),
      );
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

  /**
   * feedback-ai-spec §8.3 AI 초안 칸의 상태. 초안을 쓰지 않은 칸·비운 칸은 null.
   * 고쳐도 확인 여부는 그대로이고 배지만 «AI 수정됨»으로 바뀐다.
   */
  const aiStateOf = (f) => {
    if (!trackAiDraft) return null;
    const st = state[f.key];
    if (!st || st.aiDraft == null || !st.textAnswer.trim()) return null;
    if (st.isConfirmed) return { tone: 'confirmed', label: L.aiDraftConfirmed };
    return {
      tone: 'unconfirmed',
      label: st.textAnswer === st.aiDraft ? L.aiDraftUnconfirmed : L.aiDraftEdited,
    };
  };

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

  const isBlankPct = (raw) => raw == null || String(raw).trim() === '';

  const handleKrSave = async () => {
    if (!onKrProgressSave) return;
    const inputs = krList.map((kr) => ({
      krId: kr.id,
      // 비워 둔 KR 은 0 이 아니라 null(미입력)로 보낸다 — Number('') 가 0 이라 clamp 를 거치면 0 이 된다 (PW-1245)
      achievePct: isBlankPct(krState[kr.id]?.percent) ? null : clampPct(krState[kr.id]?.percent),
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
        ...(trackAiDraft
          ? {
              aiDraft: state[f.key].aiDraft ?? null,
              isConfirmed: !!state[f.key].isConfirmed,
            }
          : {}),
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

  // §4.3 AI 초안 생성 — 다듬기와 달리 **빈 칸**을 근거로 채운다.
  // 이미 쓴 내용은 절대 덮어쓰지 않는다(초안 때문에 작성분이 날아가면 안 된다).
  // 채울 칸이 없으면 버튼 자체가 비활성 — '다듬기'로 넘어가면 되는 상태다.
  const emptyTextFields = fields.filter(
    (f) => f.type !== 'rating' && !state[f.key].textAnswer.trim(),
  );
  /** `only` 를 주면 그 항목 하나만 만든다(항목별 단추). 안 주면 빈 서술형 전부. */
  const handleAiDraft = async (only = null) => {
    const targets = only ? [only] : emptyTextFields;
    if (!onAiDraft || targets.length === 0 || draftBusy) return;
    const where = only ? only.key : 'all';
    const items = targets.map((f) => ({
      index: fields.indexOf(f),
      itemCategory: f.category,
      growthType: f.growthType,
      label: f.label ?? null,
      templateItemId: f.templateItemId ?? null,
    }));
    // feedback-ai-spec §8.1-A — 설명 항목 본문과 질문 가이드는 초안 «대상»이 아니라 «맥락»이다.
    // 대상 목록(items)과 섞지 않고 이름 붙은 자리로 따로 넘긴다.
    const templateContext = {
      notes: entries
        .filter((e) => e.type === 'note' && (e.description || e.text))
        .map((e) => ({
          itemId: e.templateItemId,
          title: e.text ?? null,
          body: e.description || e.text,
        })),
      itemGuides: targets
        .filter((f) => f.templateItemId && f.description)
        .map((f) => ({ itemId: f.templateItemId, guide: f.description })),
    };
    setDraftError(null);
    setDraftBusy(where);
    try {
      const drafted = await onAiDraft(items, templateContext);
      // 근거가 없어 빈 초안으로 돌아온 항목이 있으면 직접 쓰라고 알린다(spec §10).
      setDraftShort(
        items.some(
          (it) => !drafted.find((d) => d.index === it.index)?.textAnswer?.trim(),
        ),
      );
      setState((prev) => {
        const next = { ...prev };
        for (const d of drafted) {
          const f = fields[d.index];
          // 빈 초안은 덮어쓰지 않는다(근거가 없어 못 쓴 항목).
          if (f && d.textAnswer?.trim()) {
            // §8.3 — 도착한 초안은 미확인(노랑). 원문을 남겨 «AI 수정됨»을 가를 수 있게 한다.
            next[f.key] = {
              ...next[f.key],
              textAnswer: d.textAnswer,
              aiDraft: d.textAnswer,
              isConfirmed: false,
            };
          }
        }
        return next;
      });
    } catch {
      setDraftError(where);
    } finally {
      setDraftBusy(null);
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
  const isAiPending = (f) => aiStateOf(f)?.tone === 'unconfirmed';
  const hasAiPending = fields.some(isAiPending);
  const handleSubmitClick = () => {
    // 빈 칸이 먼저다 — 다 채운 뒤에야 노란 칸(PW-1614)으로 안내한다.
    const inc = fields.find(isIncomplete) || fields.find(isAiPending);
    if (inc) {
      setTriedSubmit(true);
      fieldRefs.current[inc.key]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return;
    }
    // [PW-967·PW-1007] 제출 약속을 돌려주면 [제출](공용 `Button`)이 끝날 때까지 스스로 잠근다 —
    // 결과를 안 기다려 두 번 누르면 두 번 나갔다. 실패하면 풀려 다시 누를 수 있다(알림은 화면이 띄운다).
    return onSubmit ? Promise.resolve(onSubmit(toItems())) : undefined;
  };

  // 섹션(section) 별 그룹핑 — 등장 순서 유지.
  const sections = [];
  // 설명 항목은 «놓인 자리»가 기능의 핵심이라 그룹핑에는 함께 넣는다(맨 앞·사이·맨 뒤).
  entries.forEach((f) => {
    let g = sections.find((s) => s.title === f.section);
    if (!g) {
      g = { title: f.section, fields: [] };
      sections.push(g);
    }
    g.fields.push(f);
  });

  return (
    <div className="evc-root evm-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          {cycle?.name && <p className="evc-summary">{cycle.name}</p>}
        </div>
      </header>

      {headerSlot}

      {selfReference && (
        <div className="evc-list">
          <SelfReferencePanel reference={selfReference} L={L} />
        </div>
      )}

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
                <StatusBadge className="evm-history-grade">{h.gradeLabel}</StatusBadge>
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
      {/* §4.2.1 KR 달성률 수기입력 — 참고 영역과 같은 박스에 full-width 로 노출 */}
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
                        /* PW-1004 — 「임시저장」과 같은 흰 보조 버튼. 꽉 찬 색은 「제출하기」 하나만 쓴다. */
                        className="evc-btn is-ghost evm-kr-save"
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
              {L.actPeriodNote && (
                <div className="evm-activity-note" data-testid="evm-activity-period-note">
                  {L.actPeriodNote}
                </div>
              )}
            </section>
          </div>
        );
      })()}

      {/* [PW-1460] spec §10 — 이 기간 스니핏·OKR 이 비었거나 AI 가 일부 항목을 못 채웠다. */}
      {!submitted && (dataShortage || draftShort) && (
        <div className="evc-list">
          <p className="evx-notice is-warn" data-testid="evm-data-shortage">
            {L.dataShortage}
          </p>
        </div>
      )}

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
            {sec.fields.map((f) =>
              /* [PW-602 ④] 설명 항목 — 입력 위젯도 번호도 없이 «글»로만 그린다. */
              f.type === 'note' ? (
                <EvalNoteBlock key={f.key} item={f} testId={`evm-note-${f.key}`} />
              ) : (
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
                    {/* [PW-602 ③] 표시 방식 셋을 실제로 따른다 — 「표시 안 함」이면 아무것도,
                        「툴팁」이면 ⓘ 말풍선, 「항목 아래 상시」면 아래 블록으로. */}
                    {(f.descriptionDisplay || 'tooltip') === 'tooltip' && (
                      <FieldInfo description={f.description} />
                    )}
                  </span>
                )}
                {f.description && (f.descriptionDisplay || 'tooltip') === 'inline' && (
                  <EvalMarkdownLite
                    text={f.description}
                    className="evc-md evm-field-guide"
                    testId={`evm-guide-${f.key}`}
                  />
                )}
                {f.type === 'rating' ? (
                  <>
                    <div className="evm-score-row">
                      <span className="evc-field-label">{L.scoreLabel}</span>
                      <div
                        className={`evm-score-btns${triedSubmit && state[f.key].score == null ? ' is-invalid' : ''}`}
                      >
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
                            data-testid={`evm-score-${f.key}-${n}`}
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
                    {/* PW-118 사유 서술칸은 척도 항목의 일부다(spec-eval-cycle §4.2.2 B6/D4 —
                        "점수 셀렉터 + 바로 아래 사유 서술 입력칸"). requiresRationale 은
                        칸의 유무가 아니라 제출 게이팅·미입력 강조만 정한다. */}
                    <textarea
                      className={`evm-textarea${triedSubmit && f.requiresRationale && !state[f.key].rationale.trim() ? ' is-invalid' : ''}`}
                      rows={2}
                      value={state[f.key].rationale}
                      placeholder={
                        f.requiresRationale
                          ? L.rationalePlaceholder
                          : L.rationaleOptionalPlaceholder
                      }
                      disabled={submitted}
                      onChange={(e) => setField(f.key, { rationale: e.target.value })}
                      data-testid={`evm-rationale-${f.key}`}
                    />
                    {triedSubmit && f.requiresRationale && !state[f.key].rationale.trim() && (
                      <p className="evm-field-error" data-testid={`evm-rationale-error-${f.key}`}>
                        {L.rationaleRequired}
                      </p>
                    )}
                  </>
                ) : f.type === 'checkbox' ? (
                  /* PW-433 ③ 제목 + 선택지 2층. 선택지를 정한 적 없는 구 항목은
                     제목 1개짜리 단일 체크로 폴백한다(마이그레이션이 값을 지어내지 않는다). */
                  filledOptions(f).length > 0 ? (
                    <div className="evm-options" data-testid={`evm-options-${f.key}`}>
                      {filledOptions(f).map((o) => (
                        <label className="evl-promo-row" key={o.id}>
                          <input
                            type={f.allowMultiple ? 'checkbox' : 'radio'}
                            name={`evm-opt-${f.key}`}
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
                            data-testid={`evm-option-${f.key}-${o.id}`}
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
                        data-testid={`evm-check-${f.key}`}
                      />
                      <span>{f.label}</span>
                    </label>
                  )
                ) : (
                  <>
                    <textarea
                      className={`evm-textarea${triedSubmit && (isIncomplete(f) || isAiPending(f)) ? ' is-invalid' : ''}${aiStateOf(f) ? ` is-ai-${aiStateOf(f).tone}` : ''}`}
                      rows={4}
                      value={state[f.key].textAnswer}
                      placeholder={f.placeholder}
                      disabled={submitted}
                      onChange={(e) => setField(f.key, { textAnswer: e.target.value })}
                      data-testid={`evm-text-${f.key}`}
                    />
                    {/* [PW-1460] 항목별 AI 초안 — 빈 칸에만. 이미 쓴 칸은 덮어쓰지 않는다. */}
                    {onAiDraft && !submitted && !state[f.key].textAnswer.trim() && (
                      <button
                        type="button"
                        className="evc-btn is-ghost evm-ai-item-draft"
                        disabled={!!draftBusy || !!aiDraftDisabledReason}
                        onClick={() => handleAiDraft(f)}
                        data-testid={`evm-ai-draft-item-${f.key}`}
                      >
                        {draftBusy !== f.key && <SparkleIcon size={13} />}
                        {draftBusy === f.key ? L.aiDrafting : L.aiDraftItem}
                      </button>
                    )}
                    {draftError === f.key && (
                      <p className="evm-field-error" data-testid={`evm-ai-draft-error-${f.key}`}>
                        {L.aiDraftError}
                      </p>
                    )}
                    {aiStateOf(f) && (
                      <div
                        className={`evm-ai-draft-bar is-${aiStateOf(f).tone}`}
                        data-testid={`evm-ai-state-${f.key}`}
                        data-state={aiStateOf(f).tone}
                      >
                        <span className="evm-ai-draft-badge">{aiStateOf(f).label}</span>
                        {aiStateOf(f).tone === 'unconfirmed' && !submitted && (
                          <button
                            type="button"
                            className="evm-ai-draft-confirm"
                            onClick={() => setField(f.key, { isConfirmed: true })}
                            data-testid={`evm-ai-confirm-${f.key}`}
                          >
                            {L.aiDraftConfirm}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
                {showVisibility && (
                  <FieldVisibility
                    visibleToRoles={f.visibleToRoles}
                    labels={L}
                  />
                )}
              </div>
              ),
            )}
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

      {!submitted && draftError === 'all' && (
        <div className="evc-list">
          <p className="evx-notice" data-testid="evm-ai-draft-error" style={{ background: 'var(--utility-error-50)', color: 'var(--utility-error-500)' }}>
            {L.aiDraftError}
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
            ) : triedSubmit && hasAiPending ? (
              <span className="evm-incomplete-warn" data-testid="evm-ai-pending-warn">
                {L.aiDraftPendingWarn}
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
                    // 로케일을 안 주면 브라우저 언어를 따라 「03:12 PM」 이 된다 (PW-793)
                    time: autoSavedAt.toLocaleTimeString(resolveUiLocale(), {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  })}
            </span>
          )}
          <div className="evc-card-buttons">
            {onAiDraft && aiDraftDisabledReason && (
              <span className="evm-autosave" data-testid="evm-ai-draft-reason">
                {aiDraftDisabledReason}
              </span>
            )}
            {onAiDraft && (
              <button
                type="button"
                className="evc-btn is-ghost"
                disabled={!!draftBusy || emptyTextFields.length === 0 || !!aiDraftDisabledReason}
                onClick={() => handleAiDraft()}
                data-testid="evm-ai-draft"
              >
                {draftBusy !== 'all' && <SparkleIcon size={15} />}
                {draftBusy === 'all' ? L.aiDrafting : L.aiDraft}
              </button>
            )}
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
            <Button
              className="evc-btn is-primary"
              onClick={handleSubmitClick}
              data-testid="evm-submit"
            >
              {L.submit}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
