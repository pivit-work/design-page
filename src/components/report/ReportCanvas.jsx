import TimelineWeeklyView from '../timeline/TimelineWeeklyView.jsx';

/**
 * ReportCanvas — "리포트" 페이지 Pure 컴포넌트.
 *
 * 기존 타임라인 페이지의 Weekly 탭 컨텐츠를 별도 페이지로 분리한 것.
 * 페이지 chrome (제목 "리포트") 만 가지고 있고, 본문은 TimelineWeeklyView 를
 * 그대로 재사용한다 — Weekly Report 의 UI/데이터 형태는 동일하기 때문.
 *
 * 모든 데이터는 props 로 받는다 (page wrapper 가 demo/실데이터 소유).
 * shape: TimelineWeeklyView.jsx 상단 jsdoc 참조.
 */
export default function ReportCanvas({
  baseUrl,
  periodTab,
  onPeriodTabChange,
  report,
  isGenerating = false,
  onGenerate,
  onViewHistory,
}) {
  return (
    <main className="tl-page report-page">
      <div className="tl-page-header">
        <div className="tl-page-title-wrap">
          <h1 className="tl-page-title">리포트</h1>
        </div>
      </div>
      <TimelineWeeklyView
        baseUrl={baseUrl}
        periodTab={periodTab}
        onPeriodTabChange={onPeriodTabChange}
        report={report}
        isGenerating={isGenerating}
        onGenerate={onGenerate}
        onViewHistory={onViewHistory}
      />
    </main>
  );
}
