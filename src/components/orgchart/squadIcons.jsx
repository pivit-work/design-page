/**
 * 스쿼드 뷰 공용 인라인 SVG 아이콘 세트.
 *
 * 기획 시안(`pivit-specs/조직도-renewal-with-public-card/org-chart-v2.jsx`)은 ⭐ 🗓 ⚠ 🔒
 * 같은 이모지 글리프로 아이콘을 표기하지만, design-page 정본은 인라인 SVG 다 —
 * OS·폰트마다 모양이 갈리고, 컬러 이모지가 흑백 UI 에서 혼자 튀며, `color` 를 상속하지
 * 않아 상태별 색을 줄 수 없기 때문이다. 시안의 배치·색은 그대로 두고 글리프만 SVG 로
 * 옮긴다.
 *
 * 규약: viewBox 0 0 24 24, fill none, stroke currentColor, strokeWidth 2, round cap/join,
 * aria-hidden. 크기는 size prop, 색은 부모의 color 상속(SVG 안에 리터럴 색 금지).
 * 선례: `eval/evalIcons.jsx`, `admin/teamIcons.jsx`.
 * 두 곳 이상 쓰는 그림은 design-page `shared/lineIcons.jsx` 한 벌을 부른다(PW-1011).
 */

import {
  AlertTriangleGlyph,
  CalendarGlyph,
  CheckGlyph,
  ChevronDownGlyph,
  CloseGlyph,
  LockGlyph,
  PencilGlyph,
  PlusGlyph,
} from '../shared/lineIcons.jsx';

const ICON_STYLE = { verticalAlign: 'middle', flexShrink: 0 };

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
    style: ICON_STYLE,
  };
}

/** 별 그림 — 채운 별(리드)과 빈 별(리드 미지정)이 이 한 벌을 쓴다(PW-1011). */
const STAR_POINTS = '12 2.5 15.09 8.76 22 9.77 17 14.64 18.18 21.52 12 18.27 5.82 21.52 7 14.64 2 9.77 8.91 8.76 12 2.5';

/**
 * ⭐ 리드 — 스쿼드당 1명. 배지·칩·아바타 오버레이에서 "이 사람이 리드" 를 말한다.
 * 채운 별이라야 작은 크기에서도 식별되므로 fill 만 currentColor 로 예외를 둔다
 * (리터럴 색이 아니라 상속이므로 상태색 규약은 지켜진다).
 */
export function LeadStarIcon({ size = 12 }) {
  return (
    <svg {...svgProps(size)} fill="currentColor" strokeWidth={1}>
      <polygon points={STAR_POINTS} />
    </svg>
  );
}

/** ☆ 리드 미지정 — 리드 지정 버튼의 비활성 상태. */
export function LeadStarOutlineIcon({ size = 12 }) {
  return (
    <svg {...svgProps(size)} strokeWidth={1.8}>
      <polygon points={STAR_POINTS} />
    </svg>
  );
}

/** 🗓 기간 — 한시 조직의 시작–종료. */
export function CalendarIcon({ size = 12 }) {
  return <CalendarGlyph size={size} style={ICON_STYLE} />;
}

/** ⚠ 경고 — 과부하 배너·완료 전환 넛지. */
export function WarningIcon({ size = 12 }) {
  return <AlertTriangleGlyph size={size} style={ICON_STYLE} />;
}

/** 🔒 편집 범위 밖 — manager 스코프 표시. */
export function LockIcon({ size = 12 }) {
  return <LockGlyph size={size} style={ICON_STYLE} />;
}

/** ✕ 해제 — 배정 해제·칩 제거. */
export function CloseIcon({ size = 12 }) {
  return <CloseGlyph size={size} style={ICON_STYLE} />;
}

/** ⋯ 더보기 — 카드 우상단 스쿼드 관리 메뉴. */
export function MoreIcon({ size = 14 }) {
  return (
    <svg {...svgProps(size)} fill="currentColor" strokeWidth={0}>
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

/** ▾ 상태 배지가 전환 트리거임을 알리는 표식. */
export function ChevronDownIcon({ size = 10 }) {
  return <ChevronDownGlyph size={size} strokeWidth={2.6} style={ICON_STYLE} />;
}

/** + 추가 — 팀원 추가·스쿼드 만들기·빈 셀 배정. */
export function PlusIcon({ size = 12 }) {
  return <PlusGlyph size={size} style={ICON_STYLE} />;
}

/** ✓ 편집 완료 토글. */
export function CheckIcon({ size = 12 }) {
  return <CheckGlyph size={size} style={ICON_STYLE} />;
}

/** ✏️ 할당 편집 토글. */
export function EditIcon({ size = 12 }) {
  return <PencilGlyph size={size} style={ICON_STYLE} />;
}
