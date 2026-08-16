import assetUrl from '../shared/assetUrl.js';
import { nameInitials, nameFontSize } from '../shared/nameInitials.js';

/**
 * 매니저 리스팅 카드의 육각형 아바타 — **2D**.
 *
 * ── 왜 2D 인가 ──
 * 원래 이 자리는 `SplineHero`(WebGL 3D 장면)였다. 카드마다 장면을 하나씩 띄우므로
 * 화면에 보이는 카드 수만큼 WebGL 컨텍스트가 동시에 돌았고(브라우저 한도 ~16),
 * 팀원이 수십 명인 조직에서는 매니저 화면에 "들어가는 것만으로" 느려졌다.
 * 리스팅은 훑어보는 화면이라 3D 가 값을 못 하므로 2D 로 그린다.
 * 클릭 시 뜨는 상세 프로필(ProfileModal) 은 한 번에 하나만 뜨므로 3D 그대로 둔다.
 *
 * ── 육각형 비주얼은 디자이너 정본 에셋(PNG) 이다 ──
 * Figma 17485:22197 폴리곤의 export — 라운드 코너·메탈 링·conic 금색 그라데이션·
 * 소프트 섀도가 전부 구워져 있다. 예전엔 clip-path + linear-gradient 로 근사했는데
 * 라운드 코너와 섀도는 CSS 육각형으로 재현이 안 돼 에셋 방식으로 바꿨다.
 * PNG 에는 링 바깥 섀도 여백이 포함되어 있어 히트박스(육각형 bounds)보다 크게
 * 겹쳐 그린다 — 여백 비율은 Figma export 값(manager.css `.manager-member-hex-bg`).
 *
 * 아바타는 PNG 위에 육각형 clip-path 로 잘라 얹는다. 데모 아바타는 배경 투명
 * 누끼라 PNG 의 그라데이션이 사진 뒤로 비친다.
 * 아바타가 없는 멤버는 이름 이니셜을 보인다 (`MemberTable` 과 동일 폴백).
 */
// Figma 17486:22226 폴리곤 bounds (187×186) — 카드 히트박스 기본값.
const HEX_SIZE = 187;

export default function MemberHex({ name, avatar, size = HEX_SIZE, baseUrl = '' }) {
  const initials = nameInitials(name);

  return (
    <div className="manager-member-hex" style={{ width: size }}>
      <img
        className="manager-member-hex-bg"
        src={assetUrl(baseUrl, 'hex-gold.png')}
        alt=""
        draggable={false}
      />
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
