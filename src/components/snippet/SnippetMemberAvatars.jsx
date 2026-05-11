/**
 * SnippetMemberAvatars — 스니핏 페이지 매니저 뷰의 멤버 아바타 행.
 * Figma node 16960:20724.
 *
 * 64px 원형 아바타 + 하단 이름. 선택된 멤버는 brand 톤 focus ring +
 * brand-tertiary bold 이름.
 *
 * Props:
 *   members         [{ id, name, avatar }]
 *   selectedId      현재 선택된 멤버 id
 *   onSelect        (id) => void
 */
export default function SnippetMemberAvatars({ members = [], selectedId, onSelect }) {
  return (
    <div className="snippet-members">
      {members.map((m) => {
        const selected = m.id === selectedId;
        return (
          <button
            key={m.id}
            type="button"
            className={`snippet-member ${selected ? 'is-selected' : ''}`}
            onClick={() => onSelect?.(m.id)}
          >
            <span className="snippet-member-avatar">
              <img src={m.avatar} alt="" />
            </span>
            <span className="snippet-member-name">{m.name}</span>
          </button>
        );
      })}
    </div>
  );
}
