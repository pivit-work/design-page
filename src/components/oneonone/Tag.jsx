import { TAG_TYPES } from './constants.js';

/**
 * Pill tag for member warnings / highlights.
 *
 * @param {'positive'|'warning'} type
 * @param {string} text
 * @param {string} [icon] - optional icon path; falls back to type default
 * @param {React.ComponentType} [Icon] - Icon component supplied by the host app
 */
export default function Tag({ type = 'positive', text, icon, Icon }) {
  const variant = TAG_TYPES[type] || TAG_TYPES.positive;
  const iconSrc = icon === undefined ? variant.defaultIcon : icon;
  return (
    <span className={`tag ${variant.className}`}>
      {iconSrc && Icon && <Icon src={iconSrc} size={12} color={variant.color} />}
      <span>{text}</span>
    </span>
  );
}
