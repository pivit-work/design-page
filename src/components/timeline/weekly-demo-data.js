/**
 * TimelineWeeklyView 데모 데이터.
 *
 * design-page 내부 데모 wrapper(`TimelinePage.jsx`) 전용 — 실 운영 환경에서는
 * pivit-work 가 백엔드(AI Weekly Report API) 응답을 그대로 `report` 로 주입한다.
 *
 * Figma 참조: timeline_gant_week (16636:73372, 16639:77164).
 */

export const DEMO_WEEKLY_REPORT = {
  generatedAt: '2026.03.15 (금) 오후 6:00 자동 생성',
  meta: {
    dateRange: '2026.03.09 ~ 03.15',
    snippetCount: 9,
    activeDays: 5,
    weekAvgHealth: 8.1,
  },
  summary:
    '이번 주는 Phase 1 기획 완성도를 높이는 데 집중한 한 주였습니다. IA 구조 정의, 어드민 클릭션 정의, RBAC 설계 등 핵심 산출물이 완성됐으며, 팀 전체 회의 2회를 통해 방향성이 정렬됐습니다. 헬스체크는 주 평균 8.1로 안정적이었고, 수요일 이후 꾸준히 유지됐습니다.',
  dayEntries: [
    {
      day: '월', date: '4/12', health: 8.1,
      krTitle: 'Phase 1 UI 기획 완료',
      desc: 'IA v1.0 초안 작성 — 9개 모듈 화면 계층 정의. 타임라인 피드 더미 데이터 구조 설계.',
      highlight: 'Phase 1 범위를 확정하기 위해 전체 화면 구조를 먼저 잡아야 했음.',
      cards: [
        { type: 'good', title: 'IA 초안을 반나절 만에 완성' },
        { type: 'issue', title: 'OKR 연동 구조가 아직 불명확' },
      ],
      tags: ['기획', '회의', '개발'],
    },
    {
      day: '화', date: '4/13', health: 8.4,
      krTitle: 'Phase 1 UI 기획 완료',
      desc: 'RBAC 권한 관리 화면 27개 항목 설계. 어드민 클릭 액션 20건 정의 완료.',
      highlight: '권한 구조가 확정되어야 모든 화면의 접근 제어를 설계할 수 있음.',
      cards: [
        { type: 'good', title: 'RBAC 27개 항목을 하루 만에 정리' },
      ],
      tags: ['기획', '회의', '개발'],
    },
    {
      day: '수', date: '4/14', health: 8.0,
      krTitle: 'Phase 1 UI 기획 완료',
      desc: '홈페이지 카피 전면 재작성 — 3-C 방향(Clear, Concise, Compelling) 확정. IR 자료 투자자 데크 초안 리뷰.',
      highlight: '3-C 카피 방향이 팀 전체의 메시징을 정렬하는 기준이 됨.',
      cards: [
        { type: 'good', title: '홈페이지 카피 방향 3-C 확정 — 팀 만장일치 동의' },
        { type: 'issue', title: 'IR 데크에 들어갈 수치 자료 부족' },
      ],
      tags: ['기획', '회의', '개발'],
    },
    {
      day: '목', date: '4/15', health: 8.4,
      krTitle: 'Phase 1 UI 기획 완료',
      desc: 'RBAC 권한 관리 화면 27개 항목 설계. 어드민 클릭 액션 20건 정의 완료.',
      highlight: '권한 구조가 확정되어야 모든 화면의 접근 제어를 설계할 수 있음.',
      cards: [
        { type: 'good', title: '피드백 중심 제품 철학 재정의 — SH님과 합의 완료' },
        { type: 'issue', title: 'OKR 연동 구조가 아직 불명확' },
      ],
      tags: ['기획', '회의', '개발'],
    },
    {
      day: '금', date: '4/16', health: 8.4,
      krTitle: 'Phase 1 UI 기획 완료',
      desc: 'IA v1.1 업데이트 — 회의 피드백 반영. 어니스트 1on1 진행 — 데이터 스키마 최종 확정.',
      highlight: '미팅에서 나온 피드백을 즉시 반영하여 기획 완성도를 높임.',
      cards: [
        { type: 'good', title: '데이터 스키마 100개 필드 정리 완료' },
      ],
      tags: ['기획', '회의', '개발'],
    },
  ],
  tagCounts: [
    { label: '기획', count: 6 },
    { label: '회의', count: 4 },
    { label: 'UI', count: 3 },
    { label: '산출물', count: 3 },
    { label: '스키마', count: 2 },
  ],
  // Figma: utility-green-600/500, utility-blue-600/400, utility-error-600/400
  okrItems: [
    { label: 'Phase 1 UI 기획 완료', prev: 58, value: 72, delta: 14, color: '#099250', barColor: '#2dbd82' },
    { label: '얼리 엑세스 등록 100건', prev: 40, value: 45, delta: 5, color: '#1570ef', barColor: '#53b1fd' },
    { label: '투자자 미팅 3건 완료', prev: 38, value: 33, delta: -5, color: '#d92d20', barColor: '#f97066' },
  ],
  contributions: [
    'IA v1.1 Phase 1 기준 완성 — 9개 모듈, 35개 페이지 확정',
    'RBAC 권한 관리 화면 27개 항목 설계 완료',
    '홈페이지 카피 전면 재작성 — 3-C 방향 확정 및 반영',
    '4차 정기 미팅 진행 — 피드백 중심 제품 철학 재정의',
  ],
  blockers: [
    '타임라인 교차 뷰 UI 복잡도 — 더미 데이터 검증 필요',
    '커트 As-of DB 구조 검토 미완 — 다음 주 공유 예정',
    'SH PPT 슬라이드 공유 대기 중',
  ],
  nextFocus: [
    '회의록 화면 UI 기획 및 구현 착수',
    'Weekly Digest 화면 완성',
    '1on1 대시보드 리스트 뷰 기획',
    '홈페이지 구글 심사 준비 시작',
  ],
  healthData: [7.8, 8.1, 8.0, 8.4, 8.4],
  weekDays: ['월', '화', '수', '목', '금'],
};
