// Layout
export const LABEL_W = 230;
export const HOUR_W = 168;
export const WEEK_DAY_COL_W = 168; // 주별 보기: 하루 1 컬럼 너비
export const ROW_H = 86;
export const HEADER_H = 40;      // hour cell row (9시, 10시, ...)
export const SUBHEADER_H = 26;   // group header sub-row (also where NOW label sits)
export const BOTTOM_H = 146;
// 일별 보기: 0시 ~ 23시 (24개 컬럼)
export const HOURS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
  12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
];
// 주별 보기: Sun ~ Sat 요일 라벨 (getDay() 인덱스 기준)
export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// Today (mock) — 2026년 4월 15일 (수요일) 기준
export const TODAY_STR = '2026-04-15';

// 주별 보기에서 사용할 유틸
export const getWeekStart = (date) => {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
};
export const formatIsoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// 주별 보기: date 가 속한 주의 일~토 7일을 반환.
export const getWeekDates = (date) => {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
};

// 월별 보기: date 가 속한 달의 1일부터 말일까지 모든 날짜를 반환.
// (28/30/31 일은 해당 달에 따라 자동 결정)
export const getMonthDates = (date) => {
  const y = date.getFullYear();
  const m = date.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: lastDay }, (_, i) => new Date(y, m, i + 1));
};

// 직원 컬러 팔레트 — Figma _Calendar event / Day&week view / Month view 공용.
// 9 variants (gray/brand/green/blue/indigo/purple/pink/orange/yellow).
// 각 variant 는 Untitled UI utility color scale 로 구성:
//   solid     → 600 (dot, arrow, curve 등 "강한 단색" 용)
//   bg        → 50  (이벤트 pill / 스니핏 default 배경)
//   bgHover   → 100 (hover 시 배경 — user 가 Figma 에서 확인한 hover 값)
//   border    → 200 (pill / snippet 테두리)
//   timeText  → 600 (이벤트 pill 내 시간 텍스트)
//   titleText → 700 (이벤트 pill 내 제목 텍스트 및 스니핏 본문 텍스트)
//
// 직원의 `color` 프로퍼티는 이 map 의 key 를 가리킴. 이벤트/스니핏이 직원에
// 연결되면 직원 색이 그대로 전파되고, 연결되지 않은 이벤트도 color key 로
// 원하는 variant 를 지정 가능. 새 variant 추가는 이 객체에만 추가하면 됨.
export const MEMBER_COLORS = {
  gray:   { solid: '#687079', bg: '#f9fafb', bgHover: '#f3f4f6', border: '#e6e8ea', timeText: '#687079', titleText: '#596069' },
  brand:  { solid: '#21a67a', bg: '#f1fffa', bgHover: '#e1fef2', border: '#b3fade', timeText: '#21a67a', titleText: '#10774d' },
  green:  { solid: '#099250', bg: '#edfcf2', bgHover: '#d3f8df', border: '#aaf0c4', timeText: '#099250', titleText: '#087443' },
  blue:   { solid: '#1570ef', bg: '#eff8ff', bgHover: '#d1e9ff', border: '#b2ddff', timeText: '#1570ef', titleText: '#175cd3' },
  indigo: { solid: '#444ce7', bg: '#eef4ff', bgHover: '#e0eaff', border: '#c7d7fe', timeText: '#444ce7', titleText: '#3538cd' },
  purple: { solid: '#6938ef', bg: '#f4f3ff', bgHover: '#ebe9fe', border: '#d9d6fe', timeText: '#6938ef', titleText: '#5925dc' },
  pink:   { solid: '#dd2590', bg: '#fdf2fa', bgHover: '#fce7f6', border: '#fcceee', timeText: '#dd2590', titleText: '#c11574' },
  orange: { solid: '#e04f16', bg: '#fef6ee', bgHover: '#fdead7', border: '#f9dbaf', timeText: '#e04f16', titleText: '#b93815' },
  yellow: { solid: '#ca8504', bg: '#fefbe8', bgHover: '#fef7c3', border: '#feee95', timeText: '#ca8504', titleText: '#a15c07' },
};

// 기존 코드 호환용 alias — 이전 이름으로도 import 가능 (점진적 마이그레이션).
// 새 코드는 MEMBER_COLORS 사용 권장.
export const SNIPPET_COLORS = MEMBER_COLORS;

// member (혹은 color key) 에 해당하는 palette 객체를 안전하게 lookup.
// 알 수 없는 key 는 gray 로 fallback.
export const memberPalette = (memberOrKey) => {
  const key =
    typeof memberOrKey === 'string' ? memberOrKey : memberOrKey?.color;
  return MEMBER_COLORS[key] || MEMBER_COLORS.gray;
};

