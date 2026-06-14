import { useMemo, useState } from 'react';
import { MeetingsCanvas, MeetingStartFlow } from './components';

/* ── 데모 데이터 ── */
const TODAY_MEETINGS = [
  {
    id: 'm1',
    time: '09:30',
    duration: '30m',
    title: '주간 스탠드업',
    participants: '정은우 · Chris · 김우진 · 박은지',
    status: 'scheduled',
  },
  {
    id: 'm2',
    time: '11:00',
    duration: '1h',
    title: '3차 기획 미팅',
    participants: '김현주 · 이민호 · 박지민 · 최지우',
    status: 'ongoing',
  },
  {
    id: 'm3',
    time: '14:00',
    duration: '45m',
    title: '디자인 싱크업',
    participants: '박은지 · 윤지안 · 이서현',
    status: 'scheduled',
  },
  {
    id: 'm4',
    time: '16:00',
    duration: '1h',
    title: '프로덕트 PRD 리뷰',
    participants: 'Chris · 김우진 · 이수진',
    status: 'scheduled',
  },
];

const PAST_MEETINGS = [
  {
    id: 'p1',
    time: '어제 10:00',
    duration: '30m',
    title: '주간 스탠드업',
    participants: '정은우 · Chris · 김우진 · 박은지',
  },
  {
    id: 'p2',
    time: '어제 14:00',
    duration: '1h',
    title: '2차 기획 미팅',
    participants: '김현주 · 이민호 · 박지민',
  },
  {
    id: 'p3',
    time: '04.13 11:00',
    duration: '1h 30m',
    title: '인스타 자동화 개발 미팅',
    participants: '최지우 · 홍길동',
  },
];

const LABELS = {
  headerTitle: '회의 목록',
  todayMetaLabel: '오늘회의',
  todaySectionTitle: '오늘의 회의',
  pastSectionTitle: '지난 회의',
  gcalStatus: 'Google Calendar 연동 중',
  ongoing: '진행 중',
  scheduled: '예정',
  start: '시작',
};

const MODAL_LABELS = {
  close: '닫기',
  title: '회의 진행 중',
  startedSuffix: '시작',
  memoLabel: '실시간 메모',
  memoPlaceholder: '회의 중 중요한 내용을 메모하세요 (선택)',
  endButton: '회의 종료',
  shareButton: '공유하기',
  shareDoneButton: '공유 완료',
  recordingSuffix: '님이 녹음 중입니다.',
  endRecordingOnly: '녹음 종료만 하기',
  endConfirm: {
    title: '회의 종료하기',
    descLine1: '정말로 종료하시는게 맞으실까요?',
    descLine2: '종료 시 녹음 데이터를 공유 하실 수 있습니다.',
    cancel: '취소',
    confirm: '종료',
    close: '닫기',
  },
};

const RECORD_DATA = {
  title: '3차 기획 미팅',
  summary:
    '평가 사이클 캘린더 기능 확장 및 매니저 뷰 상세 화면 기획을 논의. 주요 액션 아이템 3건을 도출하고 다음 회의 전까지 초안 공유에 합의.',
  dateTimeLabel: '2026.04.15 · 11:00–12:00',
  attendeeLabel: '4명',
  discussions: [
    {
      title: '캘린더 기능 확장 범위',
      body: '주간/월간 뷰는 이번 스프린트에 포함, 연간 뷰는 다음 분기로 이관. 필터링 UX 는 사용자 테스트 결과 반영.',
    },
    {
      title: '매니저 뷰 상세 화면',
      body: '4종 화면 (대시보드/팀원/1on1/알림) 기획 완료, 디자인 목업은 금요일까지 공유.',
    },
    {
      title: '알림 설정 정책',
      body: '어드민이 기본값을 세팅하고 사용자가 개별 override 가능. 메신저 연동은 Phase 2.',
    },
  ],
  decisions: [
    '연간 뷰 범위 축소 — 다음 분기 이관.',
    '매니저 뷰 4종 금요일까지 디자인 확정.',
    '알림 기본값은 어드민이 세팅, 사용자 override 허용.',
  ],
  actionItems: [
    { title: '매니저 뷰 디자인 목업 공유', person: '박은지', date: '04/19' },
    { title: '사용자 테스트 결과 정리', person: '이수진', date: '04/17' },
    { title: 'Phase 2 알림 연동 스펙 초안', person: '이민호', date: '04/22' },
  ],
  memberPool: [
    { name: '김현주' },
    { name: '이민호' },
    { name: '박지민' },
    { name: '최지우' },
    { name: '홍길동' },
    { name: '이수진' },
    { name: '박은지' },
  ],
  labels: {
    title: '생성된 회의록',
    aiBanner: 'AI 회의록이 생성되었습니다. 검토 후 공유해 주세요.',
    metaMeeting: '회의',
    metaDateTime: '일시',
    metaAttendees: '참석',
    summary: '요약',
    discussions: '주요논의',
    decisions: '결정 사항',
    actionItems: '액션 아이템',
    addActionItem: '액션 아이템 추가',
    newActionItemTitle: '새 액션 아이템',
    removeLabel: '제거',
  },
};

