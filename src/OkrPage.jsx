import { useState } from 'react';
import { OkrTabNav, OkrToolbar, OkrDashboardCanvas, OkrDetailModal, OkrPersonalCanvas, OkrTeamCanvas, OkrStrategyCanvas, Icon } from './components';

/* ── Demo Avatars ── */
const AVATARS = {
  신예은: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  이서현: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  김서윤: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
  김민준: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  커트: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face',
  박민준: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
  민현식: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
};

const TABS = [
  { id: 'dashboard', label: '대시보드' },
  { id: 'company', label: '전사 OKR' },
  { id: 'team', label: '팀 OKR' },
  { id: 'personal', label: '개인 OKR' },
  { id: 'resources', label: '내 리소스' },
];

const YEARS = ['2021', '2022', '2023', '2024', '2025', '2026'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

/* ── Demo OKR Tree (대시보드 캔버스) ── */
const OKR_TREE = {
  id: 'company',
  type: 'company',
  name: 'Company OKR',
  subtitle: 'PIVIT 2026',
  quarter: 'Q1',
  progress: 86,
  progressVariant: 'success',
  summary: '3 Objectives · 9 KRs',
  objectives: [
    { q: 'Q#1', badge: 'gray', title: 'API 서버 안정화 및 핵심 기능 구현', progress: 86 },
    { q: 'Q#1', badge: 'gray', title: 'O2AI 파이프라인 (STT·요약·임베딩) 안정화', progress: 0, progressVariant: 'error' },
    { q: 'Q#1', badge: 'gray', title: '얼리 액세스 고객 성공 및 Series A 준비', progress: 23 },
  ],
  teams: [
    {
      id: 'eng',
      name: 'Engineering',
      lead: '커트',
      progress: 86,
      progressVariant: 'success',
      summary: '3 Objectives · 9 KRs',
      objectives: [
        { q: 'Q#1', badge: 'blue', title: 'API 서버 안정화 및 핵심 기능 구현', progress: 86 },
        { q: 'Q#2', badge: 'blue', title: 'O2AI 파이프라인 (STT·요약·임베딩) 안정화', progress: 0 },
        { q: 'Q#3', badge: 'blue', title: '얼리 액세스 고객 성공 및 Series A 준비', progress: 23 },
      ],
    },
    {
      id: 'product',
      name: 'Product',
      lead: '커트',
      progress: 86,
      progressVariant: 'success',
      summary: '3 Objectives · 9 KRs',
      objectives: [
        { q: 'Q#1', badge: 'gray', title: 'Phase 1 화면 기획 완성', progress: 86 },
        { q: 'Q#1', badge: 'gray', title: '얼리 액세스 온보딩 설계', progress: 0 },
      ],
      members: [
        { name: '신예은', avatar: AVATARS.신예은 },
        { name: '이서현', avatar: AVATARS.이서현 },
        { name: '김서윤', avatar: AVATARS.김서윤 },
      ],
    },
    {
      id: 'people',
      name: 'People',
      lead: '커트',
      progress: 23,
      progressVariant: 'error',
      summary: '3 Objectives · 9 KRs',
      objectives: [
        { q: 'Q#1', badge: 'gray', title: '팀 운영 체계 수립', progress: 86 },
        { q: 'Q#1', badge: 'gray', title: 'O2IR 준비 및 투자사 대응', progress: 0 },
      ],
    },
  ],
};

/* ── Demo 상세 모달 데이터 (블록 클릭 시) ── */
const DETAIL_QUARTERS = [
  {
    q: 'Q1',
    title: 'Phase 1 제품 완성 및 얼리 액세스 런칭',
    progressLabel: '54%',
    weight: '50%',
    krs: [
      { id: 'KR 1-1', title: 'Phase 1 UI 기획 완료 (16개 화면)', percent: 64, variant: 'warning', valueLabel: '14/16개', weight: '15%' },
      { id: 'KR 1-2', title: 'MVP 핵심 기능 개발 완료', percent: 32, variant: 'error-strong', valueLabel: '20 / 100%', weight: '15%' },
      { id: 'KR 1-3', title: '얼리 액세스 등록 100건', percent: 100, variant: 'brand', valueLabel: 'DONE', weight: '10%' },
    ],
  },
  {
    q: 'Q2',
    title: 'AI 파이프라인 (STT·요약·임베딩) 안정화',
    progressLabel: '54%',
    weight: '50%',
    krs: [
      { id: 'KR 1-1', title: 'Phase 1 UI 기획 완료 (16개 화면)', percent: 64, variant: 'warning', valueLabel: '14/16개', weight: '15%' },
      { id: 'KR 1-2', title: 'MVP 핵심 기능 개발 완료', percent: 64, variant: 'warning', valueLabel: '60 / 100%', weight: '15%' },
      { id: 'KR 1-3', title: '얼리 액세스 등록 100건', percent: 64, variant: 'warning', valueLabel: '45/100건', weight: '10%' },
    ],
  },
  {
    q: 'Q3',
    title: '얼리 액세스 고객 성공 및 Series A 준비',
    progressLabel: '54%',
    weight: '50%',
    krs: [
      { id: 'KR 1-1', title: 'Phase 1 UI 기획 완료 (16개 화면)', percent: 64, variant: 'warning', valueLabel: '14/16개', weight: '15%' },
      { id: 'KR 1-2', title: 'MVP 핵심 기능 개발 완료', percent: 64, variant: 'warning', valueLabel: '60 / 100%', weight: '15%' },
      { id: 'KR 1-3', title: '얼리 액세스 등록 100건', percent: 64, variant: 'warning', valueLabel: '45/100건', weight: '10%' },
    ],
  },
];

const AI_SIGNALS = ['달성률 50% 미만 KR 8개', '아직 시작되지 않은 KR 2개'];

/* ── Demo 개인 OKR (개인 OKR 탭) ── */
const PIC_KURT = { name: '커트', avatar: AVATARS.커트 };

const PERSONAL_KR_BASE = {
  percent: 60,
  barVariant: 'warning',
  percentLabel: '60 / 100%',
  status: { label: '주의', tone: 'warning' },
  teamLink: {
    team: 'Team 1-3',
    title: 'pgveccotr 인덱스 전략 문서 완성',
    percent: 0,
    barVariant: 'error',
    percentLabel: '0%',
    status: { label: '위험', tone: 'error' },
  },
  weight: '40%',
  pic: PIC_KURT,
  feedback: {
    summary: '커트(팀장) 1건',
    comments: [
      { author: '커트(팀장)', date: '04-20', avatar: AVATARS.커트, text: 'pgvector 전략 문서 잘 구성됐습니다. 벤치마크 비교 데이터도 추가해주면 더 좋을 것 같아요.' },
      { author: '박민준', date: '04-17', avatar: AVATARS.박민준, text: '공유해주신 리뷰 내용이 실무에 많이 도움됐습니다.' },
    ],
  },
  initiatives: [
    { title: '인덱스 전략 비교 분석 문서', status: { label: '완료', tone: 'done' }, pic: PIC_KURT },
    { title: 'pgveccotr 인덱스 전략 문서 완성', status: { label: '진행 중', tone: 'progress' }, pic: PIC_KURT },
  ],
  feedbackDetail: {
    krLabel: 'KR 2-1 · 주간 엔지니어링 리뷰 4주 연속 주도',
    objective: 'O#2 엔지니어링 팀 리드 역할 수행',
    comments: [
      {
        author: '커트', role: '매니저', roleTone: 'blue', avatar: AVATARS.커트, date: '04.15', badge: '완료',
        text: '엔지니어링 리뷰 퀄리티가 점점 좋아지고 있습니다. 다음 리뷰에는 기술 부채 이슈를 중점적으로 다뤄주세요.',
      },
      {
        author: '박민준', role: '동료', roleTone: 'gray', avatar: AVATARS.박민준, date: '04.15', badge: '완료',
        text: '공유해주신 리뷰 내용이 실무에 많이 도움됐습니다.',
      },
    ],
  },
};

/* ── Demo 개인 OKR 히스토리 (기간 칩 '히스토리') ── */
const PERSONAL_HISTORY = [
  {
    label: '2025 Q2',
    title: 'Phase 0 — 기반 기술 검증 및 팀 빌딩',
    percent: 54,
    barVariant: 'warning',
    status: { label: '주의', tone: 'warning' },
    objectives: [
      { id: 'O#1', weight: '50%', title: '코어 기술 PoC 완료', percent: 86, tone: 'success' },
      { id: 'O#2', weight: '50%', title: '창업팀 구성 및 역할 정의', percent: 86, tone: 'success' },
      { id: 'O#3', weight: '50%', title: '시장 조사 및 PMF 가설 수립', percent: 38, tone: 'error' },
    ],
    krGroups: [
      {
        id: 'O#1', title: '코어 기술 PoC 완료',
        krs: [
          { id: 'KR 1-1', title: 'Whisper STT 정확도 90% 달성', weight: '40%', status: '완료' },
          { id: 'KR 1-2', title: 'pgvector 검색 PoC 완료', weight: '40%', status: '완료' },
          { id: 'KR 1-3', title: 'AI 요약 프로토타입 완료', weight: '40%', status: '완료' },
        ],
      },
      {
        id: 'O#2', title: '창업팀 구성 및 역할 정의',
        krs: [
          { id: 'KR 2-1', title: '핵심 팀원 4명 확보', weight: '40%', status: '완료' },
          { id: 'KR 2-2', title: '역할 및 R&R 문서 완성', weight: '40%', status: '완료' },
        ],
      },
      {
        id: 'O#3', title: '시장 조사 및 PMF 가설 수립',
        krs: [
          { id: 'KR 3-1', title: 'HR SaaS 시장 분석 리포트', weight: '40%', status: '완료' },
          { id: 'KR 3-2', title: '사용자 인터뷰 10건', weight: '40%', status: '완료' },
        ],
      },
    ],
  },
  {
    label: '2025 Q1',
    title: '아이디어 발굴 및 초기 리서치',
    percent: 35,
    barVariant: 'error',
    status: { label: '위험', tone: 'error' },
    objectives: [
      { id: 'O#1', weight: '60%', title: '문제 정의 및 아이디어 검증', percent: 72, tone: 'success' },
      { id: 'O#2', weight: '40%', title: '초기 프로토타입 방향 수립', percent: 41, tone: 'error' },
    ],
    krGroups: [
      {
        id: 'O#1', title: '문제 정의 및 아이디어 검증',
        krs: [
          { id: 'KR 1-1', title: 'HR 담당자 문제 인터뷰 15건', weight: '50%', status: '완료' },
          { id: 'KR 1-2', title: '경쟁 제품 분석 문서 완성', weight: '50%', status: '완료' },
        ],
      },
      {
        id: 'O#2', title: '초기 프로토타입 방향 수립',
        krs: [
          { id: 'KR 2-1', title: '핵심 유저 시나리오 3종 정의', weight: '50%', status: '완료' },
          { id: 'KR 2-2', title: '기술 스택 선정 및 검증 계획', weight: '50%', status: '완료' },
        ],
      },
    ],
  },
];

const PERSONAL_OKR = {
  person: { name: '김민준', role: 'Engineering · Team Lead', avatar: AVATARS.김민준 },
  periodLabel: '2026년 Q1',
  history: PERSONAL_HISTORY,
  links: [
    { label: '회사 OKR', tone: 'blue' },
    { label: 'Engineering 팀 OKR', tone: 'blue' },
    { label: '개인 OKR', tone: 'purple' },
  ],
  parents: [
    {
      label: '회사 OKR',
      title: 'Phase 1 — AI HR 제품 완성 및 얼리 액세스 런칭',
      summary: 'O#1 Phase 1 제품 완성 · O#2 AI 파이프라인 안정화 · O#3 고객 성공 & Series A',
    },
    {
      label: 'Engineering 팀 OKR',
      title: 'API·AI 파이프라인 구현 및 인프라 구축',
      summary: 'O#1 API 서버 안정화 · O#2 인프라 구축 · O#3 프론트엔드 Phase 1',
    },
  ],
  insights: [
    { title: '달성률 50% 미만인 KR 3개', detail: 'KR 1-2 · KR 2-2' },
    { title: '이니셔티브 진행이 멈춘 KR 1개', detail: 'KR 1-2 · KR 2-2' },
    { title: '아직 시작되지 않은 KR 1개', detail: 'KR 1-2 · KR 2-2' },
  ],
  overall: { percent: 29, status: { label: '위험', tone: 'error' } },
  theme: '2026 Theme : 커트 (CTO) — 2026 개인 OKR',
  objectives: [
    {
      label: 'Objective #1',
      title: 'AI 파이프라인 설계 및 구현 완료',
      teamLink: '팀Team KR 1-2 / 1-3',
      percent: 54,
      barVariant: 'warning',
      percentLabel: '54%',
      status: { label: '주의', tone: 'warning' },
      weight: '50%',
      pic: PIC_KURT,
      krs: [
        {
          ...PERSONAL_KR_BASE,
          label: 'Key Result 1',
          title: 'Phase 1 UI 기획 완료 (16개 화면)',
          updateDetail: { krLabel: 'KR #1-1', method: '개수 달성', unit: '개', total: 16, aiValue: 14, aiMeta: '신뢰도 88% · 오늘 9:12' },
        },
        {
          ...PERSONAL_KR_BASE,
          label: 'Key Result 2',
          title: 'pgveccotr 인덱스 전략 문서 완성',
          updateDetail: { krLabel: 'KR #1-2', method: '진척률 달성', unit: '%', total: 100, aiValue: 60, aiMeta: '신뢰도 92% · 오늘 9:12' },
        },
      ],
    },
    {
      label: 'Objective #2',
      title: '엔지니어링 팀 리드 역할 수행',
      teamLink: '팀Team KR 2-1',
      percent: 35,
      barVariant: 'error',
      percentLabel: '35%',
      status: { label: '위험', tone: 'error' },
      weight: '30%',
      pic: PIC_KURT,
      krs: [],
    },
    {
      label: 'Objective #3',
      title: '성장 및 역량 개발',
      percent: 25,
      barVariant: 'error',
      percentLabel: '25%',
      status: { label: '위험', tone: 'error' },
      weight: '20%',
      pic: PIC_KURT,
      krs: [],
    },
  ],
};

/* ── Demo 팀/Company OKR 보드 ── */
const TEAM_KR = {
  label: 'Key Result',
  title: 'Phase 1 UI 기획 완료 (16개 화면)',
  percent: 88,
  barVariant: 'success',
  percentLabel: '14 / 16',
  status: { label: '정상', tone: 'success' },
  weight: '40%',
  pic: PIC_KURT,
  initiatives: [
    { title: '인덱스 전략 비교 분석 문서', status: { label: '완료', tone: 'done' }, pic: PIC_KURT },
    { title: 'pgveccotr 인덱스 전략 문서 완성', status: { label: '진행 중', tone: 'progress' }, pic: PIC_KURT },
  ],
  updateDetail: { krLabel: 'KR #1-1', method: '개수 달성', unit: '개', total: 16, aiValue: 14, aiMeta: '신뢰도 88% · 오늘 9:12' },
};

const TEAM_BOARD = {
  insights: [
    { title: 'OKR 달성이 위험한 KR 담당자 2명', detail: '커트 · 박민준', action: '원온원 잡기' },
    { title: '아직 시작되지 않은 KR 2개', detail: 'KR 1-2 · KR 2-2' },
  ],
  overall: { percent: 29, status: { label: '위험', tone: 'error' } },
  theme: '2026 Theme : 커트 (CTO) — 2026 {team} 팀 OKR',
  objectives: [
    {
      label: 'Objective #1',
      title: 'Phase 1 제품 완성 및 얼리 액세스 런칭',
      percent: 54, barVariant: 'warning', percentLabel: '54%',
      status: { label: '주의', tone: 'warning' },
      weight: '50%',
      pic: { name: '민현식', team: 'Product 팀', avatar: AVATARS.민현식 },
      krs: [TEAM_KR],
    },
    {
      label: 'Objective #2',
      title: 'AI 파이프라인 (STT·요약·임베딩) 안정화',
      percent: 35, barVariant: 'error', percentLabel: '35%',
      status: { label: '위험', tone: 'error' },
      weight: '50%', pic: PIC_KURT, krs: [],
    },
    {
      label: 'Objective #3',
      title: '얼리 액세스 고객 성공 및 Series A 준비',
      percent: 25, barVariant: 'error', percentLabel: '25%',
      status: { label: '위험', tone: 'error' },
      weight: '50%', pic: PIC_KURT, krs: [],
    },
  ],
};

const COMPANY_BOARD = {
  banner: { label: 'AI 위험 신호 큐레이션', autoChip: false },
  insights: [
    { title: '달성률 50% 미만 KR 8개', detail: 'KR 1-2 · KR 2-2' },
    { title: '아직 시작되지 않은 KR 2개', detail: 'KR 1-2 · KR 2-2' },
  ],
  overall: { percent: 29, status: { label: '위험', tone: 'error' } },
  theme: '2026 Theme : 커트 (CTO) — 2026 Company OKR',
  objectives: [
    {
      label: 'Objective #1',
      title: 'Phase 1 제품 완성 및 얼리 액세스 런칭',
      percent: 86, barVariant: 'warning', percentLabel: '86%',
      status: { label: '주의', tone: 'warning' },
      weight: '50%', pic: PIC_KURT,
      krs: [TEAM_KR],
    },
    {
      label: 'Objective #2',
      title: 'AI 파이프라인 (STT·요약·임베딩) 안정화',
      percent: 35, barVariant: 'error', percentLabel: '35%',
      status: { label: '위험', tone: 'error' },
      weight: '50%', pic: PIC_KURT, krs: [],
    },
    {
      label: 'Objective #3',
      title: '얼리 액세스 고객 성공 및 Series A 준비',
      percent: 25, barVariant: 'error', percentLabel: '25%',
      status: { label: '위험', tone: 'error' },
      weight: '50%', pic: PIC_KURT, krs: [],
    },
  ],
};

/* ── Demo 전략 캔버스 (전사 OKR 탭) ── */
const STRATEGY_ROWS = [
  { id: 'mission', label: 'Mission', sub: 'Why - Purpose', content: '일하는 맥락을 기억하는 HR — 매니저와 팀원이 준비 없이 만나도 의미 있는 대화를 나누고, 그 결과가 다음 행동으로 이어지게 한다.' },
  { id: 'vision', label: 'Vision', sub: 'What', content: '모든 팀이 일하는 방식을 스스로 개선하는 세상' },
  { id: 'values', label: 'Values', sub: 'Why - Purpose', content: '투명성 · 맥락 우선 · 빠른 실행 · 심리적 안전' },
  { id: 'goal', label: '2026 GOAL', sub: 'Mid-term VISION', content: '2026년 얼리 액세스 500팀 달성 및 Series A 투자 유치' },
  { id: 'strategy', label: 'STRATEGY', sub: 'Mid-term VISION', content: 'AI 기반 1on1 자동화 → 평가 연동 → 인사 데이터 통합' },
  { id: 'bigbets', label: 'BIG BETS', sub: 'Mid-term VISION', content: [
    'AI 녹취·요약으로 1on1 마찰 제거',
    '스니핏 기반 수시 평가 시스템',
    'HR 스냅샷으로 관공서·투자사 대응 자동화',
  ] },
  { id: 'metrics', label: 'METRICS', sub: 'Mid-term VISION', content: 'MAU 500팀 · 1on1 완료율 80% · 고객 NPS 50+' },
];

const OKR_DETAILS = {
  company: { title: 'Company OKR', aiSignals: AI_SIGNALS, quarters: DETAIL_QUARTERS },
  eng: { title: 'Engineering', aiSignals: AI_SIGNALS, quarters: DETAIL_QUARTERS },
  product: { title: 'Product', aiSignals: AI_SIGNALS, quarters: DETAIL_QUARTERS },
  people: { title: 'People', aiSignals: AI_SIGNALS, quarters: DETAIL_QUARTERS },
};

const TEAM_OKR = {
  teams: ['Engineering', 'Product', 'People', 'Growth Squad'],
  periodLabel: '2026년 Q1',
  links: PERSONAL_OKR.links,
  parents: PERSONAL_OKR.parents,
  board: TEAM_BOARD,
  history: PERSONAL_HISTORY,
};

/**
 * OkrPage — OKR demo wrapper.
 *
 * 탭 상태·상세 모달 상태·데모 데이터를 소유하고 순수 컴포넌트에 props 로
 * 내린다. 대시보드 외 탭은 시안이 나오면 채운다(현재 placeholder).
 */
export default function OkrPage({ icons, baseUrl }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openGroupId, setOpenGroupId] = useState(null);
  const [year, setYear] = useState('2026');
  const [quarter, setQuarter] = useState('Q1');

  // 탭 전환 시 대시보드 상세 모달이 남아 화면을 덮지 않도록 닫는다.
  const handleTabChange = (tab) => {
    setOpenGroupId(null);
    setActiveTab(tab);
  };

  return (
    <>
      <OkrTabNav tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} year={`${year}년`} quarter={quarter} />

      {activeTab === 'dashboard' ? (
        <>
          <OkrToolbar
            year={year} years={YEARS} onYearChange={setYear}
            quarter={quarter} quarters={QUARTERS} onQuarterChange={setQuarter}
            icons={icons} baseUrl={baseUrl}
          />
          <OkrDashboardCanvas data={{ ...OKR_TREE, quarter }} icons={icons} baseUrl={baseUrl} onBlockClick={setOpenGroupId} />
        </>
      ) : activeTab === 'company' ? (
        <>
          <div className="okr-header-actions">
            <button className="okr-ghost-btn">OKR 설정</button>
            <button className="okr-ghost-btn">컨텍스트 설정</button>
            <button className="okr-write-btn is-inline">
              <Icon src={icons.plus} size={20} color="var(--text-white)" baseUrl={baseUrl} />
              <span>작성</span>
            </button>
          </div>
          <OkrStrategyCanvas rows={STRATEGY_ROWS} companyBoard={COMPANY_BOARD} history={PERSONAL_HISTORY} icons={icons} baseUrl={baseUrl} />
        </>
      ) : activeTab === 'team' ? (
        <>
          <button className="okr-write-btn">
            <Icon src={icons.plus} size={20} color="var(--text-white)" baseUrl={baseUrl} />
            <span>작성</span>
          </button>
          <OkrTeamCanvas data={TEAM_OKR} icons={icons} baseUrl={baseUrl} />
        </>
      ) : activeTab === 'personal' ? (
        <>
          <button className="okr-write-btn">
            <Icon src={icons.plus} size={20} color="var(--text-white)" baseUrl={baseUrl} />
            <span>작성</span>
          </button>
          <OkrPersonalCanvas data={PERSONAL_OKR} icons={icons} baseUrl={baseUrl} />
        </>
      ) : (
        <div className="canvas-area okr-canvas-area okr-tab-placeholder">준비 중인 화면입니다</div>
      )}

      <OkrDetailModal
        detail={openGroupId ? OKR_DETAILS[openGroupId] : null}
        icons={icons}
        baseUrl={baseUrl}
        onClose={() => setOpenGroupId(null)}
      />
    </>
  );
}
