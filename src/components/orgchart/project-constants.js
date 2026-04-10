export const PROJECT_STATUSES = {
  inProgress: { label: '진행 중', dotColor: 'var(--utility-blue-500)', textColor: 'var(--utility-blue-500)' },
  preparing: { label: '준비 중', dotColor: 'var(--text-tertiary)', textColor: 'var(--text-tertiary)', icon: '/icons-solid/clock-fast-forward.svg' },
  completed: { label: '완료', textColor: 'var(--text-brand-tertiary)', icon: '/icons-solid/check.svg' },
};

export const PROJECTS = [
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
    name: 'AI 파이프라인 구축 및 하네스 엔지니어링',
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

export const MEMBERS = [
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

export const FILTER_TABS = [
  { key: 'all', label: '전체' },
  { key: 'preparing', label: '준비 중' },
  { key: 'inProgress', label: '진행중' },
  { key: 'completed', label: '완료' },
];

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
export function generateRandomMembers(count, projectIds) {
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
