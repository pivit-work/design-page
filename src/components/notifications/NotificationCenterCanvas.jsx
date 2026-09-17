import Icon from '../shared/Icon.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';

// 분류 아이콘 — design-page 아이콘 모음(public/icons-solid). 색은 감싸는 요소의 color 로 준다.
const CATEGORY_ICONS = {
  eval: '/icons-solid/bar-chart-01.svg',
  feedback: '/icons-solid/message-chat-square.svg',
  oneonone: '/icons-solid/calendar.svg',
  okr: '/icons-solid/target-04.svg',
  snippet: '/icons-solid/clipboard.svg',
  system: '/icons-solid/settings-01.svg',
};

/**
 * NotificationCenterCanvas — 인앱 알림 센터 (`/notifications`).
 *
 * 무엇을 보여 주나는 pivit-specs `K. 내-설정/settings-app.jsx` 의 `NotificationCenterViewScreen`
 * (분류 탭 · 탭마다 안 읽은 수 · 분류 아이콘 · 바로가기 · 빈 상태 · 알림 설정 버튼),
 * 생김새는 스니핏 히스토리(`SnippetCanvas`)와 같은 화면 문법을 따른다 (PW-765 2차):
 *   머리 카드(.tl-page + 30px 제목) · 공용 탭 `SegmentedControl` · 목록 줄(.snippet-row 와 같은 치수) ·
 *   아이콘은 `Icon` + icons-solid.
 *
 * 데이터·문구는 전부 호출부가 준다(i18n 은 소비처 몫). prefix: ncc-
 *
 * Props:
 *   baseUrl      정적 에셋 base path (아이콘). 생략하면 사이트 루트
 *   items        [{ id, category, title, body, timeLabel, unread, actionable }]
 *                category ∈ eval | feedback | oneonone | okr | snippet | system
 *                actionable=false 면 바로가기 버튼을 그리지 않는다(연결된 화면 없음)
 *   loading      true 면 목록·빈 상태를 그리지 않는다
 *   filters      [{ value, label }] — 'all' 은 전체
 *   activeFilter 현재 탭 value
 *   labels       { title, markAllRead, filterAria, emptyTitle, emptyBody, openSettings, action: { [category]: string } }
 *   onFilterChange(value) · onItemClick(id) · onActionClick(id) · onMarkAllRead() · onOpenSettings()
 */
export default function NotificationCenterCanvas({
  baseUrl,
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

  const tabItems = filters.map((f) => {
    const tabUnread = items.filter(
      (n) => n.unread && (f.value === 'all' || n.category === f.value),
    ).length;
    return {
      value: f.value,
      label: (
        <span className="ncc-tab" data-testid={`notif-filter-${f.value}`}>
          {f.label}
          {tabUnread > 0 && <span className="ncc-tab-count">{tabUnread}</span>}
        </span>
      ),
    };
  });

  return (
    <main className="tl-page ncc-page" data-testid="notif-center">
      {/* 머리 카드 — 제목 + 안 읽은 수, 오른쪽 「모두 읽음」 */}
      <div className="ncc-header">
        <div className="ncc-title-row">
          <h1 className="ncc-title">{labels.title}</h1>
          {unreadCount > 0 && (
            <span className="ncc-count" data-testid="notif-unread-count">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          type="button"
          className="ncc-btn"
          onClick={() => onMarkAllRead?.()}
          disabled={unreadCount === 0}
          data-testid="notif-markall"
        >
          {labels.markAllRead}
        </button>
      </div>

      <div className="ncc-body">
        {filters.length > 0 && (
          <div className="ncc-filter-row">
            <SegmentedControl
              items={tabItems}
              value={activeFilter}
              onChange={(v) => onFilterChange?.(v)}
              ariaLabel={labels.filterAria}
            />
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="ncc-empty" data-testid="notif-empty">
            <div className="ncc-empty-inner">
              <span className="ncc-empty-bell">
                <Icon src="/icons-solid/bell-01.svg" size={32} baseUrl={baseUrl} />
              </span>
              <p className="ncc-empty-title">{labels.emptyTitle}</p>
              <p className="ncc-empty-desc">{labels.emptyBody}</p>
            </div>
          </div>
        )}

        {!loading && visible.length > 0 && (
          <div className="ncc-list">
            {visible.map((n) => {
              const category = n.category in CATEGORY_ICONS ? n.category : 'system';
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  className={`ncc-row${n.unread ? ' is-unread' : ''}`}
                  onClick={() => onItemClick?.(n.id)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onItemClick?.(n.id);
                    }
                  }}
                  data-testid="notif-item"
                  data-category={category}
                >
                  <span className={`ncc-cat ncc-cat-${category}`} data-testid="notif-cat">
                    <Icon src={CATEGORY_ICONS[category]} size={20} baseUrl={baseUrl} />
                  </span>
                  <div className="ncc-row-main">
                    <p className="ncc-row-title">{n.title}</p>
                    <p className="ncc-row-body">{n.body}</p>
                  </div>
                  <div className="ncc-row-side">
                    <span className="ncc-row-time">
                      {n.unread && (
                        <span
                          className="ncc-dot"
                          aria-hidden="true"
                          data-testid="notif-unread-dot"
                        />
                      )}
                      <time>{n.timeLabel}</time>
                    </span>
                    {n.actionable && (
                      <button
                        type="button"
                        className="ncc-btn ncc-btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onActionClick?.(n.id);
                        }}
                        data-testid="notif-action"
                      >
                        {labels.action?.[category] ?? labels.action?.system}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="ncc-foot">
          <button
            type="button"
            className="ncc-btn"
            onClick={() => onOpenSettings?.()}
            data-testid="notif-open-settings"
          >
            <Icon src="/icons-solid/settings-01.svg" size={20} baseUrl={baseUrl} />
            <span>{labels.openSettings}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
