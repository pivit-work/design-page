import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import AvatarFallback from './AvatarFallback.jsx';
import Card from './Card.jsx';
import SectionLabel from './SectionLabel.jsx';
import { narrowByParent } from './jobAxis.js';
import OrgTreePicker, { OrgPathLabel } from './OrgTreePicker.jsx';
import {
  buildOrgTree, findOrgEntry, primaryOrgEntry, matchesOrgSubtree, ORG_FILTER_UNASSIGNED,
} from './orgTree.js';
import SquadPicker, { SquadCell, isVisibleSquadStatus } from './SquadPicker.jsx';
import { ExportMenu, SalaryExportModal } from './employeeExport.jsx';
/* 구성원 기록 창 3종 — 폐기된 스프레드시트에서 옮겨 왔다(PW-576). 코드는 그대로다. */
import {
  HrProfileModal, SalaryHistoryModal, CeoConfirmModal, CeoBadge, IconSalary, IconCrown,
} from './AdminEmployeeRecordModals.jsx';
import { buildExportItems } from './employeeExportItems.js';
import AdminInviteModal from './AdminInviteModal.jsx';
import {
  IconAlert, IconCheck, IconCheckmark, IconChevronDown, IconChevronLeft, IconChevronRight,
  IconMore, IconPlus, IconSearch, IconSettings, IconUser, IconX,
} from './employeesIcons.jsx';

/**
 * AdminEmployeesCanvas — 어드민 "직원 관리" 화면 Pure 컴포넌트.
 * pivit-specs 의 admin-employees-view.jsx 시안을 design-page 정본으로 포팅.
 *
 * 시안 대비 차이 (pivit-work 데이터 모델에 맞춤):
 *  - "매니저"(개인 상급자)는 **직접 배정한다** — 미배정 탭의 배정 드롭다운, 전체 구성원
 *    탭(시트)의 매니저 컬럼. 조직장 자리와는 별개 축이다(PW-292).
 *  - "미배정" 은 조직 단위(orgUnit) 기준. 배정은 orgUnit 선택으로 처리.
 *  - 탭은 2 개: 전체 구성원 / 미배정 관리. (초대 관리는 별도 트랙)
 *
 * 모든 데이터·라벨은 props 로 받는다 (page wrapper 가 fetch·매핑·i18n·persist 소유).
 * UI 상태(탭/검색/필터/페이지/열린 메뉴/편집 draft)만 내부에서 관리한다.
 * 스타일은 design-page 토큰 기반 src/admin.css (.admin-emp-*) 클래스.
 * 호스트 앱은 `@pivit-work/design-page/styles/admin.css` 를 import 해야 한다.
 */

const DEFAULT_LABELS = {
  tabs: { members: '전체 구성원', unassigned: '미배정 관리', invites: '초대 관리' },
  /** 협의 단가 계약 좌석 안내 (PW-344 ⑤) — **차단이 아니라 과금**이라는 사실을 문구가 밝힌다. */
  contract: {
    seatsLabel: '계약 좌석',
    seatsValue: (min, max) => (max == null ? `${min}명 이상` : `${min}~${max}명`),
    billedLabel: '청구 좌석',
    billedValue: (seats) => `${seats}명`,
    underMinReason: (min) => `(약정 하한 ${min}좌석으로 청구)`,
    overMax: (max, unit) =>
      `계약 좌석 범위(${max}명)를 초과했습니다. 구성원 추가는 계속 가능하며, 초과분은 ₩${Number(unit || 0).toLocaleString('ko-KR')} 단가로 청구되고 영업팀에 통지됩니다.`,
  },
  countSuffix: '명',
  // `dept` 는 «소속(기능조직)» 이다 — 구 «부서»·단일 select 는 폐기됐다(§3.8.1).
  /* 목록 뷰의 필터 칩 (PW-400 · §3.1).
     「직종」은 저장 컬럼이 없어 오래 빠져 있었는데 PW-502 에서 생겼다. 다만 이 칩은
     **워크스페이스가 직종을 쓰기로 한 회사에서만** 선다(§2-1-A) — 안 쓰는 회사에
     세우면 늘 0건인 축이 생긴다(E6, 빠져 있던 것과 같은 이유다). */
  filters: {
    dept: '소속(기능조직)',
    jobCategory: '직종',
    businessTitle: '직함',
    squad: '스쿼드',
    position: '직책',
    level: '직급',
    family: '직군',
    ladder: '직렬',
    duty: '직무',
    workLocation: '근무지(도시)',
    workCountry: '근무지(국가)',
    workBuilding: '근무 위치(빌딩)',
    employmentType: '고용형태',
    manager: '매니저',
    status: '재직상태',
    all: '전체',
    reset: '필터 초기화',
  },
  // `csvUpload` 라벨이 여기 있었지만 **어디서도 렌더되지 않았다** — 라벨은 CSV
  // 업로드가 있다고 말하는데 화면에는 없는 상태가 오래 남아 있었다(PW-212).
  // CSV 업로드는 초대 모달의 탭(`AdminInviteModal` §2-4)으로 들어갔으므로,
  // 다음 사람이 같은 오해를 하지 않도록 죽은 라벨을 지운다.
  //
  // 같은 이유로 `search`·`managerFilter`·`assignManager`·`cols`·`edit`·
  // `emptyFiltered`·`pagination`·`picker`·`panel` 도 지웠다(PW-284). 전체 구성원
  // 탭이 이 캔버스의 자체 표에서 시트 위임으로 바뀌면서 이 라벨들을 읽는 자리가
  // 전부 사라졌는데, 기본값만 남아 있었다. (그 시트는 PW-576 으로 폐기됐고, 목록
  // 표가 다시 이 캔버스 안에 있다 — 되살릴 때는 「그리는 자리가 먼저」다.)
  //
  // 특히 `panel` 은 만들어진 적 없는 "구성원 상세 패널" 용이었고, 그 안의
  // `managerAuto`('조직장에서 자동 계산')는 **이 제품의 핵심 규칙**을 말하는
  // 문구였다. 코드만 보면 화면에 그 안내가 있는 것처럼 보였다. 그 규칙을 실제로
  // 알리는 자리는 미배정 탭 아래 `unassigned.teamNote` 하나다 — 지우지 말 것.
  // 다시 넣으려면 라벨보다 **그리는 자리가 먼저** 있어야 한다.
  invite: '구성원 초대',
  csvUpload: 'CSV 업로드',
  unassignedPill: '미배정',
  concurrentCount: '겸직 {count}',
  // 목록 뷰 (PW-373) — `#104` 이전 라벨을 되살렸다. 자리가 다시 생겼으므로
  // 「그리는 자리가 먼저」 규칙을 지킨 복원이다.
  // 「목록 / 스프레드시트」 보기 전환 라벨(`viewSwitch`)은 PW-576 으로 함께 걷었다.
  listSearch: '이름·이메일·소속 검색',
  listEmptyFiltered: '조건에 맞는 구성원이 없습니다',
  listRowMenu: '행 메뉴',
  listManagerFilter: {
    assigned: '매니저 있음',
    unassigned: '매니저 미배정',
    prefix: '매니저',
    /* 미배정 행의 그 자리 배정 버튼 (PW-400 §추가①). 배정된 행은 읽기 전용이라
       이 문구가 뜨지 않는다 — 바꾸려면 행 `⋯` 의 「매니저 변경」 을 거친다. */
    assign: '+ 매니저 배정',
    /* 대표 행 — 상급자를 가질 수 없다. 「미배정」 으로 그리면 영원히 처리되지 않는
       빨간 칸이 남는다(§1-3-c R4). */
    ceoTop: '조직 최상위 — 대표는 상급자를 가질 수 없습니다',
  },
  listPagination: { of: '/', prev: '이전', next: '다음' },
  /* 행 선택 · 「일괄 처리」 드롭다운 (PW-608 · 기획 §3.1).
     스프레드시트 뷰가 폐기되며(PW-576) 갈 곳이 없어진 「여러 명을 골라 하는 조작」이
     이 뷰로 왔다. 라벨의 `{count}` 는 **고른 사람 수**다 — 화면에 보이는 행 수가
     아니다(고른 뒤 필터를 바꿔도 선택은 남는다). */
  listBulk: {
    selectRow: '이 사람 선택',
    selectPage: '이 쪽 전체 선택',
    trigger: '일괄 처리 ({count})',
    /* 「변경」이 아니라 「추가」다 — 교체를 허용하면 겸직인 사람의 나머지 소속이
       한 번에 사라진다(PW-326). 서버 계약에도 교체 파라미터가 없다. */
    orgAppend: '소속 일괄 추가',
    orgAppendSubtitle: '선택 {count}명',
  },
  /* 목록 뷰 표의 열 이름과 ⚙ 컬럼 표시 설정 (PW-400).
     🔴 `dept` 는 「부서」 가 아니라 「소속(기능조직)」 이다 — 스쿼드 열과 나란히 두면
        두 축이 같은 것처럼 읽힌다(SQ1). 시트 뷰의 같은 열도 같은 이름을 쓴다. */
  listCols: {
    trigger: '컬럼',
    title: '표시할 열',
    cols: {
      name: '이름',
      nickname: '닉네임',
      displayName: '표시 이름',
      email: '이메일',
      phone: '전화번호',
      employeeCode: '사번',
      dept: '소속(기능조직)',
      squads: '스쿼드',
      jobPosition: '직책',
      jobLevel: '직급',
      /* 직위 ≠ 직급. 직급은 내부 등급(Senior), 직위는 국내식 호칭(과장)이다(PW-400). */
      jobRank: '직위',
      /* 직종 ≠ 직군. 직종은 근로 형태 대분류(사무직), 직군은 직렬 묶음(개발)이다. */
      jobCategory: '직종',
      /* 직함 ≠ 직급·직위. 명함에 찍히는 대외 명칭이다(전무). */
      businessTitle: '직함',
      jobFamily: '직군',
      /* ⚠ `jobTitle` 은 직무가 아니라 **직렬**이다(2026-08-10 M5-b). */
      jobTitle: '직렬',
      jobDuty: '직무',
      employmentType: '고용형태',
      /* FTE — 풀타임 환산 비율 %. 고용형태와 다른 축이다(PW-481). */
      ftePercent: 'FTE',
      employmentStatus: '재직상태',
      /* 근무 위치 3층 — 국가 > 도시 > 빌딩(§1-3-g 45·46·47 · PW-503). 도시 이름에
         층위를 안 밝히면 세 열이 전부 「근무지」 로 보인다. */
      workLocation: '근무지(도시)',
      workCountry: '근무지(국가)',
      workBuilding: '근무 위치(빌딩)',
      manager: '매니저',
      hireDate: '입사일',
      terminationDate: '퇴사일',
      education: '학력',
      salary: '연봉',
    },
  },
  panel: {
    basicInfo: '기본 정보',
    name: '이름',
    email: '업무 이메일',
    /* 로그인 키라 저장 전에 확인 창이 뜬다(§3.2-A). 종전에는 이 칸이 읽기 전용이었고
       고치는 자리가 스프레드시트뿐이었는데, 그 화면이 폐기돼(PW-576) 여기가 유일한
       입력 경로가 됐다. 확인 창은 호출부의 저장 경로가 그대로 띄운다. */
    emailNote: '로그인·슬랙·캘린더가 이 주소로 사람을 찾습니다. 바꾸면 저장 전에 확인 창이 뜹니다',
    level: '직급',
    position: '직책',
    joined: '입사일',
    none: '— 미지정 —',
    /* PW-576 — 폐기된 스프레드시트에서만 고칠 수 있던 칸들이 여기로 왔다.
       라벨은 그 화면의 열 이름을 그대로 쓴다(같은 값을 다른 이름으로 부르지 않는다). */
    nickname: '닉네임',
    displayName: '표시 이름',
    phone: '전화번호',
    employeeCode: '사번',
    jobRank: '직위',
    jobCategory: '직종',
    jobFamily: '직군',
    jobLadder: '직렬',
    jobDuty: '직무',
    businessTitle: '직함',
    employmentType: '고용형태',
    classifySection: '인사 분류',
    workSection: '근무',
    workCountry: '근무지(국가)',
    workLocation: '근무지(도시)',
    workBuilding: '근무 위치(빌딩)',
    ftePercent: 'FTE (%)',
    roleSection: '권한',
    role: '권한',
    roleNote: '조직장으로 지정하면 «멤버» 는 «매니저» 로 자동으로 올라갑니다',
    roles: { admin: '어드민', manager: '매니저', member: '멤버' },
    paySection: '보상',
    salary: '연봉',
    salaryHistory: '연봉 이력',
    recordSection: '기록',
    education: '학력',
    hrProfile: 'HR 기록',
    hrProfileHint: '학력·경력·자격증·부양가족·서류·신원 정보',
    orgAssign: '소속',
    orgNone: '미배정',
    orgChange: '변경',
    managerSection: '매니저',
    managerWhere: '매니저 배정은 «미배정 관리» 탭에서 합니다',
    statusSection: '재직 상태',
    /* 재직 상태별 날짜 칸 (§3.2.1). 상태를 고르면 그 칸이 라디오 바로 아래에 뜬다. */
    probationEnd: '수습 종료일',
    leaveStart: '휴직 시작일',
    leaveEnd: '휴직 종료일',
    resignedAt: '퇴사일',
    statusDateLoading: '불러오는 중…',
    statusDateLoadError: '날짜를 불러오지 못했습니다. 패널을 닫았다 다시 열어 주세요.',
    statusDateSaveError: '날짜를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    close: '닫기',
    cancel: '취소',
    save: '저장',
    saving: '저장 중…',
    /* 개인정보 변경 이력 탭 (PW-460 §2-D) */
    tabInfo: '정보',
    tabHistory: '변경 이력',
    historyLoadError: '이력을 불러오지 못했습니다.',
    historyRetry: '다시 시도',
    historyEmpty: '아직 변경 이력이 없습니다.',
    historyEmptyHint: '휴대폰·주소·가족 정보 등 개인정보가 바뀌면 여기에 쌓입니다.',
    historyBySelf: '본인',
    historyAdded: '추가',
    historyRemoved: '삭제',
    historyPurged: '파기됨',
    historyWithheld: '변경됨',
    historyNone: '—',
  },
  /* 개인정보를 바꾸는 저장에서 사유를 받는 모달 (PW-460 §2-D-4) */
  changeReason: {
    title: '개인정보를 변경합니다',
    lead: '남이 바꾼 기록이라 사유를 남깁니다. 이력에 그대로 보입니다.',
    label: '변경 사유',
    placeholder: '본인 요청 · 서류 대조 후 정정 등',
    cancel: '취소',
    submit: '변경 저장',
  },
  loading: '불러오는 중…',
  menu: {
    edit: '수정', changeManager: '조직 배정', deactivate: '비활성화',
    /* 대표(CEO) 지정·해제 (§3.6-A · PW-576 로 시트에서 옮겨 왔다) */
    assignCeo: '대표로 지정', releaseCeo: '대표 지정 해제', ceoBadge: '대표',
  },
  /* 기록 창 3종(HR 기록 · 연봉 이력 · 대표 확인)의 문구.
     폐기된 스프레드시트가 `sheetLabels` 로 받던 것과 **같은 묶음**이라 소비자는
     그때 넘기던 객체를 그대로 넘기면 된다(PW-576). 창 안쪽에 한국어 기본값이
     들어 있어 안 넘겨도 렌더는 된다. */
  records: {},
  // 재직상태 4종(§3.2.1) + 폴백. `pending` 이 「수습」 이던 것은 enum 에 `probation` 이
  // 없어 자리를 메우던 것이고, PW-422 에서 실제 값이 생겨 제자리를 찾았다.
  status: {
    active: '재직', probation: '수습', on_leave: '휴직', terminated: '퇴사',
    pending: '대기', other: '기타',
  },
  role: { admin: '어드민', manager: '매니저', member: '멤버' },
  unassigned: {
    bannerTitle: '조직 또는 매니저가 배정되지 않은 구성원이 있습니다.',
    bannerBody: '온보딩에서 "나중에 배정"을 선택했거나 신규 합류 후 미배정 상태입니다. 1on1·OKR·평가가 정상 작동하려면 조직·매니저 배정이 필요합니다.',
    noOrgTitle: '조직(부서) 미배정 구성원',
    noOrgEmpty: '모든 구성원에게 조직이 배정되었습니다',
    noManagerTitle: '매니저 미배정 구성원',
    noManagerEmpty: '모든 구성원에게 매니저가 배정되었습니다',
    assignOrg: '조직 배정',
    goTeamMgmt: '팀 관리',
    // PW-292 — 매니저(개인 상급자)는 여기서 직접 배정한다. 종전 문구는
    // '매니저는 조직장에서 자동 계산됩니다' 였는데, 그 규칙 때문에 조직장이 아닌
    // 매니저는 담당이 영구히 0명이었다. 두 축은 별개다.
    assignManager: '매니저 배정',
    managerSearch: '이름·조직으로 검색',
    managerNoCandidate: '배정할 수 있는 매니저가 없습니다',
    teamNote: '※ 매니저(개인 상급자)와 조직장은 별개입니다. 조직장 지정은 팀 관리 화면에서 진행됩니다.',
    // PW-300 — 기획 §3.3 의 일괄 배정·원클릭 조직장 배정.
    // `{name}`·`{count}` 는 캔버스가 치환한다(i18next 의 `{{}}` 와 겹치지 않게 중괄호 1개).
    bulkStart: '일괄 배정',
    bulkCancel: '취소',
    bulkAssign: '선택 {count}명에게 매니저 배정',
    bulkSelectAll: '전체 선택',
    bulkClearAll: '전체 해제',
    assignToLeader: '{name}(조직장)로',
  },
  invites: {
    summaryPending: '대기중', summaryPendingSub: '수락 대기',
    summaryAccepted: '수락됨', summaryAcceptedSub: '온보딩 진행',
    summaryExpired: '만료됨', summaryExpiredSub: '재발송 필요',
    filterAll: '전체', newInvite: '새 초대 발송',
    composerEmail: '초대할 이메일', composerName: '이름', composerRole: '권한', composerSend: '발송', composerCancel: '취소',
    composerJobTitle: '직무', composerJobLevel: '직급',
    composerTeam: '소속 팀', composerTeamNone: '선택 안 함 (가입 후 배정)',
    colEmail: '이메일', colInviter: '발송자', colSentAt: '발송일시', colStatus: '상태', colActions: '액션',
    copyLink: '링크 복사', resend: '재발송', cancel: '취소',
    statusPending: '대기중', statusAccepted: '수락됨', statusExpired: '만료됨',
    empty: '해당 상태의 초대가 없습니다.',
    linkType: '링크',
  },
  // 소속 트리 팝업(OrgTreePicker) — 미배정 탭·소속 셀이 같은 라벨을 쓴다(PW-112).
  orgPicker: {
    title: '소속 선택', hint: '상위 조직도 선택할 수 있습니다.',
    search: '조직 검색', empty: '검색 결과가 없어요', unassigned: '— 미배정 —',
    none: '선택 없음 — 저장하면 미배정이 됩니다',
    apply: '적용', cancel: '취소', expand: '펼치기', collapse: '접기',
  },
  /* 스쿼드 셀·선택 팝업(PW-438) — 목록 뷰가 시트 뷰와 **같은 부품**을 쓰므로 문구도
     같다. 여기 기본값을 두는 것은 라벨을 안 넘겼을 때 화면이 비지 않게 하기 위함이고,
     소비자는 폐기된 시트에 넘기던 `sheetLabels.squad` 를 그대로 넘기면 된다.
     🔴 계획 투입%(SQ6) 문구는 여기 없다 — 넣어 두면 언젠가 화면에 %가 다시 붙는다. */
  squadPicker: {
    cellHint: '클릭해서 스쿼드를 선택합니다',
    planned: '준비중',
    lead: '스쿼드 리드',
    closedCount: '종료 {count}',
  },
};

function merge(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (provided[k] && typeof provided[k] === 'object' && !Array.isArray(provided[k])) {
      out[k] = merge(base[k] || {}, provided[k]);
    } else if (provided[k] !== undefined) {
      out[k] = provided[k];
    }
  }
  return out;
}

const PAGE_SIZE = 20;

// 기본값으로 쓰는 **고정 빈 배열** — 매 렌더 새 배열을 만들면 하위 memo 가 매번 깨진다.
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

/* 라벨 안의 `{key}` 를 값으로 바꾼다. i18next 는 `{{key}}` 를 쓰므로 소비자가 넘긴
   문장에서 이 자리는 치환되지 않은 채로 도착한다 — 이름·인원수를 아는 쪽이 여기다. */
function fill(template, vars) {
  return Object.keys(vars).reduce(
    (acc, k) => acc.split(`{${k}}`).join(String(vars[k])),
    String(template ?? ''),
  );
}

/* ── 배지 ─────────────────────────────────────────────── */
/**
 * 4종(§3.2.1) + 폴백. 표에 없는 값은 **회색 「기타」로 그린다** — 칸을 비우면 데이터가
 * 사라진 것처럼 보이고, 코드값(`probation`)을 그대로 흘리면 화면에 영문이 샌다.
 */
function StatusBadge({ status, labels }) {
  const known = ['active', 'probation', 'on_leave', 'terminated', 'pending', 'other'];
  const cls = known.includes(status) ? status.replace('_', '-') : 'other';
  const label = labels.status[status] || labels.status.other;
  return <span className={`admin-emp-status is-${cls}`}>{label}</span>;
}

function RolePill({ role, labels }) {
  if (!role || role === 'member') return null;
  return <span className={`admin-emp-role-pill is-${role}`}>{labels.role[role] || role}</span>;
}

/* 조직 선택은 계층 트리 팝업(OrgTreePicker)으로 통일했다 — 종전의 평면 드롭다운
   `OrgUnitPicker` 는 이름만 나열해 상하 관계를 볼 수 없었다(PW-112, §5-A). */

