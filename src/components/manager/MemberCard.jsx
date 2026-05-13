import Icon from '../shared/Icon.jsx';
import StatusBadge from './StatusBadge.jsx';
import { STATUS_COLORS } from './constants.js';

/**
 * 매니저 페이지의 멤버 카드.
 * 상단 헥사 아바타 + 이름/직급 + 코멘트 + 상태 배지 + 원온원/메시지 버튼.
 *
 * 초기 구현은 Spline 3D iframe 으로 헥사를 그렸지만 (1) 대규모 팀에서 iframe N개 동시
 * 로드가 무거워 첫 페인트가 늦고 (2) Spline scene 의 baked 텍스처가 일부 멤버에서
 * 안 바뀌는 비결정성 (Spline runtime applyTexture race) 으로, 각 사람 아바타가 일관되게
 * 보이지 않는 문제가 있었다. → CSS clip-path 헥사 + <img> 로 교체.
 *
 * `splineImage` prop 명칭은 호환을 위해 유지 (pivit-work 측 wrapper 가 이 키로 아바타
 * URL 을 넘긴다). `splineScene` 은 더 이상 사용하지 않지만 future 3D 옵션을 위해 prop
 * 시그니처는 보존.
 */
export default function MemberCard({
  name,
  role,
  comment,
  status,
  splineImage,
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
    <div
      className="manager-member-card is-body-visible"
      onClick={onCardClick}
    >
      <div className="manager-avatar-hex">
        <span className="manager-avatar-hex-star" aria-hidden="true">★</span>
        <span className="manager-avatar-hex-divider" aria-hidden="true" />
        {splineImage ? (
          <img
            src={splineImage}
            alt=""
            className="manager-avatar-hex-img"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <span className="manager-avatar-hex-fallback" aria-hidden="true">
            {name?.[0] ?? ''}
          </span>
        )}
        <span className="manager-avatar-hex-label">Pro</span>
      </div>
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
            <Icon src={icons?.userOutline} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
            <span>원온원</span>
          </button>
          <button type="button" className="manager-member-action-btn" onClick={stop(onMessageClick)}>
            <Icon src={icons?.messageText} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
            <span>메시지</span>
          </button>
        </div>
      </div>
    </div>
  );
}
