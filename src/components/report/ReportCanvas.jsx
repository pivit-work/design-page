import { useState } from 'react';
import Icon from '../shared/Icon.jsx';
import Tabs from '../shared/Tabs.jsx';
import ReportWeeklyRow from './ReportWeeklyRow.jsx';
import ReportViewerModal from './ReportViewerModal.jsx';

/**
 * ReportCanvas — "리포트" 페이지 Pure 컴포넌트.
 * Figma node 16883:27926 기준 (Weekly 탭).
 *
 * 페이지 chrome:
 *   - 헤더: "리포트" 타이틀 + "생성된 리포트 · N개" 메타
 *   - 탭 row: Weekly / Monthly / Quarterly / Semi-annually / Annually
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

// Monthly/Quarterly/Semi-annually/Annually 는 아직 실데이터 미연동 — pivit-specs
// weekly-digest-view PeriodPlaceholder 시안 기준 안내형 플레이스홀더를 표시한다.
// 스탯 수치는 시안의 예시값(placeholder).
const PERIOD_PLACEHOLDERS = {
  monthly: {
    icon: '📆',
    label: '월간 리포트',
    period: '이번 달',
    desc: '매월 말일 자동 생성됩니다. 주간 스니핏 데이터를 집계하여 이번 달 성과·헬스·OKR 달성률을 하이레벨로 요약합니다.',
    stats: [
      { label: '스니핏 작성', value: '21일', sub: '월 작성률 70%' },
      { label: '헬스 평균', value: '7.9', sub: '지난달 대비 +0.3' },
      { label: 'OKR 진행', value: '68%', sub: '목표 대비 순항 중' },
    ],
  },
  quarterly: {
    icon: '🗓',
    label: '분기 리포트',
    period: '이번 분기',
    desc: '분기 종료 시 자동 생성됩니다. OKR 달성률, 주요 성과, 역량 성장 추이를 3개월 단위로 집계하여 제공합니다.',
    stats: [
      { label: '목표 OKR', value: '3건', sub: '달성률 평균 71%' },
      { label: '1on1 완료', value: '12회', sub: '주 1회 유지' },
      { label: '헬스 평균', value: '8.0', sub: '전분기 대비 +0.4' },
    ],
  },
  semiAnnually: {
    icon: '📊',
    label: '반기 리포트',
    period: '상반기',
    desc: '반기 종료 시 자동 생성됩니다. 6개월간의 성과·역량·목표 달성률을 종합하여 하이레벨 보고서로 제공합니다.',
    stats: [
      { label: 'OKR 달성', value: '6건', sub: '목표 대비 82%' },
      { label: '스니핏 작성', value: '98일', sub: '작성률 75%' },
      { label: '헬스 평균', value: '7.8', sub: '안정적 유지' },
    ],
  },
  annually: {
    icon: '🏆',
    label: '연간 리포트',
    period: '2026년',
    desc: '연말 자동 생성됩니다. 한 해의 목표 달성, 성장 스토리, 핵심 성과를 종합한 연간 회고 보고서입니다.',
    stats: [
      { label: '총 OKR', value: '24건', sub: '달성률 78%' },
      { label: '1on1 세션', value: '52회', sub: '주 1회 완수' },
      { label: '성과 등급', value: 'Exceeds', sub: '상위 15%' },
    ],
  },
};

function PeriodPlaceholder({ data }) {
  const [generated, setGenerated] = useState(false);
  return (
    <div className="report-placeholder">
      <div className="report-placeholder-card">
        <div className="report-placeholder-head">
          <div className="report-placeholder-icon">{data.icon}</div>
          <div className="report-placeholder-titles">
            <div className="report-placeholder-label">{data.label}</div>
            <div className="report-placeholder-period">{data.period} 기준</div>
          </div>
          <div className="report-placeholder-action">
            {generated ? (
              <span className="report-placeholder-done">✓ 생성 완료</span>
            ) : (
              <button
                type="button"
                className="report-placeholder-btn"
                onClick={() => setGenerated(true)}
              >
                ✦ 리포트 생성하기
              </button>
            )}
          </div>
        </div>
        <p className="report-placeholder-desc">{data.desc}</p>
        <div className="report-placeholder-stats">
          {data.stats.map((s) => (
            <div key={s.label} className="report-placeholder-stat">
              <div className="report-placeholder-stat-label">{s.label}</div>
              <div className="report-placeholder-stat-value">{s.value}</div>
              <div className="report-placeholder-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="report-placeholder-banner">
        <span className="report-placeholder-banner-ico">✦</span>
        <span>
          AI가 해당 기간의 스니핏, 헬스체크, OKR 변화를 분석하여 자동으로 보고서를
          생성합니다. 기간 종료 시 자동 생성되며, 언제든 수동 생성도 가능합니다.
        </span>
      </div>
    </div>
  );
}

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
      </div>

      {/* 생성된 리포트 보기 / 지금 생성하기 → 풀 모달 (Figma 17250:19627) */}
      {selectedReport && (
        <ReportViewerModal
          baseUrl={baseUrl}
          report={selectedReport.weeklyReport}
          generatedAt={selectedReport.generatedAt}
          isGenerating={isGenerating}
          onClose={onCloseReport}
        />
      )}

      <div className="report-body">
        {effectivePeriod === 'weekly' ? (
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
        ) : (
          <PeriodPlaceholder
            key={effectivePeriod}
            data={PERIOD_PLACEHOLDERS[effectivePeriod]}
          />
        )}
      </div>
    </main>
  );
}
