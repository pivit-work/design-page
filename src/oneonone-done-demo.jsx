import { useEffect, useState } from 'react';
import Avatar from './components/shared/Avatar.jsx';
import RecordingPlayerRow from './components/shared/RecordingPlayerRow.jsx';

/**
 * 매니저 DONE(종료 후) 화면 데모 데이터 — Figma 16954:15096 「원온원 매니저」.
 *
 * OneOnOnePage 가 상태 스위처 「화면: DONE」 에서 `<DoneOneOnOneView {...DONE_DEMO_PROPS} />` 로
 * 그린다. 글은 시안 노드의 것을 그대로 옮겼다(팀원 김민준 · 매니저 이서연). 콜백은 전부
 * 빈 함수다 — 저장·공개·예약은 pivit-work 가 붙인다.
 */

/* ── 녹음 재생기 (17590:23662) — 「04:32 / 53:00 · 녹음 보관 D-90」 에서 시작해 ▶ 를 누르면
   1초에 1초씩 진행률만 오른다. 소리는 없다. 모양은 `RecordingPlayerRow` 의 `is-centered` 변형. */
const TOTAL_SEC = 53 * 60;
const PLAYER_LABELS = { play: '재생', pause: '일시정지', seek: '재생 위치' };
const fmtClock = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

