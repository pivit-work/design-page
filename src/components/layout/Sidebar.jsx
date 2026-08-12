import Icon from '../shared/Icon.jsx';
import assetUrl from '../shared/assetUrl.js';

/**
 * Sidebar — Pivit 공통 좌측 내비게이션.
 *
 * 기본(앱) 사용은 menu / onFeedbackClick / onSettingsClick 만으로 동작한다.
 * 어드민 등 "그룹형" 사이드바를 위한 선택 prop:
 *  - menu 항목에 `{ heading }` 를 넣으면 그룹 헤더로 렌더된다.
 *  - menu 항목의 `disabled` 는 비활성(클릭 불가), `tag` 는 우측 보조 라벨.
 *  - title: 로고 아래 섹션 타이틀 (예: '어드민').
 *  - bottomItem: 하단 영역(의견보내기·설정 사이)의 추가 항목 { icon, label, onClick }.
 *  - onLogoClick: 좌상단 Pivit 로고(아이콘+워드마크) 클릭 핸들러. 넘기면 로고가
 *    버튼처럼 동작(홈 이동 등)하며 키보드 접근 가능. 없으면 기존처럼 비클릭 이미지.
 * 선택 prop 을 넘기지 않으면 기존 동작·디자인과 100% 동일하다.
 */
export default function Sidebar({
  menu,
  currentPage,
  onNavigate,
  icons,
  baseUrl = '',
  onFeedbackClick,
  onSettingsClick,
  title,
  bottomItem,
  onLogoClick,
}) {
  const logoImg = <img src={assetUrl(baseUrl, 'logo.svg')} alt="Pivit" />;
  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div className="sidebar-top">
          {onLogoClick ? (
            <button
              type="button"
              className="logo-wrap logo-btn"
              onClick={onLogoClick}
              aria-label="Pivit 홈으로"
            >
              {logoImg}
            </button>
          ) : (
            <div className="logo-wrap">{logoImg}</div>
          )}
          {title && <div className="sidebar-title">{title}</div>}
          <nav className="menu-list">
            {menu.map((m, i) => {
              if (m.heading) {
                return <div key={`heading-${i}`} className="menu-heading">{m.heading}</div>;
              }
              const isActive = m.page === currentPage;
              const className = ['menu-item', isActive && 'active', m.disabled && 'disabled']
                .filter(Boolean).join(' ');
              return (
                <div
                  key={m.label}
                  className={className}
                  onClick={() => { if (!m.disabled && m.page) onNavigate(m.page); }}
                >
                  <Icon src={m.icon} size={16} color={isActive ? 'var(--colors-foreground-fgTertiaryHover)' : 'var(--colors-foreground-fgTertiary)'} baseUrl={baseUrl} />
                  <span>{m.label}</span>
                  {m.tag && <span className="menu-item-tag">{m.tag}</span>}
                </div>
              );
            })}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="menu-item" onClick={onFeedbackClick}><Icon src={icons.send} size={16} color="var(--colors-foreground-fgTertiary)" baseUrl={baseUrl} /><span>의견보내기</span></div>
          {bottomItem && (
            <div className="menu-item" onClick={bottomItem.onClick}>
              <Icon src={bottomItem.icon} size={16} color="var(--colors-foreground-fgTertiary)" baseUrl={baseUrl} />
              <span>{bottomItem.label}</span>
            </div>
          )}
          <div className="menu-item" onClick={onSettingsClick}><Icon src={icons.settings} size={16} color="var(--colors-foreground-fgTertiary)" baseUrl={baseUrl} /><span>설정</span></div>
        </div>
      </div>
    </aside>
  );
}
