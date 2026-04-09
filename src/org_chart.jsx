import React, { useState, useRef, useCallback, useEffect } from 'react';

import OneOnOneContent from './OneOnOnePage';
import './org_chart.css';

/* ── Inline SVG Icon ── */
const BASE = import.meta.env.BASE_URL;
const svgCache = {};
function Icon({ src, size = 16, color = 'currentColor', className = '' }) {
  const [svg, setSvg] = useState(svgCache[src] || '');
  useEffect(() => {
    if (svgCache[src]) { setSvg(svgCache[src]); return; }
    const url = src.startsWith('/') ? BASE + src.slice(1) : src;
    fetch(url).then(r => r.text()).then(t => { svgCache[src] = t; setSvg(t); });
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
  정은우: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  박우진: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
  신예은: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  이서현: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  김서윤: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
  신예린: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face',
  오예린: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop&crop=face',
  박은서: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
  오민준: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
  이정민: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
  이서진: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop&crop=face',
  Chris: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face',
  김우진: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop&crop=face',
  박은지: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face',
  윤지안: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face',
  이서현2: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop&crop=face',
  박서아: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop&crop=face',
  윤다희: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop&crop=face',
  신서윤: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop&crop=face',
  최하은: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop&crop=face',
  박서현: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=100&fit=crop&crop=face',
  신혜린: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=100&h=100&fit=crop&crop=face',
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
  okr: `${BASE}badge-okr.png`,
  hc: `${BASE}badge-hc.png`,
  oneOnOne: `${BASE}badge-1on1.png`,
  workHours: `${BASE}badge-hours.png`,
};

const MEMBER_STATUSES = {
  working: { label: '재직중', badgeBg: '#2dbd82', borderColor: '#2dbd82', dotColor: '#17b26a' },
  leave: { label: '휴직', badgeBg: '#687079', borderColor: '#b1b6be', dotColor: '#d2d6db' },
  resigned: { label: '퇴사 예정', badgeBg: '#f04438', borderColor: '#f04438', dotColor: '#d92d20' },
  standby: { label: '대기중', badgeBg: '#2e90fa', borderColor: '#2e90fa', dotColor: '#1570ef' },
};
const STATUS_KEYS = Object.keys(MEMBER_STATUSES);

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
    { name: '김우진', role: '팀장', avatar: AVATARS.김우진, online: true },
    { name: '이수현', role: '과장', avatar: AVATARS.이서현, online: true },
    { name: '신하윤', role: '대리', avatar: AVATARS.신예린, online: true },
    { name: '박소연', role: '대리', avatar: AVATARS.박은서, online: false },
    { name: '박지호', role: '사원', avatar: AVATARS.오민준, online: true },
  ],
};

