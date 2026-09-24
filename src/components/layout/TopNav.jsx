import Icon from '../shared/Icon.jsx';

/**
 * TopNav — 상단 공통 내비게이션.
 *
 * 선택 prop (넘기지 않으면 종전 동작·디자인과 같다):
 *  - onHomeClick / onProfileClick / onNotificationsClick: 각 링크 클릭 핸들러.
 *  - showHome: false 면 「홈」 링크를 그리지 않는다 (기본 true).
 *  - hasUnread: 알림 옆 점을 그릴지 (기본 true — 종전엔 늘 그렸다).
 *  - onSearchClick: 검색 칸을 눌렀을 때. 넘기면 검색 칸이 버튼처럼 동작한다
 *    (Enter·Space 로도 열린다).
 *  - labels: { home, profile, notifications, searchPlaceholder } — 호스트가 번역을
 *    넘길 자리. 없는 키는 한국어 기본값.
 *  - 나머지 속성(data-* 등)은 `<header>` 에 그대로 붙는다.
 */
const DEFAULT_LABELS = {
  home: '홈',
  profile: '내 프로필',
  notifications: '알림',
  searchPlaceholder: '를 눌러 검색하세요',
};

export default function TopNav({
  icons,
  baseUrl = '',
  onHomeClick,
  onProfileClick,
  onNotificationsClick,
  onSearchClick,
  showHome = true,
  hasUnread = true,
  labels,
  ...rest
}) {
  const L = { ...DEFAULT_LABELS, ...labels };
  const searchProps = onSearchClick
    ? {
        role: 'button',
        tabIndex: 0,
        onClick: onSearchClick,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') onSearchClick();
        },
      }
    : {};
  return (
    <header className="top-nav" {...rest}>
      <div className="nav-links">
        {showHome && <span className="nav-link" onClick={onHomeClick}>{L.home}</span>}
        <span className="nav-link" onClick={onProfileClick}>{L.profile}</span>
        <span className="nav-link" onClick={onNotificationsClick}>
          {L.notifications}
          {hasUnread && <span className="notification-dot" data-testid="notification-dot" />}
        </span>
      </div>
      <div className="search-bar" {...searchProps}>
        <Icon src={icons.search} size={20} color="var(--colors-foreground-fgTertiary)" baseUrl={baseUrl} />
        <div className="search-kbd"><kbd>/</kbd></div>
        <span className="search-placeholder">{L.searchPlaceholder}</span>
      </div>
    </header>
  );
}
