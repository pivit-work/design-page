// ── 1on1 Design Tokens & Mappings ──

/**
 * Progress bar color variants.
 * key → { fill, text } design-token refs.
 */
export const PROGRESS_COLORS = {
  green: { fill: 'var(--utility-green-100)', text: 'var(--utility-green-600)' },
  blue: { fill: 'var(--utility-blue-100)', text: 'var(--utility-blue-500)' },
  red: { fill: 'var(--utility-error-100)', text: 'var(--text-error-primary)' },
  blueLight: { fill: 'var(--utility-blue-light-100)', text: 'var(--utility-blue-light-600)' },
};

/**
 * Status → CSS class, text color, and default icon path.
 * Icons are referenced as /icons-solid/* paths; consumers must provide an Icon
 * component that resolves those via baseUrl.
 */
export const STATUS_BADGE = {
  preparing: {
    className: 'badge-preparing',
    color: 'var(--text-brand-tertiary)',
    icon: '/icons-solid/trend-up-01.svg',
  },
  meeting: {
    className: 'badge-meeting',
    color: 'var(--utility-blue-500)',
    icon: null,
    showDot: true,
  },
  done: {
    className: 'badge-done',
    color: 'var(--text-disabled)',
    icon: '/icons-solid/check.svg',
  },
  hcWarning: {
    className: 'badge-hc',
    color: 'var(--text-error-primary)',
    icon: '/icons-solid/alert-triangle.svg',
  },
  unbooked: {
    className: 'badge-unbooked',
    color: 'var(--text-disabled)',
    icon: null,
  },
};

/**
 * Tag type → icon + tone color. Consumers may override per tag instance.
 */
export const TAG_TYPES = {
  positive: {
    className: 'tag-positive',
    color: 'var(--utility-green-500)',
    defaultIcon: '/icons-solid/heart-circle.svg',
  },
  warning: {
    className: 'tag-warning',
    color: 'var(--text-error-primary)',
    defaultIcon: '/icons-solid/alert-triangle.svg',
  },
};
