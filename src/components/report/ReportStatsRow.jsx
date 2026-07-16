import Icon from '../shared/Icon.jsx';

/**
 * ReportStatsRow — Monthly/Quarterly/Semi-annually/Annually 탭의 한 행.
 * Figma node 16883:28267 (Monthly 기준, 다른 주기도 동일 레이아웃).
 *
 * [기간 셀 | 요약(넓게) | 통계 컬럼들 | 공유] 구조. 이번 기간(current)
 * 행은 "아직 생성 전입니다." + 생성하기 그라데이션 버튼을 보여준다.
 *
 * stats: [{ label, value, note }] — 예: 스니핏 작성/21일/월 작성률 70%.
 */
export default function ReportStatsRow({
  periodLabel,
  isCurrent = false,
  emptyText = '아직 생성 전입니다.',
  generateLabel = '리포트 생성하기',
  onGenerate,
  summary,
  stats = [],
  baseUrl = '',
  onClick,
  onShare,
}) {
  return (
    <div
      className={`report-mrow ${isCurrent ? 'is-active' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="report-mrow-period">{periodLabel}</div>

      {isCurrent ? (
        <>
          <div className="report-mrow-empty">{emptyText}</div>
          <div className="report-mrow-actions">
            <button
              type="button"
              className="report-generate-btn"
              onClick={(e) => {
                e.stopPropagation();
                onGenerate?.();
              }}
            >
              <Icon src="/icons-solid/ai-chat-01.svg" size={20} color="var(--colors-base-white)" baseUrl={baseUrl} />
              <span>{generateLabel}</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="report-mrow-summary">{summary}</p>
          {stats.map((stat) => (
            <div className="report-mrow-stat" key={stat.label}>
              <span className="report-mrow-stat-label">{stat.label}</span>
              <span className="report-mrow-stat-value">{stat.value}</span>
              <span className="report-mrow-stat-note">{stat.note}</span>
            </div>
          ))}
          <div className="report-mrow-actions">
            <button
              type="button"
              className="report-row-share"
              aria-label="공유"
              onClick={(e) => {
                e.stopPropagation();
                onShare?.();
              }}
            >
              <Icon src="/icons-solid/share-01.svg" size={20} color="var(--text-tertiary)" baseUrl={baseUrl} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
