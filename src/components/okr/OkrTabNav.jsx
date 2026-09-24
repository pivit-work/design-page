/**
 * OkrTabNav — OKR 페이지 상단 탭 헤더.
 * 탭 5개(대시보드·전사 OKR·팀 OKR·개인 OKR·내 리소스) + 연도∙분기 서브타이틀.
 * 탭 상태는 wrapper(OkrPage)가 소유한다.
 */
export default function OkrTabNav({ tabs, activeTab, onTabChange, year, quarter }) {
  return (
    <div className="content-header">
      <div className="tab-nav">
        {tabs.map((tab) => (
          <span
            key={tab.id}
            className={tab.id === activeTab ? 'tab-active' : 'tab-inactive'}
            onClick={() => tab.id !== activeTab && onTabChange(tab.id)}
          >
            {tab.label}
          </span>
        ))}
      </div>
      <div className="header-subtitle">
        <b>{year}</b>
        <span className="dot">&#8729;</span>
        <span className="okr-subtitle-quarter">{quarter}</span>
      </div>
    </div>
  );
}
