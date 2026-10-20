import { useState, useMemo, useRef, useEffect } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Button from '../shared/Button.jsx';
import AnchoredLayer from '../shared/AnchoredLayer.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import Radio from '../shared/Radio.jsx';
import Chip from '../shared/Chip.jsx';
import { FieldInfo, FieldVisibility } from './evalFieldMeta.jsx';
import EvalNoteBlock, { EvalMarkdownLite } from './EvalNoteBlock.jsx';
import { isNoteItem, categoryKind } from './evalTemplateItemModel.js';
import { resolveUiLocale } from '../shared/uiLocale.js';
import {
  TrendIcon,
  TargetIcon,
  ChatIcon,
  NoteIcon,
  UsersIcon,
  SparkleIcon,
  PaperclipIcon,
  AlertIcon,
  CheckCircleIcon,
  ArrowRightIcon,
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
  // PW-1464 · 대상자 화면 정책 §4.2 — 셀프 리뷰 요약 박스는 비어도 칸마다 «없다»를 말한다.
  actOneOnOneEmpty: '이 기간 1:1 기록이 없습니다',
  actFeedbackEmpty: '이 기간 받은 피드백이 없습니다',
  actSnippetsEmpty: '이 기간 스니핏이 없습니다',
  actOkrEmpty: '이 기간 OKR이 없습니다',
  actOkrTitle: 'OKR 달성 현황',
  // 불러오지 못한 칸은 «없다»로 말하지 않는다.
  actLoadFailed: '불러오지 못했습니다',
  // §4.4a — 활동 데이터가 하나도 없으면 박스에 안내하고 AI 초안 단추를 끈다.
  actNoData: '해당 기간 데이터가 없습니다',
  // §4.2.0 — 참고 영역과 작성 영역 사이 구분선.
  writeDivider: '이제부터 성과를 기록합니다. 성과는 업적과 역량으로 구성됩니다.',
  // §4.0 — 역량 섹션 머리의 데이터 출처 표시.
  competencyRefBadge: '어드민 설정 역량 항목 참조 가능 (공통·직무·리더십)',
  // §4.1 — 마감이 지났으면 읽기 전용.
  closedNotice: '마감이 지났습니다. 관리자에게 문의하세요.',
  // §4.2.1 — 달성률을 안 넣은 KR 이 있는 채 제출하면 묻고, 확인하면 제출한다.
  krUnfilledConfirm: '달성률이 입력되지 않은 KR이 있습니다. 그대로 제출할까요?',
  // §4.9 · §6.1 제출 완료 화면.
  doneTitle: '셀프 리뷰 제출 완료!',
  doneBody: '셀프 리뷰가 제출되었습니다.',
  doneBodyNext: '셀프 리뷰가 제출되었습니다. 다음 단계({{next}})가 곧 시작됩니다.',
  doneStepsTitle: '다음 단계',
  donePeerReview: '동료 리뷰 작성하기',
  doneMyEval: '내 평가 현황으로',
  // §4.3 AI 초안 카드.
  aiCardTitle: 'AI 초안 생성 ({{period}})',
  aiCardNoPeriod: '기간 미설정',
  aiCardSub: '상단 활동 요약을 분석해 항목별 초안을 만듭니다',
  aiDraftDone: '초안 생성 완료',
  cancel: '취소',
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
  // [PW-2064 · PW-2082] member policy §4.11 ③ 작성 진행 · §4.8b 하단 바
  progressTitle: '작성 진행',
  progressCount: '{{filled}}/{{total}}',
  progressChipTitle: '{{section}} · {{label}}',
  remaining: '{{count}}개 항목이 남았습니다',
  missingCount: '작성하지 않은 항목이 {{count}}개 있습니다',
  allDone: '모든 항목 작성 완료 — 제출 가능합니다',
  showMissing: '미작성 항목 보기',
  // [PW-2064] §4.11 ② 2단 근거 패널 제목
  evidenceSelfTitle: '근거 · 내 활동',
  evidencePeerTitle: '근거 · 리뷰 대상',
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
  aiDraftSources: '초안 출처',
  // PW-1920 「+N」 단추의 읽어 주는 이름과 창 안 묶음 이름.
  aiDraftSourcesMore: '출처 {{count}}개 더 보기',
  aiDraftSourceGroupSnippet: '스니핏',
  aiDraftSourceGroupFeedback: '받은 피드백',
  aiDraftSourceGroupOneOnOne: '1on1',
  aiDraftSourceGroupOkr: 'OKR 달성 기록',
  aiDraftConfirm: '확인',
  // §4.3.1 — 적용 단계를 켠 화면(상향 리뷰 §5U.4)에서 초안 블록의 두 버튼.
  aiDraftUse: '사용',
  aiDraftFold: '접기',
  // §5U.4 실패 박스의 버튼.
  aiDraftRetry: '다시 시도',
  // PW-1614 기획서 절대 규칙 3 — 확인 안 한(노란) 초안 칸이 남으면 제출되지 않는다.
  aiDraftPendingWarn: 'AI 초안을 확인한 뒤 제출해 주세요.',
  // PW-1464 · §4.4.1 문구 — 남은 노란 칸 수를 함께 말한다. 비우면 위 문구를 쓴다.
  aiDraftPendingCount: '',
  // TC-012 지난 사이클 평가 이력
  historyTitle: '내 평가 이력',
  historySub: '지난 사이클에서 받은 최종 등급입니다. 이번 자기평가 작성에 참고하세요.',
  // [PW-1262 ③] 동료 리뷰 — 피평가자 셀프 리뷰 참조 영역
  selfRefTitle: '피평가자의 셀프 리뷰 참조 (작성 참고용)',
  selfRefNote: '이 내용은 작성 참고용으로만 제공됩니다.',
  selfRefNotSubmitted: '피평가자가 아직 셀프 리뷰를 제출하지 않았습니다.',
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
 * [PW-1262 ③] 피평가자 셀프 리뷰 참조 — 읽기 전용(policy §5.5).
 * 인라인에서 답 전문을 보여 주므로 «전체 보기» 창은 두지 않는다.
 * [PW-2064] 2단 근거 패널에 놓이므로 접기를 없앴다(policy §4.11 ① 「접기 없다」).
 */
function SelfReferencePanel({ reference, L }) {
  const items = Array.isArray(reference.items) ? reference.items : [];
  return (
    <section className="evm-selfref" data-testid="evm-selfref">
      <div className="evm-selfref-head">
        <div className="evm-history-title">
          <NoteIcon size={15} />
          <span>{L.selfRefTitle}</span>
        </div>
      </div>
      {!reference.submitted ? (
        <div className="evm-history-sub" data-testid="evm-selfref-not-submitted">
          {L.selfRefNotSubmitted}
        </div>
      ) : (
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
      )}
    </section>
  );
}

/**
 * [PW-2064] 작성 진행(member policy §4.11 ③) — 입력 영역 맨 위에 붙어 있는 «n/m» 과 항목 칩.
 * 셈은 하단 바와 같다(PW-2067 — 체크도 센다). 칩을 누르면 그 칸으로 옮기고 포커스를 준다(§4.8b).
 * 제출을 막은 뒤에는 막은 칸의 칩이 빨강이다 — 비운 체크는 제출을 막지 않아 노랑으로 남는다.
 */
function ReviewProgress({ fields, isUnanswered, isIncomplete, tried, onJump, L }) {
  const total = fields.length;
  const filled = fields.filter((f) => !isUnanswered(f)).length;
  const done = filled === total;
  return (
    <section className="evm-review-progress" data-testid="evm-review-progress">
      <div className="evm-review-progress-head">
        <span className="evm-review-progress-title">{L.progressTitle}</span>
        <span
          className={`evm-review-progress-count${done ? ' is-done' : ''}`}
          data-testid="evm-review-progress-count"
        >
          {fill(L.progressCount, { filled, total })}
        </span>
        {/* 막대 모양은 리포트 KR 달성 막대(.evr-okr-kr-bar)를 빌려 폭만 늘린다. */}
        <span className="evr-okr-kr-bar evm-review-progress-bar" aria-hidden>
          <span
            className={`evr-okr-kr-fill${done ? ' is-done' : ''}`}
            style={{ width: `${total ? Math.round((filled / total) * 100) : 100}%` }}
          />
        </span>
      </div>
      <div className="evm-review-progress-chips">
        {fields.map((f) => {
          const open = isUnanswered(f);
          const state = !open ? 'done' : tried && isIncomplete(f) ? 'invalid' : 'open';
          return (
            <Chip
              key={f.key}
              tone={state === 'done' ? 'success' : state === 'invalid' ? 'danger' : 'warning'}
              icon={state === 'done' ? <CheckCircleIcon size={12} /> : null}
              className="evm-review-progress-chip"
              title={fill(L.progressChipTitle, { section: f.section, label: f.label })}
              onClick={() => onJump(f)}
              data-testid={`evm-progress-chip-${f.key}`}
              data-state={state}
            >
              {f.label}
            </Chip>
          );
        })}
      </div>
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

// 저장할 답 — 무언가 쓴 칸만. 임시저장·자동 저장·제출이 모두 이 모양을 쓴다(PW-1614).
function answerItems(fields, state, trackAiDraft) {
  return fields
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

/**
 * 고르는 칸 하나 — 여럿 고르기면 공용 `Checkbox`, 하나 고르기면 공용 `Radio` (PW-1936).
 * 예전엔 브라우저 기본 `<input>` 이라 파란 네모·동그라미로 보였다. 줄 모양(`evl-promo-row`)은 그대로.
 */
function OptionChoice({ multiple, label, ...rest }) {
  return multiple ? (
    <Checkbox className="evl-promo-row" inputClassName="dp-check-input" label={<span>{label}</span>} {...rest} />
  ) : (
    <Radio className="evl-promo-row" label={label} {...rest} />
  );
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
  // [PW-1464] 셀프 리뷰 화면만 켠다 — 대상자 화면 정책 §4 의 셀프 전용 표시(요약 빈 문구·구분선·
  // 역량 머리 표시·AI 초안 카드·칸 입력 상태 색·점수 다시 눌러 해제·저장 표시·제출 완료 화면).
  // 같은 캔버스를 쓰는 동료·상향 리뷰는 그대로다.
  selfReview = false,
  // [PW-1464] 셀프 마감이 지났다(서버가 저장을 거절하는 판정과 같다) — 읽기 전용 + 안내.
  closed = false,
  // [PW-1464] 셀프 리뷰 요약에서 불러오지 못한 칸 — { oneOnOne, feedback, snippets, okr } 참/거짓.
  activityFailed = null,
  // [PW-1464] 활동 데이터가 하나도 없다(전부 불러왔고 전부 비었다) — 박스 안내 + AI 초안 단추 끔.
  noActivityData = false,
  // [PW-1464] AI 초안 카드 제목의 분석 기간(「2026.01 – 2026.06」). 없으면 「기간 미설정」.
  aiPeriod = null,
  // [PW-1464] 제출 완료 화면의 「다음 단계」 — [{ key, label, done }]. null 이면 완료 화면 대신 띠.
  doneSteps = null,
  // [PW-1464] 동료 리뷰를 지금 쓸 수 있으면 넘긴다 — 완료 화면의 「동료 리뷰 작성하기 →」.
  onGoPeerReview = null,
  // [PW-1464] 완료 화면의 「내 평가 현황으로」(§6.1) — 갈 곳이 있을 때만 넘긴다.
  onGoMyEval = null,
  // [PW-1465] 상향 리뷰 §5U.4 — 초안을 칸에 바로 넣지 않고 칸 아래 노란 블록에 둔다.
  // [사용]을 눌러야 칸에 들어가고, [접기]는 버린다. 적용 전에는 본문을 바꾸지 않는다.
  draftNeedsApply = false,
  // [PW-1844] 동료 리뷰 member policy §5.7 — 초안은 항목별 [초안 보기]로만 받는다. false 면 아래 줄의
  // 「전체 AI 초안」 단추를 그리지 않는다(상향 리뷰는 그대로 둔다).
  aiDraftAllButton = true,
  // [PW-1844] 초안을 줄 수 없는 이유(동료와 협업 이력 부족). 있으면 항목별 단추 자리에 이 문장을 둔다.
  aiDraftUnavailable = null,
  // [PW-1465] [임시저장] 단추로 저장하다 실패했을 때. 자동 저장 실패는 폼 아래 띠만 띄운다.
  onSaveError,
  // [PW-1966] [임시저장] 단추로 저장이 끝났을 때. 화면이 토스트로 알린다(자동 저장은 부르지 않는다).
  onSaveSuccess,
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
  // [PW-1465] draftNeedsApply 일 때 아직 [사용] 하지 않은 초안. { [fieldKey]: text }
  const [pendingDraft, setPendingDraft] = useState({});
  // [PW-1844] 초안이 쓴 근거 — { [fieldKey]: [{ key, label, href }] }. 앱이 초안과 함께 넘긴 것만 담고
  // 저장하지 않는다(다시 열면 칸에는 사용자 글만 남는다).
  const [draftSources, setDraftSources] = useState({});
  const dropPendingDraft = (key) =>
    setPendingDraft((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  const submitted = status === 'submitted';
  // [PW-1464] 제출했거나 마감이 지났으면 고칠 수 없다(§4.1). 둘 다 입력을 잠그고 제출 바를 감춘다.
  const readOnly = submitted || closed;
  /** 전체 AI 초안을 한 번 만들었다 — 카드 단추가 「초안 생성 완료」가 된다(§4.3). */
  const [draftDoneAll, setDraftDoneAll] = useState(false);

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
  /** [PW-2082] 「미작성 항목 보기」가 마지막으로 옮겨 간 칸 key. */
  const navCursor = useRef(null);
  /** [PW-1464] 달성률 미입력 KR 확인 창이 떠 있다. */
  const [krAsk, setKrAsk] = useState(false);
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
    if (readOnly || !onSave) return undefined;
    const timer = setInterval(() => {
      if (!dirtyRef.current) return;
      // [PW-1614] 임시저장·제출과 같은 모양으로 보낸다 — 여기서 AI 초안 상태를 빼먹으면
      // 자동 저장만 된 칸은 새로고침 뒤 노란 표시가 사라지고 확인 없이 제출됐다.
      const items = answerItems(fields, stateRef.current, trackAiDraft);
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
  }, [readOnly, onSave, fields, trackAiDraft]);

  // [PW-1464] §4.7 「저장됨 HH:MM」은 3초 뒤, §4.2.1 「입력 완료 — …」는 2.5초 뒤 사라진다.
  useEffect(() => {
    if (!selfReview || !autoSavedAt) return undefined;
    const timer = setTimeout(() => setAutoSavedAt(null), 3000);
    return () => clearTimeout(timer);
  }, [selfReview, autoSavedAt]);
  useEffect(() => {
    if (!selfReview || !krSaved) return undefined;
    const timer = setTimeout(() => setKrSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [selfReview, krSaved]);

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

  const toItems = () => answerItems(fields, state, trackAiDraft);

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
    (f) => f.type !== 'rating' && !state[f.key].textAnswer.trim() && !pendingDraft[f.key],
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
      if (!only) setDraftDoneAll(true);
      setDraftSources((prev) => {
        const next = { ...prev };
        for (const d of drafted) {
          const f = fields[d.index];
          if (f && d.textAnswer?.trim()) next[f.key] = Array.isArray(d.sources) ? d.sources : [];
        }
        return next;
      });
      if (draftNeedsApply) {
        setPendingDraft((prev) => {
          const next = { ...prev };
          for (const d of drafted) {
            const f = fields[d.index];
            if (f && d.textAnswer?.trim()) next[f.key] = d.textAnswer;
          }
          return next;
        });
        return;
      }
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

  // TC-063/134: 제출 시 미입력 항목 자동 스크롤·빨강 강조(훅은 위에서 선언).
  // 척도는 점수(사유 필수면 사유까지), 서술은 글. 체크 항목은 비어도 제출된다(서버 판정과 같다).
  const isIncomplete = (f) => {
    if (f.type === 'rating')
      return (
        state[f.key].score == null ||
        (f.requiresRationale && !state[f.key].rationale.trim())
      );
    if (f.type === 'checkbox') return false;
    return !state[f.key].textAnswer.trim();
  };
  // [PW-2067] 작성 진행 «n/m»·남은 칸은 체크 항목도 센다 — 하나 이상 골라야 «작성»(커트 2026-10-20).
  // 단 비운 체크는 제출을 막지 않는다(위 isIncomplete) — 동료 «함께 일하고 싶다»처럼 안 고른 것이
  // «아니오»인 항목이 있어서다(커트 2026-10-20, PW-2067 결정 가). 선택지 없는 옛 항목은 점수 칸 1/0 이다.
  const isUnanswered = (f) => {
    if (f.type !== 'checkbox') return isIncomplete(f);
    return filledOptions(f).length > 0
      ? selectedOptions(state[f.key]).length === 0
      : state[f.key].score !== 1;
  };
  const missingFields = fields.filter(isUnanswered);
  const filled = fields.length - missingFields.length;
  const hasBlocking = fields.some(isIncomplete);
  const isAiPending = (f) => aiStateOf(f)?.tone === 'unconfirmed';
  const hasAiPending = fields.some(isAiPending);
  // [PW-2082] §4.8b 「미작성 항목 보기」가 도는 칸 — 빈 칸, 없으면 확인하지 않은 AI 초안 칸.
  const navFields = missingFields.length ? missingFields : fields.filter(isAiPending);
  // [PW-1464] §4.4a — 활동 데이터가 하나도 없으면 전체·항목별 AI 초안 단추를 끈다.
  const aiOff = aiDraftDisabledReason || (selfReview && noActivityData ? L.actNoData : null);
  // [PW-1464] §4.8a 서술 칸 입력 상태 — 아무것도 안 쓴 처음(회색) / 다른 칸을 쓴 뒤 남은 칸(주황) / 쓴 칸(흰색).
  // [PW-1889] 칸 바탕이 회색이 되어 쓴 칸의 흰색은 is-filled 로 칠한다.
  const anyAnswered = fields.some(
    (f) => state[f.key].textAnswer.trim() || state[f.key].score != null,
  );
  const inputStateClass = (f) => {
    if (!selfReview || readOnly) return '';
    if (state[f.key].textAnswer.trim()) return ' is-filled';
    return anyAnswered ? ' is-pending' : ' is-blank';
  };
  /**
   * [PW-2082] §4.8b — 그 칸을 화면 가운데로 옮기고 포커스를 준다. 서술은 입력칸, 점수를 안 고른
   * 척도는 첫 점수 버튼, 사유만 빈 척도는 사유 칸, 체크는 첫 선택지.
   */
  const jumpToField = (f) => {
    const el = fieldRefs.current[f.key];
    if (!el) return;
    navCursor.current = f.key;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    let target = null;
    if (f.type === 'rating') {
      target = state[f.key].score == null
        ? el.querySelector('.evm-score-btns button:not(:disabled)')
        : el.querySelector('textarea:not(:disabled)');
    } else if (f.type === 'checkbox') {
      target = el.querySelector('input:not(:disabled)');
    } else {
      target = el.querySelector('textarea:not(:disabled)');
    }
    (target || el.querySelector('button, textarea, input'))?.focus({ preventScroll: true });
  };
  // 누를 때마다 지난번 칸의 «다음» 칸으로, 끝에서는 처음으로.
  const jumpToNextMissing = () => {
    if (!navFields.length) return;
    const at = navFields.findIndex((f) => f.key === navCursor.current);
    jumpToField(navFields[(at + 1) % navFields.length]);
  };
  const handleSubmitClick = () => {
    // 빈 칸이 먼저다 — 다 채운 뒤에야 노란 칸(PW-1614)으로 안내한다.
    const inc = fields.find(isIncomplete) || fields.find(isAiPending);
    if (inc) {
      setTriedSubmit(true);
      jumpToField(inc);
      return;
    }
    // [PW-1464] §4.2.1 — 달성률을 안 넣은 KR 이 있으면 묻고, 확인하면 그대로 제출한다(막지 않는다).
    if (selfReview && krUnfilledCount > 0) {
      setKrAsk(true);
      return undefined;
    }
    return submitNow();
  };
  // [PW-967·PW-1007] 제출 약속을 돌려주면 [제출](공용 `Button`)이 끝날 때까지 스스로 잠근다 —
  // 결과를 안 기다려 두 번 누르면 두 번 나갔다. 실패하면 풀려 다시 누를 수 있다(알림은 화면이 띄운다).
  // [PW-2082] §4.8b — 서버가 빈 칸으로 거절하면(화면 판정과 어긋남) 제출 시도 뒤 모양(빨강)을 그린다.
  const submitNow = () =>
    onSubmit
      ? Promise.resolve(onSubmit(toItems())).catch((err) => {
          setTriedSubmit(true);
          throw err;
        })
      : undefined;

  // [PW-1464] §4.2 셀프 리뷰 활동 요약(1:1 · 받은 피드백 · 스니핏 · OKR 과 KR 달성률 입력).
  // [PW-2064] 2단이면 왼쪽 근거 패널에, 아니면 종전처럼 폼 위에 놓인다.
  const activityNode =
    !submitted &&
    (selfReview ? activitySummary != null : activitySummary || krList.length > 0)
      ? (() => {
        const failed = activityFailed || {};
        const allBlocks = activitySummary
          ? [
              { key: 'oneOnOne', icon: <UsersIcon size={14} />, label: L.actOneOnOne, items: activitySummary.oneOnOne, emptyText: L.actOneOnOneEmpty },
              { key: 'feedback', icon: <ChatIcon size={14} />, label: L.actFeedback, items: activitySummary.receivedFeedback, emptyText: L.actFeedbackEmpty },
              { key: 'snippets', icon: <NoteIcon size={14} />, label: L.actSnippets, items: activitySummary.snippets, emptyText: L.actSnippetsEmpty },
            ]
          : [];
        // [PW-1464] 셀프 리뷰는 칸을 늘 그리고 비면 «없다»를, 못 불러왔으면 그 사실을 말한다(§4.2).
        const blocks = selfReview
          ? allBlocks.map((b) => ({
              ...b,
              items: Array.isArray(b.items) ? b.items : [],
              emptyText: failed[b.key] ? L.actLoadFailed : b.emptyText,
            }))
          : allBlocks.filter((b) => Array.isArray(b.items) && b.items.length > 0);
        if (blocks.length === 0 && krList.length === 0) return null;
        return (
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
                    {b.items.length === 0 && (
                      <div className="evm-activity-item is-empty" data-testid={`evm-activity-${b.key}-empty`}>
                        {b.emptyText}
                      </div>
                    )}
                  </div>
                ))}
                {selfReview && krList.length === 0 && (
                  <div className="evm-activity-block" data-testid="evm-activity-okr">
                    <div className="evm-activity-block-title"><TargetIcon size={14} /><span>{L.actOkrTitle}</span></div>
                    <div className="evm-activity-item is-empty" data-testid="evm-activity-okr-empty">
                      {failed.okr ? L.actLoadFailed : L.actOkrEmpty}
                    </div>
                  </div>
                )}
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
                    {!selfReview && krUnfilledCount > 0 && (
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
              {selfReview && noActivityData && (
                <div className="evm-activity-note" data-testid="evm-activity-nodata">
                  {L.actNoData}
                </div>
              )}
              {L.actPeriodNote && (
                <div className="evm-activity-note" data-testid="evm-activity-period-note">
                  {L.actPeriodNote}
                </div>
              )}
            </section>
        );
      })()
      : null;
  // [PW-2064] member policy §4.11 ② — 셀프는 2단, 동료는 셀프 참조(셀프 공개)가 있을 때만 2단, 상향은 1단.
  const evidenceNode =
    selfReference || activityNode ? (
      <>
        {selfReference && <SelfReferencePanel reference={selfReference} L={L} />}
        {activityNode}
      </>
    ) : null;
  const twoPane = !!evidenceNode && (selfReview || !!selfReference);
  const evidenceTitle = selfReference ? L.evidencePeerTitle : L.evidenceSelfTitle;

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

  // [PW-2064] 입력 영역 — 작성 진행 · 구분선 · AI 초안 · 항목 · 하단 제출 바. 2단이면 오른쪽 칸이다.
  const formBody = (
    <>
      {!submitted && fields.length > 0 && (
        <ReviewProgress
          fields={fields}
          isUnanswered={isUnanswered}
          isIncomplete={isIncomplete}
          tried={triedSubmit}
          onJump={jumpToField}
          L={L}
        />
      )}

        {/* [PW-1464] §4.2.0 참고 영역과 작성 영역의 경계 */}
        {selfReview && !submitted && (
          <div className="evc-list">
            <div className="evm-write-divider" data-testid="evm-write-divider">
              <span>{L.writeDivider}</span>
            </div>
          </div>
        )}

        {/* [PW-1464] §4.3 AI 초안 카드 — 전체 생성 단추가 하단 바에서 여기로 온다. */}
        {selfReview && onAiDraft && !readOnly && (
          <div className="evc-list">
            <section className="evc-card evm-ai-card" data-testid="evm-ai-card">
              <div>
                <div className="evm-ai-card-title" data-testid="evm-ai-card-title">
                  <SparkleIcon size={15} />
                  <span>{fill(L.aiCardTitle, { period: aiPeriod || L.aiCardNoPeriod })}</span>
                </div>
                <div className="evm-ai-card-sub">{L.aiCardSub}</div>
              </div>
              <div className="evc-card-buttons">
                {aiOff && (
                  <span className="evm-autosave" data-testid="evm-ai-draft-reason">
                    {aiOff}
                  </span>
                )}
                <button
                  type="button"
                  className="evc-btn is-ghost"
                  disabled={!!draftBusy || emptyTextFields.length === 0 || !!aiOff}
                  onClick={() => handleAiDraft()}
                  data-testid="evm-ai-draft"
                >
                  {draftBusy === 'all' ? (
                    L.aiDrafting
                  ) : draftDoneAll ? (
                    <>
                      <CheckCircleIcon size={15} />
                      {L.aiDraftDone}
                    </>
                  ) : (
                    <>
                      <SparkleIcon size={15} />
                      {L.aiDraft}
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>
        )}

        <div className="evc-list">
          {sections.map((sec) => (
            <section className="evc-card" key={sec.title} data-testid={`evm-section-${sec.title}`}>
              <h3 className="evc-card-name evm-section-title">{sec.title}</h3>
              {/* [PW-1464] §4.0 역량 섹션 머리 — 관리자가 정한 역량 항목을 참고할 수 있다는 표시 */}
              {selfReview && sec.fields.some((f) => categoryKind(f.category) === 'competency') && (
                <p className="evm-competency-ref" data-testid="evm-competency-ref">
                  <NoteIcon size={13} />
                  <span>{L.competencyRefBadge}</span>
                </p>
              )}
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
                              disabled={readOnly}
                              onClick={() =>
                                // [PW-1464] §4.5 셀프 리뷰는 같은 점수를 다시 누르면 선택을 푼다.
                                setField(f.key, {
                                  score: selfReview && state[f.key].score === n ? null : n,
                                })
                              }
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
                        disabled={readOnly}
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
                          <OptionChoice
                            key={o.id}
                            multiple={!!f.allowMultiple}
                            label={o.label}
                            name={`evm-opt-${f.key}`}
                            checked={selectedOptions(state[f.key]).includes(o.id)}
                            disabled={readOnly}
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
                        ))}
                      </div>
                    ) : (
                      <Checkbox
                        className="evl-promo-row"
                        inputClassName="dp-check-input"
                        checked={state[f.key].score === 1}
                        disabled={readOnly}
                        onChange={(e) => setField(f.key, { score: e.target.checked ? 1 : 0 })}
                        data-testid={`evm-check-${f.key}`}
                        label={<span>{f.label}</span>}
                      />
                    )
                  ) : (
                    <>
                      <textarea
                        className={`evm-textarea${triedSubmit && (isIncomplete(f) || isAiPending(f)) ? ' is-invalid' : ''}${aiStateOf(f) ? ` is-ai-${aiStateOf(f).tone}` : ''}${inputStateClass(f)}`}
                        rows={4}
                        value={state[f.key].textAnswer}
                        placeholder={f.placeholder}
                        disabled={readOnly}
                        onChange={(e) => setField(f.key, { textAnswer: e.target.value })}
                        data-testid={`evm-text-${f.key}`}
                      />
                      {/* [PW-1460] 항목별 AI 초안 — 빈 칸에만. 이미 쓴 칸은 덮어쓰지 않는다. */}
                      {onAiDraft && !readOnly && aiDraftUnavailable && !state[f.key].textAnswer.trim() && (
                        <p className="evm-ai-draft-unavailable" data-testid={`evm-ai-draft-unavailable-${f.key}`}>
                          {aiDraftUnavailable}
                        </p>
                      )}
                      {onAiDraft && !readOnly && !aiDraftUnavailable && !state[f.key].textAnswer.trim() && !pendingDraft[f.key] && (
                        <button
                          type="button"
                          className="evc-btn is-ghost evm-ai-item-draft"
                          disabled={!!draftBusy || !!aiOff}
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
                          <button
                            type="button"
                            className="evm-ai-draft-retry"
                            disabled={!!draftBusy}
                            onClick={() => handleAiDraft(f)}
                            data-testid={`evm-ai-draft-retry-${f.key}`}
                          >
                            {L.aiDraftRetry}
                          </button>
                        </p>
                      )}
                      {pendingDraft[f.key] && !readOnly && (
                        <div className="evm-ai-draft-pending" data-testid={`evm-ai-pending-${f.key}`}>
                          <span className="evm-ai-draft-badge">{L.aiDraftUnconfirmed}</span>
                          <p className="evm-ai-draft-pending-text">{pendingDraft[f.key]}</p>
                          <AiDraftSources sources={draftSources[f.key]} L={L} testId={`evm-ai-sources-${f.key}`} />
                          <div className="evm-ai-draft-bar is-unconfirmed">
                            <button
                              type="button"
                              className="evm-ai-draft-confirm"
                              onClick={() => {
                                setField(f.key, { textAnswer: pendingDraft[f.key] });
                                dropPendingDraft(f.key);
                              }}
                              data-testid={`evm-ai-use-${f.key}`}
                            >
                              {L.aiDraftUse}
                            </button>
                            <button
                              type="button"
                              className="evm-ai-draft-confirm"
                              onClick={() => dropPendingDraft(f.key)}
                              data-testid={`evm-ai-fold-${f.key}`}
                            >
                              {L.aiDraftFold}
                            </button>
                          </div>
                        </div>
                      )}
                      {aiStateOf(f) && (
                        <div
                          className={`evm-ai-draft-bar is-${aiStateOf(f).tone}`}
                          data-testid={`evm-ai-state-${f.key}`}
                          data-state={aiStateOf(f).tone}
                        >
                          <span className="evm-ai-draft-badge">{aiStateOf(f).label}</span>
                          {aiStateOf(f).tone === 'unconfirmed' && !readOnly && (
                            <button
                              type="button"
                              className="evm-ai-draft-confirm"
                              onClick={() => setField(f.key, { isConfirmed: true })}
                              data-testid={`evm-ai-confirm-${f.key}`}
                            >
                              {L.aiDraftConfirm}
                            </button>
                          )}
                          <AiDraftSources sources={draftSources[f.key]} L={L} testId={`evm-ai-sources-${f.key}`} />
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
            <p className="evx-notice is-error" data-testid="evm-ai-error">
              {L.aiError}
            </p>
          </div>
        )}

        {!submitted && draftError === 'all' && (
          <div className="evc-list">
            <p className="evx-notice is-error" data-testid="evm-ai-draft-error">
              {L.aiDraftError}
              <button
                type="button"
                className="evm-ai-draft-retry"
                disabled={!!draftBusy}
                onClick={() => handleAiDraft()}
                data-testid="evm-ai-draft-retry"
              >
                {L.aiDraftRetry}
              </button>
            </p>
          </div>
        )}

        {!submitted && !selfReview && saveError && (
          <div className="evm-save-error" role="alert" data-testid="evm-save-error">
            {L.saveError}
          </div>
        )}
        {!readOnly && (
          <div className="evm-submit-bar">
            {/* [PW-2082] §4.8b — 남은 칸 수(amber) · 제출을 막았으면 빨강 · 다 썼으면 초록. */}
            <span className="evm-progress">
              {triedSubmit && hasBlocking ? (
                <span className="evm-incomplete-warn" data-testid="evm-incomplete-warn">
                  {fill(L.missingCount, { count: missingFields.length })}
                </span>
              ) : triedSubmit && hasAiPending ? (
                <span className="evm-incomplete-warn" data-testid="evm-ai-pending-warn">
                  {L.aiDraftPendingCount
                    ? fill(L.aiDraftPendingCount, { count: fields.filter(isAiPending).length })
                    : L.aiDraftPendingWarn}
                </span>
              ) : missingFields.length ? (
                <span className="evm-remaining" data-testid="evm-remaining">
                  {fill(L.remaining, { count: missingFields.length })}
                </span>
              ) : (
                <span className="evm-all-done" data-testid="evm-all-done">
                  <CheckCircleIcon size={14} />
                  {L.allDone}
                </span>
              )}
              {navFields.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={jumpToNextMissing}
                  data-testid="evm-show-missing"
                >
                  {L.showMissing}
                </Button>
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
              {onAiDraft && !selfReview && aiDraftDisabledReason && (
                <span className="evm-autosave" data-testid="evm-ai-draft-reason">
                  {aiDraftDisabledReason}
                </span>
              )}
              {onAiDraft && !selfReview && aiDraftAllButton && (
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
                      // [PW-1966] 직접 누른 저장만 알린다 — 자동 저장(30초)마다 알리면 시끄럽다.
                      onSaveSuccess?.();
                    })
                    .catch(() => {
                      setSaveError(true);
                      onSaveError?.();
                    })
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
    </>
  );

  return (
    <div className="evc-root evm-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          {cycle?.name && <p className="evc-summary">{cycle.name}</p>}
        </div>
      </header>

      {headerSlot}

      {/* [PW-1464] §4.7 셀프 리뷰의 임시저장 실패는 위쪽 빨간 띠로 알린다. */}
      {selfReview && !readOnly && saveError && (
        <div className="evc-list">
          <div className="evm-save-error" role="alert" data-testid="evm-save-error">
            {L.saveError}
          </div>
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
      {!twoPane && evidenceNode && <div className="evc-list">{evidenceNode}</div>}

      {/* [PW-1460] spec §10 — 이 기간 스니핏·OKR 이 비었거나 AI 가 일부 항목을 못 채웠다. */}
      {!submitted && (dataShortage || draftShort) && (
        <div className="evc-list">
          <p className="evx-notice is-warn" data-testid="evm-data-shortage">
            {L.dataShortage}
          </p>
        </div>
      )}

      {submitted && !(selfReview && doneSteps) && (
        <div className="evc-list">
          <p className="evx-notice is-success" data-testid="evm-submitted">
            <CheckCircleIcon size={16} />
            <span>{L.submittedBanner}</span>
          </p>
        </div>
      )}

      {/* [PW-1464] §4.9 · §6.1 셀프 리뷰 제출 완료 화면 — 제출한 답은 아래에 읽기 전용으로 남는다. */}
      {submitted && selfReview && doneSteps && (() => {
        const next = doneSteps.find((st) => !st.done);
        return (
          <div className="evc-list">
            <section className="evc-card evm-done" data-testid="evm-done">
              <div className="evm-done-icon"><CheckCircleIcon size={32} /></div>
              <h2 className="evm-done-title">{L.doneTitle}</h2>
              <p className="evm-done-body">
                {next ? fill(L.doneBodyNext, { next: next.label }) : L.doneBody}
              </p>
              {doneSteps.length > 0 && (
                <div className="evm-done-steps" data-testid="evm-done-steps">
                  <div className="evm-done-steps-title">{L.doneStepsTitle}</div>
                  {doneSteps.map((st, i) => (
                    <div
                      className={`evm-done-step${st.done ? ' is-done' : ''}`}
                      key={st.key}
                      data-testid={`evm-done-step-${st.key}`}
                      data-done={st.done ? 'true' : 'false'}
                    >
                      <span className="evm-done-step-mark">
                        {st.done ? <CheckCircleIcon size={14} /> : i + 1}
                      </span>
                      <span>{st.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {(onGoPeerReview || onGoMyEval) && (
                <div className="evm-done-actions">
                  {onGoPeerReview && (
                    <Button className="evc-btn is-primary" onClick={onGoPeerReview} data-testid="evm-done-peer">
                      {L.donePeerReview}
                      <ArrowRightIcon size={14} />
                    </Button>
                  )}
                  {onGoMyEval && (
                    <Button className="evc-btn" onClick={onGoMyEval} data-testid="evm-done-my-eval">
                      {L.doneMyEval}
                    </Button>
                  )}
                </div>
              )}
            </section>
          </div>
        );
      })()}

      {closed && !submitted && (
        <div className="evc-list">
          <p className="evx-notice is-warn" data-testid="evm-closed">
            {L.closedNotice}
          </p>
        </div>
      )}

      {twoPane ? (
        <div className="evl-2pane evm-2pane">
          <aside className="evl-evidence" data-testid="evm-evidence">
            <h3 className="evc-card-name">{evidenceTitle}</h3>
            {evidenceNode}
          </aside>
          <div className="evl-form">{formBody}</div>
        </div>
      ) : (
        formBody
      )}

      {krAsk && (
        <ConfirmModal
          title={L.krUnfilledConfirm}
          confirmLabel={L.submit}
          cancelLabel={L.cancel}
          onCancel={() => setKrAsk(false)}
          onConfirm={() => {
            setKrAsk(false);
            submitNow();
          }}
          testId="evm-kr-unfilled-confirm"
        />
      )}
    </div>
  );
}

/** [PW-1920] 「+N」 없이 보이는 배지 수. */
const AI_SOURCES_VISIBLE = 3;
/** 창 안 묶음 순서와 이름표 키. `kind` 가 없는 옛 출처는 태그 글자(S·F·O·K)로 가른다. */
const AI_SOURCE_GROUPS = [
  { kind: 'snippet', prefix: 'S', labelKey: 'aiDraftSourceGroupSnippet' },
  { kind: 'feedback', prefix: 'F', labelKey: 'aiDraftSourceGroupFeedback' },
  { kind: 'oneOnOne', prefix: 'O', labelKey: 'aiDraftSourceGroupOneOnOne' },
  { kind: 'okr', prefix: 'K', labelKey: 'aiDraftSourceGroupOkr' },
];
const aiSourceKind = (src) =>
  src.kind ?? AI_SOURCE_GROUPS.find((g) => src.key?.startsWith(g.prefix))?.kind;

/**
 * [PW-1844] AI 초안 출처 배지 — spec-eval-cycle §4.3.2·§4.3.4, member policy §4.3.1 「📎 소스명」.
 * 누르면 원본(스니핏·원온원·피드백·OKR)을 새 탭으로 연다 — 쓰던 초안을 잃지 않게(§4.3.1 「모달 또는 새 탭」).
 * 출처가 없으면 아무것도 그리지 않는다.
 *
 * [PW-1920] 많으면 앞 3개(서버가 돌려준 순서)만 보이고 나머지는 「+N」으로 접는다. 「+N」은 출처 전부를
 * 종류별로 묶은 작은 창을 띄운다(커트가 고른 시안 — 창에는 앞 3개도 함께 든다). 창은 포털로 떠서 아래 항목을
 * 밀지 않고, 아래가 좁으면 위로 뒤집힌다(AnchoredLayer). 바깥 누르기·Esc 로 닫힌다.
 */
function AiDraftSources({ sources, L, testId }) {
  const [open, setOpen] = useState(false);
  const moreRef = useRef(null);
  const panelRef = useRef(null);
  useDismissLayer(() => setOpen(false), panelRef, moreRef, open);
  if (!sources || sources.length === 0) return null;
  const hidden = sources.length - AI_SOURCES_VISIBLE;
  const groups = AI_SOURCE_GROUPS.map((g) => ({
    ...g,
    items: sources.filter((src) => aiSourceKind(src) === g.kind),
  })).filter((g) => g.items.length > 0);
  return (
    <span className="evm-ai-sources" role="list" aria-label={L.aiDraftSources} data-testid={testId}>
      {sources.slice(0, AI_SOURCES_VISIBLE).map((src) => (
        <a
          key={src.key}
          role="listitem"
          className="evm-ai-source"
          href={src.href}
          target="_blank"
          rel="noopener noreferrer"
          title={src.title || src.label}
          data-testid="evm-ai-source"
        >
          <PaperclipIcon size={11} />
          {src.label}
        </a>
      ))}
      {hidden > 0 && (
        <button
          ref={moreRef}
          type="button"
          role="listitem"
          className="evm-ai-source"
          aria-haspopup="true"
          aria-expanded={open}
          aria-label={fill(L.aiDraftSourcesMore, { count: hidden })}
          onClick={() => setOpen((v) => !v)}
          data-testid="evm-ai-sources-more"
        >
          +{hidden}
        </button>
      )}
      {open && hidden > 0 && (
        <AnchoredLayer
          anchorRef={moreRef}
          panelRef={panelRef}
          width={340}
          maxHeight={320}
          className="evm-ai-sources-pop"
          role="group"
          aria-label={L.aiDraftSources}
          data-testid="evm-ai-sources-pop"
        >
          {groups.map((g) => (
            <div key={g.kind} data-testid={`evm-ai-sources-group-${g.kind}`}>
              <div className="evm-ai-sources-pop-head">
                {L[g.labelKey]} {g.items.length}
              </div>
              {g.items.map((src) => (
                <a
                  key={src.key}
                  className="evm-ai-sources-pop-item"
                  href={src.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={src.title || src.label}
                  data-testid="evm-ai-sources-pop-item"
                >
                  {src.preview ? (
                    <>
                      {src.meta && <span className="evm-ai-sources-pop-meta">{src.meta}</span>}
                      <span className="evm-ai-sources-pop-preview">{src.preview}</span>
                    </>
                  ) : (
                    <span className="evm-ai-sources-pop-preview">{src.label}</span>
                  )}
                </a>
              ))}
            </div>
          ))}
        </AnchoredLayer>
      )}
    </span>
  );
}
