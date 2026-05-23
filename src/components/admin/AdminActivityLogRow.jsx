/**
 * 활동 로그 한 줄 — 시간 + 타입 태그(스니핏/알림/1on1/회의록/평가) + 액터 + 본문.
 *
 * log: { time, type, actor, text, isSystem? }
 * logTypes: { snippet, alert, oneonone, meeting, eval } — 타입별 라벨.
 *
 * 타입이 logTypes 에 없으면 meeting 변형으로 폴백.
 */
const KNOWN_TYPES = ['snippet', 'alert', 'oneonone', 'meeting', 'eval'];

export default function AdminActivityLogRow({ log, logTypes }) {
  const typeKey = KNOWN_TYPES.includes(log.type) ? log.type : 'meeting';
  const typeLabel = logTypes?.[typeKey] ?? typeKey;
  return (
    <div className="admin-activity-row">
      <span className="admin-activity-time">{log.time}</span>
      <span className={`admin-activity-tag is-${typeKey}`}>{typeLabel}</span>
      <div className="admin-activity-body">
        <span className={`admin-activity-actor${log.isSystem ? ' is-system' : ''}`}>
          {log.actor}
        </span>
        <span className="admin-activity-text">{` — ${log.text}`}</span>
      </div>
    </div>
  );
}
