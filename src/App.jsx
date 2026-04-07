import React, { useState, useRef, useCallback, useEffect } from 'react';
import Spline from '@splinetool/react-spline';
import OneOnOneContent from './OneOnOnePage';
import './App.css';

/* ── Inline SVG Icon ── */
const svgCache = {};
function Icon({ src, size = 16, color = 'currentColor', className = '' }) {
  const [svg, setSvg] = useState(svgCache[src] || '');
  useEffect(() => {
    if (svgCache[src]) { setSvg(svgCache[src]); return; }
    fetch(src).then(r => r.text()).then(t => { svgCache[src] = t; setSvg(t); });
  }, [src]);
  const colored = svg
    .replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`)
    .replace(/stroke="(?!none)[^"]*"/g, `stroke="${color}"`)
    .replace(/width="[^"]*"/, `width="${size}"`)
    .replace(/height="[^"]*"/, `height="${size}"`);
  return <span className={`icon ${className}`} style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: colored }} />;
}

/* ── Assets ── */
const ICONS = {
  calendar: '/icons-solid/calendar-heart-01.svg',
  target: '/icons-solid/target-04.svg',
  user: '/icons-solid/user-03.svg',
  layers: '/icons-solid/layers-three-01.svg',
  file: '/icons-solid/file-02.svg',
  edit: '/icons-solid/edit-02.svg',
  userEdit: '/icons-solid/user-edit.svg',
  aiChat: '/icons/message-chat-circle.svg',
  lock: '/icons-solid/lock-keyhole-square.svg',
  send: '/icons-solid/send-01.svg',
  search: '/icons/search-sm.svg',
  plus: '/icons/plus.svg',
  minus: '/icons/minus.svg',
  refresh: '/icons/refresh-ccw-05.svg',
  expand: '/icons-solid/expand-06.svg',
  settings: '/icons-solid/settings-02.svg',
};

const AVATARS = {
  online1: 'https://www.figma.com/api/mcp/asset/6416dc11-3e97-42b8-80be-23d63a474691',
  online2: 'https://www.figma.com/api/mcp/asset/b6872865-197b-46c2-9d9e-683164de1b29',
  default: 'https://www.figma.com/api/mcp/asset/2f3ea81f-76dc-4bf9-9647-c132f7c13d5e',
};

const MENU = [
  { icon: ICONS.calendar, label: '타임라인' },
  { icon: ICONS.target, label: 'OKR' },
  { icon: ICONS.user, label: '원온원', page: 'oneonone' },
  { icon: ICONS.layers, label: '조직도', page: 'orgchart' },
  { icon: ICONS.file, label: '회의록' },
  { icon: ICONS.edit, label: '평가' },
  { icon: ICONS.userEdit, label: '매니저' },
  { icon: ICONS.aiChat, label: 'AI Chat' },
  { icon: ICONS.lock, label: '어드민' },
];

/* ── Org Data ── */
const STAT_ICONS = {
  okr: '/badge-okr.png',
  hc: '/badge-hc.png',
  oneOnOne: '/badge-1on1.png',
  workHours: '/badge-hours.png',
};

const DEFAULT_PROFILE = {
  title: '사원',
  dept: '경영지원본부',
  bio: '열정적으로 업무에 임하고 있습니다.',
  skills: '기획 • 매니징',
  contacts: '@user • user@pivit.com',
  links: ['https://pivit.com'],
  teamMembers: [],
};

const CHRIS_PROFILE = {
  title: '이사',
  dept: '프로덕트본부',
  bio: '20년차 경영 전문가. 기술과 사람을 연결하는 리더십을 추구합니다.',
  skills: '경영전략 • 기획 • 매니징 • IR',
  contacts: '@woojin.kim • manager1@pivit.com',
  links: ['https://woojin.dev', 'https://github.com/woojin-kim'],
  teamMembers: [
    { name: '김우진', role: '팀장', avatar: AVATARS.default, online: true },
    { name: '이수현', role: '과장', avatar: AVATARS.default, online: true },
    { name: '신하윤', role: '대리', avatar: AVATARS.default, online: true },
    { name: '박소연', role: '대리', avatar: AVATARS.default, online: false },
    { name: '박지호', role: '사원', avatar: AVATARS.default, online: true },
  ],
};

const ORG = {
  id: 'company', name: 'SAMSUNG 물산', type: '회사', count: '34명', level: 'company',
  children: [
    {
      id: 'mgmt', name: '경영지원본부', type: '본부', count: '직속 2명', level: 'division',
      members: [
        { name: '정은우', avatar: AVATARS.online1, online: true, profile: DEFAULT_PROFILE },
        { name: '박우진', avatar: AVATARS.default, online: false, profile: DEFAULT_PROFILE },
      ],
      children: [
        { id: 'people', name: 'People팀', type: '팀', level: 'team', members: [
          { name: '신예은', avatar: AVATARS.online2, online: true, profile: DEFAULT_PROFILE },
          { name: '이서현', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
          { name: '김서윤', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
        ]},
        { id: 'finance', name: '재무회계팀', type: '팀', level: 'team', members: [
          { name: '신예린', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
          { name: '오예린', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
          { name: '박은서', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
        ]},
        { id: 'bizdev', name: '비즈니스개발팀', type: '팀', level: 'team', members: [
          { name: '오민준', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
          { name: '이정민', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
          { name: '이서진', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
        ]},
      ],
    },
    {
      id: 'product', name: '프로덕트 본부', type: '본부', count: '직속 1명', level: 'division',
      members: [
        { name: 'Chris', avatar: AVATARS.online1, online: true, selected: true, profile: CHRIS_PROFILE },
      ],
      children: [
        { id: 'proddev', name: '프로덕트개발팀', type: '팀', level: 'team', members: [
          { name: '김우진', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
        ], children: [
          { id: 'uiux', name: 'UIUX 디자인', type: '파트', level: 'part', members: [
            { name: '박은지', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
            { name: '윤지안', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
            { name: '이서현', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
          ]},
          { id: 'frontend', name: '프론트엔드', type: '파트', level: 'part', members: [
            { name: '박서아', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
            { name: '윤다희', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
            { name: '신서윤', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
          ]},
          { id: 'backend', name: '백엔드개발', type: '파트', level: 'part', members: [
            { name: '최하은', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
            { name: '박서현', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
            { name: '신혜린', avatar: AVATARS.default, online: true, profile: DEFAULT_PROFILE },
          ]},
        ]},
      ],
    },
  ],
};

const LEVEL_COLORS = {
  company: { bg: 'var(--utility-brand-50)', countColor: 'var(--text-brand-tertiary)' },
  division: { bg: 'var(--utility-blue-50)', countColor: 'var(--utility-blue-600)' },
  team: { bg: 'var(--utility-pink-50)', countColor: null },
  part: { bg: 'var(--utility-purple-50)', countColor: null },
};

/* ── Components ── */
function Sidebar({ currentPage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div className="sidebar-top">
          <div className="logo-wrap"><img src="/logo.svg" alt="Pivit" /></div>
          <nav className="menu-list">
            {MENU.map(m => {
              const isActive = m.page === currentPage;
              return (
                <div
                  key={m.label}
                  className={`menu-item ${isActive ? 'active' : ''}`}
                  onClick={() => m.page && onNavigate(m.page)}
                >
                  <Icon src={m.icon} size={16} color={isActive ? 'var(--text-primary)' : 'var(--text-secondary)'} />
                  <span>{m.label}</span>
                </div>
              );
            })}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="menu-item"><Icon src={ICONS.send} size={16} color="var(--text-secondary)" /><span>의견보내기</span></div>
          <div className="menu-item"><Icon src={ICONS.settings} size={16} color="var(--text-secondary)" /><span>설정</span></div>
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
        <Icon src={ICONS.search} size={20} color="var(--text-secondary)" />
        <div className="search-kbd"><kbd>/</kbd></div>
        <span className="search-placeholder">를 눌러 검색하세요</span>
      </div>
    </header>
  );
}

/* ── Position Store ── */
const POSITIONS_STORAGE_KEY = 'pivit_orgchart_positions';

function loadPositions() {
  try {
    const raw = localStorage.getItem(POSITIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function savePositions(positions) {
  localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions));
}

const PositionsContext = React.createContext();
const ModalContext = React.createContext();

function usePositions() {
  return React.useContext(PositionsContext);
}

function useDrag(nodeId) {
  const { positions, updatePosition } = usePositions();
  const saved = positions[nodeId] || { x: 0, y: 0 };
  const [isDragging, setIsDragging] = useState(false);
  const [current, setCurrent] = useState(saved);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const s = positions[nodeId] || { x: 0, y: 0 };
    if (!isDragging) setCurrent(s);
  }, [positions, nodeId, isDragging]);

  const onDown = (e) => {
    e.stopPropagation();
    startMouse.current = { x: e.clientX, y: e.clientY };
    startPos.current = { ...current };
    setIsDragging(true);

    const onMove = (ev) => {
      const nx = startPos.current.x + (ev.clientX - startMouse.current.x);
      const ny = startPos.current.y + (ev.clientY - startMouse.current.y);
      setCurrent({ x: nx, y: ny });
    };
    const onUp = () => {
      setIsDragging(false);
      setCurrent(prev => {
        updatePosition(nodeId, prev);
        return prev;
      });
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const style = {
    transform: `translate(${current.x}px, ${current.y}px)`,
    transition: isDragging ? 'none' : 'transform 0.15s ease-out',
  };

  return { isDragging, onDown, style };
}

function DeptCard({ node, onMouseDown, isDragging }) {
  const lc = LEVEL_COLORS[node.level];
  return (
    <div
      className={`dept-card ${isDragging ? 'card-dragging' : ''}`}
      style={{ background: lc.bg }}
      onMouseDown={onMouseDown}
    >
      <div className="dept-name">{node.name}</div>
      <div className="dept-meta">
        <span className="dept-type">{node.type}</span>
        {node.count && <span className="dept-count" style={{ color: lc.countColor }}>{node.count}</span>}
      </div>
    </div>
  );
}

function MemberCard({ member, parentId, index }) {
  const memberId = `${parentId}_member_${index}`;
  const { isDragging, onDown, style } = useDrag(memberId);
  const { openModal } = React.useContext(ModalContext);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    onDown(e);
  };

  const handleClick = (e) => {
    const dx = Math.abs(e.clientX - dragStartPos.current.x);
    const dy = Math.abs(e.clientY - dragStartPos.current.y);
    if (dx < 5 && dy < 5) {
      openModal(member);
    }
  };

  return (
    <div
      className={`member-node ${isDragging ? 'member-dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      style={style}
    >
      <div className="avatar-wrap">
        <img src={member.avatar} alt="" className="avatar-sm" />
        <span className={`online-dot ${member.online ? 'online' : 'offline'}`} />
      </div>
      <span className="member-name">{member.name}</span>
      <span className="status-badge-working">근무중</span>
    </div>
  );
}

