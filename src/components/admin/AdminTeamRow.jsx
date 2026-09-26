import Icon from '../shared/Icon.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import AvatarFallback from './AvatarFallback.jsx';
import RosterTable from '../shared/RosterTable.jsx';

const { Row, Cell } = RosterTable;

function healthLevel(h) {
  if (h >= 8) return 'good';
  if (h >= 6) return 'warning';
  return 'error';
}

/**
 * 팀원 현황 표의 한 행. row.active=false 면 비활성 변형 (가운데 셀이 "초대 대기 중").
 *
 * row.inactiveLabel 이 있으면 비활성 변형의 가운데 셀에 labels.invitePending 대신 그 값을 쓴다.
 * 비활성 줄에는 초대를 기다리는 사람만 오지 않는다 — 퇴사자·계정만 꺼진 사람도 온다(PW-1093).
 *
 * labels: 표 셀 텍스트. 헬스 아이콘은 /icons/check-heart.svg (ReportWeeklyRow 와 동일).
 *
 * 🔴 레드플래그 칩의 경고 표시는 이모지(⚠)가 아니라 인라인 SVG 다 (PW-298).
 * 이모지는 OS·폰트마다 모양이 갈리고, 컬러 글리프가 흑백 UI 에서 혼자 튀며, 라틴/CJK
 * 폭이 달라 칩 안 정렬이 흔들린다. 무엇보다 `color` 를 상속하지 않아 **상태색을 줄 수
 * 없다** — 레드플래그처럼 색으로 상태를 말해야 하는 자리에서 특히 걸린다. 같은 행의
 * 헬스 아이콘과 동일하게 `Icon` + `currentColor` 로 그려 칩의 에러색을 그대로 받는다.
 */
export default function AdminTeamRow({ row, labels, baseUrl = '', renderAvatar, onRowClick }) {
  const avatar = renderAvatar ? renderAvatar(row) : <AvatarFallback row={row} />;
  const clickable = typeof onRowClick === 'function';
  const rowClick = clickable ? () => onRowClick(row.id) : undefined;

  if (!row.active) {
    return (
      <Row tone="muted" onClick={rowClick}>
        <Cell>
          <div className="admin-team-name-cell">
            {avatar}
            <div>
              <div className="admin-team-name">{row.name}</div>
              <div className="admin-team-title">{row.title}</div>
            </div>
          </div>
        </Cell>
        <Cell><span className="admin-team-dept">{row.dept}</span></Cell>
        <Cell colSpan={3}><span className="admin-team-pending">{row.inactiveLabel ?? labels.invitePending}</span></Cell>
        <Cell><StatusBadge className="admin-pill is-inactive">{labels.inactiveStatus}</StatusBadge></Cell>
      </Row>
    );
  }

  const level = row.health != null ? healthLevel(row.health) : null;
  return (
    <Row tone={row.redFlag ? 'flagged' : undefined} onClick={rowClick}>
      <Cell>
        <div className="admin-team-name-cell">
          {avatar}
          <div>
            <div className="admin-team-name">{row.name}</div>
            <div className="admin-team-title">{row.title}</div>
          </div>
        </div>
      </Cell>
      <Cell><span className="admin-team-dept">{row.dept}</span></Cell>
      <Cell>
        <div className={`admin-team-snippet${row.snippetSubmitted ? ' is-submitted' : ''}`}>
          <div className="admin-team-snippet-dot" />
          <span className="admin-team-snippet-text">
            {row.snippetSubmitted ? labels.submitted : labels.notSubmitted}
          </span>
        </div>
      </Cell>
      <Cell>
        {level ? (
          <span className={`admin-team-health is-${level}`}>
            <Icon src="/icons/check-heart.svg" size={14} color="currentColor" baseUrl={baseUrl} />
            {row.health}
          </span>
        ) : (
          <span className="admin-team-empty-cell">—</span>
        )}
      </Cell>
      <Cell>
        {row.redFlag
          ? (
            <StatusBadge className="admin-pill is-redflag">
              <Icon src="/icons/alert-triangle.svg" size={12} color="currentColor" baseUrl={baseUrl} />
              {labels.detected}
            </StatusBadge>
          )
          : <span className="admin-team-empty-cell">—</span>}
      </Cell>
      <Cell><StatusBadge className="admin-pill is-active">{labels.activeStatus}</StatusBadge></Cell>
    </Row>
  );
}
