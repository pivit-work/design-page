import Icon from '../shared/Icon.jsx';
import ProfilePhoto from '../profile/ProfilePhoto.jsx';
import StatusBadge from './StatusBadge.jsx';
import { STATUS_COLORS } from './constants.js';

/** 카드 사진 한 변 — Figma 17873:32484 (130 · 모서리 46). */
const PHOTO_SIZE = 130;

/**
 * 매니저 페이지의 멤버 카드 — Figma 17873:32483 «manager main» (2026-11-12).
 * 상단 130px 둥근 사진 + 이름/직급 + 코멘트 + 상태 배지 + 원온원/메시지 버튼.
 *
 * 사진이 없거나 못 불러오면 프로필 창과 같은 회색 실루엣 자리(ProfilePhotoPlaceholder · Figma 17876:34266). 예전엔 금색 육각(`MemberHex`),
 * 그 전엔 카드마다 Spline 3D 장면이었다 — 디자이너가 사진 한 장으로 바꿨다. 상세 창(ProfileModal)도 같다.
 */
export default function MemberCard({
  name,
  role,
  comment,
  status,
  // 상태 딱지 글자 — 넘기면 그대로 쓰고, 없으면 기본 한국어(`STATUS_COLORS`).
  statusLabel,
  avatar,
  icons,
  baseUrl = '',
  onCardClick,
  onOneOnOneClick,
  onMessageClick,
  // false 면 [원온원]을 그리지 않는다 — 뷰어가 이 팀원의 조직장이 아닐 때 (pivit-work PW-2486). [메시지]가 줄 전체 폭을 쓴다.
  canOneOnOne = true,
  // 아래 두 버튼 글자 — 넘기면 그대로 쓰고, 없으면 기본 한국어 (pivit-work PW-2216).
  labels,
}) {
  const L = { oneOnOne: '원온원', message: '메시지', ...(labels ?? {}) };
  const conf = STATUS_COLORS[status] ?? STATUS_COLORS.good;

  // 버튼 클릭 시 카드 onClick 으로 버블링되어 모달이 동시에 열리는 걸 막는다.
  const stop = (handler) => (e) => {
    e.stopPropagation();
    handler?.();
  };

  return (
    <div className="manager-member-card" onClick={onCardClick}>
      <div className="manager-member-photo">
        <ProfilePhoto photo={avatar} size={PHOTO_SIZE} className="manager-member-photo-img" />
      </div>
      <div className="manager-member-body">
        <div className="manager-member-name-block">
          <p className="manager-member-name">{name}</p>
          <p className="manager-member-role">{role}</p>
        </div>
        <p className="manager-member-comment" style={{ color: conf.text }}>
          {comment}
        </p>
        <StatusBadge status={status} label={statusLabel} />
        <div className="manager-member-actions">
          {canOneOnOne && (
            <button type="button" className="manager-member-action-btn" onClick={stop(onOneOnOneClick)}>
              <Icon src={icons?.userOutline} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
              <span>{L.oneOnOne}</span>
            </button>
          )}
          <button type="button" className="manager-member-action-btn" onClick={stop(onMessageClick)}>
            <Icon src={icons?.messageText} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
            <span>{L.message}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
