import React, { useState, useRef, useEffect, useCallback } from 'react';
import Icon from '../shared/Icon.jsx';
import ProfileModal from './ProfileModal.jsx';

const PROJECT_STATUSES = {
  inProgress: { label: '진행 중', dotColor: 'var(--utility-blue-500)', textColor: 'var(--utility-blue-500)' },
  preparing: { label: '준비 중', dotColor: 'var(--text-tertiary)', textColor: 'var(--text-tertiary)', icon: '/icons-solid/clock-fast-forward.svg' },
  completed: { label: '완료', textColor: 'var(--text-brand-tertiary)', icon: '/icons-solid/check.svg' },
};

const PROJECTS = [
  {
    id: 'phase1',
    name: 'Phase1 개발',
    description: '개인 프로필 · 스니핏 · 어드민 기본',
    progress: 38,
    status: 'inProgress',
    memberCount: 15,
    color: 'var(--componentColors-utility-brand-utilityBrand400)',
    avatars: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    ],
  },
  {
    id: 'ai-pipeline',
    name: 'AI 파이프라인',
    description: 'Whisper STT · 요약 · pgvector 검색',
    progress: 74,
    status: 'inProgress',
    memberCount: 3,
    color: 'var(--componentColors-utility-warning-utilityWarning400)',
    avatars: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
    ],
  },
  {
    id: 'design-system',
    name: '디자인 시스템',
    description: '컴포넌트 라이브러리 · 스타일 가이드',
    progress: 0,
    status: 'preparing',
    memberCount: 3,
    color: 'var(--componentColors-utility-blueLight-utilityBlueLight400)',
    avatars: [
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop&crop=face',
    ],
  },
  {
    id: 'ir-prep',
    name: 'IR자료 준비',
    description: '개인 프로필 · 스니핏 · 어드민 기본',
    progress: 92,
    status: 'inProgress',
    memberCount: 4,
    color: 'var(--componentColors-utility-brand-utilityBrand400)',
    avatars: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face',
    ],
  },
  {
    id: 'hr-data',
    name: 'HR 데이터 설계',
    description: '인사 카드 스키마 · 더미 데이터 생성',
    progress: 100,
    status: 'completed',
    memberCount: 4,
    color: 'var(--componentColors-utility-purple-utilityPurple400)',
    avatars: [
      'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=100&h=100&fit=crop&crop=face',
    ],
  },
  {
    id: 'onboarding',
    name: '온보딩 자동화',
    description: '신규 입사자 온보딩 프로세스 자동화',
    progress: 55,
    status: 'inProgress',
    memberCount: 3,
    color: 'var(--componentColors-utility-blue-utilityBlue500)',
    avatars: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    ],
  },
  {
    id: 'performance',
    name: '성과 대시보드',
    description: 'OKR 트래킹 · 리포트 생성',
    progress: 20,
    status: 'inProgress',
    memberCount: 2,
    color: 'var(--componentColors-utility-pink-utilityPink400)',
    avatars: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop&crop=face',
    ],
  },
  {
    id: 'security',
    name: '보안 인증',
    description: 'ISMS-P 인증 준비 · 보안 감사',
    progress: 0,
    status: 'preparing',
    memberCount: 2,
    color: 'var(--componentColors-utility-orange-utilityOrange400)',
    avatars: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
    ],
  },
];

