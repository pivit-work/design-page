import { useState } from 'react';
import { ManagerCanvas } from './components/manager/index.js';

const SPLINE_SCENE = 'https://prod.spline.design/FGsE64DYYNKU7gP7/scene.splinecode';
const SPLINE_IMAGE = 'https://pivit-work.github.io/design-page/man.png';

const TABS = [
  { key: 'today', label: '오늘 현황' },
  { key: 'kr', label: 'KR 드릴다운' },
  { key: 'snippets', label: '팀 스니핏' },
];

/* ── 팀 스니핏 데모 데이터 — Figma 17026:25297 / 17421:18420·19479·20057.
   내용은 맥락에 맞춰 구성 (KR 드릴다운 탭과 팀원·KR 명칭 일관). */
const TS_AVATARS = {
  김시윤: 'https://i.pravatar.cc/200?img=12',
  어니스트: 'https://i.pravatar.cc/200?img=59',
  윤서율: 'https://i.pravatar.cc/200?img=32',
  박민준: 'https://i.pravatar.cc/200?img=68',
  정다은: 'https://i.pravatar.cc/200?img=47',
};

const TEAM_SNIPPETS = {
  periods: ['오늘', '이번 주', '전체'],
  redFlagCount: 2,
  submitted: { done: 4, total: 5 },
  members: [
    { name: '김시윤', avatar: TS_AVATARS.김시윤, submitted: true, flagged: true },
    { name: '어니스트', avatar: TS_AVATARS.어니스트, submitted: true },
    { name: '윤서율', avatar: TS_AVATARS.윤서율, submitted: false },
    { name: '박민준', avatar: TS_AVATARS.박민준, submitted: true },
    { name: '정다은', avatar: TS_AVATARS.정다은, submitted: true },
  ],
  weekHealth: [
    { name: '김시윤', avatar: TS_AVATARS.김시윤, dots: ['good', 'warn', 'good', 'empty', 'empty'] },
    { name: '어니스트', avatar: TS_AVATARS.어니스트, dots: ['good', 'good', 'good', 'empty', 'empty'] },
    { name: '윤서율', avatar: TS_AVATARS.윤서율, dots: ['good', 'good', 'empty', 'empty', 'empty'] },
    { name: '박민준', avatar: TS_AVATARS.박민준, dots: ['warn', 'warn', 'empty', 'empty', 'empty'] },
    { name: '정다은', avatar: TS_AVATARS.정다은, dots: ['bad', 'warn', 'empty', 'empty', 'empty'] },
  ],
  aiSummary: '오늘 박민준·정다은님의 헬스체크가 6대 이하입니다. 박민준님은 2일 연속 블로커 언급 중입니다.',
  byDate: [
    {
      date: '3월 15일 (금)',
      items: [
        {
          member: '김시윤', role: 'CTO · Engineering', avatar: TS_AVATARS.김시윤,
          time: '오후 6:12', submitLabel: '집중 안됨', score: 8.2, tone: 'good',
          text: 'RBAC 설계 완성. 27개 권한 항목 확정 후 커트에게 전달 완료. 어드민 패널 PR 머지.',
          tags: ['개발', '산출물'],
          kr: { okr: 'Phase 1 제품 완성', name: 'Phase 1 UI 기획', percent: 56, tone: 'good' },
        },
      ],
    },
    {
      date: '3월 14일 (목)',
      items: [
        {
          member: '박민준', role: 'Frontend Engineer', avatar: TS_AVATARS.박민준,
          time: '오후 6:05', submitLabel: '피로 언급', score: 7.8, tone: 'warn',
          text: 'pgvector 인덱스 전략 초안 작성 중. Redis 캐시 제약에서의 의존성 문제 발견. 내일 해결 방안 모색.',
          tags: ['개발', '이슈'],
          kr: { okr: 'Phase 1 제품 완성', name: 'MVP 개발', percent: 35, tone: 'blue' },
        },
      ],
    },
    {
      date: '3월 13일 (수)',
      items: [
        {
          member: '어니스트', role: 'Product Planner', avatar: TS_AVATARS.어니스트,
          time: '오후 6:20', submitLabel: '몰입 좋음', score: 8, tone: 'good',
          text: '3차 정기 미팅 참석. DB 설계 방향 확정. OKR 기획서 v1 리뷰 완료.',
          tags: ['기획', '회의'],
          kr: { okr: 'Phase 1 제품 완성', name: 'MVP 개발', percent: 35, tone: 'blue' },
        },
      ],
    },
    {
      date: '3월 12일 (화)',
      items: [
        {
          member: '김시윤', role: 'CTO · Engineering', avatar: TS_AVATARS.김시윤,
          time: '오후 6:20', submitLabel: '의욕 저하, 압축 언급', score: 6.5, tone: 'bad',
          warning: '헬스체크 주의 — 매니저 확인 권장',
          text: '조직도 v2 드래그 기능 구현 중. 예상보다 복잡해서 내일로 넘길 것 같음. pgvector 이슈도 계속 막혀있음.',
          tags: ['개발', '이슈'],
          kr: { okr: 'Phase 1 제품 완성', name: 'MVP 개발', percent: 35, tone: 'bad' },
        },
      ],
    },
  ],
  byKr: [
    {
      okr: 'Phase 1 제품 완성', tone: 'good', title: 'Phase 1 UI 기획', percent: 56,
      members: '김시윤, 박민준, 어니스트',
      avatars: [TS_AVATARS.김시윤, TS_AVATARS.박민준, TS_AVATARS.어니스트],
      snippets: [
        { member: '김시윤', avatar: TS_AVATARS.김시윤, date: '2026.03.15', score: 8.2, tone: 'good', text: 'RBAC 설계 완성. 27개 권한 항목 확정 후 커트에게 전달 완료. 어드민 패널 PR 머지.' },
        { member: '박민준', avatar: TS_AVATARS.박민준, date: '2026.03.13', score: 6.5, tone: 'bad', flagged: true, text: '조직도 v2 드래그 기능 구현 중. 예상보다 복잡해서 내일로 넘길 것 같음. pgvector 이슈도 계속 막혀있음.' },
        { member: '박민준', avatar: TS_AVATARS.박민준, date: '2026.03.10', score: 5.5, tone: 'bad', flagged: true, text: 'CSS 레이아웃 버그 수정 반복. 장기적으로 리팩토링 필요. 일정 부담 언급.' },
        { member: '어니스트', avatar: TS_AVATARS.어니스트, date: '2026.03.12', score: 8.2, tone: 'good', text: '온보딩 화면 스펙 상세화. 관련 피드백 5건 정리 후 팀에 공유.' },
      ],
    },
    {
      okr: 'Phase 1 제품 완성', tone: 'blue', title: 'MVP 개발', percent: 35,
      members: '김시윤, 박민준, 어니스트',
      avatars: [TS_AVATARS.김시윤, TS_AVATARS.박민준, TS_AVATARS.어니스트],
      snippets: [
        { member: '김시윤', avatar: TS_AVATARS.김시윤, date: '2026.03.14', score: 8.2, tone: 'good', text: '데이터 스키마 100개 필드 확정. 문서화 완료 후 커트에게 공유. 오늘 목표 달성.' },
        { member: '박민준', avatar: TS_AVATARS.박민준, date: '2026.03.11', score: 6.5, tone: 'bad', flagged: true, text: 'pgvector 인덱스 전략 초안 작성 중. Redis 캐시 의존성 문제로 진행이 막혀 있음.' },
        { member: '어니스트', avatar: TS_AVATARS.어니스트, date: '2026.03.13', score: 8.2, tone: 'good', text: '3차 정기 미팅 참석. DB 설계 방향 확정. OKR 기획서 v1 리뷰 완료.' },
      ],
    },
    {
      okr: '얼리 액세스 100건', tone: 'bad', title: '얼리 액세스', percent: 12,
      members: '김시윤',
      avatars: [TS_AVATARS.김시윤],
      snippets: [
        { member: '김시윤', avatar: TS_AVATARS.김시윤, date: '2026.03.15', score: 8.2, tone: 'good', text: 'HR 커뮤니티 얼리 액세스 홍보 시작. 3명 등록 유도 성공.' },
        { member: '김시윤', avatar: TS_AVATARS.김시윤, date: '2026.03.12', score: 2.3, tone: 'bad', flagged: true, text: '얼리 액세스 등록 정체. 홍보 채널이 막혀 다음 주 전략 재검토 필요.' },
      ],
    },
  ],
};

