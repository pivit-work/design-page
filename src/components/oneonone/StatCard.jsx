/**
 * Single KPI card in the stats row.
 *
 * @param {object} stat
 * @param {string} stat.label
 * @param {number|string} stat.value
 * @param {string} stat.bg - CSS background value (supports gradients)
 * @param {string} [stat.color] - text color (design-token ref or hex)
 * @param {string} [stat.icon] - icon path
 * @param {boolean} [stat.dot] - show blue dot prefix (meeting state)
 * @param {boolean} [stat.border] - outlined variant
 * @param {React.ComponentType} [Icon] - Icon component supplied by the host app
 */
export default function StatCard({ stat, Icon }) {
  const textColor = stat.color || 'var(--text-secondary)';
  const labelColor = stat.color || 'var(--text-subtle)';
  return (
    <div
      className="stat-card"
      style={{
        background: stat.bg,
        border: stat.border ? '1px solid var(--border-primary)' : 'none',
      }}
    >
      <div className="stat-label" style={{ color: labelColor }}>
        {stat.icon && Icon && (
          <Icon src={stat.icon} size={16} color={stat.color} />
        )}
        {stat.dot && <span className="stat-dot" />}
        <span>{stat.label}</span>
      </div>
      <div className="stat-value" style={{ color: textColor }}>
        {stat.value}
      </div>
    </div>
  );
}
