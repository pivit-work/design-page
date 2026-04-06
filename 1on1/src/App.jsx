import { useState, useEffect } from 'react';
import './App.css';

/* ── Inline SVG Icon Component ── */
const svgCache = {};
function Icon({ src, size = 16, color = 'currentColor', className = '' }) {
  const [svg, setSvg] = useState(svgCache[src] || '');
  useEffect(() => {
    if (svgCache[src]) { setSvg(svgCache[src]); return; }
    fetch(src).then(r => r.text()).then(text => {
      svgCache[src] = text;
      setSvg(text);
    });
  }, [src]);

  const colored = svg
    .replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`)
    .replace(/stroke="(?!none)[^"]*"/g, `stroke="${color}"`)
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`);

  return <span className={`icon ${className}`} style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: colored }} />;
}

/* ── Asset URLs ── */
const ASSETS = {
  // 프로필 사진 (피그마 에셋 유지)
  profileYun: 'https://www.figma.com/api/mcp/asset/0d6bbe1c-58f3-4d7a-a646-7bbd1bb8cd43',
  profileShin: 'https://www.figma.com/api/mcp/asset/fad1459f-c272-404c-906e-655768b682fb',
  profileKimSeo: 'https://www.figma.com/api/mcp/asset/8fc4672e-63a8-4490-980a-bc0cb1bcdefb',
  profileHan: 'https://www.figma.com/api/mcp/asset/6fef782a-5aa7-4e2d-b4c0-8cc37a9e6ae8',
  profileKimJi: 'https://www.figma.com/api/mcp/asset/cf71edf2-fb73-451e-87c7-d8cf6c89361d',
  // 아이콘 (디자인 시스템 docs SVG)
  trendUp: '/icons-solid/trend-up-01.svg',
  alertTriangle: '/icons-solid/alert-triangle.svg',
  search: '/icons/search-sm.svg',
  heartCircle: '/icons-solid/heart-circle.svg',
  check: '/icons-solid/check.svg',
  plus: '/icons-solid/plus.svg',
  calendar: '/icons-solid/calendar-heart-01.svg',
  target: '/icons-solid/target-04.svg',
  user: '/icons-solid/user-03.svg',
  file: '/icons-solid/file-02.svg',
  edit: '/icons-solid/edit-02.svg',
  userEdit: '/icons-solid/user-edit.svg',
  aiChat: '/icons/message-chat-circle.svg',
  lock: '/icons-solid/lock-keyhole-square.svg',
  send: '/icons-solid/send-01.svg',
  settings: '/icons-solid/settings-02.svg',
};

/* ── Data ── */
const MEMBERS = [
  {
    id: 1, name: '윤수민', role: 'Frontend Developer', avatar: ASSETS.profileYun,
    status: 'preparing', statusLabel: '준비 중',
    tags: [{ type: 'positive', icon: ASSETS.heartCircle, text: '이 분은 너무 잘하고 있어요.' }],
    okr: 50, okrColor: 'blue',
    healthCheck: { score: 5.1, label: '주의', color: 'red' },
    memberReady: 66, managerReady: 70, readyColor: 'blue',
    actionItems: { done: 2, total: 3, percent: 66, color: 'blue' },
    prevDate: '2026.03.28', nextDate: '2026.04.31',
  },
  {
    id: 2, name: '신하람', role: 'Frontend Developer', avatar: ASSETS.profileShin,
    status: 'done', statusLabel: '완료',
    tags: [{ type: 'positive', icon: ASSETS.heartCircle, text: '이 분은 너무 잘하고 있어요.' }],
    okr: 72, okrColor: 'green',
    healthCheck: { score: 7.9, label: '좋음', color: 'green' },
    memberReady: null, managerReady: null, readyColor: null,
    actionItems: { done: 4, total: 4, percent: 100, color: 'green' },
    prevDate: '2026.03.28', nextDate: '2026.04.31',
  },
  {
    id: 3, name: '김서윤', role: 'Frontend Developer', avatar: ASSETS.profileKimSeo,
    status: 'meeting', statusLabel: '미팅 중', active: true,
    tags: [
      { type: 'warning', icon: ASSETS.alertTriangle, text: '번아웃 주의' },
      { type: 'warning', text: 'OKR 위험' },
      { type: 'warning', text: '1 on 1 미예약' },
    ],
    okr: 50, okrColor: 'red',
    healthCheck: { score: 5.1, label: '주의', color: 'red' },
    memberReady: 25, managerReady: 30, readyColor: 'red',
    actionItems: { done: 1, total: 3, percent: 33, color: 'red' },
    prevDate: '2026.03.28', nextDate: '2026.04.31',
  },
  {
    id: 4, name: '한지후', role: 'Frontend Developer', avatar: ASSETS.profileHan,
    status: 'preparing', statusLabel: '준비 중',
    tags: [{ type: 'warning', text: 'OKR 위험' }],
    okr: 90, okrColor: 'green',
    healthCheck: { score: 9.1, label: '좋음', color: 'green' },
    memberReady: 25, managerReady: 0, readyColor: 'red',
    actionItems: { done: 2, total: 3, percent: 66, color: 'blueLight' },
    prevDate: '2026.03.28', nextDate: '2026.04.31',
  },
  {
    id: 5, name: '김지석', role: 'Frontend Developer', avatar: ASSETS.profileKimJi,
    status: 'unbooked', statusLabel: '미예약',
    tags: [{ type: 'warning', text: '1 on 1 미예약' }],
    okr: 61, okrColor: 'blueLight',
    healthCheck: { score: 6.8, label: '주의', color: 'blueLight' },
    memberReady: null, managerReady: null, readyColor: null,
    actionItems: null,
    prevDate: '2026.03.28', nextDate: '미예약',
  },
];

