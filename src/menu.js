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
  // '평가'(/eval)는 역할로 분기한다(스펙 eval-app.jsx 역할섹션): 매니저는 '팀 평가
  // 관리' 허브로, 구성원은 셀프 리뷰로, HR 은 사이클 목록으로. 과거 별도 최상위였던
  // '팀 평가'(캘리 결과 딥링크)는 중복·의미축소라 제거하고 '평가' 안으로 일원화했다.
  { id: 'eval',     icon: '/icons-solid/edit-02.svg',             label: '평가',     section: 'top' },
  { id: 'manager',  icon: '/icons-solid/user-edit.svg',           label: '매니저',   section: 'top' },
  { id: 'admin',    icon: '/icons-solid/lock-keyhole-square.svg', label: '어드민',   section: 'bottom' },
];

// ADMIN_MENU — 어드민 콘솔 사이드바 탭의 디자인 정본(순서·그룹·아이콘·라벨).
// SIDEBAR_MENU 와 같은 역할을 어드민 사이드바에 대해 한다: 여기 있는 탭만, 이
// 순서·그룹으로 노출된다. pivit-work 는 이 모듈을 import 해 자기 어드민 탭
// 레지스트리(inSpec=노출 탭)가 아이콘·그룹·순서에서 어긋나지 않았는지 드리프트
// 테스트로 검증한다. 권한(role)·라우팅·i18n 키는 앱 소유 차원이라 여기 두지 않는다.
// 드리프트 조인 키는 icon 경로(그룹 내 고유).
export const ADMIN_MENU = [
  { id: 'overview',      icon: '/icons-solid/dotpoints-01.svg',        label: '개요',            group: 'management' },
  { id: 'members',       icon: '/icons-solid/user-03.svg',             label: '구성원 관리',      group: 'management' },
  { id: 'snapshot',      icon: '/icons-solid/clock-check.svg',         label: '조직 스냅샷',      group: 'management' },
  { id: 'org',           icon: '/icons-solid/settings-02.svg',         label: '조직 설정',        group: 'management' },
  { id: 'team-mgmt',     icon: '/icons-solid/user-edit.svg',           label: '팀 관리',          group: 'management' },
  { id: 'permissions',   icon: '/icons-solid/lock-keyhole-square.svg', label: '권한 관리',        group: 'management' },
  { id: 'billing',       icon: '/icons-solid/credit-card-02.svg',      label: '결제 · 구독',      group: 'billing' },
  { id: 'notifications', icon: '/icons-solid/alert-triangle.svg',      label: '알림 설정',        group: 'system' },
  // 기획(arch-nav-routing-policy §1-A ④ 시스템 설정 · admin-app.jsx ADMIN_NAV_ITEMS)이
  // '알림 설정' 바로 다음에 두는 항목 — 규칙 기반 알림 설정과 1회성 대량 발송을 나란히 둔다.
  { id: 'messages',      icon: '/icons-solid/mail-01.svg',             label: '메시지 발송',      group: 'system' },
  { id: 'integrations',  icon: '/icons-solid/link-01.svg',             label: '연동 설정',        group: 'system' },
  { id: 'ai-prompts',    icon: '/icons-solid/ai-chat-01.svg',          label: 'AI 프롬프트 설정', group: 'system' },
];
