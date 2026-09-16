import {
  BellIcon,
  EvalIcon,
  FeedbackIcon,
  GearIcon,
  OkrIcon,
  OneOnOneIcon,
  SnippetIcon,
} from './notificationIcons.jsx';

const CATEGORY_ICONS = {
  eval: EvalIcon,
  feedback: FeedbackIcon,
  oneonone: OneOnOneIcon,
  okr: OkrIcon,
  snippet: SnippetIcon,
  system: GearIcon,
};

/**
 * NotificationCenterCanvas — 인앱 알림 센터 (`/notifications`).
 *
 * 시안: pivit-specs `K. 내-설정/settings-app.jsx` 의 `NotificationCenterViewScreen`.
 *   헤더(제목 + 안 읽은 수 + 모두 읽음) · 분류 탭(탭마다 안 읽은 수) ·
 *   알림 한 줄(분류 아이콘 · 제목 · 본문 2줄 · 시간 · 안 읽은 점 · 바로가기) ·
 *   빈 상태(종 + 안내) · 알림 설정 버튼.
 *
 * 데이터·문구는 전부 호출부가 준다(i18n 은 소비처 몫). prefix: ncc-
 *
 * Props:
 *   items        [{ id, category, title, body, timeLabel, unread, actionable }]
 *                category ∈ eval | feedback | oneonone | okr | snippet | system
 *                actionable=false 면 바로가기 버튼을 그리지 않는다(연결된 화면 없음)
 *   loading      true 면 목록·빈 상태를 그리지 않는다
 *   filters      [{ value, label }] — 'all' 은 전체
 *   activeFilter 현재 탭 value
 *   labels       { title, markAllRead, emptyTitle, emptyBody, openSettings, action: { [category]: string } }
 *   onFilterChange(value) · onItemClick(id) · onActionClick(id) · onMarkAllRead() · onOpenSettings()
 */
export default function NotificationCenterCanvas({
  items = [],
  loading = false,
  filters = [],
  activeFilter = 'all',
  labels = {},
  onFilterChange,
  onItemClick,
  onActionClick,
  onMarkAllRead,
  onOpenSettings,
}) {
  const unreadCount = items.filter((n) => n.unread).length;
  const visible =
    activeFilter === 'all' ? items : items.filter((n) => n.category === activeFilter);

  return (
    <div className="ncc-canvas" data-testid="notif-center">
      <div className="ncc-wrap">
        <div className="ncc-head">
          <div className="ncc-head-title">
            <h1 className="ncc-title">{labels.title}</h1>
            {unreadCount > 0 && (
              <span className="ncc-count" data-testid="notif-unread-count">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            type="button"
            className="ncc-markall"
            onClick={() => onMarkAllRead?.()}
            disabled={unreadCount === 0}
            data-testid="notif-markall"
          >
            {labels.markAllRead}
          </button>
        </div>

        <div className="ncc-filters" role="tablist">
          {filters.map((f) => {
            const active = f.value === activeFilter;
            const tabUnread = items.filter(
              (n) => n.unread && (f.value === 'all' || n.category === f.value),
            ).length;
            return (
              <button
                key={f.value}
                type="button"
                role="tab"
                aria-selected={active}
                className={`ncc-filter${active ? ' is-active' : ''}`}
                onClick={() => onFilterChange?.(f.value)}
                data-testid={`notif-filter-${f.value}`}
              >
                {f.label}
                {tabUnread > 0 && <span className="ncc-filter-count">{tabUnread}</span>}
              </button>
            );
          })}
        </div>

        <div className="ncc-list">
          {!loading && visible.length === 0 && (
            <div className="ncc-empty" data-testid="notif-empty">
              <div className="ncc-empty-art">
                <span className="ncc-empty-ring ncc-empty-ring-1" />
                <span className="ncc-empty-ring ncc-empty-ring-2" />
                <span className="ncc-empty-ring ncc-empty-ring-3" />
                <span className="ncc-empty-bell">
                  <BellIcon size={28} />
                </span>
              </div>
              <div className="ncc-empty-title">{labels.emptyTitle}</div>
              <div className="ncc-empty-body">{labels.emptyBody}</div>
            </div>
          )}
          {!loading &&
            visible.map((n) => {
              const CatIcon = CATEGORY_ICONS[n.category] ?? CATEGORY_ICONS.system;
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  className={`ncc-item${n.unread ? ' is-unread' : ''}`}
                  onClick={() => onItemClick?.(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onItemClick?.(n.id);
                    }
                  }}
                  data-testid="notif-item"
                  data-category={n.category}
                >
                  <span className={`ncc-cat ncc-cat-${n.category in CATEGORY_ICONS ? n.category : 'system'}`}>
                    <CatIcon size={18} />
                  </span>
                  <div className="ncc-item-main">
                    <div className="ncc-item-title">{n.title}</div>
                    <div className="ncc-item-body">{n.body}</div>
                    <time className="ncc-item-time">{n.timeLabel}</time>
                  </div>
                  <div className="ncc-item-side">
                    {n.unread && <span className="ncc-dot" aria-hidden="true" data-testid="notif-unread-dot" />}
                    {n.actionable && (
                      <button
                        type="button"
                        className="ncc-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          onActionClick?.(n.id);
                        }}
                        data-testid="notif-action"
                      >
                        {labels.action?.[n.category] ?? labels.action?.system} →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        <div className="ncc-foot">
          <button
            type="button"
            className="ncc-settings"
            onClick={() => onOpenSettings?.()}
            data-testid="notif-open-settings"
          >
            <GearIcon size={14} />
            {labels.openSettings} →
          </button>
        </div>
      </div>
    </div>
  );
}
