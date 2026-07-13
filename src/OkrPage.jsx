import { useState } from 'react';
import { OkrTabNav, OkrToolbar, OkrDashboardCanvas, OkrDetailModal, OkrPersonalCanvas, Icon } from './components';

/* ── Demo Avatars ── */
const AVATARS = {
  신예은: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  이서현: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  김서윤: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
  김민준: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  커트: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face',
  박민준: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
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
};

const PERSONAL_OKR = {
  person: { name: '김민준', role: 'Engineering · Team Lead', avatar: AVATARS.김민준 },
  periodLabel: '2026년 Q1',
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
        { ...PERSONAL_KR_BASE, label: 'Key Result 1', title: 'pgveccotr 인덱스 전략 문서 완성' },
        { ...PERSONAL_KR_BASE, label: 'Key Result 2', title: 'pgveccotr 인덱스 전략 문서 완성' },
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

const OKR_DETAILS = {
  company: { title: 'Company OKR', aiSignals: AI_SIGNALS, quarters: DETAIL_QUARTERS },
  eng: { title: 'Engineering', aiSignals: AI_SIGNALS, quarters: DETAIL_QUARTERS },
  product: { title: 'Product', aiSignals: AI_SIGNALS, quarters: DETAIL_QUARTERS },
  people: { title: 'People', aiSignals: AI_SIGNALS, quarters: DETAIL_QUARTERS },
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
