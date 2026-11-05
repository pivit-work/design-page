/**
 * 1on1 팀원 준비도 배지 — 80 이상 준비 완료 · 50 이상 준비 중 · 그 아래 준비 필요 (policy §4.2.3).
 * 톤은 매니저 뷰의 flag 어휘를 그대로 쓴다(blue/warning/error). 값을 모르면(`null`) 그리지 않는다.
 */
export default function ReadinessBadge({ value, L }) {
  if (value == null) return null;
  const tone = value >= 80 ? 'blue' : value >= 50 ? 'warning' : 'error';
  const label = value >= 80 ? L.readinessComplete : value >= 50 ? L.readinessInProgress : L.readinessNeeded;
  return <span className={`ono-start-flag ono-start-flag-${tone}`}>{label}</span>;
}
