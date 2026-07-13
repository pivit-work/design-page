import OkrProgressBar from './OkrProgressBar.jsx';

/**
 * OkrOverallCard — 전체달성률 요약 카드 (큰 % + 풀폭 진행바 + 상태 뱃지).
 */
export default function OkrOverallCard({ percent, status }) {
  return (
    <div className="okr-p-overall">
      <div className="okr-p-overall-head">
        <span className="okr-p-overall-label">전체달성률</span>
        {status && <span className={`okr-status-badge is-${status.tone}`}>{status.label}</span>}
      </div>
      <p className="okr-p-overall-percent">{percent}%</p>
      <OkrProgressBar percent={percent} variant="error" />
    </div>
  );
}
