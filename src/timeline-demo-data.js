import {
  MEMBER_COLORS,
  TODAY_STR,
} from './components/timeline/constants.js';

// Timeline 데모 데이터.
// 데모/프리뷰 전용이며 MeetingCanvas·OneOnOneCanvas 등 다른 페이지와 달리
// 페이지 wrapper (TimelinePage.jsx) 에서만 import 한다.
// 패키지 소비자(pivit-work) 는 실 데이터를 props 로 넣으므로 이 파일은 import 하지 않는다.

// 직원의 color 는 MEMBER_COLORS 의 key 를 가리킴.
export const MEMBERS = [
  { id: 'm1', name: '김현주', title: 'CEO', color: 'brand',  photo: 'https://i.pravatar.cc/150?img=47' },
  { id: 'm2', name: '이민호', title: 'CTO', color: 'blue',   photo: 'https://i.pravatar.cc/150?img=33' },
  { id: 'm3', name: '박지민', title: 'CFO', color: 'purple', photo: 'https://i.pravatar.cc/150?img=12' },
  { id: 'm4', name: '최지우', title: 'CMO', color: 'pink',   photo: 'https://i.pravatar.cc/150?img=23' },
  { id: 'm5', name: '홍길동', title: 'Lead Developer', color: 'indigo', photo: 'https://i.pravatar.cc/150?img=52' },
  { id: 'm6', name: '이수진', title: 'Product Manager', color: 'orange', photo: 'https://i.pravatar.cc/150?img=14' },
];

export const GROUPS = [
  {
    id: 'g1',
    label: 'IR 자료 제작 그룹',
    memberIds: ['m1', 'm2', 'm3', 'm4', 'm5'],
  },
  {
    id: 'g2',
    label: '1차 캘린더 기능 개발',
    memberIds: ['m6'],
  },
];

export const MEETINGS = [
  {
    id: 'mt1',
    title: '3차 기획 미팅',
    date: TODAY_STR,
    startHour: 10,
    durationH: 1,
    participants: ['m1', 'm2', 'm3', 'm4', 'm5'],
    color: '#15b79e',
    timeLabel: '4월 15일 (수요일) ⋅ 오전 10:00 ~ 11:00',
    repeatLabel: '매주 일요일, 수요일',
    organizer: 'm1',
    notification: '30분 전',
  },
  {
    id: 'mt2',
    title: '인스타 자동화 개발 미팅',
    date: TODAY_STR,
    startHour: 12,
    durationH: 1,
    participants: ['m4', 'm5'],
    color: '#A78BFA',
    timeLabel: '4월 15일 (수요일) ⋅ 오후 12:00 ~ 1:00',
    repeatLabel: '매주 수요일',
    organizer: 'm4',
    notification: '15분 전',
  },
];

// 주별 보기용 스니핏 mock — TODAY_STR 이 포함된 주 (2026-04-12 ~ 04-18) 기준.
export const SNIPPETS = [
  { id: 'sn1', memberId: 'm1', date: '2026-04-13', color: 'brand', text: '평가 사이클 설정 화면 기획.' },
  { id: 'sn2', memberId: 'm1', date: '2026-04-14', color: 'brand', text: '매니저 뷰 상세 4종 화면 기획 완성.' },
  { id: 'sn3', memberId: 'm1', date: '2026-04-15', color: 'brand', text: '어드민 알림 설정 화면 기획 완료.', hour: 18.5, timeLabel: '오후 6:30', health: 8, tags: ['기획'], canOpen: true, dateLabel: '4월 15일 (수요일)' },
  { id: 'sn4', memberId: 'm1', date: '2026-04-16', color: 'brand', text: '4차 정기 미팅 참석.' },
  { id: 'sn5', memberId: 'm2', date: '2026-04-13', color: 'blue', text: 'BullMQ 작업큐 기초 구현 완료.' },
  { id: 'sn6', memberId: 'm2', date: '2026-04-15', color: 'blue', text: 'pgvector 인덱스 전략 작성 중.', hour: 20, timeLabel: '오후 8:00', health: 6, healthNote: '피로 누적', tags: ['개발', '블로커'], dateLabel: '4월 15일 (수요일)' },
  { id: 'sn7', memberId: 'm2', date: '2026-04-16', color: 'blue', text: 'pgvector 인덱스 전략 초안 완성.' },
  { id: 'sn8', memberId: 'm3', date: '2026-04-14', color: 'gray', text: '인사팀 2분기 회계 보고서 작성' },
  { id: 'sn9', memberId: 'm3', date: '2026-04-15', color: 'gray', text: '마케팅팀 인력 보강 안 작성. 인사팀 2분기 회계 보고서 작성.', hour: 17.25, timeLabel: '오후 5:15', health: 9, tags: ['인사'], dateLabel: '4월 15일 (수요일)' },
  { id: 'sn10', memberId: 'm4', date: '2026-04-13', color: 'pink', text: '2분기 브랜드 캠페인 성과 지표 분석 및 리포트.' },
  { id: 'sn11', memberId: 'm4', date: '2026-04-14', color: 'pink', text: '신규 매체 집행 효율 검토 및 광고 소재 최적화.' },
  { id: 'sn12', memberId: 'm4', date: '2026-04-15', color: 'pink', text: '브랜드 파트너십 제안서 검토 및 대외 협력 미팅.', hour: 19, timeLabel: '오후 7:00', health: 5, tags: ['마케팅'], dateLabel: '4월 15일 (수요일)' },
  { id: 'sn13', memberId: 'm4', date: '2026-04-16', color: 'pink', text: '마케팅팀 주간 성과 공유 및 차주 액션 플랜 수립.' },
  { id: 'sn14', memberId: 'm5', date: '2026-04-13', color: 'pink', text: '2분기 브랜드 캠페인 성과 지표 분석 및 리포트.' },
  { id: 'sn15', memberId: 'm5', date: '2026-04-14', color: 'pink', text: '신규 매체 집행 효율 검토 및 광고 소재 최적화.' },
  { id: 'sn16', memberId: 'm5', date: '2026-04-15', color: 'pink', text: '브랜드 파트너십 제안서 검토 및 대외 협력 미팅.', hour: 21.5, timeLabel: '오후 9:30', tags: ['제휴'], dateLabel: '4월 15일 (수요일)' },
  { id: 'sn17', memberId: 'm5', date: '2026-04-16', color: 'pink', text: '마케팅팀 주간 성과 공유 및 차주 액션 플랜 수립.' },
  { id: 'sn18', memberId: 'm6', date: '2026-04-13', color: 'orange', text: '캘린더 신규 기능 사용자 요구사항 정의서(PRD) 초안.' },
  { id: 'sn19', memberId: 'm6', date: '2026-04-14', color: 'orange', text: '디자인-개발 가이드라인 정렬 및 기능 명세 고도화.' },
  { id: 'sn20', memberId: 'm6', date: '2026-04-15', color: 'orange', text: '유저 피드백 기반 백로그 관리 및 상반기 로드맵 업데이트.', hour: 16, timeLabel: '오후 4:00', health: 7, tags: ['PM'], dateLabel: '4월 15일 (수요일)' },
  { id: 'sn21', memberId: 'm6', date: '2026-04-16', color: 'orange', text: '1차 캘린더 기능 개발 진척도 점검 및 QA 시나리오 검토.' },
];

