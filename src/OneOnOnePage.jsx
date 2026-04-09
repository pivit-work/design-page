import { useState } from 'react';
import { OneOnOneDashboardCanvas } from './components/oneonone/index.js';

/* ── Asset URLs (demo-only) ── */
const ASSETS = {
  profileYun: 'https://www.figma.com/api/mcp/asset/0d6bbe1c-58f3-4d7a-a646-7bbd1bb8cd43',
  profileShin: 'https://www.figma.com/api/mcp/asset/fad1459f-c272-404c-906e-655768b682fb',
  profileKimSeo: 'https://www.figma.com/api/mcp/asset/8fc4672e-63a8-4490-980a-bc0cb1bcdefb',
  profileHan: 'https://www.figma.com/api/mcp/asset/6fef782a-5aa7-4e2d-b4c0-8cc37a9e6ae8',
  profileKimJi: 'https://www.figma.com/api/mcp/asset/cf71edf2-fb73-451e-87c7-d8cf6c89361d',
  trendUp: '/icons-solid/trend-up-01.svg',
  alertTriangle: '/icons-solid/alert-triangle.svg',
  heartCircle: '/icons-solid/heart-circle.svg',
};

/* ── Demo Data ── */
const MEMBERS = [
  {
    id: 1, name: '윤수민', role: 'Frontend Developer', avatar: ASSETS.profileYun,
    status: 'preparing', statusLabel: '준비 중',
    tags: [{ type: 'positive', icon: ASSETS.heartCircle, text: '이 분은 너무 잘하고 있어요.' }],
    okr: 50, okrColor: 'blue',
    healthCheck: { score: 5.1, label: '주의', color: 'red' },
    memberReady: 66, managerReady: 70, readyColor: 'blue',
    actionItems: { done: 2, total: 3, percent: 66, color: 'blue' },
    prevDate: '2026.03.28', nextDate: '2026.04.31',
  },
  {
    id: 2, name: '신하람', role: 'Frontend Developer', avatar: ASSETS.profileShin,
    status: 'done', statusLabel: '완료',
    tags: [{ type: 'positive', icon: ASSETS.heartCircle, text: '이 분은 너무 잘하고 있어요.' }],
    okr: 72, okrColor: 'green',
    healthCheck: { score: 7.9, label: '좋음', color: 'green' },
    memberReady: null, managerReady: null, readyColor: null,
    actionItems: { done: 4, total: 4, percent: 100, color: 'green' },
    prevDate: '2026.03.28', nextDate: '2026.04.31',
  },
  {
    id: 3, name: '김서윤', role: 'Frontend Developer', avatar: ASSETS.profileKimSeo,
    status: 'meeting', statusLabel: '미팅 중', active: true,
    tags: [
      { type: 'warning', icon: ASSETS.alertTriangle, text: '번아웃 주의' },
      { type: 'warning', icon: null, text: 'OKR 위험' },
      { type: 'warning', icon: null, text: '1 on 1 미예약' },
    ],
    okr: 50, okrColor: 'red',
    healthCheck: { score: 5.1, label: '주의', color: 'red' },
    memberReady: 25, managerReady: 30, readyColor: 'red',
    actionItems: { done: 1, total: 3, percent: 33, color: 'red' },
    prevDate: '2026.03.28', nextDate: '2026.04.31',
  },
  {
    id: 4, name: '한지후', role: 'Frontend Developer', avatar: ASSETS.profileHan,
    status: 'preparing', statusLabel: '준비 중',
    tags: [{ type: 'warning', icon: null, text: 'OKR 위험' }],
    okr: 90, okrColor: 'green',
    healthCheck: { score: 9.1, label: '좋음', color: 'green' },
    memberReady: 25, managerReady: 0, readyColor: 'red',
    actionItems: { done: 2, total: 3, percent: 66, color: 'blueLight' },
    prevDate: '2026.03.28', nextDate: '2026.04.31',
  },
  {
    id: 5, name: '김지석', role: 'Frontend Developer', avatar: ASSETS.profileKimJi,
    status: 'unbooked', statusLabel: '미예약',
    tags: [{ type: 'warning', icon: null, text: '1 on 1 미예약' }],
    okr: 61, okrColor: 'blueLight',
    healthCheck: { score: 6.8, label: '주의', color: 'blueLight' },
    memberReady: null, managerReady: null, readyColor: null,
    actionItems: null,
    prevDate: '2026.03.28', nextDate: '미예약',
  },
];

const STATS = [
  { label: '전체 팀원 수', value: 5, bg: 'var(--bg-quaternary)' },
  { label: '준비 중', value: 2, bg: 'radial-gradient(133.34% 93.36% at -0.18% 108.82%, var(--utility-brand-200), var(--utility-brand-50))', color: 'var(--text-brand-tertiary)', icon: '/icons-solid/trend-up-01.svg' },
  { label: '미팅 중', value: 1, bg: 'var(--utility-blue-light-50)', color: 'var(--utility-blue-500)', dot: true },
  { label: '완료', value: 1, bg: 'var(--bg-quaternary)' },
  { label: 'HC 주의', value: 0, bg: 'var(--bg-error-primary)', color: 'var(--text-error-primary)', icon: '/icons-solid/alert-triangle.svg' },
  { label: '미예약', value: 1, bg: 'var(--bg-primary)', border: true },
];

const TABS = [
  { key: 'all', label: '전체' },
  { key: 'preparing', label: '준비 중' },
  { key: 'meeting', label: '미팅 중' },
  { key: 'done', label: '완료' },
  { key: 'hc', label: 'HC주의' },
];

/* ── Exported Demo Content Component ── */
export default function OneOnOneContent({ Icon }) {
  const [activeTab, setActiveTab] = useState('all');

  const subtitle = (
    <>
      <b>김지수 매니저</b>
      <span className="dot">&#8729;</span>
      <span className="brand-text">개발팀 5명</span>
    </>
  );

  return (
    <OneOnOneDashboardCanvas
      title="원온원"
      subtitle={subtitle}
      stats={STATS}
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      members={MEMBERS}
      onAddClick={() => {}}
      addLabel="1on1 일정 추가"
      Icon={Icon}
    />
  );
}
