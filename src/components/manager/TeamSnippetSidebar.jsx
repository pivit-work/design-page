import Icon from '../shared/Icon.jsx';

/**
 * TeamSnippetSidebar — 팀 스니핏 탭 좌측 컬럼.
 * Figma 17027:26133.
 *
 * - 팀원 리스트: 회색 컨테이너(패딩 4) 안 행(패딩 16, 아바타 32).
 *   경고 ▲(빨강)·제출 ✓(초록) 아이콘, 선택 행은 흰 배경+그림자.
 * - 이번 주 헬스: 흰 배경 + 테두리 카드 — 12px 사각 도트 5칸
 *   (초록 8+/주황 6-7/빨강 -5, 빈 칸은 테두리만) + 하단 범례.
 * - AI 팀 요약: purple-100 카드, 보라 본문.
 */
export default function TeamSnippetSidebar({ members, weekHealth, aiSummary, selectedMember, onSelectMember, icons, baseUrl = '' }) {
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
              {member.flagged && (
                <Icon src={icons.alertTriangle} size={16} color="var(--utility-error-500)" baseUrl={baseUrl} />
              )}
              {member.submitted && (
                <Icon src={icons.check} size={16} color="var(--fg-success-secondary)" baseUrl={baseUrl} />
              )}
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
        <div className="mgr-ts-health-divider" />
        <div className="mgr-ts-health-legend">
          <span><i className="mgr-ts-dot is-good" /> 8+</span>
          <span><i className="mgr-ts-dot is-warn" /> 6-7</span>
          <span><i className="mgr-ts-dot is-bad" /> -5</span>
        </div>
      </div>

      <div className="mgr-ts-ai">
        <p className="mgr-ts-ai-label">
          <Icon src={icons.aiChat} size={12} color="var(--utility-purple-500)" baseUrl={baseUrl} />
          <span>AI 팀 요약</span>
        </p>
        <p className="mgr-ts-ai-text">{aiSummary}</p>
      </div>
    </div>
  );
}
