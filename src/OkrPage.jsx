import { useState } from 'react';
import {
  OkrTabNav, OkrToolbar, OkrDashboardCanvas, OkrDetailModal, OkrPersonalCanvas,
  OkrTeamCanvas, OkrStrategyCanvas, OkrComposeFullModal, OkrSetupWizardModal,
  OkrContextBanner, OkrContextSetupModal, OkrResourceCanvas, Icon,
} from './components';

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

/* ── Demo 개인 OKR 작성 모달 — KR 담당자 검색 드롭다운 후보(§3.8A) ── */
const COMPOSE_MEMBERS = [
  { id: 'm-kurt', name: '커트', role: 'Engineering · Team Lead', avatar: AVATARS.커트 },
  { id: 'm-minjun', name: '박민준', role: 'Engineering · Member', avatar: AVATARS.박민준 },
  { id: 'm-seoyun', name: '김서윤', role: 'Product · Member', avatar: AVATARS.김서윤 },
  { id: 'm-yeeun', name: '신예은', role: 'Design · Team Lead', avatar: AVATARS.신예은 },
  { id: 'm-seohyun', name: '이서현', role: 'Product · Admin', avatar: AVATARS.이서현 },
  // 아바타가 없는 멤버 — 이니셜 폴백 확인용.
  { id: 'm-hyunsik', name: '민현식', role: 'Sales · Member', color: '#4F6AF5' },
];

/* ── Demo 개인 OKR 작성 모달 — 팀 OKR 미니맵 ── */
const COMPOSE_MINIMAP = {
  title: 'API , AI 파이프라인 구현 및 인프라 구축',
  company: { label: '회사 OKR', title: 'Phase 1 — AI HR 제품 완성 및 얼리 액세스 런칭' },
  groups: [
    {
      q: 'Q1', title: 'API 서버 안정화',
      krs: [
        { id: 'KR 1-1', title: '핵심 API 엔드포인트 20개 완성', percent: 62 },
        { id: 'KR 1-2', title: 'Whisper STT 파이프라인 구현', percent: 24 },
        { id: 'KR 1-3', title: 'pgvector 임베딩 검색 200ms 달성', percent: 8 },
      ],
    },
    {
      q: 'Q1', title: '인프라 구축',
      krs: [
        { id: 'KR 2-1', title: 'CI/CD 파이프라인 구성 완료', percent: 62 },
        { id: 'KR 2-2', title: '스테이징 환경 구축 완료', percent: 24 },
        { id: 'KR 2-3', title: '에러율 1% 미만 유지', percent: 8 },
      ],
    },
    {
      q: 'Q1', title: '프론트엔드 Phase 1',
      krs: [
        { id: 'KR 3-1', title: '타임라인 피드 뷰 구현', percent: 62 },
        { id: 'KR 3-2', title: '1on1 화면 3단계 구현', percent: 24 },
        { id: 'KR 3-3', title: '어드민 화면 구현', percent: 8 },
      ],
    },
  ],
};

const TEAM_OKR = {
  teams: ['Engineering', 'Product', 'People', 'Growth Squad'],
  periodLabel: '2026년 Q1',
  links: PERSONAL_OKR.links,
  parents: PERSONAL_OKR.parents,
  board: TEAM_BOARD,
  history: PERSONAL_HISTORY,
};

/* ── Demo 내 리소스(리소스 투입) — Figma 17478:21448 외 6종.
   segments/bullets 의 색은 식별 데이터라 토큰 var() 문자열로 실어 보낸다. */
