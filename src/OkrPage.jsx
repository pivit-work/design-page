import { useState } from 'react';
import { OkrTabNav, OkrToolbar, OkrDashboardCanvas, OkrDetailModal } from './components';

/* ── Demo Avatars ── */
const AVATARS = {
  신예은: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  이서현: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  김서윤: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
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

  return (
    <>
      <OkrTabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} year={`${year}년`} quarter={quarter} />

      {activeTab === 'dashboard' ? (
        <>
          <OkrToolbar
            year={year} years={YEARS} onYearChange={setYear}
            quarter={quarter} quarters={QUARTERS} onQuarterChange={setQuarter}
            icons={icons} baseUrl={baseUrl}
          />
          <OkrDashboardCanvas data={{ ...OKR_TREE, quarter }} icons={icons} baseUrl={baseUrl} onBlockClick={setOpenGroupId} />
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
