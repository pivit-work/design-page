/**
 * 조직도 「스쿼드」 탭 데모 데이터 — `OrgChartPage.jsx` 가 import 한다 (Figma 16605:49720).
 *
 * 모양은 `SquadCanvas` 의 props 계약 그대로다:
 *  - `SQUAD_PEOPLE`   명부 — `avatar` 는 이름 글자, 사진은 `photoUrl`. `status` 는 조직도 카드와 같은 재직 상태.
 *  - `SQUADS`         스쿼드 원장 — `members[].capacitySetBy` 가 없으면 「캐파 미설정」(합계 제외).
 *  - `PROJECT_OPTIONS` 조직의 프로젝트 — 카드 「담당 프로젝트」 추가 드롭다운의 후보.
 *
 * 숫자는 시안의 값을 따른다 — 커트 Phase1 40 + GTM 70 = 110(과부하), 오민준 GTM 캐파 미설정.
 * GTM 스쿼드만 종료일이 데모 「오늘」(2026-10-25) 앞이다 — 시안의 「종료일이 지난 진행중 스쿼드」 띠(17757:35809)를 보여 준다.
 */

const PHOTO = {
  커트: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
  김서윤: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
  강태양: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
  최현우: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
  김지수: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
  정다은: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
  박우진: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
  이서현: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face',
  박은지: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face',
};

const person = (id, name, title, team, extra = {}) => ({
  id, name, avatar: name.slice(0, 2), title, team, photoUrl: PHOTO[name] || null, ...extra,
});

export const SQUAD_PEOPLE = [
  person('u-kurt', '커트', '매니저', '프로덕트개발팀', { color: '#2e90fa', status: 'working' }),
  person('u-seoyun', '김서윤', '사원', 'People팀', { color: '#53b1fd', status: 'working' }),
  person('u-taeyang', '강태양', '대리', '프론트엔드', { color: '#3ccb7f', status: 'working' }),
  person('u-hyunwoo', '최현우', '과장', '백엔드개발', { color: '#9b8afb', status: 'standby' }),
  person('u-jisu', '김지수', '사원', 'UIUX 디자인', { color: '#ff692e', status: 'working' }),
  person('u-daeun', '정다은', '매니저', '비즈니스개발팀', { color: '#e478fa', status: 'working' }),
  person('u-woojin', '박우진', '매니저', '경영지원본부', { color: '#fac515', status: 'leave' }),
  person('u-seohyun', '이서현', '대리', 'People팀', { color: '#7a5af8', status: 'working' }),
  person('u-eunji', '박은지', '대리', 'UIUX 디자인', { color: '#ee46bc', status: 'working' }),
  // 사진이 없는 사람 — 이름 글자 동그라미로 선다.
  person('u-minjun', '오민준', '대리', '비즈니스개발팀', { color: '#0ba5ec', status: 'working' }),
  person('u-dahee', '윤다희', '사원', '프론트엔드', { color: '#17b26a', status: 'working' }),
];

/** 배정 한 줄 — 캐파(`allocationPct`)를 정한 사람은 본인이다(`capacitySetBy: 'self'`). */
const m = (userId, sharePct, allocationPct, role = 'member') => (
  allocationPct == null
    ? { userId, role, sharePct, allocationPct: 0 }
    : { userId, role, sharePct, allocationPct, capacitySetBy: 'self' }
);

export const PROJECT_OPTIONS = [
  { id: 'pj-phase1', name: 'Phase 1 개발', description: '핵심 제품 출시', status: 'active' },
  { id: 'pj-ds', name: '디자인 시스템 foundation 제작', status: 'planned' },
  { id: 'pj-insight', name: 'AI 인사이트 리포트', status: 'active' },
  { id: 'pj-gtm', name: 'GTM 런칭 캠페인', status: 'planned' },
  { id: 'pj-hr', name: 'HR 데이터 파이프라인', status: 'active' },
];

