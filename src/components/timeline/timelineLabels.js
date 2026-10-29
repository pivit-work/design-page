import { createContext, useContext } from 'react';
import { resolveUiLocale, isKoreanLocale } from '../shared/uiLocale.js';

/**
 * 타임라인 캔버스의 화면 문구 — 기본값은 한국어(디자인 프리뷰·한국어 화면이 지금 그대로 보이게).
 * 앱은 `TimelineCanvas` 의 `labels` 로 화면 언어 문구를 넘기고, 넘긴 키만 덮어쓴다 (pivit-work PW-2373).
 * 이름·시각이 끼는 문구는 함수다.
 */
export const DEFAULT_TIMELINE_LABELS = {
  // 툴바
  viewGantt: '간트 차트',
  viewCalendar: '캘린더',
  viewAria: '타임라인 보기',
  unitWeek: '주',
  unitMonth: '월',
  unitAria: '캘린더 보기 단위',
  prev: '이전',
  today: '오늘',
  next: '다음',
  filter: '필터',
  addEvent: '이벤트 추가',
  snippetWrite: '스니핏 작성',
  snippetEdit: '스니핏 수정',
  snippetEditRequested: '스니핏 수정 승인 요청 완료',
  // 간트 이름 열
  nameHeader: '이름',
  groupExpand: '그룹 펼치기',
  groupCollapse: '그룹 접기',
  expand: '펼치기',
  collapse: '접기',
  groupName: '그룹 이름',
  groupRename: '이름 변경',
  groupDelete: '그룹 삭제',
  memberAdd: '멤버 추가',
  memberDetail: (name) => `${name} 상세 보기`,
  memberRemove: (name) => `${name} 그룹에서 제거`,
  memberRemoveTitle: '이 그룹에서 제거',
  addGroup: '그룹 추가',
  addInternal: '내부 직원 추가',
  addExternal: '외부 직원 추가',
  // 간트 스니핏 블록(화면 읽기용) — time 은 「오후 7:28」 같은 작성 시각, 없으면 빈 문자열
  snippetBlock: (name, time) => `${name} 스니핏 ${time} 작성`,
  // 창
  dayEvents: (date) => `${date} 일정`,
  close: '닫기',
  prevMonth: '이전 달',
  nextMonth: '다음 달',
  organizer: '주최자',
  // 간트 스니핏 상세 창
  snippet: '스니핏',
  snippetWrittenAt: (time) => `${time} 작성`,
  snippetOpenFull: '스니핏 전체 보기',
  healthWords: { best: '최고', good: '좋음', ok: '보통', tired: '힘듦', veryTired: '매우 힘듦' },
};

export const TimelineLabelsContext = createContext(DEFAULT_TIMELINE_LABELS);

export function useTimelineLabels() {
  return useContext(TimelineLabelsContext);
}

export function mergeTimelineLabels(labels) {
  return labels ? { ...DEFAULT_TIMELINE_LABELS, ...labels } : DEFAULT_TIMELINE_LABELS;
}

/*
 * 날짜·요일·시각 — 화면 언어(`<html lang>`)를 따른다. 한국어는 종전 글자를 손으로 그대로 만든다
 * (「2026년 10월 29일」·「목」·「10월 1일」·「9시」·「오전 9시」·「오전 9:30」) — Intl 의 한국어 시각은
 * 실행 환경마다 「AM 9시」로도 나와서 한국어 화면이 바뀔 수 있다. 다른 언어만 Intl 로 만든다.
 */
function fmt(options) {
  try {
    return new Intl.DateTimeFormat(resolveUiLocale(), options);
  } catch {
    return new Intl.DateTimeFormat('en', options);
  }
}

const isKo = () => isKoreanLocale();
const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const koHour12 = (h) => `${h < 12 ? '오전' : '오후'} ${h % 12 === 0 ? 12 : h % 12}`;

// 툴바 날짜 버튼 — 「2026년 10월 29일」 / 「October 29, 2026」
export const formatToolbarDate = (d) =>
  isKo()
    ? `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
    : fmt({ year: 'numeric', month: 'long', day: 'numeric' }).format(d);

// 요일 머리 — 「목」 / 「Thu」
export const formatWeekdayShort = (d) =>
  isKo() ? KO_WEEKDAYS[d.getDay()] : fmt({ weekday: 'short' }).format(d);

// 일요일부터 한 주의 요일 이름 — 달력 머리용
export const weekdayShortLabels = () =>
  Array.from({ length: 7 }, (_, i) => formatWeekdayShort(new Date(2023, 0, 1 + i))); // 2023-01-01 은 일요일

// 월·일 — 「10월 1일」 / 「Oct 1」
export const formatMonthDay = (d) =>
  isKo() ? `${d.getMonth() + 1}월 ${d.getDate()}일` : fmt({ month: 'short', day: 'numeric' }).format(d);

// 작은 달력 머리 — 「2026년 10월」 / 「October 2026」
export const formatYearMonth = (y, m) =>
  isKo() ? `${y}년 ${m + 1}월` : fmt({ year: 'numeric', month: 'long' }).format(new Date(y, m, 1));

// 간트 시간 머리 — 「9시」 / 「9 AM」
export const formatGanttHour = (h) =>
  isKo() ? `${h}시` : fmt({ hour: 'numeric', hour12: true }).format(new Date(2023, 0, 1, h));

// 주 보기 시간 축 — 「오전 9시」 / 「9 AM」
export const formatHour12 = (h) =>
  isKo() ? `${koHour12(h)}시` : fmt({ hour: 'numeric', hour12: true }).format(new Date(2023, 0, 1, h));

// 자정 기준 분 → 일정 시작 시각. 정시는 시만 — 「오전 11시」·「오전 11:30」 / 「11 AM」·「11:30 AM」
export const formatMinutesOfDay = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return formatHour12(h);
  if (isKo()) return `${koHour12(h)}:${String(m).padStart(2, '0')}`;
  return fmt({ hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(2023, 0, 1, h, m));
};

// 일정 창 날짜 줄 — 「10월 28일 (수요일)」 / 「Wednesday, October 28」
export const formatEventDate = (d) =>
  isKo()
    ? `${formatMonthDay(d)} (${KO_WEEKDAYS[d.getDay()]}요일)`
    : fmt({ weekday: 'long', month: 'long', day: 'numeric' }).format(d);
