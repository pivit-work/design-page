import { useRef, useState } from 'react';
import { ReportCanvas } from './components';
import { DEMO_WEEKLY_REPORT } from './components/timeline/weekly-demo-data.js';

/**
 * ReportPage — "리포트" 페이지 demo wrapper.
 * Figma 16883:27926 (Weekly) / 16883:28267 (Monthly).
 *
 * 흐름:
 *   - 행 클릭 (weeklyReport 보유 행만) → 풀 모달로 리포트 보기
 *   - "지금 생성하기"/"이번달 리포트 생성하기" → 풀 모달(로딩) →
 *     4초 후 DEMO_WEEKLY_REPORT 주입
 *   - period 탭(Weekly/Monthly/...)별 배너·타이틀·리스트는 PERIOD_CONTENT 소유
 */
const WEEKLY_SUMMARY =
  '이번 주는 Phase 1 기획 완성도를 높이는 데 집중한 한 주였습니다. IA 구조 정의, 어드민 클릭 액션 정의, RBAC 설계 등 핵심 산출물이 완성됐으며, 팀 전체 회의 2회를 통해 방향성이 정렬됐습니다. 헬스체크는 주 평균 8.1로 안정적이었고, 수요일 이후 꾸준히 유지됐습니다.';

export default function ReportPage({ baseUrl }) {
  const [period, setPeriod] = useState('weekly');
  const [currentWeekReport, setCurrentWeekReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const generateTimerRef = useRef(null);

  const weeklyRows = [
    {
      id: 'w-current',
      dateRange: '2026년 5월 11일 ~ 5월 15일',
      status: '진행 중',
      isActive: true,
      showGenerate: true,
      generateLabel: currentWeekReport ? '다시 생성하기' : '지금 생성하기',
      snippetCount: 1,
      activeDays: 1,
      healthScore: 4.3,
      healthLevel: 'warning',
      weeklyReport: currentWeekReport,
      generatedAt: currentWeekReport ? '2026.05.15 (금) 오후 6:00 자동 생성' : null,
    },
    {
      id: 'w-1',
      dateRange: '2026년 5월 4일 ~ 5월 8일',
      snippetCount: 9, activeDays: 5, healthScore: 8.7, healthLevel: 'good',
      summary: WEEKLY_SUMMARY,
      weeklyReport: DEMO_WEEKLY_REPORT,
      generatedAt: '2026.05.08 (금) 오후 6:00 자동 생성',
    },
    {
      id: 'w-2',
      dateRange: '2026년 4월 27일 ~ 5월 1일',
      snippetCount: 9, activeDays: 5, healthScore: 8.7, healthLevel: 'good',
      summary: WEEKLY_SUMMARY,
      weeklyReport: DEMO_WEEKLY_REPORT,
      generatedAt: '2026.05.01 (금) 오후 6:00 자동 생성',
    },
    {
      id: 'w-3',
      dateRange: '2026년 4월 20일 ~ 4월 24일',
      snippetCount: 8, activeDays: 5, healthScore: 6.5, healthLevel: 'warning',
      summary: WEEKLY_SUMMARY,
      weeklyReport: DEMO_WEEKLY_REPORT,
      generatedAt: '2026.04.24 (금) 오후 6:00 자동 생성',
    },
    {
      id: 'w-4',
      dateRange: '2026년 4월 13일 ~ 4월 17일',
      snippetCount: 6, activeDays: 4, healthScore: 3.8, healthLevel: 'error',
      summary: WEEKLY_SUMMARY,
      weeklyReport: DEMO_WEEKLY_REPORT,
      generatedAt: '2026.04.17 (금) 오후 6:00 자동 생성',
    },
  ];

  const MONTHLY_SUMMARY =
    '이번 달은 Phase 1 기획 완성도를 높이는 데 집중했습니다. IA 구조 정의, 어드민 클릭 액션 정의, RBAC 설계 등 핵심 산출물이 완성됐으며, 팀 전체 회의를 통해 방향성이 정렬됐습니다. 헬스체크는 월 평균 7.9로 안정적이었습니다.';

  const statsRow = (id, periodLabel, summary, stats) => ({
    id, periodLabel, summary, stats,
    weeklyReport: DEMO_WEEKLY_REPORT,
    generatedAt: '2026.04.30 (목) 오후 6:00 자동 생성',
  });

  const PERIOD_CONTENT = {
    weekly: {
      bannerText: 'AI가 이번 주 스니핏, 헬스체크, OKR 변화를 분석해 자동으로 요약합니다. 매주 금요일 자동 생성되며, 언제든 직접 생성할 수 있습니다.',
      periodRange: '2026년 5월 11일 ~ 5월 15일',
      periodTitle: '이번 주',
      listType: 'weekly',
      rows: weeklyRows,
    },
    monthly: {
      bannerText: '매월 말일 자동 생성됩니다. 주간 스니핏 데이터를 집계하여 이번 달 성과·헬스·OKR 달성률을 하이레벨로 요약합니다.',
      periodRange: '2026년 1월 ~ 5월',
      periodTitle: '5월',
      listType: 'stats',
      rows: [
        { id: 'm-current', periodLabel: '5월', isCurrent: true, generateLabel: '이번달 리포트 생성하기' },
        statsRow('m-1', '4월', MONTHLY_SUMMARY, [
          { label: '스니핏 작성', value: '21일', note: '월 작성률 70%' },
          { label: '헬스 평균', value: '7.9', note: '지난달 대비 +0.3' },
          { label: 'OKR 진행', value: '68%', note: '목표 대비 순항 중' },
        ]),
        statsRow('m-2', '3월', MONTHLY_SUMMARY, [
          { label: '스니핏 작성', value: '19일', note: '월 작성률 63%' },
          { label: '헬스 평균', value: '7.6', note: '지난달 대비 +0.1' },
          { label: 'OKR 진행', value: '54%', note: '목표 대비 순항 중' },
        ]),
      ],
    },
    quarterly: {
      bannerText: '분기 마감 시 자동 생성됩니다. 월간 리포트를 종합해 분기 성과와 OKR 달성률 변화를 요약합니다.',
      periodRange: '2026년',
      periodTitle: 'Q2',
      listType: 'stats',
      rows: [
        { id: 'q-current', periodLabel: 'Q2', isCurrent: true, generateLabel: '이번 분기 리포트 생성하기' },
        statsRow('q-1', 'Q1', '1분기는 Phase 1 제품의 뼈대를 완성한 분기였습니다. 핵심 화면 기획과 API 서버 안정화가 마무리됐고, 얼리 액세스 온보딩 준비에 착수했습니다. OKR 달성률은 목표를 상회했습니다.', [
          { label: '스니핏 작성', value: '58일', note: '분기 작성률 89%' },
          { label: '헬스 평균', value: '8.1', note: '지난 분기 대비 +0.4' },
          { label: 'OKR 진행', value: '86%', note: '목표 초과 달성' },
        ]),
      ],
    },
    semiAnnually: {
      bannerText: '반기 마감 시 자동 생성됩니다. 분기 리포트를 종합해 반기 성과·조직 헬스·OKR 달성률을 요약합니다.',
      periodRange: '2025년 ~ 2026년',
      periodTitle: '2026 상반기',
      listType: 'stats',
      rows: [
        { id: 's-current', periodLabel: '26 상반기', isCurrent: true, generateLabel: '상반기 리포트 생성하기' },
        statsRow('s-1', '25 하반기', '2025 하반기는 Phase 0 기반 기술 검증을 완료하고 팀 빌딩을 마친 시기였습니다. STT·검색 PoC 가 목표 품질을 달성했고, 시장 조사와 PMF 가설 수립을 진행했습니다.', [
          { label: '스니핏 작성', value: '112일', note: '반기 작성률 86%' },
          { label: '헬스 평균', value: '7.8', note: '지난 반기 대비 +0.5' },
          { label: 'OKR 진행', value: '72%', note: '목표 근접 달성' },
        ]),
      ],
    },
    annually: {
      bannerText: '연말 자동 생성됩니다. 한 해의 성과·조직 헬스·OKR 달성률을 종합해 연간 리포트로 정리합니다.',
      periodRange: '2025년 ~ 2026년',
      periodTitle: '2026년',
      listType: 'stats',
      rows: [
        { id: 'y-current', periodLabel: '2026', isCurrent: true, generateLabel: '올해 리포트 생성하기' },
        statsRow('y-1', '2025', '2025년은 창업팀 구성과 기반 기술 검증, 첫 제품 방향 수립까지 0→1 을 만든 해였습니다. 핵심 팀원 4명을 확보했고, 코어 기술 PoC 를 완료하며 Phase 1 의 토대를 다졌습니다.', [
          { label: '스니핏 작성', value: '218일', note: '연간 작성률 84%' },
          { label: '헬스 평균', value: '7.7', note: '전년 대비 +0.6' },
          { label: 'OKR 진행', value: '78%', note: '목표 대비 순항' },
        ]),
      ],
    },
  };

  const content = PERIOD_CONTENT[period] ?? PERIOD_CONTENT.weekly;

  const handleReportClick = (r) => {
    if (r.weeklyReport) setSelectedReport(r);
  };

  const handleGenerate = (r) => {
    if (isGenerating) return;
    setSelectedReport({ ...r, weeklyReport: r.weeklyReport ?? null });
    setIsGenerating(true);
    if (generateTimerRef.current) clearTimeout(generateTimerRef.current);
    generateTimerRef.current = setTimeout(() => {
      setCurrentWeekReport(DEMO_WEEKLY_REPORT);
      setSelectedReport((prev) => (prev ? {
        ...prev,
        weeklyReport: DEMO_WEEKLY_REPORT,
        generatedAt: prev.generatedAt ?? '2026.05.15 (금) 오후 6:00 자동 생성',
      } : prev));
      setIsGenerating(false);
    }, 4000);
  };

  return (
    <ReportCanvas
      baseUrl={baseUrl}
      count={34}
      period={period}
      onPeriodChange={setPeriod}
      bannerText={content.bannerText}
      periodTitle={content.periodTitle}
      periodRange={content.periodRange}
      listType={content.listType}
      reports={content.rows}
      selectedReport={selectedReport}
      isGenerating={isGenerating}
      onReportClick={handleReportClick}
      onCloseReport={() => setSelectedReport(null)}
      onReportGenerate={handleGenerate}
    />
  );
}
