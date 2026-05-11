/**
 * SnippetListRow — 스니핏 히스토리 리스트의 한 행.
 * Figma node 16960:20345 (active/recent) / 16960:20362 (regular).
 *
 * 좌측 날짜 컬럼(100px, border-right) + 우측 요약 텍스트(truncate) + 우측 끝
 * 타임스탬프. recent=true 행은 bg-brand-primary 그린 틴트 + "Updated :" 프리픽스,
 * 그 외는 white bg(h:90) + "Written :".
 *
 * highlight 가 주어지면 요약 텍스트 안의 검색어를 brand 색으로 강조.
 *
 * Props:
 *   dateLabel   '12월31일'
 *   summary     요약 텍스트
 *   timestamp   '2026.12.31'
 *   recent      true 면 그린 틴트 + "Updated", false 면 white + "Written"
 *   highlight   검색어(공백 구분 토큰) — summary 안에서 강조
 *   onClick
 */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderSummary(text, highlight) {
  const q = (highlight ?? '').trim();
  if (!q) return text;
  const tokens = q.split(/\s+/).filter(Boolean).map(escapeRegExp);
  if (!tokens.length) return text;
  const re = new RegExp(`(${tokens.join('|')})`, 'gi');
  const parts = String(text).split(re);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="snippet-row-hl">{p}</mark>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

export default function SnippetListRow({
  dateLabel,
  summary,
  timestamp,
  recent = false,
  highlight = '',
  onClick,
}) {
  return (
    <div
      className={`snippet-row ${recent ? 'is-recent' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="snippet-row-date">{dateLabel}</div>
      <div className="snippet-row-body">
        <p className="snippet-row-summary">{renderSummary(summary, highlight)}</p>
        <span className="snippet-row-stamp">
          {recent ? 'Updated' : 'Written'} : {timestamp}
        </span>
      </div>
    </div>
  );
}
