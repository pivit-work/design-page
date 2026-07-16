import Icon from '../shared/Icon.jsx';

/**
 * ReportWeeklyRow — 리포트 페이지 Weekly 탭의 한 행.
 * Figma node 16883:27926.
 *
 * 좌측 날짜 셀(두 줄: 시작일 / ~ 종료일) + 본문(메타 라인 + 요약 미리보기)
 * + 우측 액션. 이번 주(active) 행은 그린 틴트 배경에 [지금 생성하기]
 * 그라데이션 버튼, 생성된 행은 요약 텍스트와 share 버튼을 보여준다.
 *
 * Health level → 점수 색상: good/warning/error.
 */
export default function ReportWeeklyRow({
  dateRange,
  status,
  isActive = false,
  // showGenerate=true 면 "지금 생성하기" 버튼 렌더 (이번 주 미생성 상태).
  showGenerate = false,
  generateLabel = '지금 생성하기',
  onGenerate,
  snippetCount,
  activeDays,
  healthScore,
  healthLevel = 'good',
  // 생성된 리포트의 본문 미리보기 (2줄 클램프)
  summary,
  baseUrl = '',
  onClick,
  onShare,
}) {
  const [dateStart, dateEnd] = dateRange.split(' ~ ');

  return (
    <div
      className={`report-row ${isActive ? 'is-active' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="report-row-datecell">
        <span>{dateStart}</span>
        {dateEnd && <span>~ {dateEnd}</span>}
      </div>
      <div className="report-row-body">
        <div className="report-row-info">
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
            {status && <span className="report-row-status">{status}</span>}
          </div>
          {summary && <p className="report-row-summary">{summary}</p>}
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
          {/* Share 는 리포트가 생성된 행에만 노출 */}
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
