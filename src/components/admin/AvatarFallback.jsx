import { useState } from 'react';
import { nameFontSize, nameInitials } from '../shared/nameInitials.js';
import { avatarLabelLayout } from '../orgchart/squad-constants.js';

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
  // 한글 이름은 전체를 보인다(PW-24). 호스트가 avatarText 를 주면 그대로 존중.
  const text = row.avatarText || nameInitials(row.name);
  // 8px 로도 한 줄에 안 들어가는 이름(26px 칸의 네 글자)은 스쿼드 칩처럼 두 줄로 나눈다(PW-303).
  const fit = avatarLabelLayout(text, size);
  const boxStyle = size !== 26
    ? { width: size, height: size, background: `${color}20` }
    : { background: `${color}20` };
  return (
    <div className="admin-avatar" style={boxStyle}>
      {row.avatarPhoto && !fail
        ? <img src={row.avatarPhoto} alt={row.name} onError={() => setFail(true)} />
        : fit.lines.length > 1
          ? (
            <span className="admin-avatar-text" style={{ color, fontSize: fit.fontPx, lineHeight: 1.1, textAlign: 'center' }}>
              {fit.lines.map((line, i) => <span key={i} style={{ display: 'block' }}>{line}</span>)}
            </span>
          )
          : <span className="admin-avatar-text" style={{ color, fontSize: nameFontSize(text, size, 0.34) }}>{text}</span>}
    </div>
  );
}
