import OneOnOneCanvasV2 from './components/oneonone/OneOnOneCanvasV2.jsx';

/* ── Asset URLs (demo-only) ──
   pravatar.cc 의 1~70 번 사진 중에서 새로고침마다 랜덤으로 5장을 뽑아 매핑한다. */
function pickAvatars(count) {
  const pool = Array.from({ length: 70 }, (_, i) => i + 1);
  const out = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out.map((n) => `https://i.pravatar.cc/200?img=${n}`);
}

const [P0, P1, P2, P3, P4] = pickAvatars(5);
const PROFILES = { kim: P0, choi: P1, seo: P2, yu: P3, yun: P4 };

const BRIEFING = {
  date: '4월 26일',
  title: '팀 현황 브리핑',
  metrics: { teamHealth: '7.0', redFlags: '1건', oneOnOneAvg: '18일 전' },
};

const KPIS = {
  completion: { current: 3, total: 5, label: '이번 달 예정 5회' },
  actionRate: 72,
  speakRatio: { manager: 35, member: 62 },
};

const SCHEDULED_TODAY = [
  {
    id: 'today-1',
    name: '김서윤',
    role: 'Frontend Deveolper',
    avatar: PROFILES.seo,
    severity: 'urgent',
    healthScore: '4.2',
    healthSeverity: 'critical',
    comment:
      '헬스가 4.2로 급락했습니다. 번아웃 징후가 보이므로 이번 주 원온원을 잡아보세요. 최근 3일간 스니펫 미작성 상태입니다.',
    schedule: { date: '2026.04.20', time: '11:00', duration: '55분', changeable: true },
    actions: [
      { label: '1on1 진행', variant: 'primary' },
      { label: '스니핏 요청' },
      { label: '노트' },
    ],
  },
];

const NEEDS_ATTENTION = [
  {
    id: 'attn-1',
    name: '김정호',
    role: 'Frontend Deveolper',
    avatar: PROFILES.kim,
    severity: 'warning',
    healthScore: '5.1',
    healthSeverity: 'warning',
    comment: '헬스가 5.1로 주의 구간에 있습니다. 마지막 원온원이 24일 전이므로 빠른 시일 내 일정을 잡아보세요.',
    schedule: { date: '2026.04.20', time: '11:00', duration: '55분', changeable: true },
    actions: [
      { label: '1on1 진행', variant: 'primary' },
      { label: '스니핏 요청' },
      { label: '노트' },
    ],
  },
  {
    id: 'attn-2',
    name: '최수현',
    role: 'Frontend Deveolper',
    avatar: PROFILES.choi,
    badge: 'P미팅',
    severity: 'warning',
    healthScore: '7.9',
    healthSeverity: 'warning',
    comment: '스코프 초과 우려가 감지되었습니다. 현재 업무량이 목표 대비 130% 수준입니다. 이번 주 업무 조정이 필요합니다.',
    actions: [
      { label: '1on1 잡기' },
      { label: '스니핏 요청' },
      { label: '노트' },
    ],
  },
];

const GOOD = [
  {
    id: 'good-1',
    name: '김유진',
    role: 'Frontend Deveolper',
    avatar: PROFILES.yu,
    severity: 'good',
    healthScore: '9',
    healthSeverity: 'good',
    comment: '최근 2주간 안정적인 컨디션을 유지하고 있습니다. 현재 상태를 유지해주세요.',
    actions: [{ label: '노트' }],
  },
  {
    id: 'good-2',
    name: '윤다희',
    role: 'Frontend Deveolper',
    avatar: PROFILES.yun,
    severity: 'praise',
    healthScore: '9',
    healthSeverity: 'good',
    comment: 'KR 진척률이 85%로 순조롭습니다. 격려 메시지를 보내보세요.',
    actions: [{ label: '노트' }],
  },
];

/**
 * 1on1 페이지 wrapper — Figma node 16816:33877.
 * demo 데이터 + 라벨 보유, OneOnOneCanvasV2 에 props 로 전달.
 */
export default function OneOnOnePage({ icons, baseUrl }) {
  return (
    <OneOnOneCanvasV2
      title="1on1"
      managerName="김지수"
      teamCount={5}
      briefing={BRIEFING}
      message="김서윤의 헬스가 급락 중입니다. 2명의 팀원과 원온원이 3주 이상 밀려 있습니다."
      kpis={KPIS}
      sections={[
        {
          key: 'today',
          title: '오늘 예정',
          count: SCHEDULED_TODAY.length,
          countColor: 'var(--text-brand-secondary)',
          members: SCHEDULED_TODAY,
        },
        {
          key: 'attention',
          title: '주의 필요',
          count: NEEDS_ATTENTION.length,
          countColor: 'var(--text-error-primary)',
          members: NEEDS_ATTENTION,
        },
        {
          key: 'good',
          title: '양호',
          count: GOOD.length,
          countColor: 'var(--colors-foreground-fgSuccessPrimary)',
          members: GOOD,
        },
      ]}
      icons={icons}
      baseUrl={baseUrl}
    />
  );
}
