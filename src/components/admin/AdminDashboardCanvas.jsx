import Card from './Card.jsx';
import SectionLabel from './SectionLabel.jsx';
import LinkButton from './LinkButton.jsx';
import AdminStatTile from './AdminStatTile.jsx';
import AdminTeamRow from './AdminTeamRow.jsx';
import AdminEvalCard from './AdminEvalCard.jsx';
import AdminIntegrationRow from './AdminIntegrationRow.jsx';
import AdminActivityLogRow from './AdminActivityLogRow.jsx';

/**
 * AdminDashboardCanvas — 어드민 개요 대시보드 Pure 컴포넌트.
 * pivit-specs 의 admin-dashboard-view.jsx 시안을 design-page 정본으로 포팅.
 *
 * 모든 데이터·라벨은 props 로 받는다 (page wrapper 가 fetch·매핑·i18n 소유).
 * 스타일은 design-page 토큰을 쓴 src/admin.css 클래스로 작성됨.
 * 호스트 앱은 `@pivit-work/design-page/styles/admin.css` 를 import 해야 한다.
 *
 * 톤 레퍼런스:
 *  - 요약 카드 → manager StatTile
 *  - 헬스 점수 → ReportWeeklyRow (check-heart 아이콘 + good/warning/error 색)
 *  - 배지 (레드플래그/활성/비활성) → 1on1 severity 배지
 *  - 상시 평가 그래프 → 1on1 KPI 그래프 (블루)
 */

const DEFAULT_LABELS = {
  pageTitle: '개요',
  pageSubtitle: '',
  inviteButton: '+ 팀원 초대',
  teamSectionTitle: '팀원 현황',
  manageEmployees: '직원 관리',
  tableHeaders: {
    name: '이름', dept: '부서', snippet: '오늘 스니핏',
    health: '헬스체크', redFlag: '레드플래그', status: '상태',
  },
  submitted: '제출',
  notSubmitted: '미제출',
  invitePending: '초대 대기 중',
  activeStatus: '활성',
  inactiveStatus: '비활성',
  // 경고 표시는 AdminTeamRow 가 인라인 SVG 로 그린다 — 라벨에 ⚠ 를 섞지 않는다(PW-298).
  detected: '감지',
  emptyTeam: '팀원이 없습니다',
  evalSectionTitle: '상시 평가',
  evalCardHeading: '상시 평가',
  manageEval: '평가 관리',
  inProgressBadge: '진행 중 0건',
  selfReviewDone: '셀프 리뷰 완료',
  managerReviewDone: '매니저 평가 완료',
  sendReminder: '미완료 평가 리마인더 발송',
  emptyEval: '진행 중인 평가가 없습니다',
  integrationsSectionTitle: '외부 연동',
  manageIntegrations: '연동 설정',
  connected: '연결됨',
  connectAction: '연결',
  activitySectionTitle: '오늘 활동 로그',
  activityCount: '0건',
  emptyActivity: '오늘 활동 기록이 없습니다',
  logTypes: { snippet: '스니핏', alert: '알림', oneonone: '1on1', meeting: '회의록', eval: '평가' },
  ceoBannerTitle: '대표(CEO)가 지정되지 않았습니다',
  ceoBannerBody: '조직도 최상위가 비어 있습니다. 대표를 지정하면 조직도와 구성원 목록에 반영됩니다.',
  ceoBannerCta: '지정하기',
  ceoBannerDismiss: '닫기',
};

function mergeLabels(provided) {
  if (!provided) return DEFAULT_LABELS;
  return {
    ...DEFAULT_LABELS,
    ...provided,
    tableHeaders: { ...DEFAULT_LABELS.tableHeaders, ...(provided.tableHeaders || {}) },
    logTypes: { ...DEFAULT_LABELS.logTypes, ...(provided.logTypes || {}) },
  };
}

