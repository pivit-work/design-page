import { STATUS_BADGE } from './constants.js';

/**
 * Status pill shown in the top-right of a MemberCard.
 *
 * @param {'preparing'|'meeting'|'done'|'hcWarning'|'unbooked'} status
 * @param {string} label - localized status text
 * @param {React.ComponentType} [Icon] - Icon component supplied by the host app
 */
export default function StatusBadge({ status, label, Icon }) {
  const variant = STATUS_BADGE[status] || STATUS_BADGE.unbooked;
  return (
    <div className={`status-badge ${variant.className}`}>
      {variant.icon && Icon && (
        <Icon src={variant.icon} size={12} color={variant.color} />
      )}
      {variant.showDot && <span className="badge-dot" />}
      <span>{label}</span>
    </div>
  );
}
