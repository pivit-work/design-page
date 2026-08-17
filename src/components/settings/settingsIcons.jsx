/**
 * 내 설정(MySettingsCanvas) 공용 인라인 SVG 아이콘 세트.
 *
 * 이 캔버스의 안내 배너(`admin-notif-banner`)는 아이콘 자리를 이모지 글리프(ℹ · 🔒 · ⚠)로
 * 채우고 있었다. design-page 정본은 인라인 SVG 다 — OS·폰트마다 모양이 갈려 디자이너
 * 정본과 어긋나고, 컬러 이모지가 흑백 UI 에서 혼자 튀며, 라틴/CJK 폭이 갈려 고정폭
 * 아이콘 자리에서 정렬이 흔들리고, `color` 를 상속하지 않아 배너 톤별 색
 * (`.admin-notif-banner-icon { color: var(--text-brand-secondary) }`, `is-warn` 변형)을
 * 줄 수 없다. 같은 클래스를 쓰는 `AdminNotificationsCanvas` 는 이미 SVG 라, 한 제품 안에서
 * 같은 배너가 두 가지로 갈려 있었다.
 *
 * 규약: viewBox 0 0 24 24, fill none, stroke currentColor, strokeWidth 2, round cap/join,
 * aria-hidden. 크기는 size prop, 색은 부모의 color 상속(SVG 안에 리터럴 색 금지).
 * 선례: `eval/evalIcons.jsx`, `admin/teamIcons.jsx`, `orgchart/squadIcons.jsx`.
 */

export function svgProps(size) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    style: { verticalAlign: 'middle', flexShrink: 0 },
  };
}

/** ℹ 안내 — info 원. 중립 톤 배너(공개 범위·성과·프로필·연동)의 기본 아이콘. */
export function InfoIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/** 🔒 잠금 — 닫힌 자물쇠. 보상 탭의 "가려진 정보" 배너. */
export function LockIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/** ⚠ 경고 — 삼각형. 연동 항목의 경고 배너. */
export function AlertTriangleIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
