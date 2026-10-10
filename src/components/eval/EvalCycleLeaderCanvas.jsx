import { useState, useMemo, useRef, useEffect } from 'react';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import Radio from '../shared/Radio.jsx';
import { FieldInfo, FieldVisibility } from './evalFieldMeta.jsx';
import EvalNoteBlock, { EvalMarkdownLite } from './EvalNoteBlock.jsx';
import { isNoteItem } from './evalTemplateItemModel.js';
import { AlertIcon, LockIcon, ZapIcon } from './evalIcons.jsx';
import { fieldsShape, reseedKeepingEdits } from './reseedAnswers.js';
import EvalLeaderEvidenceSignals from './EvalLeaderEvidenceSignals.jsx';
import EvalLeaderPriorRounds from './EvalLeaderPriorRounds.jsx';
import EvalLeaderPeerSummary from './EvalLeaderPeerSummary.jsx';

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
  // PW-1017 제출 후 수정(기획 §5.11) — 확정 전에는 고쳐서 다시 낸다, 확정 뒤에는 잠긴다.
  resubmit: '다시 제출',
  lockedNotice: '',
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
  // leader §5.2.1 — 최종 등급은 리더가 정한다는 인라인 안내(AI 등급 제안 없음)
  gradeDecisionNote: '',
  // leader §12.1 L2(켠 사이클) — 등급 카드 머리 캡션. 끈 사이클은 calibOffGradeNote
  gradeCaptionCalibOn: '',
  // leader §12.1 L1 — 제출 바 캡션(켠/끈 사이클). 끈 사이클은 굵게·주황
  submitCaptionCalibOn: '',
  submitCaptionCalibOff: '',
  // leader §5.4 — 점수만 고르고 사유를 비운 항목이 있으면 제출 전에 묻는다(막지는 않는다).
  // {first} = 첫 항목 이름, {count} = 나머지 수
  rationaleMissingOne: '',
  rationaleMissingMany: '',
  rationaleMissingContinue: '계속 제출',
  rationaleMissingCancel: '취소',
  // leader §5.5 — 섹션 접기/펼치기 · 역량 섹션 안내
  sectionCollapse: '접기',
  sectionExpand: '펼치기',
  competencyFrameNote: '',
  // leader §5.5.1 — 강점·보완·성장 고정 정의(템플릿 설명이 없을 때 ⓘ 로)
  strengthsHint: '',
  improvementsHint: '',
  growthDemoHint: '',
  // leader §5.9 — 자동 임시저장 표시. {time} = HH:MM
  autoSaved: '저장됨 {time}',
  autoSaveFailed: '임시저장 실패',
  // leader §5.10·§12.1 L5 — 제출 완료 화면
  doneTitle: '제출이 완료되었습니다.',
  doneCalibOnNote: '',
  backToTeam: '팀원 목록으로',
  goCalibration: '캘리브레이션 확인',
  // leader §5.12 — 작성 중 이탈 확인
  leaveTitle: '작성 중인 내용이 있습니다. 나가시겠습니까?',
  leaveSave: '임시저장 후 나가기',
  leaveDiscard: '저장 없이 나가기',
  leaveStay: '계속 작성',
  // PW-486 캘리브레이션을 끈 사이클 — 조정 단계가 없다는 사실을 채점 «전에» 알린다.
  // 「뒤에서 조정된다」고 믿고 매긴 등급과 「이게 최종」임을 알고 매긴 등급은 다르다.
  calibOffGradeNote:
    '이 사이클은 캘리브레이션을 사용하지 않습니다 — 지금 고른 등급이 그대로 최종 등급이 됩니다.',
  calibOffSubmittedNote: '제출한 등급이 최종 등급으로 확정되었습니다.',
  // PW-1045 위원회가 이 팀원의 등급을 바꿨다 — 등급 칸만 잠그고 까닭을 카드 안에 적는다.
  gradeLockedNote: '',
  // PW-1594 하향 차수(리더 정책 §5.13). `{name}`·`{round}`·`{next}`·`{at}`·`{date}` 자리를 채운다.
  roundTitle: '{name} — 하향 리뷰 · {round}차',
  gradeRoundNote: '이 등급은 {next}차가 제출되면 참고 등급이 됩니다',
  priorTitle: '앞 차수 리뷰',
  priorHead: '{round}차 · {name} · 제출 {at}',
  priorUnknownEvaluator: '—',
  priorSkipped: '{round}차 — 평가자 없이 건너뛰었습니다',
  priorOpenedByHr: 'HR 이 {round}차 제출 없이 이 차수를 열었습니다 ({date})',
  priorPending: '{round}차 리뷰가 아직 제출되지 않았습니다.',
  priorLate: '늦게 제출됨',
  priorEdited: '제출 뒤 수정됨 · {at}',
  priorNoAnswers: '작성된 항목이 없습니다.',
  priorPrivateNote: '비공개 코멘트와 승진·보상 의견은 위원회·HR 에게만 전달되어 여기에 보이지 않습니다.',
  priorLoadFailed: '앞 차수 리뷰를 불러오지 못했습니다',
  priorRetry: '다시 시도',
  // spec-eval-cycle §4.2.2 B6 — 아래 제출 줄과 사유를 비운 칸 아래에 같은 문구.
  rationaleRequired: '점수 사유를 입력해 주세요.',
  save: '임시저장',
  submit: '제출하기',
  // category labels for evidence
  catWork: '업적',
  catCompetency: '역량',
  catStrengths: '강점',
  catImprovements: '보완점',
  catGrowthDemo: '성장',
  // [PW-1087] 평가지 성장 항목의 이름을 못 찾았을 때
  catGrowth: '성장',
  // [PW-1087] 점수 항목에 팀원이 적은 점수 근거 — 근거 칸에 본문 아래 붙인다
  evidenceRationaleLabel: '점수 근거',
  // F5 evidence + assessment
  peerEvidenceTitle: '동료 피드백 요약 (익명)',
  peerEvidenceEmpty: '제출된 동료 피드백이 없습니다.',
  // PW-1613 — 동료 피드백 요약(`peerSummary` 를 넘겼을 때)
  peerReviewerCount: '{count}명 작성',
  peerChunkWork: '업적 관련',
  peerChunkCompetency: '역량 관련',
  peerChunkSources: '원본 {count}개',
  peerChunkEmpty: '이 묶음에 해당하는 동료 답이 없습니다.',
  peerSummaryNone: '동료 피드백 요약이 아직 없습니다. [요약 만들기]를 누르면 AI 가 업적·역량별로 요약합니다.',
  peerSummaryGenerate: '요약 만들기',
  peerSummaryRefresh: '요약 새로고침',
  peerSummaryRetry: '다시 시도',
  peerSummaryFailed: '요약을 만들지 못했습니다. 원본은 아래에서 그대로 볼 수 있습니다.',
  peerSummaryGeneratedAt: '{at} 에 만든 요약',
  peerOriginalOpen: '원본 보기',
  peerOriginalSubmittedAt: '제출 {at}',
  peerOriginalNote: '동료가 제출한 원문입니다(AI 로 다듬기 전).',
  peerOriginalClose: '닫기',
  peerBelowMin: '응답 인원이 공개 기준보다 적은 질문 {count}개는 보이지 않습니다.',
  // PW-1461 leader §5.1.2 · spec §4.4-B — 지난 사이클 최종 등급 추이(최근 4회)
  historyTitle: '과거 평가 추이',
  historyEmpty: '지난 평가 이력이 아직 없습니다.',
  // PW-1214 근거 넷 (TC-EVAL-020)
  signalsPeriod: '평가 기간',
  signalsLoadFailed: '불러오지 못했습니다.',
  signalsOkrTitle: 'OKR 달성도',
  signalsOkrAverage: '팀원 입력 기준 OKR 평균 달성률',
  signalsOkrUnentered: '미입력',
  signalsOkrEmpty: '개인 OKR 이 없습니다.',
  signalsKrSelf: '팀원 입력',
  signalsKrSelfNone: '팀원 입력 없음',
  signalsKrNote: '달성 근거',
  signalsHealthTitle: '헬스체크 12주 추이',
  signalsHealthAverage: '12주 평균',
  signalsHealthEmpty: '헬스체크 기록이 없습니다.',
  signalsActionsTitle: '원온원 할 일 이행률',
  signalsActionsEmpty: '원온원 할 일이 없습니다.',
  signalsDone: '완료',
  signalsTotal: '전체',
  signalsSnippetTitle: '스니핏 활동량',
  signalsDays: '일',
  signalsRate: '작성률',
  // TC-046/047 상단고정(Freeze) 안내
  freezeNote: '헤더 프리즈 중 — 스크롤해도 상단 고정',
  // PW-1461 leader §5.3.1 — 위치 일시 토글. {position} = 템플릿 기본 위치 이름
  gradePosTop: '상단',
  gradePosBottom: '하단',
  gradePosFreeze: '상단고정',
  gradePosAria: '최종 등급 카드 위치',
  gradePosNote: '템플릿 기본 위치: {position} · 일시 변경은 본인 화면에만 적용',
  assessmentTitle: '승진 · 보상 · 비밀 코멘트',
  // TC-054 상위(위원회) 전용 섹션 배지 — 피평가자에게 노출되지 않음을 명시
  // PW-1461 leader §5.7 — 공개 대상 배지(호버 툴팁) · 빨간 안내
  committeeOnlyBadge: '상위 경영진·HR·캘리 위원회 전용',
  committeeOnlyTooltip: '상위 경영진, HR, 캘리브레이션 위원회에게만 공개됩니다.',
  committeeOnlyHint:
    '이 영역은 상위 경영진, HR, 캘리브레이션 위원회에만 공유됩니다. 피평가자 본인에게는 절대 공개되지 않습니다.',
  confidentialLabel: '캘리브레이션 위원회 전용 코멘트 (CONFIDENTIAL)',
  confidentialPh: '캘리브레이션 위원회에 전하고 싶은 의견',
  // PW-1461 leader §5.8 — 승진·보상 세 갈래 + 사유
  promoCompTitle: '승진 · 보상 고려',
  promotionStatusLabel: '승진 고려 여부',
  promotionRecommended: '대상임',
  promotionNotYet: '아직 아님',
  promotionDeferred: '판단 유보',
  promotionReasonLabel: '승진 판단 사유',
  promotionReasonPh:
    "예: '이번 기간 리드 역할 수행 및 OKR 초과 달성으로 승진 대상 추천', '직무 이동 1년 미만으로 아직 대상 아님 — 다음 사이클 재검토 예정', '이해관계자 피드백 확인 후 판단 예정'",
  compensationStatusLabel: '보상 조정 필요 수준',
  compensationUrgent: '시급한 조정 필요',
  compensationModerate: '어느 정도 필요',
  compensationMaintain: '현 상태 유지 적합',
  compensationReasonLabel: '보상 조정 사유',
  compensationReasonPh:
    "예: '현재 시장 대비 급여 낮음, 이탈 리스크 있어 즉각 조정 필요', '성과 우수하나 조정 주기상 다음 분기 검토 적합'",
  promotionReasonMissing:
    '승진 판단 사유를 남겨두면 위원회 검토 시 도움이 됩니다. 계속 제출하시겠습니까?',
  // TC-098 승진 요청서 4항목
  promoReqHistory: '① 평가 이력 요약 (과거 등급·성과)',
  promoReqBackground: '② 검토 배경·필요성',
  promoReqExamples: '③ 상위 레벨 역할 수행 사례',
  promoReqNotes: '④ 추가 사항',
  promoReqSubmit: '승진 요청서 제출',
  promoReqSaved: '제출됨',
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

