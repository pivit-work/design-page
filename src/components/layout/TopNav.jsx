import Icon from '../shared/Icon.jsx';

/**
 * TopNav — 상단 공통 내비게이션.
 * onHomeClick: '홈' 클릭 핸들러 (앱에서는 스니핏 페이지 이동). 안 넘기면 표시만 된다.
 */
export default function TopNav({ icons, baseUrl = '', onHomeClick }) {
  return (
    <header className="top-nav">
      <div className="nav-links">
        <span className="nav-link" onClick={onHomeClick}>홈</span>
        <span className="nav-link">내 프로필</span>
        <span className="nav-link has-dot">알림<span className="notification-dot" /></span>
      </div>
      <div className="search-bar">
        <Icon src={icons.search} size={20} color="var(--colors-foreground-fgTertiary)" baseUrl={baseUrl} />
        <div className="search-kbd"><kbd>/</kbd></div>
        <span className="search-placeholder">를 눌러 검색하세요</span>
      </div>
    </header>
  );
}
