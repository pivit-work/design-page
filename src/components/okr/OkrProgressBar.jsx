/**
 * OkrProgressBar — OKR 진행바.
 * variant: 'success' | 'error' | 'blue' | 'warning' | 'brand'
 * width 를 주면 고정폭 트랙, 없으면 부모 폭을 채운다.
 */
export default function OkrProgressBar({ percent = 0, variant = 'blue', width }) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  return (
    <div className="okr-progress-track" style={width ? { width } : undefined}>
      <div className={`okr-progress-fill is-${variant}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}
