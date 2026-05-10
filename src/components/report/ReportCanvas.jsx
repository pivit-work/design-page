import { useMemo, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import TimelineWeeklyView from '../timeline/TimelineWeeklyView.jsx';
import useSegmentedIndicator from '../timeline/hooks/useSegmentedIndicator.js';

/**
 * ReportCanvas — "리포트" 페이지 Pure 컴포넌트.
 * Figma node 16636:73372 기준.
 *
 * 페이지 chrome:
 *   - 헤더: "리포트" 타이틀 + "생성된 리포트 · N개" 메타
 *   - 탭 row: Weekly / Monthly / Quarterly / Semi-annually / Annually
 *           + 우측 Google Calendar 연동 상태 (border-bottom)
 *   - 본문: 현재는 Weekly 탭만 활성 — TimelineWeeklyView 재사용
 *           (Weekly Report 의 UI/데이터 형태가 동일하기 때문에 분리하지 않음)
 *
 * 모든 데이터는 props 로 받는다 (page wrapper 가 demo/실데이터 소유).
 * shape: TimelineWeeklyView.jsx 상단 jsdoc 참조.
 */
const PERIODS = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
  { key: 'semiAnnually', label: 'Semi-annually' },
  { key: 'annually', label: 'Annually' },
];

export default function ReportCanvas({
  baseUrl,
  // 헤더 우측 "생성된 리포트 · N개" 카운트.
  count = 0,
  // Period 탭 — controlled or uncontrolled.
  period,
  onPeriodChange,
  // Weekly 본문 props (TimelineWeeklyView 그대로 전달)
  periodTab,
  onPeriodTabChange,
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
  const periodKeys = useMemo(() => PERIODS.map((p) => p.key), []);
  const { itemsRef: tabsRef, indicator: tabsIndicator } = useSegmentedIndicator(
    periodKeys,
    effectivePeriod,
  );

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
        <div className="tl-tabs">
          {PERIODS.map((p, i) => (
            <button
              key={p.key}
              ref={(el) => {
                tabsRef.current[i] = el;
              }}
              type="button"
              className={`tl-tab ${effectivePeriod === p.key ? 'is-active' : ''}`}
              onClick={() => handlePeriodClick(p.key)}
            >
              {p.label}
            </button>
          ))}
          {tabsIndicator && (
            <span
              className="tl-tabs-indicator"
              style={{ left: tabsIndicator.left, width: tabsIndicator.width }}
              aria-hidden="true"
            />
          )}
        </div>
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