/* ── KR 드릴다운 데모 데이터 — Figma 17026:23299 / 17026:24830.
   상세 탭(스니핏/액션/Jira) 내용은 맥락에 맞춰 구성. */
const KR_AVATARS = {
  김시윤: 'https://i.pravatar.cc/200?img=12',
  어니스트: 'https://i.pravatar.cc/200?img=59',
  민현식: 'https://i.pravatar.cc/200?img=53',
  윤서율: 'https://i.pravatar.cc/200?img=32',
};

const KR_INITIATIVES = [
  { title: '어드민 패널 완성', percent: 100 },
  { title: 'pgvector 인덱스 최적화', percent: 50 },
  { title: '알림 모듈 구현', percent: 20 },
  { title: 'QA 테스트 통과', percent: 5 },
];

const krMember = (id, name, role, percent, extra = {}) => ({
  id, name, role, percent,
  avatar: KR_AVATARS[name],
  initiatives: KR_INITIATIVES,
  stats: { snippets: 4, actions: '1/4', jira: 4 },
  alert: 'pgvector Redis 의존성 — 이번 주 해결 예정',
  detail: {
    snippets: [
      { date: '2026-03-15', text: 'pgvector 인덱스 전략 초안 작성 중, Redis 캐시 의존성 이슈 발견.', tags: ['개발', '협업'] },
      { date: '2026-03-15', text: '어드민 패널 PR 머지, PIVIT-142 완료.', tags: ['개발', '협업'] },
      { date: '2026-03-15', text: '조직도 v2 hover 툴팁 + 클릭 모달 구현 완료.', tags: ['개발', '협업'] },
      { date: '2026-03-16', text: 'CSV 업로드 플로우 구현. 매니저-리포터 자동 인식 로직 완료.', tags: ['개발', '협업'] },
    ],
    actions: [
      { text: 'Redis 캐시 의존성 해소 방안 정리', due: '이번 주', status: { label: '진행 중', tone: 'progress' } },
      { text: 'QA 테스트 시나리오 리뷰 요청', due: '3/20', status: { label: '진행 중', tone: 'progress' } },
      { text: '어드민 패널 릴리즈 노트 작성', due: '3/18', status: { label: '완료', tone: 'done' } },
      { text: '알림 모듈 스펙 확정 미팅', due: '3/17', status: { label: '완료', tone: 'done' } },
    ],
    jira: [
      { key: 'PIVIT-142', title: '어드민 패널 완성', status: { label: '완료', tone: 'done' } },
      { key: 'PIVIT-143', title: '조직도 v2 구현', status: { label: '완료', tone: 'done' } },
      { key: 'PIVIT-144', title: 'pgvector 인덱싱', status: { label: '진행 중', tone: 'progress' } },
      { key: 'PIVIT-145', title: '알림 모듈', status: { label: '완료', tone: 'done' } },
    ],
  },
  ...extra,
});

