// 규칙이 공허하지 않은지 재는 표본 (PW-906) — scripts/check-lint.mjs 만 읽는다.
// 2026-09-22 리포트 검수 화면(EvalReportReviewCanvas, design-page PR #483 이전)과 같은 모양:
// 「StatusBadge」로 들여오고 「DpStatusBadge」로 썼다. 그리는 순간 오류가 나 화면이 비었다.
import StatusBadge from '../../src/components/shared/StatusBadge.jsx';

export function Before906({ label }) {
  return (
    <div>
      <StatusBadge>{label}</StatusBadge>
      <DpStatusBadge>{label}</DpStatusBadge>
    </div>
  );
}
