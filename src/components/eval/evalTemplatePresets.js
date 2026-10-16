/**
 * 새 평가지의 시작값 — 버전별 항목 프리셋과 워크스페이스 기본 등급 체계.
 *
 * 마법사 2단계(`EvalCycleWizard.jsx`)와 평가 템플릿 라이브러리의 「새 템플릿」 창이 함께 쓴다
 * (`screen-eval-template-library.policy.md` §6.1 — 초기값: 항목 = 해당 버전 프리셋,
 * 등급 = 워크스페이스 기본 등급). 원래 마법사 안의 모듈 지역 값이었다 — 밖에서 쓸 수 없어
 * 라이브러리는 빈 항목 1개·빈 등급 2줄로 열렸다(PW-1456). 값은 옮기기만 했다.
 */

// 프리셋별 질문 시드(편집 가능한 콘텐츠). ai=AI 초안 지원, requiresRationale=점수 이유 필수.
export const TEMPLATE_PRESETS = {
  simple: [
    { id: 's1', section: '성과 (What)', text: '이번 기간 종합 코멘트를 작성해주세요.', type: 'textarea', ai: true },
    { id: 's2', section: '최종 등급 결정', text: '최종 등급을 선택하세요.', type: 'grade' },
  ],
  // PW-1464 · 대상자 화면 정책 §4.0 — 표준 = 성과 2(서술) · 역량 3(점수) · 성장 3(서술 2 + 점수 1).
  // OKR/KR 달성도는 점수가 아니라 서술이다(§4.6 — 정량 달성률은 KR 달성률 입력으로 일원화).
  standard: [
    { id: 'q1', section: '성과 (What)', text: '이번 기간 주요 성과를 서술해주세요.', type: 'textarea', ai: true },
    { id: 'q2', section: '성과 (What)', text: 'OKR/KR 달성도에 대한 코멘트를 작성해주세요.', type: 'textarea', ai: true },
    { id: 'q3', section: '역량 (How)', text: '주도성 / 오너십', type: 'rating' },
    { id: 'q4', section: '역량 (How)', text: '협업 · 커뮤니케이션', type: 'rating' },
    { id: 'q5', section: '역량 (How)', text: '실행력', type: 'rating' },
    { id: 'q6', section: '성장 (Growth)', text: '강점', type: 'textarea', ai: true, growthType: 'strengths' },
    { id: 'q7', section: '성장 (Growth)', text: '성장 영역', type: 'textarea', ai: true, growthType: 'improvements' },
    { id: 'q8', section: '성장 (Growth)', text: '성장 가능성', type: 'rating' },
    { id: 'q9', section: '최종 등급 결정', text: '최종 등급을 선택하세요.', type: 'grade' },
  ],
  detailed: [
    { id: 'd1', section: '성과 (What)', text: '이번 기간 주요 성과를 서술해주세요.', type: 'textarea', ai: true },
    { id: 'd2', section: '성과 (What)', text: 'OKR/KR 달성도에 대한 코멘트를 작성해주세요.', type: 'textarea', ai: true },
    { id: 'd3', section: '성과 (What)', text: '정량 목표 달성률', type: 'rating', requiresRationale: true },
    { id: 'd4', section: '역량 (How)', text: '주도성 / 오너십', type: 'rating', requiresRationale: true },
    { id: 'd5', section: '역량 (How)', text: '협업 · 커뮤니케이션', type: 'rating', requiresRationale: true },
    { id: 'd6', section: '역량 (How)', text: '실행력', type: 'rating', requiresRationale: true },
    { id: 'd7', section: '역량 (How)', text: '전문성 · 문제 해결', type: 'rating', requiresRationale: true },
    { id: 'd8', section: '역량 (How)', text: '리더십 · 영향력', type: 'rating', requiresRationale: true },
    { id: 'd9', section: '성장 (Growth)', text: '강점', type: 'textarea', ai: true, growthType: 'strengths' },
    { id: 'd10', section: '성장 (Growth)', text: '개선점 / 성장 영역', type: 'textarea', ai: true, growthType: 'improvements' },
    { id: 'd11', section: '성장 (Growth)', text: '성장 가능성', type: 'rating' },
    // [PW-1831 J-12 · HR §5.10-E] 선택지 0개 체크 항목은 저장이 막힌다(§5.11-B) — 프리셋이 그 상태로 나가지 않게 둘을 넣는다.
    {
      id: 'd12',
      section: '최종 등급 결정',
      text: '승진 추천 여부',
      type: 'checkbox',
      options: [
        { id: 'o1', label: '대상임' },
        { id: 'o2', label: '아직 아님' },
      ],
      allowMultiple: false,
    },
    { id: 'd13', section: '최종 등급 결정', text: '최종 등급을 선택하세요.', type: 'grade' },
  ],
};
/**
 * [F1] 동료 리뷰는 **피드백 전용**이다 — 동료 리뷰어에게는 평가권이 없으므로
 * 등급 항목은 빼고, 점수(척도)형은 서술형으로 내려 보여준다.
 * (서버 resolvePhaseTemplate 도 peerMode 에서 같은 강등을 하므로, 빌더가 보여주는 것과
 *  동료가 실제로 받는 폼이 어긋나지 않게 여기서 미리 맞춘다.)
 */
export function presetFor(version, reviewType) {
  const preset = TEMPLATE_PRESETS[version] ?? TEMPLATE_PRESETS.standard;
  // [PW-882] 「성장 영역」 칸은 셀프 평가지 질문만 가진다(리포트가 옮기는 것이 셀프 답이다).
  // 다른 유형에 미리 골라 두면 설정판에는 안 보이는데 값만 실려 가는 항목이 된다.
  const base =
    reviewType && reviewType !== 'self'
      ? preset.map((q) => (q.growthType ? { ...q, growthType: null } : q))
      : preset;
  if (reviewType !== 'peer') return base;
  return base
    .filter((q) => q.type !== 'grade')
    .map((q) =>
      q.type === 'rating'
        ? { ...q, type: 'textarea', requiresRationale: false }
        : q,
    );
}

// 워크스페이스 기본 등급 체계(상대비율 포함).
export const DEFAULT_GRADES = [
  { label: '탁월', desc: '기대를 초과하는 성과를 달성함', ratio: 15 },
  { label: '충족', desc: '기대에 부합하는 성과를 달성함', ratio: 70 },
  { label: '미흡', desc: '기대에 미달하는 성과를 보임', ratio: 15 },
];
