import Icon from '../shared/Icon';

export default function TopNav({ icons, baseUrl = '' }) {
  return (
    <header className="top-nav">
      <div className="nav-links">
        <span className="nav-link">홈</span>
        <span className="nav-link">내 프로필</span>
        <span className="nav-link has-dot">알림<span className="notification-dot" /></span>
      </div>
      <div className="search-bar">
        <Icon src={icons.search} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
        <div className="search-kbd"><kbd>/</kbd></div>
        <span className="search-placeholder">를 눌러 검색하세요</span>
      </div>
    </header>
  );
}
