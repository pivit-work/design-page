/* 「내 원온원」 — 내가 1on1 **대상자(팀원)** 일 때 보는 준비 화면의 데모 데이터.
   Figma 17416:27949(작성 중 · 1/4) · 17556:23830(준비 완료 · 매니저 녹음 중 · 4/4) ·
   17556:25936(오른쪽 위젯 4단계). 실제 구현에서는 pivit-work 가 회차 payload 로 채운다.
   날짜·기간은 호스트가 완성된 글자로 넘기는 규칙이라 여기서도 글자로 둔다. */

export const MY_MANAGER = { name: '이서연', badge: '매니저', avatar: 'https://i.pravatar.cc/200?img=47' };

export const MEMBER_MEETING = {
  title: '1on1  •  2026.04.12',
  time: '2026.04.08 · 수시 · 2026.03.06 – 2026.04.08',
  widgetTime: '2026.04.08 · 11:00 ~',
  widgetTimeEnded: '2026.04.08 · 11:00 ~ 11:14',
  recordedAt: '14:10',
};

/* 사유/코멘트 AI 초안의 근거 — 매니저 진행 준비 화면의 출처 딱지와 같은 어휘 */
export const SOURCE_BADGES = ['Daily Snippet', '회의록', '피드백', '기존1on1'];

export const ACTION_STATUS_OPTIONS = [
  { value: 'done', label: '완료' },
  { value: 'doing', label: '진행 중' },
  { value: 'todo', label: '미완료' },
];

/* 지난 회차 액션아이템 — 완료가 아닌 것만 사유/코멘트 칸이 열린다 */
const PREV_ACTIONS = [
  { id: 'pa-1', title: '신규 온보딩 플로우 문서화', owner: '나', due: '3/12', status: 'done' },
  { id: 'pa-2', title: 'A팀 협업 미팅 주선', owner: '나', due: '3/19', status: 'doing', comment: '' },
  { id: 'pa-3', title: '성과 지표 재설정 논의', owner: '나', due: '3/28', status: 'todo', comment: '' },
];
export const PREV_ACTION_AI_COMMENTS = {
  'pa-2': '회의록(3/19) 기준 A팀 담당자 연락 시도 기록 있으나 채널 미개설 상태 지속.',
  'pa-3': '매니저 담당 항목. 스니핏 및 회의록에서 별도 진행 기록 없음.',
};

const OKR_SELF = [
  {
    kr: 'KR1. 신규 고객 전환율 15% 달성',
    actual: 62,
    self: 70,
    comment: 'A/B 테스트 결과 적용(스니핏 12건 중 5건 관련)이 주요 기여 요인입니다. 현재 속도라면 기한 내 달성 가능할 것으로 보입니다.',
  },
  {
    kr: 'KR2. NPS 스코어 45점 이상',
    actual: 50,
    self: 55,
    alert: '자가 평가가 실제보다 5%p 높음 — 인식 정합 논의 권장',
    comment: '고객 인터뷰 일정이 3주째 미확정 상태입니다. 인터뷰 없이는 개선 방향을 잡기 어렵고, 이것이 현재 가장 큰 병목입니다.',
  },
];

/* 지난 회차에 내가 남긴 Upward Feedback — 보고서 생성 전 카드 바닥에 보인다 */
const UPWARD_FEEDBACK_PREV = '"이번 분기 방향 공유가 명확했습니다. 우선순위가 자주 바뀌는 부분이 아쉬웠어요."';

/* AI 보고서 — 생성 전(placeholder) 과 생성 후(업무 요약 · 앞으로 필요한 것) */
const REPORT_BEFORE = {
  generated: false,
  source: 'Daily Snippet · 회의록 · 피드백 — Daily Snippet 12건 · 회의록 3건 · 피드백 2건',
  placeholder: '위의 버튼을 눌러 AI 보고서를 생성하세요. 업무 요약, OKR 현황, 블로커 및 지원 요청이 하나의 보고서로 통합됩니다.',
};
export const REPORT_AFTER = {
  generated: true,
  summarySource: 'AI 생성됨 — Daily Snippet 12건 · 회의록 3건 · 피드백 2건',
  summary: {
    wins: '온보딩 플로우 문서화를 기한 내 완료하고 팀 전체에 공유했습니다. 신규 고객 3사 온보딩을 성공적으로 진행했으며, A/B 테스트 결과 분석을 통해 전환율 개선안을 제안했습니다.',
    hard: 'A팀 협업 채널 미개설로 크로스팀 이슈 처리가 2주째 지연되고 있습니다. 3/19 회의록에서도 같은 문제가 반복 언급됐습니다.',
    focus: 'NPS 개선을 위한 고객 인터뷰 일정 확정과 KR1 전환율 달성을 위한 랜딩 페이지 최적화에 집중하고 있습니다.',
  },
  needsSource: 'AI 생성됨 — Daily Snippet · 회의록 · 피드백 기반',
  needs: {
    blockers: '① A팀 협업 채널 미개설 (회의록 3/19, 스니핏 2건에서 반복 언급) ② NPS 고객 인터뷰 일정 미확정 — 담당자 컨택 필요',
    support: 'A팀 리더와의 직접 연결 또는 채널 개설을 위한 매니저 개입이 필요합니다. 고객 인터뷰 대상자 추천도 요청드립니다.',
    resources: '고객 인터뷰 진행을 위한 리서치 도구 접근 권한(Maze 또는 Typeform Pro) 필요합니다.',
  },
};

