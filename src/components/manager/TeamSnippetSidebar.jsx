/**
 * TeamSnippetSidebar — 팀 스니핏 탭 좌측 컬럼.
 * Figma 17026:25297.
 *
 * 팀원 리스트(제출 ✓ / 경고 ▲, 클릭 시 필터), 이번 주 헬스 도트,
 * AI 팀 요약 카드.
 *
 * members: [{ name, avatar, submitted, flagged }]
 * weekHealth: [{ name, avatar, dots: ['good'|'warn'|'bad'|'empty'] }]
 */
export default function TeamSnippetSidebar({ members, weekHealth, aiSummary, selectedMember, onSelectMember }) {
  return (
    <div className="mgr-ts-side">
      <div className="mgr-ts-roster">
        <div className="mgr-ts-roster-head">전체</div>
        {members.map((member) => (
          <div
            key={member.name}
            className={`mgr-ts-roster-row${selectedMember === member.name ? ' is-selected' : ''}`}
            onClick={() => onSelectMember(selectedMember === member.name ? null : member.name)}
          >
            <img src={member.avatar} alt={member.name} draggable={false} />
            <span className="mgr-ts-roster-name">{member.name}</span>
            <span className="mgr-ts-roster-status">
              {member.flagged && <span className="mgr-ts-flag">▲</span>}
              {member.submitted && <span className="mgr-ts-check">✓</span>}
            </span>
          </div>
        ))}
      </div>

      <div className="mgr-ts-health">
        <div className="mgr-ts-health-head">이번 주 헬스</div>
        {weekHealth.map((row) => (
          <div className="mgr-ts-health-row" key={row.name}>
            <img src={row.avatar} alt={row.name} draggable={false} />
            <span className="mgr-ts-health-name">{row.name}</span>
            <span className="mgr-ts-dots">
              {row.dots.map((dot, i) => <i key={i} className={`mgr-ts-dot is-${dot}`} />)}
            </span>
          </div>
        ))}
        <div className="mgr-ts-health-legend">
          <span><i className="mgr-ts-dot is-good" /> 8+</span>
          <span><i className="mgr-ts-dot is-warn" /> 5~7</span>
          <span><i className="mgr-ts-dot is-bad" /> ~4</span>
          <span><i className="mgr-ts-dot is-empty" /> 미제출</span>
        </div>
      </div>

      <div className="mgr-ts-ai">
        <p className="mgr-ts-ai-label">✦ AI 팀 요약</p>
        <p className="mgr-ts-ai-text">{aiSummary}</p>
      </div>
    </div>
  );
}