const INITIAL_ORG = {
  id: 'company', name: 'SAMSUNG 물산', type: '회사', count: '34명', level: 'company',
  children: [
    {
      id: 'mgmt', name: '경영지원본부', type: '본부', count: '직속 2명', level: 'division',
      members: [
        { name: '정은우', avatar: AVATARS.정은우, status: 'working', workHours: '9 → 6', attendance: 51, hcScore: 2.7, profile: DEFAULT_PROFILE },
        { name: '박우진', avatar: AVATARS.박우진, status: 'leave', role: 'DL', workHours: '9 → 6', attendance: 48, hcScore: 9.6, onVacation: true, profile: DEFAULT_PROFILE },
      ],
      children: [
        { id: 'people', name: 'People팀', type: '팀', level: 'team', members: [
          { name: '신예은', avatar: AVATARS.신예은, status: 'working', workHours: '9 → 6', attendance: 25, hcScore: 3.2, profile: DEFAULT_PROFILE },
          { name: '이서현', avatar: AVATARS.이서현, status: 'working', workHours: '9 → 6', attendance: 76, hcScore: 7.9, profile: DEFAULT_PROFILE },
          { name: '김서윤', avatar: AVATARS.김서윤, status: 'resigned', workHours: '9 → 6', attendance: 22, hcScore: 8.7, profile: DEFAULT_PROFILE },
        ]},
        { id: 'finance', name: '재무회계팀', type: '팀', level: 'team', members: [
          { name: '신예린', avatar: AVATARS.신예린, status: 'working', workHours: '9 → 6', attendance: 29, hcScore: 8.0, profile: DEFAULT_PROFILE },
          { name: '오예린', avatar: AVATARS.오예린, status: 'standby', workHours: '9 → 6', attendance: 31, hcScore: 4.4, profile: DEFAULT_PROFILE },
          { name: '박은서', avatar: AVATARS.박은서, status: 'working', workHours: '9 → 6', attendance: 17, hcScore: 4.8, profile: DEFAULT_PROFILE },
        ]},
        { id: 'bizdev', name: '비즈니스개발팀', type: '팀', level: 'team', members: [
          { name: '오민준', avatar: AVATARS.오민준, status: 'working', workHours: '9 → 6', attendance: 97, hcScore: 7.8, profile: DEFAULT_PROFILE },
          { name: '이정민', avatar: AVATARS.이정민, status: 'leave', workHours: '9 → 6', attendance: 11, hcScore: 9.7, onVacation: true, profile: DEFAULT_PROFILE },
          { name: '이서진', avatar: AVATARS.이서진, status: 'working', workHours: '9 → 6', attendance: 32, hcScore: 7.3, profile: DEFAULT_PROFILE },
        ]},
      ],
    },
    {
      id: 'product', name: '프로덕트 본부', type: '본부', count: '직속 1명', level: 'division',
      members: [
        { name: 'Chris', avatar: AVATARS.Chris, status: 'working', selected: true, role: 'DL', workHours: '9 → 6', attendance: 93, hcScore: 6.3, profile: CHRIS_PROFILE },
      ],
      children: [
        { id: 'proddev', name: '프로덕트개발팀', type: '팀', level: 'team', members: [
          { name: '김우진', avatar: AVATARS.김우진, status: 'working', role: 'TL', workHours: '10 → 7', attendance: 49, hcScore: 5.1, profile: DEFAULT_PROFILE },
        ], children: [
          { id: 'uiux', name: 'UIUX 디자인', type: '파트', level: 'part', members: [
            { name: '박은지', avatar: AVATARS.박은지, status: 'working', workHours: '9 → 6', attendance: 67, hcScore: 5.2, profile: DEFAULT_PROFILE },
            { name: '윤지안', avatar: AVATARS.윤지안, status: 'standby', workHours: '9 → 6', attendance: 87, hcScore: 7.8, profile: DEFAULT_PROFILE },
            { name: '이서현', avatar: AVATARS.이서현2, status: 'working', workHours: '9 → 6', attendance: 89, hcScore: 5.4, profile: DEFAULT_PROFILE },
          ]},
          { id: 'frontend', name: '프론트엔드', type: '파트', level: 'part', members: [
            { name: '박서아', avatar: AVATARS.박서아, status: 'working', workHours: '9 → 6', attendance: 68, hcScore: 6.3, profile: DEFAULT_PROFILE },
            { name: '윤다희', avatar: AVATARS.윤다희, status: 'resigned', workHours: '9 → 6', attendance: 11, hcScore: 7.0, profile: DEFAULT_PROFILE },
            { name: '신서윤', avatar: AVATARS.신서윤, status: 'working', workHours: '9 → 6', attendance: 79, hcScore: 7.1, profile: DEFAULT_PROFILE },
          ]},
          { id: 'backend', name: '백엔드개발', type: '파트', level: 'part', members: [
            { name: '최하은', avatar: AVATARS.최하은, status: 'working', workHours: '9 → 6', attendance: 62, hcScore: 2.3, profile: DEFAULT_PROFILE },
            { name: '박서현', avatar: AVATARS.박서현, status: 'leave', workHours: '9 → 6', attendance: 25, hcScore: 3.8, onVacation: true, profile: DEFAULT_PROFILE },
            { name: '신혜린', avatar: AVATARS.신혜린, status: 'working', workHours: '9 → 6', attendance: 53, hcScore: 7.6, profile: DEFAULT_PROFILE },
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
          <div className="logo-wrap"><img src={`${BASE}logo.svg`} alt="Pivit" /></div>
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
const MoveContext = React.createContext();
const DragContext = React.createContext();

function usePositions() {
  return React.useContext(PositionsContext);
}

function useDrag(nodeId, onDrop, onDragMove) {
  const { positions, updatePosition } = usePositions();
  const saved = positions[nodeId] || { x: 0, y: 0 };
  const [isDragging, setIsDragging] = useState(false);
  const [current, setCurrent] = useState(saved);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: 0, y: 0 });
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  const onDragMoveRef = useRef(onDragMove);
  onDragMoveRef.current = onDragMove;

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
      const pos = { x: nx, y: ny };
      setCurrent(pos);
      updatePosition(nodeId, pos);
      if (onDragMoveRef.current) onDragMoveRef.current(ev, pos);
    };
    const onUp = (ev) => {
      setIsDragging(false);
      if (onDropRef.current) onDropRef.current(ev);
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

function MemberCard({ member, parentId, index, showWorkHours, showVacation, editMode, adminMode }) {
  const memberId = `${parentId}_member_${index}`;
  const { openModal } = React.useContext(ModalContext);
  const { positions, updatePosition } = usePositions();
  const { moveMember } = React.useContext(MoveContext);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const memberNodeRef = useRef(null);

  const { setDropTarget } = React.useContext(DragContext);

  // Shared logic: find the best drop target from a card's screen position
  const findDropTarget = useCallback((cardEl) => {
    if (!cardEl) return null;
    const allLists = document.querySelectorAll('.members-list');
    const cardRect = cardEl.getBoundingClientRect();
    const cardCenterX = cardRect.left + cardRect.width / 2;
    const cardCenterY = cardRect.top + cardRect.height / 2;

    let bestList = null;
    let bestDist = 150;

    allLists.forEach(list => {
      const listRect = list.getBoundingClientRect();
      const expandedTop = listRect.top - 40;
      const expandedBottom = listRect.bottom + 40;
      const listCenterX = listRect.left + listRect.width / 2;
      const dx = Math.abs(cardCenterX - listCenterX);
      const isVerticallyClose = cardCenterY >= expandedTop && cardCenterY <= expandedBottom;
      if (dx < bestDist && isVerticallyClose) {
        bestDist = dx;
        bestList = list;
      }
    });

    if (!bestList) return null;

    const targetOrgNode = bestList.closest('.org-node');
    const targetNodeId = targetOrgNode?.dataset.nodeId;
    if (!targetNodeId || targetNodeId === parentId) return null;

    const memberNodes = bestList.querySelectorAll(':scope > .member-node');
    let insertIdx = memberNodes.length;
    for (let i = 0; i < memberNodes.length; i++) {
      const mRect = memberNodes[i].getBoundingClientRect();
      if (cardCenterY < mRect.top + mRect.height / 2) {
        insertIdx = i;
        break;
      }
    }

    return { targetNodeId, insertIndex: insertIdx };
  }, [parentId]);

  const handleDragMove = useCallback((ev, pos) => {
    if (!editMode || Math.max(Math.abs(pos.x), Math.abs(pos.y)) < 200) {
      setDropTarget(null);
      return;
    }
    const target = findDropTarget(memberNodeRef.current);
    setDropTarget(target);
  }, [editMode, findDropTarget, setDropTarget]);

  const handleDrop = useCallback((ev) => {
    setDropTarget(null);
    if (!editMode) return;
    const pos = positions[memberId] || { x: 0, y: 0 };
    if (Math.max(Math.abs(pos.x), Math.abs(pos.y)) < 200) return;

    const target = findDropTarget(memberNodeRef.current);
    if (!target) return;

    moveMember(parentId, index, target.targetNodeId, target.insertIndex);
    updatePosition(memberId, { x: 0, y: 0 });
  }, [memberId, parentId, index, positions, moveMember, updatePosition, findDropTarget, setDropTarget]);

  const { isDragging, onDown, style } = useDrag(memberId, handleDrop, handleDragMove);

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

  const status = MEMBER_STATUSES[member.status] || MEMBER_STATUSES.working;
  const pos = positions[memberId] || { x: 0, y: 0 };
  const wasDetached = useRef(false);
  const absX = Math.abs(pos.x);
  const absY = Math.abs(pos.y);
  const dist = Math.max(absX, absY);
  if (!editMode) {
    wasDetached.current = false;
  } else if (wasDetached.current) {
    wasDetached.current = dist > 50;
  } else {
    wasDetached.current = dist > 200;
  }
  const isDetached = wasDetached.current;

  return (
    <div
      ref={memberNodeRef}
      className={`member-node ${isDragging ? 'member-dragging' : ''} ${isDetached ? 'member-detached' : ''}`}
      data-detached={isDetached ? 'true' : undefined}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      style={{
        ...style,
        '--member-border-color': status.borderColor,
      }}
    >
      {showVacation && member.onVacation && <img src={`${BASE}vacation.png`} alt="" className="vacation-img" />}
      <div className="member-content">
        <div className="member-row">
          <div className="avatar-wrap">
            <img src={member.avatar} alt="" className="avatar-sm" />
            <span className="online-dot" style={{ background: status.dotColor }} />
          </div>
          <span className="member-name">{member.name}</span>
          {member.role && <span className={`role-badge role-badge-${member.role.toLowerCase()}`}>{member.role}</span>}
        </div>
        {showWorkHours && member.workHours && (
          <>
            <div className="working-time-bar">
              <div className="active-bar" style={{ width: `${member.attendance || 0}%` }} />
            </div>
            <div className="working-time-info">
              <div className="working-time-left">
                <Icon src="/icons/clock-stopwatch.svg" size={14} color="#b1b6be" />
                <span>{member.attendance || 0}%</span>
              </div>
              <span className="working-time-right">{member.workHours}</span>
            </div>
          </>
        )}
        {adminMode && member.hcScore != null && (() => {
          const score = member.hcScore;
          const hcColor = score >= 7 ? '#2dbd82' : score >= 5 ? '#f79009' : '#f04438';
          return (
            <div className="hc-score-section">
              <div className="hc-score-bar">
                <div className="hc-score-active" style={{ width: `${score * 10}%`, background: hcColor }} />
              </div>
              <div className="hc-score-info" style={{ color: hcColor }}>
                <Icon src="/icons/check-heart.svg" size={14} color={hcColor} />
                <span>{score}</span>
              </div>
            </div>
          );
        })()}
      </div>
      <span className="status-badge-member" style={{ background: status.badgeBg }}>{status.label}</span>
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
        let parentBottom = deptCard;
        if (membersList) {
          const attachedMembers = membersList.querySelectorAll(':scope > .member-node:not([data-detached="true"])');
          parentBottom = attachedMembers.length > 0 ? attachedMembers[attachedMembers.length - 1] : deptCard;
        }
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
        let lastX = dx;
        let lastY = dy;
        members.forEach((memberEl) => {
          const isDetached = memberEl.dataset.detached === 'true';
          if (isDetached) return;

          const mRect = memberEl.getBoundingClientRect();
          const targetX = (mRect.left + mRect.width / 2 - containerRect.left) / s;
          const targetY = (mRect.top - containerRect.top) / s;

          const midY = (lastY + targetY) / 2;
          pathData += `M ${lastX} ${lastY} C ${lastX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY} `;

          lastX = targetX;
          lastY = (mRect.bottom - containerRect.top) / s;
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
const PROFILE_IMAGE = 'https://pivit-work.github.io/design-page/man.png';

function ProfileModal({ member, onClose }) {
  const [splineReady, setSplineReady] = useState(false);
  const [splineActive, setSplineActive] = useState(false);

  useEffect(() => {
    if (!member) { setSplineReady(false); setSplineActive(false); }
  }, [member]);

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
          <div
            className={`modal-spline-wrap ${splineActive ? 'spline-active' : ''}`}
            onClick={() => setSplineActive(true)}
            onMouseLeave={() => setSplineActive(false)}
          >
            <iframe src={`${BASE}spline-profile.html?img=${encodeURIComponent(PROFILE_IMAGE)}`} sandbox="allow-scripts" frameBorder="0" width="100%" height="100%" title="Spline 3D" style={{ border: 'none', opacity: splineReady ? 1 : 0, transition: 'opacity 0.5s ease' }} onLoad={() => setTimeout(() => setSplineReady(true), 1500)} />
          </div>
          <div className="modal-name">{member.name}</div>
          <div className="modal-title">{profile.title} · {profile.dept}</div>
          <div className="modal-bio">{profile.bio}</div>
          <span className="modal-status-badge">{(MEMBER_STATUSES[member.status] || MEMBER_STATUSES.working).label}</span>
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
        {(() => {
          const isDisabled = member.status === 'resigned' || member.status === 'leave';
          return (
            <div className={`modal-actions ${isDisabled ? 'modal-actions-disabled' : ''}`}>
              <button className="modal-btn-feedback" disabled={isDisabled}>
                <Icon src="/icons-solid/send-03.svg" size={20} color="white" />
                피드백주기
              </button>
              <button className="modal-btn-meeting" disabled={isDisabled}>
                <Icon src="/icons-solid/calendar-heart-02.svg" size={20} color="#21a67a" />
                미팅잡기
              </button>
            </div>
          );
        })()}

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
          <img src={`${BASE}logo.svg`} alt="Pivit" className="modal-footer-logo" />
        </div>
      </div>
    </div>
    </>
  );
}

function OrgNode({ node, depth = 0, showWorkHours, showVacation, editMode, adminMode }) {
  const hasChildren = node.children && node.children.length > 0;
  const { isDragging, onDown, style } = useDrag(node.id);
  const { dropTarget } = React.useContext(DragContext);
  const isDropTarget = dropTarget && dropTarget.targetNodeId === node.id;

  return (
    <div
      className={`org-node ${hasChildren ? 'has-children' : ''} ${isDragging ? 'org-node-dragging' : ''}`}
      data-node-id={node.id}
      style={style}
    >
      <DeptCard node={node} onMouseDown={onDown} isDragging={isDragging} />
      {node.members && (
        <div className={`members-list ${isDropTarget ? 'drop-target' : ''}`}>
          {node.members.map((m, i) => (
            <React.Fragment key={`${node.id}_${m.name}_${i}`}>
              {isDropTarget && dropTarget.insertIndex === i && (
                <div className="drop-indicator" />
              )}
              <MemberCard member={m} parentId={node.id} index={i} showWorkHours={showWorkHours} showVacation={showVacation} editMode={editMode} adminMode={adminMode} />
            </React.Fragment>
          ))}
          {isDropTarget && dropTarget.insertIndex >= node.members.length && (
            <div className="drop-indicator" />
          )}
        </div>
      )}
      {!node.members && isDropTarget && (
        <div className={`members-list drop-target`}>
          <div className="drop-indicator" />
        </div>
      )}
      {hasChildren && (
        <div className="children-row">
          {node.children.map(child => (
            <div key={child.id} className="child-branch">
              <OrgNode node={child} depth={depth + 1} showWorkHours={showWorkHours} showVacation={showVacation} editMode={editMode} adminMode={adminMode} />
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
  const [orgData, setOrgData] = useState(INITIAL_ORG);
  const [dropTarget, setDropTarget] = useState(null);

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

  const moveMember = useCallback((sourceNodeId, sourceIndex, targetNodeId, insertIndex) => {
    setOrgData(prev => {
      const next = JSON.parse(JSON.stringify(prev));

      function findNode(node, id) {
        if (node.id === id) return node;
        if (node.children) {
          for (const child of node.children) {
            const found = findNode(child, id);
            if (found) return found;
          }
        }
        return null;
      }

      const sourceNode = findNode(next, sourceNodeId);
      const targetNode = findNode(next, targetNodeId);
      if (!sourceNode || !targetNode || !sourceNode.members) return prev;

      const [member] = sourceNode.members.splice(sourceIndex, 1);
      if (!member) return prev;
      if (!targetNode.members) targetNode.members = [];
      targetNode.members.splice(insertIndex, 0, member);

      return next;
    });
  }, []);

  const [showWorkHours, setShowWorkHours] = useState(true);
  const [showVacation, setShowVacation] = useState(false);
  const editMode = false;
  const [adminMode, setAdminMode] = useState(false);

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
  }, [handleWheel, currentPage]);

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
    <MoveContext.Provider value={{ moveMember }}>
    <DragContext.Provider value={{ dropTarget, setDropTarget }}>
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

            <div className="canvas-toggles">
              <label className="canvas-toggle">
                <span className="canvas-toggle-label">출퇴근 시간</span>
                <button className={`toggle-switch ${showWorkHours ? 'toggle-on' : ''}`} onClick={() => setShowWorkHours(!showWorkHours)}>
                  <span className="toggle-knob" />
                </button>
              </label>
              <label className="canvas-toggle">
                <span className="canvas-toggle-label">휴가</span>
                <button className={`toggle-switch ${showVacation ? 'toggle-on' : ''}`} onClick={() => setShowVacation(!showVacation)}>
                  <span className="toggle-knob" />
                </button>
              </label>
              <label className="canvas-toggle">
                <span className="canvas-toggle-label">어드민</span>
                <button className={`toggle-switch ${adminMode ? 'toggle-on' : ''}`} onClick={() => setAdminMode(!adminMode)}>
                  <span className="toggle-knob" />
                </button>
              </label>
            </div>

            <div className="canvas-inner" ref={canvasInnerRef} style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              position: 'relative',
            }}>
              <BezierConnectors containerRef={canvasInnerRef} scale={scale} />
              <OrgNode node={orgData} showWorkHours={showWorkHours} showVacation={showVacation} editMode={editMode} adminMode={adminMode} />
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
    </DragContext.Provider>
    </MoveContext.Provider>
    </ModalContext.Provider>
    </PositionsContext.Provider>
  );
}
