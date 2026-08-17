/**
 * 상태 스위처 전용 아이콘. design-page 규약대로 인라인 SVG 로 그린다
 * (이모지 금지 — OS·폰트마다 모양이 달라지고 color 를 상속하지 않는다).
 *
 * 규약: viewBox="0 0 24 24" · fill="none" · stroke="currentColor" · strokeWidth={2}
 *       · 크기는 size prop · SVG 안에 리터럴 색 없음 (부모의 color 를 상속)
 */

function Svg({ size = 16, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** 슬라이더 — 상태 스위처 열기. */
export function SlidersIcon({ size }) {
  return (
    <Svg size={size}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="17" x2="20" y2="17" />
      <circle cx="9" cy="7" r="2.5" />
      <circle cx="16" cy="17" r="2.5" />
    </Svg>
  );
}

/** 닫기. */
export function CloseIcon({ size }) {
  return (
    <Svg size={size}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </Svg>
  );
}

/** 초기화 — 모든 knob 을 기본값으로. */
export function ResetIcon({ size }) {
  return (
    <Svg size={size}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <polyline points="3 4 3 10 9 10" />
    </Svg>
  );
}