function DoneDemoRecordingPlayer() {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(4 * 60 + 32);
  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => {
      setElapsed((v) => {
        if (v + 1 >= TOTAL_SEC) { setPlaying(false); return TOTAL_SEC; }
        return v + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing]);
  return (
    <RecordingPlayerRow
      className="is-centered"
      playing={playing}
      onToggle={() => setPlaying((v) => !v)}
      progress={elapsed / TOTAL_SEC}
      onSeek={(ratio) => setElapsed(Math.round(ratio * TOTAL_SEC))}
      timeText={`${fmtClock(elapsed)} / ${fmtClock(TOTAL_SEC)}`}
      retentionText="녹음 보관 D-90"
      labels={PLAYER_LABELS}
      testIdPrefix="ono-done-recording"
    />
  );
}

const noop = () => {};

export const DONE_DEMO_PROPS = {
  session: {
    id: 'demo-done-1',
    startedAt: '2026-04-12T10:00:00+09:00',
    durationSec: 42 * 60,
    sttStatus: 'done',
    managerName: '이서연',
    /* 16954:15128 — AI 미팅 요약 */
    aiSummary:
      '42분간 진행된 이번 1on1에서는 KR2(NPS) 지연에 대한 원인 분석과 고객 인터뷰 일정 확정이 주요 논의였습니다. A팀 협업 채널 블로커는 매니저(이서연)가 직접 A팀 리더에게 연락하기로 합의했고, PM 트랙 전환에 대해서는 HR 상담을 4/22까지 연결하기로 결정했습니다. 전반적으로 건설적인 대화가 이루어졌으며, 김민준 님의 성장 의지가 명확히 확인되었습니다.',
    keyDecisions: [
      { title: 'A팀 협업 채널', badge: '합의', text: '이서연 매니저가 A팀 리더에게 직접 연락하여 이번 주 내 개설' },
      { title: 'KR2 NPS', badge: '합의', text: '고객 인터뷰 대상자 5명을 4/15까지 확정. 이서연이 3명, 김민준이 2명 섭외' },
      { title: 'PM 트랙 전환', badge: '합의', text: 'HR 상담 일정을 4/22까지 연결. 6개월 전환 로드맵 초안은 김민준이 작성' },
      { title: 'Maze 리서치 도구 접근 권한', badge: '합의', text: '이서연이 HR에 신청 (4/12까지)' },
    ],
    nextTopics: [
      'KR2 자가 평가(55%)와 실제(50%) 간 갭에 대해 김민준 님이 인지했으나, 구체적 개선 계획은 다음 1on1에서 재확인 필요',
      '몰입도 하락(7→5)에 대해 블로커 해소 후 자연 회복 여부를 2주 후 점검하기로 함',
    ],
    recurringPatterns: [
      '블로커 에스컬레이션 지연 패턴 — 이전 2회 1on1에서도 동일 블로커가 언급됨. 이번에 매니저가 직접 개입하기로 한 것은 패턴 전환 시도',
      '커리어 논의 미루기 패턴 — 3회 연속 아젠다에 올랐으나 항상 시간 부족으로 간략 논의만. 이번에 HR 상담 일정을 잡은 것은 진전',
    ],
    /* 16954:15206 — 매니저 피드백 */
    managerFeedback: [
      {
        key: 'strengths',
        text: '온보딩 플로우 문서화를 기한 내 완료하고 팀 전체에 명확하게 공유한 점이 인상적이었습니다. 특히 비개발자도 이해할 수 있도록 문서 수준을 조정한 것은 협업 측면에서 큰 강점입니다. 신규 고객 3사 온보딩을 성공적으로 완료한 것도 이번 분기 주요 성과입니다.',
      },
      {
        key: 'sbi',
        text: '[상황] 3월 셋째 주 A팀 협업 채널 개설이 필요한 시점에서 [행동] 직접 A팀 담당자에게 연락하지 않고 매니저 지원을 기다린 결과 [영향] 2주간 크로스팀 이슈 처리가 지연되었습니다. 다음번에는 블로커 발생 즉시 직접 에스컬레이션하거나 매니저에게 먼저 알려주세요.',
      },
      {
        key: 'support',
        text: '① A팀 리더 직접 연락 → 이번 주 내 채널 개설 ② NPS 인터뷰 대상자 3명 추천 (4/15) ③ Maze 접근 권한 HR 신청 (4/12) ④ PM 전환 HR 상담 일정 연결 (4/22)',
      },
    ],
    isShared: false,
    /* 16954:15356 — 액션 아이템 */
    actionItems: [
      { id: 'a1', text: 'A팀 리더에게 직접 연락 — 협업 채널 이번 주 내 개설', owner: 'manager', dueDate: '4/12', ai: true, done: false },
      { id: 'a2', text: 'NPS 고객 인터뷰 대상자 3명 추천', owner: 'member', dueDate: '4/12', ai: true, done: false },
      { id: 'a3', text: 'NPS 고객 인터뷰 대상자 2명 섭외', owner: 'member', dueDate: '4/12', ai: true, done: false },
      { id: 'a4', text: 'Maze 접근 권한 HR 신청', owner: 'member', dueDate: '4/12', ai: true, done: false },
    ],
    nextPreMemo: '',
  },
  manager: { name: '이서연' },
  /* 17556:24905 — 머리 */
  memberName: '김민준',
  memberBadge: 'P미팅',
  memberMeta: '2026.04.08 · 수시 · 2026.03.06 – 2026.04.08',
  avatar: <Avatar name="김민준" photo="https://i.pravatar.cc/200?img=52" size={48} />,
  formatDate: () => '2026.04.12',
  recordingPlayer: <DoneDemoRecordingPlayer />,
  /* 16954:15167 — OKR 자가 평가 */
  okrSelf: [
    { id: 'kr1', kr: 'KR1. 신규 고객 전환율 15% 달성', actual: 62, self: 70, discussed: true, note: 'AI A/B 테스트 결과 적용 중. 현재 속도 유지 시 목표 달성 가능' },
    { id: 'kr2', kr: 'KR2. NPS 스코어 45점 이상', actual: 50, self: 55, discussed: true, note: 'AI A/B 테스트 결과 적용 중. 현재 속도 유지 시 목표 달성 가능' },
  ],
  /* 16954:15284 — 역량 평가 비교 */
  capabilities: [
    { key: 'expertise', label: '업무 전문성', memberSelf: 5, readyManager: 5, doneFinal: 5, draft: true },
    { key: 'communication', label: '커뮤니케이션', memberSelf: 3, readyManager: 3, doneFinal: 3, draft: true },
    { key: 'problem', label: '문제 해결력', memberSelf: 4, readyManager: 4, doneFinal: 4, draft: true },
    { key: 'teamwork', label: '협업 / 팀워크', memberSelf: 5, readyManager: 5, doneFinal: 5, draft: true },
    { key: 'initiative', label: '자가주도성', memberSelf: 2, readyManager: 2, doneFinal: 3, draft: true },
  ],
  onCapabilityChange: noop,
  feedbackConfirm: { confirmed: { strengths: true, sbi: true, support: true }, onConfirm: noop },
  share: { onShare: noop, onUnshare: noop },
  actions: { onAdd: noop, onToggle: noop },
  memo: { onChange: noop },
  booking: { onBook: noop },
  slack: { onSend: noop },
};
