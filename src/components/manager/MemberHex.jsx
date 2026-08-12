import { nameInitials, nameFontSize } from '../shared/nameInitials.js';

/**
 * 매니저 리스팅 카드의 육각형 아바타 — **2D**.
 *
 * ── 왜 2D 인가 ──
 * 원래 이 자리는 `SplineHero`(WebGL 3D 장면)였다. 카드마다 장면을 하나씩 띄우므로
 * 화면에 보이는 카드 수만큼 WebGL 컨텍스트가 동시에 돌았고(브라우저 한도 ~16),
 * 팀원이 수십 명인 조직에서는 매니저 화면에 "들어가는 것만으로" 느려졌다.
 * 리스팅은 훑어보는 화면이라 3D 가 값을 못 하므로 같은 실루엣을 CSS 로 그린다.
 * 클릭 시 뜨는 상세 프로필(ProfileModal) 은 한 번에 하나만 뜨므로 3D 그대로 둔다.
 *
 * ── 실루엣은 기존 장면에서 실측해 옮겼다 ──
 * 새 디자인을 만든 게 아니라, 3D 장면이 렌더한 픽셀을 그대로 재현한 값이다:
 *  - pointy-top 정육각형 (위/아래 꼭짓점, 좌우 수직변) — 폭:높이 = √3:2 = 0.866
 *  - 금색 면 #FFD400 + 가장자리 광택 #FFF0B0 (장면 렌더 픽셀 샘플)
 *  - 테두리 링 #A7A69F (장면의 메탈 프레임 색)
 * 3D 장면에만 있던 장식(별 · 'Pro' 띠 · 입체 광택)은 데이터가 아니라 장면 소품이므로
 * 옮기지 않는다 — 임의로 흉내 내면 디자이너 정본과 어긋난다.
 *
 * 아바타가 없는 멤버는 이름 이니셜을 보인다 (`MemberTable` 과 동일 폴백).
 */
const HEX_SIZE = 132;

export default function MemberHex({ name, avatar, size = HEX_SIZE }) {
  const initials = nameInitials(name);

  return (
    <div className="manager-member-hex" style={{ width: size }}>
      <div className="manager-member-hex-face">
        {avatar ? (
          <img
            className="manager-member-hex-img"
            src={avatar}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span
            className="manager-member-hex-initials"
            style={{ fontSize: nameFontSize(initials, size * 0.68) }}
          >
            {initials}
          </span>
        )}
      </div>
    </div>
  );
}
