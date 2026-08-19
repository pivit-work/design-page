/*
 * okrIcons.jsx — OKR 화면군 전용 인라인 SVG 아이콘.
 *
 * design-page 는 아이콘을 **이모지 글리프가 아니라 인라인 SVG** 로 그린다
 * (정본 규약: `admin/teamIcons.jsx`, `eval/evalIcons.jsx`).
 * viewBox 0 0 24 24 · fill none · stroke currentColor · 2px · round.
 * 색은 SVG 안에 박지 않고 **감싸는 요소의 `color`** 를 상속한다.
 */

const svgProps = (size) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
});

/**
 * 깃발 — 「상위에 걸리지 않았다(미정렬)」 표시.
 * 기획 목업은 `⚐`(U+2690) 글리프를 썼으나 OS·폰트마다 커버리지가 갈려
 * 배지 안 정렬이 흔들린다. 같은 뜻을 인라인 SVG 로 그린다.
 */
export function FlagIcon({ size = 12 }) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </svg>
  );
}
