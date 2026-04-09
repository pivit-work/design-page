import { useRef, useEffect, useState } from 'react';
import StatCard from './StatCard.jsx';
import MemberCard from './MemberCard.jsx';

/**
 * Full 1on1 dashboard content area — page header, stats row, filter tabs,
 * and the grid of MemberCards. The host app owns the outer layout shell
 * (sidebar, modals, side panels) and feeds data in via props.
 *
 * @param {object} props
 * @param {string} props.title - page title (e.g. "원온원")
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
  const tabsRef = useRef(null);
  const [slider, setSlider] = useState({ left: 0, width: 0 });

  useEffect(() => {
    requestAnimationFrame(() => {
      if (!tabsRef.current) return;
      const activeEl = tabsRef.current.querySelector('.tab-btn.tab-active');
      if (!activeEl) return;
      const rowRect = tabsRef.current.getBoundingClientRect();
      const btnRect = activeEl.getBoundingClientRect();
      setSlider({ left: btnRect.left - rowRect.left, width: btnRect.width });
    });
  }, [activeTab, tabs.length]);

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

        {tabs && tabs.length > 0 && (
          <div className="tabs-row" ref={tabsRef}>
            <div
              className="tab-slider"
              style={{ left: slider.left, width: slider.width }}
            />
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  type="button"
                  key={tab.key}
                  className={`tab-btn${active ? ' tab-active' : ''}`}
                  onClick={() => onTabChange?.(tab.key)}
                >
                  <span>{tab.label}</span>
                  {tab.count != null && active && (
                    <span className="tab-badge">{tab.count}</span>
                  )}
                </button>
              );
            })}
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
