/**
 * 매니저 페이지 섹션 타이틀.
 * "오늘의 액션 큐 3" / "팀원 현황 1" 같은 형태.
 */
export default function SectionHeading({ title, count, countColor = 'var(--colors-foreground-fgSuccessPrimary)', subtitle }) {
  return (
    <div className="manager-section-heading">
      <div className="manager-section-title-row">
        <span className="manager-section-title">{title}</span>
        {count != null && (
          <span className="manager-section-count" style={{ color: countColor }}>{count}</span>
        )}
      </div>
      {subtitle && <p className="manager-section-subtitle">{subtitle}</p>}
    </div>
  );
}
