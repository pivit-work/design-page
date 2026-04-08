export const LEVEL_COLORS = {
  company: { bg: 'var(--utility-brand-50)', countColor: 'var(--text-brand-tertiary)' },
  division: { bg: 'var(--utility-blue-50)', countColor: 'var(--utility-blue-600)' },
  team: { bg: 'var(--utility-pink-50)', countColor: null },
  part: { bg: 'var(--utility-purple-50)', countColor: null },
};

export const MEMBER_STATUSES = {
  working: { label: '재직중', badgeBg: '#2dbd82', borderColor: '#2dbd82', dotColor: '#17b26a' },
  leave: { label: '휴직', badgeBg: '#687079', borderColor: '#b1b6be', dotColor: '#d2d6db' },
  resigned: { label: '퇴사 예정', badgeBg: '#f04438', borderColor: '#f04438', dotColor: '#d92d20' },
  standby: { label: '대기중', badgeBg: '#2e90fa', borderColor: '#2e90fa', dotColor: '#1570ef' },
};

export const STATUS_KEYS = Object.keys(MEMBER_STATUSES);
