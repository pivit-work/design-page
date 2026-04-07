import { useState, useRef, useEffect } from 'react';

/* ── 1on1 Asset URLs ── */
const ASSETS = {
  profileYun: 'https://www.figma.com/api/mcp/asset/0d6bbe1c-58f3-4d7a-a646-7bbd1bb8cd43',
  profileShin: 'https://www.figma.com/api/mcp/asset/fad1459f-c272-404c-906e-655768b682fb',
  profileKimSeo: 'https://www.figma.com/api/mcp/asset/8fc4672e-63a8-4490-980a-bc0cb1bcdefb',
  profileHan: 'https://www.figma.com/api/mcp/asset/6fef782a-5aa7-4e2d-b4c0-8cc37a9e6ae8',
  profileKimJi: 'https://www.figma.com/api/mcp/asset/cf71edf2-fb73-451e-87c7-d8cf6c89361d',
  trendUp: '/icons-solid/trend-up-01.svg',
  alertTriangle: '/icons-solid/alert-triangle.svg',
  heartCircle: '/icons-solid/heart-circle.svg',
  check: '/icons-solid/check.svg',
  plus: '/icons-solid/plus.svg',
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

const STATS = [
  { label: '전체 팀원 수', value: 5, bg: 'var(--bg-quaternary)' },
  { label: '준비 중', value: 2, bg: 'radial-gradient(133.34% 93.36% at -0.18% 108.82%, var(--utility-brand-200), var(--utility-brand-50))', color: 'var(--text-brand-tertiary)', icon: ASSETS.trendUp },
  { label: '미팅 중', value: 1, bg: 'var(--utility-blue-light-50)', color: 'var(--utility-blue-500)', dot: true },
  { label: '완료', value: 1, bg: 'var(--bg-quaternary)' },
  { label: 'HC 주의', value: 0, bg: 'var(--bg-error-primary)', color: 'var(--text-error-primary)', icon: ASSETS.alertTriangle },
  { label: '미예약', value: 1, bg: 'var(--bg-primary)', border: true },
];

const TABS = ['전체', '준비 중', '미팅 중', '완료', 'HC주의'];

const PROGRESS_COLORS = {
  green: { fill: 'var(--utility-green-100)', text: 'var(--utility-green-600)' },
  blue: { fill: 'var(--utility-blue-100)', text: 'var(--utility-blue-500)' },
  red: { fill: 'var(--utility-error-100)', text: 'var(--text-error-primary)' },
  blueLight: { fill: 'var(--utility-blue-light-100)', text: 'var(--utility-blue-light-600)' },
};

/* ── Sub-components ── */
function StatCard({ stat, Icon }) {
  return (
    <div className="stat-card" style={{ background: stat.bg, border: stat.border ? '1px solid var(--border-primary)' : 'none' }}>
      <div className="stat-label" style={{ color: stat.color || 'var(--text-subtle)' }}>
        {stat.icon && <Icon src={stat.icon} size={16} color={stat.color} />}
        {stat.dot && <span className="stat-dot" />}
        <span>{stat.label}</span>
      </div>
      <div className="stat-value" style={{ color: stat.color || 'var(--text-secondary)' }}>{stat.value}</div>
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

function Tag({ tag, Icon }) {
  const positive = tag.type === 'positive';
  return (
    <span className={`tag ${positive ? 'tag-positive' : 'tag-warning'}`}>
      {tag.icon && <Icon src={tag.icon} size={12} color={positive ? 'var(--utility-green-500)' : 'var(--text-error-primary)'} />}
      <span>{tag.text}</span>
    </span>
  );
}

function StatusBadge({ status, label, Icon }) {
  const cls = { preparing: 'badge-preparing', meeting: 'badge-meeting', done: 'badge-done', hcWarning: 'badge-hc', unbooked: 'badge-unbooked' };
  const icons = { preparing: ASSETS.trendUp, done: ASSETS.check, hcWarning: ASSETS.alertTriangle };
  const colors = { preparing: 'var(--text-brand-tertiary)', done: 'var(--text-disabled)', meeting: 'var(--utility-blue-500)', hcWarning: 'var(--text-error-primary)', unbooked: 'var(--text-disabled)' };
  return (
    <div className={`status-badge ${cls[status] || ''}`}>
      {icons[status] && <Icon src={icons[status]} size={12} color={colors[status]} />}
      {status === 'meeting' && <span className="badge-dot" />}
      <span>{label}</span>
    </div>
  );
}

function MemberCard({ member, Icon }) {
  const c = PROGRESS_COLORS;
  return (
    <div className={`member-card ${member.active ? 'member-card-active' : ''}`}>
      <StatusBadge status={member.status} label={member.statusLabel} Icon={Icon} />
      <div className="card-header">
        <img src={member.avatar} alt="" className="avatar" />
        <div className="card-name-wrap">
          <h3 className="card-name">{member.name}</h3>
          <p className="card-role">{member.role}</p>
        </div>
      </div>
      <div className="card-tags">
        {member.tags.map((tag, i) => <Tag key={i} tag={tag} Icon={Icon} />)}
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

/* ── Exported Content Component ── */
export default function OneOnOneContent({ Icon }) {
  const [activeTab, setActiveTab] = useState('전체');
  const tabsRef = useRef(null);
  const [slider, setSlider] = useState({ left: 0, width: 0 });

  useEffect(() => {
    requestAnimationFrame(() => {
      if (!tabsRef.current) return;
      const activeEl = tabsRef.current.querySelector('.tab-btn.tab-active');
      if (activeEl) {
        const rowRect = tabsRef.current.getBoundingClientRect();
        const btnRect = activeEl.getBoundingClientRect();
        setSlider({ left: btnRect.left - rowRect.left, width: btnRect.width });
      }
    });
  }, [activeTab]);

  return (
    <div className="content-area">
      <div className="content-canvas">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">원온원</h1>
            <div className="page-subtitle">
              <b>김지수 매니저</b>
              <span className="dot">&#8729;</span>
              <span className="brand-text">개발팀 5명</span>
            </div>
          </div>
          <button className="btn-add"><Icon src={ASSETS.plus} size={20} color="var(--text-white)" /><span className="btn-text">1on1 일정 추가</span></button>
        </div>
        <div className="stats-row">
          {STATS.map((s) => <StatCard key={s.label} stat={s} Icon={Icon} />)}
        </div>
        <div className="tabs-row" ref={tabsRef}>
          <div className="tab-slider" style={{ left: slider.left, width: slider.width }} />
          {TABS.map((tab) => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? 'tab-active' : ''}`} onClick={() => setActiveTab(tab)}>
              <span>{tab}</span>
            </button>
          ))}
        </div>
        <div className="cards-grid">
          {MEMBERS.map((m) => <MemberCard key={m.id} member={m} Icon={Icon} />)}
        </div>
      </div>
    </div>
  );
}
