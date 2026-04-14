// Layout
export const LABEL_W = 230;
export const HOUR_W = 168;
export const ROW_H = 86;
export const HEADER_H = 40;      // hour cell row (9시, 10시, ...)
export const SUBHEADER_H = 26;   // group header sub-row (also where NOW label sits)
export const BOTTOM_H = 146;
// 일별 보기: 0시 ~ 23시 (24개 컬럼)
export const HOURS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
  12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
];

// Today (mock) — 2026년 4월 15일 (수요일) 기준
export const TODAY_STR = '2026-04-15';

export const MEMBERS = [
  { id: 'm1', name: '김현주', title: 'CEO', color: '#22C55E', photo: 'https://i.pravatar.cc/150?img=47' },
  { id: 'm2', name: '이민호', title: 'CTO', color: '#4F6AF5', photo: 'https://i.pravatar.cc/150?img=33' },
  { id: 'm3', name: '박지민', title: 'CFO', color: '#8B5CF6', photo: 'https://i.pravatar.cc/150?img=12' },
  { id: 'm4', name: '최지우', title: 'CMO', color: '#EC4899', photo: 'https://i.pravatar.cc/150?img=23' },
  { id: 'm5', name: '홍길동', title: 'Lead Developer', color: '#4F6AF5', photo: 'https://i.pravatar.cc/150?img=52' },
  { id: 'm6', name: '이수진', title: 'Product Manager', color: '#4F6AF5', photo: 'https://i.pravatar.cc/150?img=14' },
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