function BezierConnectors({ containerRef, scale }) {
  const svgRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const draw = () => {
      const svg = svgRef.current;
      const container = containerRef.current;
      if (!svg || !container) return;

      const s = scale || 1;
      const containerRect = container.getBoundingClientRect();
      let pathData = '';

      const orgNodes = container.querySelectorAll('.org-node');
      orgNodes.forEach(parentNode => {
        const childrenRow = parentNode.querySelector(':scope > .children-row');
        if (!childrenRow) return;

        const membersList = parentNode.querySelector(':scope > .members-list');
        const deptCard = parentNode.querySelector(':scope > .dept-card');
        const parentBottom = membersList ? (membersList.lastElementChild || deptCard) : deptCard;
        if (!parentBottom) return;

        const parentRect = parentBottom.getBoundingClientRect();
        const px = (parentRect.left + parentRect.width / 2 - containerRect.left) / s;
        const py = (parentRect.bottom - containerRect.top) / s;

        const branches = childrenRow.querySelectorAll(':scope > .child-branch');
        branches.forEach(branch => {
          const childDept = branch.querySelector(':scope > .org-node > .dept-card');
          if (!childDept) return;
          const childRect = childDept.getBoundingClientRect();
          const cx = (childRect.left + childRect.width / 2 - containerRect.left) / s;
          const cy = (childRect.top - containerRect.top) / s;
          const midY = (py + cy) / 2;
          pathData += `M ${px} ${py} C ${px} ${midY}, ${cx} ${midY}, ${cx} ${cy} `;
        });
      });

      orgNodes.forEach(node => {
        const deptCard = node.querySelector(':scope > .dept-card');
        const membersList = node.querySelector(':scope > .members-list');
        if (!deptCard || !membersList) return;

        const deptRect = deptCard.getBoundingClientRect();
        const dx = (deptRect.left + deptRect.width / 2 - containerRect.left) / s;
        const dy = (deptRect.bottom - containerRect.top) / s;

        const members = membersList.querySelectorAll(':scope > .member-node');
        members.forEach((memberEl, idx) => {
          const mRect = memberEl.getBoundingClientRect();
          const mx = (mRect.left + mRect.width / 2 - containerRect.left) / s;
          const my = (mRect.top - containerRect.top) / s;

          if (idx === 0) {
            const midY = (dy + my) / 2;
            pathData += `M ${dx} ${dy} C ${dx} ${midY}, ${mx} ${midY}, ${mx} ${my} `;
          } else {
            const prevMember = members[idx - 1];
            const prevRect = prevMember.getBoundingClientRect();
            const prevX = (prevRect.left + prevRect.width / 2 - containerRect.left) / s;
            const prevY = (prevRect.bottom - containerRect.top) / s;
            const midY = (prevY + my) / 2;
            pathData += `M ${prevX} ${prevY} C ${prevX} ${midY}, ${mx} ${midY}, ${mx} ${my} `;
          }
        });
      });

      svg.innerHTML = `<path d="${pathData}" fill="none" stroke="#d2d6db" stroke-width="1"/>`;
      rafRef.current = requestAnimationFrame(draw);
    };

    const timer = setTimeout(() => { rafRef.current = requestAnimationFrame(draw); }, 150);
    return () => { clearTimeout(timer); cancelAnimationFrame(rafRef.current); };
  }, [containerRef, scale]);

  return (
    <svg ref={svgRef} className="connector-svg" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }} />
  );
}