/* ── 행 액션 메뉴 ───────────────────────────────────────── */
function RowActionMenu({ onEdit, onChangeManager, onDeactivate, onCeo, ceoMode, onClose, labels, canEdit, openUp = false }) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className={`admin-emp-row-menu${openUp ? ' is-up' : ''}`}>
      <button type="button" className="admin-emp-row-menu-item" onClick={() => { onEdit(); onClose(); }}>
        {labels.menu.edit}
      </button>
      <button type="button" className="admin-emp-row-menu-item" onClick={() => { onChangeManager(); onClose(); }}>
        {labels.menu.changeManager}
      </button>
      {/* 대표(CEO) 지정·해제 (§3.6-A) — 폐기된 스프레드시트에만 있던 자리다(PW-576).
          정본이 정한 위치가 여기 «⋯ 더보기» 다. 지정 경로가 없으면(어드민 아님 ·
          퇴사자 행) 항목 자체를 그리지 않는다 — 눌러도 막히는 자리를 두지 않는다. */}
      {onCeo && (
        <button
          type="button"
          className="admin-emp-row-menu-item"
          data-testid={`employees-row-ceo-${ceoMode}`}
          onClick={() => { onCeo(ceoMode); onClose(); }}
        >
          <IconCrown size={13} />
          {ceoMode === 'assign' ? labels.menu.assignCeo : labels.menu.releaseCeo}
        </button>
      )}
      {canEdit && (
        <>
          <div className="admin-emp-row-menu-divider" />
          <button type="button" className="admin-emp-row-menu-item is-danger" onClick={() => { onDeactivate(); onClose(); }}>
            {labels.menu.deactivate}
          </button>
        </>
      )}
    </div>
  );
}

/**
 * 조직(팀) 배정 여부. `department` 는 조직 단위가 없으면 레거시 텍스트 컬럼으로 폴백되므로
 * (백엔드 listUsers) 그것만 보면 실제 미배정자를 놓친다 — 조직도에 노드가 없는 사람을
 * 어드민이 찾지 못하던 원인. orgUnitIds 를 정본으로 쓰고, 없을 때만 department 로 폴백한다.
 */
function hasOrgUnit(m) {
  return Array.isArray(m.orgUnitIds) ? m.orgUnitIds.length > 0 : !!m.department;
}

/**
 * 매니저(개인 상급자) 배정 드롭다운 (PW-292).
 *
 * 검색을 붙이는 이유는 후보가 조직 인원수만큼 늘어나기 때문이다 — 200명 조직에서
 * 스크롤로 사람을 찾게 하면 배정 자체를 안 하게 된다.
 *
 * 후보 목록은 소비자(page wrapper)가 만들어 넘긴다. 캔버스가 규칙을 갖고 있으면
 * 서버 규칙과 갈리는 순간 화면이 거짓말을 한다.
 *
 * 후보 행에는 `leadLabel`(그 사람이 조직장인 조직 경로)을 병기한다(PW-300, 기획 §3.1) —
 * 어느 조직을 맡는지가 배정 판단의 근거이고, 이름만 있으면 동명이인을 가를 수 없다.
 * 문자열은 소비자가 만든다(캔버스는 여전히 규칙을 갖지 않는다).
 *
 * `trigger` 로 여는 버튼을 갈아끼운다 — 개별 배정은 `+ 매니저 배정`, 일괄 배정은
 * `선택 N명에게 매니저 배정` 이 같은 드롭다운을 연다.
 */
