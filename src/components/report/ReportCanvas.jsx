import { useState } from 'react';
import Icon from '../shared/Icon.jsx';
import Tabs from '../shared/Tabs.jsx';
import TimelineWeeklyView from '../timeline/TimelineWeeklyView.jsx';
import ReportWeeklyRow from './ReportWeeklyRow.jsx';

/**
 * ReportCanvas — "리포트" 페이지 Pure 컴포넌트.
 * Figma node 16883:27926 기준 (Weekly 탭).
 *
 * 페이지 chrome:
 *   - 헤더: "리포트" 타이틀 + "생성된 리포트 · N개" 메타
 *   - 탭 row: Weekly / Monthly / Quarterly / Semi-annually / Annually
 *           + 우측 Google Calendar 연동 상태
 *   - AI 안내 배너 (보라 톤)
 *   - 본문: 활성 탭에 따라 달라짐. Weekly = 주차별 리포트 row 리스트.
 *           Monthly/Quarterly/Semi-annually/Annually 는 추후 디자인 — 현재는
 *           동일 리스트를 표시 (placeholder 데이터).
 *
 * 모든 데이터는 props 로 받는다.
 */
const PERIOD_ITEMS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semiAnnually', label: 'Semi-annually' },
  { value: 'annually', label: 'Annually' },
];

export default function ReportCanvas({
  baseUrl,
  // 헤더 우측 "생성된 리포트 · N개" 카운트.
  count = 0,
  // Period 탭 — controlled or uncontrolled.
  period,
  onPeriodChange,
  // 본문 데이터
  //   periodTitle  '이번 주' 등 큰 타이틀
  //   periodRange  '2026년 4월 7일 ~ 4월 14일' 등 부제 (날짜 범위)
  //   reports      ReportWeeklyRow 행 데이터 배열
  //                shape: { id, badge, dateRange, status?, isActive?,
  //                         showGenerate?, snippetCount?, activeDays?,
  //                         healthScore?, healthLevel? }
  periodTitle,
  periodRange,
  reports = [],
  onReportClick,
  onReportShare,
  onReportGenerate,
  // 디테일 뷰 — selectedReport 가 있으면 본문이 TimelineWeeklyView 로 전환.
  // shape: 위 reports 행의 한 객체 (그 안의 weeklyReport 가 실제 리포트).
  selectedReport,
  onCloseReport,
  // 생성 중 — TimelineWeeklyView 의 로딩 비디오를 띄울지 여부.
  // 생성 버튼 클릭 직후 selectedReport 가 세팅되고 isGenerating=true 면
  // weeklyReport 가 도착할 때까지 로딩이 보이고, 도착하면 자연스럽게 리포트로 전환.
  isGenerating = false,
  // Google Calendar 연동 상태. 기본 true — 연동 중 라벨.
  gcalConnected = true,
}) {
  const [internalPeriod, setInternalPeriod] = useState('weekly');
  const effectivePeriod = period ?? internalPeriod;
  const handlePeriodClick = (next) => {
    if (onPeriodChange) onPeriodChange(next);
    else setInternalPeriod(next);
  };

  return (
    <main className="tl-page report-page">
      <div className="tl-page-header">
        <div className="tl-page-title-wrap">
          <h1 className="tl-page-title">리포트</h1>
          <div className="tl-page-meta">
            <span className="tl-meta-label">생성된 리포트</span>
            <span className="tl-meta-sep">·</span>
            <span className="tl-meta-count">{count}개</span>
          </div>
        </div>
      </div>

      <div className="tl-tabs-row">
        <Tabs
          items={PERIOD_ITEMS}
          value={effectivePeriod}
          onChange={handlePeriodClick}
        />
        <div className={`tl-gcal-status ${gcalConnected ? '' : 'is-disconnected'}`}>
          <Icon
            src="/icons-solid/calendar-check-02.svg"
            size={14}
            color="var(--colors-foreground-fgTertiary)"
            baseUrl={baseUrl}
          />
          <span>{gcalConnected ? 'Google Calendar 연동 중' : 'Google Calendar 미연동'}</span>
          {gcalConnected && (
            <Icon src="/icons-solid/check-circle.svg" size={14} color="#2dbd82" baseUrl={baseUrl} />
          )}
        </div>
      </div>

      <div className="report-body">
        {selectedReport ? (
          <div className="report-detail">
            <button
              type="button"
              className="report-detail-back"
              onClick={onCloseReport}
            >
              <Icon
                src="/icons/chevron-left.svg"
                size={16}
                color="currentColor"
                baseUrl={baseUrl}
              />
              <span>목록으로</span>
            </button>
            <TimelineWeeklyView
              baseUrl={baseUrl}
              report={selectedReport.weeklyReport}
              isGenerating={isGenerating}
              showInfoBanner={false}
            />
          </div>
        ) : (
          <>
            <div className="report-ai-banner">
              <Icon
                src="/icons-solid/ai-chat-01.svg"
                size={14}
                color="var(--utility-purple-500, #7a5af8)"
                baseUrl={baseUrl}
              />
              <span>
                AI가 이번 주 스니핏, 헬스체크, OKR 변화를 분석해 자동으로 요약합니다.
                매주 금요일 자동 생성되며, 언제든 직접 생성할 수 있습니다.
              </span>
            </div>

            <div className="report-period-head">
              {periodRange && <p className="report-period-range">{periodRange}</p>}
              {periodTitle && <h2 className="report-period-title">{periodTitle}</h2>}
            </div>

            <div className="report-list">
              {reports.map((r) => (
                <ReportWeeklyRow
                  key={r.id}
                  badge={r.badge}
                  dateRange={r.dateRange}
                  status={r.status}
                  isActive={r.isActive}
                  showGenerate={r.showGenerate}
                  generateLabel={r.generateLabel}
                  snippetCount={r.snippetCount}
                  activeDays={r.activeDays}
                  healthScore={r.healthScore}
                  healthLevel={r.healthLevel}
                  baseUrl={baseUrl}
                  onClick={onReportClick ? () => onReportClick(r) : undefined}
                  onShare={onReportShare ? () => onReportShare(r) : undefined}
                  onGenerate={onReportGenerate ? () => onReportGenerate(r) : undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
