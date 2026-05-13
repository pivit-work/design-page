import { useState } from 'react';
import OneOnOneCanvasV2 from './components/oneonone/OneOnOneCanvasV2.jsx';

/* ── StartOneOnOneView 데모 데이터 ──
   실제 구현에서는 pivit-work 의 prepareSession API 결과 등으로 채운다. */
const DEMO_START_DATA = {
  meetingTitle: '1on1 • 2026.04.12',
  meetingTime: '2026.04.08 · 수시 · 2026.03.06 – 2026.04.08',
  recordingMeta: { time: '2026.04.08 · 11:00 ~', elapsed: '04:29', wave: [5, 5, 14, 9, 9, 12] },
  // 멤버 READY view 7섹션 중 완료 — 데모용 50%.
  // (매니저 준비도는 컴포넌트 내부 confirmedCount/4 자동 계산이므로 prop 불필요)
  memberReadyPct: 50,
  briefing: {
    summary:
      '김민준 님은 이번 기간(3/6–4/8) 동안 KR1(전환율 15%)을 72%까지 달성했으며 A/B 테스트 적용과 온보딩 문서화가 주요 기여 요인입니다. 반면 KR2(NPS 45점)는 실제 진행률 50%로 자가 평가(55%)보다 낮게 나타났고, 고객 인터뷰 일정이 3주째 미확정 상태입니다. A팀 협업 채널 미개설이 2주 연속 블로커로 기록되었으며, 커리어 방향(PM 전환)에 대한 논의 요청이 Daily Snippet에서 2회, 이전 1on1에서 1회 확인됩니다. Health Check 기준 이번 달 몰입도는 소폭 하락(7→5) 중입니다.',
    flags: [
      { label: '블로커 미해결(2건)', tone: 'error', icon: '/icons-solid/slash-circle-01.svg' },
      { label: 'KR2 목표 대비 지연', tone: 'warning', icon: '/icons-solid/alert-triangle.svg' },
      { label: '커리어 논의 요청', tone: 'blue', icon: '/icons-solid/message-notification-circle.svg' },
      { label: '몰입도 하락', tone: 'purple', icon: '/icons-solid/corner-right-down.svg' },
    ],
    coachingGuide: [
      {
        title: '블로커 해소 (긴급)',
        body: 'A팀 협업 채널 미개설이 2주 연속 업무 지연의 주요 원인으로 기록됩니다. 이번 미팅에서 매니저가 A팀 리더에게 직접 연락하는 것을 명시적 액션아이템으로 합의하고, 완료 기한을 이번 주 내로 설정하세요.',
      },
      {
        title: 'OKR 인식 정합 (중요)',
        body: '팀원이 KR2를 55%로 자가 평가하고 있으나 실제는 50%입니다. 고객 인터뷰 일정을 4/15까지 확정하는 것을 다음 KR2 달성의 선행 조건으로 함께 확인하고, 구체적 책임자와 방법을 이번 미팅에서 결정하세요.',
      },
      {
        title: '커리어 논의 (필요)',
        body: 'PM 트랙 전환 의향이 최소 3회 기록되었습니다. 이번 미팅에서 구체적인 전환 로드맵을 논의하거나, 전환이 현실적으로 가능한지 HR 상담 연결 여부를 결정하세요. 결론을 미루면 이직 가능성이 높아질 수 있습니다.',
      },
      {
        title: '몰입도 하락 모니터링 (주의)',
        body: '지난 4주간 Health Check 몰입도가 7→5로 하락했습니다. 블로커 지속·커리어 불확실성과 연관 가능성이 있습니다. 미팅 중 부담 없이 물어보세요: "요즘 에너지 수준은 어때요?"',
      },
    ],
  },
  memberReport: {
    text: '이번 기간(2026.03.06–04.08) 동안 온보딩 플로우 문서화를 기한 내 완료하고 팀 전체에 공유했습니다. 신규 고객 3사 온보딩을 성공적으로 진행했으며, A/B 테스트 결과를 분석해 전환율 개선안을 제안했습니다.\n\nKR1(신규 고객 전환율 15%)은 72%로 순항 중입니다. A/B 테스트 결과 적용이 주요 기여 요인이며 현재 속도 유지 시 기한 내 달성 가능합니다. KR2(NPS 45점)는 50%로, 고객 인터뷰 일정이 3주째 미확정 상태인 것이 현재 가장 큰 병목입니다.\n\n현재 블로커는 ① A팀 협업 채널 미개설(회의록 3/19, 스니핏 2건 반복 언급) ② NPS 고객 인터뷰 일정 미확정입니다. 매니저의 A팀 리더 직접 연결 또는 채널 개설 개입과 고객 인터뷰 대상자 추천이 필요합니다. 인터뷰 진행을 위한 리서치 도구(Maze 또는 Typeform Pro) 접근 권한도 요청드립니다.',
    source: '출처: Daily Snippet 12건 · 회의록 3건 · 피드백 2건',
  },
  okrSelf: [
    { kr: 'KR1. 신규 고객 전환율 15% 달성', actual: 62, self: 70 },
    {
      kr: 'KR2. NPS 스코어 45점 이상',
      actual: 50,
      self: 55,
      alert: '자가 평가가 실제보다 5%p 높음 — 인식 정합 논의 권장',
    },
  ],
  upwardFeedback:
    '"이번 분기 방향 공유가 명확했습니다. 우선순위가 자주 바뀌는 부분이 아쉬웠어요."',
  capabilities: [
    { key: 'expertise', label: '업무 전문성', value: 5 },
    { key: 'communication', label: '커뮤니케이션', value: 3 },
    { key: 'problemSolving', label: '문제 해결력', value: 4 },
    { key: 'teamwork', label: '협업 / 팀워크', value: 5 },
    { key: 'selfDriven', label: '자가주도성', value: 2 },
  ],
  memberAgendas: [
    'A팀 협업 채널 — 블로커 해소 방안 논의',
    'KR2 NPS — 고객 인터뷰 일정 확정',
    '커리어 성장 기회 검토 (PM 트랙)',
  ],
  initialMgrAgendas: ['KR2 집중 지원 방안 논의', 'PM 전환 로드맵 — HR 상담 연결 결정'],
  expectedActions: [
    { text: 'A팀 협업 채널 개설 요청', owner: '나', due: '이번주' },
    { text: 'PM 전환 HR 상담 연결', owner: '나', due: '4/22' },
  ],
};