// 점수 없이 사유만 쓴 항목도 보낸다 — 기획 leader §5.4 「점수 미선택 제출 허용」. 빼면 사유가 사라진다.
function itemsOf(fields, state) {
  return fields
    .filter(
      (f) =>
        state[f.key].textAnswer.trim() ||
        state[f.key].score != null ||
        (state[f.key].rationale || '').trim() ||
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
}

/** 자동 임시저장이 «바뀐 게 있나»를 가르는 값 — 보낼 항목과 등급. */
const snapshotOf = (items, grade) => JSON.stringify([items, grade ?? null]);

const fillLabel = (tpl, vars) =>
  String(tpl || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));

const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// 역량 구분 — 저장값(`competency`)이거나, 평가지 만들기에서 구분을 글자(「역량 (How)」)로 저장한 경우.
const isCompetencyCategory = (c) => c === 'competency' || /역량|competenc/i.test(String(c ?? ''));

// leader §5.5.1 — 성장 칸 종류별 고정 정의 라벨 키
const GROWTH_HINT_KEY = {
  strengths: 'strengthsHint',
  improvements: 'improvementsHint',
  growth_demonstrated: 'growthDemoHint',
};

// 하향(leader) 응답 폼 필드 도출 — 셀프와 동일 규칙. '최종 등급 결정' 섹션은
// 별도 등급/평가 UI 가 처리하므로 제외. 유형별 렌더는 responseType 로 결정.
// [PW-1072] 항목 제목(섹션 머리)은 `it.section` 이 있으면 그것을 쓴다. `category` 는 저장값
// (`work_achievement` 등)이라 답을 저장할 때 그대로 되돌려 보내야 하고, 화면에 옮긴 말은
// 앱이 `section` 으로 따로 싣는다. 없으면 종전대로 `category` 를 그린다.
function buildFields(template, L) {
  if (template && Array.isArray(template.items) && template.items.length) {
    return template.items
      .filter((it) => it.category !== '최종 등급 결정')
      .map((it) => {
        // [PW-602 ④] 설명 항목은 답을 받지 않는다 — 폼 필드가 아니라 «글»이다.
        // 아래에서 걸러 내므로 진행률·필수 검증이 자동으로 세지 않는다(불변식 ②).
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
          // 저장값(growthType)은 종전대로 비우고, 고정 정의 툴팁(§5.5.1)을 고를 때만 쓴다.
          growthKind: it.growthType ?? null,
          type,
          label: it.label,
          placeholder: it.label,
          section: it.section || it.category || '평가 항목',
          requiresRationale: !!it.requiresRationale,
          score: type === 'rating',
          description: it.description ?? null,
          // [PW-602 ③] 표시 방식(표시 안 함 / 툴팁 / 항목 아래 상시)을 실제로 따른다.
          // 개정 전에는 이 값이 화면에 닿지 않아 늘 툴팁이었다(§5.11-D).
          descriptionDisplay: it.descriptionDisplay || 'tooltip',
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
    growthKind: f.growthType,
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

// [PW-1087] 평가지로 쓴 성장 답은 앱이 답에 실어 준 평가지 항목 이름(`itemLabel`)을 쓴다.
// 평가지 없는 기본 폼 답은 칸 이름(강점·보완·성장)을, 그것도 없으면 구분 이름(「성장」)으로
// 채운다. 업적·역량은 종전 그대로다.
function evidenceLabel(a, L) {
  if (a.itemCategory === 'growth') {
    // [PW-882] 평가지 답에도 칸(`growthType`)이 찍히게 됐다 — 이름은 여전히 질문 이름이 먼저다.
    return a.itemLabel || L[EVIDENCE_GROWTH_KEY[a.growthType]] || L.catGrowth;
  }
  return L[EVIDENCE_CAT_KEY[a.itemCategory]] ?? a.itemCategory ?? '';
}

// 기본값을 렌더마다 새 배열로 만들면 «답이 새로 왔다»로 읽혀 다시 시드하는 렌더가 끝없이 돈다.
const NO_ANSWERS = [];

/** PW-1461 §5.8 세 갈래 — 저장값과 라벨 키. 화면은 라벨로만 그린다. */
const PROMOTION_CHOICES = [
  ['recommended', 'promotionRecommended'],
  ['not_yet', 'promotionNotYet'],
  ['deferred', 'promotionDeferred'],
];
const COMPENSATION_CHOICES = [
  ['urgent', 'compensationUrgent'],
  ['moderate', 'compensationModerate'],
  ['maintain', 'compensationMaintain'],
];
const GRADE_POSITIONS = ['top', 'bottom', 'freeze'];
const GRADE_POS_LABEL_KEY = { top: 'gradePosTop', bottom: 'gradePosBottom', freeze: 'gradePosFreeze' };

/**
 * 사이클 기간 한 줄 — `2025.01–06`(같은 해) · `2024.07–2025.06`. 숫자만 써서 로케일에 매이지 않는다.
 * 날짜가 없으면 사이클 이름으로 대신한다.
 */
function cyclePeriodLabel(p) {
  const ym = (d) => (typeof d === 'string' && /^\d{4}-\d{2}/.test(d) ? [d.slice(0, 4), d.slice(5, 7)] : null);
  const a = ym(p?.startDate);
  const b = ym(p?.endDate);
  if (!a && !b) return p?.cycleName ?? '';
  if (!a || !b) return (a ?? b).join('.');
  if (a[0] === b[0]) return a[1] === b[1] ? `${a[0]}.${a[1]}` : `${a[0]}.${a[1]}–${b[1]}`;
  return `${a[0]}.${a[1]}–${b[0]}.${b[1]}`;
}

/**
 * PW-1461 leader §5.1.2 — 과거 평가 추이. 점 하나 = 지난 사이클 하나(오래된 것부터, 호출부가 최근 4회).
 * 높이는 그 사이클 등급 수로 맞춘다(사이클마다 등급 수가 달라도 「맨 위·맨 아래」가 같은 높이).
 * 점 아래 칸에 등급 이름과 사이클 기간을 적는다 — 열 가운데가 점의 x 와 같다.
 */
function PastGradeTrend({ points, L }) {
  const n = points.length;
  const W = 240;
  const H = 72;
  const PAD = 10;
  const x = (i) => ((i + 0.5) / n) * W;
  const ratio = (p) =>
    p.gradeScore != null && p.gradeCount ? (p.gradeCount > 1 ? (p.gradeScore - 1) / (p.gradeCount - 1) : 1) : null;
  const y = (r) => H - PAD - r * (H - PAD * 2);
  const pts = points.map((p, i) => {
    const r = ratio(p);
    return r == null ? null : [x(i), y(r)];
  });
  const drawn = pts.filter(Boolean);
  const d = drawn.map(([px, py], i) => `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  return (
    <div className="evl-trend" data-testid="evl-trend">
      <svg
        className="evl-trend-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={L.historyTitle}
      >
        <line x1={0} x2={W} y1={y(1)} y2={y(1)} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 3" />
        <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 3" />
        {drawn.length > 1 && (
          <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {pts.map((pt, i) =>
          pt ? <circle key={points[i].cycleId ?? i} cx={pt[0]} cy={pt[1]} r={4} fill="currentColor" data-testid="evl-trend-dot" /> : null,
        )}
      </svg>
      <ol className="evl-trend-labels" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {points.map((p, i) => (
          <li key={p.cycleId ?? i} data-testid="evl-trend-point">
            <span className="evl-trend-grade">{p.gradeLabel}</span>
            <span className="evl-trend-period" title={p.cycleName}>{cyclePeriodLabel(p)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function EvalCycleLeaderCanvas({
  evaluateeName,
  cycle,
  selfAnswers = [],
  leaderAnswers = NO_ANSWERS,
  peerAnswers = [],
  /**
   * PW-1613 — 동료 피드백 요약(업적·역량 AI 요약 + 동료별 원본 보기). 모양은 `EvalLeaderPeerSummary`.
   * 넘기면 위 `peerAnswers` 원문 나열 대신 이것을 그린다. 넘기지 않으면 종전 렌더 그대로.
   */
  peerSummary = null,
  /** PW-1613 — [요약 만들기]·[요약 새로고침]·[다시 시도]. 없으면 버튼을 그리지 않는다. */
  onPeerSummaryGenerate,
  /**
   * PW-1461 — 과거 평가 추이(오래된 것부터). 점: { cycleId, cycleName, startDate, endDate, gradeLabel,
   * gradeScore, gradeCount }. 비면 `labels.historyEmpty`.
   */
  pastGrades = [],
  assessment = null,
  gradeKey: initialGrade = null,
  gradeOptions = DEFAULT_GRADES,
  template = null,
  active = true,
  submitted = false,
  /**
   * PW-1017 — 작성 칸을 잠그는가. 넘기지 않으면 종전처럼 `submitted` 를 따른다(제출하면 잠김).
   * 넘기면 이 값이 정한다: 제출했어도 `false` 면 고쳐서 [다시 제출]할 수 있고, `true` 면
   * 부가 평가·승진 요청서까지 잠기고 `labels.lockedNotice` 를 띄운다.
   */
  locked,
  /**
   * PW-1045 — 등급 칸만 잠그는가. 캘리브레이션 위원회가 이 팀원의 등급을 한 번이라도 바꿨으면
   * 호출부가 `true` 를 넘긴다: 본문은 `locked` 대로 고쳐 다시 낼 수 있지만 등급 버튼은 눌리지
   * 않고, `labels.gradeLockedNote` 가 있으면 등급 카드 안에 띄운다. 기본 `false` — 종전과 같다.
   */
  gradeLocked = false,
  /**
   * PW-486 — 이 사이클이 캘리브레이션(등급 조정) 단계를 쓰는가.
   * 판정 축은 `eval_cycles.review_sequence.enabled.calibration` 이고, **값이 없으면 켠 것**
   * 이다(호출부가 그렇게 넘긴다). 기본 `true` 라 켠 사이클의 렌더는 종전과 동일하다.
   */
  calibrationEnabled = true,
  // TC-149 피평가자 셀프 미제출 시 안내(게이팅 아님 — 작성은 허용).
  selfSubmitted = true,
  /**
   * PW-1214 — 근거 넷(OKR 달성도·헬스 12주 추이·원온원 할 일 이행률·스니핏 활동량).
   * 넘기지 않으면 그 칸을 그리지 않는다(종전 렌더 그대로). 블록이 null 이면 «불러오지 못했습니다».
   */
  evidenceSignals = null,
  /**
   * PW-1594 — 하향 차수(리더 정책 §5.13). `round` 는 이 화면의 차수, `rounds` 는 사이클의 차수 N.
   * `rounds` 가 2 이상이면 머리를 `labels.roundTitle`(`{name}`·`{round}`)로 쓴다. 기본 1/1 — 종전 그대로.
   */
  round = 1,
  rounds = 1,
  /** 위 차수가 배정됐으면 등급 카드 아래 `labels.gradeRoundNote`(`{next}`). */
  higherRoundAssigned = false,
  /**
   * 앞 차수 리뷰 — `{ status: 'loading' | 'failed' | 'ready', rounds }`. `round` 가 2 이상이고 값이
   * 있을 때만 근거 칸 맨 위(셀프 리뷰보다 위)에 그린다. 실패해도 작성은 막지 않는다.
   */
  priorRounds = null,
  onRetryPriorRounds,
  /** 등급 저장값 → 이름(앞 차수 카드의 등급 딱지). 없으면 `gradeOptions` 의 이름. */
  gradeLabels = null,
  labels: providedLabels,
  /** onSave(items, gradeKey, { auto }) — Promise 를 돌려주면 자동 임시저장 성공/실패를 표시한다(§5.9). */
  onSave,
  /**
   * onSubmit(items, gradeKey, { assessment }) — PW-1461 부가 평가(위원회 코멘트·승진·보상 세 갈래·사유)가
   * 잠기지 않았으면 그 현재 값을 함께 넘긴다. 호출부는 제출 전에 그것도 저장한다.
   */
  onSubmit,
  onSaveAssessment,
  /** 제출이 막혔을 때(`'grade'` = 등급 미선택) — 호출부가 토스트를 띄운다(§5.3). */
  onBlocked,
  /** 자동 임시저장 간격(ms). 0 이면 끈다. 기획 §5.9 는 30초. */
  autoSaveMs = 30000,
  /** 작성 중인(저장 안 된) 내용이 있나가 바뀔 때 — 호출부가 이탈 확인을 건다(§5.12). */
  onDirtyChange,
  /** 이탈 확인 창을 띄우나 + 세 갈래 답(§5.12). 창은 캔버스가 그리고, 이동은 호출부가 한다. */
  leavePrompt = false,
  onLeaveSave,
  onLeaveDiscard,
  onLeaveStay,
  /** 제출 직후 완료 화면(§5.10·§12.1 L5). 버튼 손잡이를 안 주면 그 버튼을 안 그린다. */
  showCompletion = false,
  onBackToList,
  onGoCalibration,
  // TC-098 승진 요청서(4항목)
  promotionRequest = null,
  onSubmitPromotion,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const formLocked = locked ?? submitted;
  const assessmentLocked = locked ?? false;
  // 평가지에 놓인 순서 그대로의 항목 전부 — 질문과 설명이 섞여 있다.
  const entries = useMemo(() => buildFields(template, L), [template, L]);
  /** [PW-602 ④ 불변식 ②] 답을 받는 항목만. 진행률·필수 검증은 전부 이것을 본다. */
  const fields = useMemo(() => entries.filter((f) => f.type !== 'note'), [entries]);
  // PW-1594 — 앞 차수 답의 항목 이름·척도. 이 차수 평가지에서 같은 항목을 찾고, 없으면(차수마다
  // 평가지가 다를 수 있다) 근거 칸이 쓰는 구분 이름으로 떨어진다 — 저장값을 그대로 보이지 않는다.
  // 서버가 그 차수 평가지의 항목 이름·척도를 실어 준다(`itemLabel`·`scaleMax`) — 차수마다 평가지 사본이
  // 달라 이 화면 평가지의 항목 id 로는 대개 못 찾는다(PW-1594 브라우저 확인: 역량 질문 둘이 같은 이름으로 보였다).
  const priorLabelOf = (a) => {
    if (a.itemLabel) return a.itemLabel;
    const f = a.templateItemId ? fields.find((x) => x.templateItemId === a.templateItemId) : null;
    return f?.label || f?.section || evidenceLabel(a, L);
  };
  const priorScaleMaxOf = (a) =>
    a.scaleMax ||
    scaleMaxOf(a.templateItemId ? fields.find((x) => x.templateItemId === a.templateItemId) : null);
  const priorGradeLabelOf = (key) =>
    gradeLabels?.[key] ?? gradeOptions.find((g) => g.key === key)?.label ?? key;
  const [state, setState] = useState(() => seedState(leaderAnswers, fields));
  const [pickedGrade, setGrade] = useState(initialGrade);
  // PW-1045 — 등급 칸이 잠겼으면 고르던 등급 대신 호출부가 준 등급(위원회 값)을 쓴다. 화면을 연 사이
  // 위원회가 등급을 바꿔 잠긴 경우(저장이 거절된 뒤 다시 읽은 값)에도 팀장이 누른 등급이 남아
  // 그 값이 저장된 줄 알게 두지 않는다.
  const grade = gradeLocked ? initialGrade : pickedGrade;
  const [confidentialComment, setConfidentialComment] = useState(assessment?.confidentialComment ?? '');
  // PW-1461 §5.8 승진 고려 세 갈래. 옛 저장(체크만)은 «대상임»으로 읽고, 승진 요청서가 이미 있으면 «대상임».
  const [promotionStatus, setPromotionStatus] = useState(
    () =>
      assessment?.promotionStatus ??
      ((assessment?.promotionReady ?? false) || !!promotionRequest ? 'recommended' : null),
  );
  const [promotionReason, setPromotionReason] = useState(assessment?.promotionReason ?? '');
  // 보상 조정 세 갈래 — 옛 «보상 메모»가 있으면 사유 칸에 이어 보인다.
  const [compensationStatus, setCompensationStatus] = useState(assessment?.compensationStatus ?? null);
  const [compensationReason, setCompensationReason] = useState(
    assessment?.compensationReason ?? assessment?.compensationNote ?? '',
  );
  // §5.3.1 위치 일시 토글 — 저장하지 않는다(새로고침하면 템플릿 위치).
  const [gradePosPicked, setGradePosPicked] = useState(null);
  // §5.8 승진을 골랐는데 사유가 비었을 때의 제출 확인
  const [promoReasonAsk, setPromoReasonAsk] = useState(false);
  // TC-098 승진 요청서 4항목
  const [promoForm, setPromoForm] = useState({
    evalHistorySummary: promotionRequest?.evalHistorySummary ?? '',
    reviewBackground: promotionRequest?.reviewBackground ?? '',
    levelRoleExamples: promotionRequest?.levelRoleExamples ?? '',
    additionalNotes: promotionRequest?.additionalNotes ?? '',
  });
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoSaved, setPromoSaved] = useState(false);

  // 답변/템플릿 async 로드 시 재시드 — effect-setState 대신 during-render 리셋
  // (React 공식 "adjust state during render"), fields/leaderAnswers 참조 변경 시에만.
  const [seededFor, setSeededFor] = useState({ fields, leaderAnswers });
  // §5.9 — «바뀐 게 있나»의 기준(서버가 준 답 + 등급). 다시 받은 답이 기준이 되고, 그 사이 고친 칸은
  // 아래 reseedKeepingEdits 가 남기므로 여전히 바뀐 것으로 남는다.
  const [baseline, setBaseline] = useState(() =>
    snapshotOf(itemsOf(fields, seedState(leaderAnswers, fields)), initialGrade),
  );
  if (seededFor.fields !== fields || seededFor.leaderAnswers !== leaderAnswers) {
    setSeededFor({ fields, leaderAnswers });
    setBaseline(snapshotOf(itemsOf(fields, seedState(leaderAnswers, fields)), initialGrade));
    // 칸 구성이 같고 답만 새로 왔으면(저장 응답) 그 사이 고친 칸은 둔다 (PW-966).
    // 구성은 참조가 아니라 모양으로 가른다 — 저장 응답마다 평가지·라벨이 새 객체로 온다.
    if (fieldsShape(seededFor.fields) !== fieldsShape(fields)) setState(seedState(leaderAnswers, fields));
    else
      setState((cur) =>
        reseedKeepingEdits(cur, seedState(seededFor.leaderAnswers, fields), seedState(leaderAnswers, fields)),
      );
  }
  // TC-036: 미입력 자동 스크롤용 훅(early-return 앞에 선언).
  const fieldRefs = useRef({});
  const gradeRef = useRef(null);
  const [triedSubmit, setTriedSubmit] = useState(false);
  // §5.5 섹션 접기 — 기본은 모두 펼침
  const [collapsed, setCollapsed] = useState({});
  // §5.4 사유 빈 항목 경고 창
  const [rationaleAsk, setRationaleAsk] = useState(null);
  // §5.9 자동 임시저장 표시 — { kind: 'saved', at } | { kind: 'failed' } | null
  const [saveStatus, setSaveStatus] = useState(null);

  const snapshot = snapshotOf(itemsOf(fields, state), grade);
  const editable = active && !formLocked && !submitted && !showCompletion;
  const dirty = editable && snapshot !== baseline;

  // 렌더 밖(타이머·버튼)에서 읽을 최신 값 — 렌더 중에는 ref 를 건드리지 않는다.
  const latest = useRef(null);
  useEffect(() => {
    latest.current = { fields, state, grade, onSave, snapshot, dirty };
  });
  // 같은 값을 다시 알려도 호출부(상태 setter)에는 아무 일이 없다.
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // 저장 한 번 — 수동·자동 공통. Promise 를 돌려주는 호출부만 성공/실패를 표시할 수 있다.
  const savingRef = useRef(false);
  const runSave = async (auto) => {
    const cur = latest.current;
    if (!cur?.onSave || savingRef.current) return false;
    savingRef.current = true;
    const sent = cur.snapshot;
    try {
      await cur.onSave(itemsOf(cur.fields, cur.state), cur.grade, { auto });
      setBaseline(sent);
      setSaveStatus({ kind: 'saved', at: new Date() });
      return true;
    } catch {
      setSaveStatus({ kind: 'failed' });
      return false;
    } finally {
      savingRef.current = false;
    }
  };

  // §5.9 30초마다 — 바뀐 게 있을 때만 보낸다.
  const autoSaveRef = useRef(runSave);
  useEffect(() => {
    autoSaveRef.current = runSave;
  });
  useEffect(() => {
    if (!editable || !autoSaveMs) return undefined;
    const id = setInterval(() => {
      if (latest.current?.dirty) void autoSaveRef.current(true);
    }, autoSaveMs);
    return () => clearInterval(id);
  }, [editable, autoSaveMs]);

  // 「저장됨 HH:MM」은 3초 뒤 사라진다. 실패 배너는 다음 저장이 될 때까지 남는다.
  useEffect(() => {
    if (saveStatus?.kind !== 'saved') return undefined;
    const id = setTimeout(() => setSaveStatus(null), 3000);
    return () => clearTimeout(id);
  }, [saveStatus]);

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

  const toItems = () => itemsOf(fields, state);

  const sections = [];
  // 설명 항목은 «놓인 자리»가 기능의 핵심이라 그룹핑에는 함께 넣는다.
  entries.forEach((f) => {
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
      onBlocked?.('grade');
      gradeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // §5.4 — 점수를 골랐는데 사유가 빈 항목(사유 필수가 아닌 것)은 묻고 낸다. 필수 항목은 위에서 막았다.
    const missing = fields.filter(
      (f) =>
        f.type === 'rating' &&
        !f.requiresRationale &&
        state[f.key].score != null &&
        !(state[f.key].rationale || '').trim(),
    );
    if (missing.length > 0 && L.rationaleMissingOne) {
      setRationaleAsk(missing);
      return;
    }
    askPromoReasonThenSubmit();
  };
  // PW-1461 §5.8 — 부가 평가 현재 값. 잠겼으면 보내지 않는다.
  const assessmentPayload = () => ({
    confidentialComment,
    promotionStatus,
    promotionReason: promotionStatus ? promotionReason : null,
    compensationStatus,
    compensationReason: compensationStatus ? compensationReason : null,
  });
  const submitNow = () =>
    onSubmit?.(toItems(), grade, assessmentLocked ? {} : { assessment: assessmentPayload() });
  // §5.8 — 승진을 골랐는데 사유가 비면 권장 경고(막지 않는다). 둘 다 안 골라도 제출된다.
  const askPromoReasonThenSubmit = () => {
    if (!assessmentLocked && promotionStatus && !promotionReason.trim() && L.promotionReasonMissing) {
      setPromoReasonAsk(true);
      return;
    }
    submitNow();
  };
  const rationaleAskText = rationaleAsk
    ? fillLabel(rationaleAsk.length > 1 ? L.rationaleMissingMany : L.rationaleMissingOne, {
        first: rationaleAsk[0].label,
        count: rationaleAsk.length - 1,
      })
    : '';

  // TC-046/047 최종 등급 카드 위치(HR 옵션): top·bottom·freeze(상단고정=슬림 sticky 헤더).
  // PW-1461 §5.3.1 — 템플릿 값이 기본, 리더가 이 화면에서만 잠깐 바꾼다(저장 안 함).
  const templatePos = GRADE_POSITIONS.includes(cycle?.reviewSequence?.gradeCardPosition)
    ? cycle.reviewSequence.gradeCardPosition
    : 'bottom';
  const gradePos = gradePosPicked ?? templatePos;
  const isFreeze = gradePos === 'freeze';
  const gradeAtTop = gradePos === 'top' || isFreeze;
  const gradeCard = (
    <section
      className={`evc-card${isFreeze ? ' evl-grade-freeze' : ''}${triedSubmit && !grade ? ' evl-grade-missing' : ''}`}
      ref={gradeRef}
      data-testid="evl-grade-card"
      data-position={gradePos}
    >
      <div className="evl-grade-pos">
        <SegmentedControl
          ariaLabel={L.gradePosAria}
          value={gradePos}
          onChange={setGradePosPicked}
          items={GRADE_POSITIONS.map((p) => ({
            value: p,
            label: L[GRADE_POS_LABEL_KEY[p]],
            testId: `evl-grade-pos-${p}`,
          }))}
        />
        <span className="evl-grade-caption" data-testid="evl-grade-pos-note">
          {fillLabel(L.gradePosNote, { position: L[GRADE_POS_LABEL_KEY[templatePos]] })}
        </span>
      </div>
      {isFreeze && <p className="evl-freeze-note" data-testid="evl-freeze-note"><ZapIcon size={14} /> {L.freezeNote}</p>}
      <h3 className="evc-card-name">{L.gradeTitle}</h3>
      {calibrationEnabled && L.gradeCaptionCalibOn && (
        <p className="evl-grade-caption" data-testid="evl-grade-caption">{L.gradeCaptionCalibOn}</p>
      )}
      {L.gradeDecisionNote && (
        <p className="evl-grade-caption" data-testid="evl-grade-decision-note">{L.gradeDecisionNote}</p>
      )}
      {!calibrationEnabled && (
        <p className="evl-calib-off-note" data-testid="evl-calib-off-note">
          <AlertIcon size={14} /> {L.calibOffGradeNote}
        </p>
      )}
      {gradeLocked && !formLocked && L.gradeLockedNote && (
        <p className="evl-calib-off-note" data-testid="evl-grade-locked-note">
          <AlertIcon size={14} /> {L.gradeLockedNote}
        </p>
      )}
      <div className="evl-grade-row">
        {gradeOptions.map((g) => (
          <button
            type="button"
            key={g.key}
            className={`evl-grade-btn${grade === g.key ? ' is-on' : ''}`}
            disabled={formLocked || gradeLocked}
            onClick={() => setGrade(g.key)}
            data-testid={`evl-grade-${g.key}`}
          >
            {g.label}
          </button>
        ))}
      </div>
      {/* PW-1594 §5.13.4 — 하향 등급은 «제출된 가장 높은 차수»의 값이다(위 차수가 배정된 경우에만). */}
      {higherRoundAssigned && L.gradeRoundNote && (
        <p className="evl-grade-round-note" data-testid="evl-grade-round-note">
          {fillLabel(L.gradeRoundNote, { next: round + 1 })}
        </p>
      )}
    </section>
  );

  // leader §5.7 공개 대상 배지 — 자물쇠 + 짧은 이름, 마우스를 올리면 공개 대상 말풍선.
  const committeeBadge = (testId) => (
    <StatusBadge
      className="evl-committee-badge"
      title={L.committeeOnlyTooltip}
      tabIndex={0}
      data-testid={testId}
    >
      <LockIcon size={12} /> {L.committeeOnlyBadge}
    </StatusBadge>
  );

  // PW-1594 §5.13.3 — 차수가 둘 이상인 사이클은 `{이름} — 하향 리뷰 · {k}차`.
  const titleText =
    rounds >= 2 && L.roundTitle
      ? fillLabel(L.roundTitle, { name: evaluateeName || '', round }).replace(/^\s*—\s*/, '')
      : `${L.title}${evaluateeName ? ` — ${evaluateeName}` : ''}`;
  const header = (
    <header className="evc-header">
      <div>
        <h1 className="evc-title" data-testid="evl-title">{titleText}</h1>
        {cycle?.name && <p className="evc-summary">{cycle.name}</p>}
      </div>
    </header>
  );

  // §5.10·§12.1 L5 — 제출 완료 화면. 끈 사이클은 「팀원 목록으로」 하나만.
  if (showCompletion) {
    return (
      <div className="evc-root">
        {header}
        <section className="evc-card evl-done" data-testid="evl-done">
          <h3 className="evc-card-name">✓ {L.doneTitle}</h3>
          <p className="evc-empty-sub" data-testid="evl-done-note">
            {calibrationEnabled ? L.doneCalibOnNote : L.calibOffSubmittedNote}
          </p>
          <div className="evc-card-buttons">
            {onBackToList && (
              <button type="button" className="evc-btn is-ghost" onClick={onBackToList} data-testid="evl-done-back">
                {L.backToTeam}
              </button>
            )}
            {calibrationEnabled && onGoCalibration && (
              <button type="button" className="evc-btn is-primary" onClick={onGoCalibration} data-testid="evl-done-calib">
                {L.goCalibration}
              </button>
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="evc-root">
      {header}

      {formLocked && locked && L.lockedNotice && (
        <p className="evx-notice" data-testid="evl-locked" style={{ maxWidth: 1080, margin: '0 auto 12px' }}>
          {L.lockedNotice}
        </p>
      )}
      {submitted && (
        <p className="evx-notice is-success" data-testid="evl-submitted" style={{ maxWidth: 1080, margin: '0 auto 12px' }}>
          ✓ {L.submittedBanner}
          {!calibrationEnabled && (
            <span data-testid="evl-submitted-calib-off"> {L.calibOffSubmittedNote}</span>
          )}
        </p>
      )}

      {saveStatus?.kind === 'saved' && (
        <p className="evl-autosaved" role="status" data-testid="evl-autosaved">
          {fillLabel(L.autoSaved, { time: hhmm(saveStatus.at) })}
        </p>
      )}
      {saveStatus?.kind === 'failed' && (
        <p className="evx-notice is-error" role="alert" data-testid="evl-autosave-failed" style={{ maxWidth: 1080, margin: '0 auto 12px' }}>
          {L.autoSaveFailed}
        </p>
      )}

      <div className="evl-2pane">
        {/* 좌: 근거 */}
        <aside className="evl-evidence" data-testid="evl-evidence">
          {/* PW-1594 §5.13.3 — 2차 이후면 근거 칸 맨 위(셀프 리뷰보다 위)에 앞 차수 리뷰 */}
          {round >= 2 && priorRounds && (
            <EvalLeaderPriorRounds
              state={priorRounds}
              onRetry={onRetryPriorRounds}
              labelOf={priorLabelOf}
              scaleMaxOf={priorScaleMaxOf}
              gradeLabelOf={priorGradeLabelOf}
              L={L}
            />
          )}
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
              <div className="evl-evi-item" key={a.id} data-testid="evl-self-item">
                <span className="evc-field-label">
                  {evidenceLabel(a, L)}
                  {a.score != null ? ` · ${a.score}/${scaleMaxOf(a)}` : ''}
                </span>
                {a.textAnswer ? <p className="evl-evi-text">{a.textAnswer}</p> : null}
                {a.rationale ? (
                  <p className="evl-evi-text" data-testid="evl-self-rationale">
                    {L.evidenceRationaleLabel} · {a.rationale}
                  </p>
                ) : null}
              </div>
            ))
          )}

          <EvalLeaderEvidenceSignals signals={evidenceSignals} L={L} />

          {peerSummary ? (
            <EvalLeaderPeerSummary
              peer={peerSummary}
              onGenerate={onPeerSummaryGenerate}
              labelOf={(a) => evidenceLabel(a, L)}
              L={L}
            />
          ) : (
            <>
              <h3 className="evc-card-name" style={{ marginTop: 'var(--spacing-xl)' }}>{L.peerEvidenceTitle}</h3>
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
            </>
          )}

          <h3 className="evc-card-name" style={{ marginTop: 'var(--spacing-xl)' }}>{L.historyTitle}</h3>
          {pastGrades.length === 0 ? (
            <p className="evc-empty-sub" data-testid="evl-history-empty">{L.historyEmpty}</p>
          ) : (
            <PastGradeTrend points={pastGrades} L={L} />
          )}
        </aside>

        {/* 우: 작성 */}
        <div className="evl-form">
          {gradeAtTop && gradeCard}
          {sections.map((sec) => {
            const isCollapsed = !!collapsed[sec.title];
            const isCompetency = sec.fields.some((x) => isCompetencyCategory(x.category));
            return (
            <section className="evc-card" key={sec.title} data-testid="evl-section">
              <div className="evl-sec-head">
                <h3 className="evc-card-name">{sec.title}</h3>
                <button
                  type="button"
                  className="evl-sec-toggle"
                  aria-expanded={!isCollapsed}
                  onClick={() => setCollapsed((c) => ({ ...c, [sec.title]: !c[sec.title] }))}
                  data-testid="evl-section-toggle"
                >
                  {isCollapsed ? L.sectionExpand : L.sectionCollapse}
                </button>
              </div>
              {!isCollapsed && isCompetency && L.competencyFrameNote && (
                <p className="evl-sec-note" data-testid="evl-competency-note">{L.competencyFrameNote}</p>
              )}
              {!isCollapsed && sec.fields.map((f) =>
                /* [PW-602 ④] 설명 항목 — 입력 위젯도 번호도 없이 «글»로만 그린다. */
                f.type === 'note' ? (
                  <EvalNoteBlock key={f.key} item={f} testId={`evl-note-${f.key}`} />
                ) : (
                <div
                  className="evm-field"
                  key={f.key}
                  ref={(el) => {
                    fieldRefs.current[f.key] = el;
                  }}
                >
                  {/* §5.5 카테고리 → 질문 제목 → 응답칸. 선택지 없는 체크박스는 제목을 체크 옆에 그린다. */}
                  {f.label && !(f.type === 'checkbox' && filledOptions(f).length === 0) && (
                    <span className="evc-field-label" data-testid={`evl-label-${f.key}`}>
                      {f.label}
                      {(f.descriptionDisplay || 'tooltip') === 'tooltip' && (
                        <FieldInfo
                          description={
                            f.description || (GROWTH_HINT_KEY[f.growthKind] ? L[GROWTH_HINT_KEY[f.growthKind]] : null)
                          }
                        />
                      )}
                    </span>
                  )}
                  {f.description && (f.descriptionDisplay || 'tooltip') === 'inline' && (
                    <EvalMarkdownLite
                      text={f.description}
                      className="evc-md evm-field-guide"
                      testId={`evl-guide-${f.key}`}
                    />
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
                              disabled={formLocked}
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
                        disabled={formLocked}
                        onChange={(e) => setField(f.key, { rationale: e.target.value })}
                        data-testid={`evl-rationale-${f.key}`}
                      />
                      {triedSubmit && isIncomplete(f) && (
                        <p className="evm-field-error" data-testid={`evl-rationale-error-${f.key}`}>
                          {L.rationaleRequired}
                        </p>
                      )}
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
                              disabled={formLocked}
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
                          disabled={formLocked}
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
                      disabled={formLocked}
                      onChange={(e) => setField(f.key, { textAnswer: e.target.value })}
                      data-testid={`evl-text-${f.key}`}
                    />
                  )}
                  <FieldVisibility
                    visibleToRoles={f.visibleToRoles}
                    labels={L}
                  />
                </div>
                ),
              )}
            </section>
            );
          })}

          {/* 최종 등급 — 하단 배치(기본)일 때만 여기 렌더 */}
          {!gradeAtTop && gradeCard}

          {/* F5 위원회 전용 코멘트 + 승진·보상 — leader §5.7·§5.8 비공개 영역(연빨강 바탕·빨간 테두리·빨간 안내) */}
          <div className="evl-assessment" data-testid="evl-assessment">
            <section className="evc-card evl-confidential-zone" data-testid="evl-confidential-card">
              <h3 className="evc-card-name">
                {L.confidentialLabel}
                {committeeBadge('evl-committee-badge')}
              </h3>
              <p className="evl-committee-hint" data-testid="evl-committee-hint">{L.committeeOnlyHint}</p>
              <textarea
                className="evm-textarea"
                rows={2}
                value={confidentialComment}
                placeholder={L.confidentialPh}
                disabled={assessmentLocked}
                onChange={(e) => setConfidentialComment(e.target.value)}
                aria-label={L.confidentialLabel}
                data-testid="evl-confidential"
              />
            </section>

            <section className="evc-card evl-confidential-zone" data-testid="evl-promo-comp-card">
              <h3 className="evc-card-name">
                {L.promoCompTitle}
                {committeeBadge('evl-committee-badge-promo')}
              </h3>
              <p className="evl-committee-hint">{L.committeeOnlyHint}</p>

              <div className="evm-field" role="radiogroup" aria-label={L.promotionStatusLabel}>
                <span className="evc-field-label">{L.promotionStatusLabel}</span>
                <div className="evl-choice-row">
                  {PROMOTION_CHOICES.map(([value, key]) => (
                    <Radio
                      key={value}
                      name="evl-promotion-status"
                      value={value}
                      checked={promotionStatus === value}
                      disabled={assessmentLocked}
                      onChange={() => setPromotionStatus(value)}
                      label={L[key]}
                      data-testid={`evl-promotion-${value}`}
                    />
                  ))}
                </div>
                {promotionStatus && (
                  <textarea
                    className="evm-textarea"
                    rows={2}
                    value={promotionReason}
                    placeholder={L.promotionReasonPh}
                    disabled={assessmentLocked}
                    onChange={(e) => setPromotionReason(e.target.value)}
                    aria-label={L.promotionReasonLabel}
                    data-testid="evl-promotion-reason"
                  />
                )}
              </div>

              {/* TC-098 승진 요청서 — 데이터 모델 promotion_requests «승진 대상 매니저가 제출하는 요청서»라 «대상임»일 때만 */}
              {promotionStatus === 'recommended' && onSubmitPromotion && (
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
                        disabled={assessmentLocked}
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
                      disabled={promoBusy || assessmentLocked}
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

              <div className="evm-field" role="radiogroup" aria-label={L.compensationStatusLabel}>
                <span className="evc-field-label">{L.compensationStatusLabel}</span>
                <div className="evl-choice-row">
                  {COMPENSATION_CHOICES.map(([value, key]) => (
                    <Radio
                      key={value}
                      name="evl-compensation-status"
                      value={value}
                      checked={compensationStatus === value}
                      disabled={assessmentLocked}
                      onChange={() => setCompensationStatus(value)}
                      label={L[key]}
                      data-testid={`evl-compensation-${value}`}
                    />
                  ))}
                </div>
                {compensationStatus && (
                  <textarea
                    className="evm-textarea"
                    rows={2}
                    value={compensationReason}
                    placeholder={L.compensationReasonPh}
                    disabled={assessmentLocked}
                    onChange={(e) => setCompensationReason(e.target.value)}
                    aria-label={L.compensationReasonLabel}
                    data-testid="evl-compensation-reason"
                  />
                )}
              </div>

              <div className="evc-card-buttons">
                <button
                  type="button"
                  className="evc-btn is-ghost"
                  disabled={assessmentLocked}
                  onClick={() => onSaveAssessment?.(assessmentPayload())}
                  data-testid="evl-save-assessment"
                >
                  {L.saveAssessment}
                </button>
              </div>
            </section>
          </div>

          {!formLocked && (
            <div className="evm-submit-bar">
              <span className={`evm-progress${triedSubmit && (!grade || !ratingOk) ? ' evm-incomplete-warn' : ''}`}>
                {triedSubmit && !ratingOk
                  ? L.rationaleRequired
                  : grade
                    ? ''
                    : L.gradeRequired}
              </span>
              {(calibrationEnabled ? L.submitCaptionCalibOn : L.submitCaptionCalibOff) && (
                <span
                  className={`evl-submit-caption${calibrationEnabled ? '' : ' is-calib-off'}`}
                  data-testid="evl-submit-caption"
                >
                  {!calibrationEnabled && <AlertIcon size={12} />}{' '}
                  {calibrationEnabled ? L.submitCaptionCalibOn : L.submitCaptionCalibOff}
                </span>
              )}
              <div className="evc-card-buttons">
                {/* 낸 뒤 고칠 때는 [다시 제출] 하나 — 제출 검사(등급·사유)를 거치지 않은 저장이 남지 않게 */}
                {!submitted && (
                  <button type="button" className="evc-btn is-ghost" onClick={() => void runSave(false)} data-testid="evl-save">
                    {L.save}
                  </button>
                )}
                <button
                  type="button"
                  className="evc-btn is-primary"
                  onClick={handleSubmitClick}
                  data-testid="evl-submit"
                >
                  {submitted ? L.resubmit : L.submit}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {rationaleAsk && (
        <ConfirmModal
          title={rationaleAskText}
          confirmLabel={L.rationaleMissingContinue}
          cancelLabel={L.rationaleMissingCancel}
          onCancel={() => setRationaleAsk(null)}
          onConfirm={() => {
            setRationaleAsk(null);
            askPromoReasonThenSubmit();
          }}
          testId="evl-rationale-confirm"
        />
      )}

      {promoReasonAsk && (
        <ConfirmModal
          title={L.promotionReasonMissing}
          confirmLabel={L.rationaleMissingContinue}
          cancelLabel={L.rationaleMissingCancel}
          onCancel={() => setPromoReasonAsk(false)}
          onConfirm={() => {
            setPromoReasonAsk(false);
            submitNow();
          }}
          testId="evl-promo-reason-confirm"
        />
      )}

      {/* §5.12 이탈 확인 — 세 갈래라 공용 창 껍데기에 버튼 셋을 끼운다. 막·Esc·닫기 X 는 «남는다». */}
      {leavePrompt && (
        <ModalShell
          title={L.leaveTitle}
          titleId="evl-leave-title"
          closeLabel={L.leaveStay}
          onClose={() => onLeaveStay?.()}
          onSubmit={(e) => e?.preventDefault?.()}
          testId="evl-leave-confirm"
          overlayTestId="evl-leave-overlay"
          footer={
            <>
              <button type="button" className="tl-group-modal-btn tl-group-modal-btn-secondary" onClick={() => onLeaveStay?.()} data-testid="evl-leave-stay">
                {L.leaveStay}
              </button>
              <button type="button" className="tl-group-modal-btn tl-group-modal-btn-secondary" onClick={() => onLeaveDiscard?.()} data-testid="evl-leave-discard">
                {L.leaveDiscard}
              </button>
              <button
                type="button"
                className="tl-group-modal-btn tl-group-modal-btn-primary"
                onClick={async () => {
                  // 저장이 실패하면 나가지 않는다 — 「임시저장 실패」가 뜬 채 화면에 남는다.
                  if (await runSave(false)) onLeaveSave?.();
                }}
                data-testid="evl-leave-save"
              >
                {L.leaveSave}
              </button>
            </>
          }
        />
      )}
    </div>
  );
}