const MENU_ITEMS = [
  { icon: ASSETS.calendar, label: '타임라인' },
  { icon: ASSETS.target, label: 'OKR' },
  { icon: ASSETS.user, label: '원온원', active: true },
  { icon: ASSETS.file, label: '회의록' },
  { icon: ASSETS.edit, label: '평가' },
  { icon: ASSETS.userEdit, label: '매니저' },
  { icon: ASSETS.aiChat, label: 'AI Chat' },
  { icon: ASSETS.lock, label: '어드민' },
];

const STATS = [
  { label: '전체 팀원 수', value: 5, bg: 'white' },
  { label: '준비 중', value: 2, bg: '#f1fffa', color: '#21a67a', icon: ASSETS.trendUp },
  { label: '미팅 중', value: 1, bg: '#f0f9ff', color: '#2e90fa', dot: true },
  { label: '완료', value: 1, bg: 'white' },
  { label: 'HC 주의', value: 0, bg: '#fef3f2', color: '#d92d20', icon: ASSETS.alertTriangle },
  { label: '미예약', value: 1, bg: 'white', border: true },
];

const TABS = ['전체', '준비 중', '미팅 중', '완료', 'HC주의'];

const PROGRESS_COLORS = {
  green: { fill: '#d3f8df', text: '#099250' },
  blue: { fill: '#d1e9ff', text: '#2e90fa' },
  red: { fill: '#fee4e2', text: '#d92d20' },
  blueLight: { fill: '#e0f2fe', text: '#0086c9' },
};

/* ── Components ── */
function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div className="sidebar-top">
          <div className="logo-wrap">
            <img src="/logo.svg" alt="Pivit" />
          </div>
          <nav className="menu-list">
            {MENU_ITEMS.map((item) => (
              <div key={item.label} className={`menu-item ${item.active ? 'active' : ''}`}>
                <Icon src={item.icon} size={16} color={item.active ? '#596069' : '#8b929c'} />
                <span>{item.label}</span>
              </div>
            ))}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="menu-item">
            <Icon src={ASSETS.send} size={16} color="#8b929c" />
            <span>의견보내기</span>
          </div>
          <div className="menu-item">
            <Icon src={ASSETS.settings} size={16} color="#8b929c" />
            <span>설정</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function TopNav() {
  return (
    <header className="top-nav">
      <div className="nav-links">
        <span className="nav-link">홈</span>
        <span className="nav-link">내 프로필</span>
        <span className="nav-link has-dot">알림<span className="notification-dot" /></span>
      </div>
      <div className="search-bar">
        <Icon src={ASSETS.search} size={20} color="#8b929c" />
        <div className="search-kbd"><kbd>/</kbd></div>
        <span className="search-placeholder">를 눌러 검색하세요</span>
      </div>
    </header>
  );
}

function StatCard({ stat }) {
  return (
    <div className="stat-card" style={{ background: stat.bg, border: stat.border ? '1px solid var(--border-primary)' : 'none' }}>
      <div className="stat-label" style={{ color: stat.color || '#858b95' }}>
        {stat.icon && <Icon src={stat.icon} size={16} color={stat.color} />}
        {stat.dot && <span className="stat-dot" />}
        <span>{stat.label}</span>
      </div>
      <div className="stat-value" style={{ color: stat.color || '#8b929c' }}>{stat.value}</div>
    </div>
  );
}

