import { useState } from 'react';

/**
 * SnippetMemberAvatars — 스니핏 페이지 매니저 뷰의 멤버 아바타 행.
 * Figma node 16960:20724.
 *
 * 64px 원형 아바타 + 하단 이름. 선택된 멤버는 brand 톤 focus ring +
 * brand-tertiary bold 이름.
 *
 * Props:
 *   members         [{ id, name, avatar, color }]
 *   selectedId      현재 선택된 멤버 id
 *   onSelect        (id) => void
 */

/**
 * 사진이 없거나 로드에 실패하면 이니셜 타일.
 *
 * admin 의 AvatarFallback 과 같은 규칙(이니셜 2글자, color20 배경 + color 텍스트)이지만
 * 그 컴포넌트는 .admin-avatar CSS 에 묶여 있어, 스니핏 페이지에서 쓰려면 admin 스타일까지
 * 끌어와야 한다. 공용 승격은 디자이너 결정 사항이라 여기서는 규칙만 맞춘다.
 */
function MemberAvatar({ member }) {
  const [failed, setFailed] = useState(false);
  const color = member.color || 'var(--colors-text-textBrandTertiary, #21a67a)';
  const showPhoto = !!member.avatar && !failed;

  return (
    <span
      className="snippet-member-avatar"
      style={showPhoto ? undefined : { background: `${color}20` }}
    >
      {showPhoto ? (
        <img src={member.avatar} alt="" onError={() => setFailed(true)} />
      ) : (
        <span className="snippet-member-avatar-text" style={{ color }}>
          {member.name ? member.name.slice(0, 2) : ''}
        </span>
      )}
    </span>
  );
}

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
            <MemberAvatar member={m} />
            <span className="snippet-member-name">{m.name}</span>
          </button>
        );
      })}
    </div>
  );
}