export const SQUADS = [
  {
    id: 'sq-phase1', kind: 'squad', name: 'Phase1 개발',
    mission: 'Phase 1 핵심 제품을 출시 가능한 품질로 완성한다',
    color: '#2e90fa', status: 'active', startDate: '2026-07-25', endDate: '2026-12-30',
    members: [
      m('u-seoyun', 30, 50), m('u-taeyang', 22, 45), m('u-hyunwoo', 18, 30),
      m('u-kurt', 15, 40, 'lead'), m('u-jisu', 7, 12),
    ],
    projects: [
      { id: 'pj-phase1', name: 'Phase 1 개발', status: 'active', progress: 38, isPrimary: true, linkedSquads: [{ squadId: 'sq-phase1', name: 'Phase1 개발' }] },
      { id: 'pj-ds', name: '디자인 시스템 foundation 제작', status: 'planned', progress: 8, isPrimary: false, primarySquadName: 'HR 데이터 스쿼드', canOpen: false, linkedSquads: [{ squadId: 'sq-phase1', name: 'Phase1 개발' }, { squadId: 'sq-hr', name: 'HR 데이터 스쿼드' }] },
    ],
  },
  {
    id: 'sq-insight', kind: 'squad', name: 'AI 인사이트 스쿼드',
    mission: '회의·스니핏 데이터를 AI 인사이트로 전환한다',
    color: '#7a5af8', status: 'done', startDate: '2026-01-25', endDate: '2026-06-30',
    members: [
      m('u-seoyun', 30, 50), m('u-taeyang', 22, 45), m('u-hyunwoo', 18, 30), m('u-daeun', 35, 60, 'lead'),
    ],
    projects: [
      { id: 'pj-insight', name: 'AI 인사이트 리포트', status: 'active', progress: 72, isPrimary: true, linkedSquads: [{ squadId: 'sq-insight', name: 'AI 인사이트 스쿼드' }] },
    ],
  },
  {
    id: 'sq-pipeline', kind: 'squad', name: 'AI 파이프라인 구축 및 하네스 엔지니어링',
    mission: '모델 평가 하네스와 데이터 파이프라인을 세운다',
    color: '#f79009', status: 'active', startDate: '2026-09-02', endDate: '2027-03-31',
    members: [m('u-woojin', 15, 70, 'lead'), m('u-eunji', 40, 30)],
    projects: [],
  },
  {
    id: 'sq-gtm', kind: 'tf', name: 'GTM 스쿼드',
    mission: '출시 메시지와 판매 채널을 준비한다',
    color: '#d444f1', status: 'active', startDate: '2026-07-01', endDate: '2026-10-15',
    members: [m('u-kurt', 15, 70, 'lead'), m('u-minjun', 0, null), m('u-dahee', 25, 20)],
    projects: [
      { id: 'pj-gtm', name: 'GTM 런칭 캠페인', status: 'planned', progress: 0, isPrimary: true, linkedSquads: [{ squadId: 'sq-gtm', name: 'GTM 스쿼드' }] },
    ],
  },
  {
    id: 'sq-hr', kind: 'squad', name: 'HR 데이터 스쿼드',
    mission: '인사 데이터를 한 곳에 모아 리포트로 잇는다',
    color: '#6172f3', status: 'planned', startDate: '2026-11-01', endDate: null,
    members: [m('u-seohyun', 100, 30, 'lead')],
    projects: [
      { id: 'pj-hr', name: 'HR 데이터 파이프라인', status: 'active', progress: 12, isPrimary: true, linkedSquads: [{ squadId: 'sq-hr', name: 'HR 데이터 스쿼드' }] },
      { id: 'pj-ds', name: '디자인 시스템 foundation 제작', status: 'planned', progress: 8, isPrimary: true, linkedSquads: [{ squadId: 'sq-phase1', name: 'Phase1 개발' }, { squadId: 'sq-hr', name: 'HR 데이터 스쿼드' }] },
    ],
  },
];