function ManagerPicker({ candidates, labels, onPick, trigger, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const ql = q.trim().toLowerCase();
  // 조직 경로로도 찾게 한다 — "인사팀 팀장이 누구였더라" 가 실제 배정 경로다.
  // 화면에 보이는 문자열은 검색으로도 닿아야 한다(시트 검색과 같은 원칙).
  const shown = ql
    ? candidates.filter(
      (c) => (c.label || '').toLowerCase().includes(ql)
        || (c.leadLabel || '').toLowerCase().includes(ql),
    )
    : candidates;

  return (
    <div ref={ref} className={`admin-emp-select is-right${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="admin-emp-btn is-primary is-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen((o) => !o); setQ(''); } }}
      >
        {trigger ?? (<><IconPlus size={13} />{labels.unassigned.assignManager}</>)}
      </button>
      {open && (
        <div className="admin-emp-select-menu" role="listbox">
          <input
            type="text"
            className="admin-emp-select-search"
            value={q}
            autoFocus
            placeholder={labels.unassigned.managerSearch}
            onChange={(e) => setQ(e.target.value)}
          />
          {shown.length === 0 ? (
            <div className="admin-emp-select-empty">{labels.unassigned.managerNoCandidate}</div>
          ) : (
            shown.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected="false"
                className="admin-emp-select-item"
                onClick={() => { onPick(c.id); setOpen(false); }}
              >
                <span className="admin-emp-select-item-label">{c.label}</span>
                {c.leadLabel && (
                  <span className="admin-emp-select-item-sub">
                    <IconUser size={11} />{c.leadLabel}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── 탭 B: 미배정 관리 ──────────────────────────────────── */
function UnassignedTab({
  members, orgUnits, labels, renderAvatar, onAssignOrgUnit,
  managerCandidates = [], onAssignManager, onAssignManagerBulk,
  orgLeaderByMember = EMPTY_OBJECT,
}) {
  const [pickerFor, setPickerFor] = useState(null);
  /* 일괄 배정 모드(PW-300, 기획 §3.3). 온보딩 직후 조직은 전원이 미배정이라
     개별 배정은 인원수만큼의 클릭이 된다. 모드를 나가면 선택은 비운다 —
     보이지 않는 선택이 남아 있으면 다음에 들어와서 엉뚱한 사람을 배정한다. */
  const [bulkMode, setBulkMode] = useState(false);
  const [picked, setPicked] = useState(() => new Set());
  const exitBulk = () => { setBulkMode(false); setPicked(new Set()); };
  const togglePick = (id) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const orgTree = useMemo(() => buildOrgTree(orgUnits), [orgUnits]);

  const noOrg = members.filter((m) => !hasOrgUnit(m) && m.employmentStatus !== 'terminated');
  /**
   * 매니저 미배정 (PW-292).
   *
   * 조직(팀) 배정 여부는 조건에 넣지 않는다 — 팀이 없어도 개인 상급자는 가질 수 있고,
   * 매니저는 이제 조직장에서 파생되는 값이 아니다. 종전에는 `hasOrgUnit(m) &&` 가
   * 붙어 있었는데, 그건 매니저가 소속 조직의 조직장에서 계산되던 시절의 전제다.
   *
   * 대표는 조직 최상위라 상급자를 가질 수 없으므로 이 목록의 유일한 예외다
   * (기획 `admin-spec.md §3.3` — 예외는 `is_ceo` 뿐).
   */
  const noManager = members.filter(
    (m) => !m.isCeo && !m.managerName && m.employmentStatus !== 'terminated',
  );

  return (
    <div className="admin-emp-unassigned">
      <div className="admin-emp-banner">
        <span className="admin-emp-banner-icon" aria-hidden="true"><IconAlert size={18} /></span>
        <div>
          <div className="admin-emp-banner-title">{labels.unassigned.bannerTitle}</div>
          <div className="admin-emp-banner-body">{labels.unassigned.bannerBody}</div>
        </div>
      </div>

      <Card>
        <div className="admin-emp-section-head">
          <SectionLabel>{labels.unassigned.noOrgTitle}</SectionLabel>
          <span className="admin-emp-pill is-amber">{labels.unassignedPill} {noOrg.length}{labels.countSuffix}</span>
        </div>
        {noOrg.length === 0 ? (
          <div className="admin-emp-unassigned-empty is-ok"><IconCheck size={16} />{labels.unassigned.noOrgEmpty}</div>
        ) : (
          <div className="admin-emp-unassigned-list">
            {noOrg.map((m) => (
              <div key={m.id} className="admin-emp-unassigned-row">
                {renderAvatar ? renderAvatar(m, 32) : <AvatarFallback row={m} size={32} />}
                <div className="admin-emp-unassigned-info">
                  <div className="admin-emp-unassigned-name">
                    {m.name}
                    <RolePill role={m.orgRole} labels={labels} />
                  </div>
                  <div className="admin-emp-unassigned-meta">
                    <span className="admin-emp-row-email">{m.email}</span>
                    <span>{m.title || '—'}</span>
                    {m.hireDate && <span>{(m.hireDate || '').slice(0, 10)}</span>}
                  </div>
                </div>
                <StatusBadge status={m.employmentStatus} labels={labels} />
                <div className="admin-emp-unassigned-action">
                  <button type="button" className="admin-emp-btn is-primary is-sm" onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}>
                    <IconPlus size={13} />{labels.unassigned.assignOrg}
                  </button>
                  {pickerFor === m.id && (
                    // 소속은 계층이다 — 평면 목록이면 하위 조직이 어느 본부 밑인지,
                    // 동명이팀 중 어느 쪽인지 알 수 없다(PW-112, §5-A).
                    <OrgTreePicker
                      open
                      units={orgUnits}
                      value=""
                      subtitle={m.name}
                      labels={labels.orgPicker}
                      onApply={(unitId) => { if (unitId) onAssignOrgUnit(m.id, unitId); }}
                      onClose={() => setPickerFor(null)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="admin-emp-section-head">
          <SectionLabel>{labels.unassigned.noManagerTitle}</SectionLabel>
          {/* 배지와 액션을 한 묶음으로 — 헤더가 `space-between` 이라 자식이 셋이 되면
              배지가 가운데로 밀려 기존 시각이 바뀐다. */}
          <div className="admin-emp-section-head-actions">
            <span className="admin-emp-pill is-amber">{labels.unassignedPill} {noManager.length}{labels.countSuffix}</span>
            {/* 일괄 배정 진입은 대상이 있을 때만 — 0명일 때 버튼만 남으면 눌러도 할 게 없다. */}
            {onAssignManagerBulk && noManager.length > 0 && (
            <>
              {bulkMode ? (
                <>
                  <button
                    type="button"
                    className="admin-emp-btn is-sm"
                    onClick={() => setPicked(
                      picked.size === noManager.length ? new Set() : new Set(noManager.map((m) => m.id)),
                    )}
                  >
                    {picked.size === noManager.length
                      ? labels.unassigned.bulkClearAll
                      : labels.unassigned.bulkSelectAll}
                  </button>
                  <ManagerPicker
                    candidates={managerCandidates.filter((c) => !picked.has(c.id))}
                    labels={labels}
                    disabled={picked.size === 0}
                    trigger={fill(labels.unassigned.bulkAssign, { count: picked.size })}
                    onPick={(managerId) => {
                      onAssignManagerBulk(Array.from(picked), managerId);
                      exitBulk();
                    }}
                  />
                  <button type="button" className="admin-emp-btn is-sm" onClick={exitBulk}>
                    {labels.unassigned.bulkCancel}
                  </button>
                </>
              ) : (
                <button type="button" className="admin-emp-btn is-sm" onClick={() => setBulkMode(true)}>
                  {labels.unassigned.bulkStart}
                </button>
              )}
            </>
            )}
          </div>
        </div>
        {noManager.length === 0 ? (
          <div className="admin-emp-unassigned-empty is-ok"><IconCheck size={16} />{labels.unassigned.noManagerEmpty}</div>
        ) : (
          <div className="admin-emp-unassigned-list">
            {noManager.map((m) => (
              <div key={m.id} className="admin-emp-unassigned-row">
                {bulkMode && (
                  <input
                    type="checkbox"
                    className="admin-emp-unassigned-check"
                    checked={picked.has(m.id)}
                    onChange={() => togglePick(m.id)}
                    aria-label={m.name}
                  />
                )}
                {renderAvatar ? renderAvatar(m, 32) : <AvatarFallback row={m} size={32} />}
                <div className="admin-emp-unassigned-info">
                  <div className="admin-emp-unassigned-name">{m.name}</div>
                  <div className="admin-emp-unassigned-meta">
                    <span className="admin-emp-row-email">{m.email}</span>
                    {/* 소속은 최하위 팀명만 보이면 어느 본부 밑인지 알 수 없다 — 전체 경로로 쓴다(§5-A P4).
                        직급은 어휘 표준화(PW-36) 이후 jobLevel 이다. 옛 `title` 을 읽어 늘 '—' 였다. */}
                    <OrgPathLabel
                      entry={primaryOrgEntry(orgTree, m.orgUnitIds)}
                      fallback={m.department}
                      muted="var(--text-tertiary)"
                      color="inherit"
                    />
                    <span>{m.jobLevel || m.jobPosition || '—'}</span>
                  </div>
                </div>
                <StatusBadge status={m.employmentStatus} labels={labels} />
                {/* 미배정을 보여만 주고 그 자리에서 못 고치면 어드민이 갈 곳이 없다.
                    핸들러가 없으면(권한 없음) 버튼 자체가 안 뜬다.
                    일괄 배정 모드에서는 행마다 배정 버튼을 숨긴다 — 체크로 고르는 중에
                    개별 배정이 함께 보이면 어느 쪽이 반영되는지 알 수 없다. */}
                {onAssignManager && !bulkMode && (
                  <div className="admin-emp-unassigned-action-group">
                    {/* 원클릭 조직장 배정(PW-300, 기획 §3.3). 대부분의 사람은 상급자가
                        소속 조직장이므로, 이 한 번이 200명 드롭다운을 대신한다.
                        본인이 그 조직 조직장이면 소비자가 아예 내려주지 않는다. */}
                    {orgLeaderByMember[m.id] && (
                      <button
                        type="button"
                        className="admin-emp-btn is-sm"
                        onClick={() => onAssignManager(m.id, orgLeaderByMember[m.id].id)}
                      >
                        <IconUser size={12} />
                        {fill(labels.unassigned.assignToLeader, { name: orgLeaderByMember[m.id].name })}
                      </button>
                    )}
                    <ManagerPicker
                      candidates={managerCandidates.filter((c) => c.id !== m.id)}
                      labels={labels}
                      onPick={(managerId) => onAssignManager(m.id, managerId)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="admin-emp-team-note">{labels.unassigned.teamNote}</div>
      </Card>
    </div>
  );
}

/* ── 드롭다운 필터 ──────────────────────────────────────────
 * 전체 구성원 탭이 검색형 필터로 넘어가면서 이 컴포넌트가 파일에서 사라졌는데,
 * 초대 관리 탭의 사용처는 남아 있어 그 탭을 열면 ReferenceError 로 화면 전체가
 * 백지가 됐다. 스타일(admin-emp-select*)은 admin.css 에 그대로 있어, 원래
 * 정의를 되살려 붙인다.
 * ------------------------------------------------------------ */
function FilterDropdown({ testId, label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const opts = options.map((o) => (typeof o === 'object' ? o : { id: o, label: o }));
  const selected = opts.find((o) => o.id === value) || null;
  const isDefault = value === 'all' || value === '전체';
  const triggerText = isDefault ? label : (selected ? selected.label : label);

  return (
    <div ref={ref} className={`admin-emp-select${open ? ' is-open' : ''}${isDefault ? '' : ' is-active'}`}>
      <button
        type="button"
        className="admin-emp-select-trigger"
        data-testid={testId}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="admin-emp-select-value">{triggerText}</span>
        <span className="admin-emp-select-chevron"><IconChevronDown size={13} /></span>
      </button>
      {open && (
        <div className="admin-emp-select-menu" role="listbox">
          {opts.map((o) => {
            const isSel = o.id === value;
            return (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={isSel}
                className={`admin-emp-select-item${isSel ? ' is-selected' : ''}`}
                // 계층 옵션(소속)은 depth 당 12px 들여쓴다 — 공백문자로 들여쓰지
                // 않는다(시트의 같은 목록과 같은 규칙, §5-A P1).
                style={o.depth ? { paddingLeft: 10 + o.depth * 12 } : undefined}
                onClick={() => { onChange(o.id); setOpen(false); }}
              >
                <span className="admin-emp-select-item-label">{o.label}</span>
                {isSel && <span className="admin-emp-select-item-check"><IconCheckmark size={15} /></span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── 탭 C: 초대 관리 ────────────────────────────────────── */
const INVITE_STATUSES = ['pending', 'accepted', 'expired'];

/**
 * 탭 C 헤더의 `+ 새 초대 발송`.
 *
 * [2026-08-10 §8 / PW-114] 종전에는 여기에 **인라인 작성 바**(이메일 1건)가 열렸고,
 * 탭 A 의 `+ 구성원 초대` 는 아예 핸들러가 없었다. 이제 두 진입점이 같은
 * `AdminInviteModal` 을 연다 — 초대를 관리하다 하나 더 보내려고 탭을 옮길 필요가
 * 없고, 겸직 소속·인사 분류도 그 자리에서 지정한다.
 */
function InvitesTab({
  invites, labels, canEdit,
  onOpenInvite, onResendInvite, onCancelInvite, onCopyInviteLink,
}) {
  const [filter, setFilter] = useState('all');

  const counts = {
    pending: invites.filter((i) => i.status === 'pending').length,
    accepted: invites.filter((i) => i.status === 'accepted').length,
    expired: invites.filter((i) => i.status === 'expired').length,
  };
  const filtered = invites.filter((inv) => filter === 'all' || inv.status === filter);

  const filterOpts = [
    { id: 'all', label: labels.invites.filterAll },
    { id: 'pending', label: labels.invites.statusPending },
    { id: 'accepted', label: labels.invites.statusAccepted },
    { id: 'expired', label: labels.invites.statusExpired },
  ];
  const summary = [
    { key: 'pending', label: labels.invites.summaryPending, value: counts.pending, sub: labels.invites.summaryPendingSub, cls: 'is-pending' },
    { key: 'accepted', label: labels.invites.summaryAccepted, value: counts.accepted, sub: labels.invites.summaryAcceptedSub, cls: 'is-accepted' },
    { key: 'expired', label: labels.invites.summaryExpired, value: counts.expired, sub: labels.invites.summaryExpiredSub, cls: 'is-expired' },
  ];

  const statusLabel = (s) =>
    s === 'pending' ? labels.invites.statusPending
      : s === 'accepted' ? labels.invites.statusAccepted
        : labels.invites.statusExpired;

  return (
    <div className="admin-emp-unassigned">
      <div className="admin-emp-invite-summary">
        {summary.map((s) => (
          <div key={s.key} className={`admin-emp-invite-stat ${s.cls}`}>
            <div className="admin-emp-invite-stat-label">{s.label}</div>
            <div className="admin-emp-invite-stat-value">{s.value}</div>
            <div className="admin-emp-invite-stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <Card>
        <div className="admin-emp-toolbar">
          <FilterDropdown label={labels.filters.status} value={filter} options={filterOpts} onChange={setFilter} />
          {canEdit && (
            <button type="button" className="admin-emp-btn is-primary" onClick={onOpenInvite}>
              <IconPlus size={14} />{labels.invites.newInvite}
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="admin-emp-unassigned-empty">{labels.invites.empty}</div>
        ) : (
          <div className="admin-emp-list">
            {filtered.map((inv) => (
              <div key={inv.id} className="admin-emp-row">
                <div className="admin-emp-row-info">
                  <div className="admin-emp-row-name">{inv.email || labels.invites.linkType}</div>
                  <div className="admin-emp-row-meta">
                    <span>{labels.invites.colInviter} {inv.invitedByName || '—'}</span>
                    {inv.sentAt && (<><span className="admin-emp-meta-dot" aria-hidden="true">·</span><span>{inv.sentAt}</span></>)}
                  </div>
                </div>
                <div className="admin-emp-row-right">
                  <span className={`admin-emp-invite-badge is-${inv.status}`}>{statusLabel(inv.status)}</span>
                  <div className="admin-emp-actions-cell">
                    <div className="admin-emp-actions">
                      {inv.status === 'pending' && (
                        <>
                          {onCopyInviteLink && (
                            <button type="button" className="admin-emp-btn is-soft is-sm" onClick={() => onCopyInviteLink(inv)}>{labels.invites.copyLink}</button>
                          )}
                          <button type="button" className="admin-emp-btn is-ghost is-sm" onClick={() => onResendInvite(inv.id)}>{labels.invites.resend}</button>
                          <button type="button" className="admin-emp-btn is-ghost is-sm admin-emp-danger" onClick={() => onCancelInvite(inv.id)}>{labels.invites.cancel}</button>
                        </>
                      )}
                      {inv.status === 'expired' && (
                        <button type="button" className="admin-emp-btn is-primary is-sm" onClick={() => onResendInvite(inv.id)}>{labels.invites.resend}</button>
                      )}
                      {inv.status === 'accepted' && <span className="admin-emp-muted">—</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── 메인 ───────────────────────────────────────────────── */
/** 필터의 «전체» sentinel. 라벨(`'전체'`)을 값으로 쓰면 로케일을 바꾸는 순간
    「필터 안 걸림」 판정이 깨진다. */
const ALL = 'all';

/* 매니저 배정 여부 필터의 값(PW-300). 사람 id 와 절대 겹치지 않도록 `__`로 감싼다 —
   소비자가 이 값을 URL·저장 상태에 그대로 싣기 때문에(PW-157) 실제 id 와 구분돼야 한다.
   PW-576 으로 스프레드시트 뷰가 폐기되면서 그 파일에 있던 정의를 여기로 옮겼다. */
export const MANAGER_FILTER_ASSIGNED = '__manager_assigned__';
export const MANAGER_FILTER_UNASSIGNED = '__manager_unassigned__';

/* ── 보기 전환 «폐기» (PW-576) ─────────────────────────────
   여기에 «목록 / 스프레드시트» 보기 전환(`EmployeesViewSwitch`)이 있었다.
   2026-09-02 정기미팅 §1 (David) 이 스프레드시트 뷰를 폐기해 오갈 곳이 하나뿐이라
   함께 걷었다 — 기획서 `admin-spec.md` §3.8 이 묘비다.
   ⛔ 되살리지 말 것: 세그먼트만 되돌리면 없는 화면을 가리키는 버튼이 된다. */

/**
 * 서버가 접은 상위 경로 행 (PW-404) — 배정 행(`orgUnitIds`) 중 선택(단말)에 없는 것.
 *
 * 서버는 「다른 배정 행의 조상」인 단위를 접어서 내려준다(CSV import 가 본부·부서·팀마다
 * 행을 만들기 때문). 그래서 「선택 2곳」인데 서버가 아는 행은 3개인 상황이 생기고,
 * 화면이 그 한 행을 말하지 않으면 적용해도 지켜지는지 알 방법이 없다.
 *
 * 여기서는 **차집합만** 낸다 — 그중 무엇이 실제로 「유지」인지(= 지금 고른 조직의 조상인지)는
 * 고르는 동안 바뀌므로 팝업이 판정한다.
 */
function retainedOrgIds(member, selectedIds) {
  const rows = Array.isArray(member?.orgUnitIds) ? member.orgUnitIds : [];
  if (rows.length === 0) return [];
  const picked = new Set((selectedIds || []).map(String));
  return rows.map(String).filter((id) => id && !picked.has(id));
}

/**
 * 목록 행의 소속 표기 — 주 소속을 전체 경로로, 겸직은 개수로.
 *
 * 시트의 소속 셀과 **같은 값**(`depts` / `orgUnitIds`)에서 그린다. 한쪽만 다른 값을
 * 읽으면 두 뷰가 같은 사람을 다르게 그린다(§3.8 「데이터 계약은 두 뷰가 같다」).
 */
function ListDeptLabel({ member, orgTree, labels }) {
  const list = Array.isArray(member.depts) && member.depts.length > 0
    ? member.depts
    : member.department
      ? [{ name: member.department, isPrimary: true }]
      : [];
  if (list.length === 0) {
    return <span className="admin-emp-pill is-amber">{labels.unassignedPill}</span>;
  }
  const primary = list.find((d) => d.isPrimary) || list[0];
  const entry = primary.orgUnitId
    ? findOrgEntry(orgTree, primary.orgUnitId)
    : primaryOrgEntry(orgTree, member.orgUnitIds);
  return (
    <span className="admin-emp-row-dept">
      <OrgPathLabel entry={entry} fallback={primary.name} />
      {list.length > 1 && (
        <span className="admin-emp-row-dept-more">
          {String(labels.concurrentCount).split('{count}').join(String(list.length - 1))}
        </span>
      )}
    </span>
  );
}

/* ── 목록 뷰 ─────────────────────────────────────────────
   정본 `admin-spec.md §3.1` 의 **표**다. `#104` 가 지운 뒤 PW-373 이 카드-행으로
   되살렸는데, 카드-행에는 「열」 이라는 개념이 없어 ⚙ 컬럼 표시 설정·명부 내보내기
   열 1:1·필터 축이 함께 빌 수밖에 없었다(PW-400). 그래서 표로 되돌린다.

   시각은 새로 만들지 않는다 — 기존 `.admin-emp-*` 토큰과 Pretendard 를 그대로 쓰고,
   mono 는 페이지 카운터에만 남긴다. 어드민 화면이라 디자이너 선행 없이 진행한다
   (CLAUDE.md 「어드민 화면은 예외」). */

/**
 * 선택 열(⚙) 카탈로그 — **저장 값이 있는 열만** 넣는다.
 *
 * 🔴 정본 시안에는 FTE·담당 HRBP·근무 일정처럼 이 코드베이스에 저장 컬럼이 아직 없는
 *    열이 함께 있다. 없는 필드로 열·필터를 만들면 늘 비어 있는 칸이 생기고, 그건
 *    「이 회사는 안 쓰는 값」 과 구분되지 않는다(E6 — 없는 필드는 열도 필터도 만들지
 *    않는다). 컬럼이 생기는 티켓에서 여기 한 줄씩 는다.
 *
 * `optionalField` 가 붙은 열은 **워크스페이스가 켠 회사에서만** 후보가 된다(PW-502).
 * 저장 컬럼은 있지만 그 회사가 「우리는 안 쓴다」고 정한 열이라, ⚙ 메뉴에 남겨 두면
 * 켤 수 없는 항목을 보여주게 된다(§1-3-a M8).
 */
/** 안 받았을 때의 기본 — 선택 적용 항목이 하나도 안 켜진 상태. 모듈 상수라 매 렌더
 *  새 객체가 되지 않는다. */
const NO_OPTIONAL_FIELDS = {};

const LIST_OPTIONAL_COLS = [
  { id: 'employeeCode', width: 100 },
  { id: 'nickname', width: 110 },
  { id: 'displayName', width: 130 },
  { id: 'phone', width: 130 },
  /** 직위 — 국내식 호칭(과장). 직급(`jobLevel` = Senior)과 별개 축이다(PW-400). */
  { id: 'jobRank', width: 90 },
  /** 직종 — 근로 형태 대분류(사무직·연구직). 선택 적용 항목이다(PW-502). */
  { id: 'jobCategory', width: 100, optionalField: 'job_category' },
  /** 직함 — 명함용 대외 명칭(전무). 직급·직위와 세 축 모두 별개다(PW-502). */
  { id: 'businessTitle', width: 110, optionalField: 'business_title' },
  /** FTE — 풀타임 환산 비율 %. 고용형태와 다른 축이다(PW-481 · §1-3-g 32번). */
  { id: 'ftePercent', width: 80 },
  /** 근무 위치 3층 — 국가 > 도시 > 빌딩(PW-503). 시트 뷰와 같은 세 열이다. */
  { id: 'workCountry', width: 110 },
  { id: 'workLocation', width: 110 },
  { id: 'workBuilding', width: 120 },
  { id: 'terminationDate', width: 110 },
  { id: 'education', width: 120 },
  /** 연봉(T3) — 기본 숨김. 켤 수 있는 사람도 `canViewSalary` 로 한 번 더 걸린다. */
  { id: 'salary', width: 120 },
];

/**
 * ⚙ 기본값 — **연봉만 숨김**이고 나머지는 켜져 있다.
 *
 * 시안의 2026-08-13 결정을 따른다: 「시트 기준으로 필드를 채워도 목록 표가 예전
 * 그대로면 적용됐는지를 사람이 확인할 수 없다. 좁으면 ⚙ 에서 끄면 된다. 연봉만
 * 기본 숨김을 유지한다 — 반출 사고를 막기 위해서다.」
 *
 * ⚠ `admin-spec.md §3.1` 본문은 사번·근무지를 기본 숨김이라 적는다. 문서 ↔ 시안
 *   판정은 기획(PW-401)에 넘겼고, 답이 다르게 나오면 이 상수 한 줄로 뒤집힌다.
 */
const LIST_DEFAULT_OPT_COLS = Object.fromEntries(
  LIST_OPTIONAL_COLS.map((c) => [c.id, c.id !== 'salary']),
);

/** 필터의 «전체» sentinel. 🔴 라벨(`'전체'`)을 쓰면 로케일을 바꾸는 순간 판정이 깨진다. */
const LIST_ALL = ALL;

/** 결측 칸 — 빈칸으로 두면 「열이 잘못 붙었다」 와 구분되지 않는다(조직 스냅샷과 같은 규칙). */
function Dash() {
  return <span className="admin-emp-cell-dash" aria-hidden="true">—</span>;
}

function TextCell({ value }) {
  return value ? <span className="admin-emp-cell-text">{value}</span> : <Dash />;
}

/** 유니크 값 → FilterDropdown 선택지. 값이 없는 필드는 「전체」 하나만 남는다. */
function optionsOf(members, pick, allLabel) {
  const seen = new Set();
  for (const m of members) {
    const v = pick(m);
    if (v) seen.add(v);
  }
  return [
    { id: LIST_ALL, label: allLabel },
    ...[...seen].sort((a, b) => a.localeCompare(b, 'ko')).map((v) => ({ id: v, label: v })),
  ];
}

/**
 * ⚙ 컬럼 표시 설정.
 *
 * 어떤 열을 켜 둘지는 「이 사람이 이 화면을 어떻게 쓰는가」 라서, 상태를 캔버스가
 * 들고 있으면 화면을 떠나는 순간 사라진다. `value`/`onChange` 로 소비자가 들고
 * 있게 하고(=새로고침 후에도 남는다), 미주입이면 내부 상태로 폴백한다.
 */
/**
 * 「일괄 처리 (N)」 드롭다운 — 기획 §3.1 상단 액션 바 (PW-608).
 *
 * 필터 칩(`FilterDropdown`)과 **같은 셸**을 쓴다. 툴바에 두 종류의 드롭다운이 나란히
 * 서면 어느 쪽이 값을 고르는 것이고 어느 쪽이 일을 시키는 것인지 모양으로 구분되지
 * 않는다 — 그래서 셸은 같게 두고 `is-active`(브랜드 색)로 «지금 고른 사람이 있다»만
 * 말한다. 시안(`admin-app.jsx`)이 이 칸을 강조색 알약으로 그린 것과 같은 뜻이다.
 *
 * 🔴 `items` 가 비면 **드롭다운 자체를 렌더하지 않는다.** 권한이 없거나 처리를 주입하지
 * 않으면 항목이 0개가 되는데, 그때 트리거만 남으면 눌러도 아무것도 없는 버튼이 된다.
 *
 * 이 카드가 세우는 항목은 「소속 일괄 추가」 하나다 — 나머지 3종(매니저 일괄 배정 ·
 * 상태 일괄 변경 · 일괄 비활성화)은 PW-610 이 이 배열에 더한다.
 */
function BulkMenu({ count, items, labels }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  /* 고른 사람이 0명이 되면 이 컴포넌트가 통째로 사라진다 — 열려 있던 메뉴도 `open`
     상태와 함께 버려지므로 따로 닫아 줄 필요가 없다. */
  if (count === 0 || items.length === 0) return null;
  return (
    <div ref={ref} className={`admin-emp-select is-right is-active${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="admin-emp-select-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        data-testid="employees-list-bulk-trigger"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="admin-emp-select-value">{fill(labels.listBulk.trigger, { count })}</span>
        <span className="admin-emp-select-chevron"><IconChevronDown size={13} /></span>
      </button>
      {open && (
        <div className="admin-emp-select-menu" role="menu" data-testid="employees-list-bulk-menu">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              role="menuitem"
              className="admin-emp-select-item"
              data-testid={`employees-list-bulk-${it.id}`}
              onClick={() => { setOpen(false); it.onPick(); }}
            >
              <span className="admin-emp-select-item-label">{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ColumnMenu({ cols, value, onChange, labels }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className={`admin-emp-select is-right${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="admin-emp-btn is-ghost is-sm"
        aria-haspopup="true"
        aria-expanded={open}
        data-testid="employees-list-colmenu-trigger"
        onClick={() => setOpen((o) => !o)}
      >
        <IconSettings size={14} />{labels.listCols.trigger}
      </button>
      {open && (
        <div className="admin-emp-select-menu is-cols" data-testid="employees-list-colmenu">
          <div className="admin-emp-select-title">{labels.listCols.title}</div>
          {cols.map((c) => (
            <label key={c.id} className="admin-emp-select-check">
              <input
                type="checkbox"
                checked={value[c.id] !== false}
                data-testid={`employees-list-col-${c.id}`}
                onChange={() => onChange({ ...value, [c.id]: value[c.id] === false })}
              />
              <span>{labels.listCols.cols[c.id] || c.id}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 매니저(개인 상급자) 셀 — 배정 여부로 세 갈래 (§3.1 · §3.2).
 *
 * 시트는 모든 행이 `<select>` 라 검색도 조직장 경로도 없다. 목록 뷰는 **배정된 행을
 * 읽기 전용**으로 두고, 바꾸려면 행 `⋯` 의 「매니저 변경」 을 거치게 한다 — 표에서
 * 스치듯 바뀌면 안 되는 값이라서다. 미배정만 그 자리에서 채운다.
 */
function ListManagerCell({ member, labels, candidates, onAssignManager, renderAvatar, managerRow }) {
  if (member.managerName) {
    return (
      <span className="admin-emp-cell-manager" data-testid={`employees-list-manager-${member.id}`}>
        {/* 🔴 아바타는 **사진이 있을 때만** 붙인다.
            이 제품의 아바타는 한글 이름을 이니셜로 줄이지 않고 **전체를 보인다**
            (PW-24, `AvatarFallback`). 그래서 정본대로 「아바타 + 이름」 을 그리면
            사진 없는 사람은 동그라미 안 「박우진」 옆에 또 「박우진」 이 붙어
            한 칸에 이름이 두 번 찍힌다(브라우저 실측에서 잡았다).
            사진이 있으면 얼굴 + 이름이라 겹치지 않으므로 그대로 둔다. */}
        {managerRow?.avatarPhoto && renderAvatar ? renderAvatar(managerRow, 20) : null}
        <span className="admin-emp-cell-text">{member.managerName}</span>
      </span>
    );
  }
  // 대표는 상급자를 가질 수 없다 — 「미배정」 경고를 띄우면 영원히 못 지우는 빨간 칸이 된다.
  if (member.isCeo) {
    return (
      <span
        className="admin-emp-cell-dash"
        title={labels.listManagerFilter.ceoTop}
        data-testid={`employees-list-manager-${member.id}`}
      >
        —
      </span>
    );
  }
  if (!onAssignManager) return <Dash />;
  return (
    <span data-testid={`employees-list-manager-${member.id}`}>
      <ManagerPicker
        candidates={candidates.filter((c) => c.id !== member.id)}
        labels={labels}
        onPick={(managerId) => onAssignManager(member.id, managerId)}
        trigger={<span className="admin-emp-manager-need">{labels.listManagerFilter.assign}</span>}
      />
    </span>
  );
}

function EmployeesListView({
  members, orgUnits, labels, canEdit, pageSize, renderAvatar, jobAxis,
  canViewSalary, managerCandidates, optCols: providedOptCols, onOptColsChange,
  leaderUnitIdsByMember, onToggleOrgLeader, onChangeAffiliations,
  onOpenEdit, onDeactivate, onAssignManager, onInvite, onCsvUpload,
  /* 스쿼드 원장(§1-5-b). **배정 값에는 이름이 없다**(`{ squadId, isLead }`) — 원장을
     못 받으면 스쿼드 열도 필터 목록도 통째로 빈다(PW-411 에서 발견). */
  squadOptions = [],
  /* 스쿼드 배정 편집(PW-438). 정본 §3.1 은 이 뷰에도 「셀 클릭 → SquadPicker」 를
     정해 뒀는데 시트에만 있었다 — 목록의 스쿼드 칸은 눌러도 아무 일이 없는 죽은
     자리였다. 미주입이면 셀은 **눌리지 않는 표기**로 남는다(소속 셀과 같은 규칙). */
  onChangeSquads,
  // 명부 내보내기 — 시트와 **같은 부품**을 쓴다(PW-411). 미주입이면 버튼이 없다.
  onExportRoster, exporting = false, exportLabels,
  /* 대표(CEO) 지정·해제 (§3.6-A · PW-576 로 시트에서 옮겨 왔다). 미주입이면 행 메뉴에
     그 항목이 아예 없다 — 권한 없는 사람에게 눌리는 자리를 만들지 않는다. */
  onOpenCeo,
  /* 고른 사람 id 집합과 그 변경 통지 (PW-608). 캔버스가 들고 있어야 새로고침을
     넘어 살아남는다 — 위 `ownSelectedIds` 주석 참고. */
  selectedIds: providedSelectedIds, onSelectedIdsChange,
  /* 일괄 «소속 추가» (PW-608 · §3.1 「일괄 처리」 드롭다운). 폐기된 스프레드시트의
     일괄 편집 바가 갖고 있던 계약을 그대로 승계한다 — `(memberIds, unitIds)` 를 받아
     **추가 전용** 서버 경로를 탄다. 미주입이면 드롭다운 항목이 없고, 항목이 하나도
     없으면 드롭다운 자체가 뜨지 않는다. */
  onAppendAffiliations,
  /* 보던 상태 되살리기 (PW-157 · PW-576). 종전에는 이 계약을 **스프레드시트만**
     들고 있어서, 그 뷰가 없어지면 다른 화면에 다녀올 때마다 검색어·필터가 풀렸다.
     키는 시트가 쓰던 컬럼 id 그대로다 — 이름을 바꾸면 이미 저장된 값이 버려진다. */
  initialSearch = '', initialFilters = EMPTY_OBJECT, onViewStateChange,
  /* 워크스페이스가 켠 선택 적용 항목 — `{ job_category, business_title }` (PW-502).
     안 받으면 둘 다 꺼진 것으로 본다: 그 열도, ⚙ 메뉴의 후보도 없다. */
  optionalFields = NO_OPTIONAL_FIELDS,
}) {
  /* 씨앗은 소비자가 되살려 준 값이다(PW-157). 없으면 종전과 같은 기본값. */
  const [q, setQ] = useState(initialSearch || '');
  const [dept, setDept] = useState(initialFilters['department'] ?? LIST_ALL);
  const [squad, setSquad] = useState(initialFilters['squads'] ?? LIST_ALL);
  const [position, setPosition] = useState(initialFilters['jobPosition'] ?? LIST_ALL);
  const [level, setLevel] = useState(initialFilters['jobLevel'] ?? LIST_ALL);
  const [family, setFamily] = useState(initialFilters['jobFamily'] ?? LIST_ALL);
  const [ladder, setLadder] = useState(initialFilters['jobTitle'] ?? LIST_ALL);
  const [duty, setDuty] = useState(initialFilters['jobDuty'] ?? LIST_ALL);
  const [location, setLocation] = useState(initialFilters['workLocation'] ?? LIST_ALL);
  // 근무 위치 3층 — 국가·빌딩은 도시와 **서로 좁히지 않는다**(나라와 사옥을 잇는
  // 표가 기획서에 없다). 직군>직렬>직무처럼 부모를 바꿔도 자식을 풀지 않는다.
  // 직종·직함 — 선택 적용 항목이라 **켠 회사에서만** 칩이 선다(PW-502). 직종은
  // 직군의 상위 계층이지만 매핑이 없어 직군 필터를 좁히지 않는다(겸직에서 막힌다).
  const [category, setCategory] = useState(initialFilters['jobCategory'] ?? LIST_ALL);
  const [bizTitle, setBizTitle] = useState(initialFilters['businessTitle'] ?? LIST_ALL);
  const [country, setCountry] = useState(initialFilters['workCountry'] ?? LIST_ALL);
  const [building, setBuilding] = useState(initialFilters['workBuilding'] ?? LIST_ALL);
  const [empType, setEmpType] = useState(initialFilters['employmentType'] ?? LIST_ALL);
  // ALL 은 `'all'` 이다 — 라벨을 sentinel 로 쓰면(옛 `'전체'`) 로케일을 바꾸는 순간
  // 「필터 안 걸림」 판정이 깨진다.
  const [mgrFilter, setMgrFilter] = useState(
    initialFilters.managerName === MANAGER_FILTER_ASSIGNED ? 'assigned'
      : initialFilters.managerName === MANAGER_FILTER_UNASSIGNED ? 'unassigned'
      : 'all',
  );
  const [status, setStatus] = useState(initialFilters.employmentStatus ?? 'all');
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState(null);
  // 행 액션 메뉴가 위로 열려야 하는가 — 아래 공간을 재서 정한다(아래 `openRowMenu`).
  const [menuUp, setMenuUp] = useState(false);
  const tableWrapRef = useRef(null);
  // 소속 팝업을 연 구성원 id. 조직장 지정([매니저로])이 사는 유일한 자리다(PW-400).
  const [deptPickerFor, setDeptPickerFor] = useState(null);
  // 스쿼드 팝업을 연 구성원 id (PW-438). 시트와 **같은 `SquadPicker`** 를 연다.
  const [squadPickerFor, setSquadPickerFor] = useState(null);
  /* 고른 사람 (PW-608). **id 를 기억한다 — 화면에 보이는 행이 아니다.**
     체크한 뒤 필터를 바꾸거나 쪽을 넘겨도 선택이 살아 있어야 「선택한 N명」 내보내기가
     화면과 무관하게 그 사람들을 담는다(정책 §9 E5). 행 배열로 들고 있으면 필터가
     걸리는 순간 조용히 사라진다.

     🔴 **정본은 바깥(캔버스)이다.** 이 뷰는 새로고침 때마다 통째로 사라졌다 다시
     생긴다 — 캔버스가 `loading` 이면 로딩 문구로 갈아 끼우기 때문이고, 소속·매니저를
     한 번 고치기만 해도 그 새로고침이 돈다. 여기서 들고 있으면 그때마다 체크가
     **말없이 풀린다**(브라우저 검증에서 잡았다: 일괄 추가를 적용한 직후 선택이 0 이 됐다).
     미주입일 때만 자기 상태로 폴백한다 — ⚙ 열 설정과 같은 규칙이다. */
  const [ownSelectedIds, setOwnSelectedIds] = useState(() => new Set());
  const selectedIds = providedSelectedIds ?? ownSelectedIds;
  const setSelectedIds = onSelectedIdsChange ?? setOwnSelectedIds;
  // 「소속 일괄 추가」 팝업 열림 (PW-608).
  const [bulkOrgOpen, setBulkOrgOpen] = useState(false);
  // ⚙ 는 소비자가 들고 있는 게 정본이고(새로고침 후에도 남아야 한다), 미주입일 때만
  // 내부 상태로 폴백한다.
  const [ownOptCols, setOwnOptCols] = useState(LIST_DEFAULT_OPT_COLS);
  const optCols = providedOptCols ?? ownOptCols;
  const setOptCols = onOptColsChange ?? setOwnOptCols;

  const orgTree = useMemo(() => buildOrgTree(orgUnits), [orgUnits]);
  /** 매니저 칸이 상급자의 **실제 행**(아바타 사진·이니셜)을 찾는 색인. */
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  /** 그 사람의 소속 이름 전부 — 겸직까지 매칭해야 겸직으로만 그 조직인 사람이 안 사라진다. */
  const deptNamesOf = (m) => {
    const list = Array.isArray(m.depts) && m.depts.length > 0 ? m.depts : [];
    const names = list.map((d) => d.name).filter(Boolean);
    if (names.length === 0 && m.department) names.push(m.department);
    return names;
  };
  /** 그 사람의 소속 조직 id 전부 — 주 소속·겸직 칩과 배정 행(계층 포함)을 합친다. */
  const deptIdsOf = (m) => {
    const fromChips = (Array.isArray(m.depts) ? m.depts : [])
      .map((d) => d.orgUnitId).filter(Boolean).map(String);
    const fromRows = (Array.isArray(m.orgUnitIds) ? m.orgUnitIds : []).map(String);
    return [...new Set([...fromChips, ...fromRows])];
  };
  /* 스쿼드는 **원장에서** 이름을 얻는다 — 배정 값은 `{ squadId, isLead }` 뿐이다.
     SQ5 대로 종료·보관 스쿼드는 셀에도 필터에도 넣지 않는다: 셀에 안 보이는 값으로
     목록이 걸러지면 "왜 이 사람이 나오지" 가 된다. */
  const squadById = useMemo(
    () => new Map((squadOptions || []).map((sq) => [String(sq.id), sq])),
    [squadOptions],
  );
  const visibleSquadsOf = useCallback(
    (m) => (Array.isArray(m.squads) ? m.squads : [])
      .map((a) => squadById.get(String(a.squadId ?? a.id)))
      .filter((sq) => sq && isVisibleSquadStatus(sq.status)),
    [squadById],
  );
  const squadNamesOf = useCallback(
    (m) => visibleSquadsOf(m).map((sq) => sq.name).filter(Boolean),
    [visibleSquadsOf],
  );
  /* 스쿼드 셀·팝업 문구(PW-438). 소비자는 한 벌만 넘긴다. */
  const squadPickerLabels = labels.squadPicker || {};

  const allLabel = labels.filters.all;
  /* 소속 옵션은 평면 distinct 가 아니라 **조직 트리 전체**다(§5-A P3) — 시트와 같은
     규칙이다. 이름으로 거르면 (a) 동명 조직이 섞이고 (b) 상위 조직을 골랐을 때
     화면은 그 조직에 직접 붙은 사람만 남기는데 서버 반출은 하위 전원을 담아
     **화면과 파일이 갈린다**(PW-411). 판정도 옵션도 id 로 통일한다. */
  const depts = useMemo(() => {
    if (orgTree.length === 0) {
      const seen = new Set();
      for (const m of members) for (const n of deptNamesOf(m)) seen.add(n);
      return [
        { id: LIST_ALL, label: allLabel },
        ...[...seen].sort((a, b) => a.localeCompare(b, 'ko')).map((n) => ({ id: n, label: n })),
      ];
    }
    return [
      { id: LIST_ALL, label: allLabel },
      ...orgTree.map((e) => ({ id: e.id, label: e.name, depth: e.depth })),
      { id: ORG_FILTER_UNASSIGNED, label: labels.unassignedPill, depth: 0 },
    ];
  }, [orgTree, members, allLabel, labels.unassignedPill]);
  const squads = useMemo(() => [
    { id: LIST_ALL, label: allLabel },
    ...(squadOptions || [])
      .filter((sq) => isVisibleSquadStatus(sq.status))
      .map((sq) => ({ id: String(sq.id), label: sq.name })),
  ], [squadOptions, allLabel]);
  const positions = useMemo(() => optionsOf(members, (m) => m.jobPosition, allLabel), [members, allLabel]);
  const levels = useMemo(() => optionsOf(members, (m) => m.jobLevel, allLabel), [members, allLabel]);
  const locations = useMemo(() => optionsOf(members, (m) => m.workLocation, allLabel), [members, allLabel]);
  const categories = useMemo(() => optionsOf(members, (m) => m.jobCategory, allLabel), [members, allLabel]);
  const bizTitles = useMemo(() => optionsOf(members, (m) => m.businessTitle, allLabel), [members, allLabel]);
  const countries = useMemo(() => optionsOf(members, (m) => m.workCountry, allLabel), [members, allLabel]);
  const buildings = useMemo(() => optionsOf(members, (m) => m.workBuilding, allLabel), [members, allLabel]);
  const empTypes = useMemo(() => optionsOf(members, (m) => m.employmentType, allLabel), [members, allLabel]);

  /* 직군 → 직렬 → 직무 3단. 카탈로그(`jobAxis`)가 있으면 그걸 쓰고, 없으면 구성원이
     실제로 가진 값에서 모은다 — 카탈로그가 비어도 필터가 사라지지는 않게. */
  const axis = jobAxis || {};
  const families = useMemo(
    () => (axis.families?.length
      ? [{ id: LIST_ALL, label: allLabel }, ...axis.families.map((v) => ({ id: v, label: v }))]
      : optionsOf(members, (m) => m.jobFamily, allLabel)),
    [axis.families, members, allLabel],
  );
  const ladders = useMemo(() => {
    const narrowed = family !== LIST_ALL
      ? narrowByParent(axis.ladders ?? [], axis.laddersByFamily, family)
      : axis.ladders;
    return narrowed?.length
      ? [{ id: LIST_ALL, label: allLabel }, ...narrowed.map((v) => ({ id: v, label: v }))]
      : optionsOf(members, (m) => m.jobTitle, allLabel);
  }, [axis.ladders, axis.laddersByFamily, family, members, allLabel]);
  const duties = useMemo(() => {
    const narrowed = ladder !== LIST_ALL
      ? narrowByParent(axis.duties ?? [], axis.dutiesByLadder, ladder)
      : axis.duties;
    return narrowed?.length
      ? [{ id: LIST_ALL, label: allLabel }, ...narrowed.map((v) => ({ id: v, label: v }))]
      : optionsOf(members, (m) => m.jobDuty, allLabel);
  }, [axis.duties, axis.dutiesByLadder, ladder, members, allLabel]);

  // 4종만 축으로 둔다. 「대기」(`pending`)는 탭 C 소관이라 여기 목록에 없고,
  // 「기타」(`other`)는 마이그레이션 잔여라 칩을 만들면 「있으나 마나 한 칩」이 는다.
  const statusOpts = [
    { id: 'all', label: labels.filters.all },
    { id: 'active', label: labels.status.active },
    { id: 'probation', label: labels.status.probation },
    { id: 'on_leave', label: labels.status.on_leave },
    { id: 'terminated', label: labels.status.terminated },
  ];
  const mgrOpts = [
    { id: 'all', label: labels.filters.all },
    { id: 'assigned', label: labels.listManagerFilter.assigned },
    { id: 'unassigned', label: labels.listManagerFilter.unassigned },
  ];

  const filtered = useMemo(
    () =>
      members.filter((m) => {
        const names = deptNamesOf(m);
        if (q) {
          /* 스쿼드명도 검색에 걸린다(§3.1 · SQ1) — 셀에 보이는 값은 검색으로도
             닿아야 한다. 폐기된 스프레드시트 뷰에만 있던 규칙이라(PW-576) 목록만
             남기면 스쿼드 이름으로 사람을 못 찾게 된다. 보이는 것(진행중·준비중)만
             센다 — 셀에 안 나오는 종료 스쿼드로 검색되면 왜 걸렸는지 알 수 없다. */
          const squadNames = squadNamesOf(m).join(' ');
          const hay = `${m.name || ''} ${m.email || ''} ${names.join(' ')} ${squadNames}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        // 소속은 선택 조직 + **하위 전체**(서브트리)를 포함한다 — id 판정이라 동명
        // 조직·이름 접두 오탐이 없다. 트리를 못 받은 조직만 이름 폴백으로 남는다.
        if (dept !== LIST_ALL) {
          if (orgTree.length > 0) {
            if (!matchesOrgSubtree(deptIdsOf(m), dept, orgTree)) return false;
          } else if (!names.includes(dept)) return false;
        }
        if (squad !== LIST_ALL
          && !visibleSquadsOf(m).some((sq) => String(sq.id) === squad)) return false;
        if (position !== LIST_ALL && m.jobPosition !== position) return false;
        if (level !== LIST_ALL && m.jobLevel !== level) return false;
        if (family !== LIST_ALL && m.jobFamily !== family) return false;
        if (ladder !== LIST_ALL && m.jobTitle !== ladder) return false;
        if (duty !== LIST_ALL && m.jobDuty !== duty) return false;
        if (location !== LIST_ALL && m.workLocation !== location) return false;
        if (category !== LIST_ALL && m.jobCategory !== category) return false;
        if (bizTitle !== LIST_ALL && m.businessTitle !== bizTitle) return false;
        if (country !== LIST_ALL && m.workCountry !== country) return false;
        if (building !== LIST_ALL && m.workBuilding !== building) return false;
        if (empType !== LIST_ALL && m.employmentType !== empType) return false;
        if (mgrFilter === 'assigned' && !m.managerName) return false;
        // 대표는 상급자를 가질 수 없으므로 「매니저 미배정」 대상이 아니다 — 넣으면
        // 영원히 처리되지 않는 한 건이 목록에 남는다.
        if (mgrFilter === 'unassigned' && (m.managerName || m.isCeo)) return false;
        if (status !== 'all' && m.employmentStatus !== status) return false;
        // 가입 대기(`pending`)는 여기 목록에 세우지 않는다(§3.2.1 · PW-422). 탭 C(초대
        // 관리)가 이미 담당하는데 두 곳에 뜨면 체크박스 선택·일괄 처리·페이지네이션의
        // 단위가 「사람 수」와 어긋난다. (구 서술 「잔여 행은 스프레드시트 뷰에서
        // 볼 수 있다」는 그 뷰가 폐기돼 성립하지 않는다 — PW-576.)
        if (m.employmentStatus === 'pending') return false;
        return true;
      }),
    // eslint 이 못 보는 의존: `orgTree`·`squadById` 가 소속·스쿼드 판정을 바꾼다.
    [members, q, dept, squad, position, level, family, ladder, duty, category, bizTitle, location, country, building, empType, mgrFilter, status, orgTree, visibleSquadsOf, squadNamesOf],
  );

  // 대표 행은 필터·정렬과 무관하게 최상단 고정 (§3.1).
  const ordered = useMemo(
    () => [...filtered].sort((a, b) => (b.isCeo ? 1 : 0) - (a.isCeo ? 1 : 0)),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(ordered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = ordered.slice((safePage - 1) * pageSize, safePage * pageSize);

  /* ── 행 선택 (PW-608 · 기획 §3.1) ─────────────────────────────────────────
   * 체크박스는 **편집 권한이 있을 때만** 세운다. 골라도 할 수 있는 일이 없는 선택을
   * 만들지 않는다 — 내보내기 범위 ② 도 어드민 전용이라 권한 없는 사람에게는 체크칸이
   * 아무 데도 닿지 않는다.
   * -------------------------------------------------------------------------- */
  const selectable = canEdit === true;
  /* 고른 사람 중 **아직 명부에 있는 사람**만 센다. 필터로 화면에서 사라진 사람은 그대로
     세지만(정책 §9 E5), 명부에서 아예 없어진 사람(퇴사 처리·삭제)까지 세면 화면의 N 과
     파일의 행 수가 갈린다. */
  const selectedRows = useMemo(
    () => (selectable ? members.filter((m) => selectedIds.has(m.id)) : []),
    [selectable, members, selectedIds],
  );
  const selectedCount = selectedRows.length;
  /* 헤더 체크박스는 **지금 보고 있는 쪽**만 켜고 끈다. 안 보이는 쪽까지 켜면 「몇 명을
     골랐나」를 화면이 말해 주지 않은 채 숫자만 뛴다. */
  const pageAllChecked = pageRows.length > 0 && pageRows.every((m) => selectedIds.has(m.id));
  function toggleRow(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function togglePage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (pageAllChecked) pageRows.forEach((m) => next.delete(m.id));
      else pageRows.forEach((m) => next.add(m.id));
      return next;
    });
  }

  /**
   * 일괄 «소속 추가» 적용 (PW-608 · PW-373 계약 승계).
   *
   * 🔴 각자의 「기존 + 추가」를 여기서 합성하지 않는다. 합성이 틀리는 순간이 곧 소속
   * 소실이고 그것이 PW-326 의 발단이었다 — 고른 사람 id 와 고른 조직 id 만 넘긴다.
   */
  async function applyBulkOrgAppend(unitIds) {
    setBulkOrgOpen(false);
    if (!onAppendAffiliations || !unitIds || unitIds.length === 0) return;
    const memberIds = selectedRows.map((m) => m.id);
    if (memberIds.length === 0) return;
    await onAppendAffiliations(memberIds, unitIds);
  }

  /* 드롭다운 항목. 처리를 주입받지 못한 항목은 배열에 들어가지 않고, 배열이 비면
     `BulkMenu` 가 트리거째 렌더하지 않는다. */
  const bulkItems = [];
  if (selectable && onAppendAffiliations && orgUnits.length > 0) {
    bulkItems.push({
      id: 'org-append',
      label: labels.listBulk.orgAppend,
      onPick: () => setBulkOrgOpen(true),
    });
  }
  const hasFilter = q || dept !== LIST_ALL || squad !== LIST_ALL || position !== LIST_ALL
    || level !== LIST_ALL || family !== LIST_ALL || ladder !== LIST_ALL || duty !== LIST_ALL
    || category !== LIST_ALL || bizTitle !== LIST_ALL
    || location !== LIST_ALL || country !== LIST_ALL || building !== LIST_ALL
    || empType !== LIST_ALL || mgrFilter !== 'all' || status !== 'all';

  function resetFilters() {
    setQ(''); setDept(LIST_ALL); setSquad(LIST_ALL); setPosition(LIST_ALL); setLevel(LIST_ALL);
    setFamily(LIST_ALL); setLadder(LIST_ALL); setDuty(LIST_ALL); setLocation(LIST_ALL);
    setCategory(LIST_ALL); setBizTitle(LIST_ALL);
    setCountry(LIST_ALL); setBuilding(LIST_ALL);
    setEmpType(LIST_ALL); setMgrFilter('all'); setStatus('all'); setPage(1);
  }

  /** 직군을 바꾸면 그 밑에 속하지 않게 된 직렬·직무 필터를 푼다 — 안 풀면 0건인 채 이유가 안 보인다. */
  function changeFamily(v) {
    setFamily(v);
    if (v !== LIST_ALL && ladder !== LIST_ALL
      && !narrowByParent(axis.ladders ?? [], axis.laddersByFamily, v).includes(ladder)) {
      setLadder(LIST_ALL);
      setDuty(LIST_ALL);
    }
    setPage(1);
  }
  function changeLadder(v) {
    setLadder(v);
    if (v !== LIST_ALL && duty !== LIST_ALL
      && !narrowByParent(axis.duties ?? [], axis.dutiesByLadder, v).includes(duty)) {
      setDuty(LIST_ALL);
    }
    setPage(1);
  }

  const cl = labels.listCols.cols;
  // 연봉 열은 ⚙ 로 켜도 열람 권한이 없으면 뜨지 않는다 — 두 겹으로 막는다.
  /**
   * 이 열을 지금 보여도 되는가 — 세 겹이다.
   *   ① ⚙ 에서 켜져 있는가
   *   ② 연봉은 열람 권한이 있는가 (⚙ 로 켜도 권한이 없으면 안 뜬다)
   *   ③ 선택 적용 항목이면 **워크스페이스가 그 항목을 쓰기로 했는가** (PW-502)
   * ③ 을 ⚙ 로 대신할 수 없다 — ⚙ 는 「내가 지금 보고 싶은가」이고, ③ 은 「이 회사가
   * 이 항목을 쓰는가」다. 안 쓰는 회사에는 켤 수 있는 항목으로도 보이면 안 된다.
   */
  const optOn = (id) => {
    if (optCols[id] === false) return false;
    if (id === 'salary' && !canViewSalary) return false;
    const field = LIST_OPTIONAL_COLS.find((c) => c.id === id)?.optionalField;
    return !field || optionalFields[field] === true;
  };
  const cols = [
    /* 체크박스 — 상시 컬럼 **첫 항목**이다(§3.1). 권한이 없으면 열째 없다. */
    ...(selectable ? [{ id: 'select', label: '', width: 40 }] : []),
    { id: 'name', label: cl.name, width: 200 },
    ...(optOn('nickname') ? [{ id: 'nickname', label: cl.nickname, width: 110 }] : []),
    ...(optOn('displayName') ? [{ id: 'displayName', label: cl.displayName, width: 130 }] : []),
    { id: 'email', label: cl.email, width: 200 },
    ...(optOn('phone') ? [{ id: 'phone', label: cl.phone, width: 130 }] : []),
    ...(optOn('employeeCode') ? [{ id: 'employeeCode', label: cl.employeeCode, width: 100 }] : []),
    // 🔴 「부서」 가 아니라 「소속(기능조직)」 이다 — 스쿼드와 나란히 두면 두 축이 같은
    //    것처럼 읽힌다(SQ1). 시트 뷰의 같은 열도 같은 이름을 쓴다.
    { id: 'dept', label: cl.dept, width: 180 },
    { id: 'squads', label: cl.squads, width: 150 },
    { id: 'jobPosition', label: cl.jobPosition, width: 100 },
    { id: 'jobLevel', label: cl.jobLevel, width: 100 },
    ...(optOn('jobRank') ? [{ id: 'jobRank', label: cl.jobRank, width: 90 }] : []),
    /* 직종 — 인사 분류의 꼭대기라 직군 바로 앞이다(직종 > 직군 > 직렬 > 직무). */
    ...(optOn('jobCategory') ? [{ id: 'jobCategory', label: cl.jobCategory, width: 100 }] : []),
    { id: 'jobFamily', label: cl.jobFamily, width: 100 },
    { id: 'jobTitle', label: cl.jobTitle, width: 120 },
    { id: 'jobDuty', label: cl.jobDuty, width: 140 },
    { id: 'employmentType', label: cl.employmentType, width: 100 },
    /* FTE — 시트 뷰와 같은 자리(고용형태 뒤)다. 정본표 §1-3-g 의 31·32 순서. */
    ...(optOn('ftePercent') ? [{ id: 'ftePercent', label: cl.ftePercent, width: 80 }] : []),
    { id: 'employmentStatus', label: cl.employmentStatus, width: 100 },
    /* 직함 — 직무 뒤·근무 위치 앞. 정본 §2-1 표의 자리다. */
    ...(optOn('businessTitle') ? [{ id: 'businessTitle', label: cl.businessTitle, width: 110 }] : []),
    ...(optOn('workCountry') ? [{ id: 'workCountry', label: cl.workCountry, width: 110 }] : []),
    ...(optOn('workLocation') ? [{ id: 'workLocation', label: cl.workLocation, width: 110 }] : []),
    ...(optOn('workBuilding') ? [{ id: 'workBuilding', label: cl.workBuilding, width: 120 }] : []),
    { id: 'manager', label: cl.manager, width: 150 },
    { id: 'hireDate', label: cl.hireDate, width: 110 },
    ...(optOn('terminationDate') ? [{ id: 'terminationDate', label: cl.terminationDate, width: 110 }] : []),
    ...(optOn('education') ? [{ id: 'education', label: cl.education, width: 120 }] : []),
    ...(optOn('salary') ? [{ id: 'salary', label: cl.salary, width: 120 }] : []),
    { id: 'actions', label: '', width: 90 },
  ];
  // 열이 스물 가까이 늘면 고정 minWidth 로는 칸이 눌려 글자가 세로로 쪼개진다.
  // **보이는 열 폭의 합**으로 잡고, 넘치는 만큼은 가로 스크롤로 읽는다.
  const minWidth = cols.reduce((n, c) => n + c.width, 0);

  // 켤 수 없는 항목은 메뉴에도 두지 않는다 — 연봉(권한 없음)도, 이 회사가 안 쓰기로
  // 한 선택 적용 항목도 마찬가지다(§1-3-a M8).
  const optionalForMenu = LIST_OPTIONAL_COLS.filter(
    (c) =>
      (c.id !== 'salary' || canViewSalary) &&
      (!c.optionalField || optionalFields[c.optionalField] === true),
  );

  /* ── 명부 내보내기 (PW-411 · screen-admin-employees-export.policy.md) ──────
   * 🔴 이 뷰의 **자기 상태**로 payload 를 만든다. 종전에는 버튼이 시트 쪽에만 있어,
   *    목록을 보고 있어도 「현재 화면 그대로」 가 시트의 열·시트의 필터를 셌다.
   * ------------------------------------------------------------------------ */

  // 화면 열 id → 반출 열 키. 「이름이 같아서 그냥 보내면 된다」 가 아니다 —
  // `dept`·`manager` 는 반출 카탈로그에서 다른 이름이고, `actions` 는 열이 아니다.
  const EXPORT_COLUMN_BY_LIST_COL = {
    dept: 'department',
    manager: 'managerName',
    actions: null,
    // 체크박스는 표시용이라 파일의 열이 아니다(정책 §4-1 표 「체크박스 → 제외」).
    select: null,
  };
  const exportColumns = cols
    .map((c) => (c.id in EXPORT_COLUMN_BY_LIST_COL ? EXPORT_COLUMN_BY_LIST_COL[c.id] : c.id))
    .filter(Boolean);
  const salaryVisible = exportColumns.includes('salary');

  /* 필터 11축 → 반출 조건. 키는 **시트의 컬럼 id** 로 맞춘다 — 소비자
     (`employeeExportParams.ts`)가 그 이름으로 서버 파라미터를 번역하고, 그 표에 없는
     키는 **보내지지 않는다.** 새 필터를 더하면 여기와 그 표를 함께 고쳐야 한다. */
  const exportFilters = {};
  if (dept !== LIST_ALL) exportFilters.department = dept;
  if (squad !== LIST_ALL) exportFilters.squads = squad;
  if (position !== LIST_ALL) exportFilters.jobPosition = position;
  if (level !== LIST_ALL) exportFilters.jobLevel = level;
  if (family !== LIST_ALL) exportFilters.jobFamily = family;
  if (ladder !== LIST_ALL) exportFilters.jobTitle = ladder;
  if (duty !== LIST_ALL) exportFilters.jobDuty = duty;
  if (location !== LIST_ALL) exportFilters.workLocation = location;
  if (category !== LIST_ALL) exportFilters.jobCategory = category;
  if (bizTitle !== LIST_ALL) exportFilters.businessTitle = bizTitle;
  if (country !== LIST_ALL) exportFilters.workCountry = country;
  if (building !== LIST_ALL) exportFilters.workBuilding = building;
  if (empType !== LIST_ALL) exportFilters.employmentType = empType;
  if (status !== 'all') exportFilters.employmentStatus = status;
  // 매니저는 사람 이름이 아니라 **상태 2종**이다(PW-300). 시트와 같은 sentinel 을 써야
  // 소비자의 번역표를 두 벌로 만들지 않는다.
  if (mgrFilter === 'assigned') exportFilters.managerName = MANAGER_FILTER_ASSIGNED;
  if (mgrFilter === 'unassigned') exportFilters.managerName = MANAGER_FILTER_UNASSIGNED;

  /* 보던 상태가 바뀌면 소비자에게 알린다 (PW-157 · PW-576 로 시트에서 옮겨 왔다).
     `exportFilters` 를 그대로 재사용한다 — 반출 조건과 되살릴 조건이 같은 것이어야
     「보이는 것 = 받는 것」이 성립하고, 두 벌로 두면 한쪽만 고쳐져 갈린다.

     값이 같으면 부르지 않는다 — 소비자가 이 콜백으로 주소를 쓰기 때문에 매번 부르면
     쓰기 → 렌더 → 다시 쓰기의 되먹임이 된다. 콜백은 ref 로 들고 있어서 소비자가
     인라인 함수를 넘겨도 효과가 다시 돌지 않는다.
     목록 뷰에는 사람이 고르는 정렬이 없다(대표 최상단 고정뿐) — `sortCol` 은 늘 null 이다. */
  const onViewStateChangeRef = useRef(onViewStateChange);
  useEffect(() => { onViewStateChangeRef.current = onViewStateChange; }, [onViewStateChange]);
  const viewStateKey = JSON.stringify([q, exportFilters]);
  const lastViewStateKey = useRef(null);
  useEffect(() => {
    if (lastViewStateKey.current === viewStateKey) return;
    lastViewStateKey.current = viewStateKey;
    onViewStateChangeRef.current?.({
      search: q, filters: JSON.parse(viewStateKey)[1], sortCol: null, sortDir: 'asc',
    });
  }, [viewStateKey, q]);

  const [salaryGateScope, setSalaryGateScope] = useState(null);

  function runExport(scope, includeSalary) {
    if (!onExportRoster) return;
    // 전체(③)는 화면 상태를 무시한다 — 필터·검색어·열을 아예 보내지 않는다(§5-1).
    if (scope === 'all') {
      onExportRoster({
        scope, columns: [], ids: [], search: '', filters: {},
        rowCount: members.length, includeSalary: false,
      });
      return;
    }
    onExportRoster({
      scope,
      columns: includeSalary ? exportColumns : exportColumns.filter((id) => id !== 'salary'),
      /* ②「선택한 N명」 은 **고른 사람 id 기준**이다 — 검색어·필터를 함께 보내지 않는다.
         체크한 뒤 필터를 바꿔 그 행이 화면에서 사라져도 파일에는 그대로 담겨야 하고,
         조건을 함께 보내면 서버가 교집합을 내 그 사람들이 빠진다(정책 §9 E5). */
      ids: scope === 'selected' ? selectedRows.map((m) => m.id) : [],
      search: scope === 'selected' ? '' : q.trim(),
      filters: scope === 'selected' ? {} : { ...exportFilters },
      // 페이지네이션은 무시한다 — 현재 페이지 20행이 아니라 **필터 결과 전체**다(§4-0).
      // ② 만 필터 결과가 아니라 «고른 사람 수»를 센다.
      rowCount: scope === 'selected' ? selectedCount : ordered.length,
      includeSalary: includeSalary && salaryVisible,
    });
  }

  function pickExportScope(scope) {
    // 전체(③)는 연봉을 포함하지 않으므로 확인 모달을 띄우지 않는다(E13).
    if (scope !== 'all' && salaryVisible) {
      setSalaryGateScope(scope);
      return;
    }
    runExport(scope, false);
  }

  /* ②「선택한 N명」 은 체크한 행이 있을 때만 렌더되는 항목이다(§2-2). 목록 뷰에도
     행 체크박스가 생겼으므로(PW-608) 고른 사람이 있으면 항목이 나온다 — 정책서가
     PW-411 시점에 적어 둔 「목록 뷰에는 체크박스가 없어 안 나온다」 는 그때의 관측이고
     PW-576 이 그 어긋남을 표시하며 «미조사» 로 남겨 둔 자리다. */
  const exportItems = buildExportItems({
    labels: exportLabels,
    viewRows: ordered,
    allRows: members,
    columnCount: exportColumns.length,
    hasActiveFilter: Boolean(hasFilter),
    salaryVisible,
    selectedRows,
  });

  /* 소속 팝업의 초기 선택 — 칩이 든 조직 id 가 정본, 없으면 `orgUnitIds` 폴백.
     이름으로 맞추면 동명이팀에서 틀린다(PW-112). */
  const deptPicker = deptPickerFor ? members.find((m) => m.id === deptPickerFor) : null;
  const deptChips = (deptPicker?.depts || []).filter((d) => d.orgUnitId);
  const deptFallbackPrimary = deptPicker
    ? (primaryOrgEntry(orgTree, deptPicker.orgUnitIds)?.id ?? '')
    : '';
  const deptPickerSelected = deptChips.length > 0
    ? deptChips.map((d) => d.orgUnitId)
    : (deptFallbackPrimary ? [deptFallbackPrimary] : []);
  const deptPickerPrimary = deptChips.find((d) => d.isPrimary)?.orgUnitId || deptFallbackPrimary;
  /* 선택에 안 나오는 배정 행 = 서버가 접은 상위 경로 (PW-404). 팝업이 「유지」로 말한다 —
     안 말하면 「선택 2곳」인데 서버는 3행이라, 적용하면 상위 소속이 떨어지는 줄 안다. */
  const deptPickerRetained = retainedOrgIds(deptPicker, deptPickerSelected);

  /**
   * 행 액션 메뉴를 연다 — **아래 공간이 없으면 위로 편다** (PW-306 · PW-400).
   *
   * 표는 세로로 잘리는 스크롤 컨테이너(`.admin-emp-table-wrap`) 안에 있다. 마지막
   * 행에서 아래로 펴면 메뉴 아랫부분이 그 컨테이너에 **잘려서 눌리지 않는다** —
   * 조상의 `overflow` 는 z-index 로 못 뚫는다. 첫 행은 아래가 넉넉해 늘 멀쩡하므로
   * 이 결함은 마지막 행에서만 드러난다.
   *
   * 실측(1512×900, 138명): 마지막 행 메뉴가 컨테이너 바닥(806px)을 93px 넘어가
   * `document.elementFromPoint` 가 메뉴 대신 컨테이너를 집었다.
   */
  const MENU_HEIGHT_PX = 120;   // 항목 3개 + 구분선 실측치(110)에 여유를 더한 값
  function openRowMenu(id, trigger) {
    if (openMenu === id) { setOpenMenu(null); return; }
    const wrap = tableWrapRef.current;
    const btn = trigger?.getBoundingClientRect?.();
    // 측정할 수 없으면(jsdom 등) 종전대로 아래로 편다 — 방향 판정이 없다고
    // 메뉴가 안 열리면 안 된다.
    if (wrap && btn) {
      const room = wrap.getBoundingClientRect().bottom - btn.bottom;
      setMenuUp(room < MENU_HEIGHT_PX);
    } else {
      setMenuUp(false);
    }
    setOpenMenu(id);
  }

  function cell(m, id) {
    switch (id) {
      /* 행 체크박스 (PW-608). 이름 칸의 버튼과 달리 **편집 패널을 열지 않는다** —
         고르는 동작과 여는 동작이 같은 행에 나란히 있으므로 서로를 삼키지 않게
         체크박스는 자기 칸 안에서만 눌린다. */
      case 'select':
        return (
          <input
            type="checkbox"
            className="admin-emp-row-check"
            checked={selectedIds.has(m.id)}
            onChange={() => toggleRow(m.id)}
            data-testid={`employees-list-check-${m.id}`}
            aria-label={`${m.displayName || m.name} — ${labels.listBulk.selectRow}`}
          />
        );
      case 'name':
        return (
          <button type="button" className="admin-emp-cell-name" onClick={() => onOpenEdit(m)}>
            {renderAvatar ? renderAvatar(m, 28) : <AvatarFallback row={m} size={28} />}
            <span className="admin-emp-cell-name-text">
              {m.displayName || m.name}
              {/* 👑 대표 배지 — 이름 «뒤», 조직장 👤(소속 칩)와 자리를 나눈다(§3.1 L8). */}
              {m.isCeo && <CeoBadge label={labels.menu.ceoBadge} />}
              <RolePill role={m.orgRole} labels={labels} />
            </span>
          </button>
        );
      case 'nickname': return <TextCell value={m.nickname} />;
      case 'displayName': return <TextCell value={m.displayName} />;
      case 'email': return <TextCell value={m.email} />;
      case 'phone': return <TextCell value={m.phone} />;
      case 'employeeCode': return <TextCell value={m.employeeCode} />;
      case 'dept': {
        const label = <ListDeptLabel member={m} orgTree={orgTree} labels={labels} />;
        // 팝업을 여는 경로는 소속을 **고칠 수 있을 때만** 연다 — 못 고치는 사람에게
        // 눌리는 셀을 주면 눌러 보고 아무 일도 안 일어나는 자리가 된다.
        if (!canEdit || !onChangeAffiliations) return label;
        return (
          <button
            type="button"
            className="admin-emp-cell-dept"
            onClick={() => setDeptPickerFor(m.id)}
            data-testid={`employees-list-dept-${m.id}`}
          >
            {label}
          </button>
        );
      }
      case 'squads': {
        /* 시트 뷰와 **같은 부품**으로 그린다(PW-438) — ⭐리드 표식 · `준비중` 배지 ·
           `종료 N`(SQ5·SQ7). 종전에는 이름을 쉼표로 이어 붙인 한 줄이라 리드가
           누구인지도 준비중인지도 화면에서 사라져 있었다. 두 뷰가 각자 그리면
           별 색·배지 문구가 한쪽만 바뀐다. */
        const chips = (
          <SquadCell
            squads={squadOptions}
            assignments={Array.isArray(m.squads) ? m.squads : []}
            statusLabels={squadPickerLabels}
            closedLabel={squadPickerLabels.closedCount}
          />
        );
        /* 팝업을 여는 경로는 스쿼드를 **고칠 수 있을 때만** 연다 — 소속 셀과 같은
           규칙이다. 못 고치는 사람에게 눌리는 셀을 주면 다시 죽은 자리가 된다.
           `SquadCell` 자체의 `onClick` 대신 `<button>` 으로 감싸는 이유는 키보드로도
           닿아야 하기 때문이다(div 클릭은 Tab 으로 도달하지 않는다). */
        if (!canEdit || !onChangeSquads || squadOptions.length === 0) return chips;
        return (
          <button
            type="button"
            className="admin-emp-cell-squads"
            onClick={() => setSquadPickerFor(m.id)}
            title={squadPickerLabels.cellHint}
            data-testid={`employees-list-squads-${m.id}`}
          >
            {chips}
          </button>
        );
      }
      case 'jobPosition': return <TextCell value={m.jobPosition} />;
      case 'jobLevel': return <TextCell value={m.jobLevel} />;
      case 'jobRank': return <TextCell value={m.jobRank} />;
      case 'jobFamily': return <TextCell value={m.jobFamily} />;
      case 'jobTitle': return <TextCell value={m.jobTitle} />;
      case 'jobDuty': return <TextCell value={m.jobDuty} />;
      case 'employmentType': return <TextCell value={m.employmentType} />;
      /* 미입력(`null`)은 «—» 다 — 0% 가 아니다. `value || ''` 로 쓰면 나중에 0 이
         허용될 때 미입력과 같은 모양이 되어 조용히 틀린다. */
      case 'ftePercent': return <TextCell value={m.ftePercent === null || m.ftePercent === undefined ? '' : `${m.ftePercent}%`} />;
      case 'employmentStatus': return <StatusBadge status={m.employmentStatus} labels={labels} />;
      case 'workLocation': return <TextCell value={m.workLocation} />;
      case 'jobCategory': return <TextCell value={m.jobCategory} />;
      case 'businessTitle': return <TextCell value={m.businessTitle} />;
      case 'workCountry': return <TextCell value={m.workCountry} />;
      case 'workBuilding': return <TextCell value={m.workBuilding} />;
      case 'manager':
        return (
          <ListManagerCell
            member={m}
            labels={labels}
            candidates={managerCandidates}
            onAssignManager={canEdit ? onAssignManager : undefined}
            renderAvatar={renderAvatar}
            managerRow={m.managerId ? memberById.get(m.managerId) : undefined}
          />
        );
      case 'hireDate': return <TextCell value={(m.hireDate || '').slice(0, 10)} />;
      case 'terminationDate': return <TextCell value={(m.terminationDate || '').slice(0, 10)} />;
      case 'education': return <TextCell value={m.education} />;
      case 'salary': return <TextCell value={m.salary} />;
      case 'actions':
        return (
          <div className="admin-emp-actions-cell">
            <div className="admin-emp-actions">
              <button
                type="button"
                className="admin-emp-btn is-ghost is-sm admin-emp-more"
                onClick={(e) => openRowMenu(m.id, e.currentTarget)}
                aria-label={labels.listRowMenu}
                data-testid={`employees-list-rowmenu-${m.id}`}
              >
                <IconMore size={16} />
              </button>
            </div>
            {openMenu === m.id && (
              <RowActionMenu
                labels={labels}
                openUp={menuUp}
                canEdit={canEdit && !!onDeactivate}
                onEdit={() => onOpenEdit(m)}
                onChangeManager={() => onOpenEdit(m)}
                onDeactivate={() => onDeactivate?.(m)}
                /* 퇴사자 행은 대표로 지정하지 않는다(§3.6-A-4 E3) — 항목을 흐리게
                   두는 대신 아예 그리지 않는다. 이미 대표면 «해제» 로 바뀐다. */
                onCeo={
                  onOpenCeo && m.employmentStatus !== 'terminated'
                    ? (mode) => onOpenCeo(m, mode)
                    : undefined
                }
                ceoMode={m.isCeo ? 'release' : 'assign'}
                onClose={() => setOpenMenu(null)}
              />
            )}
          </div>
        );
      default: return <Dash />;
    }
  }

  return (
    <Card>
      <div className="admin-emp-toolbar">
        <div className="admin-emp-search-wrap">
          <div className="admin-emp-search-box">
            <span className="admin-emp-search-icon"><IconSearch size={16} /></span>
            <input
              className="admin-emp-search"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder={labels.listSearch}
              aria-label={labels.listSearch}
            />
          </div>
          <span className="admin-emp-count">{ordered.length}{labels.countSuffix}</span>
        </div>
        <div className="admin-emp-toolbar-actions">
          {/* 「일괄 처리 (N)」 — 고른 사람이 있을 때만 뜬다(§3.1). 시안과 같이 ⚙ 컬럼
              **앞**이다: 고르는 동작의 결과라 선택 상태 가까이 있어야 읽힌다. */}
          <BulkMenu count={selectedCount} items={bulkItems} labels={labels} />
          <ColumnMenu cols={optionalForMenu} value={optCols} onChange={setOptCols} labels={labels} />
          {/* 「⚙ 컬럼」 과 「CSV 업로드」 **사이**다(정책 §2-1) — 업로드와 방향이
              헷갈리지 않게 라벨도 「명부 내보내기」 로 둔다. */}
          {onExportRoster && (
            <ExportMenu
              items={exportItems}
              // E1 — **필터 결과가 0명이면** 잠근다(전체 인원이 남아 있어도).
              // 빈 파일을 만들지 않는 게 규칙이고, 전사 명부는 ③ 으로 받는다.
              disabled={ordered.length === 0}
              busy={exporting}
              labels={exportLabels}
              onPick={pickExportScope}
            />
          )}
          {canEdit && onCsvUpload && (
            <button type="button" className="admin-emp-btn is-ghost" onClick={onCsvUpload}>{labels.csvUpload}</button>
          )}
          {canEdit && onInvite && (
            <button type="button" className="admin-emp-btn is-primary" onClick={onInvite}><IconPlus size={14} />{labels.invite}</button>
          )}
        </div>
      </div>

      <div className="admin-emp-filterbar">
        <FilterDropdown testId="list-filter-dept" label={labels.filters.dept} value={dept} options={depts} onChange={(v) => { setDept(v); setPage(1); }} />
        <FilterDropdown testId="list-filter-squads" label={labels.filters.squad} value={squad} options={squads} onChange={(v) => { setSquad(v); setPage(1); }} />
        <FilterDropdown testId="list-filter-jobPosition" label={labels.filters.position} value={position} options={positions} onChange={(v) => { setPosition(v); setPage(1); }} />
        <FilterDropdown testId="list-filter-jobLevel" label={labels.filters.level} value={level} options={levels} onChange={(v) => { setLevel(v); setPage(1); }} />
        <FilterDropdown testId="list-filter-jobFamily" label={labels.filters.family} value={family} options={families} onChange={changeFamily} />
        <FilterDropdown testId="list-filter-jobTitle" label={labels.filters.ladder} value={ladder} options={ladders} onChange={changeLadder} />
        <FilterDropdown testId="list-filter-jobDuty" label={labels.filters.duty} value={duty} options={duties} onChange={(v) => { setDuty(v); setPage(1); }} />
        {optionalFields.job_category === true && (
          <FilterDropdown testId="list-filter-jobCategory" label={labels.filters.jobCategory} value={category} options={categories} onChange={(v) => { setCategory(v); setPage(1); }} />
        )}
        {optionalFields.business_title === true && (
          <FilterDropdown testId="list-filter-businessTitle" label={labels.filters.businessTitle} value={bizTitle} options={bizTitles} onChange={(v) => { setBizTitle(v); setPage(1); }} />
        )}
        <FilterDropdown testId="list-filter-workCountry" label={labels.filters.workCountry} value={country} options={countries} onChange={(v) => { setCountry(v); setPage(1); }} />
        <FilterDropdown testId="list-filter-workLocation" label={labels.filters.workLocation} value={location} options={locations} onChange={(v) => { setLocation(v); setPage(1); }} />
        <FilterDropdown testId="list-filter-workBuilding" label={labels.filters.workBuilding} value={building} options={buildings} onChange={(v) => { setBuilding(v); setPage(1); }} />
        <FilterDropdown testId="list-filter-employmentType" label={labels.filters.employmentType} value={empType} options={empTypes} onChange={(v) => { setEmpType(v); setPage(1); }} />
        <FilterDropdown testId="list-filter-managerId" label={labels.filters.manager} value={mgrFilter} options={mgrOpts} onChange={(v) => { setMgrFilter(v); setPage(1); }} />
        <FilterDropdown testId="list-filter-employmentStatus" label={labels.filters.status} value={status} options={statusOpts} onChange={(v) => { setStatus(v); setPage(1); }} />
        {hasFilter && (
          <button type="button" className="admin-emp-filter-reset" onClick={resetFilters}>{labels.filters.reset}</button>
        )}
      </div>

      {/* 표는 이 컨테이너 안에서만 가로로 흐른다 — 페이지가 통째로 옆으로 밀리면
          스크롤 막대가 화면 밖으로 나가 손이 닿지 않는다(PW-400 §3). */}
      <div className="admin-emp-table-wrap" data-testid="employees-list-table-wrap" ref={tableWrapRef}>
        <table className="admin-emp-table" style={{ minWidth }}>
          <thead>
            <tr>
              {cols.map((c) => (
                /* 열 id 를 DOM 에 남긴다 — 두 보기의 열 묶음을 견주는 테스트가 여기서
                   읽는다(PW-463). 라벨로 견주면 i18n 을 바꿀 때마다 테스트가 깨진다. */
                <th key={c.id} data-testid={`list-head-${c.id}`} style={{ width: c.width }} scope="col">
                  {c.id === 'select' ? (
                    /* 지금 보고 있는 «쪽»만 켜고 끈다 — 안 보이는 쪽까지 켜면 화면이
                       몇 명을 골랐는지 말해 주지 않은 채 숫자만 뛴다. */
                    <input
                      type="checkbox"
                      className="admin-emp-row-check"
                      checked={pageAllChecked}
                      onChange={togglePage}
                      data-testid="employees-list-check-all"
                      aria-label={labels.listBulk.selectPage}
                    />
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={cols.length} className="admin-emp-empty">{labels.listEmptyFiltered}</td>
              </tr>
            ) : pageRows.map((m) => (
              <tr key={m.id} data-testid={`employees-list-row-${m.id}`}>
                {cols.map((c) => (
                  <td key={c.id} data-col={c.id}>{cell(m, c.id)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 소속(기능조직) 팝업 — 겸직 다중 선택 + [매니저로].
          🔴 이 화면이 조직장 지정이 사는 **유일한 자리**다(PW-326 확정). 시트의 같은
             팝업에는 `onToggleLeader` 를 주지 않아 버튼이 뜨지 않는다. */}
      {deptPicker && (
        <OrgTreePicker
          open
          multi
          units={orgUnits}
          subtitle={deptPicker.displayName || deptPicker.name}
          selectedIds={deptPickerSelected}
          primaryId={deptPickerPrimary}
          retainedIds={deptPickerRetained}
          leaderUnitIds={(leaderUnitIdsByMember || {})[deptPicker.id] || []}
          // 조직장 지정은 서버 한 번의 변경이라 「적용」 을 기다리지 않고 그 자리에서 보낸다 —
          // 소속 선택과 묶으면 취소를 눌렀을 때 무엇이 되돌아가는지가 흐려진다.
          onToggleLeader={onToggleOrgLeader
            ? (unitId, next) => onToggleOrgLeader(deptPicker.id, unitId, next)
            : undefined}
          // L6 — 퇴사자는 조직장이 될 수 없다. 감추지 않고 이유를 남긴다.
          canBeLeader={deptPicker.employmentStatus !== 'terminated'}
          onApply={({ unitIds, primaryUnitId }) => {
            onChangeAffiliations(deptPicker.id, { unitIds, primaryUnitId });
            setDeptPickerFor(null);
          }}
          onClose={() => setDeptPickerFor(null)}
          labels={labels.orgPicker}
        />
      )}

      {/* 일괄 «소속 추가» 팝업 (PW-608) — 폐기된 스프레드시트의 같은 팝업을 그대로
          가져왔다. 두 가지가 단건 소속 팝업과 다르다:
            · `selectedIds={[]}` — 고른 사람마다 소속이 달라 「지금 상태」를 그릴 수 없다.
              빈 채로 열어 **더할 것만** 고르게 한다.
            · `primarySelectable={false}` — 주 소속은 이 조작으로 바뀌지 않는다. 칸을
              두면 「여러 명의 주 소속을 한 번에 갈아 끼운다」로 읽힌다.
          조직장 지정(`onToggleLeader`)도 주지 않는다 — 사람마다 따져야 하는 조작이다. */}
      {bulkOrgOpen && selectable && onAppendAffiliations && orgUnits.length > 0 && (
        <OrgTreePicker
          open
          multi
          primarySelectable={false}
          units={orgUnits}
          selectedIds={[]}
          subtitle={fill(labels.listBulk.orgAppendSubtitle, { count: selectedCount })}
          onApply={({ unitIds }) => applyBulkOrgAppend(unitIds)}
          onClose={() => setBulkOrgOpen(false)}
          labels={labels.orgPicker}
        />
      )}

      {/* 스쿼드 선택 팝업 (PW-438) — 시트 뷰와 **같은 `SquadPicker`** 다.
          정본 §3.1 이 이 뷰에 정해 둔 「셀 클릭 → 팝업」 경로이며, 리드 교체
          확인 모달(SQ10)·승격 안내 없음(SQ11)까지 부품이 그대로 들고 온다. */}
      {squadPickerFor && canEdit && onChangeSquads && squadOptions.length > 0 && (() => {
        const target = members.find((m) => m.id === squadPickerFor) || {};
        /* SQ10 교체 확인 문구용 — **대상 본인은 제외**한다. 자기 자신을 「기존 리드」
           로 보여 주면 리드를 껐다 켜는 것만으로 남의 지정을 해제한다는 문구가 뜬다.
           목록은 페이지 단위로 자르지만 여기서는 **전체 명부**를 훑는다 — 다음
           페이지에 있는 현 리드를 놓치면 확인 문구가 조용히 빈다. */
        const leadNames = {};
        for (const other of members) {
          if (other.id === squadPickerFor) continue;
          for (const a of Array.isArray(other.squads) ? other.squads : []) {
            if (a.isLead) leadNames[String(a.squadId)] = other.displayName || other.name;
          }
        }
        return (
          <SquadPicker
            open
            squads={squadOptions}
            memberName={target.displayName || target.name}
            value={Array.isArray(target.squads) ? target.squads : []}
            leadNameBySquadId={leadNames}
            labels={squadPickerLabels}
            onApply={(next) => onChangeSquads(squadPickerFor, next)}
            onClose={() => setSquadPickerFor(null)}
          />
        );
      })()}

      {salaryGateScope && (
        <SalaryExportModal
          // ② 를 고른 채 연봉 확인 창을 열면 «고른 사람 수»가 맞다 — 필터 결과 수를
          // 보여주면 창이 말한 인원과 실제 파일의 행 수가 갈린다.
          count={salaryGateScope === 'selected' ? selectedCount : ordered.length}
          columnCount={exportColumns.length}
          labels={exportLabels}
          onClose={() => setSalaryGateScope(null)}
          onExclude={() => {
            const scope = salaryGateScope;
            setSalaryGateScope(null);
            // 🔴 화면의 ⚙ 토글은 끄지 않는다 — 파일 선택이 화면 상태를 바꾸지 않는다(§5-1).
            runExport(scope, false);
          }}
          onInclude={() => {
            const scope = salaryGateScope;
            setSalaryGateScope(null);
            runExport(scope, true);
          }}
        />
      )}

      {ordered.length > 0 && (
        <div className="admin-emp-pagination">
          <span className="admin-emp-muted">
            {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, ordered.length)} {labels.listPagination.of} {ordered.length}{labels.countSuffix}
          </span>
          <div className="admin-emp-pagination-nav">
            <button type="button" className="admin-emp-btn is-ghost is-sm" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><IconChevronLeft size={14} />{labels.listPagination.prev}</button>
            <span className="admin-emp-mono admin-emp-muted">{safePage} {labels.listPagination.of} {totalPages}</span>
            <button type="button" className="admin-emp-btn is-ghost is-sm" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>{labels.listPagination.next}<IconChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * 재직 상태별 날짜 칸 (§3.2.1) — 상태를 고르면 그 상태의 날짜 칸이 즉시 노출된다.
 *
 * 🔴 **칸은 두 자리에 있어도 저장 경로는 하나다.** 같은 값을 두 화면이 각자의 경로로
 * 쓰면 한쪽이 다른 쪽을 덮는다(소속이 실제로 그랬다 — PW-368). 그래서 필드마다
 * «누구의 저장 경로를 타는가»(`via`)를 여기에 못박는다:
 *
 *  · `identity` — 수습 종료일·휴직 시작/종료일. HR 기록 모달과 **같은** 신원 저장
 *    경로(`onSaveIdentity`)를 탄다. 이 패널은 그 값의 두 번째 입력 «자리»일 뿐,
 *    두 번째 «경로» 를 만들지 않는다.
 *  · `member` — 퇴사일. 구성원 저장 patch(`onSave`)가 정본이고, 시트의 퇴사일 열과
 *    같은 경로다. 서버는 명시된 퇴사일을 존중하고, 안 보내면 전환 시각으로 채운다.
 */
const STATUS_DATE_FIELDS = {
  active: [],
  probation: [{ field: 'probationEndDate', label: 'probationEnd', via: 'identity' }],
  on_leave: [
    { field: 'leaveStartDate', label: 'leaveStart', via: 'identity' },
    { field: 'leaveEndDate', label: 'leaveEnd', via: 'identity' },
  ],
  terminated: [{ field: 'terminationDate', label: 'resignedAt', via: 'member' }],
};

/** 신원 저장 경로가 들고 있는 날짜 칸 — 패널이 따로 불러와야 하는 값들. */
const IDENTITY_DATE_FIELDS = ['probationEndDate', 'leaveStartDate', 'leaveEndDate'];

/** 구성원 저장 patch 로 나가는 날짜 칸 — 비우면 `''` 이 아니라 `null` 이다. */
const DATE_PATCH_FIELDS = new Set(['hireDate', 'terminationDate']);

/**
 * 패널이 고치는 칸 전량 (PW-576) — 렌더와 patch 판정이 **같은 목록**을 본다.
 * 갈라지면 화면에는 칸이 있는데 저장이 안 되거나, 그 반대가 된다.
 *
 * 종전에는 여섯 칸(이름·직급·직책·입사일·재직상태·퇴사일)뿐이었고 나머지는 전부
 * 스프레드시트 뷰에만 있었다. 그 뷰가 폐기되면서(2026-09-02 정기미팅 §1) 이 목록이
 * 구성원 값을 고치는 **유일한 자리**가 됐다 — 기획서 §3.2 가 규정한 모양이다.
 * 목록은 폐기된 시트의 `EDITABLE_FIELDS` 를 그대로 물려받되, 다른 자리에 정본이 있는
 * 넷은 뺐다: `department`(소속 팝업) · `managerId`(미배정 탭·행 배정) ·
 * `employmentStatus`/`hireDate`/`terminationDate`(재직 상태 절이 이미 다룬다).
 */
const PANEL_PATCH_FIELDS = [
  'name', 'nickname', 'displayName', 'email', 'phone', 'employeeCode',
  'jobLevel', 'jobRank', 'jobPosition', 'jobCategory',
  'jobFamily', 'jobTitle', 'jobDuty', 'businessTitle', 'employmentType',
  'workCountry', 'workLocation', 'workBuilding', 'ftePercent',
  'orgRole', 'salary', 'education',
  'hireDate', 'employmentStatus', 'terminationDate',
];

/** 권한 select 의 값 — 시트와 같은 3종. admin 승격은 서버가 초대로만 허용한다. */
const PANEL_ROLE_OPTIONS = ['admin', 'manager', 'member'];

/**
 * 패널의 칸 배치 (§3.2). `kind` 는 그리는 법이고, `catalog` 는 소비자가 넘긴 선택지
 * 이름이다. 카탈로그를 못 받으면 **자유 텍스트로 떨어진다** — 조회 실패가 값 입력을
 * 막지 않게 하려는 것이고, 폐기된 시트가 쓰던 규칙 그대로다.
 */
const PANEL_FIELD_GROUPS = [
  {
    id: 'basic', labelKey: 'basicInfo',
    fields: [
      { key: 'name', labelKey: 'name', kind: 'text' },
      { key: 'email', labelKey: 'email', kind: 'text', note: 'emailNote' },
      { key: 'nickname', labelKey: 'nickname', kind: 'text' },
      { key: 'displayName', labelKey: 'displayName', kind: 'text' },
      { key: 'phone', labelKey: 'phone', kind: 'text' },
      { key: 'employeeCode', labelKey: 'employeeCode', kind: 'text' },
      { key: 'hireDate', labelKey: 'joined', kind: 'date' },
    ],
  },
  {
    id: 'classify', labelKey: 'classifySection',
    fields: [
      { key: 'jobLevel', labelKey: 'level', kind: 'select', catalog: 'gradeOptions' },
      { key: 'jobRank', labelKey: 'jobRank', kind: 'select', catalog: 'rankOptions' },
      { key: 'jobPosition', labelKey: 'position', kind: 'select', catalog: 'positionOptions' },
      // 직종·직함은 회사가 켠 경우에만 칸이 선다(§3.1 ⚙ 정본표의 «선택 적용 필드»).
      { key: 'jobCategory', labelKey: 'jobCategory', kind: 'select', catalog: 'categoryOptions', optionalKey: 'job_category' },
      // 직군 > 직렬 > 직무 3단 — 위를 고르면 아래 선택지가 좁아진다(INV-3·INV-8).
      { key: 'jobFamily', labelKey: 'jobFamily', kind: 'select', catalog: 'jobFamilies' },
      { key: 'jobTitle', labelKey: 'jobLadder', kind: 'select', catalog: 'jobLadders', narrowBy: 'jobFamily' },
      { key: 'jobDuty', labelKey: 'jobDuty', kind: 'select', catalog: 'jobDuties', narrowBy: 'jobTitle' },
      { key: 'businessTitle', labelKey: 'businessTitle', kind: 'select', catalog: 'businessTitleOptions', optionalKey: 'business_title' },
      { key: 'employmentType', labelKey: 'employmentType', kind: 'select', catalog: 'employmentTypeOptions' },
    ],
  },
  {
    id: 'work', labelKey: 'workSection',
    fields: [
      { key: 'workCountry', labelKey: 'workCountry', kind: 'select', catalog: 'countryOptions' },
      // 도시는 예부터 자유 텍스트다 — select 로 바꾸면 카탈로그에 없는 기존 값이
      // 지워진 것처럼 보인다.
      { key: 'workLocation', labelKey: 'workLocation', kind: 'text' },
      { key: 'workBuilding', labelKey: 'workBuilding', kind: 'select', catalog: 'buildingOptions' },
      { key: 'ftePercent', labelKey: 'ftePercent', kind: 'number' },
    ],
  },
];

const toDateInput = (v) => (typeof v === 'string' ? v.slice(0, 10) : '');

/**
 * 슬라이드오버 단건 편집 패널 — 목록 뷰의 «단건 상세 편집» (§3.2).
 *
 * 저장은 시트와 **같은 patch 계약**(`onSaveMembers([{ id, ...changed }])`)을 쓴다.
 * 소속도 시트와 **같은 배열 원자 치환**(`onChangeAffiliations`)을 탄다 — 두 뷰가 같은
 * 값을 다른 계약으로 쓰면 한쪽이 다른 쪽을 덮어쓴다.
 *
 * 이메일은 **읽기 전용**이다. 로그인 키라 확인 모달이 따라붙는데(§3.2-A), 그 경로의
 * 정본은 시트다. 여기에 두 번째 진입점을 만들면 확인 절차가 갈린다.
 */
/**
 * 개인정보 변경 이력 목록 — 어드민 「구성원 편집 패널 > 변경 이력」 탭 (PW-460 §2-D).
 *
 * 표가 아니라 카드형인 이유는 패널 폭이 좁아 `이전 → 이후` 두 값을 나란히 놓아야 하기
 * 때문이다. **읽기 전용이다** — 행을 눌러도 아무 일이 일어나지 않고 되돌리기·삭제가 없다.
 *
 * 값 자리의 세 상태를 회색으로 뭉개지 않는다. 「아무도 못 본다」(파기됨)와 「애초에 안
 * 적었다」(변경됨)는 원인이 달라서, 보는 사람이 다음에 할 수 있는 일도 다르다.
 */
function PersonalHistoryList({ state, labels, onRetry }) {
  const L = labels.panel;

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="admin-emp-hist-skeleton" aria-busy="true" data-testid="employees-history-loading">
        <div className="admin-emp-hist-skeleton-row" />
        <div className="admin-emp-hist-skeleton-row" />
        <div className="admin-emp-hist-skeleton-row" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="admin-emp-hist-empty" data-testid="employees-history-error">
        <div>{L.historyLoadError}</div>
        <button type="button" className="admin-emp-btn is-secondary" style={{ marginTop: 10 }}
          onClick={onRetry} data-testid="employees-history-retry">{L.historyRetry}</button>
      </div>
    );
  }

  const items = (state.page && state.page.items) || [];
  if (items.length === 0) {
    return (
      <div className="admin-emp-hist-empty" data-testid="employees-history-empty">
        <div>{L.historyEmpty}</div>
        {/* CTA 를 두지 않는다 — 이력은 만들러 가는 것이 아니다. */}
        <div className="admin-emp-hist-empty-hint">{L.historyEmptyHint}</div>
      </div>
    );
  }

  return (
    <div className="admin-emp-hist-list" data-testid="employees-history-list">
      {items.map((h) => (
        <div key={h.id} className="admin-emp-hist-row" data-testid={`employees-history-row-${h.id}`}>
          <div className="admin-emp-hist-when">{h.changedAt}</div>
          <div className="admin-emp-hist-main">
            <div className="admin-emp-hist-head">
              <span className="admin-emp-hist-field">
                {h.itemLabel ? `${h.label} · ${h.itemLabel}` : h.label}
              </span>
              {h.changeKind === 'add' && <span className="admin-emp-hist-chip">{L.historyAdded}</span>}
              {h.changeKind === 'remove' && <span className="admin-emp-hist-chip">{L.historyRemoved}</span>}
            </div>
            <div className="admin-emp-hist-values">
              {h.state === 'purged' ? L.historyPurged
                : h.state === 'withheld' ? L.historyWithheld
                  : (
                    <>
                      {/* 이전 값에 취소선을 긋지 않는다 — 「지워진 값」으로 읽힌다. */}
                      <span className="admin-emp-hist-before">{h.before || L.historyNone}</span>
                      {' → '}
                      <span className="admin-emp-hist-after">{h.after || L.historyNone}</span>
                    </>
                  )}
            </div>
            <div className="admin-emp-hist-who">
              {h.actor && h.actor.name ? h.actor.name : L.historyNone}
              {h.actor && h.actor.isSelf && <span className="admin-emp-hist-chip is-self">{L.historyBySelf}</span>}
            </div>
            {/* 사유가 없으면 줄 자체를 그리지 않는다 — 「사유 없음」을 매 행에 반복하지 않는다. */}
            {h.reason && <div className="admin-emp-hist-reason">{h.reason}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 변경 사유 모달 — **저장하는 순간에 받는다**(§2-D-4).
 *
 * 🔴 언제 뜨는지를 이 화면이 스스로 판단하지 않는다. 어떤 항목이 이력 대상인지는 서버가
 * 정하고, 서버가 사유 없이 온 저장을 거부하면(422) 그때 이 모달이 뜬다. 화면이 목록을
 * 따로 들면 그 목록이 낡는 순간 **모달이 안 뜨고 저장만 실패**한다.
 *
 * 사유는 «저장 1회» 단위로 하나다 — 한 번에 세 항목을 고치면 세 기록이 같은 사유를
 * 공유한다. 항목마다 받으면 「수정」·「.」 같은 형식적 입력을 유발한다. 기본값을 채우지
 * 않는 것도 같은 이유다: **사유가 있는데 믿을 수 없는 것이 사유가 없는 것보다 나쁘다.**
 */
function ChangeReasonModal({ prompt, labels }) {
  const L = labels.changeReason;
  const [reason, setReason] = useState('');
  const canSubmit = reason.trim().length > 0;
  return (
    /* 🔴 `admin-notif-modal-root` 를 빼면 안 된다. 배경(`…-backdrop`)은
       `position: absolute; z-index: auto` 라 스스로 뜨지 못한다 — 앱 크롬(사이드바 z:100)
       아래로 깔리고 조상의 `overflow: hidden` 에 잘린다. 뜨는 일은 이 래퍼가 한다
       (`position: fixed; z-index: 1000`). 편집 패널(z:101) 위에 서는 것도 이 값 덕이다. */
    <div className="admin-notif-modal-root" data-testid="change-reason-modal">
      <div className="admin-notif-modal-backdrop" onClick={prompt.onCancel} />
      <div className="admin-notif-modal" role="dialog" aria-modal="true">
        <div className="admin-notif-modal-header">
          <div className="admin-notif-modal-title">{L.title}</div>
        </div>
        <div className="admin-notif-modal-body">
          {/* 어떤 항목이 걸렸는지 보여 준다 — 개수만 알리면 무엇을 고쳤는지 모른 채
              사유를 쓰게 된다. 서버가 준 목록을 그대로 세운다. */}
          <div className="admin-emp-reason-fields">
            {(prompt.fields || []).map((f) => (
              <span key={f.key} className="admin-emp-hist-chip">{f.label}</span>
            ))}
          </div>
          <label className="admin-emp-field">
            <span className="admin-emp-field-label">{L.label}</span>
            <input
              className="admin-emp-input"
              value={reason}
              autoFocus
              placeholder={L.placeholder}
              onChange={(e) => setReason(e.target.value)}
              data-testid="change-reason-input"
            />
          </label>
          <p className="admin-emp-reason-lead">{L.lead}</p>
        </div>
        <div className="admin-notif-modal-footer">
          <button type="button" className="admin-emp-btn is-secondary" onClick={prompt.onCancel}
            data-testid="change-reason-cancel">{L.cancel}</button>
          <button type="button" className="admin-emp-btn is-primary" disabled={!canSubmit}
            onClick={() => prompt.onSubmit(reason.trim())}
            data-testid="change-reason-submit">{L.submit}</button>
        </div>
      </div>
    </div>
  );
}

function EmployeesEditPanel({
  member, orgUnits, labels, renderAvatar, canEdit,
  gradeOptions, positionOptions, onClose, onSave, onChangeAffiliations,
  onLoadHrProfile, onSaveIdentity,
  onLoadPersonalHistory,
  /* PW-576 — 폐기된 스프레드시트 뷰가 받던 카탈로그가 그대로 내려온다.
     못 받으면 그 칸이 자유 텍스트가 될 뿐 값은 보존된다. */
  rankOptions, categoryOptions, businessTitleOptions, employmentTypeOptions,
  countryOptions, buildingOptions, jobAxis, optionalFields,
  canViewSalary, onLoadSalaryHistory, onAddSalaryHistory,
}) {
  const [draft, setDraft] = useState(member);
  const [syncedId, setSyncedId] = useState(member?.id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  /**
   * 신원 저장 경로가 들고 있는 날짜(수습 종료일·휴직 시작/종료일)는 구성원 목록 응답에
   * 실려 오지 않는다 — HR 전용 값이라 별도 조회 경로에만 있다. 패널이 열릴 때 한 번
   * 불러와 «지금 값» 을 보여준다. 안 불러오면 이미 채워 둔 날짜가 빈칸으로 보이고,
   * 저장을 누르는 순간 멀쩡한 값을 지우게 된다.
   */
  const [identity, setIdentity] = useState(null);
  const [identityDraft, setIdentityDraft] = useState(null);
  /**
   * 🔴 `loading` 으로 «바꾸는» 것은 효과 밖에서 한다 — 효과 본문에서 setState 를 부르면
   * 렌더가 연쇄한다. 패널이 열리는 순간과 다른 사람으로 갈아끼우는 순간이 곧 조회
   * 시점이므로, 그 두 자리에서 `loading` 을 세우고 효과는 조회만 한다.
   * 조회 경로가 없으면(어드민 아님) 처음부터 `idle` 이라 영영 「불러오는 중」이 되지 않는다.
   */
  const [identityState, setIdentityState] = useState(
    onLoadHrProfile ? 'loading' : 'idle',
  );
  const [dateError, setDateError] = useState('');
  /**
   * 패널 안의 탭 — `info`(편집) / `history`(조회). 편집 흐름과 조회 흐름을 섞지 않는다.
   * 이 패널은 이미 섹션이 열 개가 넘어서, 이력을 또 하나의 섹션으로 붙이면 편집 흐름
   * 한가운데를 읽기 전용 표가 끊는다.
   */
  const [panelTab, setPanelTab] = useState('info');
  const [historyState, setHistoryState] = useState({ status: 'idle', page: null });

  // 다른 사람을 열면 draft 를 그 사람으로 갈아끼운다. 같은 사람이면 편집 중인 값을
  // 유지한다 — members 가 재조회될 때마다 입력이 되돌아가면 타이핑을 못 한다.
  if (member && syncedId !== member.id) {
    setSyncedId(member.id);
    setDraft(member);
    setPickerOpen(false);
    setIdentity(null);
    setIdentityDraft(null);
    setIdentityState(onLoadHrProfile ? 'loading' : 'idle');
    setDateError('');
    /* 다음 사람을 열었을 때 이력 탭이 먼저 뜨면 「내가 뭘 누른 거지」가 된다. */
    setPanelTab('info');
    setHistoryState({ status: 'idle', page: null });
  }

  const memberId = member?.id;
  useEffect(() => {
    if (identityState !== 'loading' || !memberId || !onLoadHrProfile) {
      return undefined;
    }
    let alive = true;
    Promise.resolve(onLoadHrProfile(memberId))
      .then((profile) => {
        if (!alive) return;
        const src = profile?.identity || {};
        const loaded = {};
        for (const f of IDENTITY_DATE_FIELDS) loaded[f] = toDateInput(src[f]);
        setIdentity(loaded);
        setIdentityDraft(loaded);
        setIdentityState('ready');
      })
      .catch(() => {
        if (!alive) return;
        // 전역 오류 화면으로 튕기지 않는다 — 편집 중이던 다른 칸까지 날아간다.
        setIdentityState('error');
      });
    return () => { alive = false; };
  }, [identityState, memberId, onLoadHrProfile]);

  /* 이력은 탭에 «처음 들어갈 때» 한 번만 부른다 — 패널을 여는 대부분의 이유가 편집이라
     열자마자 부르면 안 볼 목록을 매번 조회하게 된다. 실패해도 편집 탭은 그대로 돈다.
     `loading` 으로 «바꾸는» 것은 버튼을 누른 자리에서 하고, 효과는 조회만 한다 —
     효과 본문에서 setState 를 부르면 렌더가 연쇄한다. */
  useEffect(() => {
    if (historyState.status !== 'loading' || !memberId || !onLoadPersonalHistory) {
      return undefined;
    }
    let alive = true;
    Promise.resolve(onLoadPersonalHistory(memberId, {}))
      .then((page) => { if (alive) setHistoryState({ status: 'ready', page }); })
      .catch(() => { if (alive) setHistoryState({ status: 'error', page: null }); });
    return () => { alive = false; };
  }, [historyState.status, memberId, onLoadPersonalHistory]);

  const orgTree = useMemo(() => buildOrgTree(orgUnits), [orgUnits]);

  /* 기록 창 셋 — 폐기된 시트에서 옮겨 온 그대로다(PW-576). 여는 자리만 바뀌었다. */
  const [hrOpen, setHrOpen] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(false);

  if (!member) return null;
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  /* 칸이 읽는 선택지 — 이름 하나로 찾게 모아 둔다. `PANEL_FIELD_GROUPS` 의
     `catalog` 가 이 키를 가리킨다. */
  const axis = jobAxis || { families: [], ladders: [], duties: [], laddersByFamily: {}, dutiesByLadder: {} };
  const catalogs = {
    gradeOptions, positionOptions, rankOptions, categoryOptions,
    businessTitleOptions, employmentTypeOptions, countryOptions, buildingOptions,
    jobFamilies: axis.families,
    jobLadders: axis.ladders,
    jobDuties: axis.duties,
  };
  const narrowMaps = {
    jobTitle: [axis.ladders, axis.laddersByFamily],
    jobDuty: [axis.duties, axis.dutiesByLadder],
  };
  /** 회사가 끈 선택 적용 항목은 칸 자체를 그리지 않는다 — 켤 수 없는 칸을 보여주지 않는다. */
  const fieldOn = (f) => !f.optionalKey || (optionalFields || {})[f.optionalKey] === true;
  const optionsFor = (f) => {
    if (!f.narrowBy) return catalogs[f.catalog] || [];
    const [all, byParent] = narrowMaps[f.key] || [];
    return narrowByParent(all || [], byParent || {}, draft[f.narrowBy]);
  };

  // §3.2.1 재직상태 4종. `pending`(가입 대기)·`other`(마이그레이션 잔여)는 사람이 고르는
  // 값이 아니라 선택지에 두지 않는다 — 고를 수 있게 두면 탭 C 와 담당이 겹친다.
  const statusOrder = ['active', 'probation', 'on_leave', 'terminated'];
  // 소속 팝업의 초기 선택 — 칩이 든 조직 id 가 정본, 없으면 orgUnitIds 폴백.
  const chips = (member.depts || []).filter((d) => d.orgUnitId);
  const fallbackPrimary = primaryOrgEntry(orgTree, member.orgUnitIds)?.id ?? '';
  const selectedIds = chips.length > 0 ? chips.map((d) => d.orgUnitId) : (fallbackPrimary ? [fallbackPrimary] : []);
  const primaryUnitId = chips.find((d) => d.isPrimary)?.orgUnitId || fallbackPrimary;
  /* 목록 행 팝업과 같은 계산 — 두 자리가 다른 말을 하면 안 된다 (PW-404). */
  const retainedIds = retainedOrgIds(member, selectedIds);
  const primaryEntry = primaryUnitId ? findOrgEntry(orgTree, primaryUnitId) : null;

  /* 지금 고른 상태가 데리고 오는 날짜 칸 (§3.2.1). `active` 는 빈 배열이라 아무것도
     안 뜬다 — 「추가 필드 없음」 이 그 상태의 규정이다. */
  const dateFields = (STATUS_DATE_FIELDS[draft.employmentStatus] || []).filter(
    // 신원 경로가 없는 호출부(어드민 아님)에는 그 칸을 그리지 않는다. 읽을 수도 저장할
    // 수도 없는 값을 빈칸으로 두면 「비어 있다」 로 읽혀 더 나쁘다.
    (f) => f.via === 'member' || Boolean(onLoadHrProfile),
  );
  const identityBusy = identityState === 'loading';
  const identityBroken = identityState === 'error';
  const dateValue = (f) =>
    f.via === 'identity'
      ? (identityDraft?.[f.field] ?? '')
      : toDateInput(draft[f.field]);
  const setDateValue = (f, v) => {
    setDateError('');
    if (f.via === 'identity') setIdentityDraft((d) => ({ ...(d || {}), [f.field]: v }));
    else set(f.field, v);
  };

  /** 바뀐 칸만 담은 patch — 시트의 dirty → patch 와 같은 모양이다. */
  function buildPatch() {
    const patch = { id: draft.id };
    for (const f of PANEL_PATCH_FIELDS) {
      if ((draft[f] ?? '') === (member[f] ?? '')) continue;
      /* 날짜를 비운 것은 `''` 이 아니라 `null` 로 보낸다 — 날짜 칸에 빈 문자열이
         들어가면 저장이 통째로 실패한다. `null` 은 「지웠다」 는 뜻이라 서버도 그렇게
         읽는다(퇴사일은 명시값이 있으면 자동 채움을 건너뛴다). */
      patch[f] = DATE_PATCH_FIELDS.has(f) ? (draft[f] || null) : (draft[f] ?? '');
    }
    return patch;
  }
  /** 신원 저장 경로로 나가야 하는 날짜만 담은 patch — 바뀐 칸만. */
  function buildIdentityPatch() {
    if (!identity || !identityDraft) return {};
    const out = {};
    for (const f of IDENTITY_DATE_FIELDS) {
      if ((identityDraft[f] ?? '') !== (identity[f] ?? '')) out[f] = identityDraft[f] || null;
    }
    return out;
  }
  const patch = buildPatch();
  const identityPatch = buildIdentityPatch();
  const identityDirty = Object.keys(identityPatch).length > 0;
  const dirty = Object.keys(patch).length > 1 || identityDirty;

  async function handleSave() {
    if (!dirty) { onClose(); return; }
    setSaving(true);
    setDateError('');
    try {
      /* 날짜를 **먼저** 보낸다. 상태 저장이 성공한 뒤 날짜가 실패하면 「수습으로 바뀌었는데
         종료일은 안 들어간」 반쪽 상태가 남는데, 순서를 뒤집으면 그 조합이 안 생긴다.
         실패는 **인라인으로만** 알리고 패널을 열어 둔다 — 닫으면 방금 친 날짜가 사라진다. */
      if (identityDirty && onSaveIdentity) {
        try {
          await onSaveIdentity(member.id, identityPatch);
        } catch {
          setDateError(labels.panel.statusDateSaveError);
          return;
        }
        setIdentity((prev) => ({ ...(prev || {}), ...identityDraft }));
      }
      // 구성원 저장은 종전 그대로 — 실패를 삼키지 않는다(호출부가 토스트·확인을 띄운다).
      if (Object.keys(patch).length > 1) await onSave([patch]);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-emp-panel-backdrop" onClick={onClose} />
      <div className="admin-emp-panel" role="dialog" aria-modal="true" data-testid="employees-edit-panel">
        <div className="admin-emp-panel-header">
          <div className="admin-emp-panel-id">
            {renderAvatar ? renderAvatar(draft, 36) : <AvatarFallback row={draft} size={36} />}
            <div>
              <div className="admin-emp-panel-name">{draft.displayName || draft.name}</div>
              <div className="admin-emp-panel-email">{draft.email}</div>
            </div>
          </div>
          <button type="button" className="admin-emp-panel-close" onClick={onClose} aria-label={labels.panel.close}><IconX size={16} /></button>
        </div>

        {/* 탭 바 — 본문 스크롤 «밖» 이라 아래로 내려도 고정이다.
            건수 배지를 달지 않는다: 이력이 많은 것은 문제 신호가 아니라 오래 다닌
            사람이라는 뜻이라 주의를 끌 이유가 없다. */}
        {onLoadPersonalHistory && (
          <div className="admin-emp-panel-tabs" role="tablist" data-testid="employees-panel-tabs">
            {[['info', labels.panel.tabInfo], ['history', labels.panel.tabHistory]].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={panelTab === id}
                className={`admin-emp-panel-tab${panelTab === id ? ' is-active' : ''}`}
                onClick={() => {
                  setPanelTab(id);
                  if (id === 'history' && historyState.status === 'idle') {
                    setHistoryState({ status: 'loading', page: null });
                  }
                }}
                data-testid={`employees-panel-tab-${id}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="admin-emp-panel-body">
          {panelTab === 'history' ? (
            <PersonalHistoryList
              state={historyState}
              labels={labels}
              onRetry={() => setHistoryState({ status: 'loading', page: null })}
            />
          ) : (
          <>
          {/* 칸은 `PANEL_FIELD_GROUPS` 한 곳에서 온다 — 렌더와 저장 판정이 같은
              목록을 봐야 「화면엔 있는데 저장이 안 되는 칸」이 안 생긴다(PW-576). */}
          {PANEL_FIELD_GROUPS.map((g) => {
            const shown = g.fields.filter(fieldOn);
            if (shown.length === 0) return null;
            return (
              <div key={g.id}>
                <SectionLabel>{labels.panel[g.labelKey]}</SectionLabel>
                <div className="admin-emp-field-group">
                  {shown.map((f) => {
                    const opts = f.kind === 'select' ? optionsFor(f) : null;
                    return (
                      <label className="admin-emp-field" key={f.key}>
                        <span className="admin-emp-field-label">{labels.panel[f.labelKey]}</span>
                        {f.kind === 'select' && opts.length > 0 ? (
                          <select
                            className="admin-emp-input"
                            value={draft[f.key] || ''}
                            disabled={!canEdit}
                            data-testid={`employees-panel-${f.key}`}
                            onChange={(e) => set(f.key, e.target.value)}
                          >
                            <option value="">{labels.panel.none}</option>
                            {/* 저장된 값이 카탈로그에서 사라졌어도 선택지에 남긴다 —
                                없으면 select 가 «미지정» 으로 보여, 다른 칸만 고쳐
                                저장해도 멀쩡한 값이 지워진다. */}
                            {(opts.includes(draft[f.key]) || !draft[f.key]
                              ? opts
                              : [draft[f.key], ...opts]
                            ).map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input
                            className="admin-emp-input"
                            type={f.kind === 'date' ? 'date' : f.kind === 'number' ? 'number' : 'text'}
                            value={f.kind === 'date' ? (draft[f.key] || '').slice(0, 10) : (draft[f.key] ?? '')}
                            disabled={!canEdit}
                            data-testid={`employees-panel-${f.key}`}
                            onChange={(e) => set(f.key, e.target.value)}
                          />
                        )}
                        {f.note && <span className="admin-emp-manager-note">{labels.panel[f.note]}</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* 권한 — 시트의 «권한» 열이 여기로 왔다(PW-576). 조직장 지정에 따른 자동
              승격은 서버가 하고(L10), 이 칸은 그 값을 직접 고치는 자리다. */}
          <SectionLabel>{labels.panel.roleSection}</SectionLabel>
          <div className="admin-emp-field-group">
            <label className="admin-emp-field">
              <span className="admin-emp-field-label">{labels.panel.role}</span>
              <select
                className="admin-emp-input"
                value={draft.orgRole || ''}
                disabled={!canEdit}
                data-testid="employees-panel-orgRole"
                onChange={(e) => set('orgRole', e.target.value)}
              >
                <option value="">{labels.panel.none}</option>
                {PANEL_ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{labels.panel.roles?.[r] || r}</option>
                ))}
              </select>
              <span className="admin-emp-manager-note">{labels.panel.roleNote}</span>
            </label>
          </div>

          <SectionLabel>{labels.panel.orgAssign}</SectionLabel>
          <div className="admin-emp-org-assign">
            <button
              type="button"
              className={`admin-emp-org-current${primaryEntry || member.department ? '' : ' is-empty'}`}
              disabled={!canEdit || !onChangeAffiliations}
              onClick={() => setPickerOpen(true)}
              data-testid="employees-panel-org"
            >
              <span className="admin-emp-org-current-name">
                <OrgPathLabel entry={primaryEntry} fallback={member.department || labels.panel.orgNone} />
                {selectedIds.length > 1 && (
                  <span className="admin-emp-row-dept-more">
                    {String(labels.concurrentCount).split('{count}').join(String(selectedIds.length - 1))}
                  </span>
                )}
              </span>
              <span className="admin-emp-org-current-arrow">{labels.panel.orgChange}<IconChevronDown size={13} /></span>
            </button>
            {pickerOpen && onChangeAffiliations && (
              <OrgTreePicker
                open
                units={orgUnits}
                multi
                selectedIds={selectedIds}
                primaryId={primaryUnitId}
                retainedIds={retainedIds}
                subtitle={draft.name}
                labels={labels.orgPicker}
                onApply={(payload) => onChangeAffiliations(member.id, payload)}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>

          <SectionLabel>{labels.panel.managerSection}</SectionLabel>
          <div className="admin-emp-manager-readonly">
            <span className="admin-emp-manager-name">{draft.managerName || '—'}</span>
            {/* 매니저(개인 상급자) 배정 자리는 미배정 탭이다 — 두 곳에 두면 규칙이 갈린다. */}
            <span className="admin-emp-manager-note">{labels.panel.managerWhere}</span>
          </div>

          <SectionLabel>{labels.panel.statusSection}</SectionLabel>
          <div className="admin-emp-status-options">
            {statusOrder.map((key) => {
              const selected = draft.employmentStatus === key;
              return (
                <label key={key} className={`admin-emp-status-option is-${key.replace('_', '-')}${selected ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="employmentStatus"
                    className="admin-emp-sr-only"
                    checked={selected}
                    disabled={!canEdit}
                    onChange={() => set('employmentStatus', key)}
                  />
                  <span className="admin-emp-radio-circle">{selected && <span className="admin-emp-radio-dot" />}</span>
                  <span className="admin-emp-status-option-label">{labels.status[key]}</span>
                </label>
              );
            })}
          </div>

          {/* 고른 상태의 날짜 칸 (§3.2.1). 라디오 **바로 아래**에 둔다 — 다른 화면을
              열어 채우게 하면 상태만 바뀌고 날짜는 비는 조합이 그대로 남는다. */}
          {dateFields.length > 0 && (
            <div className="admin-emp-status-dates" data-testid="employees-panel-status-dates">
              {dateFields.map((f) => (
                <label className="admin-emp-field" key={f.field}>
                  <span className="admin-emp-field-label">{labels.panel[f.label]}</span>
                  <input
                    type="date"
                    className="admin-emp-input"
                    data-testid={`employees-panel-date-${f.field}`}
                    value={dateValue(f)}
                    disabled={!canEdit || (f.via === 'identity' && identityState !== 'ready')}
                    onChange={(e) => setDateValue(f, e.target.value)}
                  />
                </label>
              ))}
              {dateFields.some((f) => f.via === 'identity') && identityBusy && (
                <span className="admin-emp-status-date-note">{labels.panel.statusDateLoading}</span>
              )}
              {dateFields.some((f) => f.via === 'identity') && identityBroken && (
                <span className="admin-emp-status-date-note is-error" role="alert">
                  {labels.panel.statusDateLoadError}
                </span>
              )}
              {dateError && (
                <span className="admin-emp-status-date-note is-error" role="alert">{dateError}</span>
              )}
            </div>
          )}

          {/* 보상 — 연봉 열람 권한이 없으면 칸도 이력 버튼도 그리지 않는다(T3).
              값을 «—» 로 가려 두면 「비어 있다」로 읽혀 덮어쓰는 사고가 난다. */}
          {canViewSalary && (
            <>
              <SectionLabel>{labels.panel.paySection}</SectionLabel>
              <div className="admin-emp-field-group">
                <label className="admin-emp-field">
                  <span className="admin-emp-field-label">{labels.panel.salary}</span>
                  <input
                    className="admin-emp-input"
                    value={draft.salary ?? ''}
                    disabled={!canEdit}
                    data-testid="employees-panel-salary"
                    onChange={(e) => set('salary', e.target.value)}
                  />
                </label>
                {onLoadSalaryHistory && (
                  <button
                    type="button"
                    className="admin-emp-btn is-ghost admin-emp-btn-block"
                    onClick={() => setSalaryOpen(true)}
                    data-testid="employees-panel-salary-history"
                  >
                    <IconSalary size={14} />{labels.panel.salaryHistory}
                  </button>
                )}
              </div>
            </>
          )}

          {/* 기록 — HR 기록 창은 조회 경로가 있을 때만 연다(어드민 전용).
              폐기된 시트의 행 버튼이 여기로 왔다(PW-576). */}
          <SectionLabel>{labels.panel.recordSection}</SectionLabel>
          <div className="admin-emp-field-group">
            <label className="admin-emp-field">
              <span className="admin-emp-field-label">{labels.panel.education}</span>
              <input
                className="admin-emp-input"
                value={draft.education ?? ''}
                disabled={!canEdit}
                data-testid="employees-panel-education"
                onChange={(e) => set('education', e.target.value)}
              />
            </label>
            {onLoadHrProfile && (
              <button
                type="button"
                className="admin-emp-btn is-ghost admin-emp-btn-block"
                onClick={() => setHrOpen(true)}
                data-testid="employees-panel-hr-profile"
              >
                {labels.panel.hrProfile}
                <span className="admin-emp-manager-note">{labels.panel.hrProfileHint}</span>
              </button>
            )}
          </div>
          </>
          )}
        </div>

        {/* 기록 창 둘 — 패널 «안» 이 아니라 패널과 나란히 그린다. 패널 본문은 스크롤
            영역이라 그 안에 두면 창이 잘린다. */}
        {hrOpen && onLoadHrProfile && (
          <HrProfileModal
            row={draft}
            labels={labels.records}
            onLoad={onLoadHrProfile}
            onSaveIdentity={canEdit ? onSaveIdentity : undefined}
            onClose={() => setHrOpen(false)}
          />
        )}
        {salaryOpen && onLoadSalaryHistory && (
          <SalaryHistoryModal
            row={draft}
            labels={labels.records}
            onLoad={onLoadSalaryHistory}
            onAdd={canEdit ? onAddSalaryHistory : undefined}
            onClose={() => setSalaryOpen(false)}
            onSalarySynced={(v) => set('salary', v)}
          />
        )}

        {/* 이력 탭은 읽기 전용이라 저장 줄을 그리지 않는다 — 누를 수 없는 버튼을 두면
            「여기서도 고칠 수 있나」로 읽힌다. */}
        {panelTab === 'info' && (
          <div className="admin-emp-panel-footer">
            <button type="button" className="admin-emp-btn is-secondary admin-emp-btn-block" onClick={onClose}>{labels.panel.cancel}</button>
            <button
              type="button"
              className="admin-emp-btn is-primary admin-emp-btn-block"
              onClick={handleSave}
              disabled={saving || !canEdit || !dirty}
            >
              {saving ? labels.panel.saving : labels.panel.save}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminEmployeesCanvas({
  members = [],
  orgUnits = [],
  invites = [],
  initialTab,
  // 전체 구성원 탭의 초기 검색어(딥링크용) — 개요에서 특정 인원 클릭 시 사용.
  initialSearch = '',
  /**
   * 보던 상태 되살리기 (PW-157) — 목록 표로 내려간다.
   * `onTabChange` 는 탭을 옮길 때마다 부른다(딥링크의 `initialTab` 과 짝이다).
   *
   * ⛔ `initialSort` 는 **없다** (PW-576). 사람이 고르는 정렬은 폐기된 스프레드시트
   * 뷰에만 있었고, 목록 표의 정렬은 «대표 최상단 고정» 하나뿐이라 되살릴 것이 없다.
   * `onViewStateChange` 는 그래서 `sortCol: null` 을 늘 함께 준다.
   */
  initialFilters,
  onViewStateChange,
  onTabChange,
  /* ⛔ `initialViewMode`·`onViewModeChange` 폐기 (PW-576) — 「전체 구성원」 탭은
     목록 한 화면이라 오갈 뷰가 없다. 2026-09-02 정기미팅 §1 (David). */
  /** 목록 뷰 한 쪽에 보여 줄 인원 수. */
  pageSize = 20,
  /** 목록 뷰 행 메뉴의 «비활성화». 미주입이면 그 항목이 없다. */
  onDeactivateMember,
  /**
   * 목록 뷰 ⚙ 컬럼 표시 설정 `{ [colId]: boolean }` (PW-400).
   *
   * 상태를 **소비자가 들고 있는 게 정본**이다 — 캔버스가 들고 있으면 화면을 떠나는
   * 순간 사라져서, 20여 개 열을 매번 다시 켜야 한다. 미주입이면 내부 상태로
   * 폴백하므로 옛 호출부도 그대로 돈다.
   */
  listOptCols,
  onListOptColsChange,
  /**
   * 그 구성원이 **조직장인 조직 id 목록** `{ [memberId]: string[] }` (PW-400).
   *
   * `orgLeaderByMember`(그 사람의 상급 조직장)와 방향이 반대다 — 헷갈리지 말 것.
   * 소속 팝업의 `[매니저로]` 가 이 값으로 「이미 매니저」 상태를 그린다.
   */
  leaderUnitIdsByMember,
  /**
   * 조직장 지정·해제 `(memberId, unitId, next: boolean) => void` (PW-400).
   *
   * 미주입이면 소속 팝업에 `[매니저로]` 가 **아예 뜨지 않는다**. 권한 자동 승격과
   * 「팀당 1명」 은 서버 규칙이다 — 캔버스가 흉내 내면 두 곳으로 갈린다.
   */
  onToggleOrgLeader,
  loading = false,
  labels: providedLabels,
  canEdit = true,
  renderAvatar,
  onAssignOrgUnit,
  /**
   * 소속(겸직) 집합 치환 — `(memberId, { unitIds, primaryUnitId }) => void` (PW-368).
   *
   * 스프레드시트 탭의 소속 셀이 이걸 쓴다. 미주입이면 종전처럼 `onAssignOrgUnit`
   * 단일 선택으로 열리는데, 그 경로는 **겸직자의 나머지 소속을 지운다** —
   * 겸직을 다루는 화면이라면 반드시 이 prop 을 준다.
   */
  onChangeAffiliations,
  onCsvUpload,
  /* ⛔ `onManageTeams` 폐기 (PW-576) — 폐기된 시트의 「팀 관리로」 링크가 쓰던 것이다.
     목록 표에는 그 링크가 없고, 조직 편집은 소속 팝업 안내가 가리킨다. */
  /**
   * 매니저(개인 상급자) 배정 (PW-292). `(memberId, managerId) => void`.
   *
   * 미주입이면 미배정 탭의 배정 버튼이 아예 안 뜬다 — 눌러도 아무 일도 안 하는
   * 버튼을 보여줄 이유가 없다(초대 발송과 같은 계약).
   */
  onAssignManager,
  /**
   * 여러 명에게 한 매니저를 일괄 배정 (PW-300, 기획 §3.3). `(memberIds, managerId) => void`.
   *
   * 미주입이면 "일괄 배정" 진입 버튼이 아예 안 뜬다 — 개별 배정만 남는다.
   * 소비자는 **한 번의 저장 호출**로 보내야 한다. 사람 수만큼 요청을 쪼개면 중간에
   * 실패했을 때 어디까지 반영됐는지가 화면과 어긋난다.
   */
  onAssignManagerBulk,
  /**
   * 매니저 후보 `[{ id, label, leadLabel? }]`. 후보 규칙은 소비자가 서버와 맞춰 만든다.
   * `leadLabel` 은 그 후보가 조직장인 조직 경로 — 배정 판단 근거로 후보 행에 병기된다.
   */
  managerCandidates = EMPTY_ARRAY,
  /**
   * 미배정 행의 **주 소속 조직장** `{ [memberId]: { id, name } }` (PW-300).
   *
   * 자기 자신이 그 조직의 조직장인 사람은 소비자가 아예 빼고 넘긴다(자기 상급자 금지,
   * 기획 §3.3) — 캔버스가 그 규칙을 갖고 있으면 조직장 판정이 두 곳으로 갈린다.
   */
  orgLeaderByMember = EMPTY_OBJECT,
  /**
   * 일괄 초대 발송 (PW-114). `(rows) => Promise<{sent, failed[]}>`.
   *
   * 미주입이면 두 진입점의 `+ 구성원 초대` 버튼이 아예 안 뜬다 — 콜백 없이 모달만
   * 열면 design-page 가 데모 모드로 돌아 **보낸 척**을 하게 된다.
   */
  onSendInvites,
  /** `{ limit, remaining }` — null 이면 좌석 조회 실패(발송은 허용, 서버가 최종 방어) */
  seats = null,
  /** `{ jobLevel: [], jobFamily: [], jobTitle: [], workLocation: [] }` — `jobTitle` 은 **직렬** */
  fieldOptions,
  /**
   * 직군 값 → 그 직군의 직렬 값 목록(§1-3-d). 초대 모달이 직렬 Select 를 이 표로
   * 좁히고 직군 미선택 시 잠근다(INV-3 · PW-412). 비면 좁히지 않는다.
   */
  laddersByFamily,
  /** 초대 모달 문구 — i18n 은 소비자(pivit-work)가 소유한다. */
  inviteLabels,
  /** 좌석 부족 배너의 `결제·구독` 이동. */
  onGoBilling,
  /**
   * 협의 단가 **계약** 좌석 안내 (PW-344 ⑤). `accepted` 견적이 있을 때만 채워지고,
   * 정가 플랜은 `null` 이라 계약 표기가 하나도 뜨지 않는다.
   *
   * 🔴 **차단이 아니라 안내다.** 이 값은 어떤 `disabled` 조건에도 들어가지 않는다 —
   * 계약 상한을 넘어도 초대·재직 전환은 그대로 된다. Free 좌석 상한 게이팅
   * (`seats.remaining`)과 경로가 다르다: 협의 계약 고객은 이미 결제 중이고, 초과분은
   * 초과 단가로 청구될 뿐이다. 서버도 계약 상한으로 402 를 내지 않는다.
   *
   * `{ minSeats, maxSeats, overageSeatPrice, seatPrice, activeSeats, billedSeats }`
   */
  contract = null,
  /** 딥링크 `?invite=new` 로 모달이 열린 상태로 진입(§1 URL). */
  initialInviteOpen = false,
  onResendInvite,
  onCancelInvite,
  onCopyInviteLink,
  /* 기록 창 3종(HR 기록 · 연봉 이력 · 대표 확인)의 문구 (PW-576).
     폐기된 스프레드시트가 `sheetLabels` 로 받던 것과 **같은 묶음**이다 — 소비자는
     그때 넘기던 객체를 그대로 넘기면 된다. 창 셋이 시트에서 이 캔버스로 옮겨 왔다. */
  recordLabels,
  canViewSalary = false,
  gradeOptions,
  positionOptions,
  /** 직위·고용형태 카탈로그 — 시트의 두 열로 그대로 내려간다(PW-463).
      빠뜨리면 두 열이 자유 텍스트로 폴백해 목록 뷰와 고를 수 있는 값이 갈린다. */
  rankOptions,
  employmentTypeOptions,
  /** 근무지(국가)·근무 위치(빌딩) 카탈로그 — 시트의 두 열로 그대로 내려간다(PW-503).
      근무 위치는 국가 > 도시 > 빌딩 세 층이고, 도시는 예부터 자유 텍스트 열이다. */
  countryOptions,
  buildingOptions,
  /** 직종·직함 카탈로그 — 시트의 두 열로 그대로 내려간다(PW-502). */
  categoryOptions,
  businessTitleOptions,
  /**
   * 워크스페이스가 켠 선택 적용 항목 — `{ job_category, business_title }` (PW-502).
   *
   * 직종·직함은 **쓰지 않는 회사가 더 많아** 회사가 켜야 나타난다(§2-1-A, 기본 꺼짐).
   * 두 뷰(목록·스프레드시트)에 **같은 값**을 내려 준다 — 한쪽에만 주면 시트에서는
   * 채울 수 있는데 목록에서는 보이지 않는, 설명할 수 없는 상태가 생긴다.
   */
  optionalFields,
  // 직군 > 직렬 > 직무 3단 축 (PW-323). 편집 패널의 3단 연동 select 와 목록 필터가
  // 같은 축을 읽는다. 빠뜨리면 좁히기가 사라지고 자유 텍스트로 폴백한다.
  jobAxis,
  onSaveMembers,
  /* ⛔ `onDeleteMember` 폐기 (PW-576) — 행을 지우는 것은 폐기된 시트에만 있었다.
     목록 행의 파괴적 동작은 «비활성화»(`onDeactivateMember`) 하나다(§3.1 행 액션). */
  /* 일괄 «소속 추가» — `(memberIds, unitIds) => Promise` (PW-373 → PW-576 로 잠시
     사라졌다가 PW-608 로 돌아왔다). 목록 표의 행 체크박스로 여러 명을 고른 뒤
     「일괄 처리」 드롭다운에서 부른다. 서버 계약은 **추가 전용**이라 교체 파라미터가
     없다 — 교체를 허용하면 겸직인 사람의 나머지 소속이 한 번에 사라진다(PW-326).
     미주입이면 드롭다운에 그 항목이 없다. */
  onAppendAffiliations,
  onLoadSalaryHistory,
  onAddSalaryHistory,
  onLoadHrProfile,
  // 시트가 HR 모달을 렌더하므로 여기서 함께 내려줘야 신원 편집이 열린다(PW-25).
  onSaveIdentity,
  /**
   * 개인정보 변경 이력 조회 (PW-460 §2-D). `(memberId, query) => Promise<{items, …}>`.
   * 미주입이면 편집 패널에 「변경 이력」 탭을 그리지 않는다 — 읽을 수 없는 탭을 두면
   * 「비어 있다」로 읽혀 더 나쁘다.
   */
  onLoadPersonalHistory,
  /**
   * 변경 사유를 받아야 할 때 호출부가 세우는 값 — `{ fields, onSubmit, onCancel }`.
   * 🔴 «언제» 필요한지는 서버가 정한다(422). 화면이 대상 필드 목록을 따로 들면 그 목록이
   * 낡는 순간 모달이 안 뜨고 저장만 실패한다.
   */
  changeReasonPrompt = null,
  // 대표(CEO) 지정·해제 — 전체 구성원 탭 시트로 내려간다. 권한이 없으면 미주입.
  onAssignCeo,
  onReleaseCeo,
  // 스쿼드 축(§1-5-b) — 전체 구성원 탭 시트의 별도 컬럼·선택 팝업으로 내려간다.
  // 원장 CRUD 는 조직도 스쿼드 뷰 전용이라 여기로 내려오지 않는다(SQ3).
  squadOptions,
  onChangeSquads,
  // 명부 내보내기 — 탭 A(전체 구성원)에만 둔다. 미배정·초대 탭에는 두지 않는다(E10):
  // 미배정은 탭 A 의 `매니저=미배정` 필터로 같은 결과를 받을 수 있고,
  // 초대는 아직 구성원이 아니라 명부의 대상이 아니다.
  onExportRoster,
  exporting = false,
  exportLabels,
}) {
  /* `recordLabels` 는 기록 창 3종의 문구다 — 폐기된 시트가 `sheetLabels` 로 받던
     묶음이라 소비자가 그것을 그대로 넘길 수 있게 별도 prop 으로 받고, 여기서 한 번만
     합쳐 `labels.records` 로 내려보낸다(PW-576). */
  const labels = useMemo(
    () => merge(merge(DEFAULT_LABELS, providedLabels), recordLabels ? { records: recordLabels } : null),
    [providedLabels, recordLabels],
  );
  // 협의 단가 계약 표기 (PW-344 ⑤). 판정은 표기용이며 **어떤 disabled 조건에도
  // 들어가지 않는다** — 위 prop 주석의 이유 그대로다.
  const contractOverMax =
    Boolean(contract) &&
    contract.maxSeats != null &&
    contract.activeSeats > contract.maxSeats;
  const contractUnderMin =
    Boolean(contract) && contract.activeSeats < contract.minSeats;
  const [tab, setTab] = useState(
    ['members', 'unassigned', 'invites'].includes(initialTab) ? initialTab : 'members',
  );
  // 편집 패널이 열린 구성원 id. 패널은 표 **바깥**에 그린다 — 표 안에 두면 탭을
  // 옮길 때 패널까지 함께 묻힌다.
  const [editMemberId, setEditMemberId] = useState(null);

  /* 목록 표에서 고른 사람 (PW-608).
     🔴 **목록 뷰가 아니라 여기가 정본이다.** 아래에서 `loading` 일 때 그 뷰를 로딩
     문구로 갈아 끼우므로, 뷰 안에 두면 새로고침 한 번에 체크가 말없이 풀린다 —
     소속·매니저를 한 번 고치기만 해도 그 새로고침이 돈다. */
  const [listSelectedIds, setListSelectedIds] = useState(() => new Set());
  /* 대표(CEO) 지정·해제 확인 창 (§3.6-A · PW-576). 행 «⋯» 메뉴가 연다. */
  const [ceoConfirm, setCeoConfirm] = useState(null);
  // 탭 이동도 소비자에게 알린다 — 돌아왔을 때 보던 탭이 그대로여야 한다(PW-157).
  const goTab = (id) => {
    setTab(id);
    onTabChange?.(id);
  };
  /* [PW-114] 초대 발송 모달 — 탭 A `+ 구성원 초대` 와 탭 C `+ 새 초대 발송` 이
     **같은 모달**을 연다. 권한이 없거나 발송 콜백이 없으면 진입점 자체가 없다(§7). */
  const canInvite = canEdit && typeof onSendInvites === 'function';
  const [inviteOpen, setInviteOpen] = useState(initialInviteOpen && canInvite);
  const openInvite = () => setInviteOpen(true);

  const unassignedCount = useMemo(
    () =>
      members.filter(
        (m) =>
          m.employmentStatus !== 'terminated' &&
          // 대표는 조직 최상위라 상급자가 없는 게 정상이다 — 매니저 미배정으로
          // 세면 영원히 사라지지 않는 경고가 된다(정책 §2 / §1-3-c R2).
          (!hasOrgUnit(m) || (!m.managerName && m.isCeo !== true)),
      ).length,
    [members],
  );
  const pendingInviteCount = useMemo(
    () => invites.filter((i) => i.status === 'pending').length,
    [invites],
  );

  const tabs = [
    { id: 'members', label: labels.tabs.members, count: members.length },
    { id: 'unassigned', label: labels.tabs.unassigned, count: unassignedCount, warn: unassignedCount > 0 },
    { id: 'invites', label: labels.tabs.invites, count: pendingInviteCount },
  ];

  return (
    <div className="admin-emp-canvas">
      {/* 협의 단가 계약 좌석 안내 (PW-344 ⑤). 정가 플랜에는 이 배너가 아예 없다. */}
      {contract && (
        <div
          data-testid="employees-contract-banner"
          style={{
            border: `1px solid ${contractOverMax ? '#FDE68A' : '#E2E8F0'}`,
            background: contractOverMax ? '#FFFBEB' : '#F8FAFC',
            borderRadius: 12,
            padding: '11px 14px',
            marginBottom: 12,
            fontSize: 12.5,
            lineHeight: 1.7,
            color: '#0F172A',
          }}
        >
          <span style={{ color: '#64748B' }}>{labels.contract.seatsLabel} </span>
          <b>{labels.contract.seatsValue(contract.minSeats, contract.maxSeats)}</b>
          <span style={{ color: '#64748B' }}> · {labels.contract.billedLabel} </span>
          <b>{labels.contract.billedValue(contract.billedSeats)}</b>
          {contractUnderMin && (
            <span style={{ color: '#94A3B8' }}>
              {' '}
              {labels.contract.underMinReason(contract.minSeats)}
            </span>
          )}
          {/* 🔴 상한 초과는 **경고 줄**이지 차단이 아니다. 배경을 red 로 물들이면
              문구와 무관하게 「막혔다」로 읽히므로 amber 로 둔다. */}
          {contractOverMax && (
            <div style={{ marginTop: 6, color: '#B45309', fontWeight: 600 }}>
              {labels.contract.overMax(
                contract.maxSeats,
                contract.overageSeatPrice ?? contract.seatPrice,
              )}
            </div>
          )}
        </div>
      )}
      <div className="admin-emp-tabbar" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`admin-emp-tab${tab === t.id ? ' is-active' : ''}`}
            onClick={() => goTab(t.id)}
          >
            {t.label}
            <span className={`admin-emp-tab-count${t.warn ? ' is-warn' : ''}${tab === t.id ? ' is-active' : ''}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-emp-loading">{labels.loading}</div>
      ) : tab === 'members' ? (
        <div data-testid="employees-view-list">
            <EmployeesListView
            members={members}
            orgUnits={orgUnits}
            labels={labels}
            canEdit={canEdit}
            pageSize={pageSize}
            renderAvatar={renderAvatar}
            // 직군>직렬>직무 좁히기 — 편집 패널의 3단 연동 select 와 같은 축이다.
            jobAxis={jobAxis}
            canViewSalary={canViewSalary}
            managerCandidates={managerCandidates}
            optCols={listOptCols}
            onOptColsChange={onListOptColsChange}
            leaderUnitIdsByMember={leaderUnitIdsByMember}
            onToggleOrgLeader={canEdit ? onToggleOrgLeader : undefined}
            onChangeAffiliations={onChangeAffiliations}
            onOpenEdit={(m) => setEditMemberId(m.id)}
            onDeactivate={canEdit ? onDeactivateMember : undefined}
            onAssignManager={onAssignManager}
            onInvite={canInvite ? openInvite : undefined}
            onCsvUpload={onCsvUpload}
            // 스쿼드 원장 — 배정 값에 이름이 없어 원장 없이는 열도 필터도 빈다(PW-411).
            squadOptions={squadOptions}
            // 스쿼드 배정 편집(PW-438) — 없으면 스쿼드 칸이 죽은 자리가 된다.
            onChangeSquads={onChangeSquads}
            // 선택 적용 항목(PW-502) — 회사가 켠 것만 열이 선다.
            optionalFields={optionalFields ?? NO_OPTIONAL_FIELDS}
            // 명부 내보내기(PW-411).
            onExportRoster={onExportRoster}
            exporting={exporting}
            exportLabels={exportLabels}
            /* 보던 상태 되살리기 (PW-157) — 시트가 들고 있던 계약이 목록으로 왔다. */
            initialSearch={initialSearch}
            initialFilters={initialFilters ?? EMPTY_OBJECT}
            onViewStateChange={onViewStateChange}
            /* 고른 사람 (PW-608) — 새로고침으로 이 뷰가 사라졌다 다시 생겨도 남는다. */
            selectedIds={listSelectedIds}
            onSelectedIdsChange={setListSelectedIds}
            /* 일괄 «소속 추가» (PW-608) — 미주입이면 「일괄 처리」 드롭다운에 항목이
               없고, 항목이 하나도 없으면 드롭다운 자체가 뜨지 않는다. */
            onAppendAffiliations={canEdit ? onAppendAffiliations : undefined}
            /* 대표 지정 — 두 콜백이 다 있어야 행 메뉴에 항목이 선다(§3.6-A). */
            onOpenCeo={
              canEdit && onAssignCeo && onReleaseCeo
                ? (m, mode) => setCeoConfirm({ row: m, mode })
                : undefined
            }
          />
        </div>
      ) : tab === 'unassigned' ? (
        <UnassignedTab
          members={members}
          orgUnits={orgUnits}
          labels={labels}
          renderAvatar={renderAvatar}
          onAssignOrgUnit={onAssignOrgUnit}
          managerCandidates={managerCandidates}
          onAssignManager={canEdit ? onAssignManager : undefined}
          onAssignManagerBulk={canEdit ? onAssignManagerBulk : undefined}
          orgLeaderByMember={orgLeaderByMember}
        />
      ) : (
        <InvitesTab
          invites={invites}
          labels={labels}
          canEdit={canInvite}
          onOpenInvite={openInvite}
          onResendInvite={onResendInvite}
          onCancelInvite={onCancelInvite}
          onCopyInviteLink={onCopyInviteLink}
        />
      )}

      {/* 목록 뷰의 단건 편집 패널 — 두 뷰 바깥에 그린다(위 hidden 주석 참조).
          `members` 가 갱신되면 그 최신 행으로 다시 찾는다 — 저장 직후 부모가
          재조회하면 옛 객체를 붙들고 있던 패널이 방금 저장한 값을 안 보여준다.
          탭을 옮기면 감춘다 — 미배정·초대 탭 위에 남의 화면의 패널이 떠 있으면 안 된다. */}
      {editMemberId && tab === 'members' && (() => {
        const target = members.find((m) => m.id === editMemberId);
        if (!target) return null;
        return (
          <EmployeesEditPanel
            member={target}
            orgUnits={orgUnits}
            labels={labels}
            canEdit={canEdit}
            renderAvatar={renderAvatar}
            gradeOptions={gradeOptions ?? EMPTY_ARRAY}
            positionOptions={positionOptions ?? EMPTY_ARRAY}
            onClose={() => setEditMemberId(null)}
            onSave={onSaveMembers}
            onChangeAffiliations={onChangeAffiliations}
            /* 재직 상태별 날짜 칸(§3.2.1) — HR 기록 모달과 **같은** 조회·저장 경로다.
               미주입이면(어드민 아님) 그 칸을 아예 그리지 않는다. */
            onLoadHrProfile={onLoadHrProfile}
            onSaveIdentity={onSaveIdentity}
            onLoadPersonalHistory={onLoadPersonalHistory}
            /* PW-576 — 폐기된 시트가 받던 카탈로그·기록 콜백이 그대로 패널로 간다.
               같은 값을 두 화면이 다른 목록으로 고르던 상태가 없어졌으므로, 여기가
               그 값들을 고치는 유일한 자리다. */
            rankOptions={rankOptions ?? EMPTY_ARRAY}
            categoryOptions={categoryOptions ?? EMPTY_ARRAY}
            businessTitleOptions={businessTitleOptions ?? EMPTY_ARRAY}
            employmentTypeOptions={employmentTypeOptions ?? EMPTY_ARRAY}
            countryOptions={countryOptions ?? EMPTY_ARRAY}
            buildingOptions={buildingOptions ?? EMPTY_ARRAY}
            jobAxis={jobAxis}
            optionalFields={optionalFields ?? NO_OPTIONAL_FIELDS}
            canViewSalary={canViewSalary}
            onLoadSalaryHistory={onLoadSalaryHistory}
            onAddSalaryHistory={onAddSalaryHistory}
          />
        );
      })()}

      {/* 변경 사유 모달 — 서버가 「사유가 필요하다」고 답했을 때만 뜬다(§2-D-4). */}
      {changeReasonPrompt && (
        <ChangeReasonModal prompt={changeReasonPrompt} labels={labels} />
      )}

      {/* 초대 발송 모달 — 탭 A·탭 C 두 진입점이 **공유**한다(§1).
          직급 선택지는 캔버스가 이미 받는 `gradeOptions` 를 기본으로 쓰고,
          직군·직렬·근무지는 `fieldOptions` 로, 직군↔직렬 매핑은 `laddersByFamily`
          로 받는다(직렬 2단 연동 · PW-412). */}
      {/* 대표 지정·해제 확인 창 — 폐기된 시트에서 옮겨 온 그대로다(PW-576 · §3.6-A).
          실패해도 닫지 않고 창 안에 사유를 띄운다. */}
      {ceoConfirm && onAssignCeo && onReleaseCeo && (
        <CeoConfirmModal
          row={ceoConfirm.row}
          mode={ceoConfirm.mode}
          currentCeoName={members.find((m) => m.isCeo && m.id !== ceoConfirm.row.id)?.name}
          labels={labels.records}
          positionOptions={positionOptions ?? EMPTY_ARRAY}
          onConfirm={(opts) =>
            ceoConfirm.mode === 'assign'
              ? onAssignCeo(ceoConfirm.row.id, opts)
              : onReleaseCeo(ceoConfirm.row.id)
          }
          onClose={() => setCeoConfirm(null)}
        />
      )}

      {inviteOpen && canInvite && (
        <AdminInviteModal
          open
          onClose={() => setInviteOpen(false)}
          onSend={onSendInvites}
          orgUnits={orgUnits}
          existingEmails={members
            .filter((m) => m.employmentStatus !== 'terminated')
            .map((m) => m.email)
            .filter(Boolean)}
          pendingEmails={invites
            .filter((i) => i.status === 'pending')
            .map((i) => i.email)
            .filter(Boolean)}
          seats={seats}
          fieldOptions={{
            jobLevel: gradeOptions ?? [],
            ...(fieldOptions || {}),
          }}
          laddersByFamily={laddersByFamily}
          onGoBilling={onGoBilling}
          labels={inviteLabels}
        />
      )}
    </div>
  );
}
