import { ReportCanvas } from './components';

/**
 * ReportPage — "리포트" 페이지 demo wrapper.
 * Figma 16883:27926 기준.
 */
const DEMO_REPORTS = [
  {
    id: 'w-current',
    badge: '이번주',
    dateRange: '2026년 4월 7일 ~ 4월 12일',
    status: '진행 중',
    isActive: true,
    snippetCount: 9,
    activeDays: 5,
    healthScore: 8.7,
    healthLevel: 'good',
  },
  {
    id: 'w-1',
    badge: '지난주',
    dateRange: '2026년 3월 31일 ~ 4월 4일',
    snippetCount: 9,
    activeDays: 5,
    healthScore: 8.7,
    healthLevel: 'good',
  },
  {
    id: 'w-2',
    badge: '-',
    dateRange: '2026년 3월 25일 ~ 3월 30일',
    snippetCount: 9,
    activeDays: 5,
    healthScore: 6.5,
    healthLevel: 'warning',
  },
  {
    id: 'w-3',
    badge: '-',
    dateRange: '2026년 3월 25일 ~ 3월 30일',
    snippetCount: 9,
    activeDays: 5,
    healthScore: 6.5,
    healthLevel: 'warning',
  },
  {
    id: 'w-4',
    badge: '-',
    dateRange: '2026년 3월 25일 ~ 3월 30일',
    snippetCount: 9,
    activeDays: 5,
    healthScore: 3.8,
    healthLevel: 'error',
  },
];

export default function ReportPage({ baseUrl }) {
  return (
    <ReportCanvas
      baseUrl={baseUrl}
      count={34}
      periodTitle="이번 주"
      periodRange="2026년 4월 7일 ~ 4월 14일"
      reports={DEMO_REPORTS}
    />
  );
}