const CAPABILITIES = [
  { key: 'expertise', label: '업무 전문성', value: 5 },
  { key: 'communication', label: '커뮤니케이션', value: 3 },
  { key: 'problemSolving', label: '문제 해결력', value: 4 },
  { key: 'teamwork', label: '협업 / 팀워크', value: 5 },
  { key: 'selfDriven', label: '자가주도성', value: 2 },
];

const GROWTH_EMPTY = {
  skills: { value: '', placeholder: '이번 분기 집중하고 싶은 스킬이나 역량' },
  projects: { value: '', placeholder: '현재 역할 외에 관심 있는 것' },
  career: { value: '', placeholder: '1~3년 후 어떤 역할을 원하는지' },
  comment: { value: '', placeholder: '역량에 대한 추가 의견이나 맥락' },
};
const GROWTH_FILLED = {
  skills: { value: '프로덕트 디스커버리 방법론, 데이터 분석 기반 의사결정', ai: true },
  projects: { value: '사용자 리서치 프로젝트를 직접 리드해보고 싶습니다.', ai: true },
  career: { value: 'PM 트랙 전환 희망 · 2026 하반기 목표', ai: true },
  comment: { value: '팀워크 부분은 자신 있지만 커뮤니케이션과 자기주도성은 더 발전시키고 싶습니다.' },
};

const RECOGNITION_EMPTY = {
  upward: { value: '', placeholder: '매니저가 더 잘할 수 있는것, 감사한 것' },
  peers: { value: '', placeholder: '팀원 중 인정하고 싶은 것' },
};
const RECOGNITION_FILLED = {
  wins: { value: '프로덕트 디스커버리 방법론, 데이터 분석 기반 의사결정', ai: true },
  upward: { value: '', placeholder: '매니저가 더 잘할 수 있는것, 감사한 것' },
  peers: { value: '', placeholder: '팀원 중 인정하고 싶은 것' },
};

const AGENDA_TOPICS = [
  { id: 't-1', text: 'A팀 협업 채널 — 블로커 해소 방안 논의' },
  { id: 't-2', text: 'KR2 NPS — 고객 인터뷰 일정 확정' },
];
export const AGENDA_TOPIC_SUGGESTION = { id: 't-3', text: '커리어 성장 기회 검토 (PM 트랙)' };
const AGENDA_ACTIONS = [
  { id: 'a-1', text: 'A팀 협업 채널 개설 요청', owner: '나', due: '이번주' },
  { id: 'a-2', text: 'PM 전환 HR 상담 연결', owner: '나', due: '4/22' },
];

/* 화면 단계별 props 묶음 — 페이지 wrapper 가 그대로 펼쳐 넘긴다 */
export const MEMBER_PREP_PROPS = {
  phase: 'prep',
  meetingTitle: MEMBER_MEETING.title,
  meetingTime: MEMBER_MEETING.time,
  manager: MY_MANAGER,
  readiness: { done: 1, total: 4 },
  prevSession: { dateLabel: '지난 원온원 • 2026.03.05', actions: PREV_ACTIONS, sources: SOURCE_BADGES },
  report: REPORT_BEFORE,
  okr: OKR_SELF,
  upwardFeedbackPrev: UPWARD_FEEDBACK_PREV,
  growth: GROWTH_EMPTY,
  capabilities: CAPABILITIES,
  recognition: RECOGNITION_EMPTY,
  agenda: { topics: AGENDA_TOPICS, actions: AGENDA_ACTIONS },
};

export const MEMBER_READY_PROPS = {
  phase: 'ready',
  meetingTitle: MEMBER_MEETING.title,
  meetingTime: MEMBER_MEETING.time,
  manager: MY_MANAGER,
  readiness: { done: 4, total: 4 },
  prevSession: {
    dateLabel: '지난 원온원 • 2026.03.05',
    sources: SOURCE_BADGES,
    actions: PREV_ACTIONS.map((a) => ({ ...a, comment: PREV_ACTION_AI_COMMENTS[a.id] ?? '', commentAi: !!PREV_ACTION_AI_COMMENTS[a.id] })),
  },
  report: REPORT_AFTER,
  okr: OKR_SELF,
  growth: GROWTH_FILLED,
  capabilities: CAPABILITIES,
  recognition: RECOGNITION_FILLED,
  agenda: { topics: [...AGENDA_TOPICS, AGENDA_TOPIC_SUGGESTION], topicsAi: true, actions: AGENDA_ACTIONS },
};
