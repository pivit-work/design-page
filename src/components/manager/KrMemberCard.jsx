/**
 * KrMemberCard — KR 드릴다운 좌측 팀원 기여 카드.
 * Figma 17026:23299.
 *
 * member: { id, name, role, percent, avatar,
 *   initiatives: [{ title, percent }], stats: { snippets, actions, jira },
 *   alert? }
 * 선택된 카드만 흰 배경, 나머지는 회색 dim.
 */
export default function KrMemberCard({ member, selected = false, onClick }) {
  return (
    <div className={`mgr-krm-card${selected ? ' is-selected' : ''}`} onClick={onClick}>
      <div className="mgr-krm-head">
        <img className="mgr-krm-avatar" src={member.avatar} alt={member.name} draggable={false} />
        <div className="mgr-krm-name-wrap">
          <p className="mgr-krm-name">{member.name}</p>
          <p className="mgr-krm-role">{member.role}</p>
        </div>
        <span className="mgr-krm-percent">{member.percent}%</span>
      </div>

      <p className="mgr-krm-caption">개인 Initiative 진행률</p>
      <div className="mgr-krm-initiatives">
        {member.initiatives.map((item) => (
          <div className="mgr-krm-initiative" key={item.title}>
            <div className="mgr-krm-initiative-row">
              <span className="mgr-krm-initiative-title">{item.title}</span>
              <span className="mgr-krm-initiative-percent">{item.percent}%</span>
            </div>
            <div className="mgr-krm-bar">
              <div className="mgr-krm-bar-fill" style={{ width: `${item.percent}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mgr-krm-stats">
        <div className="mgr-krm-stat">
          <b>{member.stats.snippets}</b>
          <span>스니핏</span>
        </div>
        <div className="mgr-krm-stat">
          <b>{member.stats.actions}</b>
          <span>액션 아이템</span>
        </div>
        <div className="mgr-krm-stat">
          <b>{member.stats.jira}</b>
          <span>Jira</span>
        </div>
      </div>

      {member.alert && (
        <div className="mgr-krm-alert">▲ {member.alert}</div>
      )}
    </div>
  );
}
