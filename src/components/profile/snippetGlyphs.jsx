/** 스니핏 카드의 작은 그림 둘 — 헬스 점수 옆 하트 체크(14), 좋았던·아쉬운 점 앞 화살표(16). */

export function CheckHeartGlyph({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M11.6667 4.66667C11.6667 3.376 10.6573 2.33333 9.41667 2.33333C8.49 2.33333 7.69333 2.91667 7.34833 3.74C7.00333 2.91667 6.20667 2.33333 5.28 2.33333C4.03933 2.33333 3.03 3.376 3.03 4.66667C3.03 8.43367 7.34833 11 7.34833 11M9.91667 8.16667L11.0833 9.33333L13.4167 7"
        stroke="var(--colors-text-textWarningPrimary, #dc6803)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** `down` — 위 화살표를 뒤집어 아래 화살표로 그린다(아쉬운 점 줄). */
export function ArrowUpGlyph({ size = 16, down = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={down ? { transform: 'rotate(180deg)' } : undefined}
    >
      <path
        d="M8 13.333V2.667M8 2.667L3.333 7.333M8 2.667L12.667 7.333"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
