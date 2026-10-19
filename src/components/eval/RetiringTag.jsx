import StatusBadge from '../shared/StatusBadge.jsx';

/**
 * PW-2029 — 후보 이름 옆 «퇴사 예정 D-N». 마감 뒤에 떠나 후보에 남은 사람에게만 붙는다(`evalRetiring.js`).
 * 새 모양을 만들지 않는다 — 같은 후보 목록의 「퇴사」 태그(`evc-status-badge tone-error`)와 같은 틀에
 * 주의 색(`tone-warn`)을 쓴다. 문구는 앱이 만든다.
 */
export default function RetiringTag({ label, testId }) {
  if (!label) return null;
  return (
    <StatusBadge className="evc-status-badge tone-warn" data-testid={testId}>
      {label}
    </StatusBadge>
  );
}
