/**
 * Manager 페이지 상태 배지 색상 매핑.
 * 긴급/주의/칭찬/양호 4단계 (기획서 manager-view-spec 분류 표).
 *
 * `label` 은 소비자가 라벨을 안 넘길 때의 기본값이다 — 이 패키지는 i18n 을 모르므로
 * 다국어 화면은 `MemberCard` 의 `statusLabel`·`StatusBadge` 의 `label` 로 넘긴다.
 * (셋째 칸이 한때 「창천」으로 적혀 있었다 — 기획서 어디에도 없는 글자다. PW-887)
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
    label: '칭찬',
    dot: 'var(--colors-foreground-fgSuccessPrimary)',
    text: 'var(--colors-text-textSuccessPrimary)',
  },
  good: {
    label: '양호',
    dot: 'var(--utility-blue-500)',
    text: 'var(--text-secondary)',
  },
};
