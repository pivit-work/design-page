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

// Today (mock) — 2026년 4월 15일 (수요일) 기준.
// 데모 이벤트·스니핏 생성의 기준 날짜. 프리뷰가 "오늘" 로 보여주는 날.
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

// 실제 오늘 (ISO). TODAY_STR 는 데모 고정값이지만 NOW 인디케이터·"오늘로 이동"
// 등은 실시간 값이 필요하다. 자정 직전/직후에도 호출 시점 기준으로 재계산.
export const getTodayStr = () => formatIsoDate(new Date());

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
