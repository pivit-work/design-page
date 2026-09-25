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
 * 두 곳 이상 쓰는 그림은 design-page `shared/lineIcons.jsx` 한 벌을 부른다(PW-1011).
 */
import { AlertTriangleGlyph, FolderGlyph, InfoGlyph, LockGlyph } from '../shared/lineIcons.jsx';

/** `svgProps` 가 주던 style — 공용 아이콘에도 똑같이 넘긴다. */
const GLYPH_STYLE = { verticalAlign: 'middle', flexShrink: 0 };

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
  return <InfoGlyph size={size} style={GLYPH_STYLE} />;
}

/** 🔒 잠금 — 닫힌 자물쇠. 보상 탭의 "가려진 정보" 배너. */
export function LockIcon({ size = 16 }) {
  return <LockGlyph size={size} style={GLYPH_STYLE} />;
}

/** ⚠ 경고 — 삼각형. 연동 항목의 경고 배너. */
export function AlertTriangleIcon({ size = 16 }) {
  return <AlertTriangleGlyph size={size} style={GLYPH_STYLE} />;
}

/** 🕘 이력 — 시계 + 되감기 화살. 변경 이력 탭의 안내 배너. */
export function HistoryIcon({ size = 16 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <polyline points="3 4 3 9 8 9" />
      <polyline points="12 8 12 12 14.5 13.5" />
    </svg>
  );
}

/** 📁 폴더 — 사진 업로드 창의 끌어놓기 칸. */
export function FolderIcon({ size = 16 }) {
  return <FolderGlyph size={size} style={GLYPH_STYLE} />;
}
