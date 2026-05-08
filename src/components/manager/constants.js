/**
 * Manager 페이지 상태 배지 색상 매핑.
 * Figma "긴급/주의/창천/양호" 4단계.
 */
export const STATUS_COLORS = {
  urgent: {
    label: '긴급',
    dot: 'var(--colors-error-500)',
    text: 'var(--text-error-primary)',
  },
  warning: {
    label: '주의',
    dot: 'var(--colors-warning-500)',
    text: 'var(--colors-text-textWarningPrimary)',
  },
  excellent: {
    label: '창천',
    dot: 'var(--colors-foreground-fgSuccessPrimary)',
    text: 'var(--colors-text-textSuccessPrimary)',
  },
  good: {
    label: '양호',
    dot: 'var(--utility-blue-500)',
    text: 'var(--text-secondary)',
  },
};
