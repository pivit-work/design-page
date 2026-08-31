/**
 * 평가 항목 한 개가 «무엇을 가질 수 있는가» — 마법사 2단계와 평가 템플릿 라이브러리가
 * 함께 쓰는 어휘.
 *
 * ## 왜 파일로 갈랐나 (PW-527 ①②③)
 *
 * 이 상수·헬퍼와 그것을 쓰는 두 부품(`EvalTemplateItemSettings` · `EvalSheetBody`)은
 * 원래 `EvalCycleWizard.jsx` 안의 모듈 지역 값이었다. 그래서 **마법사 밖에서는 쓸 수
 * 없었고**, 「평가 템플릿」 화면은 같은 설정을 보여 줄 방법이 없어 배지로만 읽히게 하고
 * 「여기서 바꿀 수 없습니다」를 붙여 두었다. 기획서는 처음부터 반대로 정해 두었다 —
 * `screen-eval-template-library.policy.md` §6.3 「이 화면의 빌더는 위자드 2단계와 같은
 * 컴포넌트다 … 한쪽에만 반영되면 버그로 본다」.
 *
 * 그래서 **복제가 아니라 이동**이다. 마법사는 여기서 import 해 그대로 쓰고, 화면은
 * 한 픽셀도 바뀌지 않는다. 정하는 규칙이 한 곳에 있어야 두 화면이 어긋나지 않는다.
 *
 * 정본: `screen-eval-cycle-hr.policy.md` §5.11-A(척도) · §5.11-B(선택지) ·
 * §5.11-D(가이드 문구) · §5.12(결과 공개 범위)
 */

/** `{{name}}` 자리를 채운다 — 라벨 묶음이 문장을 통째로 주는 구조라 필요하다. */
export const fill = (s, vars) => {
  let out = s == null ? '' : String(s);
  for (const k of Object.keys(vars)) out = out.replace(`{{${k}}}`, vars[k]);
  return out;
};

// 질문 유형(항목 응답 방식).
export const QUESTION_TYPES = [
  { id: 'textarea', labelKey: 'qTypeTextarea' },
  { id: 'rating', labelKey: 'qTypeRating' },
  { id: 'grade', labelKey: 'qTypeGrade' },
  { id: 'checkbox', labelKey: 'qTypeCheckbox' },
];

// [①] 척도 길이 = 설계자 입력. 시작값 1 고정 · 간격 1 · 끝값만 받는다.
//   시작값·간격까지 열면 같은 「3점 척도」가 회사마다 0~2 / 1~3 으로 갈려 점수를 비교할 수 없다.
export const SCALE_MAX_MIN = 2; // 2점보다 짧은 척도는 척도가 아니다
export const SCALE_MAX_MAX = 10; // 10점을 넘으면 응답자가 눈금을 구분하지 못한다
export const DEFAULT_SCALE_MAX = 5; // 설정 이전 항목이 읽히는 값 — 5점 고정이던 시절과 같다
export const SCALE_PRESETS = [3, 5, 7, 10];
export const clampScaleMax = (v) =>
  Math.min(SCALE_MAX_MAX, Math.max(SCALE_MAX_MIN, Math.round(+v) || SCALE_MAX_MIN));
export const scaleMaxOf = (q) => q?.scaleMax || DEFAULT_SCALE_MAX;

// [③] 체크박스 = 제목 + 선택지 목록(구글 폼 구조).
export const DEFAULT_CHECK_OPTIONS = [
  { id: 'o1', label: '' },
  { id: 'o2', label: '' },
];
export const CHECK_MIN_OPTIONS = 1;
export const CHECK_MAX_OPTIONS = 20;
/** 선택지가 없는 **기존 항목은 구 동작(제목 1개 단일 체크)으로 폴백**한다. */
export const filledOptions = (q) => (q?.options || []).filter((o) => o.label.trim());

// [⑥] 가이드 문구 표시 방식 — 「공개 범위」와 다른 축임을 화면에서 갈라 준다.
export const GUIDE_DISPLAYS = [
  { id: 'hidden', labelKey: 'guideDisplayHidden' },
  { id: 'tooltip', labelKey: 'guideDisplayTooltip' },
  { id: 'inline', labelKey: 'guideDisplayInline' },
];

// [⑤] 결과 공개 범위 — 「누가 작성하는가」가 아니라 「이 답변을 누가 보는가」.
export const DISCLOSURE_AUDIENCES = [
  { id: 'evaluatee', labelKey: 'audienceEvaluatee' },
  { id: 'manager', labelKey: 'audienceManager' },
  { id: 'upper', labelKey: 'audienceUpper' },
  { id: 'hr', labelKey: 'audienceHr' },
  { id: 'calibration_committee', labelKey: 'audienceCommittee' },
];
export const IDENTITY_OPTIONS = [
  { id: 'named', labelKey: 'identityNamed', descKey: 'identityNamedDesc' },
  { id: 'role_only', labelKey: 'identityRoleOnly', descKey: 'identityRoleOnlyDesc' },
  { id: 'anonymous', labelKey: 'identityAnonymous', descKey: 'identityAnonymousDesc' },
];
export const DEFAULT_MIN_RESPONSES = 3;
/**
 * 리뷰 유형별 기본값 (policy §5.12.3).
 * - 셀프는 작성자=피평가자라 설정 자체가 성립하지 않는다 → null(블록 미표시)
 * - 동료에 「피평가자」가 없는 이유: 공개는 조직이 준비됐을 때 **켜는 것**이지 기본값이 아니다
 * - 상향에 「차상위 조직장」이 없는 이유: 「아무에게도 공개 안 함」이 기본인 회사가 있다
 *   (David 확정 2026-08-23 — 초안 ON 에서 뒤집힘)
 */
export const DEFAULT_DISCLOSURE = {
  self: null,
  peer: {
    audience: ['manager', 'hr', 'calibration_committee'],
    identity: 'anonymous',
    minResponses: DEFAULT_MIN_RESPONSES,
    aiSummaryOnly: false,
  },
  upward: {
    audience: ['hr'],
    identity: 'anonymous',
    minResponses: DEFAULT_MIN_RESPONSES,
    aiSummaryOnly: false,
  },
  leader: {
    audience: ['evaluatee', 'hr', 'calibration_committee'],
    identity: 'named',
    minResponses: null,
    aiSummaryOnly: false,
  },
};

// 섹션별 색(시안 SECTION_COLORS): 성과=blue, 역량=purple, 성장=green, 최종등급=amber.
export const SECTION_COLORS = {
  '성과 (What)': 'var(--utility-blue-600, #175cd3)',
  '역량 (How)': 'var(--utility-purple-600, #6938ef)',
  '성장 (Growth)': 'var(--utility-success-600, #079455)',
  '최종 등급 결정': 'var(--utility-warning-600, #dc6803)',
};
export const sectionColor = (s) => SECTION_COLORS[s] || 'var(--text-tertiary, #98a2b3)';

/** 섹션별로 항목을 묶는다 — 미리보기·평가지 렌더가 같은 순서로 그리게 한다. */
export function groupBySection(items) {
  const groups = [];
  (items || []).forEach((q) => {
    let g = groups.find((s) => s.sec === q.section);
    if (!g) {
      g = { sec: q.section, items: [] };
      groups.push(g);
    }
    g.items.push(q);
  });
  return groups;
}
