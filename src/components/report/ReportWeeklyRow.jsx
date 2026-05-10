import Icon from '../shared/Icon.jsx';

/**
 * ReportWeeklyRow — 리포트 페이지 Weekly 탭의 한 행.
 * Figma node 16883:28061 (active, 미생성) / 16883:28075 (regular).
 *
 * 두 가지 모드:
 *   1) regular  — 좌측 라벨 + 날짜 + 통계(스니핏·활동일·헬스 점수) + share.
 *   2) active + showGenerate — bg-brand-primary 그린 틴트, 통계 대신
 *      "지금 생성하기" 그라디언트 버튼 + share. (이번 주 리포트 미생성 상태)
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
  // showGenerate=true 면 통계 라인 대신 "지금 생성하기" 버튼 렌더.
  showGenerate = false,
  generateLabel = '지금 생성하기',
  onGenerate,
  // regular 모드 통계
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
          {!showGenerate && (
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
          )}
        </div>
        <div className="report-row-actions">
          {showGenerate && (
            <button
              type="button"
              className="report-generate-btn"
              onClick={(e) => {
                e.stopPropagation();
                onGenerate?.();
              }}
            >
              <Icon
                src="/icons-solid/ai-chat-01.svg"
                size={20}
                color="var(--colors-base-white)"
                baseUrl={baseUrl}
              />
              <span>{generateLabel}</span>
            </button>
          )}
          {/* Share 는 리포트가 생성된 행(showGenerate=false) 에만 노출.
              이번 주 미생성 상태에서는 generate 버튼만 보이도록. */}
          {!showGenerate && (
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
          )}
        </div>
      </div>
    </div>
  );
}
