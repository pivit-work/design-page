/**
 * 행별 AI 의 선행 칸 — okr-spec.md 「항목별 AI 생성 의존성」 표. 행 id 는 앱·데모가 같은 값을 쓴다.
 * Mission·Vision 은 선행 칸이 없다. 「전략 전체 AI 자동완성」은 빈 칸을 채우는 기능이라 이 표를 보지 않는다 (PW-1505).
 */
export const AI_PREREQUISITES = {
  values: ['mission'],
  goal: ['mission'],
  strategy: ['mission', 'goal'],
  bigbets: ['mission', 'strategy'],
  metrics: ['goal', 'strategy'],
};