export default function AdminDashboardCanvas({
  dateLabel = '',
  stats = [],              // [{ label, value, sub }]
  teamRows = [],
  evalCard = null,
  integrations = [],
  activityLog = [],
  labels: providedLabels,
  baseUrl = '',
  onInvite,
  onManageEmployees,
  onManageEval,
  onSendReminder,
  onManageIntegrations,
  onConnectIntegration,
  onStatClick,   // (id) => void — 클릭 가능한 stat 타일(팀원 현황 필터 토글)
  onRowClick,    // (memberId) => void — 팀원 행 클릭
  renderAvatar,
  // 대표(CEO) 미지정 안내 — 차단이 아니라 경고(amber)다. 미지정(0명)은 정상 상태이며
  // 모든 기능이 동작한다(arch-core-data-model.md §1-3-c R2).
  // 배너는 showCeoBanner 가 true 이고 onAssignCeo 가 있을 때만(=어드민) 뜬다.
  showCeoBanner = false,
  onAssignCeo,
  onDismissCeoBanner,
}) {
  const labels = mergeLabels(providedLabels);
  const headerKeys = ['name', 'dept', 'snippet', 'health', 'redFlag', 'status'];

  return (
    <div className="admin-canvas">
      <header className="admin-header">
        <div className="admin-header-titles">
          <h1 className="admin-page-title">{labels.pageTitle}</h1>
          {labels.pageSubtitle && <p className="admin-page-subtitle">{labels.pageSubtitle}</p>}
        </div>
        <div className="admin-header-actions">
          {dateLabel && <span className="admin-header-date">{dateLabel}</span>}
          <button type="button" className="admin-invite-button" onClick={onInvite}>
            {labels.inviteButton}
          </button>
        </div>
      </header>

      {showCeoBanner && onAssignCeo && (
        <div className="admin-ceo-banner" role="status" data-testid="admin-ceo-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
            <path d="M3 7l4.5 4L12 4l4.5 7L21 7l-1.8 11H4.8L3 7Z" />
          </svg>
          <div className="admin-ceo-banner-text">
            <strong>{labels.ceoBannerTitle}</strong>
            <span>{labels.ceoBannerBody}</span>
          </div>
          <button type="button" className="admin-ceo-banner-cta" onClick={onAssignCeo}>
            {labels.ceoBannerCta}
          </button>
          {onDismissCeoBanner && (
            <button type="button" className="admin-ceo-banner-dismiss" onClick={onDismissCeoBanner} aria-label={labels.ceoBannerDismiss}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}

      <div className="admin-stats-grid">
        {stats.map((s) => (
          <AdminStatTile
            key={s.label}
            label={s.label}
            value={s.value}
            sub={s.sub}
            active={!!s.active}
            onClick={onStatClick && s.filterKey ? () => onStatClick(s.filterKey) : undefined}
          />
        ))}
      </div>

      <div className="admin-main-grid">
        <Card>
          <div className="admin-section-header">
            <SectionLabel>{labels.teamSectionTitle}</SectionLabel>
            <LinkButton onClick={onManageEmployees}>{labels.manageEmployees}</LinkButton>
          </div>
          <table className="admin-team-table">
            <thead>
              <tr>
                {headerKeys.map((k) => <th key={k}>{labels.tableHeaders[k]}</th>)}
              </tr>
            </thead>
            <tbody>
              {teamRows.filter((r) => r.active).map((row) => (
                <AdminTeamRow
                  key={row.id}
                  row={row}
                  labels={labels}
                  baseUrl={baseUrl}
                  renderAvatar={renderAvatar}
                  onRowClick={onRowClick}
                />
              ))}
              {teamRows.filter((r) => !r.active).map((row) => (
                <AdminTeamRow
                  key={row.id}
                  row={row}
                  labels={labels}
                  baseUrl={baseUrl}
                  renderAvatar={renderAvatar}
                  onRowClick={onRowClick}
                />
              ))}
              {teamRows.length === 0 && (
                <tr>
                  <td colSpan={headerKeys.length} className="admin-team-empty">
                    {labels.emptyTeam}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="admin-side-col">
          <AdminEvalCard
            evalCard={evalCard}
            labels={{
              sectionTitle: labels.evalSectionTitle,
              cardHeading: labels.evalCardHeading,
              manageEval: labels.manageEval,
              inProgressBadge: labels.inProgressBadge,
              selfReviewDone: labels.selfReviewDone,
              managerReviewDone: labels.managerReviewDone,
              sendReminder: labels.sendReminder,
              emptyEval: labels.emptyEval,
            }}
            onManageEval={onManageEval}
            onSendReminder={onSendReminder}
          />

          <Card>
            <div className="admin-section-header">
              <SectionLabel>{labels.integrationsSectionTitle}</SectionLabel>
              <LinkButton onClick={onManageIntegrations}>{labels.manageIntegrations}</LinkButton>
            </div>
            <div className="admin-integration-list">
              {integrations.map((intg) => (
                <AdminIntegrationRow
                  key={intg.name}
                  integration={intg}
                  labels={{ connected: labels.connected, connectAction: labels.connectAction }}
                  baseUrl={baseUrl}
                  onConnect={onConnectIntegration}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="admin-section-header">
          <SectionLabel>{labels.activitySectionTitle}</SectionLabel>
          <span className="admin-activity-count">{labels.activityCount}</span>
        </div>
        {activityLog.length === 0 ? (
          <div className="admin-activity-empty">{labels.emptyActivity}</div>
        ) : (
          <div className="admin-activity-list">
            {activityLog.map((log, i) => (
              <AdminActivityLogRow
                key={log.id ?? `${log.time}-${log.actor}-${i}`}
                log={log}
                logTypes={labels.logTypes}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
