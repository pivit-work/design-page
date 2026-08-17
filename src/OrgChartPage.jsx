import { useMemo, useState } from 'react';
import { OrgChartCanvas, ProjectCanvas } from './components';
import StateSwitcher from './devtools/StateSwitcher.jsx';
import { LABEL_KNOB, VOLUME_KNOB, knobKey, useKnobs } from './devtools/knobs.js';
import { stress, stressText } from './devtools/stress.js';

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

/* ── Demo Profiles ── */
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

/* ── Demo Org Data ── */
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

/* ── Collect subordinates from org tree ── */
function collectAllMembers(node) {
  let result = [];
  if (node.members) result.push(...node.members);
  if (node.children) node.children.forEach(c => { result = result.concat(collectAllMembers(c)); });
  return result;
}

function findSubordinates(orgData, member) {
  if (!member || !member.role) return [];

  function findMemberNode(node, target) {
    if (node.members) {
      const found = node.members.find(m => m.name === target.name && m.role === target.role);
      if (found) return node;
    }
    if (node.children) {
      for (const child of node.children) {
        const result = findMemberNode(child, target);
        if (result) return result;
      }
    }
    return null;
  }

  const parentNode = findMemberNode(orgData, member);
  if (!parentNode) return [];

  if (member.role === 'DL' || member.role === 'TL') {
    let subs = [];
    if (parentNode.children) {
      parentNode.children.forEach(child => {
        subs = subs.concat(collectAllMembers(child));
      });
    }
    if (parentNode.members) {
      subs.push(...parentNode.members.filter(m => m.name !== member.name));
    }
    return subs.map(m => ({
      name: m.name,
      role: m.role || '사원',
      avatar: m.avatar,
      online: m.status === 'working' || m.status === 'standby',
    }));
  }

  return [];
}

/* ── 상태 스위처 ─────────────────────────────────────────────────────────
   조직도 노드는 폭이 정해진 카드다. 팀 이름·직급은 관리자가 정의하는 값이라
   길이가 흔들리고, 노드 하나에 멤버가 몇 명까지 들어가는지도 조직마다 다르다. */
const NODE_TYPE_ALT = { long: '전략기획총괄본부', latin: 'Division', raw: 'division' };
const ROLE_ALT = { long: '디비전 리드 (본부장)', latin: 'Division Lead', raw: 'division_lead' };

const KNOBS = [VOLUME_KNOB, LABEL_KNOB];
const SWITCHER_NOTE = '항목 수: 노드별 멤버·하위 조직 (0개면 회사 노드만 남는다) / 라벨: 조직 이름·직급·구성원 이름';

/**
 * 조직 트리 전체에 knob 을 적용한다. volume 은 노드마다 멤버·자식 수를 바꾸고,
 * labels 는 이름·타입·직급을 스트레스한다. 기본값에서는 원본을 그대로 돌려준다.
 */
function shapeOrg(node, volume, labelMode) {
  // 기본값에서는 원본 트리를 그대로 — 새 객체를 만들면 픽스처를 마운트 시점에
  // state 로 스냅샷하는 OrgChartCanvas 와 굳이 어긋나게 된다.
  if ((!volume || volume === 'default') && (!labelMode || labelMode === 'default')) return node;

  const stressed = {
    ...node,
    // 조직 이름·사람 이름은 사용자가 적는 자유 입력이라 코드값 폴백이 없다 → stressText.
    name: stressText(node.name, labelMode),
    type: stress(node.type, labelMode, NODE_TYPE_ALT),
  };

  let members = node.members ?? [];
  let children = node.children ?? [];

  if (volume === 'empty') {
    members = [];
    children = [];
  } else if (volume === 'one') {
    members = members.slice(0, 1);
    children = children.slice(0, 1);
  } else if (volume === 'many' && members.length > 0) {
    // 한 노드에 멤버 15명 — 카드가 세로로 늘어나는지, 이름 줄이 깨지는지 본다.
    members = Array.from({ length: 15 }, (_, i) => {
      const base = members[i % members.length];
      return { ...base, name: `${base.name}${i + 1}`, selected: i === 0 ? base.selected : undefined };
    });
  }

  if (labelMode && labelMode !== 'default') {
    members = members.map((m) => ({
      ...m,
      name: stressText(m.name, labelMode),
      role: m.role ? stress(m.role, labelMode, ROLE_ALT) : m.role,
    }));
  }

  return {
    ...stressed,
    ...(node.members ? { members } : {}),
    ...(node.children ? { children: children.map((c) => shapeOrg(c, volume, labelMode)) } : {}),
  };
}

/**
 * OrgChartPage — 조직도 demo wrapper.
 *
 * orgSubTab ('orgchart' | 'project') 과 admin mode 는 조직도 페이지 내부
 * 관심사이므로 App 이 아닌 이 wrapper 가 소유한다. App 은 currentPage === 'orgchart'
 * 일 때 이 컴포넌트만 마운트한다.
 */
export default function OrgChartPage({ icons, statIcons, baseUrl, subTab, onSubTabChange }) {
  const { values: knobs, set: setKnob, reset: resetKnobs } = useKnobs(KNOBS);
  const [adminMode, setAdminMode] = useState(false);

  const orgData = useMemo(() => shapeOrg(INITIAL_ORG, knobs.volume, knobs.labels), [knobs.volume, knobs.labels]);
  const subordinates = (member) => findSubordinates(orgData, member);

  const switcher = (
    <StateSwitcher
      spec={KNOBS}
      values={knobs}
      onChange={setKnob}
      onReset={resetKnobs}
      note={SWITCHER_NOTE}
    />
  );

  if (subTab === 'project') {
    return (
      <>
        <ProjectCanvas
          key={knobKey(knobs)}
          onSubTabChange={onSubTabChange}
          statIcons={statIcons}
          baseUrl={baseUrl}
          findSubordinates={subordinates}
          adminMode={adminMode}
          orgData={orgData}
        />
        {switcher}
      </>
    );
  }

  return (
    <>
      <OrgChartCanvas
        key={knobKey(knobs)}
        orgData={orgData}
        icons={icons}
        statIcons={statIcons}
        baseUrl={baseUrl}
        onSubTabChange={onSubTabChange}
        findSubordinates={subordinates}
        adminMode={adminMode}
        onAdminModeChange={setAdminMode}
      />
      {switcher}
    </>
  );
}
