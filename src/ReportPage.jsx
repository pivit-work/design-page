import { useRef, useState } from 'react';
import { ReportCanvas } from './components';
import { DEMO_WEEKLY_REPORT } from './components/timeline/weekly-demo-data.js';

/**
 * ReportPage — "리포트" 페이지 demo wrapper.
 * Figma 16883:27926.
 *
 * 흐름:
 *   - 행 클릭 (weeklyReport 보유 행만) → 디테일 뷰 진입
 *   - 이번주 행 "지금 생성하기" 클릭 → 디테일 뷰 진입(로딩) →
 *     4초 후 DEMO_WEEKLY_REPORT 주입, 라벨이 "다시 생성하기"로 바뀜
 */
export default function ReportPage({ baseUrl }) {
  const [currentWeekReport, setCurrentWeekReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const generateTimerRef = useRef(null);

  const reports = [
    {
      id: 'w-current',
      badge: '이번주',
      dateRange: '2026년 4월 7일 ~ 4월 12일',
      status: '진행 중',
      isActive: true,
      showGenerate: true,
      generateLabel: currentWeekReport ? '다시 생성하기' : '지금 생성하기',
      // 생성 후엔 weeklyReport 보유 — 이번주 행 클릭 시 디테일 진입.
      weeklyReport: currentWeekReport,
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

  const selectedReport =
    selectedReportId ? reports.find((r) => r.id === selectedReportId) ?? null : null;

  const handleReportClick = (r) => {
    if (r.weeklyReport) setSelectedReportId(r.id);
  };

  const handleGenerate = (r) => {
    if (isGenerating) return;
    setSelectedReportId(r.id);
    setIsGenerating(true);
    if (generateTimerRef.current) clearTimeout(generateTimerRef.current);
    generateTimerRef.current = setTimeout(() => {
      setCurrentWeekReport(DEMO_WEEKLY_REPORT);
      setIsGenerating(false);
    }, 4000);
  };

  return (
    <ReportCanvas
      baseUrl={baseUrl}
      count={34}
      periodTitle="이번 주"
      periodRange="2026년 4월 7일 ~ 4월 14일"
      reports={reports}
      selectedReport={selectedReport}
      isGenerating={isGenerating}
      onReportClick={handleReportClick}
      onCloseReport={() => setSelectedReportId(null)}
      onReportGenerate={handleGenerate}
    />
  );
}
