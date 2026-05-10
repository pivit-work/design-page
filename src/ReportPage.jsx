import { useState } from 'react';
import { ReportCanvas } from './components';
import { DEMO_WEEKLY_REPORT } from './components/timeline/weekly-demo-data.js';

/**
 * ReportPage — "리포트" 페이지 demo wrapper.
 * Figma 16883:27926.
 *
 * 행을 클릭하면 selectedReport state 가 세팅되어 ReportCanvas 가
 * TimelineWeeklyView 디테일 뷰를 렌더 (목록 → 디테일 전환).
 */
const DEMO_REPORTS = [
  {
    id: 'w-current',
    badge: '이번주',
    dateRange: '2026년 4월 7일 ~ 4월 12일',
    status: '진행 중',
    isActive: true,
    showGenerate: true,
    // 미생성 상태 — weeklyReport 없음. 클릭해도 디테일 안 열림.
  },
  {
    id: 'w-1',
    badge: '지난주',
    dateRange: '2026년 3월 31일 ~ 4월 4일',
    snippetCount: 9,
    activeDays: 5,
    healthScore: 8.7,
    healthLevel: 'good',
    weeklyReport: DEMO_WEEKLY_REPORT,
  },
  {
    id: 'w-2',
    badge: '-',
    dateRange: '2026년 3월 25일 ~ 3월 30일',
    snippetCount: 9,
    activeDays: 5,
    healthScore: 6.5,
    healthLevel: 'warning',
    weeklyReport: DEMO_WEEKLY_REPORT,
  },
  {
    id: 'w-3',
    badge: '-',
    dateRange: '2026년 3월 25일 ~ 3월 30일',
    snippetCount: 9,
    activeDays: 5,
    healthScore: 6.5,
    healthLevel: 'warning',
    weeklyReport: DEMO_WEEKLY_REPORT,
  },
  {
    id: 'w-4',
    badge: '-',
    dateRange: '2026년 3월 25일 ~ 3월 30일',
    snippetCount: 9,
    activeDays: 5,
    healthScore: 3.8,
    healthLevel: 'error',
    weeklyReport: DEMO_WEEKLY_REPORT,
  },
];

export default function ReportPage({ baseUrl }) {
  const [selectedReport, setSelectedReport] = useState(null);

  const handleReportClick = (r) => {
    if (r.weeklyReport) setSelectedReport(r);
  };

  return (
    <ReportCanvas
      baseUrl={baseUrl}
      count={34}
      periodTitle="이번 주"
      periodRange="2026년 4월 7일 ~ 4월 14일"
      reports={DEMO_REPORTS}
      selectedReport={selectedReport}
      onReportClick={handleReportClick}
      onCloseReport={() => setSelectedReport(null)}
    />
  );
}
