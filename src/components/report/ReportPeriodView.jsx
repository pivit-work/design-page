import Icon from '../shared/Icon.jsx';

/**
 * ReportPeriodView — 월간·분기·반기·연간 리포트 상세 창의 본문 (pivit-work PW-2399).
 *
 * 디자이너 원본이 따로 없어 새 모양을 짓지 않고 두 디자이너 모양을 값 그대로 이어 붙였다:
 *  - 머리·요약: 주간 상세 창 본문 `TimelineWeeklyView` 의 `.tl-weekly-intro`(제목 + 날짜 줄 + 요약)
 *  - 숫자 칸: 기간 줄 `ReportStatsRow` 의 `.report-mrow-stat`(이름 · 값 · 직전 기간 대비)
 * 기간 줄은 요약을 3줄로 자르므로, 끝까지 읽는 자리가 이 창이다. 창 틀은 `ReportViewerModal` 이 갖는다.
 *
 * Props:
 *   report  { title, dateRange, summary, stats: [{ label, value, note }] } — 문구는 소비처가 언어에 맞춰 넘긴다
 */
export default function ReportPeriodView({ report, baseUrl = '' }) {
  const stats = report?.stats ?? [];
  return (
    <div className="tl-weekly">
      <article className="tl-weekly-card">
        <div className="tl-weekly-card-inner">
          <div className="tl-weekly-intro">
            <header className="tl-weekly-report-head">
              <h2 className="tl-weekly-report-title">{report?.title}</h2>
              {report?.dateRange && (
                <div className="tl-weekly-report-meta">
                  <span className="tl-weekly-meta-item">
                    <Icon src="/icons/calendar.svg" size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
                    {report.dateRange}
                  </span>
                </div>
              )}
            </header>
            <p className="tl-weekly-summary">{report?.summary}</p>
          </div>
          {stats.length > 0 && (
            <section className="tl-weekly-section">
              <div className="report-period-stats">
                {stats.map((stat) => (
                  <div className="report-mrow-stat" key={stat.label}>
                    <span className="report-mrow-stat-label">{stat.label}</span>
                    <span className="report-mrow-stat-value">{stat.value}</span>
                    <span className="report-mrow-stat-note">{stat.note}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </div>
  );
}