// 직원의 color 는 MEMBER_COLORS 의 key 를 가리킴. 단색이 필요한 곳
// (arrow btn / meeting curve / drag preview 등)은 MEMBER_COLORS[color].solid
// 로 look-up 한다.
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
// { id, memberId, date(YYYY-MM-DD), color(SNIPPET_COLORS key), text }
export const SNIPPETS = [
  // 김현주 CEO — brand
  { id: 'sn1', memberId: 'm1', date: '2026-04-13', color: 'brand', text: '평가 사이클 설정 화면 기획.' },
  { id: 'sn2', memberId: 'm1', date: '2026-04-14', color: 'brand', text: '매니저 뷰 상세 4종 화면 기획 완성.' },
  { id: 'sn3', memberId: 'm1', date: '2026-04-15', color: 'brand', text: '어드민 알림 설정 화면 기획 완료.' },
  { id: 'sn4', memberId: 'm1', date: '2026-04-16', color: 'brand', text: '4차 정기 미팅 참석.' },
  // 이민호 CTO — blue
  { id: 'sn5', memberId: 'm2', date: '2026-04-13', color: 'blue', text: 'BullMQ 작업큐 기초 구현 완료.' },
  { id: 'sn6', memberId: 'm2', date: '2026-04-15', color: 'blue', text: 'pgvector 인덱스 전략 작성 중.' },
  { id: 'sn7', memberId: 'm2', date: '2026-04-16', color: 'blue', text: 'pgvector 인덱스 전략 초안 완성.' },
  // 박지민 CFO — gray (no color)
  { id: 'sn8', memberId: 'm3', date: '2026-04-14', color: 'gray', text: '인사팀 2분기 회계 보고서 작성' },
  { id: 'sn9', memberId: 'm3', date: '2026-04-15', color: 'gray', text: '마케팅팀 인력 보강 안 작성. 인사팀 2분기 회계 보고서 작성.' },
  // 최지우 CMO — pink
  { id: 'sn10', memberId: 'm4', date: '2026-04-13', color: 'pink', text: '2분기 브랜드 캠페인 성과 지표 분석 및 리포트.' },
  { id: 'sn11', memberId: 'm4', date: '2026-04-14', color: 'pink', text: '신규 매체 집행 효율 검토 및 광고 소재 최적화.' },
  { id: 'sn12', memberId: 'm4', date: '2026-04-15', color: 'pink', text: '브랜드 파트너십 제안서 검토 및 대외 협력 미팅.' },
  { id: 'sn13', memberId: 'm4', date: '2026-04-16', color: 'pink', text: '마케팅팀 주간 성과 공유 및 차주 액션 플랜 수립.' },
  // 홍길동 Lead Dev — pink (campaign 공동 작업)
  { id: 'sn14', memberId: 'm5', date: '2026-04-13', color: 'pink', text: '2분기 브랜드 캠페인 성과 지표 분석 및 리포트.' },
  { id: 'sn15', memberId: 'm5', date: '2026-04-14', color: 'pink', text: '신규 매체 집행 효율 검토 및 광고 소재 최적화.' },
  { id: 'sn16', memberId: 'm5', date: '2026-04-15', color: 'pink', text: '브랜드 파트너십 제안서 검토 및 대외 협력 미팅.' },
  { id: 'sn17', memberId: 'm5', date: '2026-04-16', color: 'pink', text: '마케팅팀 주간 성과 공유 및 차주 액션 플랜 수립.' },
  // 이수진 PM — orange
  { id: 'sn18', memberId: 'm6', date: '2026-04-13', color: 'orange', text: '캘린더 신규 기능 사용자 요구사항 정의서(PRD) 초안.' },
  { id: 'sn19', memberId: 'm6', date: '2026-04-14', color: 'orange', text: '디자인-개발 가이드라인 정렬 및 기능 명세 고도화.' },
  { id: 'sn20', memberId: 'm6', date: '2026-04-15', color: 'orange', text: '유저 피드백 기반 백로그 관리 및 상반기 로드맵 업데이트.' },
  { id: 'sn21', memberId: 'm6', date: '2026-04-16', color: 'orange', text: '1차 캘린더 기능 개발 진척도 점검 및 QA 시나리오 검토.' },
];

// ── 캘린더 이벤트 — deterministic 랜덤 generator ─────────────────────────
//
// mulberry32 PRNG + ISO 날짜 해시 시드로 각 날짜마다 일관된 랜덤 이벤트를
// 생성. 브라우저 높이를 늘려 maxVisible 가 증가해도 추가로 보이는 이벤트가
// 깜박이지 않도록 (=같은 날짜는 항상 같은 이벤트 목록) cache 한다.
//
// 컬러는 MEMBER_COLORS 의 9 variant 중 랜덤, 타이틀/시간도 pool 에서 랜덤.
// TODAY_STR 인 경우 MEETINGS 와 일치하는 이벤트 2개를 맨 앞에 고정.

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

// "오전/오후 N시" 를 0~23 의 24시간제 숫자로 변환 (정렬 용도).
//   오전 12시 → 0, 오전 9시 → 9, 오전 11시 → 11
//   오후 12시 → 12, 오후 1시 → 13, 오후 6시 → 18
const parseKoreanHour = (timeStr) => {
  const m = /^(오전|오후)\s*(\d+)시/.exec(timeStr || '');
  if (!m) return 0;
  const h = parseInt(m[2], 10);
  if (m[1] === '오전') return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
};

// FNV-1a 32-bit hash → 숫자 시드
const hashIso = (str) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

// mulberry32 deterministic PRNG
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
  // TODAY — MEETINGS 와 일치시키기 위해 첫 2개는 고정
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
  // 랜덤 꼬리 이벤트 5~10개
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
  // 시간순 정렬 (오전 9시 → 오후 6시). 동시간대는 생성 순서 유지.
  events.sort(
    (a, b) => parseKoreanHour(a.time) - parseKoreanHour(b.time)
  );
  _eventCache.set(iso, events);
  return events;
};

// 기존 CALENDAR_EVENTS 이름을 import 하는 코드가 있을 수 있어 빈 배열로 유지.
// 실제 데이터는 getEventsForDate(iso) 를 호출해야 나옴.
export const CALENDAR_EVENTS = [];
