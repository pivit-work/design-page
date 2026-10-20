/**
 * LIVE 「AI 대화 네비게이터」 데모 데이터 — Figma 17556:26766 (생성 후 1단계) · 17589:23524 (미생성).
 * 서버가 주는 가이드(`arch-1on1-ai-spec.md` NEW-07) 모양 그대로. OneOnOnePage 가 「시작하기」 뒤
 * 오른쪽 기둥의 `LiveGuideCard` 에 넘긴다.
 */
export const GUIDE_SOURCE_LABELS = ['AI 브리핑', '아젠다', 'Daily Snippet', 'Health Check', '이전 원온원'];

export const DEMO_GUIDE = {
  totalMin: 55,
  isFallback: false,
  regenCount: 0,
  generatedAt: '2026-04-12T11:00:00+09:00',
  sourcesUsed: GUIDE_SOURCE_LABELS,
  stages: [
    {
      id: 'icebreak',
      order: 1,
      title: '아이스브레이킹',
      timeRange: [0, 5],
      goal: '긴장을 풀고 심리적 안전감을 만듭니다. 바로 업무 얘기로 들어가지 마세요.',
      script: [
        '민준님, 지난주 A/B 테스트 결과 공유하신 거 봤어요. 팀 반응도 좋던데 — 그 얘기부터 잠깐 들려주실래요?',
        '본격적으로 시작하기 전에, 요즘 일 말고 근황은 어때요? 지난번에 말씀하신 러닝은 계속하고 계세요?',
      ],
      questions: [
        '이번 주에 제일 기분 좋았던 순간이 있었어요?',
        '요즘 에너지 수준을 10점 만점으로 치면 몇 점쯤이에요?',
      ],
      watchouts: [
        'Health Check 몰입도가 7→5로 하락 중입니다. 근황 답변이 짧거나 방어적이면 ⑥ 몰입도 체크 단계에서 더 깊게 다루세요.',
      ],
    },
    {
      id: 'agenda',
      order: 2,
      title: '아젠다 합의',
      timeRange: [5, 10],
      goal: '오늘 다룰 주제를 함께 정합니다. 멤버가 올린 아젠다를 먼저 읽습니다.',
      script: ['민준님이 올려주신 아젠다 세 가지 중에 오늘 꼭 다루고 싶은 걸 먼저 골라볼까요?'],
      questions: ['오늘 이 시간이 끝났을 때 어떤 게 정리돼 있으면 좋겠어요?'],
      watchouts: [],
    },
    {
      id: 'blocker',
      order: 3,
      title: '블로커 해소',
      timeRange: [10, 20],
      goal: 'A팀 협업 채널 미개설이 2주 연속 블로커입니다. 매니저가 직접 개입할 지점을 정합니다.',
      script: ['A팀 채널 건은 제가 리더한테 직접 연락할게요. 이번 주 안에 열리면 민준님 쪽에서 바로 필요한 게 뭐예요?'],
      questions: ['제가 지금 당장 풀어드릴 수 있는 게 하나 있다면 뭘까요?'],
      watchouts: ['이전 2회 1on1 에서도 같은 블로커가 언급됐습니다. 이번에는 기한을 명시한 액션아이템으로 남기세요.'],
    },
    {
      id: 'okr',
      order: 4,
      title: 'OKR 인식 정합',
      timeRange: [20, 30],
      goal: 'KR2 자가 평가(55%)와 실제(50%)의 갭을 함께 확인합니다.',
      script: ['KR2 를 55% 로 보셨는데 대시보드는 50% 예요. 어디서 차이가 났다고 느끼세요?'],
      questions: ['고객 인터뷰 일정이 3주째 안 잡힌 가장 큰 이유가 뭐라고 보세요?'],
      watchouts: [],
    },
    {
      id: 'career',
      order: 5,
      title: '커리어 논의',
      timeRange: [30, 40],
      goal: 'PM 트랙 전환 의향이 3회 기록됐습니다. 이번에는 결론을 미루지 않습니다.',
      script: ['PM 쪽 얘기를 여러 번 꺼내셨잖아요. 오늘은 그걸 좀 제대로 얘기해보면 어때요?'],
      questions: ['6개월 뒤에 어떤 일을 하고 있으면 좋겠어요?'],
      watchouts: ['결론을 또 미루면 이직 가능성이 높아질 수 있습니다. HR 상담 연결 여부를 이 자리에서 정하세요.'],
    },
    {
      id: 'engagement',
      order: 6,
      title: '몰입도 체크',
      timeRange: [40, 48],
      goal: '지난 4주 몰입도 하락(7→5)의 원인을 가볍게 짚습니다.',
      script: ['요즘 에너지 수준은 어때요? 부담 없이 얘기해 주세요.'],
      questions: ['일 말고 다른 것 때문에 지치는 건 없어요?'],
      watchouts: [],
    },
    {
      id: 'wrapup',
      order: 7,
      title: '랩업',
      timeRange: [48, 55],
      goal: '오늘 합의한 액션아이템과 다음 1on1 일정을 확인합니다.',
      script: ['오늘 정한 것 세 가지를 제가 다시 읽어볼게요. 빠진 거 있으면 말씀해 주세요.'],
      questions: ['다음 1on1 전까지 제가 챙겨야 할 게 있을까요?'],
      watchouts: [],
    },
  ],
};