const RS_AVATARS = {
  어니스트: 'https://i.pravatar.cc/200?img=59',
  조아연: 'https://i.pravatar.cc/200?img=47',
  조이안: 'https://i.pravatar.cc/200?img=44',
  김시윤: 'https://i.pravatar.cc/200?img=12',
  이서훈: 'https://i.pravatar.cc/200?img=53',
  박민준: 'https://i.pravatar.cc/200?img=68',
  신예은: 'https://i.pravatar.cc/200?img=31',
  오지후: 'https://i.pravatar.cc/200?img=61',
  최수빈: 'https://i.pravatar.cc/200?img=36',
  김지안: 'https://i.pravatar.cc/200?img=15',
};
const RS_COMMENTS = [
  { author: '김시윤', avatar: RS_AVATARS.김시윤, date: '2026.03.15', text: '어니스트, p1+p2 합이 110%인데 한쪽 우선순위 정리 필요해요. p2 비중을 50% 이하로.' },
  { author: '어니스트', avatar: RS_AVATARS.어니스트, date: '2026.03.15', reply: true, text: '네, 가천대 파일럿 온보딩 끝나는 5월 말부터 p2를 50%로 내리겠습니다.' },
];
const RESOURCE_DATA = {
  title: '리소스 투입',
  org: '플랫폼 부문',
  month: '2026-07',
  owner: '어니스트',
  role: '부문장 · Org_head',
  my: {
    stats: { total: 91, items: 2, kr: [2, 3], status: '과부하' },
    aiEstimate: {
      period: '07-03 ~ 07-09',
      tagged: '태그된 스니핏 8/9건',
      items: [
        { name: 'PIVIT V2.0', pct: 60 },
        { name: '가천대 파일럿', pct: 30 },
        { name: 'IR 덱 준비', pct: 10 },
      ],
    },
    entries: [
      { id: 'rs-1', name: 'PIVIT V2.0', tag: '프로덕트 스쿼드', value: 56, estimate: 60 },
      { id: 'rs-2', name: '가천대 파일럿', tag: '프로덕트 스쿼드', value: 56, estimate: 30, warn: '스니핏 기록과 차이 큼' },
    ],
    redFlag: '레드플래그 감지 — 헬스 3회 연속 하락 + 감정 톤 부정 비율 상승',
    suggestions: [{ name: 'IR 덱 준비', pct: 10 }],
    // 추가 항목들도 기본 퍼센트(스니핏 추정값)를 갖는다 — 추가 시 그 값이
    // 슬라이더 초기값·추정치 마커로 반영된다.
    squads: [
      { name: 'GTM 스쿼드', items: [{ name: '추정치 적용', pct: 12 }, { name: '엔터프라이즈 세일즈', pct: 8 }] },
      { name: 'AI 스쿼드', items: [{ name: 'AI 리포트 엔진', pct: 15 }, { name: '데이터 파이프라인', pct: 20 }] },
      { name: '운영개선 스쿼드', items: [{ name: '온보딩 자동화', pct: 16 }, { name: '파트너 연동', pct: 5 }] },
    ],
    krs: [
      { id: 'KR 1-1', title: 'UI 화면 기획 32개 완성', sub: 'O: PIVIT v2.0 제품 기획 완성 · 연결 프로젝트: PIVIT v2.0', project: 'PIVIT v2.0', pct: 25 },
      { id: 'KR 1-2', title: '유저 플로우 맵 완성', sub: 'O: PIVIT v2.0 제품 기획 완성 · 연결 프로젝트: PIVIT v2.0', project: 'PIVIT v2.0', pct: 20 },
      { id: 'KR 1-3', title: '사용자 인터뷰 5건 완료', sub: 'O: 가천대 파일럿 VOC 확보 · 연결 프로젝트: 가천대 파일럿', project: '가천대 파일럿', pct: 15 },
    ],
    comments: RS_COMMENTS,
  },
  team: {
    label: '플랫폼 부문 ∙ 직속 2명',
    stats: { total: 2, relaxed: 0, focused: 0, overloaded: 2 },
    commentPlaceholder: '예) 어니스트 p2 우선순위 정리 필요. 5월말까지 50% 이하로 조정.',
    // [코멘트 남기기] 로 달리는 새 코멘트의 작성자(현재 사용자) — 데모는 부문장 어니스트.
    commentAuthor: { name: '어니스트', avatar: RS_AVATARS.어니스트 },
    commentDate: '2026.07.10',
    members: [
      {
        name: '어니스트', role: 'CPO', status: '과부하', pct: 56, avatar: RS_AVATARS.어니스트,
        segments: [
          { pct: 47, color: 'var(--utility-success-200)' },
          { pct: 33, color: 'var(--utility-blue-200)' },
        ],
        items: [
          { text: 'PIVIT V2.0 60%', color: 'var(--utility-green-500)' },
          { text: '가천대 파일럿 60%', color: 'var(--utility-blue-500)' },
        ],
        comments: RS_COMMENTS,
      },
      {
        name: '조아연', role: 'CPO', status: '과부하', pct: 56, avatar: RS_AVATARS.조아연,
        segments: [
          { pct: 44, color: 'var(--utility-success-200)' },
          { pct: 24, color: 'var(--utility-blue-200)' },
          { pct: 18, color: 'var(--utility-purple-200)' },
        ],
        items: [
          { text: '데이터 파이프라인 32%', color: 'var(--utility-green-500)' },
          { text: 'PIVIT v2.0 30%', color: 'var(--utility-blue-500)' },
          { text: 'IR 덱 준비 43%', color: 'var(--utility-purple-500)' },
        ],
        // 이서훈 코멘트는 답글이 아니라 별개 코멘트 — 시안(24312)에 들여쓰기 없음.
        comments: [
          RS_COMMENTS[0],
          { author: '이서훈', avatar: RS_AVATARS.이서훈, date: '2026.03.15', text: 'ㅋㅋㅋㅋ 잘 좀 하셈' },
        ],
      },
    ],
  },
  orgView: {
    label: '플랫폼 부문',
    stats: { total: 12, sub: '투입인력 : 12/12명', avg: 92, overloaded: 2, missing: 0 },
    teams: [
      {
        org: '플랫폼 부문', name: '플랫폼 개발팀', lead: '박민준', pct: 80, size: 5, entered: 5,
        sub: '투입인력 : 12/12명', overloaded: 0, missing: 0,
        segments: [
          { pct: 20, color: 'var(--utility-success-200)' },
          { pct: 17, color: 'var(--utility-blue-200)' },
          { pct: 13, color: 'var(--utility-indigo-200)' },
          { pct: 10, color: 'var(--utility-purple-200)' },
          { pct: 8, color: 'var(--utility-pink-200)' },
          { pct: 5, color: 'var(--utility-error-200)' },
        ],
        bullets: [
          { text: 'PIVIT V2.0 60%', color: 'var(--utility-green-500)' },
          { text: '가천대 파일럿 60%', color: 'var(--utility-blue-500)' },
          { text: '온보딩 자동화 평균 16%', color: 'var(--utility-indigo-700)' },
          { text: 'IR 덱 준비 평균 11%', color: 'var(--fg-warning-primary)' },
          { text: '파트너 연동 평균 5%', color: 'var(--utility-pink-500)' },
          { text: '엔터프라이즈 세일즈 평균 3%', color: 'var(--utility-error-700)' },
        ],
        members: [
          { name: '박민준', role: 'BE', status: '여유', pct: 76, avatar: RS_AVATARS.박민준, segments: [{ pct: 33, color: 'var(--utility-success-200)' }, { pct: 30, color: 'var(--utility-blue-200)' }] },
          { name: '신예은', role: 'BE', status: '적정', pct: 92, avatar: RS_AVATARS.신예은, segments: [{ pct: 54, color: 'var(--utility-success-200)' }, { pct: 30, color: 'var(--utility-blue-200)' }] },
          { name: '오지후', role: 'BE', status: '적정', pct: 63, avatar: RS_AVATARS.오지후, segments: [{ pct: 24, color: 'var(--utility-success-200)' }, { pct: 30, color: 'var(--utility-blue-200)' }] },
          { name: '최수빈', role: 'BE', status: '쏠림', pct: 98, avatar: RS_AVATARS.최수빈, segments: [{ pct: 33, color: 'var(--utility-success-200)' }, { pct: 30, color: 'var(--utility-blue-200)' }, { pct: 27, color: 'var(--utility-error-200)' }] },
          { name: '김지안', role: 'BE', status: '쏠림', pct: 12, avatar: RS_AVATARS.김지안, segments: [{ pct: 33, color: 'var(--utility-success-200)' }, { pct: 30, color: 'var(--utility-blue-200)' }, { pct: 27, color: 'var(--utility-error-200)' }] },
        ],
      },
      {
        org: '플랫폼 부문', name: '플랫폼 QA팀', lead: '박민준', pct: 97, size: 5, entered: 5,
        sub: '투입인력 : 12/12명', overloaded: 0, missing: 0,
        segments: [
          { pct: 32, color: 'var(--utility-success-200)' },
          { pct: 18, color: 'var(--utility-blue-200)' },
          { pct: 8, color: 'var(--utility-indigo-200)' },
          { pct: 6, color: 'var(--utility-purple-200)' },
          { pct: 4, color: 'var(--utility-pink-200)' },
        ],
        bullets: [
          { text: 'PIVIT V2.0 60%', color: 'var(--utility-green-500)' },
          { text: '가천대 파일럿 60%', color: 'var(--utility-blue-500)' },
          { text: '온보딩 자동화 평균 16%', color: 'var(--utility-indigo-700)' },
          { text: 'IR 덱 준비 평균 11%', color: 'var(--fg-warning-primary)' },
          { text: '파트너 연동 평균 5%', color: 'var(--utility-pink-500)' },
          { text: '엔터프라이즈 세일즈 평균 3%', color: 'var(--utility-error-700)' },
        ],
        members: [
          { name: '신예은', role: 'QA', status: '적정', pct: 92, avatar: RS_AVATARS.신예은, segments: [{ pct: 54, color: 'var(--utility-success-200)' }, { pct: 30, color: 'var(--utility-blue-200)' }] },
          { name: '오지후', role: 'QA', status: '적정', pct: 63, avatar: RS_AVATARS.오지후, segments: [{ pct: 24, color: 'var(--utility-success-200)' }, { pct: 30, color: 'var(--utility-blue-200)' }] },
        ],
      },
    ],
    directs: [
      { name: '어니스트', role: 'CPO', status: '과부하', pct: 56, avatar: RS_AVATARS.어니스트, segments: [{ pct: 47, color: 'var(--utility-success-200)' }, { pct: 33, color: 'var(--utility-blue-200)' }] },
      { name: '조이안', role: 'ML', status: '과부하', pct: 56, avatar: RS_AVATARS.조이안, segments: [{ pct: 47, color: 'var(--utility-success-200)' }, { pct: 33, color: 'var(--utility-blue-200)' }] },
    ],
  },
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
  const [composeOpen, setComposeOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [ctxOpen, setCtxOpen] = useState(false);
  // [오늘 보지 않기] — 오늘 날짜 키로 localStorage 에 기억해 당일 재방문에도 숨긴다.
  // 배너가 안 그려지면 .app:has() 배너-공존 규칙도 함께 풀려 셸이 원위치로 올라온다.
  const bannerKey = new Date().toISOString().slice(0, 10);
  const [bannerHidden, setBannerHidden] = useState(
    () => localStorage.getItem('okr-ctx-banner-hidden') === bannerKey,
  );
  const dismissBanner = () => {
    localStorage.setItem('okr-ctx-banner-hidden', bannerKey);
    setBannerHidden(true);
  };

  // 탭 전환 시 대시보드 상세 모달이 남아 화면을 덮지 않도록 닫는다.
  const handleTabChange = (tab) => {
    setOpenGroupId(null);
    setActiveTab(tab);
  };

  return (
    <>
      {/* 컨텍스트 미설정 안내 바 — Figma 17260:22116. [설정] → 컨텍스트 설정 모달,
          [오늘 보지 않기] → 당일 숨김. */}
      {!bannerHidden && (
        <OkrContextBanner onSetup={() => setCtxOpen(true)} onDismiss={dismissBanner} />
      )}
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
            <button className="okr-ghost-btn" onClick={() => setSetupOpen(true)}>OKR 설정</button>
            <button className="okr-ghost-btn" onClick={() => setCtxOpen(true)}>컨텍스트 설정</button>
            <button className="okr-write-btn is-inline" onClick={() => setComposeOpen(true)}>
              <Icon src={icons.plus} size={20} color="var(--text-white)" baseUrl={baseUrl} />
              <span>작성</span>
            </button>
          </div>
          <OkrStrategyCanvas rows={STRATEGY_ROWS} companyBoard={COMPANY_BOARD} history={PERSONAL_HISTORY} icons={icons} baseUrl={baseUrl} />
        </>
      ) : activeTab === 'team' ? (
        <>
          <button className="okr-write-btn" onClick={() => setComposeOpen(true)}>
            <Icon src={icons.plus} size={20} color="var(--text-white)" baseUrl={baseUrl} />
            <span>작성</span>
          </button>
          <OkrTeamCanvas data={TEAM_OKR} icons={icons} baseUrl={baseUrl} />
        </>
      ) : activeTab === 'personal' ? (
        <>
          <button className="okr-write-btn" onClick={() => setComposeOpen(true)}>
            <Icon src={icons.plus} size={20} color="var(--text-white)" baseUrl={baseUrl} />
            <span>작성</span>
          </button>
          <OkrPersonalCanvas data={PERSONAL_OKR} icons={icons} baseUrl={baseUrl} />
        </>
      ) : activeTab === 'resources' ? (
        <OkrResourceCanvas data={RESOURCE_DATA} icons={icons} baseUrl={baseUrl} />
      ) : (
        <div className="canvas-area okr-canvas-area okr-tab-placeholder">준비 중인 화면입니다</div>
      )}

      {composeOpen && (
        <OkrComposeFullModal
          minimap={COMPOSE_MINIMAP}
          icons={icons}
          baseUrl={baseUrl}
          members={COMPOSE_MEMBERS}
          selfId="m-kurt"
          onClose={() => setComposeOpen(false)}
        />
      )}
      {setupOpen && (
        <OkrSetupWizardModal icons={icons} baseUrl={baseUrl} onClose={() => setSetupOpen(false)} />
      )}
      {ctxOpen && (
        <OkrContextSetupModal
          icons={icons}
          baseUrl={baseUrl}
          onClose={() => setCtxOpen(false)}
          onStartOkr={() => { setCtxOpen(false); setSetupOpen(true); }}
        />
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
