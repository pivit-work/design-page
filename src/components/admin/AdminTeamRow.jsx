import Icon from '../shared/Icon.jsx';
import AvatarFallback from './AvatarFallback.jsx';

function healthLevel(h) {
  if (h >= 8) return 'good';
  if (h >= 6) return 'warning';
  return 'error';
}

/**
 * 팀원 현황 표의 한 행. row.active=false 면 비활성 변형 (가운데 셀이 "초대 대기 중").
 *
 * labels: 표 셀 텍스트. 헬스 아이콘은 /icons/check-heart.svg (ReportWeeklyRow 와 동일).
 */
export default function AdminTeamRow({ row, labels, baseUrl = '', renderAvatar, onRowClick }) {
  const avatar = renderAvatar ? renderAvatar(row) : <AvatarFallback row={row} />;
  const clickable = typeof onRowClick === 'function';
  const rowClick = clickable ? () => onRowClick(row.id) : undefined;
  const clickProps = clickable ? { onClick: rowClick, style: { cursor: 'pointer' } } : {};

  if (!row.active) {
    return (
      <tr className="admin-team-row is-inactive" {...clickProps}>
        <td>
          <div className="admin-team-name-cell">
            {avatar}
            <div>
              <div className="admin-team-name">{row.name}</div>
              <div className="admin-team-title">{row.title}</div>
            </div>
          </div>
        </td>
        <td><span className="admin-team-dept">{row.dept}</span></td>
        <td colSpan={3}><span className="admin-team-pending">{labels.invitePending}</span></td>
        <td><span className="admin-pill is-inactive">{labels.inactiveStatus}</span></td>
      </tr>
    );
  }

  const level = row.health != null ? healthLevel(row.health) : null;
  return (
    <tr className={`admin-team-row${row.redFlag ? ' is-flagged' : ''}`} {...clickProps}>
      <td>
        <div className="admin-team-name-cell">
          {avatar}
          <div>
            <div className="admin-team-name">{row.name}</div>
            <div className="admin-team-title">{row.title}</div>
          </div>
        </div>
      </td>
      <td><span className="admin-team-dept">{row.dept}</span></td>
      <td>
        <div className={`admin-team-snippet${row.snippetSubmitted ? ' is-submitted' : ''}`}>
          <div className="admin-team-snippet-dot" />
          <span className="admin-team-snippet-text">
            {row.snippetSubmitted ? labels.submitted : labels.notSubmitted}
          </span>
        </div>
      </td>
      <td>
        {level ? (
          <span className={`admin-team-health is-${level}`}>
            <Icon src="/icons/check-heart.svg" size={14} color="currentColor" baseUrl={baseUrl} />
            {row.health}
          </span>
        ) : (
          <span className="admin-team-empty-cell">—</span>
        )}
      </td>
      <td>
        {row.redFlag
          ? <span className="admin-pill is-redflag">{labels.detected}</span>
          : <span className="admin-team-empty-cell">—</span>}
      </td>
      <td><span className="admin-pill is-active">{labels.activeStatus}</span></td>
    </tr>
  );
}