// ── 캘린더 이벤트 — deterministic 랜덤 generator ─────────────────────────
const EVENT_TITLE_POOL = [
  '2분기 브랜드 캠페인 성과 지표 분석 및 리포트.',
  '코드 리뷰 및 머지.',
  '디자인 싱크업.',
  'API 설계 리뷰.',
  '제품 PRD 검토.',
  '스프린트 회고.',
  '주간 스탠드업.',
  '팀 빌딩 워크샵.',
  '사용자 인터뷰 정리.',
  '경쟁사 분석 미팅.',
  'OKR 1차 점검.',
  '고객 피드백 리뷰.',
  'QA 시나리오 작성.',
  '신규 기능 기획 세션.',
  '로드맵 업데이트.',
  '기술 부채 논의.',
  '채용 인터뷰.',
  '1:1 미팅.',
  '플랫폼 모니터링 리뷰.',
  '보안 감사 사전 점검.',
  '온보딩 가이드 정리.',
  '월간 리포트 작성.',
  '매니저 싱크업.',
  '광고 소재 피드백.',
  '분기 예산 검토.',
  '프로덕트 데모 리허설.',
  '해외 파트너 미팅.',
  '버그 트리아지.',
  '성능 개선 작업 리뷰.',
  '디자인 시스템 업데이트.',
  '인프라 마이그레이션 계획.',
  '데이터 파이프라인 점검.',
];

const EVENT_TIME_POOL = [
  '오전 9시', '오전 10시', '오전 11시',
  '오후 12시', '오후 1시', '오후 2시', '오후 3시',
  '오후 4시', '오후 5시', '오후 6시',
];

const parseKoreanHour = (timeStr) => {
  const m = /^(오전|오후)\s*(\d+)시/.exec(timeStr || '');
  if (!m) return 0;
  const h = parseInt(m[2], 10);
  if (m[1] === '오전') return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
};

const hashIso = (str) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

const mulberry32 = (seed) => () => {
  let t = (seed = (seed + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const COLOR_KEYS = Object.keys(MEMBER_COLORS);

const _eventCache = new Map();
export const getEventsForDate = (iso) => {
  if (_eventCache.has(iso)) return _eventCache.get(iso);
  const rng = mulberry32(hashIso(iso));
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const events = [];
  if (iso === TODAY_STR) {
    events.push({
      id: `${iso}-fix1`, date: iso,
      time: '오전 10시', title: '3차 기획 미팅', color: 'brand',
    });
    events.push({
      id: `${iso}-fix2`, date: iso,
      time: '오후 12시', title: '인스타 자동화 개발 미팅', color: 'blue',
    });
  }
  const tail = 5 + Math.floor(rng() * 6);
  for (let i = 0; i < tail; i++) {
    events.push({
      id: `${iso}-r${i}`,
      date: iso,
      time: pick(EVENT_TIME_POOL),
      title: pick(EVENT_TITLE_POOL),
      color: pick(COLOR_KEYS),
    });
  }
  events.sort(
    (a, b) => parseKoreanHour(a.time) - parseKoreanHour(b.time)
  );
  _eventCache.set(iso, events);
  return events;
};
