import { useState } from 'react';
import Icon from '../shared/Icon.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import Tabs from '../shared/Tabs.jsx';
import TimelineWeeklyView from '../timeline/TimelineWeeklyView.jsx';

/**
 * ReportCanvas — "리포트" 페이지 Pure 컴포넌트.
 * Figma 16636:73372 / 16961:27311 기준.
 *
 * 페이지 chrome:
 *   - 헤더: "리포트" 타이틀 + "생성된 리포트 · N개" 메타
 *   - 탭 row: Weekly / Monthly / Quarterly / Semi-annually / Annually
 *           + 우측 Google Calendar 연동 상태 (border-bottom)
 *   - segmented control: 활성 탭에 따라 케이스가 달라짐 (아래 SEG_BY_PERIOD)
 *   - 본문: TimelineWeeklyView (Weekly Report UI/데이터 형태가 모든 케이스에
 *          동일하므로 그대로 재사용)
 *
 * 모든 데이터는 props 로 받는다 (page wrapper 가 demo/실데이터 소유).
 */
const PERIOD_ITEMS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semiAnnually', label: 'Semi-annually' },
  { value: 'annually', label: 'Annually' },
];

// 활성 탭 별 segmented control 항목 (Figma 16961:27311 cases).
const SEG_BY_PERIOD = {
  weekly: [
    { value: 'lastWeek', label: '지난주' },
    { value: 'thisWeek', label: '이번주' },
  ],
  monthly: Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}월`,
  })),
  quarterly: [
    { value: 'q1', label: '1분기' },
    { value: 'q2', label: '2분기' },
    { value: 'q3', label: '3분기' },
    { value: 'q4', label: '4분기' },
  ],
  semiAnnually: [
    { value: 'h1', label: '전반기' },
    { value: 'h2', label: '후반기' },
  ],
  annually: [
    { value: '2025', label: '2025년' },
    { value: '2026', label: '2026년' },
  ],
};

// 현재 시점(2026-05) 기준 sensible default — 활성 탭 진입 시 자동 선택.
const SEG_DEFAULT_BY_PERIOD = {
  weekly: 'thisWeek',
  monthly: '5',
  quarterly: 'q2',
  semiAnnually: 'h1',
  annually: '2026',
};

export default function ReportCanvas({
  baseUrl,
  // 헤더 우측 "생성된 리포트 · N개" 카운트.
  count = 0,
  // Period 탭 — controlled or uncontrolled.
  period,
  onPeriodChange,
  // 본문 props (TimelineWeeklyView 그대로 전달)
  report,
  isGenerating = false,
  onGenerate,
  onViewHistory,
  // Google Calendar 연동 상태. 기본 true — 연동 중 라벨.
  gcalConnected = true,
}) {
  const [internalPeriod, setInternalPeriod] = useState('weekly');
  const effectivePeriod = period ?? internalPeriod;
  const handlePeriodClick = (next) => {
    if (onPeriodChange) onPeriodChange(next);
    else setInternalPeriod(next);
  };

  // 탭별 segmented 선택값을 각각 보존 — 탭을 왔다갔다 해도 마지막 선택 유지.
  const [segByPeriod, setSegByPeriod] = useState(SEG_DEFAULT_BY_PERIOD);
  const segValue = segByPeriod[effectivePeriod];
  const handleSegChange = (next) => {
    setSegByPeriod((prev) => ({ ...prev, [effectivePeriod]: next }));
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

      <div className="report-seg-row">
        <SegmentedControl
          items={SEG_BY_PERIOD[effectivePeriod]}
          value={segValue}
          onChange={handleSegChange}
          ariaLabel="기간 선택"
        />
      </div>

      <TimelineWeeklyView
        baseUrl={baseUrl}
        report={report}
        isGenerating={isGenerating}
        onGenerate={onGenerate}
        onViewHistory={onViewHistory}
      />
    </main>
  );
}
