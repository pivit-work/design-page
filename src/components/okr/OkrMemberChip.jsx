/**
 * OkrMemberChip — 아바타 + 이름 칩 (팀 하위 구성원).
 */
export default function OkrMemberChip({ member, onClick }) {
  return (
    <div className="okr-member-chip" onClick={onClick}>
      <span className="okr-member-avatar">
        <img src={member.avatar} alt={member.name} />
        <span className="okr-member-online" />
      </span>
      <span className="okr-member-name">{member.name}</span>
    </div>
  );
}