const KR_DRILLDOWN = {
  objective: 'Phase 1 제품 완성',
  krs: [
    { id: 'KR1', title: 'Phase 1 UI 기획 완료', percent: 56, status: { label: '정상', tone: 'success' } },
    { id: 'KR2', title: 'MVP 개발 완료 및 QA 통과', percent: 35, status: { label: '위험', tone: 'warning' } },
    { id: 'KR3', title: '내부 베타 테스트 5명 확보', percent: 0, status: { label: '미시작', tone: 'muted' } },
  ],
  detail: {
    subtitle: '전체 Phase 1 화면 기획 완료, 마감: 2026-03-31',
    trend: [
      { label: '01-20', value: 8 },
      { label: '02-03', value: 16 },
      { label: '02-17', value: 28 },
      { label: '03-03', value: 42 },
      { label: '03-17', value: 56 },
    ],
  },
  contribution: [
    { name: '김시윤', percent: 80, color: 'blue' },
    { name: '어니스트', percent: 15, color: 'purple' },
    { name: '민현식', percent: 3, color: 'green' },
    { name: '윤서율', percent: 2, color: 'pink' },
  ],
  members: [
    krMember('kr-m1', '김시윤', '핵심 개발', 80),
    krMember('kr-m2', '어니스트', '기획 스택', 15),
    krMember('kr-m3', '민현식', '방향 의사결정', 3),
    krMember('kr-m4', '윤서율', '검토 피드백', 2),
  ],
};

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
  const [activeTab, setActiveTab] = useState('today');
  return (
    <ManagerCanvas
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      krDrilldown={KR_DRILLDOWN}
      teamSnippets={TEAM_SNIPPETS}
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