const DEMO_AI_DRAFTS = {
  strengths:
    '온보딩 플로우 문서화를 기한 내 완료하고 팀 전체에 공유한 점이 인상적입니다. A/B 테스트 결과를 분석해 전환율 개선안까지 제안한 주도성도 강점입니다. 어려운 상황(A팀 블로커)에서도 우회 경로를 찾아 KR1 진척을 유지했습니다.',
  sbi:
    '(Situation) 3/19 팀 회의에서 (Behavior) A팀 협업 채널 이슈를 공유했지만 후속 에스컬레이션 없이 2주간 같은 블로커가 반복되었고 (Impact) KR2 진행이 지연되었습니다. 다음엔 블로커 발견 즉시 매니저에게 에스컬레이션해 주세요.',
  support:
    '① A팀 리더에게 매니저가 직접 연결 — 이번 주 내. ② NPS 고객 인터뷰 대상자 3명 추천 + 리서치 도구(Maze/Typeform Pro) 권한 신청 대행. ③ PM 전환 관련 HR 상담 일정 주선.',
};

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
  // 데모: "AI 초안 전체 생성" 버튼이 항상 즉시 채워지도록 stub.
  const [aiDrafts, setAiDrafts] = useState(null);
  const handleGenerateDrafts = () => setAiDrafts(DEMO_AI_DRAFTS);
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
      startOneOnOneData={DEMO_START_DATA}
      aiDrafts={aiDrafts}
      onGenerateDrafts={handleGenerateDrafts}
    />
  );
}
