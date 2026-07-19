import { ManagerCanvas } from './components/manager/index.js';

const SPLINE_SCENE = 'https://prod.spline.design/FGsE64DYYNKU7gP7/scene.splinecode';
const SPLINE_IMAGE = 'https://pivit-work.github.io/design-page/man.png';

const TABS = [
  { label: '오늘 현황', active: true },
  { label: 'KR 드릴다운' },
  { label: '팀 스니핏' },
];

const KPIS = [
  { label: '팀 헬스 평균', value: '7.4' },
  { label: '액션 필요', value: '3명' },
  { label: '평균 1on1', value: '12일 전' },
];

/* 모달용 프로필 데모 데이터 — 멤버별로 다르게 줄 수 있지만 시안에 맞춰 동일 사용. */
const SAMPLE_SNIPPETS = [
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

const SAMPLE_HEALTH_TREND = {
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

const SAMPLE_ONEONONE = {
  lastDate: '24일전',
  items: [
    { date: '3/11', title: '번아웃 징후 논의, 업무 조정 합의' },
    { date: '2/23', title: '커리어 방향성, 시니어 전환 로드맵' },
    { date: '1/22', title: '작년 회고, 올해 목표 설정' },
  ],
};

const URGENT_PROFILE = {
  aiBrief: '헬스 4.2로 급락, 연속 2일 스니핏 미작성. 번아웃 징후 감지 — 즉각 1on1 필요.',
  snippetsSummary: 'Auth 리팩토링 완료 후 번들 사이즈 이슈를 처리하는 과정에서 헬스가 급격히 저하됨. 야근이 이어지고 있어 업무 부하 조정이 필요해 보임.',
  aiRecommendation: 'AI 추천 - OKR 38% 저조해서 1on1이 필요해보입니다',
  agendas: [
    { title: '현재 업무 부하 체감 수준 확인', question: '"요즘 업무량이 어떻게 느껴져요? 어느 부분이 제일 힘들어요?"' },
    { title: 'KR2 지연 원인 파악', question: '"KR2가 좀 밀렸는데, 가장 큰 블로커가 뭔가요?"' },
    { title: '단기 부하 경감 방안 협의', question: '"이번 주 우선순위를 같이 다시 정리해볼까요?"' },
  ],
  metrics: { healthAvg: '4.2', snippetStreak: '0일', lastOneOnOne: '24일전', krProgress: '38%' },
  snippets: SAMPLE_SNIPPETS,
  healthTrend: SAMPLE_HEALTH_TREND,
  oneOnOne: SAMPLE_ONEONONE,
};

const WARNING_PROFILE = {
  aiBrief: '현재 휴가 중, 스니핏 3일 공백. 헬스 9.1 안정 — 복귀 후 채용·온보딩 점검 1on1 권장.',
  aiRecommendation: 'AI 추천 - 복귀 직후 온보딩 점검 1on1 잡으세요',
  agendas: [
    { title: '복귀 직후 컨디션 체크', question: '"휴가 잘 다녀오셨어요? 복귀하시고 컨디션은 어떠세요?"' },
    { title: '진행 중 채용 상황 공유', question: '"휴가 동안 채용 진행 상황 어떻게 됐는지 같이 정리해볼까요?"' },
    { title: '온보딩 계획 점검', question: '"신규 인원 온보딩 일정 어떻게 잡으면 좋을까요?"' },
  ],
  metrics: { healthAvg: '9.1', snippetStreak: '0일', lastOneOnOne: '8일전', krProgress: '72%' },
  snippets: SAMPLE_SNIPPETS,
  healthTrend: SAMPLE_HEALTH_TREND,
  oneOnOne: SAMPLE_ONEONONE,
};

const EXCELLENT_PROFILE = {
  aiBrief: '12일 연속 스니핏, 헬스 8.8 팀 최고. 알고리즘 정확도 94% 달성 — 성장 목표 다음 스텝 논의 적기.',
  aiRecommendation: 'AI 추천 - 성장 목표 다음 스텝을 논의하기 좋은 타이밍',
  agendas: [
    { title: '최근 성과 인정 및 회고', question: '"알고리즘 정확도 94% 정말 인상적이에요. 어떤 부분이 효과적이었나요?"' },
    { title: '다음 성장 목표 탐색', question: '"앞으로 어떤 영역으로 더 성장하고 싶으세요?"' },
    { title: '리더십 기회 제안', question: '"다른 팀원과 지식 공유 세션 같이 해볼 의향 있으세요?"' },
  ],
  metrics: { healthAvg: '8.8', snippetStreak: '12일', lastOneOnOne: '5일전', krProgress: '94%' },
  snippets: SAMPLE_SNIPPETS,
  healthTrend: SAMPLE_HEALTH_TREND,
  oneOnOne: SAMPLE_ONEONONE,
};

const GOOD_PROFILE = {
  aiBrief: 'pgvector 최적화로 응답시간 3배 개선. 5일 연속 스니핏, 성과·컨디션 모두 안정적.',
  aiRecommendation: 'AI 추천 - 안정적인 상태, 정기 1on1 유지',
  agendas: [
    { title: '최근 작업 회고', question: '"pgvector 최적화 어떻게 진행하셨어요? 어디서 가장 효과가 컸나요?"' },
    { title: '진행 중 작업 공유', question: '"이번 주 우선순위 작업은 무엇인가요?"' },
    { title: '필요한 지원 확인', question: '"제가 도와드릴 부분이 있을까요?"' },
  ],
  metrics: { healthAvg: '7.6', snippetStreak: '5일', lastOneOnOne: '7일전', krProgress: '64%' },
  snippets: SAMPLE_SNIPPETS,
  healthTrend: SAMPLE_HEALTH_TREND,
  oneOnOne: SAMPLE_ONEONONE,
};

const ACTION_QUEUE_MEMBERS = [
  { id: 'action-1', name: 'Chris', role: '이사 ∙ 프로덕트본부', status: 'urgent',
    avatar: SPLINE_IMAGE,
    comment: '헬스 4.2로 급락, 연속 2일 스니핏 미작성. 번아웃 징후 감지 — 즉각 1on1 필요.',
    profile: URGENT_PROFILE },
  { id: 'action-2', name: 'Chris', role: '이사 ∙ 프로덕트본부', status: 'warning',
    avatar: SPLINE_IMAGE,
    comment: '현재 휴가 중, 스니핏 3일 공백. 헬스 9.1 안정 — 복귀 후 채용·온보딩 점검 1on1 권장.',
    profile: WARNING_PROFILE },
  { id: 'action-3', name: 'Chris', role: '이사 ∙ 프로덕트본부', status: 'excellent',
    avatar: SPLINE_IMAGE,
    comment: '12일 연속 스니핏, 헬스 8.8 팀 최고. 알고리즘 정확도 94% 달성 — 성장 목표 다음 스텝 논의 적기.',
    profile: EXCELLENT_PROFILE },
];

const TEAM_STATUS_MEMBERS = [
  { id: 'team-1', name: 'Chris', role: '이사 ∙ 프로덕트본부', status: 'good',
    avatar: SPLINE_IMAGE,
    comment: 'pgvector 최적화로 응답시간 3배 개선. 5일 연속 스니핏, 성과·컨디션 모두 안정적.',
    profile: GOOD_PROFILE },
];

/**
 * 매니저 페이지 wrapper.
 * demo 데이터 + 라벨 보유, ManagerCanvas 에 props 로 전달.
 */
export default function ManagerPage({ icons, baseUrl }) {
  return (
    <ManagerCanvas
      tabs={TABS}
      teamMemberCount={5}
      summary="박민준님 긴급 개입이 필요합니다. 이서연님도 스니핏이 3일째 비어 있어요."
      kpis={KPIS}
      actionQueue={{
        title: '오늘의 액션 큐',
        count: 3,
        countColor: 'var(--colors-error-500)',
        subtitle: '지금 당장 뭐 해야 해요',
        members: ACTION_QUEUE_MEMBERS,
      }}
      teamStatus={{
        title: '팀원 현황',
        count: 1,
        countColor: 'var(--colors-foreground-fgSuccessPrimary)',
        subtitle: '나머지는 괜찮습니다',
        members: TEAM_STATUS_MEMBERS,
      }}
      splineScene={SPLINE_SCENE}
      splineImage={SPLINE_IMAGE}
      icons={icons}
      baseUrl={baseUrl}
    />
  );
}