/* ── Profile Modal ── */
function ProfileModal({ member, onClose }) {
  if (!member) return null;
  const profile = member.profile || DEFAULT_PROFILE;

  return (
    <>
    <div className="modal-overlay" onClick={onClose} />
    <div className="modal-scroll-wrap" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="modal-spline-wrap">
            <Spline
              scene="https://prod.spline.design/lUTrZH2tVSyiKzPA/scene.splinecode"
              onLoad={(splineApp) => {
                const group = splineApp.findObjectByName('Group');
                if (group) {
                  group.scale.x = 0.7;
                  group.scale.y = 0.7;
                  group.scale.z = 0.7;
                }
                const applyTex = (name, src) => {
                  const obj = splineApp.findObjectByName(name);
                  if (!obj) return;
                  const texLayer = [...Array(obj.material.layers.length)]
                    .map((_, i) => obj.material.layers[i])
                    .find((l) => l.type === 'texture');
                  if (!texLayer) return;
                  const img = new Image();
                  img.crossOrigin = 'anonymous';
                  img.src = src;
                  img.onload = () => {
                    texLayer.updateTexture(img);
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    texLayer.updateTexture(canvas.toDataURL('image/png'));
                    const tex = texLayer.texture;
                    tex.image = img;
                    texLayer.texture = tex;
                  };
                };
                applyTex('profileImage', '/man.png');
                applyTex('profileImage-2', '/man.png');
              }}
            />
          </div>
          <div className="modal-name">{member.name}</div>
          <div className="modal-title">{profile.title} · {profile.dept}</div>
          <div className="modal-bio">{profile.bio}</div>
          <span className="modal-status-badge">근무중</span>
        </div>

        {/* Stats Row */}
        <div className="modal-stats">
          <div className="modal-stat">
            <div className="modal-stat-icon modal-stat-okr">
              <img src={STAT_ICONS.okr} alt="OKR" />
            </div>
            <div className="modal-stat-label">OKR</div>
            <div className="modal-stat-value">70%</div>
          </div>
          <div className="modal-stat">
            <div className="modal-stat-icon modal-stat-hc">
              <img src={STAT_ICONS.hc} alt="HC" />
            </div>
            <div className="modal-stat-label">HC</div>
            <div className="modal-stat-value">50%</div>
          </div>
          <div className="modal-stat">
            <div className="modal-stat-icon modal-stat-1on1">
              <img src={STAT_ICONS.oneOnOne} alt="1 on 1" />
            </div>
            <div className="modal-stat-label">1 on 1</div>
            <div className="modal-stat-value">완료</div>
          </div>
          <div className="modal-stat">
            <div className="modal-stat-icon modal-stat-hours">
              <img src={STAT_ICONS.workHours} alt="업무시간" />
            </div>
            <div className="modal-stat-label">업무시간</div>
            <div className="modal-stat-value">10-7</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="modal-actions">
          <button className="modal-btn-feedback">
            <Icon src="/icons-solid/send-03.svg" size={20} color="white" />
            피드백주기
          </button>
          <button className="modal-btn-meeting">
            <Icon src="/icons-solid/calendar-heart-02.svg" size={20} color="#21a67a" />
            미팅잡기
          </button>
        </div>

        {/* Info Sections */}
        <div className="modal-info-sections">
          <div className="modal-info-section">
            <div className="modal-info-label">스킬</div>
            <div className="modal-info-content">{profile.skills}</div>
          </div>
          <div className="modal-info-section">
            <div className="modal-info-label">연락처</div>
            <div className="modal-info-content">{profile.contacts}</div>
          </div>
          <div className="modal-info-section">
            <div className="modal-info-label">링크</div>
            <div className="modal-info-content">
              {profile.links.map((link, i) => (
                <div key={i} className="modal-info-link">{link}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Team Members */}
        {profile.teamMembers && profile.teamMembers.length > 0 && (
          <div className="modal-team">
            <div className="modal-team-header">
              <span className="modal-team-title">직속팀원</span>
              <span className="modal-team-count">{profile.teamMembers.length}명</span>
            </div>
            <div className="modal-team-grid">
              {profile.teamMembers.map((tm, i) => (
                <div key={i} className="modal-team-member">
                  <div className="modal-team-avatar-wrap">
                    <img src={tm.avatar} alt="" className="modal-team-avatar" />
                    <span className={`modal-team-dot ${tm.online ? 'online' : 'offline'}`} />
                  </div>
                  <div className="modal-team-name">{tm.name}</div>
                  <div className="modal-team-role">{tm.role}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer">
          <span className="modal-footer-text">Get Communication with</span>
          <img src="/logo.svg" alt="Pivit" className="modal-footer-logo" />
        </div>
      </div>
    </div>
    </>
  );
}

function OrgNode({ node, depth = 0 }) {
  const hasChildren = node.children && node.children.length > 0;
  const { isDragging, onDown, style } = useDrag(node.id);
  return (
    <div
      className={`org-node ${hasChildren ? 'has-children' : ''} ${isDragging ? 'org-node-dragging' : ''}`}
      style={style}
    >
      <DeptCard node={node} onMouseDown={onDown} isDragging={isDragging} />
      {node.members && (
        <div className="members-list">
          {node.members.map((m, i) => <MemberCard key={i} member={m} parentId={node.id} index={i} />)}
        </div>
      )}
      {hasChildren && (
        <div className="children-row">
          {node.children.map(child => (
            <div key={child.id} className="child-branch">
              <OrgNode node={child} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main App ── */
export default function App() {
  const [currentPage, setCurrentPage] = useState('orgchart');

  const [positions, setPositions] = useState(loadPositions);
  const updatePosition = useCallback((id, pos) => {
    setPositions(prev => {
      const next = { ...prev, [id]: pos };
      savePositions(next);
      return next;
    });
  }, []);
  const resetPositions = useCallback(() => {
    setPositions({});
    savePositions({});
  }, []);

  const [selectedMember, setSelectedMember] = useState(null);
  const openModal = useCallback((member) => setSelectedMember(member), []);
  const closeModal = useCallback(() => setSelectedMember(null), []);

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const canvasInnerRef = useRef(null);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const prevScale = scaleRef.current;
    const nextScale = Math.min(Math.max(0.2, prevScale - e.deltaY * 0.002), 3);
    const ratio = nextScale / prevScale;

    const prevT = translateRef.current;
    const nextT = {
      x: mouseX - ratio * (mouseX - prevT.x),
      y: mouseY - ratio * (mouseY - prevT.y),
    };

    scaleRef.current = nextScale;
    translateRef.current = nextT;
    setScale(nextScale);
    setTranslate(nextT);
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const onMouseDown = (e) => {
    if (e.target.closest('.zoom-controls, .member-node, .dept-card')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
  };
  const onMouseMove = (e) => {
    if (!isDragging) return;
    const t = {
      x: translateStart.current.x + (e.clientX - dragStart.current.x),
      y: translateStart.current.y + (e.clientY - dragStart.current.y),
    };
    translateRef.current = t;
    setTranslate(t);
  };
  const onMouseUp = () => setIsDragging(false);
  const resetView = () => { setScale(1); setTranslate({ x: 0, y: 0 }); scaleRef.current = 1; translateRef.current = { x: 0, y: 0 }; resetPositions(); };

  return (
    <PositionsContext.Provider value={{ positions, updatePosition }}>
    <ModalContext.Provider value={{ openModal }}>
    <div className="app">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <TopNav />
      <ProfileModal member={selectedMember} onClose={closeModal} />

      {currentPage === 'orgchart' && (
        <>
          <div className="content-header">
            <div className="tab-nav">
              <span className="tab-active">조직도</span>
              <span className="tab-inactive">프로젝트</span>
              <span className="tab-inactive">리스트</span>
            </div>
            <div className="header-subtitle">
              <b>전체 인원</b>
              <span className="dot">&#8729;</span>
              <span className="brand-count">34명</span>
            </div>
          </div>

          <div
            className="canvas-area"
            ref={canvasRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <div className="drag-hint">
              <Icon src={ICONS.expand} size={14} color="var(--text-brand-tertiary)" />
              <span>화면을 드래그하면 좀 더 쉽게 조직도를 보실 수 있습니다.</span>
            </div>

            <div className="canvas-inner" ref={canvasInnerRef} style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              position: 'relative',
            }}>
              <BezierConnectors containerRef={canvasInnerRef} scale={scale} />
              <OrgNode node={ORG} />
            </div>

            <div className="zoom-controls">
              <button className="zoom-btn" onClick={() => { const s = Math.min(scaleRef.current + 0.1, 3); scaleRef.current = s; setScale(s); }}>
                <Icon src={ICONS.plus} size={20} color="var(--text-primary)" />
              </button>
              <button className="zoom-btn" onClick={() => { const s = Math.max(scaleRef.current - 0.1, 0.2); scaleRef.current = s; setScale(s); }}>
                <Icon src={ICONS.minus} size={20} color="var(--text-primary)" />
              </button>
              <button className="zoom-btn" onClick={resetView}>
                <Icon src={ICONS.refresh} size={20} color="var(--text-primary)" />
              </button>
            </div>
          </div>
        </>
      )}

      {currentPage === 'oneonone' && (
        <OneOnOneContent Icon={Icon} />
      )}
    </div>
    </ModalContext.Provider>
    </PositionsContext.Provider>
  );
}
