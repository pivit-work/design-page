import StatusBadge from '../shared/StatusBadge.jsx';
import SnippetEditLog from './SnippetEditLog.jsx';
import { ArrowUpGlyph, CheckHeartGlyph } from './snippetGlyphs.jsx';

/** 스니핏 카드 한 장 (Figma 17873:33793) — 날짜 · 태그 알약 · 헬스 점수 · 제목 · 좋았던/아쉬운 점 · 수정 기록. */
export default function SnippetItem({ snippet }) {
  return (
    <div className="profile-snippet-item">
      <div className="profile-snippet-meta">
        <p className="profile-snippet-date">{snippet.date}</p>
        <div className="profile-snippet-tags">
          {snippet.tags?.map((t) => (
            <StatusBadge key={t} className="manager-modal-snippet-tag">{t}</StatusBadge>
          ))}
          <span className="profile-snippet-health">
            <CheckHeartGlyph size={14} />
            <span>{snippet.healthScore}</span>
          </span>
        </div>
      </div>
      <div className="profile-snippet-body">
        <p className="profile-snippet-title">{snippet.title}</p>
        {(snippet.ups?.length || snippet.downs?.length) ? (
          <div className="profile-snippet-points">
            {snippet.ups?.map((u, i) => (
              <span key={`u${i}`} className="profile-snippet-point">
                <ArrowUpGlyph size={16} />
                <span>{u}</span>
                <span className="profile-snippet-dot">•</span>
              </span>
            ))}
            {snippet.downs?.map((d, i) => (
              <span key={`d${i}`} className="profile-snippet-point">
                <ArrowUpGlyph size={16} down />
                <span>{d}</span>
                <span className="profile-snippet-dot">•</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {snippet.editLog && <SnippetEditLog log={snippet.editLog} />}
    </div>
  );
}
