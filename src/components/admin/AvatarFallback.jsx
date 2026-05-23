import { useState } from 'react';

/**
 * 아바타 폴백 — photo URL 이 있으면 <img>, 없거나 에러나면 이니셜 타일.
 * row.avatarPhoto / row.avatarColor / row.avatarText 를 받는다.
 *
 * 호스트 앱이 자체 Avatar 를 쓰고 싶으면 AdminDashboardCanvas 의 renderAvatar
 * prop 으로 주입한다.
 */
export default function AvatarFallback({ row, size = 26 }) {
  const [fail, setFail] = useState(false);
  const color = row.avatarColor || 'var(--text-brand-tertiary)';
  const text = row.avatarText || (row.name ? row.name.slice(0, 2) : '');
  const boxStyle = size !== 26
    ? { width: size, height: size, background: `${color}20` }
    : { background: `${color}20` };
  return (
    <div className="admin-avatar" style={boxStyle}>
      {row.avatarPhoto && !fail
        ? <img src={row.avatarPhoto} alt={row.name} onError={() => setFail(true)} />
        : <span className="admin-avatar-text" style={{ color, fontSize: size * 0.34 }}>{text}</span>}
    </div>
  );
}