function ProgressBar({ percent, color }) {
  const c = PROGRESS_COLORS[color] || PROGRESS_COLORS.blue;
  return (
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${percent}%`, background: c.fill }} />
    </div>
  );
}

function Tag({ tag }) {
  const positive = tag.type === 'positive';
  return (
    <span className={`tag ${positive ? 'tag-positive' : 'tag-warning'}`}>
      {tag.icon && <Icon src={tag.icon} size={12} color={positive ? '#16b364' : '#d92d20'} />}
      <span>{tag.text}</span>
    </span>
  );
}

function StatusBadge({ status, label }) {
  const cls = { preparing: 'badge-preparing', meeting: 'badge-meeting', done: 'badge-done', hcWarning: 'badge-hc', unbooked: 'badge-unbooked' };
  const icons = { preparing: ASSETS.trendUp, done: ASSETS.check, hcWarning: ASSETS.alertTriangle };
  const colors = { preparing: '#21a67a', done: '#9398a1', meeting: '#2e90fa', hcWarning: '#d92d20', unbooked: '#9398a1' };
  return (
    <div className={`status-badge ${cls[status] || ''}`}>
      {icons[status] && <Icon src={icons[status]} size={12} color={colors[status]} />}
      {status === 'meeting' && <span className="badge-dot" />}
      <span>{label}</span>
    </div>
  );
}

function MemberCard({ member }) {
  const c = PROGRESS_COLORS;
  return (
    <div className={`member-card ${member.active ? 'member-card-active' : ''}`}>
      <StatusBadge status={member.status} label={member.statusLabel} />
      <div className="card-header">
        <img src={member.avatar} alt="" className="avatar" />
        <div className="card-name-wrap">
          <h3 className="card-name">{member.name}</h3>
          <p className="card-role">{member.role}</p>
        </div>
      </div>
      <div className="card-tags">
        {member.tags.map((tag, i) => <Tag key={i} tag={tag} />)}
      </div>
      <div className="card-sections">
        <div className="card-section">
          <div className="section-row"><span className="section-label">OKR 달성률</span><span className="section-value" style={{ color: c[member.okrColor]?.text }}>{member.okr}%</span></div>
          <ProgressBar percent={member.okr} color={member.okrColor} />
        </div>
        <div className="card-section">
          <div className="section-row"><span className="section-label">Health Check</span><span className="section-value-label" style={{ color: c[member.healthCheck.color]?.text }}>{member.healthCheck.label} {member.healthCheck.score}</span></div>
          <ProgressBar percent={member.healthCheck.score * 10} color={member.healthCheck.color} />
        </div>
        {member.memberReady !== null && (
          <div className="card-section readiness-section">
            <div className="readiness-col">
              <div className="section-row"><span className="section-label">멤버 준비도</span><span className="section-value" style={{ color: c[member.readyColor]?.text }}>{member.memberReady}%</span></div>
              <ProgressBar percent={member.memberReady} color={member.readyColor} />
            </div>
            <div className="readiness-col">
              <div className="section-row"><span className="section-label">매니저 준비도</span><span className="section-value" style={{ color: c[member.readyColor]?.text }}>{member.managerReady}%</span></div>
              <ProgressBar percent={member.managerReady} color={member.readyColor} />
            </div>
          </div>
        )}
        {member.actionItems && (
          <div className="card-section">
            <div className="section-row"><span className="section-label">이전 액션 아이템</span><span className="section-value" style={{ color: c[member.actionItems.color]?.text }}>{member.actionItems.done}/{member.actionItems.total} · {member.actionItems.percent}%</span></div>
            <ProgressBar percent={member.actionItems.percent} color={member.actionItems.color} />
          </div>
        )}
      </div>
      <div className="card-dates">
        <div className="date-item"><span className="date-label">이전</span><span className="date-value prev">{member.prevDate}</span></div>
        <div className="date-item"><span className="date-label">다음</span><span className="date-value next">{member.nextDate}</span></div>
      </div>
    </div>
  );
}

/* ── Main App ── */
export default function App() {
  const [activeTab, setActiveTab] = useState('전체');

  return (
    <div className="app">
      <Sidebar />
      <TopNav />
      <div className="content-area">
        <div className="content-canvas">
          <div className="page-header">
            <div className="page-header-left">
              <h1 className="page-title">원온원</h1>
              <div className="page-subtitle">
                <b>김지수 매니저</b>
                <span className="dot">∙</span>
                <span className="brand-text">개발팀 5명</span>
              </div>
            </div>
            <button className="btn-add"><Icon src={ASSETS.plus} size={20} color="white" /><span className="btn-text">1on1 일정 추가</span></button>
          </div>
          <div className="stats-row">
            {STATS.map((s) => <StatCard key={s.label} stat={s} />)}
          </div>
          <div className="tabs-row">
            {TABS.map((tab) => (
              <button key={tab} className={`tab-btn ${activeTab === tab ? 'tab-active' : ''}`} onClick={() => setActiveTab(tab)}>
                <span>{tab}</span>
                {tab === '전체' && activeTab === '전체' && <span className="tab-badge">5</span>}
              </button>
            ))}
          </div>
          <div className="cards-grid">
            {MEMBERS.map((m) => <MemberCard key={m.id} member={m} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