const SHARE_DATA = {
  calendarParticipants: ['김현주', '이민호', '박지민', '최지우'],
  manualMembers: [
    { name: '김현주', role: 'CEO', checked: true },
    { name: '이민호', role: 'CTO', checked: true },
    { name: '박지민', role: 'CFO', checked: true },
    { name: '최지우', role: 'CMO', checked: false },
    { name: '홍길동', role: 'Lead Developer', checked: false },
  ],
  shareUrl: 'https://pivit.work/m/demo-meeting',
  subtitle: '3차 기획 미팅 · 2026.04.15 11:00',
  labels: {
    title: '회의록 공유',
    byParticipants: '참석자 일괄 공유',
    byParticipantsDesc: (count) => `캘린더 기반 참석자 ${count}명에게 자동 발송`,
    manual: '수동 선택',
    attendees: '참석자',
    addOthers: '그 외에 인원 추가',
    addOthersPlaceholder: '이름 검색 또는 직접 입력 후 Enter',
    addOthersHint: '이름 검색 또는 Enter로 직접 추가',
    externalLink: '외부 링크',
    externalLinkDesc: '링크를 복사하여 외부에 공유합니다',
    copy: '복사',
    copied: '복사됨',
  },
};

const START_LABELS = {
  recordMethod: {
    title: '기록 방식 선택',
    subtitleSuffix: '시작',
    record: { title: '직접 녹음', desc: '이 디바이스 마이크로 녹음. 회의 참여한 인원의 녹음도 동작합니다.' },
    memo: { title: '메모만 작성', desc: '녹음 없이 주최자가 직접 기록합니다.' },
    footnote: '발제(회의 주최자) 만 녹음을 시작·정지할 수 있습니다. 비주최자는 본 화면을 보지 않고 곧장 회의방으로 입장합니다.',
    close: '닫기',
  },
  micSelect: {
    back: '뒤로가기',
    title: '마이크 선택',
    subtitle: '어떤 마이크로 녹음할지 골라주세요.',
    deviceLabel: '마이크',
    volumeLabel: '입력 음량',
    requestButton: '최초 이 버튼을 눌러 브라우저 마이크 권한 허용해주세요',
    requestFootnote: '브라우저 마이크 사용 권한 허용하지 않으면 회의록 녹음 기능을 사용하실 수 없습니다.',
    grantedText: '마이크 권한 허용 됨.',
    startButton: '회의 시작하기',
    failedText: '브라우저 마이크 권한 허용이 실패했습니다. 다시 시도해 주세요.',
    failedFootnote: '브라우저 주소창 좌측 설정 아이콘 클릭하여 마이크 권한 허용하시면 됩니다.',
    close: '닫기',
  },
  progress: MODAL_LABELS,
};

const MIC_DEVICES = ['MacBook Pro 내장마이크', 'AirPods Pro', '외부 USB 마이크'];
const RECORDER_NAME = 'John Lee';

/**
 * MeetingsPage — 회의록 demo wrapper.
 *
 * MeetingsCanvas 는 순수 컴포넌트 (데모 fallback 없음). wrapper 가 오늘/지난
 * 회의 목록, 라벨, 진행·기록·공유 모달용 데이터를 주입한다. pivit-work 는
 * MeetingListPage.tsx 에서 실 데이터로 동일한 MeetingsCanvas 를 렌더한다.
 */
export default function MeetingsPage({ baseUrl }) {
  const [activeMeeting, setActiveMeeting] = useState(null);

  const todayDateLabel = useMemo(() => {
    const d = new Date();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${weekdays[d.getDay()]}요일`;
  }, []);
  const todayCountLabel = `${TODAY_MEETINGS.length}개`;

  return (
    <>
      <MeetingsCanvas
        baseUrl={baseUrl}
        todayMeetings={TODAY_MEETINGS}
        pastMeetings={PAST_MEETINGS}
        todayDateLabel={todayDateLabel}
        todayCountLabel={todayCountLabel}
        labels={LABELS}
        onStartMeeting={setActiveMeeting}
      />
      {activeMeeting && (
        <MeetingStartFlow
          baseUrl={baseUrl}
          meeting={activeMeeting}
          labels={START_LABELS}
          micDevices={MIC_DEVICES}
          recorderName={RECORDER_NAME}
          timer="00:27:07"
          recordData={RECORD_DATA}
          shareData={SHARE_DATA}
          simulateMicFailure
          onClose={() => setActiveMeeting(null)}
        />
      )}
    </>
  );
}
