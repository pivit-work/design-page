import Icon from '../shared/Icon.jsx';

/**
 * ReportWeeklyRow — 리포트 페이지 Weekly 탭의 한 행.
 * Figma node 16883:28061 (active) / 16883:28075 (regular).
 *
 * 좌측 라벨 컬럼 (이번주/지난주/- 등) + 우측 정보 영역 (날짜·스니핏·활동일·
 * 헬스 점수) + 우상단 share 버튼. active 행은 bg-brand-primary 그린 틴트
 * 배경 + "진행 중" 태그.
 *
 * Health level → 점수 색상:
 *   'good'    → text-brand-tertiary  (#21a67a)
 *   'warning' → text-warning-primary (#dc6803)
 *   'error'   → text-error-primary   (#d92d20)
 */
export default function ReportWeeklyRow({
  badge,
  dateRange,
  status,
  isActive = false,
  snippetCount,
  activeDays,
  healthScore,
  healthLevel = 'good',
  baseUrl = '',
  onClick,
  onShare,
}) {
  return (
    <div
      className={`report-row ${isActive ? 'is-active' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="report-row-badge">{badge}</div>
      <div className="report-row-body">
        <div className="report-row-info">
          <div className="report-row-head">
            <span className="report-row-date">{dateRange}</span>
            {status && <span className="report-row-status">{status}</span>}
          </div>
          <div className="report-row-meta">
            <span>스니핏 {snippetCount}개</span>
            <span className="report-row-meta-dot">•</span>
            <span>활동일 {activeDays}일</span>
            <span className="report-row-meta-dot">•</span>
            <span className={`report-row-health is-${healthLevel}`}>
              <Icon
                src="/icons/check-heart.svg"
                size={14}
                color="currentColor"
                baseUrl={baseUrl}
              />
              {healthScore}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="report-row-share"
          aria-label="공유"
          onClick={(e) => {
            e.stopPropagation();
            onShare?.();
          }}
        >
          <Icon
            src="/icons-solid/share-01.svg"
            size={20}
            color="var(--text-tertiary)"
            baseUrl={baseUrl}
          />
        </button>
      </div>
    </div>
  );
}
