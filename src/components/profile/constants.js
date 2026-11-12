/**
 * 구성원 프로필 창 — 조직도·매니저 대시보드가 같이 쓰는 넓은 창 (Figma 17873:33194 «profile_card modal 2» · 2026-11-12).
 *
 * 왼쪽 410 칸: 130px 둥근 사진 · 이름 · 직책 ∙ 소속 · 소개 · 근무 상태 · 통계 세 칸 · 버튼 둘.
 * 오른쪽 칸: 세그먼트 탭(인사정보 · AI 브리핑 · 스니핏 · 헬스 트렌드 · 원온원 · 액션 아이템)과 그 내용.
 */

/** 머리 사진 한 변 — Figma 17873:33575 (130 · 모서리 46). 스켈레톤도 같은 크기로 깐다. */
export const PROFILE_PHOTO_SIZE = 130;
export const PROFILE_PHOTO_RADIUS = 46;

/** 오른쪽 세그먼트 탭의 순서 — 디자이너가 그린 순서(17873:33231). 데이터가 없는 탭은 그리지 않는다. */
export const PROFILE_TABS = ['hr', 'ai', 'snippet', 'health', 'oneonone', 'action'];

/**
 * 화면 문구 기본값(한국어) — 소비자가 `labels` 로 덮는다. 이 패키지는 i18n 을 모른다 (pivit-work PW-2216).
 * 조직도 창은 `orgchart-labels` 의 `profile.*` 키로 같은 묶음을 만든다.
 */
export const DEFAULT_PROFILE_TAB_LABELS = {
  tabHr: '인사정보',
  tabAi: 'AI 브리핑',
  tabSnippet: '스니핏',
  tabHealth: '헬스 트렌드',
  tabOneOnOne: '원온원',
  tabAction: '액션 아이템',
  basicInfo: '기본정보',
  tabsAriaLabel: '구성원 상세',
  close: '닫기',
  photoView: '사진 크게 보기',
  message: '메시지',
  oneOnOneSchedule: '1on1 일정 잡기',
  briefingTitle: '종합 브리핑',
  agendaTitle: '1on1 추천 아젠다',
  metricHealthAvg: '헬스 평균',
  metricSnippetStreak: '스니핏 연속',
  metricLastOneOnOne: '마지막 1on1',
  metricKrProgress: 'KR 달성률',
  lastOneOnOne: '마지막 원온원',
  aiSummaryWeek: 'AI 요약 · 이번 주',
  snippetEmpty: '최근 스니핏이 없습니다.',
  actionTotal: '전체',
  actionOpen: '미완료',
  actionDone: '완료',
  healthCurrent: '현재',
  healthChange: '변화',
  teamAverage: '팀 평균',
  detectedFlags: '감지된 플래그',
};
