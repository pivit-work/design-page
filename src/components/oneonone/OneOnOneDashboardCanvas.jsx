import Tabs from '../shared/Tabs.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import StatCard from './StatCard.jsx';
import MemberCard from './MemberCard.jsx';

/**
 * Full 1on1 dashboard content area — page header, stats row, filter tabs,
 * and the grid of MemberCards. The host app owns the outer layout shell
 * (sidebar, modals, side panels) and feeds data in via props.
 *
 * @param {object} props
 * @param {string} props.title - page title (e.g. "1on1")
 * @param {React.ReactNode} [props.subtitle] - subtitle node (e.g. "김지수 매니저 · 개발팀 5명")
 * @param {Array} props.stats - stat card defs (see StatCard)
 * @param {Array<{key:string,label:string,count?:number|null}>} props.tabs
 * @param {string} props.activeTab - currently active tab key
 * @param {(key: string) => void} props.onTabChange
 * @param {Array} props.members - normalized member list (see MemberCard)
 * @param {(member) => void} [props.onMemberClick]
 * @param {() => void} [props.onAddClick]
 * @param {string} [props.addLabel] - "1on1 일정 추가"
 * @param {React.ComponentType} props.Icon
 * @param {(member) => React.ReactNode} [props.renderAvatar]
 * @param {object} [props.memberLabels] - labels forwarded to MemberCard
 * @param {React.ReactNode} [props.emptyState] - shown when members is empty
 */
export default function OneOnOneDashboardCanvas({
  title,
  subtitle,
  stats,
  tabs,
  activeTab,
  onTabChange,
  members,
  onMemberClick,
  onAddClick,
  addLabel,
  addIcon = '/icons-solid/plus.svg',
  Icon,
  renderAvatar,
  memberLabels,
  emptyState,
}) {
  return (
    <div className="content-area">
      <div className="content-canvas">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">{title}</h1>
            {subtitle && <div className="page-subtitle">{subtitle}</div>}
          </div>
          {onAddClick && (
            <button type="button" className="btn-add" onClick={onAddClick}>
              {Icon && <Icon src={addIcon} size={20} color="var(--text-white)" />}
              {addLabel && <span className="btn-text">{addLabel}</span>}
            </button>
          )}
        </div>

        {stats && stats.length > 0 && (
          <div className="stats-row">
            {stats.map((s) => (
              <StatCard key={s.label} stat={s} Icon={Icon} />
            ))}
          </div>
        )}

        {/* 필터 탭 — 공용 Tabs (PW-836). 활성 탭에만 건수 배지를 붙인다(종전 그대로). */}
        {tabs && tabs.length > 0 && (
          <div className="tl-tabs-row">
            <Tabs
              className="ono-dash-tabs"
              items={tabs.map((tab) => ({
                value: tab.key,
                label: (
                  <>
                    <span>{tab.label}</span>
                    {tab.count != null && activeTab === tab.key && (
                      <StatusBadge className="tab-badge">{tab.count}</StatusBadge>
                    )}
                  </>
                ),
              }))}
              value={activeTab}
              onChange={(key) => onTabChange?.(key)}
            />
          </div>
        )}

        <div className="cards-grid">
          {members.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              Icon={Icon}
              onClick={onMemberClick ? () => onMemberClick(m) : undefined}
              renderAvatar={renderAvatar}
              labels={memberLabels}
            />
          ))}
        </div>

        {members.length === 0 && emptyState}
      </div>
    </div>
  );
}
