/**
 * 평가 템플릿 등급 체계의 저장 전 판정 — 템플릿을 고치는 세 곳(새 평가 사이클 2단계 ·
 * 사이클 관리 «평가 템플릿» 탭 · 「평가 템플릿」 화면 [편집] 창)이 같은 것을 쓴다.
 *
 * ## 왜 파일로 갈랐나 (PW-2094)
 *
 * 이 계산은 원래 `EvalCycleWizard.jsx` 안에 있어서 마법사만 빈 이름·겹친 이름을 빨갛게
 * 하고 저장을 막았다. 다른 두 곳은 등급 이름이 비거나 겹쳐도 [저장]이 눌렸고, 등급 수
 * 한도도 세 곳이 서로 달랐다. 정책은 «세 곳은 같은 빌더라 한쪽에만 반영되면 버그»다
 * (`screen-eval-cycle-hr.policy.md` §4.6.2 ② · §5.4.2).
 *
 * 비율 합 100% 를 막을지는 PW-1541 답을 기다린다 — 지금 마법사가 막고 있어 세 곳 모두 막는다.
 */

export const TEMPLATE_MIN_GRADES = 2;
export const TEMPLATE_MAX_GRADES = 10;

const gradeKeyOf = (g) => String(g?.label ?? '').trim().toLowerCase();

/** 상대 평가 비율 합. 빈 칸·숫자 아닌 값은 0 으로 센다. */
export const templateGradeRatioSum = (grades) =>
  (grades || []).reduce((s, g) => s + (Number(g?.ratio) || 0), 0);

/**
 * 등급 목록의 저장 전 판정.
 *
 * `blockKey` 는 저장을 막는 첫 사유의 라벨 키다(위에서부터 우선) — 마법사의
 * `templateBlock*` 라벨과 같은 이름을 쓴다. 막을 것이 없으면 `null`.
 */
export function templateGradeIssues(grades, { absolute = true } = {}) {
  const list = grades || [];
  const seen = new Set();
  const dupLabels = new Set();
  for (const g of list) {
    const k = gradeKeyOf(g);
    if (!k) continue;
    if (seen.has(k)) dupLabels.add(k);
    else seen.add(k);
  }
  const hasEmpty = list.some((g) => !gradeKeyOf(g));
  const ratioSum = templateGradeRatioSum(list);
  const ratioInvalid = !absolute && ratioSum !== 100;
  const tooFew = list.length < TEMPLATE_MIN_GRADES;
  const blockKey = tooFew
    ? 'templateBlockGradeMin'
    : hasEmpty
      ? 'templateBlockGradeLabel'
      : dupLabels.size > 0
        ? 'templateBlockDupGrade'
        : ratioInvalid
          ? 'templateBlockRatio'
          : null;
  return {
    dupLabels,
    hasEmpty,
    ratioSum,
    ratioInvalid,
    tooFew,
    atMax: list.length >= TEMPLATE_MAX_GRADES,
    blockKey,
    valid: blockKey === null,
  };
}

/** 빨갛게 칠할 등급 줄 — 이름이 비었거나 다른 줄과 겹친다. */
export const isTemplateGradeInvalid = (g, issues) => {
  const k = gradeKeyOf(g);
  return !k || issues.dupLabels.has(k);
};
