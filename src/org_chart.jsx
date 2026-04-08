import { useState } from 'react';
import './org_chart.css';

import { Sidebar, TopNav, OrgChartCanvas } from './components';
import OneOnOneContent from './OneOnOnePage';

/* ── Assets ── */
const BASE = import.meta.env.BASE_URL;

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

const STAT_ICONS = {
  okr: `${BASE}badge-okr.png`,
  hc: `${BASE}badge-hc.png`,
  oneOnOne: `${BASE}badge-1on1.png`,
  workHours: `${BASE}badge-hours.png`,
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

/* ── Demo Avatars ── */
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

/* ── Demo Org Data ── */
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
        { name: '정은우', avatar: AVATARS.정은우, status: 'working', workHours: '9 → 6', attendance: 51, profile: DEFAULT_PROFILE },
        { name: '박우진', avatar: AVATARS.박우진, status: 'leave', role: 'DL', workHours: '9 → 6', attendance: 48, onVacation: true, profile: DEFAULT_PROFILE },
      ],
      children: [
        { id: 'people', name: 'People팀', type: '팀', level: 'team', members: [
          { name: '신예은', avatar: AVATARS.신예은, status: 'working', workHours: '9 → 6', attendance: 25, profile: DEFAULT_PROFILE },
          { name: '이서현', avatar: AVATARS.이서현, status: 'working', workHours: '9 → 6', attendance: 76, profile: DEFAULT_PROFILE },
          { name: '김서윤', avatar: AVATARS.김서윤, status: 'resigned', workHours: '9 → 6', attendance: 22, profile: DEFAULT_PROFILE },
        ]},
        { id: 'finance', name: '재무회계팀', type: '팀', level: 'team', members: [
          { name: '신예린', avatar: AVATARS.신예린, status: 'working', workHours: '9 → 6', attendance: 29, profile: DEFAULT_PROFILE },
          { name: '오예린', avatar: AVATARS.오예린, status: 'standby', workHours: '9 → 6', attendance: 31, profile: DEFAULT_PROFILE },
          { name: '박은서', avatar: AVATARS.박은서, status: 'working', workHours: '9 → 6', attendance: 17, profile: DEFAULT_PROFILE },
        ]},
        { id: 'bizdev', name: '비즈니스개발팀', type: '팀', level: 'team', members: [
          { name: '오민준', avatar: AVATARS.오민준, status: 'working', workHours: '9 → 6', attendance: 97, profile: DEFAULT_PROFILE },
          { name: '이정민', avatar: AVATARS.이정민, status: 'leave', workHours: '9 → 6', attendance: 11, onVacation: true, profile: DEFAULT_PROFILE },
          { name: '이서진', avatar: AVATARS.이서진, status: 'working', workHours: '9 → 6', attendance: 32, profile: DEFAULT_PROFILE },
        ]},
      ],
    },
    {
      id: 'product', name: '프로덕트 본부', type: '본부', count: '직속 1명', level: 'division',
      members: [
        { name: 'Chris', avatar: AVATARS.Chris, status: 'working', selected: true, role: 'DL', workHours: '9 → 6', attendance: 93, profile: CHRIS_PROFILE },
      ],
      children: [
        { id: 'proddev', name: '프로덕트개발팀', type: '팀', level: 'team', members: [
          { name: '김우진', avatar: AVATARS.김우진, status: 'working', role: 'TL', workHours: '10 → 7', attendance: 49, profile: DEFAULT_PROFILE },
        ], children: [
          { id: 'uiux', name: 'UIUX 디자인', type: '파트', level: 'part', members: [
            { name: '박은지', avatar: AVATARS.박은지, status: 'working', workHours: '9 → 6', attendance: 67, profile: DEFAULT_PROFILE },
            { name: '윤지안', avatar: AVATARS.윤지안, status: 'standby', workHours: '9 → 6', attendance: 87, profile: DEFAULT_PROFILE },
            { name: '이서현', avatar: AVATARS.이서현2, status: 'working', workHours: '9 → 6', attendance: 89, profile: DEFAULT_PROFILE },
          ]},
          { id: 'frontend', name: '프론트엔드', type: '파트', level: 'part', members: [
            { name: '박서아', avatar: AVATARS.박서아, status: 'working', workHours: '9 → 6', attendance: 68, profile: DEFAULT_PROFILE },
            { name: '윤다희', avatar: AVATARS.윤다희, status: 'resigned', workHours: '9 → 6', attendance: 11, profile: DEFAULT_PROFILE },
            { name: '신서윤', avatar: AVATARS.신서윤, status: 'working', workHours: '9 → 6', attendance: 79, profile: DEFAULT_PROFILE },
          ]},
          { id: 'backend', name: '백엔드개발', type: '파트', level: 'part', members: [
            { name: '최하은', avatar: AVATARS.최하은, status: 'working', workHours: '9 → 6', attendance: 62, profile: DEFAULT_PROFILE },
            { name: '박서현', avatar: AVATARS.박서현, status: 'leave', workHours: '9 → 6', attendance: 25, onVacation: true, profile: DEFAULT_PROFILE },
            { name: '신혜린', avatar: AVATARS.신혜린, status: 'working', workHours: '9 → 6', attendance: 53, profile: DEFAULT_PROFILE },
          ]},
        ]},
      ],
    },
  ],
};

/* ── Demo App (uses components) ── */
import { Icon } from './components';

export default function App() {
  const [currentPage, setCurrentPage] = useState('orgchart');

  return (
    <div className="app">
      <Sidebar menu={MENU} currentPage={currentPage} onNavigate={setCurrentPage} icons={ICONS} baseUrl={BASE} />
      <TopNav icons={ICONS} baseUrl={BASE} />

      {currentPage === 'orgchart' && (
        <OrgChartCanvas orgData={INITIAL_ORG} icons={ICONS} statIcons={STAT_ICONS} baseUrl={BASE} />
      )}

      {currentPage === 'oneonone' && (
        <OneOnOneContent Icon={Icon} />
      )}
    </div>
  );
}
