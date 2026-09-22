import { STATUS_COLORS } from './constants.js';
import DpStatusBadge from '../shared/StatusBadge.jsx';

/**
 * `label` 을 넘기면 그 글자를 쓴다 (다국어 화면용). 없으면 `STATUS_COLORS` 의 기본 한국어.
 */
export default function StatusBadge({ status = 'good', label }) {
  const conf = STATUS_COLORS[status] ?? STATUS_COLORS.good;
  return (
    <DpStatusBadge as="div" className="manager-status-badge">
      <span className="manager-status-dot" style={{ background: conf.dot }} />
      <span className="manager-status-label">{label ?? conf.label}</span>
    </DpStatusBadge>
  );
}
