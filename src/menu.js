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
  // 라벨은 «원온원» 이다 — «1on1» 이 아니다 (기획 정본 arch-nav-routing-policy §1
  // 상단 5번 · §1-E B-1 · 2026-08-22 PW-419). 정본의 라벨 자체가 실물 앱 관측에서
  // 나온 값이라, 앱 표기(원온원)와 어긋난 쪽이 design-page 였다. pivit-work 는
  // i18n ko 라벨이 이미 «원온원» 이고, `SideNav.drift.test` 가 두 값을 대조한다.
  { id: 'oneonone', icon: '/icons-solid/user-03.svg',             label: '원온원',   section: 'top' },
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
// id 는 기획 정본 arch-nav-routing-policy §1-A 의 어드민 경로 마지막 세그먼트와
// 같게 쓴다 (`/admin/employees` → `employees`). 앱이 이 id 로 `/admin/<id>` 를
// 만들지는 않지만, 정본 표와 이름이 갈리면 어느 쪽이 맞는지 알 수 없어진다.
export const ADMIN_MENU = [
  // 🔴 [L] 2026-08-24 (PW-446 · David 확정 «안 B») — 레일 IA 재편 1단계.
  //    라벨·순서·그룹만 바꾼 것이며 **라우트 변경 0건**이다(id 는 하나도 안 바뀌었다).
  //    ⚠️ 이 배열은 **앱 실물보다 앞서 있다.** PW-326·PW-334·PW-408 은 「앱을 사실로
  //    삼는다」로 판정했지만 이 건은 반대 방향 — 기획이 개선안을 먼저 들고 나갔다.
  //    앱에 옛 라벨·순서가 남아 있는 것을 근거로 되돌리지 말 것.
  //    · 순서는 **좁은 것 → 넓은 것**: 사람(구성원) → 조직 단위(팀 · 조직) →
  //      조직·인사 기준값(조직 설정) → 전사 정책(워크스페이스) → 전사 접근 제어(권한).
  //      종전에는 가장 넓은 「워크스페이스」가 좁은 둘 사이에 끼어 있었다.
  //    · 「팀 · 조직」 개명은 **이 화면이 조직 단위 구조의 편집 주인**이라는 사실을
  //      이름에 드러내기 위한 것이다 — 「조직 설정」이 그 자리로 오독되던 것을 끊는다.
  //    · 「조직 설정」·「권한 기준정보」는 **일부러 그대로 뒀다.** 앞은 조직 계층을
  //      실제로 편집하는 화면이라 「인사 기준정보」로 부르면 같은 병이 재발하고(2단계
  //      PW-447 로 보류), 뒤는 2026-08-24 David 지시로 화면 범위와 함께 롤백됐다.
  { id: 'overview',      icon: '/icons-solid/dotpoints-01.svg',        label: '개요',            group: 'management' },
  { id: 'employees',     icon: '/icons-solid/user-03.svg',             label: '구성원',          group: 'management' },
  { id: 'team-management', icon: '/icons-solid/user-edit.svg',           label: '팀 · 조직',       group: 'management' },
  { id: 'field-options', icon: '/icons-solid/settings-02.svg',         label: '조직 설정',        group: 'management' },
  // 조직 설정(필드 옵션·계층)이 '조직을 어떻게 쪼개는가' 라면 이쪽은 '회사가 어떤
  // 기준값으로 도는가'(근무·휴가·승인 정책) — 인접하지만 다른 축이라 아이콘도 나눈다.
  // 아이콘은 시안이 명시한 회사(건물) — icons-solid 세트의 building-05.
  { id: 'workspace-settings', icon: '/icons-solid/building-05.svg',     label: '워크스페이스',     group: 'management' },
  { id: 'rbac',          icon: '/icons-solid/lock-keyhole-square.svg', label: '권한 기준정보',    group: 'management' },
  // «② 리포트» — [L] 2026-08-24 (PW-446). 그룹은 «얼마나 자주 쓰나»로 가른다.
  // ① 관리는 **현재 상태**를 손보는 일상 운영이고, 이 화면은 **시점과 이력**을 다룬다
  // (조직 현황 · 발령 · 발령 이력 · As Of). 인사 이벤트가 있을 때만 쓴다.
  // ⚠️ 근거는 「조회 전용이라서」가 **아니다** — 서브탭의 `발령 단건`·`발령 대량` 은
  // 인사 발령을 생성하는 편집 화면이다. 정확히는 「조회가 주된 성격이라」다.
  { id: 'snapshot',      icon: '/icons-solid/clock-check.svg',         label: '조직 스냅샷',      group: 'report' },
  // 기획 정본(arch-nav-routing-policy §1-A)의 «평가 운영» 그룹 — 리포트 다음, 시스템 앞.
  // 화면은 평가 셸의 사이클 목록이고, 어드민 레일은 그 진입점만 갖는다.
  { id: 'eval-cycle',    icon: '/icons-solid/clipboard-check.svg',     label: '평가 사이클',      group: 'eval-ops' },
  { id: 'notifications', icon: '/icons-solid/alert-triangle.svg',      label: '알림 설정',        group: 'system' },
  // 기획(arch-nav-routing-policy §1-A 시스템 설정 · admin-app.jsx ADMIN_NAV_ITEMS)이
  // '알림 설정' 바로 다음에 두는 항목 — 규칙 기반 알림 설정과 1회성 대량 발송을 나란히 둔다.
  { id: 'messages',      icon: '/icons-solid/mail-01.svg',             label: '메시지 발송',      group: 'system' },
  { id: 'integrations',  icon: '/icons-solid/link-01.svg',             label: '연동 설정',        group: 'system' },
  // Log in As(임퍼소네이션) — 기획 정본이 «시스템» 의 연동 설정과 AI 프롬프트 설정
  // 사이에 둔다(2026-07-02 평가 HR 화면에서 이관).
  { id: 'login-as',      icon: '/icons-solid/user-circle.svg',         label: 'Log in As',        group: 'system' },
  { id: 'ai-tuning',     icon: '/icons-solid/ai-chat-01.svg',          label: 'AI 프롬프트 설정', group: 'system' },
  // 결제·구독 — «시스템» 그룹의 **마지막 항목**이고, 결제 전용 그룹 헤더는 만들지
  // 않는다 (arch-nav-routing-policy §1-A v1.18 · 2026-08-22 PW-375 안 C 확정).
  // 누르면 결제 셸(billing-app.jsx)이 어드민 캔버스에 렌더되고, 결제 화면 7개 사이의
  // 이동은 그 셸의 상단 탭이 담당한다 — 그래서 레일에는 /admin/billing 하나만 둔다.
  // 종전 group: 'billing' 은 정본에 없는 그룹이었다. 항목 자체를 지우면 결제 화면에
  // 딥링크 말고 들어갈 문이 없어지므로, 지우는 것이 아니라 옮긴다.
  // ⚠️ PW-446 1단계 정본은 이것을 「④ 독립 그룹」으로 적었으나, 그 근거가 «앱이 이미
  // 별도 그룹으로 구현해 두었다(2026-08-20 실측)» 였고 **그 앱 상태는 2026-08-22
  // PW-375 로 이미 없어졌다.** 1단계 «안 B» 도 결제 그룹은 「그대로」라고 적었으므로
  // 여기서는 건드리지 않는다 — 독립 그룹 승격 여부는 PW-446 에 질문으로 남겼다.
  { id: 'billing',       icon: '/icons-solid/credit-card-02.svg',      label: '결제 · 구독',      group: 'system' },
];
