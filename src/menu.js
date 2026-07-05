// SIDEBAR_MENU — 사이드바 항목의 디자인 정본(순서·배치·아이콘·라벨).
//
// 이 배열이 "디자인이 소유하는 차원"의 단일 출처다:
//   - 항목 집합과 순서
//   - section: 상단('top') 메뉴인지, 하단('bottom', 의견보내기·설정 옆) 진입점인지
//   - icon (경로) / label
//
// 데모(App.jsx)가 이 데이터로 사이드바를 조립하고, pivit-work 는 이 모듈을 import
// 해서 자기 NAV 레지스트리가 순서·배치·아이콘에서 어긋나지 않았는지 드리프트
// 테스트로 검증한다. 권한(role)·라우팅·i18n 같은 "앱이 소유하는 차원"은 여기 두지
// 않는다 — design-page 엔 role 개념이 없다. 드리프트 테스트의 조인 키는 icon 경로
// (양쪽 저장소가 동일한 파일명을 쓰고, 항목마다 고유하다).
export const SIDEBAR_MENU = [
  { id: 'snippet',  icon: '/icons-solid/asterisk-01.svg',         label: '스니핏',   section: 'top' },
  { id: 'timeline', icon: '/icons-solid/calendar.svg',            label: '타임라인', section: 'top' },
  { id: 'report',   icon: '/icons-solid/dotpoints-01.svg',        label: '리포트',   section: 'top' },
  { id: 'okr',      icon: '/icons-solid/target-04.svg',           label: 'OKR',      section: 'top' },
  { id: 'oneonone', icon: '/icons-solid/user-03.svg',             label: '1on1',     section: 'top' },
  { id: 'orgchart', icon: '/icons-solid/layers-three-01.svg',     label: '조직도',   section: 'top' },
  { id: 'meetings', icon: '/icons-solid/file-02.svg',             label: '회의록',   section: 'top' },
  { id: 'eval',     icon: '/icons-solid/edit-02.svg',             label: '평가',     section: 'top' },
  { id: 'manager',  icon: '/icons-solid/user-edit.svg',           label: '매니저',   section: 'top' },
  { id: 'admin',    icon: '/icons-solid/lock-keyhole-square.svg', label: '어드민',   section: 'bottom' },
];
