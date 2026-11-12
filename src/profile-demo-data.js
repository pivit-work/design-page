/**
 * 구성원 프로필 창 데모 데이터 — 조직도(`OrgChartPage`)와 매니저 대시보드(`ManagerPage`)가 같이 쓴다.
 * 오른쪽 탭(AI 브리핑 · 스니핏 · 헬스 트렌드 · 원온원 · 인사정보 하위 탭)의 내용이다 (Figma 17873:33191~34118).
 * 실제 제품(pivit-work)은 이 파일을 쓰지 않고 자기 데이터를 같은 모양으로 넘긴다.
 */

export const SAMPLE_SNIPPETS = [
  { date: '3/11', tags: ['개발', '협업'], healthScore: '6.5',
    title: 'Auth 플로우 리팩토링 완료, PR 올림',
    ups: ['코드 커버리지 82% 달성'], downs: ['번들 사이즈 예상보다 커짐'] },
  { date: '3/10', tags: ['개발', '협업'], healthScore: '5.8',
    title: 'pgvector 응답시간 최적화',
    ups: ['p99 280ms → 95ms'], downs: ['인덱스 빌드 시간 증가'] },
  { date: '3/9', tags: ['개발'], healthScore: '4.2',
    title: '번들 splitting 시도, 야근 지속',
    ups: ['초기 번들 -180KB'], downs: ['lazy chunk hydration 이슈'] },
  { date: '3/8', tags: ['협업'], healthScore: '5.0',
    title: '주간 회고 + 다음 스프린트 정리',
    ups: ['우선순위 정렬'], downs: ['리소스 부족 이슈'] },
];

export const SAMPLE_SNIPPETS_SUMMARY =
  'Auth 리팩토링 완료 후 번들 사이즈 이슈를 처리하는 과정에서 헬스가 급격히 저하됨. 야근이 이어지고 있어 업무 부하 조정이 필요해 보임.';

export const SAMPLE_HEALTH_TREND = {
  current: '4.2',
  change: '-2.8',
  teamAvg: '7.4',
  teamAverage: 7.4,
  points: [{ value: 7 }, { value: 8 }, { value: 6 }, { value: 4.2 }],
  dates: ['2/17', '2/24', '3/3', '3/10'],
  flags: [
    { severity: 'critical', label: '헬스 급락' },
    { severity: 'warning', label: '연속 미작성' },
  ],
};

export const SAMPLE_ONEONONE = {
  lastDate: '24일전',
  items: [
    { date: '3/11', title: '번아웃 징후 논의, 업무 조정 합의' },
    { date: '2/23', title: '커리어 방향성, 시니어 전환 로드맵' },
    { date: '1/22', title: '작년 회고, 올해 목표 설정' },
  ],
};

export const SAMPLE_AGENDAS = [
  { title: '현재 업무 부하 체감 수준 확인', question: '"요즘 업무량이 어떻게 느껴져요? 어느 부분이 제일 힘들어요?"' },
  { title: 'KR2 지연 원인 파악', question: '"KR2가 좀 밀렸는데, 가장 큰 블로커가 뭔가요?"' },
  { title: '단기 부하 경감 방안 협의', question: '"이번 주 우선순위를 같이 다시 정리해볼까요?"' },
];

export const SAMPLE_METRICS = { healthAvg: '4.2', snippetStreak: '0일', lastOneOnOne: '24일전', krProgress: '38%' };

/** 인사정보 탭의 하위 탭 — 기본정보 다음에 서는 세 묶음 (17873:33234). 줄 값은 전부 호스트가 만든 글자다. */
export const SAMPLE_HR_SECTIONS = [
  {
    key: 'employment',
    title: '조직·재직 정보',
    rows: [
      { key: 'org', label: '소속', value: '프로덕트본부 · 플랫폼팀' },
      { key: 'title', label: '직함', value: '이사', action: { label: '고치기', ariaLabel: '직함 고치기' } },
      { key: 'manager', label: '매니저', value: '김우진' },
      { key: 'type', label: '고용형태', value: '정규직' },
      { key: 'joined', label: '입사일', value: '2026-05-02' },
    ],
  },
  {
    key: 'personal',
    title: '개인 정보',
    rows: [
      { key: 'birth', label: '생년월일', value: '1986-03-14' },
      { key: 'address', label: '주소', value: '서울특별시 성동구 왕십리로 83-21' },
      { key: 'emergency', label: '비상 연락처', value: '010-9876-5432 (배우자)' },
    ],
  },
  {
    key: 'education',
    title: '학력 · 경력 · 자격증 · 교육',
    rows: [
      { key: 'school', label: '학력', value: '서울대학교 경영학 학사 (2009)' },
      { key: 'career', label: '경력', value: '맥킨지 컨설턴트 (2009–2015) · 카카오 PO (2015–2024)' },
      { key: 'cert', label: '자격증', value: 'PMP · CFA Level 2' },
      { key: 'training', label: '교육', value: '2026 리더십 워크숍 수료' },
    ],
  },
];

/** 조직도 데모 Chris 카드의 오른쪽 탭 내용 한 묶음 — `profile` 에 펼쳐 넣는다. */
export const CHRIS_PROFILE_TABS = {
  aiBrief: '헬스 4.2로 급락, 연속 2일 스니핏 미작성. 번아웃 징후 감지 — 즉각 1on1 필요.',
  agendas: SAMPLE_AGENDAS,
  metrics: SAMPLE_METRICS,
  snippets: SAMPLE_SNIPPETS,
  snippetsSummary: SAMPLE_SNIPPETS_SUMMARY,
  healthTrend: SAMPLE_HEALTH_TREND,
  oneOnOne: SAMPLE_ONEONONE,
  hrProfile: { sections: SAMPLE_HR_SECTIONS },
};