const MEMBERS = [
  { name: 'Olivia Rhye', email: 'olivia@pivit.work', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', status: 'working', projects: { phase1: true, 'ai-pipeline': true, 'design-system': false, 'ir-prep': false, 'hr-data': false, onboarding: false, performance: false, security: false } },
  { name: 'Phoenix Baker', email: 'phoenix@pivit.work', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', status: 'working', projects: { phase1: true, 'ai-pipeline': false, 'design-system': true, 'ir-prep': false, 'hr-data': false, onboarding: true, performance: false, security: false } },
  { name: 'Lana Steiner', email: 'lana@pivit.work', initials: 'LS', status: 'working', projects: { phase1: true, 'ai-pipeline': true, 'design-system': false, 'ir-prep': false, 'hr-data': false, onboarding: false, performance: true, security: false } },
  { name: 'Demi Wilkinson', email: 'demi@pivit.work', initials: 'DW', status: 'working', projects: { phase1: true, 'ai-pipeline': false, 'design-system': false, 'ir-prep': true, 'hr-data': false, onboarding: false, performance: false, security: true } },
  { name: 'Candice Wu', email: 'candice@pivit.work', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face', status: 'working', projects: { phase1: false, 'ai-pipeline': true, 'design-system': false, 'ir-prep': false, 'hr-data': false, onboarding: true, performance: false, security: false } },
  { name: 'Natali Craig', email: 'natali@pivit.work', initials: 'NC', status: 'working', projects: { phase1: false, 'ai-pipeline': false, 'design-system': true, 'ir-prep': false, 'hr-data': false, onboarding: false, performance: false, security: true } },
  { name: 'Drew Cano', email: 'drew@pivit.work', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face', status: 'working', projects: { phase1: false, 'ai-pipeline': false, 'design-system': true, 'ir-prep': false, 'hr-data': false, onboarding: false, performance: true, security: false } },
  { name: 'Orlando Diggs', email: 'orlando@pivit.work', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', status: 'working', projects: { phase1: false, 'ai-pipeline': false, 'design-system': false, 'ir-prep': true, 'hr-data': false, onboarding: false, performance: false, security: false } },
  { name: 'Andi Lane', email: 'andi@pivit.work', avatar: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop&crop=face', status: 'working', projects: { phase1: false, 'ai-pipeline': false, 'design-system': false, 'ir-prep': false, 'hr-data': true, onboarding: true, performance: false, security: false } },
  { name: 'Kate Morrison', email: 'kate@pivit.work', avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop&crop=face', status: 'working', projects: { phase1: false, 'ai-pipeline': false, 'design-system': false, 'ir-prep': false, 'hr-data': true, onboarding: false, performance: false, security: true } },
];

/* ── Random member generator ── */
const RANDOM_NAMES = [
  { name: '김하늘', email: 'haneul.kim' }, { name: '이준서', email: 'junseo.lee' },
  { name: '박소연', email: 'soyeon.park' }, { name: '정우진', email: 'woojin.jung' },
  { name: '최예린', email: 'yerin.choi' }, { name: '한서윤', email: 'seoyun.han' },
  { name: '윤지호', email: 'jiho.yun' }, { name: '임하은', email: 'haeun.lim' },
  { name: '강민수', email: 'minsu.kang' }, { name: '조아름', email: 'areum.cho' },
  { name: '신재원', email: 'jaewon.shin' }, { name: '오수빈', email: 'subin.oh' },
  { name: '서다은', email: 'daeun.seo' }, { name: '문태현', email: 'taehyun.moon' },
  { name: '배은지', email: 'eunji.bae' }, { name: '류현우', email: 'hyunwoo.ryu' },
  { name: '홍채은', email: 'chaeeun.hong' }, { name: '양시우', email: 'siu.yang' },
  { name: '권나연', email: 'nayeon.kwon' }, { name: '전도윤', email: 'doyun.jeon' },
];

const RANDOM_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1599566150163-29194dcabd9c?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face',
];

let _randomIdx = 0;
function generateRandomMembers(count, projectIds) {
  const result = [];
  for (let i = 0; i < count; i++) {
    const person = RANDOM_NAMES[_randomIdx % RANDOM_NAMES.length];
    const avatar = RANDOM_AVATARS[_randomIdx % RANDOM_AVATARS.length];
    const projects = {};
    projectIds.forEach(id => { projects[id] = Math.random() < 0.3; });
    result.push({
      name: person.name,
      email: `${person.email}@pivit.work`,
      avatar,
      status: 'working',
      projects,
    });
    _randomIdx++;
  }
  return result;
}

const FILTER_TABS = [
  { key: 'all', label: '전체' },
  { key: 'preparing', label: '준비 중' },
  { key: 'inProgress', label: '진행중' },
  { key: 'completed', label: '완료' },
];

function ProjectCard({ project }) {
  const status = PROJECT_STATUSES[project.status];
  const barColor = project.status === 'completed' ? 'var(--utility-green-100)' : 'var(--utility-blue-100)';
  const progressValueColor = project.status === 'completed' ? 'var(--utility-green-600)' : null;

  return (
    <div className="pj-card">
      <div className="pj-card-status" style={{ color: status.textColor }}>
        {status.icon ? (
          <Icon src={status.icon} size={12} color="currentColor" />
        ) : (
          <span className="pj-status-dot" style={{ background: status.dotColor }} />
        )}
        <span>{status.label}</span>
      </div>
      <div className="pj-card-info">
        <p className="pj-card-name">{project.name}</p>
        <p className="pj-card-desc">{project.description}</p>
      </div>
      <div className="pj-card-progress">
        <div className="pj-progress-label">
          <span className="pj-progress-text">진행률</span>
          <span className="pj-progress-value" style={progressValueColor ? { color: progressValueColor } : undefined}>{project.progress}%</span>
        </div>
        <div className="pj-progress-bar">
          <div className="pj-progress-fill" style={{ width: `${project.progress}%`, background: barColor }} />
        </div>
      </div>
      <div className="pj-card-members">
        <div className="pj-avatar-group">
          {project.avatars.slice(0, 7).map((url, i) => (
            <img key={i} src={url} alt="" className="pj-avatar-sm" />
          ))}
          {project.memberCount > 7 && (
            <span className="pj-avatar-sm pj-avatar-more">+{project.memberCount - 7}</span>
          )}
        </div>
        <span className="pj-member-count">{project.memberCount}명</span>
      </div>
    </div>
  );
}

function MemberTable({ projects, stickyTop = 0, onMemberClick }) {
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const titleRef = useRef(null);
  const [titleHeight, setTitleHeight] = useState(0);
  const syncingRef = useRef(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrolledEnd, setScrolledEnd] = useState(false);
  const [members, setMembers] = useState(MEMBERS);
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });

  const updateShadows = (el) => {
    if (!el) return;
    setScrolled(el.scrollLeft > 0);
    setScrolledEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };

  const onHeaderScroll = () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    const sl = headerScrollRef.current.scrollLeft;
    if (bodyScrollRef.current) bodyScrollRef.current.scrollLeft = sl;
    updateShadows(headerScrollRef.current);
    syncingRef.current = false;
  };

  const onBodyScroll = () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    const sl = bodyScrollRef.current.scrollLeft;
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = sl;
    updateShadows(bodyScrollRef.current);
    syncingRef.current = false;
  };

  useEffect(() => {
    updateShadows(headerScrollRef.current);
    if (titleRef.current) setTitleHeight(titleRef.current.offsetHeight);
  }, [projects]);

  const handleLoadMore = () => {
    const projectIds = projects.map(p => p.id);
    const newMembers = generateRandomMembers(20, projectIds);
    setMembers(prev => [...prev, ...newMembers]);
  };

  const onMouseDown = (e) => {
    const el = bodyScrollRef.current;
    dragState.current = { isDragging: true, startX: e.clientX, scrollLeft: el.scrollLeft };
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  };
  const onMouseMove = (e) => {
    if (!dragState.current.isDragging) return;
    const dx = e.clientX - dragState.current.startX;
    bodyScrollRef.current.scrollLeft = dragState.current.scrollLeft - dx;
  };
  const onMouseUp = () => {
    dragState.current.isDragging = false;
    if (bodyScrollRef.current) {
      bodyScrollRef.current.style.cursor = '';
      bodyScrollRef.current.style.userSelect = '';
    }
  };

  const memberTotals = members.map(member =>
    projects.reduce((sum, p) => sum + (member.projects[p.id] ? 1 : 0), 0)
  );

  return (
    <div className="pj-table-section">
      <div className="pj-table-header-text" ref={titleRef} style={{ top: stickyTop }}>
        <p className="pj-table-title">프로젝트에 배치된 멤버 리스트</p>
        <p className="pj-table-subtitle">이름을 클릭하면 상세 정보를 보실 수 있어요.</p>
      </div>
        {/* Sticky table header row */}
        <div className="pj-table-sticky-header" style={{ top: stickyTop + titleHeight }}>
          <div className={`pj-sticky-name-hdr ${scrolled ? 'pj-name-shadow' : ''}`}>이름</div>
          <div className="pj-sticky-projects-hdr" ref={headerScrollRef} onScroll={onHeaderScroll}>
            {projects.map(p => (
              <div key={p.id} className="pj-sticky-th">
                <span className="pj-th-dot" style={{ background: p.color }} />
                <span className="pj-th-label">{p.name}</span>
              </div>
            ))}
          </div>
          <div className={`pj-sticky-sum-hdr ${scrolledEnd ? 'pj-sum-no-shadow' : ''}`}>총</div>
        </div>

        {/* Table body */}
        <div className="pj-table-outer">
          <div className={`pj-name-column ${scrolled ? 'pj-name-shadow' : ''}`}>
            {members.map((member, i) => (
              <div key={i} className="pj-name-cell" onClick={() => onMemberClick && onMemberClick(member)} style={{ cursor: 'pointer' }}>
                <div className="pj-member-info">
                  {member.avatar ? (
                    <img src={member.avatar} alt="" className="pj-member-avatar" />
                  ) : (
                    <span className="pj-member-avatar pj-member-initials">{member.initials}</span>
                  )}
                  <div className="pj-member-text">
                    <span className="pj-member-name">{member.name}</span>
                    <span className="pj-member-email">{member.email}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div
            className="pj-table-wrap"
            ref={bodyScrollRef}
            onScroll={onBodyScroll}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <table className="pj-table">
              <tbody>
                {members.map((member, i) => (
                  <tr key={i}>
                    {projects.map(p => (
                      <td key={p.id} className="pj-td pj-td-project">
                        <span
                          className={`pj-cell-dot ${member.projects[p.id] ? '' : 'pj-cell-dot-empty'}`}
                          style={member.projects[p.id] ? { background: p.color } : undefined}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`pj-sum-column ${scrolledEnd ? 'pj-sum-no-shadow' : ''}`}>
            {memberTotals.map((total, i) => (
              <div key={i} className="pj-sum-cell">{total}</div>
            ))}
          </div>
        </div>
      <div className="pj-table-footer">
        <button className="pj-btn-more" onClick={handleLoadMore}>더 보기</button>
      </div>
    </div>
  );
}

export default function ProjectCanvas({ onSubTabChange, statIcons, baseUrl = '' }) {
  const [activeTab, setActiveTab] = useState('all');
  const tabsRef = useRef(null);
  const pageHeaderRef = useRef(null);
  const [slider, setSlider] = useState({ left: 0, width: 0 });
  const [headerHeight, setHeaderHeight] = useState(0);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    if (pageHeaderRef.current) {
      setHeaderHeight(pageHeaderRef.current.offsetHeight);
    }
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (!tabsRef.current) return;
      const activeEl = tabsRef.current.querySelector('.tab-btn.tab-active');
      if (!activeEl) return;
      const rowRect = tabsRef.current.getBoundingClientRect();
      const btnRect = activeEl.getBoundingClientRect();
      setSlider({ left: btnRect.left - rowRect.left, width: btnRect.width });
    });
  }, [activeTab]);

  const filteredProjects = activeTab === 'all'
    ? PROJECTS
    : PROJECTS.filter(p => p.status === activeTab);

  return (<>
    <div className="content-area pj-content-area">
      <div className="content-canvas">
        <div className="pj-header" ref={pageHeaderRef}>
          <div className="tab-nav">
            <span className="tab-inactive" onClick={() => onSubTabChange && onSubTabChange('orgchart')}>조직도</span>
            <span className="tab-active">프로젝트</span>
          </div>
          <div className="header-subtitle">
            <b>프로젝트</b>
            <span className="dot">&#8729;</span>
            <span className="brand-count">{PROJECTS.length}개</span>
          </div>
        </div>

        <div className="pj-body">
          <div className="tabs-row" ref={tabsRef}>
            <div className="tab-slider" style={{ left: slider.left, width: slider.width }} />
            {FILTER_TABS.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button
                  type="button"
                  key={tab.key}
                  className={`tab-btn${active ? ' tab-active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="pj-cards-grid">
            {filteredProjects.map(p => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>

          <MemberTable projects={PROJECTS} stickyTop={headerHeight} onMemberClick={setSelectedMember} />
        </div>
      </div>
    </div>
    <ProfileModal member={selectedMember} onClose={() => setSelectedMember(null)} statIcons={statIcons} baseUrl={baseUrl} />
  </>);
}
