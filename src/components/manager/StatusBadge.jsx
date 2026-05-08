import { STATUS_COLORS } from './constants.js';

export default function StatusBadge({ status = 'good' }) {
  const conf = STATUS_COLORS[status] ?? STATUS_COLORS.good;
  return (
    <div className="manager-status-badge">
      <span className="manager-status-dot" style={{ background: conf.dot }} />
      <span className="manager-status-label">{conf.label}</span>
    </div>
  );
}
