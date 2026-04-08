import Icon from '../shared/Icon.jsx';

export default function Sidebar({ menu, currentPage, onNavigate, icons, baseUrl = '' }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div className="sidebar-top">
          <div className="logo-wrap"><img src={`${baseUrl}logo.svg`} alt="Pivit" /></div>
          <nav className="menu-list">
            {menu.map(m => {
              const isActive = m.page === currentPage;
              return (
                <div
                  key={m.label}
                  className={`menu-item ${isActive ? 'active' : ''}`}
                  onClick={() => m.page && onNavigate(m.page)}
                >
                  <Icon src={m.icon} size={16} color={isActive ? 'var(--text-primary)' : 'var(--text-secondary)'} baseUrl={baseUrl} />
                  <span>{m.label}</span>
                </div>
              );
            })}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="menu-item"><Icon src={icons.send} size={16} color="var(--text-secondary)" baseUrl={baseUrl} /><span>의견보내기</span></div>
          <div className="menu-item"><Icon src={icons.settings} size={16} color="var(--text-secondary)" baseUrl={baseUrl} /><span>설정</span></div>
        </div>
      </div>
    </aside>
  );
}
