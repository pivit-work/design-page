import { PROGRESS_COLORS } from './constants.js';

/**
 * Horizontal progress bar with filled portion in a token-driven color.
 *
 * @param {number} percent - 0-100
 * @param {'green'|'blue'|'red'|'blueLight'} color - palette key
 */
export default function ProgressBar({ percent, color = 'blue' }) {
  const c = PROGRESS_COLORS[color] || PROGRESS_COLORS.blue;
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <div className="progress-track">
      <div
        className="progress-fill"
        style={{ width: `${pct}%`, background: c.fill }}
      />
    </div>
  );
}
