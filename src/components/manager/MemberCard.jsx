import Icon from '../shared/Icon.jsx';
import MemberHex from './MemberHex.jsx';
import StatusBadge from './StatusBadge.jsx';
import { STATUS_COLORS } from './constants.js';

/**
 * 매니저 페이지의 멤버 카드.
 * 상단 2D 헥사(아바타) + 이름/직급 + 코멘트 + 상태 배지 + 원온원/메시지 버튼.
 *
 * 헥사는 CSS clip-path 로 그린다 (`MemberHex`). 예전엔 카드마다 Spline 3D 장면을
 * 띄웠는데, 리스팅은 카드가 수십 장이라 화면 진입 비용이 카드 수에 비례해 붙었다.
 * 클릭 시 뜨는 상세 프로필(ProfileModal) 의 3D 는 그대로다.
 */
export default function MemberCard({
  name,
  role,
  comment,
  status,
  avatar,
  icons,
  baseUrl = '',
  onCardClick,
  onOneOnOneClick,
  onMessageClick,
}) {
  const conf = STATUS_COLORS[status] ?? STATUS_COLORS.good;

  // 버튼 클릭 시 카드 onClick 으로 버블링되어 모달이 동시에 열리는 걸 막는다.
  const stop = (handler) => (e) => {
    e.stopPropagation();
    handler?.();
  };

  return (
    <div className="manager-member-card" onClick={onCardClick}>
      <MemberHex name={name} avatar={avatar} baseUrl={baseUrl} />
      <div className="manager-member-body">
        <div className="manager-member-name-block">
          <p className="manager-member-name">{name}</p>
          <p className="manager-member-role">{role}</p>
        </div>
        <p className="manager-member-comment" style={{ color: conf.text }}>
          {comment}
        </p>
        <StatusBadge status={status} />
        <div className="manager-member-actions">
          <button type="button" className="manager-member-action-btn" onClick={stop(onOneOnOneClick)}>
            <Icon src={icons?.userOutline} size={16} color="var(--text-secondary)" baseUrl={baseUrl} />
            <span>원온원</span>
          </button>
          <button type="button" className="manager-member-action-btn" onClick={stop(onMessageClick)}>
            <Icon src={icons?.messageText} size={16} color="var(--text-secondary)" baseUrl={baseUrl} />
            <span>메시지</span>
          </button>
        </div>
      </div>
    </div>
  );
}
