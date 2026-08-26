import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { nameFontSize, nameInitials } from '../shared/nameInitials.js';
import DatePicker from '../shared/DatePicker.jsx';
import OrgTreePicker, { OrgPathLabel } from './OrgTreePicker.jsx';
import SquadPicker, { SquadCell, isVisibleSquadStatus } from './SquadPicker.jsx';
import { buildOrgTree, findOrgEntry, primaryOrgEntry, matchesOrgSubtree, ORG_FILTER_UNASSIGNED } from './orgTree.js';
// 직군>직렬>직무 좁히기는 목록 뷰 필터 칩도 쓴다 — 공용 모듈이 한 벌이다(PW-400).
import { narrowByParent } from './jobAxis.js';
/* 명부 내보내기 부품은 목록 뷰와 **공유**한다(PW-411). 여기 로컬 함수로 두면 목록
   뷰에서 쓸 수 없어, 두 뷰를 동시에 마운트하는 구조에서 감춘 쪽 버튼이 눌리게 된다. */
import { ExportMenu, SalaryExportModal, IconLock } from './employeeExport.jsx';
import { buildExportItems } from './employeeExportItems.js';

/**
 * AdminEmployeeSheetCanvas — 어드민 "직원 일괄 편집(스프레드시트)" 화면 Pure 컴포넌트.
 * pivit-specs 의 J. Admin_관리자/admin-employee-inline-edit.jsx 시안을 design-page
 * 정본으로 포팅한 것.
 *
 * 엑셀처럼 셀을 클릭해 인라인 편집하고(Tab 으로 칸 이동, Enter 로 편집 종료,
 * 변경 셀 앰버 하이라이트),
 * 체크박스로 여러 명을 선택해 "일괄 편집 바"로 여러 필드를 한 번에 적용한다.
 * 모든 변경은 클라이언트 dirty 추적 → "변경 저장" 1클릭에 onSaveMembers 로 전송.
 *
 * 시안 대비 차이 (pivit-work 데이터 모델에 맞춤):
 *  - 권한(role) 은 읽기 전용 배지 — 권한 변경은 RBAC 화면 소관.
 *  - 매니저(managerId) 는 **직접 배정하는 값**이다 — 후보를 고르는 select 컬럼.
 *    조직장 자리와는 별개 축이라 어느 쪽도 다른 쪽을 파생시키지 않는다(PW-292).
 *    대표 행만 예외로 배정할 수 없다(조직 최상위는 상급자를 가질 수 없다).
 *    `managerName` 만 있고 `managerId` 가 없는 행은 CSV `상급자_사번` 폴백이라
 *    **배정이 아니다** — 셀과 드롭다운 양쪽에서 그 사실을 표기한다(PW-314).
 *  - 상태는 백엔드 employmentStatus enum(active/on_leave/terminated) 을 쓴다.
 *  - 연봉(salary) 은 canViewSalary=true(=org_admin) 일 때만 표시·편집.
 *  - 어드민 사이드 레일/브레드크럼은 앱 셸이 제공하므로 제거, content-area 안에 들어간다.
 *
 * 모든 데이터·라벨은 props 로 받는다 (page wrapper 가 fetch·매핑·i18n·persist 소유).
 * UI 상태(편집/선택/필터/일괄바/연봉이력 모달)만 내부에서 관리한다.
 */

const T = {
  font: "'Pretendard','Noto Sans KR',sans-serif",
  mono: "'DM Mono',monospace",
  bg: '#F8FAFC',
  card: '#fff',
  border: '#E2E8F0',
  bl: '#F1F5F9',
  text: '#0F172A',
  sub: '#64748B',
  muted: '#94A3B8',
  accent: '#4F6AF5',
};

const ROLE_META = {
  admin: { label: '어드민', color: '#4338CA', bg: '#EEF2FF', bd: '#C7D2FE' },
  manager: { label: '매니저', color: '#16A34A', bg: '#F0FDF4', bd: '#BBF7D0' },
  member: { label: '멤버', color: '#D97706', bg: '#FFFBEB', bd: '#FDE68A' },
};

// 백엔드 employmentStatus enum 기반. 표에 없는 값이 오면 「기타」로 그린다(PW-422) —
// 예전에는 `m.label || value` 로 폴백해 화면에 `probation`·`other` 같은 코드값이 샜다.
const STATUS_META = {
  active: { label: '재직중', color: '#16A34A', bg: '#F0FDF4', dot: '#22C55E' },
  probation: { label: '수습', color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  on_leave: { label: '휴직', color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  terminated: { label: '퇴사', color: '#94A3B8', bg: '#F8FAFC', dot: '#CBD5E1' },
  pending: { label: '대기', color: '#2563EB', bg: '#EFF6FF', dot: '#60A5FA' },
  other: { label: '기타', color: '#94A3B8', bg: '#F8FAFC', dot: '#CBD5E1' },
};
/** 알 수 없는 값도 사람이 읽는 라벨로 떨어뜨린다 — 코드값을 화면에 흘리지 않는다. */
const statusMeta = (v) => STATUS_META[v] || STATUS_META.other;
// 사람이 **고르는** 값은 §3.2.1 의 4종뿐이다. `pending`(가입 대기)은 초대 관리 소관이고
// `other` 는 마이그레이션 잔여라 선택지가 아니다 — 둘 다 위 표에는 남아 표시는 된다.
const STATUS_OPTIONS = ['active', 'probation', 'on_leave', 'terminated'];

/* 매니저 배정 여부 필터의 값(PW-300). 사람 id 와 절대 겹치지 않도록 `__`로 감싼다 —
   소비자가 이 값을 URL·저장 상태에 그대로 싣기 때문에(PW-157) 실제 id 와 구분돼야 한다. */
export const MANAGER_FILTER_ASSIGNED = '__manager_assigned__';
export const MANAGER_FILTER_UNASSIGNED = '__manager_unassigned__';
// 권한 옵션 — admin 승격은 백엔드가 막지만(초대로만), 기존 어드민 표시를 위해 3종 노출.
const ROLE_OPTIONS = ['admin', 'manager', 'member'];

// select 셀·일괄바의 옵션 라벨(권한=ROLE_META, 상태=STATUS_META).
//
// 컬럼이 `optionLabels`(값 → 라벨)를 들고 오면 그걸 먼저 쓴다. 매니저 컬럼처럼 옵션이
// 조직 데이터에서 오는 경우 — 값은 사용자 id, 화면은 이름 — 모듈 상수로는 라벨을 만들
// 수 없기 때문이다. 라벨이 없으면 원본 값을 그대로 두지 않고 '—' 로 — id 나 코드값이
// 화면에 새는 것을 막는다.
function optionLabel(col, o) {
  // 값을 비우는 선택지(직군·직렬·직무처럼 지울 수 있어야 하는 컬럼)의 라벨.
  // `optionLabels` 는 값 목록이 고정된 컬럼(권한·상태)용이라, 워크스페이스가
  // 등록하는 값에는 쓸 수 없다 — 표에 없는 값이 전부 '—' 로 뭉개진다.
  if (o === '' && typeof col === 'object' && col?.emptyLabel) return col.emptyLabel;
  const colId = typeof col === 'string' ? col : col?.id;
  const labels = typeof col === 'string' ? null : col?.optionLabels;
  if (labels) return labels[o] ?? (o === '' ? labels[''] ?? '—' : '—');
  if (colId === 'orgRole') return ROLE_META[o]?.label || o;
  return STATUS_META[o]?.label || o;
}

const fmtKRW = (v) => {
  if (v === '' || v === null || v === undefined) return '—';
  const n = Number(String(v).replace(/[^0-9]/g, ''));
  return Number.isFinite(n) && n > 0 ? '₩' + n.toLocaleString('ko-KR') : '—';
};

function initials(name) {
  // 한글 이름은 전체를 보인다(PW-24) — '서동현' 을 '서동' 으로 자르지 않는다.
  return nameInitials(name) || '??';
}
function avatarColor(seed) {
  const colors = ['#4F6AF5', '#22C55E', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6', '#EF4444', '#0EA5E9', '#F97316'];
  const idx = (String(seed || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % colors.length;
  return colors[idx];
}

// dirty 추적·패치 대상이 되는 편집 가능 필드(백엔드 UpdateUserDto 매핑).
const EDITABLE_FIELDS = ['name', 'nickname', 'displayName', 'email', 'phone', 'employeeCode', 'department', 'jobLevel', 'jobRank', 'jobPosition', 'jobFamily', 'jobTitle', 'jobDuty', 'employmentType', 'workLocation', 'orgRole', 'employmentStatus', 'managerId', 'hireDate', 'terminationDate', 'salary', 'education'];

/**
 * 기본값으로 쓰는 **고정 빈 배열**.
 *
 * `prop = []` 로 두면 렌더마다 새 배열이 만들어져, 그 prop 에 걸린 useMemo 가 전부
 * 매 렌더 다시 돈다(컬럼 정의·필터 옵션·인덱스 맵). 이 시트는 수백 행을 그리는
 * 화면이라 그 비용이 눈에 띈다.
 */
const NO_SQUADS = [];

/** `initialFilters` 기본값 — NO_SQUADS 와 같은 이유로 고정 객체다. */
const EMPTY_FILTERS = {};

/** 직군>직렬>직무 축의 기본값 — 같은 이유로 고정 객체다. */
const EMPTY_JOB_AXIS = {
  families: [], ladders: [], duties: [], laddersByFamily: {}, dutiesByLadder: {},
};


/* 가로 스크롤 어포던스(PW-137)의 화살표. 이모지(→ ▶)가 아니라 인라인 SVG 다. */
function IconArrowRight({ size = 12 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

/**
 * 스크롤 컨테이너의 가로 여유 추적 — "왼쪽/오른쪽에 더 있다"를 화면에 알리기 위한 상태.
 *
 * PW-137: 표(≈2,180px)가 화면(≈1,150px)보다 훨씬 넓은데 알리는 표시가 하나도 없어,
 * 어드민이 연봉 이력(₩)·HR 버튼의 존재 자체를 모른 채 지나갔다. macOS 는 오버레이
 * 스크롤바라 실제로 밀기 전까지 스크롤바도 안 보인다.
 *
 * scroll 이벤트만으로는 부족하다 — 컬럼 구성(연봉 권한·스쿼드 유무)이나 창 크기가
 * 바뀌면 스크롤 없이도 여유가 생기고 사라진다. ResizeObserver 로 컨테이너와 표
 * 양쪽의 크기 변화까지 본다.
 */
function useHorizontalScrollEdges(ref, layoutKey) {
  const [edges, setEdges] = useState({ left: false, right: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      // 소수점 폭 때문에 끝까지 밀어도 1px 이 남는다 — 1px 여유를 둬야 끝에서 꺼진다.
      const next = { left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 };
      setEdges((prev) => (prev.left === next.left && prev.right === next.right ? prev : next));
    };
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (ro) {
      ro.observe(el);
      if (el.firstElementChild) ro.observe(el.firstElementChild);
    }
    return () => {
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
    };
  }, [ref, layoutKey]);
  return edges;
}

/**
 * 표 상자를 **뷰포트 높이에 맞춰 자른다** (PW-463).
 *
 * 🔴 이 화면의 원래 제보가 「아래쪽에 옆으로 지나가는 스크롤이 있는데 안 보인다」였다.
 *    막대가 없는 게 아니라 **표 맨 아래에 있는데 표가 화면보다 훨씬 길어서** 화면 밖에
 *    남는 것이다 — 구성원 140명이면 표 아래 끝이 화면에서 6,000px 넘게 밑이다.
 *    상자 높이를 잘라 두면 가로 막대가 늘 상자 바닥, 즉 화면 안에 있다.
 *
 * 쪽 나누기로 풀지 않는다 — 맨 위 체크박스가 「걸러진 행 전체」를 고르는 규칙이라
 * (`screen-admin-employees-spreadsheet.policy.md §6`), 쪽을 나누면 일괄 편집의 선택
 * 단위가 사람 수와 어긋난다.
 *
 * 빼는 값을 상수로 박지 않고 **상자의 실제 화면 위치를 재서** 정한다 — 이 화면의 툴바는
 * 필터 칩이 12개라 창 너비에 따라 한 줄이 되기도 두 줄이 되기도 한다. 상수로 잡으면
 * 한쪽 너비에서는 상자가 화면보다 길어져 증상이 그대로 돌아온다.
 * 잴 수 없는 환경(jsdom·초기 렌더)에서는 `null` 을 돌려 높이 제한을 걸지 않는다.
 */
function useViewportBoundedHeight(ref, bottomGap, layoutKey) {
  const [maxHeight, setMaxHeight] = useState(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return undefined;
    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const vh = window.innerHeight || 0;
      if (!vh || !Number.isFinite(top)) return;
      // 상자가 화면 위쪽에 붙어 있을 때(=페이지를 안 내린 상태) 남는 높이.
      const next = Math.max(MIN_SHEET_BOX_H, Math.round(vh - top - bottomGap));
      setMaxHeight((prev) => (prev === next ? prev : next));
    };
    measure();
    window.addEventListener('resize', measure);
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (ro && el.parentElement) ro.observe(el.parentElement);
    return () => {
      window.removeEventListener('resize', measure);
      if (ro) ro.disconnect();
    };
  }, [ref, bottomGap, layoutKey]);
  return maxHeight;
}

/** 상자가 이보다 낮아지면 표를 읽을 수 없다 — 그때는 페이지가 세로로 밀리는 편이 낫다. */
const MIN_SHEET_BOX_H = 260;
/** 상자 아래 남겨 둘 여백 — 카드 패딩 + 가로 막대 두께. 브라우저 실측값이다. */
const SHEET_BOX_BOTTOM_GAP = 28;

/**
 * 연봉(이력) 아이콘. 통화 글리프 `₩` 를 아이콘 자리에 쓰면 폰트에 따라 굵기·폭이
 * 달라지고 fontSize 로만 크기가 정해져 옆 아이콘과 광학 크기가 안 맞는다.
 * 지폐 도형으로 그려 다른 인라인 SVG 와 같은 24 그리드·같은 stroke 를 쓴다.
 */
export function IconSalary({ size = 14 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ display: 'block', flexShrink: 0 }}
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01" />
      <path d="M18 12h.01" />
    </svg>
  );
}

/** 일괄 적용 완료 표시. `✓`(U+2713) 는 폰트마다 굵기가 달라 배지 안에서 튄다. */
export function IconCheck({ size = 13 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** 더하기. `+` 글리프는 폰트마다 두께·수직 중심이 달라 버튼 라벨 옆에서 흔들린다. */
export function IconPlusSmall({ size = 12 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

/** 모달 닫기. `✕`(U+2715) 는 폰트마다 두께·중심이 달라 버튼 안에서 흔들린다. */
export function IconClose({ size = 16 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

// members prop → 내부 편집 row 로 매핑(빈 값 정규화).
function mapMembers(list) {
  return (list || []).map((m) => ({
    id: m.id,
    name: m.name ?? '',
    nickname: m.nickname ?? '',
    displayName: m.displayName ?? '',
    email: m.email ?? '',
    phone: m.phone ?? '',
    /* 사번·직위·고용형태 — 목록 뷰에만 있던 세 열이다(PW-400 → PW-463).
       한 메뉴 안의 두 보기가 서로 다른 값을 보여주면 어느 쪽이 맞는지 화면이
       말해 주지 못한다(`admin-spec.md §3.8` 「데이터 계약은 두 뷰가 같다」). */
    employeeCode: m.employeeCode ?? '',
    department: m.department ?? '',
    // 겸직(중복 소속) — 소속 셀은 행을 복제하지 않고 칩을 세로로 쌓는다(PW-111).
    // 행을 복제하면 ① 체크박스 선택·일괄 저장·페이지네이션의 단위가 사람 수와
    // 어긋나고 ② 어느 행을 지워야 하는지 모호해진다.
    // 형태: [{ name, isPrimary, orgUnitId? }] — 주 소속이 맨 앞.
    // orgUnitId 가 있으면 칩을 **전체 조직 경로**로 그린다(PW-112).
    //
    // 🔴 `depts` 를 배열로 주면 **빈 배열도 그대로 존중**한다 — 「소속 없음」이다(MC8).
    // 예전엔 빈 배열도 `department` 텍스트로 폴백해서, 소속을 뗀 사람의 셀에 옛 팀
    // 이름이 남았다(미배정 탭·조직도는 미배정인데 이 셀만 팀 이름, PW-368).
    // 조직 단위를 쓰는지 아는 것은 호출부뿐이라, 판정을 여기서 대신하지 않는다.
    // `depts` 를 아예 안 주는 호출부(데모·옛 화면)에만 텍스트 부서가 폴백이다.
    depts: Array.isArray(m.depts)
      ? m.depts
      : m.department
        ? [{ name: m.department, isPrimary: true }]
        : [],
    // 소속 조직 단위 id — 소속 경로 표기·서브트리 필터의 정본(PW-112).
    // 편집 대상 컬럼이 아니므로 EDITABLE_FIELDS 에 넣지 않는다(dirty 추적 제외).
    orgUnitIds: Array.isArray(m.orgUnitIds) ? m.orgUnitIds.map(String) : [],
    // 스쿼드 배정 — [{ squadId, isLead }]. 소속(기능조직)과 **다른 축**이라 별도 컬럼이다(SQ1).
    // 시트의 일괄 저장(dirty → patch)이 아니라 즉시 반영 경로를 타므로 EDITABLE_FIELDS 밖이다:
    // 배정은 사람 컬럼 patch 가 아니라 `SquadMember` 행의 생성·삭제·리드 교체다.
    squads: Array.isArray(m.squads)
      ? m.squads.map((s) => ({ squadId: String(s.squadId), isLead: s.isLead === true }))
      : [],
    jobLevel: m.jobLevel ?? '',
    /** 직위 — 국내식 호칭(과장). 직급(`jobLevel` = Senior)과 **별개 축**이다(§1-3-g). */
    jobRank: m.jobRank ?? '',
    jobPosition: m.jobPosition ?? '',
    // 직군 > 직렬 > 직무 3단 (arch-core-data-model §1-3-a 7·8·19).
    // ⚠ `jobTitle` 은 직무가 아니라 **직렬**이다(2026-08-10 M5-b, 키 이름만 남았다).
    jobFamily: m.jobFamily ?? '',
    jobTitle: m.jobTitle ?? '',
    jobDuty: m.jobDuty ?? '',
    /** 고용형태 — 정규직·계약직. 재직상태(`employmentStatus`)와 다른 축이다. */
    employmentType: m.employmentType ?? '',
    workLocation: m.workLocation ?? '',
    orgRole: m.orgRole ?? 'member',
    // 대표 여부는 편집 대상 컬럼이 아니라 행 상태다 — dirty 추적에 끼지 않도록
    // COLUMNS 에 넣지 않고 행에만 실어둔다.
    isCeo: m.isCeo === true,
    employmentStatus: m.employmentStatus ?? 'active',
    // 매니저는 id 로 편집한다 — 이름은 동명이인이 있으면 사람을 특정하지 못한다.
    // managerName 은 후보 목록에 없는 사람(퇴사한 옛 상급자·CSV 상급자_사번 폴백)을
    // 표시하기 위한 읽기 전용 보조값이다.
    managerId: m.managerId ?? '',
    managerName: m.managerName ?? '',
    hireDate: m.hireDate ?? '',
    terminationDate: m.terminationDate ?? '',
    salary: m.salary ?? '',
    education: m.education ?? '',
  }));
}

// ── 인라인 편집 셀 ──────────────────────────────────────
function EditCell({ col, row, value, onChange, onKeyDown, autoFocus }) {
  const ref = useRef(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const base = {
    width: '100%',
    height: '100%',
    padding: '0 10px',
    border: 'none',
    outline: 'none',
    fontFamily: T.font,
    fontSize: 12,
    color: T.text,
    background: '#fff',
  };

  if (col.type === 'select') {
    /* 옵션이 **행에 따라 다른** 컬럼(직렬·직무)은 그 행의 상위 값으로 좁힌 목록을
       쓴다(§1-3-d · §1-3-j). 좁히기가 없는 컬럼은 종전처럼 컬럼 목록 그대로다. */
    const colOptions = col.optionsForRow ? col.optionsForRow(row) : col.options;
    // 현재 값이 옵션에 없으면(카탈로그에 없는 기존/커스텀 값, 나중에 매핑이 끊긴 값)
    // 보존해 첫 옵션으로 노출한다 — 셀을 여는 것만으로 값을 잃으면 안 된다.
    let opts =
      value && !colOptions.includes(value) ? [value, ...colOptions] : colOptions;
    // 자기 자신은 자기 매니저가 될 수 없다 — 후보 목록은 컬럼 단위라 여기서 뺀다.
    // 서버도 거부하지만(409), 고를 수 있게 두면 저장 후에야 실패를 알게 된다.
    if (col.excludeSelf && row?.id) opts = opts.filter((o) => o !== row.id);
    // 「미배정」 인데 표에는 이름이 보이는 행(CSV 상급자_사번 폴백, PW-314)은 빈 옵션
    // 라벨에 그 이름을 함께 적는다. 그냥 「미배정」 이면 값이 지워진 것으로 읽힌다.
    const derivedName =
      col.id === 'managerId' && !row?.managerId && row?.managerName
        ? row.managerName
        : null;
    return (
      <select ref={ref} value={value ?? ''} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} style={{ ...base, cursor: 'pointer' }}>
        {opts.map((o) => (
          <option key={o} value={o}>
            {o === '' && derivedName
              ? (col.unassignedDerivedLabel || '미배정 (CSV 상급자: {name})').replace('{name}', derivedName)
              : optionLabel(col, o)}
          </option>
        ))}
      </select>
    );
  }
  if (col.type === 'date') {
    return <input ref={ref} type="date" value={value ?? ''} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} style={{ ...base, padding: '0 8px' }} />;
  }
  if (col.type === 'currency') {
    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={value ?? ''}
        autoFocus={autoFocus}
        placeholder="미입력"
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        onKeyDown={onKeyDown}
        style={{ ...base, textAlign: 'right', padding: '0 10px' }}
      />
    );
  }
  return <input ref={ref} type="text" value={value ?? ''} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} style={base} />;
}

/* ── 대표(CEO) ────────────────────────────────────────────
 * 왕관은 이모지(👑)가 아니라 인라인 SVG 다 — OS·폰트마다 모양이 달라지고
 * color 를 상속하지 않아 배지 안에서 혼자 튄다.
 * ---------------------------------------------------------- */
export function IconCrown({ size = 13 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M3 7l4.5 4L12 4l4.5 7L21 7l-1.8 11H4.8L3 7Z" />
    </svg>
  );
}

/**
 * 이름 옆 대표 배지. `isCeo` 하나만 근거로 삼는다 — 권한이 대표(superuser)라거나
 * 직책 문자열이 '대표'라는 것만으로는 붙지 않는다(정책 §2).
 * 라벨은 로케일에 따라 '대표'(2자)↔'CEO' 로 길이가 흔들리므로 고정폭을 주지 않고
 * 안쪽 패딩 + nowrap 으로 감싼다.
 */
function CeoBadge({ label }) {
  return (
    <span
      title={label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0,
        boxSizing: 'border-box', padding: '1px 6px 1px 4px', borderRadius: 99,
        background: '#FFFBEB', border: '1px solid #FDE68A', color: '#B45309',
        fontSize: 10, fontWeight: 700, lineHeight: 1.5, whiteSpace: 'nowrap',
      }}
    >
      <IconCrown size={11} />
      {label}
    </span>
  );
}

/* ── 직접 지정이 아닌 매니저 이름 (PW-314) ───────────────
 * CSV 임포트의 `상급자_사번` 을 풀어 만든 **표시 전용** 이름을 그린다.
 * 정본은 `users.managerId` 이고 이 이름은 아직 배정이 아니므로, 이름만 그리면
 * 셀을 열었을 때의 「미배정」 과 어긋나 값이 지워진 것처럼 읽힌다.
 *
 * 구분은 색만으로 하지 않는다 — 톤을 낮추는 동시에 아이콘을 붙이고, 문장은
 * `title` 로 준다(호버·스크린리더 양쪽에서 읽힌다). 아이콘은 이모지가 아니라
 * `currentColor` 를 상속하는 인라인 SVG 라 감싼 요소의 톤을 그대로 따른다.
 *
 * 폭 140px 안에서 이름 길이가 흔들려도(로케일·긴 이름) 아이콘이 밀려나지
 * 않도록 이름만 줄이고 아이콘은 `flexShrink: 0` 으로 고정한다.
 * ---------------------------------------------------------- */
function IconInfo({ size = 12 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ display: 'block', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function DerivedManagerCell({ name, hint }) {
  const title = hint
    ? hint.replace('{name}', name)
    : `${name} — CSV 상급자_사번에서 온 이름입니다. 아직 매니저로 배정되지 않았습니다.`;
  return (
    <span
      title={title}
      aria-label={title}
      data-manager-derived="true"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%',
        fontSize: 12, color: T.muted,
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      <IconInfo size={12} />
    </span>
  );
}

// ── 셀 렌더 (읽기) ──────────────────────────────────────
/**
 * 소속 셀 — 겸직자는 **행을 늘리지 않고 이 셀만 늘어난다**(PW-111).
 *
 * 주 소속에 `주` 배지를 달고, 겸직이 있으면 마지막에 `겸직 N` 을 붙여 이 사람이
 * 몇 군데에 걸쳐 있는지 셀 안에서 바로 읽히게 한다. 나머지 열은 `verticalAlign: top`
 * 이라 값이 첫 줄에 정렬돼 "소속 셀만 두꺼워지는" 형태가 된다.
 *
 * 각 칩은 팀명이 아니라 **전체 조직 경로**로 그린다(PW-112, §5-A P4) — 팀명만으로는
 * 어느 본부 밑인지도, 동명이팀 중 어느 쪽인지도 알 수 없다.
 */
function DeptCell({ depts, primaryLabel, concurrentLabel, orgTree = [], orgUnitIds, maxWidth }) {
  if (!depts || depts.length === 0) {
    return <span style={{ fontSize: 12, color: T.muted }}>—</span>;
  }
  const concurrentCount = depts.filter((d) => !d.isPrimary).length;
  // 칩 하나의 조직 경로. id 가 붙어 있으면 그걸로, 아니면 소속이 하나뿐인 흔한 경우에
  // 한해 행의 orgUnitIds 로 해석한다 — 이름만으로 찾으면 동명이팀에서 틀린다.
  const chipEntry = (d, i) => {
    if (!orgTree.length) return null;
    if (d.orgUnitId) return findOrgEntry(orgTree, d.orgUnitId);
    if (depts.length === 1 && i === 0) return primaryOrgEntry(orgTree, orgUnitIds);
    return null;
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 0', minWidth: 0 }}>
      {depts.map((d, i) => (
        <span
          key={`${d.name}-${i}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            minWidth: 0,
            fontSize: 12,
            color: d.isPrimary ? T.text : T.sub,
            fontWeight: d.isPrimary ? 600 : 400,
          }}
        >
          {/* 경로를 알면 상위는 회색·최하위만 본문 색, 모르면 종전대로 팀명만 접어서 보인다. */}
          {(() => {
            const entry = chipEntry(d, i);
            return entry
              ? <OrgPathLabel entry={entry} muted={T.muted} color="inherit" maxWidth={maxWidth} />
              : <span style={{ overflowWrap: 'anywhere' }}>{d.name}</span>;
          })()}
          {d.isPrimary && depts.length > 1 && (
            <span
              style={{
                flexShrink: 0,
                fontSize: 9,
                fontWeight: 700,
                lineHeight: 1.4,
                padding: '0 4px',
                borderRadius: 3,
                background: T.bl,
                border: `1px solid ${T.border}`,
                color: T.sub,
              }}
            >
              {primaryLabel || '주'}
            </span>
          )}
        </span>
      ))}
      {concurrentCount > 0 && (
        <span style={{ fontSize: 10, color: T.muted }}>
          {(concurrentLabel || '겸직 {count}').replace('{count}', String(concurrentCount))}
        </span>
      )}
    </div>
  );
}

function CellDisplay({ col, row, renderAvatar, ceoLabel, ceoNoManagerHint, managerFallbackHint, primaryLabel, concurrentLabel, orgTree, squadOptions, squadLabels, onOpenSquads, canEditSquads }) {
  const value = row[col.id];
  if (col.squadCell) {
    return (
      <SquadCell
        squads={squadOptions}
        assignments={row.squads}
        statusLabels={squadLabels}
        closedLabel={squadLabels.closedCount}
        onOpen={onOpenSquads}
        canEdit={canEditSquads}
      />
    );
  }
  if (col.id === 'department') {
    return (
      <DeptCell
        depts={row.depts}
        primaryLabel={primaryLabel}
        concurrentLabel={concurrentLabel}
        orgTree={orgTree}
        orgUnitIds={row.orgUnitIds}
        // 컬럼 폭을 넘기면 앞(상위 경로)부터 생략한다 — 5depth 조직이 컬럼을 밀어내지 않도록.
        maxWidth={col.width}
      />
    );
  }
  if (col.id === 'name') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        {renderAvatar ? (
          renderAvatar(row, 24)
        ) : (
          <div style={{ width: 24, height: 24, borderRadius: 6, background: avatarColor(row.id || value), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: nameFontSize(initials(value), 24, 0.38), fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>{initials(value)}</div>
        )}
        <span style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '—'}</span>
        {row.isCeo && <CeoBadge label={ceoLabel || '대표'} />}
      </div>
    );
  }
  // 대표는 조직 최상위라 상급자가 없다 — 값이 남아 있어도 매니저 칸은 '—' 로 비우고
  // 이유를 툴팁으로 알린다(정책 §2). 대표 행은 편집 표면도 열리지 않는다.
  if (col.id === 'managerId' && row.isCeo) {
    return (
      <span title={ceoNoManagerHint || '조직 최상위 — 상급자를 가질 수 없습니다'} style={{ fontSize: 12, color: T.muted }}>
        —
      </span>
    );
  }
  // 매니저 칸은 id 를 담고 있으므로 반드시 이름으로 바꿔 그린다 — 그대로 두면 uuid 가
  // 화면에 노출된다. 후보 목록에 없는 상급자(퇴사자·CSV 상급자_사번 폴백)는 컬럼
  // 라벨맵에 없으므로 행이 들고 있는 `managerName` 으로 표시한다.
  //
  // 🔴 이름이 보인다고 다 배정된 게 아니다(PW-314). `managerId` 없이 `managerName`
  // 만 있는 행은 CSV 임포트의 `상급자_사번` 을 사번→이름으로 푼 **표시 전용 폴백**이다.
  // 표식 없이 그냥 이름만 그리면, 셀을 열었을 때 드롭다운이 「미배정」 인 것을 보고
  // "값이 지워졌다" 로 읽는다 — 실제로 그 제보로 이 티켓이 열렸다.
  if (col.id === 'managerId') {
    const label = value ? col.optionLabels?.[value] || row.managerName : row.managerName;
    if (!value && label) {
      return <DerivedManagerCell name={label} hint={managerFallbackHint} />;
    }
    return (
      <span style={{ fontSize: 12, color: label ? T.text : T.muted }}>{label || '—'}</span>
    );
  }
  if (col.id === 'orgRole') {
    const m = ROLE_META[value] || {};
    return (
      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: m.bg || T.bl, border: `1px solid ${m.bd || T.border}`, color: m.color || T.sub }}>{m.label || value || '—'}</span>
    );
  }
  if (col.id === 'employmentStatus') {
    if (!value) return <span style={{ fontSize: 12, color: T.muted }}>—</span>;
    const m = statusMeta(value);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: m.color, fontWeight: 600 }}>{m.label}</span>
      </div>
    );
  }
  if (col.type === 'currency') {
    const has = value !== '' && value !== null && value !== undefined;
    return <span style={{ fontSize: 12, fontWeight: has ? 600 : 400, color: has ? T.text : T.muted, fontVariantNumeric: 'tabular-nums' }}>{fmtKRW(value)}</span>;
  }
  return <span style={{ fontSize: 12, color: value ? T.text : T.muted }}>{value || '—'}</span>;
}

// ── 검색 가능한 필터 드롭다운 ───────────────────────────────
// OrgUnitPicker/tm-add-member 패턴(검색 input + 필터된 버튼 리스트 + 바깥 클릭 닫기)을
// 시트 톤(T 토큰)으로 옮긴 것. 컬럼별로 재사용.
function FilterMenu({ testId, label, value, options, onChange, allLabel, searchPlaceholder, noResult }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  const active = value && value !== '__all__';
  // 선택된 값의 칩 표기는 전체 경로(pathLabel)를 쓴다 — 동명이팀을 구분해야 한다(§5-A P4).
  const selectedOpt = options.find((o) => o.value === value);
  const selectedLabel = active ? (selectedOpt?.pathLabel ?? selectedOpt?.label ?? value) : allLabel;
  const ql = q.trim().toLowerCase();
  const shown = ql
    ? options.filter((o) => (o.pathLabel ?? o.label).toLowerCase().includes(ql))
    : options;
  const pick = (v) => { onChange(v); setOpen(false); setQ(''); };
  const optBtn = (selected) => ({
    textAlign: 'left', padding: '7px 9px', borderRadius: 7, border: 'none',
    background: selected ? '#EEF2FF' : 'transparent', color: selected ? T.accent : T.text,
    fontSize: 12, fontFamily: T.font, cursor: 'pointer', fontWeight: selected ? 700 : 500, whiteSpace: 'nowrap',
  });
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        data-testid={testId}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 9,
          border: `1px solid ${active ? T.accent : T.border}`, fontSize: 12, fontFamily: T.font,
          background: active ? '#EEF2FF' : T.card, color: active ? T.accent : T.text, cursor: 'pointer', outline: 'none',
        }}
      >
        <span style={{ color: active ? T.accent : T.sub }}>{label}</span>
        <span style={{ fontWeight: 700 }}>{selectedLabel}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.7 }}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50, minWidth: 190, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, boxShadow: '0 12px 32px -8px rgba(15,23,42,.24)', padding: 6 }}>
          <div style={{ position: 'relative', marginBottom: 4 }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="9" cy="9" r="6" stroke={T.muted} strokeWidth="1.8" />
              <path d="M13.5 13.5L17 17" stroke={T.muted} strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px 6px 28px', borderRadius: 7, border: `1px solid ${T.border}`, fontSize: 12, fontFamily: T.font, outline: 'none', color: T.text, background: T.bg }}
            />
          </div>
          <div style={{ maxHeight: 230, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <button type="button" onClick={() => pick('__all__')} style={optBtn(!active)}>{allLabel}</button>
            {shown.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                title={o.pathLabel || undefined}
                // 계층 옵션(소속)은 depth 당 12px 들여쓴다 — 공백문자로 들여쓰지 않는다(§5-A P1).
                style={{ ...optBtn(value === o.value), paddingLeft: 9 + (o.depth || 0) * 12 }}
              >
                {o.label}
              </button>
            ))}
            {shown.length === 0 && (
              <div style={{ padding: '10px', fontSize: 12, color: T.muted, textAlign: 'center' }}>{noResult || '결과 없음'}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminEmployeeSheetCanvas({
  members = [],
  loading = false,
  labels = {},
  canViewSalary = false,
  canEdit = true,
  renderAvatar,
  onSaveMembers,
  onDeleteMember,
  onLoadSalaryHistory,
  onAddSalaryHistory,
  // HR(어드민) 전용 — 구성원 HR 기록(신원·가족·학력·경력·자격증·증빙) 읽기 조회.
  // 주입되면 행에 'HR' 버튼이 노출되고 읽기 전용 모달을 연다.
  onLoadHrProfile,
  // 신원 정보(개인이메일·생년월일·성별·국적·주소) 저장 — 있으면 HR 모달이 편집 모드가
  // 된다. 성별·국적은 본인 프로필에서 잠긴 인사 정보라 여기가 유일한 입력 경로다(PW-25).
  onSaveIdentity,
  onAddEmployee,
  /**
   * [PW-114] `+ 구성원 초대` — 전체 구성원 탭의 두 번째 진입점.
   * 초대 관리 탭의 `+ 새 초대 발송` 과 **같은 모달**을 연다. 미주입이면 버튼이 없다.
   */
  onInviteMember,
  inviteLabel,
  // 부서 셀(파생 컬럼) 클릭 시 팀 관리로 보낸다. 미주입이면 그냥 읽기전용 셀.
  onManageTeams,
  // 부서 셀에서 **그 자리에서** 팀을 고르게 한다(PW-23). 둘 다 주어지면 화면 이동
  // 대신 인라인 선택이 열린다 — 부서를 바꾸려고 눌렀다가 다른 화면으로 튕기지 않도록.
  // orgUnitOptions: [{ id, name }], onAssignTeam(memberId, orgUnitId) — '' 이면 미배정.
  orgUnitOptions = [],
  onAssignTeam,
  /**
   * 소속(겸직) 집합 치환 — `onChangeAffiliations(memberId, { unitIds, primaryUnitId })`.
   *
   * 🔴 소속 셀의 **정본 경로**다(PW-368, `admin-spec.md §3.8.3-B`). 이 셀은 겸직을
   * 칩으로 쌓아 보여주는데, 편집이 `onAssignTeam` 단일 값이면 하나를 고르는 순간
   * 나머지 소속이 조용히 사라진다. 주입되면 팝업이 다중 선택으로 열린다.
   *
   * `onAssignTeam` 은 이 prop 이 없는 옛 호출부를 위한 폴백으로만 남는다.
   */
  onChangeAffiliations,
  /**
   * 일괄 소속 **추가** — `onAppendAffiliations(memberIds, unitIds)` (PW-373).
   *
   * 🔴 «추가» 밖에 없다. 일괄 편집 바에서 소속을 교체하면 선택한 겸직자 전원의
   * 나머지 소속이 한 번에 사라지는데, 그것이 PW-326·PW-368 의 발단이었다
   * (`admin-spec.md §3.8.3-B` 「일괄 편집 바」). 빼는 조작은 사람마다 따져야 하므로
   * **행별 트리 팝업**(`onChangeAffiliations`)에서만 한다.
   *
   * 소속은 다른 일괄 필드와 달리 dirty → 「변경 저장」 경로를 타지 않는다 — 셀 편집과
   * 같은 **즉시 반영**이라 별도 버튼으로 가른다. 미주입이면 바에 소속 칸 자체가 없다.
   *
   * 🔴 **건너뛴 인원(퇴사자 등) 안내는 소비자의 몫이다.** 여기서 그리지 않는 이유는
   * 소비자가 적용 후 목록을 다시 불러오면 `members` 가 갈리면서 선택이 풀리고 바
   * 자체가 사라지기 때문이다 — 이 자리에 문구를 두면 실제로는 뜨지 않는다.
   */
  onAppendAffiliations,
  // ── 스쿼드 축 (arch-core-data-model.md §1-5-b) ──
  // 소속(기능조직)과 **평행한 별도 축**이다. squadOptions 가 비면 컬럼 자체가 없다.
  // squadOptions: [{ id, name, status }] — 원장 전체(종료·보관 포함. 표기 범위는 SQ5 가 가른다)
  // onChangeSquads(memberId, [{ squadId, isLead }]) — 미주입이면 셀은 읽기 전용 표기만
  // 남는다(핸들러가 없으면 편집 표면도 없다 — 데모 모드로 도는 가짜 저장 방지).
  // 현 리드는 별도 prop 으로 받지 않고 members 의 `squads` 에서 파생한다 —
  // 같은 사실을 두 군데서 받으면 어긋날 수 있고, "나 자신 제외" 판정도 여기서만 된다.
  squadOptions = NO_SQUADS,
  onChangeSquads,
  // 조직 설정 필드옵션을 컬럼 드롭다운으로 연결(비면 자유 텍스트 폴백, 기존 값 보존).
  // gradeOptions→직급(jobLevel 카탈로그), positionOptions→직책(jobPosition 카탈로그).
  gradeOptions = [],
  positionOptions = [],
  /**
   * 직위(`jobRank`) · 고용형태(`employmentType`) 카탈로그 — 조직 설정 > 필드 옵션.
   *
   * 목록 뷰에만 있던 두 열을 여기에도 세운다(PW-463). 카탈로그를 못 받았으면
   * **자유 텍스트로 폴백**한다(`catCol` 규칙) — 빈 select 로 떨어뜨리면 고를 값이
   * 없어 기존 값을 지우는 것 말고는 할 수 있는 게 없다.
   */
  rankOptions = [],
  employmentTypeOptions = [],
  /**
   * 직군 > 직렬 > 직무 3단 축 (arch-core-data-model §1-3-a 7·8·19 · §1-3-d · §1-3-j).
   *
   * 셋을 **한 prop 으로 받는다** — 값 목록과 매핑이 따로 오면 "직렬 목록은 새것,
   * 매핑은 옛것" 인 중간 상태가 생겨 고를 수 있는 값이 저장에서 거부된다.
   *
   *   families            : 직군 값 목록(활성)
   *   ladders             : 직렬 값 목록(활성, 전체)
   *   duties              : 직무 값 목록(활성, 전체)
   *   laddersByFamily     : { 직군값: [직렬값] }
   *   dutiesByLadder      : { 직렬값: [직무값] }
   *
   * 매핑을 못 받았으면(조회 실패·구버전) **좁히지 않고 전체를 보여준다.** 빈 목록으로
   * 떨어뜨리면 고를 게 없어 값을 넣지 못하는데, 화면은 그 이유를 말해주지 못한다.
   */
  jobAxis = EMPTY_JOB_AXIS,
  // embedded=true 면 다른 캔버스(AdminEmployeesCanvas 전체구성원 탭) 안에 들어가는 모드 —
  // 자체 페이지 타이틀/부제 헤더를 숨기고 저장 컨트롤만 우측 정렬로 노출한다.
  embedded = false,
  // 초기 검색어(딥링크용) — 개요 등에서 특정 인원으로 좁혀 진입할 때 사용.
  initialSearch = '',
  // ── 목록 보기 상태 되살리기 (PW-157) ──────────────────────
  // 다른 화면에 다녀오면 시트가 언마운트돼 필터·검색·정렬이 통째로 날아간다.
  // 소비자가 상태를 어디에 보관할지(URL 쿼리·세션)는 소비자가 정하고, 여기서는
  // **씨앗을 받고 변경을 알려 주기만** 한다.
  //
  //  · initialFilters: `{ [컬럼id]: 값 }` — 마운트 시 1회만 읽는다.
  //    지금 필터 컬럼이 아닌 키는 무시한다(옛 키가 되살아나 "필터 적용됨"으로
  //    보이거나, 소비자가 그 키를 영영 다시 저장하는 일을 막는다).
  //  · initialSort: `{ col, dir }`
  //  · onViewStateChange({ search, filters, sortCol, sortDir }) — 값이 실제로
  //    달라졌을 때만 부른다. 매 렌더 부르면 소비자가 URL 을 쓰고 → 다시 렌더되는
  //    되먹임이 생긴다.
  initialFilters = EMPTY_FILTERS,
  initialSort = null,
  onViewStateChange,
  // ── 대표(CEO) 지정·해제 (screen-admin-ceo-assign.policy.md) ──
  // 주입되면 행에 왕관 버튼이 노출된다. 권한이 없으면 아예 주입하지 않는다 —
  // disabled 버튼을 보여주지 않는 게 정책(§6 미표시 원칙)이다.
  // onAssignCeo(memberId, { alsoSetJobPosition }) / onReleaseCeo(memberId)
  // 둘 다 실패 시 throw 하면 모달이 열린 채 인라인 에러를 띄운다.
  onAssignCeo,
  onReleaseCeo,
  // ── 명부 내보내기 (screen-admin-employees-export.policy.md) ──
  // 주입되면 툴바에 `명부 내보내기` 버튼이 뜬다. 미주입이면 버튼 자체가 없다 —
  // 핸들러 없는 버튼은 눌러도 아무 일이 없는 데모가 된다.
  //
  // onExportRoster({ scope, columns, ids, search, filters, rowCount, includeSalary })
  //  · scope: 'view' | 'selected' | 'all'
  //  · columns: **화면에 렌더된 열 id 를 순서 그대로**. scope='all' 이면 [](서버 표준 13열)
  //  · filters: 화면 필터 상태 그대로(서버가 같은 조건을 다시 실행한다)
  // 🔴 파일은 서버가 만든다 — 화면 데이터를 직렬화하면 감사 로그를 남길 주체가 없고,
  //    목록이 서버 페이지네이션으로 바뀌는 순간 "일부만 담긴 파일"이 조용히 만들어진다.
  onExportRoster,
  exporting = false,
  exportLabels = {},
}) {
  const L = labels;

  // 소속(조직) 계층 — 소속 셀 표기·트리 팝업·서브트리 필터가 같은 트리를 쓴다(PW-112).
  // orgUnitOptions 가 parentId 를 안 주면 전부 depth 0 인 평면 트리가 되어
  // 종전과 같은 평면 동작으로 자연히 폴백한다.
  const orgTree = useMemo(() => buildOrgTree(orgUnitOptions), [orgUnitOptions]);

  /**
   * 매니저 후보 (PW-292) — 서버의 배정 규칙과 같은 조건으로 좁힌다.
   *
   * 고를 수 없는 사람을 목록에 남기면 저장을 눌러야 409 를 만나고, 그 사이 같은 행에서
   * 함께 고친 다른 칸까지 되돌려야 한다. 조건이 서버와 갈리면 그때부터 화면이 거짓말을
   * 하므로, 규칙을 바꿀 때는 `manager-assignment.ts` 와 함께 고쳐야 한다.
   */
  const managerCandidates = useMemo(
    () =>
      members
        .filter(
          (m) =>
            m.employmentStatus !== 'terminated' && (m.orgRole ?? 'member') !== 'member',
        )
        .map((m) => ({ id: m.id, name: m.displayName || m.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [members],
  );

  // ── 컬럼 정의 ──
  const COLUMNS = useMemo(() => {
    const cl = labels.cols || {};
    // 필드옵션 카탈로그가 있으면 select, 없으면 자유 텍스트로 폴백.
    // `extra` 는 select 로 뜰 때만 붙인다 — 텍스트 폴백에 optionsForRow 를 달아 두면
    // 아무 데도 쓰이지 않는 죽은 필드가 된다.
    const catCol = (id, label, width, options, extra) => {
      if (!options.length) {
        return { id, label, width, type: 'text', editable: true };
      }
      // 값을 비울 수 있어야 하는 컬럼은 `emptyLabel` 로 빈 선택지를 얻는다.
      // 🔴 빈 선택지는 **좁힌 목록에도** 붙어야 한다 — 안 붙이면 직렬을 고른 뒤에는
      //    직무를 비울 방법이 사라진다(직렬을 바꿔 조합이 어긋난 그때가 정확히
      //    비워야 하는 순간이다).
      const withEmpty = (list) => (extra?.emptyLabel ? ['', ...list] : list);
      return {
        id, label, width, type: 'select', editable: true,
        ...extra,
        options: withEmpty(options),
        ...(extra?.optionsForRow
          ? { optionsForRow: (row) => withEmpty(extra.optionsForRow(row)) }
          : null),
      };
    };
    const base = [
      { id: 'name', label: cl.name || '이름', width: 120, type: 'text', editable: true },
      /* 이름 표기 두 열은 **다른 값**이다(arch-core-data-model §1-1-c, PW-364).
         · 닉네임(`nickname`)  = 사내 호칭의 **원값**. 예 `데이빗`. 슬랙 멘션·AI 문장·
           인사말이 이 값을 그대로 쓴다 — 표시 문자열의 괄호 앞을 잘라 쓰지 않는다.
         · 표시 이름(`displayName`) = 화면에 찍히는 **조합 문자열**. 예 `데이빗(민현식)`.
           비워 두면 화면이 `닉네임(본명)` 으로 알아서 조합한다.
         이름(1) 바로 뒤에 둔다 — 사내에서 사람을 찾는 실제 키가 호칭인 조직이 대상이다.
         어드민이 관리하는 값이라 시트에서 편집한다(PW-8). */
      { id: 'nickname', label: cl.nickname || '닉네임', width: 110, type: 'text', editable: true },
      { id: 'displayName', label: cl.displayName || '표시 이름', width: 130, type: 'text', editable: true },
      { id: 'email', label: cl.email || '이메일', width: 200, type: 'text', editable: true },
      // 전화번호·근무지도 본인 프로필에서 잠긴 인사 정보 — 어드민이 여기서 넣는다(PW-25).
      { id: 'phone', label: cl.phone || '전화번호', width: 130, type: 'text', editable: true },
      /* 사번 — 목록 뷰와 같은 자리(전화번호 뒤 · 소속 앞)에 둔다. 조직 안에서 유일한
         값이라 서버가 중복을 400 으로 막는다 — 화면은 값 그대로를 보내고 실패를 알린다. */
      { id: 'employeeCode', label: cl.employeeCode || '사번', width: 110, type: 'text', editable: true },
      // 부서는 조직 단위 배정에서 파생되는 값이라 직접 편집하지 않는다. 텍스트를 고쳐도
      // 조직 단위가 있는 구성원에게는 반영되지 않아 죽은 입력이 된다(팀 이동은 팀 관리에서).
      // 소속은 최하위 팀명이 아니라 전체 경로를 보여준다(PW-112) — 한 칸 더 넓게 잡는다.
      { id: 'department', label: cl.department || '부서', width: 180, type: 'readonly', editable: false, derived: true },
      catCol('jobLevel', cl.jobLevel || '직급', 110, gradeOptions),
      /* 직위 — §3.1 정본표의 삽입 위치가 「직급 뒤」다. 직급(내부 등급 Senior)과
         직위(국내식 호칭 과장)는 헷갈리는 두 축이라 나란히 두는 편이 읽기 쉽다. */
      catCol('jobRank', cl.jobRank || '직위', 100, rankOptions, { emptyLabel: '—' }),
      catCol('jobPosition', cl.jobPosition || '직책', 110, positionOptions),
      /* 직군 > 직렬 > 직무 (§1-3-a 7·8·19). 위에서 아래로 좁혀지는 3단이다 —
         직군을 고르면 그 직군의 직렬만, 직렬을 고르면 그 직렬에 매핑된 직무만
         고를 수 있다. 매핑에 없는 조합은 서버가 400 으로 막으므로(INV-3 · INV-8),
         고를 수 있는 값과 저장되는 값을 여기서 미리 맞춘다.
         주의: `jobTitle` 은 직무가 아니라 **직렬**이다(M5-b, 키 이름만 남았다). */
      catCol('jobFamily', cl.jobFamily || '직군', 110, jobAxis.families, { emptyLabel: '—' }),
      catCol('jobTitle', cl.jobTitle || '직렬', 110, jobAxis.ladders, {
        emptyLabel: '—',
        optionsForRow: (row) =>
          narrowByParent(jobAxis.ladders, jobAxis.laddersByFamily, row?.jobFamily),
      }),
      catCol('jobDuty', cl.jobDuty || '직무', 120, jobAxis.duties, {
        emptyLabel: '—',
        optionsForRow: (row) =>
          narrowByParent(jobAxis.duties, jobAxis.dutiesByLadder, row?.jobTitle),
      }),
      { id: 'workLocation', label: cl.workLocation || '근무지', width: 110, type: 'text', editable: true },
      { id: 'orgRole', label: cl.role || '권한', width: 100, type: 'select', editable: true, options: ROLE_OPTIONS },
      /* 고용형태 — 재직상태 바로 앞. 목록 뷰도 이 둘을 붙여 두었다. 둘은 다른 축이다:
         고용형태는 «어떤 계약으로 일하는가»(정규직·계약직), 재직상태는 «지금 다니는가». */
      catCol('employmentType', cl.employmentType || '고용형태', 110, employmentTypeOptions, { emptyLabel: '—' }),
      { id: 'employmentStatus', label: cl.status || '재직상태', width: 110, type: 'select', editable: true, options: STATUS_OPTIONS },
      // 매니저 — 직접 배정한다(PW-292). 값은 사용자 id, 화면 라벨은 이름.
      // 후보 조건은 서버 규칙과 같다: 재직 중 + 권한이 멤버보다 위. 자기 자신 제외는
      // 행마다 달라 `excludeSelf` 로 셀 편집기가 처리한다.
      {
        id: 'managerId',
        label: cl.manager || '매니저',
        width: 140,
        type: 'select',
        editable: true,
        excludeSelf: true,
        options: ['', ...managerCandidates.map((m) => m.id)],
        optionLabels: {
          '': labels.unassigned || '— 미배정 —',
          ...Object.fromEntries(managerCandidates.map((m) => [m.id, m.name])),
        },
        // CSV 폴백 이름만 있는 행의 빈 옵션 라벨(PW-314). `{name}` 자리에 그 이름이 들어간다.
        unassignedDerivedLabel: labels.managerFallbackUnassigned,
      },
      { id: 'hireDate', label: cl.hireDate || '입사일', width: 120, type: 'date', editable: true },
      { id: 'terminationDate', label: cl.terminationDate || '퇴사일', width: 120, type: 'date', editable: true },
    ];
    // 스쿼드 — 소속(기능조직) 바로 다음에 **별도 컬럼**으로 둔다(SQ1). 한 칸에 두 축을
    // 섞으면 인원 집계의 분모가 오염되고(SQ2) 한시 조직이 상설처럼 보인다.
    // 원장이 비어 있으면(스쿼드를 아직 안 만든 조직) 컬럼 자체를 렌더하지 않는다 —
    // 늘 '—' 인 칸은 폭만 먹고, 눌러도 고를 게 없는 팝업이 열린다. 스쿼드를 만드는
    // 곳은 조직도 스쿼드 뷰뿐이므로 여기서 빈 상태를 안내할 방법도 없다(SQ3).
    if (squadOptions.length > 0) {
      const at = base.findIndex((c) => c.id === 'department');
      base.splice(at + 1, 0, {
        id: 'squads', label: cl.squads || '스쿼드', width: 150, type: 'readonly', editable: false, squadCell: true,
      });
    }
    if (canViewSalary) {
      base.push({ id: 'salary', label: cl.salary || '연봉', width: 130, type: 'currency', editable: true, sensitive: true });
    }
    base.push({ id: 'education', label: cl.education || '학력', width: 160, type: 'text', editable: true });
    return base;
  }, [canViewSalary, labels, gradeOptions, positionOptions, rankOptions, employmentTypeOptions, squadOptions, managerCandidates, jobAxis]);

  // ── 상태 ──
  const [rows, setRows] = useState(() => mapMembers(members));
  const [original, setOriginal] = useState(() => mapMembers(members));
  const [syncedMembers, setSyncedMembers] = useState(members);
  const [editing, setEditing] = useState(null);
  // 부서 셀에서 팀 선택이 열린 행(PW-23).
  const [assignRowId, setAssignRowId] = useState(null);
  // 스쿼드 셀에서 선택 팝업이 열린 행(PW-113).
  const [squadRowId, setSquadRowId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  // 표에서 보이는 모든 범주형 컬럼(부서·직급·직책·권한·상태)을 필터 대상으로. 값 미지정=전체.
  const [filters, setFilters] = useState(initialFilters);
  /**
   * 필터 변경 — 3단 축(직군 > 직렬 > 직무)은 **상위를 바꾸면 어긋난 하위를 푼다.**
   *
   * 안 풀면 `직군=개발` + `직렬=HR` 처럼 아무도 안 걸리는 조합이 남아 목록이 0명이
   * 되는데, 화면에는 두 칩이 나란히 멀쩡해 보여서 사람이 원인을 못 찾는다.
   * 하위가 새 상위 아래에도 있으면 그대로 둔다 — 멀쩡한 선택을 지우지 않는다.
   */
  const setFilter = (colId, v) => setFilters((f) => {
    const next = { ...f, [colId]: v };
    const cascade = [
      { child: 'jobTitle', parent: 'jobFamily', map: jobAxis.laddersByFamily },
      { child: 'jobDuty', parent: 'jobTitle', map: jobAxis.dutiesByLadder },
    ];
    // 위에서 아래 순서로 훑는다 — 직군을 바꿔 직렬이 풀리면 직무도 이어서 풀려야 한다.
    for (const { child, parent, map } of cascade) {
      const parentValue = next[parent];
      const childValue = next[child];
      if (!childValue || childValue === '__all__') continue;
      if (!parentValue || parentValue === '__all__') continue;
      const allowed = narrowByParent([childValue], map, parentValue);
      if (!allowed.includes(childValue)) next[child] = '__all__';
    }
    return next;
  });
  const [search, setSearch] = useState(initialSearch);
  // 지금 이 시트에 없는 열로는 정렬하지 않는다 — 되살린 값이 화면에 없는 열을
  // 가리키면 표는 안 바뀌는데 헤더 화살표만 사라진 어정쩡한 상태가 된다.
  const [sortCol, setSortCol] = useState(
    initialSort?.col && COLUMNS.some((c) => c.id === initialSort.col) ? initialSort.col : null,
  );
  const [sortDir, setSortDir] = useState(initialSort?.dir === 'desc' ? 'desc' : 'asc');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [barValues, setBarValues] = useState({});
  const [barApplied, setBarApplied] = useState(false);
  // 일괄 «소속 추가» (PW-373) — 트리 팝업 열림 / 진행 중.
  const [bulkOrgOpen, setBulkOrgOpen] = useState(false);
  const [bulkOrgBusy, setBulkOrgBusy] = useState(false);
  const [salaryHistRowId, setSalaryHistRowId] = useState(null);
  const [hrProfileRowId, setHrProfileRowId] = useState(null);
  // 대표 확인 모달 — { rowId, mode: 'assign' | 'release' }
  const [ceoConfirm, setCeoConfirm] = useState(null);

  // members prop 변경 시 내부 rows 재동기화(저장 후 부모 재로드 → dirty 리셋).
  // "이전 props 와 비교해 렌더 중 상태 조정" 패턴 — effect 내 synchronous setState 회피.
  if (members !== syncedMembers) {
    setSyncedMembers(members);
    setRows(mapMembers(members));
    setOriginal(mapMembers(members));
    setEditing(null);
    setSelected(new Set());
    setBarValues({});
  }

  // ── dirty 추적 ──
  const origMap = useMemo(() => new Map(original.map((r) => [r.id, r])), [original]);
  function isDirty(rowId, colId) {
    const o = origMap.get(rowId);
    const c = rows.find((r) => r.id === rowId);
    return o && c ? (o[colId] ?? '') !== (c[colId] ?? '') : false;
  }
  function isRowDirty(rowId) {
    return EDITABLE_FIELDS.some((f) => isDirty(rowId, f));
  }
  const dirtyRows = rows.filter((r) => isRowDirty(r.id));
  const dirtyCount = dirtyRows.length;

  function updateCell(rowId, colId, val) {
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [colId]: val } : r)));
  }

  function startEdit(rowId, colId) {
    if (!canEdit) return;
    const c = COLUMNS.find((x) => x.id === colId);
    if (!c?.editable) return;
    setEditing({ rowId, colId });
  }
  function stopEdit() {
    setEditing(null);
  }

  function handleKeyDown(e, rowId, colId) {
    // IME(한글) 조합 중의 Enter/Tab 은 "조합 확정" 이지 셀 이동이 아니다.
    // 여기서 셀을 옮기면 조합 중이던 입력이 unmount 되고, 뒤이어 도착하는
    // compositionend 의 마지막 글자가 **새로 포커스된 셀**에 들어간다.
    // 실제 사고: 이름 칸에 '장동건' 을 치고 Tab → 이메일이
    // 'gigantic.anteater.lhco@hidepost.net건' 이 됐다(PW-9).
    if (e.nativeEvent?.isComposing || e.keyCode === 229) return;
    // Enter 는 편집만 끝내고 빠진다 — 어떤 칸도 새로 열지 않는다.
    // 예전에는 Enter 를 Tab 과 똑같이 취급해 "다음 편집 가능한 칸" 을 열었다.
    // 값을 바꿀 생각도 없던 칸이 편집 상태로 열리니 오작동처럼 보인다(PW-9).
    // 제보 당시엔 이름 다음이 이메일이라 이메일 칸이 열렸는데, 그 뒤 닉네임
    // 컬럼이 끼면서 열리는 칸만 바뀌었을 뿐 증상은 같다 — 그래서 "어느 칸이
    // 다음이냐" 가 아니라 Enter 가 칸을 여는 것 자체를 없앤다.
    // 칸 이동은 Tab 전용이다.
    if (e.key === 'Enter') {
      e.preventDefault();
      stopEdit();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const editableCols = COLUMNS.filter((c) => c.editable);
      const colPos = editableCols.findIndex((c) => c.id === colId);
      const nextPos = e.shiftKey ? colPos - 1 : colPos + 1;
      if (nextPos >= 0 && nextPos < editableCols.length) {
        setEditing({ rowId, colId: editableCols[nextPos].id });
      } else stopEdit();
      return;
    }
    if (e.key === 'Escape') stopEdit();
  }

  function toggleSort(colId) {
    if (sortCol === colId) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortCol(colId);
      setSortDir('asc');
    }
  }

  // ── 필터/정렬 ──
  // 필터 가능한 범주형 컬럼(라벨은 컬럼 라벨 재사용, orgRole/상태는 meta 라벨).
  const cl = labels.cols || {};
  // 스쿼드는 소속과 **다른 축**이라 필터 칩도 따로 둔다(SQ1) — 소속 필터에 스쿼드를
  // 섞으면 "이 팀 사람" 과 "이 스쿼드 사람" 이 한 드롭다운에서 구분되지 않는다.
  const FILTER_COLS = useMemo(() => ([
    { id: 'department', label: cl.department || '부서' },
    ...(squadOptions.length > 0 ? [{ id: 'squads', label: cl.squads || '스쿼드' }] : []),
    { id: 'jobLevel', label: cl.jobLevel || '직급' },
    { id: 'jobPosition', label: cl.jobPosition || '직책' },
    /* 직군 > 직렬 > 직무 — 셀 편집과 **같은 3단**이다(§1-3-a 직무 열 주석).
       상위 필터를 걸면 하위 필터의 후보가 그 아래로 좁혀진다. 종전 "직렬 필터 +
       직급 필터로 대체" 규칙은 직무가 저장 필드가 되면서 폐기됐다(2026-08-16). */
    { id: 'jobFamily', label: cl.jobFamily || '직군' },
    { id: 'jobTitle', label: cl.jobTitle || '직렬', parentFilter: 'jobFamily' },
    { id: 'jobDuty', label: cl.jobDuty || '직무', parentFilter: 'jobTitle' },
    /* 근무지·고용형태 — 목록 뷰 필터 11종과 맞춘다(PW-463 · §3.8.5 「후속으로 §3.1
       필터 칩과 통일한다」). 근무지는 열은 있는데 필터만 없었고, 고용형태는 둘 다
       없었다. 「직종」은 두 뷰 모두 없다 — 저장할 자리가 아직 없어서다(E6). */
    { id: 'workLocation', label: cl.workLocation || '근무지' },
    { id: 'employmentType', label: cl.employmentType || '고용형태' },
    { id: 'orgRole', label: cl.role || '권한', meta: 'role' },
    // 매니저는 사람 이름으로 거르는 축이 아니다(PW-300, 기획 §3.1) — 어드민이 알고 싶은
    // 것은 "누가 상급자냐" 가 아니라 **"아직 상급자가 없는 사람이 누구냐"** 다. 그래서
    // distinct 이름이 아니라 배정됨/미배정 2종 고정 옵션이다.
    { id: 'managerId', label: cl.manager || '매니저', meta: 'assigned' },
    { id: 'employmentStatus', label: cl.status || '상태', meta: 'status' },
  ]), [cl.department, cl.squads, cl.jobLevel, cl.jobPosition, cl.jobFamily, cl.jobTitle, cl.jobDuty, cl.workLocation, cl.employmentType, cl.role, cl.manager, cl.status, squadOptions]);
  /**
   * 실제로 걸려 있는 필터만 추린 것 — **지금 필터 컬럼인 것만** 남긴다(PW-157).
   *
   * `filters` 에는 되살린 값이 그대로 들어와 있어서, 지금은 없어진 옛 컬럼 키가
   * 섞여 있을 수 있다. 그대로 두면 거르는 건 아무것도 없는데 `hasActiveFilter` 만
   * 참이 되어 "필터 적용됨" 캡션이 뜨고, 소비자가 그 키를 계속 되저장한다.
   * 여기서 한 번 걸러 두면 다음 변경 때 저장된 쪽도 저절로 낫는다.
   */
  const activeFilters = useMemo(() => {
    const out = {};
    for (const fc of FILTER_COLS) {
      const v = filters[fc.id];
      if (v && v !== '__all__') out[fc.id] = v;
    }
    return out;
  }, [filters, FILTER_COLS]);

  /* 보기 상태가 바뀌면 소비자에게 알린다(PW-157).
     값이 같으면 부르지 않는다 — 소비자가 이 콜백으로 URL 을 쓰는 경우, 매번 부르면
     쓰기 → 렌더 → 다시 쓰기의 되먹임이 된다. 콜백 자체는 ref 로 들고 있어서
     소비자가 인라인 함수를 넘겨도 효과가 다시 돌지 않는다. */
  const onViewStateChangeRef = useRef(onViewStateChange);
  useEffect(() => { onViewStateChangeRef.current = onViewStateChange; }, [onViewStateChange]);
  const viewStateKey = JSON.stringify([search, activeFilters, sortCol, sortDir]);
  const lastViewStateKey = useRef(null);
  useEffect(() => {
    if (lastViewStateKey.current === viewStateKey) return;
    lastViewStateKey.current = viewStateKey;
    onViewStateChangeRef.current?.({
      search, filters: activeFilters, sortCol, sortDir,
    });
  }, [viewStateKey, search, activeFilters, sortCol, sortDir]);

  // 각 필터 컬럼의 distinct 옵션(현재 rows 기준 — 존재하는 값만 노출).
  const filterOptions = useMemo(() => {
    const out = {};
    for (const fc of FILTER_COLS) {
      // 소속은 평면 distinct 가 아니라 **전체 조직 트리**를 옵션으로 준다(§5-A P3) —
      // 상위 조직을 고를 수 있어야 서브트리로 거를 수 있고, 하위 조직에 아무도 없어도
      // 그 조직이 목록에서 사라지지 않는다.
      if (fc.id === 'department' && orgTree.length > 0) {
        out[fc.id] = [
          ...orgTree.map((e) => ({
            value: e.id, label: e.name, depth: e.depth, pathLabel: e.pathLabel,
          })),
          { value: ORG_FILTER_UNASSIGNED, label: L.unassigned || '미배정', depth: 0 },
        ];
        continue;
      }
      // 매니저 필터는 값이 아니라 **상태** 2종이다(PW-300). 사람 이름을 distinct 로
      // 뽑으면 조직 인원수만큼 옵션이 생기는데, 정작 찾고 싶은 "미배정" 은 값이 없어서
      // 그 목록에 아예 나타나지 않는다.
      if (fc.meta === 'assigned') {
        out[fc.id] = [
          { value: MANAGER_FILTER_ASSIGNED, label: L.filterAssigned || '배정됨' },
          { value: MANAGER_FILTER_UNASSIGNED, label: L.filterUnassigned || '미배정' },
        ];
        continue;
      }
      // 스쿼드 필터 옵션 — SQ5 대로 **종료·보관은 제외**한다. 끝난 스쿼드로 거를 수
      // 있게 두면 셀에는 안 보이는 값으로 목록이 걸러져 "왜 이 사람이 나오지" 가 된다.
      if (fc.id === 'squads') {
        out[fc.id] = squadOptions
          .filter((s) => isVisibleSquadStatus(s.status))
          .map((s) => ({ value: String(s.id), label: s.name }));
        continue;
      }
      // 트리를 못 받은 폴백 — 겸직 소속까지 옵션에 넣는다. 겸직으로만 사람이 있는 팀이
      // 목록에서 빠지면 그 팀으로는 걸러볼 수가 없다.
      const raw =
        fc.id === 'department'
          ? rows.flatMap((r) => (r.depts || []).map((d) => d.name))
          : rows.map((r) => r[fc.id]);
      let vals = Array.from(new Set(raw.filter((v) => v !== '' && v != null).map(String)));
      /* 상위 필터가 걸려 있으면 후보를 그 아래로 좁힌다(§1-3-d · §1-3-j).
         좁히지 않으면 `직렬=HR` 로 걸어 둔 채 `직무=웹 퍼블리싱` 을 고를 수 있고,
         그 조합은 아무도 안 걸려 늘 0명이다 — 사람은 필터가 고장 났다고 읽는다. */
      if (fc.parentFilter) {
        const parentValue = filters[fc.parentFilter];
        const map = fc.id === 'jobTitle' ? jobAxis.laddersByFamily : jobAxis.dutiesByLadder;
        if (parentValue && parentValue !== '__all__') {
          const allowed = new Set(narrowByParent(vals, map, parentValue));
          vals = vals.filter((v) => allowed.has(String(v)));
        }
      }
      out[fc.id] = vals
        .map((v) => ({
          value: String(v),
          label: fc.meta === 'role' ? (ROLE_META[v]?.label || String(v))
            : fc.meta === 'status' ? statusMeta(v).label
              : String(v),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    return out;
  }, [rows, FILTER_COLS, orgTree, L.unassigned, L.filterAssigned, L.filterUnassigned, squadOptions, filters, jobAxis]);

  // 소속 이름 전체(주 소속 + 겸직) — 검색·필터가 겸직 팀으로도 사람을 찾게 한다.
  // department 하나만 보면 마케팅팀을 겸직하는 사람이 '마케팅팀' 필터에서 사라진다.
  const deptNamesOf = (r) =>
    (r.depts || []).map((d) => d.name).filter(Boolean);

  const squadNameById = useMemo(
    () => new Map(squadOptions.map((s) => [String(s.id), s])),
    [squadOptions],
  );
  // 검색·필터가 보는 스쿼드 이름 — SQ5 대로 화면에 보이는 것(planned·active)만이다.
  // 셀에 안 보이는 종료 스쿼드로 검색이 걸리면 결과가 설명되지 않는다.
  const squadNamesOf = (r) =>
    (r.squads || [])
      .map((a) => squadNameById.get(a.squadId))
      .filter((s) => s && isVisibleSquadStatus(s.status))
      .map((s) => s.name);

  let filtered = rows.filter((r) => {
    for (const fc of FILTER_COLS) {
      const fv = filters[fc.id];
      if (!fv || fv === '__all__') continue;
      // 소속 필터는 선택 조직 + **하위 전체**를 포함한다(§5-A P3). 상위를 고를 수 있는데
      // 정확히 일치만 보면 "본부로 거르기"가 0명이 되어 필터가 무의미해진다.
      // 판정 대상은 orgUnitIds — 겸직 소속도 여기 들어 있어 함께 걸린다(PW-111).
      if (fc.id === 'department' && orgTree.length > 0) {
        if (!matchesOrgSubtree(r.orgUnitIds, fv, orgTree)) return false;
        continue;
      }
      if (fc.id === 'department') {
        if (!deptNamesOf(r).includes(fv)) return false;
        continue;
      }
      /* 매니저 배정 여부(PW-300).
         대표는 **어느 쪽에도 걸리지 않는다** — 조직 최상위라 상급자가 없는 게 정상이고
         (`arch-core-data-model.md §1-3-c` R4), 미배정으로 세면 없앨 방법이 없는 경고가
         된다. 탭 B 의 미배정 목록·카운트가 대표를 빼는 것과 같은 기준을 쓴다. */
      if (fc.meta === 'assigned') {
        if (r.isCeo) return false;
        const has = Boolean(r.managerId || r.managerName);
        if (fv === MANAGER_FILTER_ASSIGNED && !has) return false;
        if (fv === MANAGER_FILTER_UNASSIGNED && has) return false;
        continue;
      }
      // 스쿼드 필터는 id 로 맞춘다 — 동명 스쿼드가 있어도 갈리고, 이름을 바꿔도 안 깨진다.
      if (fc.id === 'squads') {
        if (!(r.squads || []).some((a) => a.squadId === fv)) return false;
        continue;
      }
      if (String(r[fc.id] ?? '') !== fv) return false;
    }
    const q = search.trim().toLowerCase();
    if (q) {
      // 상위 조직 이름으로도 찾게 한다('물류본부' → 그 아래 사람들). 겸직 팀명도 함께 본다.
      const orgPath = orgTree.length ? (primaryOrgEntry(orgTree, r.orgUnitIds)?.pathLabel ?? '') : '';
      const hit =
        orgPath.toLowerCase().includes(q)
        || ['name', 'nickname', 'displayName', 'email', 'jobPosition', 'jobLevel'].some(
          (k) => (r[k] || '').toLowerCase().includes(q),
        )
        || deptNamesOf(r).some((n) => n.toLowerCase().includes(q))
        // 스쿼드명으로도 사람을 찾는다 — 컬럼에 보이는 값은 검색으로도 닿아야 한다.
        || squadNamesOf(r).some((n) => n.toLowerCase().includes(q));
      if (!hit) return false;
    }
    return true;
  });
  if (sortCol) {
    filtered = [...filtered].sort((a, b) => {
      const av = String(a[sortCol] ?? '');
      const bv = String(b[sortCol] ?? '');
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }
  // 대표는 필터·정렬과 무관하게 항상 최상단(정책 §2). 정렬 후에 끌어올린다.
  if (filtered.some((r) => r.isCeo)) {
    filtered = [...filtered].sort((a, b) => (a.isCeo ? -1 : 0) - (b.isCeo ? -1 : 0));
  }

  // ── 선택 ──
  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      setBarValues({});
    } else setSelected(new Set(filtered.map((r) => r.id)));
  }
  function toggleRow(id) {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      if (s.size === 0) setBarValues({});
      return s;
    });
  }

  // ── 일괄 편집 바 ──
  // 일괄 편집 바에서 제외 — 사람마다 다른 값이라 여러 행에 같은 값을 찍는 게 의미 없다
  // (이름·이메일과 같은 이유로 닉네임도 뺀다).
  const PER_PERSON_COLS = new Set(['name', 'nickname', 'displayName', 'email', 'phone']);
  const barCols = COLUMNS.filter((c) => c.editable && !PER_PERSON_COLS.has(c.id));
  const barActiveCount = Object.values(barValues).filter((v) => v !== '' && v !== undefined).length;
  function applyBar() {
    const fields = barCols.filter((c) => barValues[c.id] !== '' && barValues[c.id] !== undefined);
    if (!fields.length) return;
    setRows((prev) =>
      prev.map((r) => {
        if (!selected.has(r.id)) return r;
        const patch = {};
        fields.forEach((c) => {
          // 대표는 상급자를 가질 수 없으므로 일괄 배정 대상에서도 뺀다(PW-292).
          // 셀 편집은 이미 잠겨 있는데 일괄바로는 들어가면 우회로가 된다.
          if (c.id === 'managerId' && r.isCeo) return;
          patch[c.id] = barValues[c.id];
        });
        return { ...r, ...patch };
      }),
    );
    setBarValues({});
    setBarApplied(true);
    setTimeout(() => setBarApplied(false), 2000);
  }

  /**
   * 일괄 «소속 추가» — 선택한 행들에 조직을 **더한다** (PW-373 · §3.8.3-B B3).
   *
   * 다른 일괄 필드처럼 dirty 로 쌓아 두지 않고 **즉시** 반영한다. 소속은 시트의
   * patch 계약(`EDITABLE_FIELDS`)에 없는 값이라, 여기서만 쌓아 두면 「변경 저장」이
   * 그것을 실어 보내지 못하고 조용히 사라진다.
   */
  async function applyBulkOrgAppend(unitIds) {
    if (!onAppendAffiliations || !unitIds || unitIds.length === 0) return;
    const memberIds = rows.filter((r) => selected.has(r.id)).map((r) => r.id);
    if (memberIds.length === 0) return;
    setBulkOrgBusy(true);
    try {
      await onAppendAffiliations(memberIds, unitIds);
      setBarApplied(true);
      setTimeout(() => setBarApplied(false), 2000);
    } finally {
      setBulkOrgBusy(false);
    }
  }

  // ── 저장/초기화 ──
  async function saveChanges() {
    if (!onSaveMembers || dirtyCount === 0 || saving) return;
    const patches = dirtyRows.map((r) => {
      const patch = { id: r.id };
      EDITABLE_FIELDS.forEach((f) => {
        if (isDirty(r.id, f)) patch[f] = r[f] ?? '';
      });
      return patch;
    });
    setSaving(true);
    try {
      await onSaveMembers(patches);
      setSaved(true);
      setEditing(null);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }
  function resetChanges() {
    setRows(original.map((r) => ({ ...r })));
    setEditing(null);
  }

  async function handleDelete(id) {
    if (!onDeleteMember) return;
    await onDeleteMember(id);
    setSelected((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
  }

  // ── 명부 내보내기 ─────────────────────────────────────────
  // 연봉 확인 모달이 떠 있는 동안의 대기 범위('view' | 'selected').
  const [salaryGateScope, setSalaryGateScope] = useState(null);
  const EL = exportLabels || {};
  /* 화면에 **렌더된 열** 그대로 — `⚙` 로 끈 열은 파일에도 없다(§4-0 (1)).
     다만 화면 컬럼 id 가 반출 카탈로그의 열 키와 **다른 것이 하나 있다**: 매니저 칸의
     id 는 `managerId`(사람 id 로 배정하는 셀이라 그렇다)인데 반출 열 이름은
     `managerName` 이다. 번역하지 않고 그대로 보내면 서버가 **400 INVALID_COLUMN**
     으로 거절해 「현재 화면 그대로」 가 통째로 실패한다 — 매니저 열은 늘 보이므로
     사실상 항상 그렇다(PW-411 브라우저 검증에서 발견). 필터 키도 같은 이유로 번역한다. */
  const EXPORT_KEY_BY_COLUMN = { managerId: 'managerName' };
  const toExportKey = (id) => EXPORT_KEY_BY_COLUMN[id] ?? id;
  const visibleColumnIds = COLUMNS.map((c) => toExportKey(c.id));
  const salaryVisible = visibleColumnIds.includes('salary');
  const exportFilters = Object.fromEntries(
    Object.entries(activeFilters).map(([k, v]) => [toExportKey(k), v]),
  );
  const hasActiveFilter =
    search.trim() !== ''
    || Object.keys(activeFilters).length > 0;

  function runExport(scope, includeSalary) {
    if (!onExportRoster) return;
    // scope='all' 은 화면 상태를 무시한다 — 필터·컬럼을 아예 보내지 않는다(§5-1).
    if (scope === 'all') {
      onExportRoster({
        scope, columns: [], ids: [], search: '', filters: {},
        rowCount: rows.length, includeSalary: false,
      });
      return;
    }
    const columns = includeSalary
      ? visibleColumnIds
      : visibleColumnIds.filter((id) => id !== 'salary');
    const target = scope === 'selected'
      ? rows.filter((r) => selected.has(r.id))
      : filtered;
    onExportRoster({
      scope,
      columns,
      ids: scope === 'selected' ? target.map((r) => r.id) : [],
      // 선택 범위는 선택이 이미 대상을 확정하므로 필터를 보내지 않는다(§5-1).
      search: scope === 'selected' ? '' : search.trim(),
      filters: scope === 'selected' ? {} : { ...exportFilters },
      rowCount: target.length,
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

  /* 범위 항목은 목록 뷰와 **같은 계산**에서 나온다(PW-411) — 뷰마다 따로 세면
     같은 상태에서 다른 캡션이 나오고, 어느 쪽이 맞는지는 받은 파일을 열어야 안다. */
  const exportItems = buildExportItems({
    labels: EL,
    viewRows: filtered,
    allRows: rows,
    columnCount: visibleColumnIds.length,
    hasActiveFilter,
    salaryVisible,
    selectedRows: rows.filter((r) => selected.has(r.id)),
  });

  const ROW_H = 44;
  const CHECKBOX_W = 44;
  const ACTION_W = 70;

  /* ── 가로 스크롤 고정 컬럼 (PW-137) ────────────────────────────────────
   * 표는 화면보다 1,000px 이상 넓다. 이름(+체크박스)을 왼쪽에, 액션 칸을 오른쪽에
   * 고정해서 (a) 연봉 이력(₩)·HR 버튼이 처음부터 늘 보이고 (b) 가로로 밀어도
   * 지금 보는 행이 누구인지 잃지 않게 한다.
   *
   * 경계선·그림자는 **밀 여지가 있을 때만** 켠다 — 표가 화면에 다 들어오는 넓은
   * 창에서는 고정 이전과 시각이 똑같아야 한다.
   * -------------------------------------------------------------------- */
  const scrollerRef = useRef(null);
  const layoutKey = `${COLUMNS.length}:${filtered.length}:${canEdit}`;
  const scrollEdges = useHorizontalScrollEdges(scrollerRef, layoutKey);
  // 표 상자를 화면 높이에 맞춰 자른다 — 가로 막대가 화면 밖으로 나가지 않게(PW-463).
  const boxMaxHeight = useViewportBoundedHeight(scrollerRef, SHEET_BOX_BOTTOM_GAP, layoutKey);
  const STICKY_DIVIDER = `1px solid ${T.border}`;
  const DIRTY_CELL_BG = 'rgba(245,158,11,.06)';
  const DIRTY_ROW_BG = 'rgba(245,158,11,.04)';
  const wash = (c) => `linear-gradient(${c}, ${c})`;
  const stickyLeftCell = (left, extra) => ({
    position: 'sticky',
    left,
    zIndex: 2,
    ...(extra || {}),
  });
  /**
   * 열 이름 줄은 상자 위에 붙는다 (PW-463 · 정책서 §3 ⑧).
   * 상자가 세로로 잘리는 순간(위 `boxMaxHeight`) 열 이름이 따라 올라가지 않으면
   * 23열짜리 표에서 지금 보는 칸이 무슨 값인지 알 수 없다.
   *
   * z 층이 셋이라는 점이 함정이다. 본문의 왼쪽·오른쪽 고정 셀(z 2)이 헤더 위로
   * 올라오면 안 되므로 헤더는 z 3, 헤더 안에서도 **가로로도 고정된 모서리 칸**은
   * 나머지 헤더 칸 위에 떠야 해서 z 4 다. 한 층으로 두면 가로로 밀 때 이름 칸이
   * 헤더 글자를 덮는다.
   */
  const stickyHeadCell = { position: 'sticky', top: 0, zIndex: 3 };
  const stickyHeadCorner = { ...stickyHeadCell, zIndex: 4 };
  // 마지막 왼쪽 고정 열(이름)의 오른쪽 경계 — 밀린 내용이 그 밑으로 들어감을 보인다.
  const leftEdgeDecor = scrollEdges.left
    ? { borderRight: STICKY_DIVIDER, boxShadow: '6px 0 10px -6px rgba(15,23,42,.28)' }
    : null;
  // 오른쪽 고정(액션) 열의 왼쪽 경계 — 이게 "오른쪽에 더 있다"의 신호를 겸한다.
  const rightEdgeDecor = scrollEdges.right
    ? { borderLeft: STICKY_DIVIDER, boxShadow: '-6px 0 10px -6px rgba(15,23,42,.28)' }
    : null;

  return (
    <div style={{ fontFamily: T.font, color: T.text }}>
      {/* 헤더: 타이틀 + 저장 컨트롤 (embedded 면 타이틀 숨김, 저장 컨트롤만 우측) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: embedded ? 'flex-end' : 'space-between', marginBottom: embedded ? 10 : 16, flexWrap: 'wrap', gap: 10 }}>
        {!embedded && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{L.title || '직원 일괄 편집'}</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{L.subtitle || '표에서 직접 수정하고 여러 명을 한 번에 편집하세요.'}</div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {saved && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#16A34A' }}>{L.saved || '저장 완료'}</span>
            </div>
          )}
          {dirtyCount > 0 ? (
            <>
              <span style={{ fontSize: 11, color: T.muted }}>
                <span style={{ fontWeight: 700, color: '#F59E0B' }}>{dirtyCount}{L.rowsUnit || '개'}</span> {L.rowsChanged || '행 변경됨'}
              </span>
              <button onClick={resetChanges} disabled={saving} style={{ padding: '7px 13px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg, fontSize: 12, color: T.sub, cursor: 'pointer', fontFamily: T.font }}>
                {L.revert || '되돌리기'}
              </button>
              <button onClick={saveChanges} disabled={saving} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: T.accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', fontFamily: T.font, boxShadow: '0 2px 10px rgba(79,106,245,.3)', opacity: saving ? 0.7 : 1 }}>
                {saving ? L.saving || '저장 중…' : L.save || '변경 저장'}
              </button>
            </>
          ) : (
            <span style={{ fontSize: 11, color: T.muted }}>{L.noChanges || '변경사항 없음'}</span>
          )}
        </div>
      </div>

      {/* 툴바 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '0 0 220px' }}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="9" cy="9" r="6" stroke="#94A3B8" strokeWidth="1.8" />
            <path d="M13.5 13.5L17 17" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={L.searchPlaceholder || '이름, 이메일, 부서 검색'} style={{ width: '100%', padding: '8px 12px 8px 30px', borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 12, fontFamily: T.font, background: T.card, outline: 'none', color: T.text }} />
        </div>

        {FILTER_COLS.map((fc) => (
          <FilterMenu
            key={fc.id}
            testId={`sheet-filter-${fc.id}`}
            label={fc.label}
            value={filters[fc.id] ?? '__all__'}
            options={filterOptions[fc.id] || []}
            onChange={(v) => setFilter(fc.id, v)}
            allLabel={L.filterAll || '전체'}
            searchPlaceholder={L.filterSearchPlaceholder || '검색'}
            noResult={L.filterNoResult || '결과 없음'}
          />
        ))}

        <div style={{ flex: 1 }} />

        {selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, padding: '4px 10px', borderRadius: 7, background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
              {selected.size}{L.selectedUnit || '명'} {L.selected || '선택됨'}
            </span>
            <button onClick={() => { setSelected(new Set()); setBarValues({}); }} style={{ padding: '4px 9px', borderRadius: 7, border: `1px solid ${T.border}`, background: T.bg, fontSize: 11, color: T.sub, cursor: 'pointer', fontFamily: T.font }}>
              {L.clearSelection || '선택 해제'}
            </button>
          </div>
        )}

        {/* 명부 내보내기 — 업로드(CSV 업로드)와 방향을 라벨로 구분한다(§2-1). */}
        {onExportRoster && (
          <ExportMenu
            items={exportItems}
            // E1 — **필터 결과가 0명이면** 잠근다(전체 인원이 남아 있어도). 빈 파일을
            // 만들지 않는 게 규칙이고, 전사 명부가 필요하면 필터를 지우고 ③ 을 쓴다.
            // 조건을 `rows.length === 0` 까지 AND 로 묶었더니 "검색 결과 0명인데
            // 버튼이 살아 있는" 상태가 됐다(브라우저 검증에서 발견).
            disabled={filtered.length === 0}
            busy={exporting}
            labels={EL}
            onPick={pickExportScope}
          />
        )}

        {canEdit && onInviteMember && (
          <button
            type="button"
            onClick={onInviteMember}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1px solid ' + T.border, background: '#fff', color: T.text, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: T.font }}
          >
            + {inviteLabel || '구성원 초대'}
          </button>
        )}

        {canEdit && onAddEmployee && (
          <button onClick={onAddEmployee} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: 'none', background: T.accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: T.font, boxShadow: '0 2px 10px rgba(79,106,245,.25)' }}>
            + {L.addEmployee || '직원 추가'}
          </button>
        )}
      </div>

      {salaryGateScope && (
        <SalaryExportModal
          count={
            salaryGateScope === 'selected' ? selected.size : filtered.length
          }
          columnCount={visibleColumnIds.length}
          labels={EL}
          onClose={() => setSalaryGateScope(null)}
          onExclude={() => {
            const scope = salaryGateScope;
            setSalaryGateScope(null);
            // 🔴 화면의 컬럼 토글은 끄지 않는다 — 파일 선택이 화면 상태를 바꾸지 않는다(§5-1).
            runExport(scope, false);
          }}
          onInclude={() => {
            const scope = salaryGateScope;
            setSalaryGateScope(null);
            runExport(scope, true);
          }}
        />
      )}

      {/* 일괄 편집 바 */}
      {canEdit && selected.size >= 2 && (
        <div style={{ background: '#fff', border: `1.5px solid ${T.accent}`, borderRadius: 12, padding: '12px 16px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', boxShadow: '0 2px 12px rgba(79,106,245,.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, whiteSpace: 'nowrap' }}>
              {selected.size}{L.selectedUnit || '명'} {L.bulkEdit || '일괄 편집'}
            </span>
            <span style={{ fontSize: 11, color: T.muted }}>{L.bulkEditHint || '— 값 입력 후 적용'}</span>
          </div>
          <div style={{ width: 1, height: 28, background: T.border, flexShrink: 0 }} />
          {barCols.map((c) => {
            const val = barValues[c.id] ?? '';
            const active = val !== '';
            return (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: active ? T.accent : T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{c.label}</span>
                {c.type === 'select' ? (
                  <select value={val} onChange={(e) => setBarValues((prev) => ({ ...prev, [c.id]: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, fontFamily: T.font, border: `1.5px solid ${active ? T.accent : T.border}`, background: active ? '#EEF2FF' : T.bg, color: active ? T.text : T.muted, cursor: 'pointer', outline: 'none', minWidth: 100 }}>
                    <option value="">{L.bulkNoChange || '— 선택 안 함'}</option>
                    {/* 빈 값은 이 바에서 이미 "선택 안 함" 이다 — 컬럼이 빈 옵션을
                        갖고 있어도(매니저 미배정) 여기선 뺀다. 두면 같은 값이 두 줄로
                        보이고, 일괄 해제와 "안 바꿈" 을 구분할 수 없다. */}
                    {c.options.filter((o) => o !== '').map((o) => (
                      <option key={o} value={o}>
                        {optionLabel(c, o)}
                      </option>
                    ))}
                  </select>
                ) : c.type === 'date' ? (
                  <input type="date" value={val} onChange={(e) => setBarValues((prev) => ({ ...prev, [c.id]: e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, fontFamily: T.font, border: `1.5px solid ${active ? T.accent : T.border}`, background: active ? '#EEF2FF' : T.bg, color: active ? T.text : T.muted, outline: 'none' }} />
                ) : (
                  <input type="text" inputMode={c.type === 'currency' ? 'numeric' : undefined} value={val} placeholder={L.bulkNoInput || '입력 안 함'} onChange={(e) => setBarValues((prev) => ({ ...prev, [c.id]: c.type === 'currency' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value }))} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, fontFamily: T.font, border: `1.5px solid ${active ? T.accent : T.border}`, background: active ? '#EEF2FF' : T.bg, color: active ? T.text : T.muted, outline: 'none', width: 110, textAlign: c.type === 'currency' ? 'right' : 'left' }} />
                )}
              </div>
            );
          })}
          {/* 소속 «추가» — PW-373 · §3.8.3-B 「일괄 편집 바」.
              다른 필드와 달리 «값을 찍는» 것이 아니라 **더하는** 것이라 별도 버튼이다.
              교체·제거 선택지를 두지 않는 것이 이 칸의 요점이다. */}
          {onAppendAffiliations && orgUnitOptions.length > 0 && (
            <>
              <div style={{ width: 1, height: 28, background: T.border, flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {L.bulkOrgLabel || '소속'}
                </span>
                <button
                  type="button"
                  data-testid="sheet-bulk-org-append"
                  onClick={() => setBulkOrgOpen(true)}
                  disabled={bulkOrgBusy}
                  style={{ padding: '6px 12px', borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.bg, fontSize: 12, fontWeight: 600, color: T.sub, cursor: bulkOrgBusy ? 'wait' : 'pointer', fontFamily: T.font, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <IconPlusSmall size={12} />
                  {bulkOrgBusy ? (L.bulkOrgBusy || '추가 중…') : (L.bulkOrgAppend || '소속 추가')}
                </button>
              </div>
            </>
          )}
          <div style={{ width: 1, height: 28, background: T.border, flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            {barApplied ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                {/* 체크는 `✓`(U+2713) 글리프가 아니라 인라인 SVG — 폰트마다 굵기가
                    달라지고 색을 상속하지 않는다. 색은 감싸는 span 이 정한다. */}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#16A34A' }}>
                  <IconCheck size={13} />
                  {L.bulkApplied || '적용됨'}
                </span>
              </div>
            ) : (
              <button onClick={applyBar} disabled={barActiveCount === 0} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: barActiveCount === 0 ? T.bl : T.accent, color: barActiveCount === 0 ? T.muted : '#fff', fontSize: 12, fontWeight: 700, cursor: barActiveCount === 0 ? 'not-allowed' : 'pointer', fontFamily: T.font, whiteSpace: 'nowrap', boxShadow: barActiveCount > 0 ? '0 2px 8px rgba(79,106,245,.3)' : 'none' }}>
                {barActiveCount > 0 ? `${selected.size}${L.selectedUnit || '명'} ${L.bulkApply || '적용'} (${barActiveCount})` : L.bulkEnterValue || '값을 입력하세요'}
              </button>
            )}
            {barActiveCount > 0 && !barApplied && (
              <button onClick={() => setBarValues({})} style={{ padding: '4px 0', borderRadius: 6, border: 'none', background: 'transparent', fontSize: 10, color: T.muted, cursor: 'pointer', fontFamily: T.font, textAlign: 'center' }}>
                {L.bulkReset || '초기화'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 일괄 «소속 추가» 팝업 — 주 소속을 고르지 않는다(추가 전용, PW-373) */}
      {bulkOrgOpen && canEdit && onAppendAffiliations && orgUnitOptions.length > 0 && (
        <OrgTreePicker
          open
          units={orgUnitOptions}
          multi
          primarySelectable={false}
          selectedIds={[]}
          labels={L.orgPicker}
          subtitle={String(L.bulkOrgSubtitle || '선택 {count}명').split('{count}').join(String(selected.size))}
          onApply={(payload) => applyBulkOrgAppend(payload?.unitIds || [])}
          onClose={() => setBulkOrgOpen(false)}
        />
      )}

      {/* 테이블 */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '11px 16px', borderBottom: `1px solid ${T.bl}`, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
            {L.total || '전체'} <span style={{ color: T.accent, fontFamily: T.mono }}>{filtered.length}</span>
            {L.countUnit || '명'}
          </span>
          {/* 재직 인원 — 조직도 루트 카드와 **같은 기준**의 숫자. 어드민 목록은 퇴사자까지
              포함하므로 전체만 보이면 조직도와 어긋난 것처럼 읽힌다(QA: 250 vs 249). */}
          <span style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>
            {L.active || '재직'}{' '}
            <span style={{ fontFamily: T.mono }}>
              {filtered.filter((r) => r.employmentStatus !== 'terminated').length}
            </span>
            {L.countUnit || '명'}
          </span>
          {dirtyCount > 0 && <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>● {dirtyCount}{L.rowsUnit || '개'} {L.rowsChanging || '행 변경 중'}</span>}
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', minWidth: 0 }}>
            {/* 밀 여지가 있을 때만 뜨는 어포던스. 고정된 액션 칸의 그림자만으로는
                "여기가 끝이 아니다"를 처음 들어온 사람이 못 읽는다(PW-137). */}
            {scrollEdges.right && (
              <span
                data-testid="sheet-scroll-affordance"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
                  padding: '3px 9px', borderRadius: 999, border: `1px solid ${T.border}`,
                  background: T.bg, fontSize: 11, fontWeight: 700, color: T.sub, whiteSpace: 'nowrap',
                }}
              >
                {L.scrollMore || '옆으로 더 있음'}
                <IconArrowRight size={12} />
              </span>
            )}
            <span style={{ fontSize: 11, color: T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{L.hint || '셀 클릭하여 편집 · Tab 이동 · Enter 편집 종료 · Esc 취소'}</span>
          </span>
        </div>

        <div
          ref={scrollerRef}
          data-testid="sheet-scroller"
          style={{
            // 가로·세로 **둘 다** 이 상자 안에서만 흐른다. 가로만 열어 두면 세로는
            // 페이지가 밀려서, 정작 상자 바닥의 가로 막대가 화면 밖으로 나간다.
            overflow: 'auto',
            ...(boxMaxHeight ? { maxHeight: boxMaxHeight } : null),
          }}
        >
          {/* 고정 컬럼은 border-collapse: collapse 에서 경계선이 셀과 함께 안 붙는다.
              separate 로 바꾸고 행 구분선을 tr 에서 각 셀로 옮긴다 — 선 위치·색은 그대로다
              (separate 에서는 tr 에 준 border 가 아예 렌더되지 않는다). */}
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: CHECKBOX_W + COLUMNS.reduce((s, c) => s + c.width, 0) + ACTION_W }}>
            <thead>
              <tr style={{ background: T.bg }}>
                <th data-testid="sheet-head-select" style={{ width: CHECKBOX_W, padding: '10px 14px', borderBottom: `1px solid ${T.border}`, background: T.bg, ...stickyLeftCell(0), ...stickyHeadCorner }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: T.accent }} />
                </th>
                {COLUMNS.map((c, ci) => (
                  <th
                    key={c.id}
                    onClick={() => toggleSort(c.id)}
                    data-testid={`sheet-head-${c.id}`}
                    style={{
                      width: c.width, padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                      color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6,
                      borderBottom: `1px solid ${T.border}`, cursor: 'pointer', userSelect: 'none',
                      background: T.bg, whiteSpace: 'nowrap',
                      ...stickyHeadCell,
                      ...(ci === 0 ? { ...stickyLeftCell(CHECKBOX_W), ...leftEdgeDecor, ...stickyHeadCorner } : null),
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {c.label}
                      {sortCol === c.id && <span style={{ color: T.accent }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                ))}
                <th data-testid="sheet-head-actions" style={{ width: ACTION_W, padding: '10px 12px', borderBottom: `1px solid ${T.border}`, background: T.bg, position: 'sticky', right: 0, ...rightEdgeDecor, ...stickyHeadCorner }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, ri) => {
                const rowDirty = isRowDirty(row.id);
                const isSel = selected.has(row.id);
                const rowBg = isSel ? '#F5F7FF' : rowDirty ? DIRTY_ROW_BG : ri % 2 === 0 ? T.card : '#FAFBFC';
                const rowLine = `1px solid ${T.bl}`;
                /* 고정 셀은 tr 배경을 물려받지 못한다 — 자기 배경이 반투명하면 밑으로
                 * 지나가는 열이 그대로 비친다. 변경(앰버) 표시는 알파 색이라, **불투명
                 * 바탕(선택/줄무늬) 위에 같은 알파 색을 겹쳐** 칠한다. 합성 결과가
                 * 종전과 동일해 색은 안 바뀌고 투명도만 사라진다. */
                const stickyBase = isSel ? '#F5F7FF' : rowDirty ? T.card : ri % 2 === 0 ? T.card : '#FAFBFC';
                const rowWash = rowDirty && !isSel ? wash(DIRTY_ROW_BG) : null;
                const stickyBg = (cellDirty) => {
                  const layers = [cellDirty ? wash(DIRTY_CELL_BG) : null, rowWash].filter(Boolean);
                  return { backgroundColor: stickyBase, backgroundImage: layers.length ? layers.join(', ') : 'none' };
                };
                return (
                  <tr key={row.id} style={{ background: rowBg }}>
                    <td style={{ padding: '0 14px', textAlign: 'center', width: CHECKBOX_W, borderBottom: rowLine, ...stickyBg(false), ...stickyLeftCell(0) }}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleRow(row.id)} style={{ cursor: 'pointer', accentColor: T.accent }} />
                    </td>
                    {COLUMNS.map((c, ci) => {
                      const isEditing = editing?.rowId === row.id && editing?.colId === c.id;
                      const cellDirty = isDirty(row.id, c.id);
                      // 대표 행의 매니저 칸만 예외로 잠근다 — 조직 최상위는 상급자를
                      // 가질 수 없다(PW-292). 서버도 거부하지만, 열리는 셀을 두면
                      // 어드민이 고른 뒤 저장에서야 막힌다.
                      const editableCell =
                        canEdit && c.editable && !(c.id === 'managerId' && row.isCeo);
                      // 파생 컬럼(부서)은 편집 대신 관리 화면으로 보낸다 — 값을 바꾸는 곳이
                      // 어디인지 알려주지 않으면 읽기전용이 그냥 막힌 셀로만 보인다.
                      // 부서 셀: 조직 트리 팝업이 가능하면 그걸 우선한다(화면 이동은 폴백).
                      const canAssign =
                        c.derived
                        && canEdit
                        && (!!onChangeAffiliations || !!onAssignTeam)
                        && orgUnitOptions.length > 0;
                      const derivedJump = c.derived && canEdit && !canAssign && onManageTeams;
                      // 스쿼드 셀 — 핸들러가 없으면 편집 표면 자체가 없다(읽기 전용 표기만).
                      const canPickSquads = c.squadCell && canEdit && !!onChangeSquads;
                      return (
                        <td
                          key={c.id}
                          title={
                            c.derived
                              ? canAssign
                                ? L.assignTeamHint || '클릭해서 팀을 배정합니다'
                                : L.derivedDepartmentHint || '부서는 팀 배정에서 관리됩니다'
                              : canPickSquads
                                ? (L.squad?.cellHint || '클릭해서 스쿼드를 선택합니다')
                                : undefined
                          }
                          onClick={() => {
                            if (editableCell && !isEditing) startEdit(row.id, c.id);
                            else if (canAssign) setAssignRowId(row.id);
                            else if (canPickSquads) setSquadRowId(row.id);
                            else if (derivedJump) onManageTeams();
                          }}
                          style={{
                            // 겸직자는 소속 셀이 여러 줄이 된다. 고정 높이 대신 최소
                            // 높이를 주어 그 행만 늘어나게 하고, 다른 열은 top 정렬로
                            // 값을 첫 줄에 맞춘다 — "소속 셀만 두꺼워지는" 형태.
                            minHeight: ROW_H,
                            // 겸직 소속과 같은 이유로 스쿼드도 여러 줄이 된다 —
                            // 고정 높이를 주면 두 번째 스쿼드가 셀 밖으로 잘린다.
                            height: c.id === 'department' || c.squadCell ? undefined : ROW_H,
                            verticalAlign: 'top',
                            // 44px 행에 ~20px 컨텐츠라 top + 12px 는 기존 세로 중앙과
                            // 사실상 같은 위치다 — 겸직 없는 행은 시각이 바뀌지 않는다.
                            padding: isEditing ? 0 : '12px',
                            width: c.width,
                            cursor: editableCell ? 'text' : canAssign || derivedJump || canPickSquads ? 'pointer' : 'default',
                            borderLeft: cellDirty ? '2px solid #F59E0B' : 'none',
                            borderBottom: rowLine,
                            ...(ci === 0
                              ? (isEditing
                                ? { backgroundColor: '#fff', backgroundImage: 'none' }
                                : stickyBg(cellDirty))
                              : { background: isEditing ? '#fff' : cellDirty ? DIRTY_CELL_BG : 'transparent' }),
                            outline: isEditing ? `2px solid ${T.accent}` : 'none',
                            outlineOffset: -1,
                            ...(ci === 0 ? { ...stickyLeftCell(CHECKBOX_W), ...leftEdgeDecor } : null),
                          }}
                        >
                          {isEditing ? (
                            <EditCell col={c} row={row} value={row[c.id]} autoFocus onChange={(val) => updateCell(row.id, c.id, val)} onKeyDown={(e) => handleKeyDown(e, row.id, c.id)} />
                          ) : (
                            <CellDisplay
                              col={c}
                              row={row}
                              renderAvatar={renderAvatar}
                              ceoLabel={L.ceoBadge}
                              ceoNoManagerHint={L.ceoNoManagerHint}
                              managerFallbackHint={L.managerFallbackHint}
                              primaryLabel={L.primaryDeptBadge}
                              concurrentLabel={L.concurrentDeptCount}
                              orgTree={orgTree}
                              squadOptions={squadOptions}
                              squadLabels={L.squad || {}}
                              canEditSquads={canPickSquads}
                              onOpenSquads={() => setSquadRowId(row.id)}
                            />
                          )}
                        </td>
                      );
                    })}
                    <td
                      data-testid={`sheet-actions-${row.id}`}
                      style={{
                        padding: '0 8px', textAlign: 'center', borderBottom: rowLine,
                        ...stickyBg(false), position: 'sticky', right: 0, zIndex: 2,
                        ...rightEdgeDecor,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        {canViewSalary && onLoadSalaryHistory && (
                          <button onClick={() => setSalaryHistRowId(row.id)} title={L.salaryHistoryTitle || '연봉 이력'} aria-label={L.salaryHistoryTitle || '연봉 이력'} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.sub, fontFamily: T.font }}>
                            {/* 통화 글리프 `₩` 대신 인라인 SVG — 옆의 왕관(IconCrown)과 광학 크기가 맞는다. */}
                            <IconSalary size={14} />
                          </button>
                        )}
                        {onLoadHrProfile && (
                          <button onClick={() => setHrProfileRowId(row.id)} title={L.hrProfileTitle || 'HR 기록'} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.sub, fontSize: 10, fontWeight: 700, fontFamily: T.font }}>
                            HR
                          </button>
                        )}
                        {/* 대표 지정·해제. 권한이 없으면 콜백 자체가 주어지지 않아 버튼이
                            아예 안 보인다(정책 §6 — disabled 대신 미표시).
                            퇴사자는 지정 대상이 될 수 없어 disabled + 사유 툴팁(§7 E2). */}
                        {canEdit && (onAssignCeo || onReleaseCeo) && (() => {
                          const isCeoRow = row.isCeo === true;
                          const resigned = row.employmentStatus === 'terminated';
                          const disabled = !isCeoRow && resigned;
                          return (
                            <button
                              data-testid={`ceo-toggle-${row.id}`}
                              disabled={disabled}
                              onClick={() => setCeoConfirm({ rowId: row.id, mode: isCeoRow ? 'release' : 'assign' })}
                              title={
                                disabled
                                  ? (L.ceoResignedHint || '퇴사자는 대표로 지정할 수 없습니다')
                                  : isCeoRow
                                    ? (L.ceoRelease || '대표 지정 해제')
                                    : (L.ceoAssign || '대표로 지정')
                              }
                              style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${isCeoRow ? '#FDE68A' : T.border}`, background: isCeoRow ? '#FFFBEB' : T.bg, cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: disabled ? T.border : isCeoRow ? '#B45309' : T.muted }}
                            >
                              <IconCrown size={14} />
                            </button>
                          );
                        })()}
                        {canEdit && onDeleteMember && (
                          <button onClick={() => handleDelete(row.id)} title={L.delete || '삭제'} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 13, fontFamily: T.font }}>
                            ×
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 2} style={{ padding: '40px', textAlign: 'center', color: T.muted, fontSize: 13 }}>
                    {L.emptyResult || '검색 결과가 없습니다'}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={COLUMNS.length + 2} style={{ padding: '40px', textAlign: 'center', color: T.muted, fontSize: 13 }}>
                    {L.loading || '불러오는 중…'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.bl}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: T.muted }}>
            {L.total || '전체'} <strong>{rows.length}</strong>
            {L.countUnit || '명'} · {L.shown || '표시'} <strong>{filtered.length}</strong>
            {L.countUnit || '명'}
            {selected.size > 0 && (
              <>
                {' '}· {L.selectedShort || '선택'} <strong style={{ color: T.accent }}>{selected.size}</strong>
                {L.countUnit || '명'}
              </>
            )}
          </span>
        </div>
      </div>

      {/* 범례 */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(245,158,11,.15)', borderLeft: '2px solid #F59E0B' }} />
          <span style={{ fontSize: 11, color: T.muted }}>{L.legendChanged || '변경된 셀'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#F5F7FF', border: '1px solid #C7D2FE' }} />
          <span style={{ fontSize: 11, color: T.muted }}>{L.legendSelected || '선택된 행'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#EEF2FF', border: `1.5px solid ${T.accent}` }} />
          <span style={{ fontSize: 11, color: T.muted }}>{L.legendBulk || '일괄 편집 바 — 값 입력된 필드'}</span>
        </div>
      </div>

      {/* 소속 선택 트리 팝업 (PW-112) — 하위 조직까지 계층으로 보고 고른다 */}
      {assignRowId && canEdit && (onChangeAffiliations || onAssignTeam) && orgUnitOptions.length > 0 && (() => {
        const target = rows.find((r) => r.id === assignRowId) || {};
        // 겸직 초기 선택은 소속 칩이 들고 있는 조직 id 에서 읽는다 — 이름으로 맞추면
        // 동명이팀에서 틀린다. id 가 없는 레거시 행(텍스트 부서)은 선택이 비어 열린다.
        const chips = (target.depts || []).filter((d) => d.orgUnitId);
        const fallbackPrimary = primaryOrgEntry(orgTree, target.orgUnitIds)?.id ?? '';
        const selectedIds = chips.length > 0
          ? chips.map((d) => d.orgUnitId)
          : (fallbackPrimary ? [fallbackPrimary] : []);
        const primaryUnitId = chips.find((d) => d.isPrimary)?.orgUnitId || fallbackPrimary;
        // 선택에 안 나오는 배정 행 = 서버가 접은 상위 경로 (PW-404). 목록 뷰의 같은 팝업과
        // 같은 것을 말해야 한다 — 두 뷰가 다르면 어느 쪽이 맞는지 아무도 모른다.
        const pickedSet = new Set(selectedIds.map(String));
        const retainedIds = (Array.isArray(target.orgUnitIds) ? target.orgUnitIds : [])
          .map(String)
          .filter((id) => id && !pickedSet.has(id));
        return (
          <OrgTreePicker
            open
            units={orgUnitOptions}
            multi={!!onChangeAffiliations}
            selectedIds={selectedIds}
            primaryId={primaryUnitId}
            retainedIds={retainedIds}
            value={fallbackPrimary}
            subtitle={target.name}
            labels={L.orgPicker}
            /* 이 팝업에는 `[조직장으로]` 가 없다(§3.8.3-B). 목록 뷰의 같은 팝업과 생김새가
               완전히 같아서, 없다는 사실만 두면 고장으로 읽힌다 — 어디서 하는지 말해 준다.
               일괄 «소속 추가» 팝업(위)에는 넘기지 않는다: 거기는 소속을 더하는 자리지
               조직장을 다루는 자리가 아니다. (PW-422) */
            leaderHint={L.orgPicker?.leaderElsewhereHint || '조직장 지정은 목록 보기에서 합니다.'}
            onApply={(payload) => {
              if (onChangeAffiliations) onChangeAffiliations(assignRowId, payload);
              else onAssignTeam(assignRowId, payload);
            }}
            onClose={() => setAssignRowId(null)}
          />
        );
      })()}

      {/* 스쿼드 선택 팝업 (PW-113) — 계층이 없어 상태로 묶어 고른다(SQ9) */}
      {squadRowId && canEdit && onChangeSquads && squadOptions.length > 0 && (() => {
        const target = rows.find((r) => r.id === squadRowId) || {};
        // SQ10 교체 확인 문구용 — **대상 본인은 제외**한다. 자기 자신을 "기존 리드" 로
        // 보여주면 리드를 껐다 켜는 것만으로 "누구의 지정을 해제한다" 는 문구가 뜬다.
        const leadNames = {};
        for (const r of rows) {
          if (r.id === squadRowId) continue;
          for (const a of r.squads || []) {
            if (a.isLead) leadNames[a.squadId] = r.name;
          }
        }
        return (
          <SquadPicker
            open
            squads={squadOptions}
            memberName={target.name}
            value={target.squads || []}
            leadNameBySquadId={leadNames}
            labels={L.squad}
            onApply={(next) => onChangeSquads(squadRowId, next)}
            onClose={() => setSquadRowId(null)}
          />
        );
      })()}

      {/* 연봉 이력 모달 */}
      {salaryHistRowId && canViewSalary && (
        <SalaryHistoryModal
          row={rows.find((r) => r.id === salaryHistRowId)}
          labels={L}
          onLoad={onLoadSalaryHistory}
          onAdd={onAddSalaryHistory}
          onClose={() => setSalaryHistRowId(null)}
          onSalarySynced={(salary) => updateCell(salaryHistRowId, 'salary', salary ?? '')}
        />
      )}

      {/* HR 기록 모달 — 신원 정보는 onSaveIdentity 가 있을 때만 편집 가능 */}
      {hrProfileRowId && onLoadHrProfile && (
        <HrProfileModal
          row={rows.find((r) => r.id === hrProfileRowId)}
          labels={L}
          onLoad={onLoadHrProfile}
          onSaveIdentity={onSaveIdentity}
          onClose={() => setHrProfileRowId(null)}
        />
      )}

      {/* 대표(CEO) 지정·해제 확인 모달 */}
      {ceoConfirm && (
        <CeoConfirmModal
          row={rows.find((r) => r.id === ceoConfirm.rowId)}
          mode={ceoConfirm.mode}
          currentCeoName={(rows.find((r) => r.isCeo) || {}).name || ''}
          labels={L}
          positionOptions={positionOptions}
          onConfirm={(opts) =>
            ceoConfirm.mode === 'assign'
              ? onAssignCeo(ceoConfirm.rowId, opts)
              : onReleaseCeo(ceoConfirm.rowId)
          }
          onClose={() => setCeoConfirm(null)}
        />
      )}
    </div>
  );
}

/** 대표 지정/해제 확인 모달 — 정책 §4-A. 실패해도 닫지 않고 인라인 에러를 띄운다. */
function CeoConfirmModal({ row, mode, currentCeoName, labels, positionOptions = [], onConfirm, onClose }) {
  const L = labels || {};
  const assigning = mode === 'assign';
  // 체크박스는 isCeo 와 독립된 컬럼을 함께 설정할 뿐, 자동 연동이 아니다.
  const [alsoSetJobPosition, setAlsoSetJobPosition] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!row) return null;
  const name = row.name || '';
  // 조직 설정에서 '대표' 직책 옵션을 지웠으면 직책 체크박스를 쓸 수 없다(§4-A).
  const ceoPositionLabel = L.ceoPositionValue || '대표';
  const positionAvailable =
    positionOptions.length === 0 || positionOptions.includes(ceoPositionLabel);

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await onConfirm({ alsoSetJobPosition: alsoSetJobPosition && positionAvailable });
      onClose();
    } catch (e) {
      setError((e && e.message) || L.ceoErrorGeneric || '처리하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  const checkbox = (checked, onChange, label, disabled, hint) => (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: disabled ? T.muted : T.text, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      <input
        type="checkbox" checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2, accentColor: T.accent, cursor: disabled ? 'not-allowed' : 'pointer' }}
      />
      <span>
        {label}
        {hint && <span style={{ display: 'block', fontSize: 11, color: T.muted }}>{hint}</span>}
      </span>
    </label>
  );

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24, fontFamily: T.font }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div data-testid="ceo-confirm-modal" style={{ background: '#fff', borderRadius: 14, width: 'min(460px,100%)', boxShadow: '0 20px 60px rgba(0,0,0,.22)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px 10px', display: 'flex', alignItems: 'center', gap: 8, color: '#B45309' }}>
          <IconCrown size={18} />
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>
            {assigning
              ? (L.ceoAssignTitle || '{name}님을 대표로 지정합니다').replace('{name}', name)
              : (L.ceoReleaseTitle || '{name}님의 대표 지정을 해제합니다').replace('{name}', name)}
          </div>
        </div>
        <div style={{ padding: '0 22px 4px', fontSize: 12, color: T.sub, lineHeight: 1.7 }}>
          {assigning ? (
            <>
              <div>{L.ceoAssignBody || '이 구성원이 조직도의 최상위가 됩니다.'}</div>
              {currentCeoName && currentCeoName !== name && (
                <div data-testid="ceo-replace-note">
                  {(L.ceoAssignReplace || '현재 대표 {name}님의 지정은 해제됩니다.').replace('{name}', currentCeoName)}
                </div>
              )}
            </>
          ) : (
            <div>{L.ceoReleaseBody || '조직도 최상위가 비고, 이 구성원은 상급자 없는 상태가 됩니다. 권한과 직책은 자동으로 되돌리지 않습니다.'}</div>
          )}
        </div>

        {assigning && (
          <div style={{ margin: '14px 22px', padding: '12px 14px', border: `1px solid ${T.border}`, borderRadius: 8, background: T.bg, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {checkbox(
              alsoSetJobPosition && positionAvailable,
              setAlsoSetJobPosition,
              (L.ceoAlsoSetJobPosition || "직책을 '{value}'로 함께 변경").replace('{value}', ceoPositionLabel),
              !positionAvailable,
              positionAvailable ? null : (L.ceoPositionMissing || "직책 옵션에 '대표'가 없습니다 — 조직 설정에서 추가하세요."),
            )}
          </div>
        )}

        {assigning && (
          <div style={{ padding: '0 22px', fontSize: 11, color: T.muted, lineHeight: 1.8 }}>
            <div>· {L.ceoNoteManager || '대표는 상급자를 가질 수 없습니다.'}</div>
            <div>· {L.ceoNoteRole || '권한은 바뀌지 않습니다 — 권한 관리 화면에서 따로 조정하세요.'}</div>
            <div>· {L.ceoNoteHistory || '이 변경은 발령 이력에 기록됩니다.'}</div>
          </div>
        )}

        {error && (
          <div data-testid="ceo-modal-error" style={{ margin: '12px 22px 0', padding: '8px 12px', borderRadius: 6, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ padding: '16px 22px 18px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={busy} style={{ padding: '8px 16px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: T.sub, fontSize: 12, fontWeight: 700, fontFamily: T.font, cursor: busy ? 'not-allowed' : 'pointer' }}>
            {L.cancel || '취소'}
          </button>
          <button onClick={confirm} disabled={busy} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: busy ? T.border : assigning ? T.accent : '#DC2626', color: busy ? T.muted : '#fff', fontSize: 12, fontWeight: 700, fontFamily: T.font, cursor: busy ? 'not-allowed' : 'pointer' }}>
            {assigning ? (L.ceoAssignConfirm || '대표로 지정') : (L.ceoReleaseConfirm || '해제')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── HR 모달 표시 헬퍼(모듈 레벨 — render 내 컴포넌트 생성 금지) ──
function HrSection({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}
function HrPair({ k, v }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 12, padding: '3px 0' }}>
      <span style={{ minWidth: 88, color: T.muted }}>{k}</span>
      <span style={{ color: T.text }}>{v == null || v === '' ? '—' : v}</span>
    </div>
  );
}
function HrList({ items, render, empty }) {
  if (items.length === 0) {
    return <div style={{ fontSize: 12, color: T.muted, padding: '4px 0' }}>{empty}</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((it, i) => (
        <div key={it.id ?? i} style={{ fontSize: 12, color: T.text, padding: '7px 10px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8 }}>{render(it)}</div>
      ))}
    </div>
  );
}

// ── HR 기록 모달 (읽기 전용) ──────────────────────────────
// 어드민(HR)이 구성원의 신원·가족·부양가족·학력·경력·자격증·증빙을 조회한다.
// 편집은 향후(admin EditPanel) — 현재는 표출 전용. 입력은 본인 내 설정에서.
/**
 * 신원 정보 편집 필드 — 값이 없어도 입력할 수 있어야 한다.
 * 성별·국적은 본인 프로필에서 잠긴 인사 정보라(PW-25) 여기가 유일한 입력 경로다.
 */
function HrEditPair({ k, value, onChange, type = 'text', options }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 12, padding: '3px 0', alignItems: 'center' }}>
      <span style={{ minWidth: 88, color: T.muted }}>{k}</span>
      {options ? (
        <select
          className="admin-emp-input"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          aria-label={k}
          style={{ flex: 1, height: 30, fontSize: 12 }}
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          className="admin-emp-input"
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          aria-label={k}
          style={{ flex: 1, height: 30, fontSize: 12 }}
        />
      )}
    </div>
  );
}

/**
 * HR 기록 모달의 신원·인사 편집 필드. 렌더와 dirty 판정이 **같은 목록**을 본다 —
 * 갈라지면 값을 고쳐도 저장 버튼이 계속 비활성인 채로 남는다.
 * 수습 종료일·휴직 기간·병역은 PW-178 에서 더해졌다(대량 메시지 발송 대상 조건의
 * 저장 자리이며, 이 모달이 유일한 입력 경로다).
 */
const HR_IDENTITY_FIELDS = [
  'personalEmail',
  'birthDate',
  'gender',
  'nationality',
  'address',
  'probationEndDate',
  'leaveStartDate',
  'leaveEndDate',
  'militaryService',
];

/**
 * 병역 코드 → 라벨. 읽기 전용 표시에서 코드(`completed`)가 그대로 새어 나가지
 * 않게 한다. 목록에 없는 값은 그대로 통과시킨다(서버가 이미 라벨을 준 경우).
 */
function militaryLabel(value, options) {
  if (!value) return value;
  const list = options || MILITARY_OPTIONS;
  const hit = list.find((o) => o.value === value);
  return hit ? hit.label : value;
}

/** 병역 기본 선택지. 소비자가 L.hrMilitaryOptions 로 로케일 라벨을 덮는다. */
const MILITARY_OPTIONS = [
  { value: 'completed', label: '군필' },
  { value: 'unfulfilled', label: '미필' },
  { value: 'exempted', label: '면제' },
  { value: 'serving', label: '복무중' },
  { value: 'not_applicable', label: '해당없음' },
];

function HrProfileModal({ row, labels, onLoad, onSaveIdentity, onClose }) {
  const L = labels || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // 신원 정보 편집 draft — onSaveIdentity 가 없으면 읽기 전용(기존 동작).
  const [identityDraft, setIdentityDraft] = useState(null);
  const [identityState, setIdentityState] = useState('idle');

  useEffect(() => {
    // loading/error 초기값(true/false) — 모달은 열 때마다 새로 마운트되므로
    // effect 내 동기 setState 는 하지 않는다(react-hooks/set-state-in-effect 회피).
    let alive = true;
    Promise.resolve(onLoad(row?.id))
      .then((d) => { if (alive) setData(d); })
      .catch(() => { if (alive) setError(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [row?.id, onLoad]);

  const identity = data?.identity ?? {};
  // 서버 값이 들어오면 draft 를 한 번 시드한다(렌더 중 파생 — effect 불필요).
  const [seededId, setSeededId] = useState(null);
  if (data && seededId !== row?.id) {
    setSeededId(row?.id ?? null);
    setIdentityDraft({ ...identity });
    setIdentityState('idle');
  }
  const idDraft = identityDraft ?? identity;
  const setIdField = (key) => (v) => {
    setIdentityDraft((p) => ({ ...(p ?? identity), [key]: v }));
    setIdentityState('idle');
  };
  const identityDirty =
    !!identityDraft &&
    HR_IDENTITY_FIELDS.some(
      (k) => (identityDraft[k] ?? '') !== (identity[k] ?? ''),
    );
  const submitIdentity = () => {
    setIdentityState('saving');
    Promise.resolve(onSaveIdentity(row?.id, { ...idDraft }))
      .then((saved) => {
        // 서버가 돌려준 값이 정본 — 정규화(빈 문자열→null)를 화면에 반영한다.
        if (saved) setData((d) => ({ ...(d ?? {}), identity: saved }));
        setIdentityState('saved');
      })
      .catch(() => setIdentityState('error'));
  };

  const family = data?.family ?? {};
  const org = data?.org ?? {};
  const ec = family.emergencyContact ?? {};
  const deps = family.dependents ?? [];
  const relLabel = (r) => (L.hrRelation && L.hrRelation[r]) || r;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 520, maxHeight: '84vh', overflowY: 'auto', background: T.card, borderRadius: 16, padding: 22, fontFamily: T.font, boxShadow: '0 24px 64px rgba(0,0,0,.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{row?.name || ''} · {L.hrProfileTitle || 'HR 기록'}</div>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{L.hrProfileDesc || '본인·HR 전용 · 읽기 전용(입력은 본인 내 설정)'}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, color: T.muted, cursor: 'pointer' }}>×</button>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: T.muted, fontSize: 13 }}>{L.loading || '불러오는 중…'}</div>
        ) : error ? (
          <div style={{ padding: 24, textAlign: 'center', color: T.muted, fontSize: 13 }}>{L.hrProfileError || 'HR 기록을 불러오지 못했습니다.'}</div>
        ) : (
          <>
            <HrSection title={L.hrIdentity || '개인 신원'}>
              {onSaveIdentity ? (
                <div data-testid="hr-identity-edit">
                  <HrEditPair k={L.hrPersonalEmail || '개인 이메일'} type="email" value={idDraft.personalEmail} onChange={setIdField('personalEmail')} />
                  <HrEditPair k={L.hrBirthDate || '생년월일'} type="date" value={idDraft.birthDate} onChange={setIdField('birthDate')} />
                  <HrEditPair
                    k={L.hrGender || '성별'}
                    value={idDraft.gender}
                    onChange={setIdField('gender')}
                    options={L.hrGenderOptions || [{ value: 'male', label: '남성' }, { value: 'female', label: '여성' }, { value: 'other', label: '기타' }]}
                  />
                  <HrEditPair k={L.hrNationality || '국적'} value={idDraft.nationality} onChange={setIdField('nationality')} />
                  <HrEditPair k={L.hrAddress || '주소'} value={idDraft.address} onChange={setIdField('address')} />
                  <HrEditPair k={L.hrProbationEndDate || '수습 종료일'} type="date" value={idDraft.probationEndDate} onChange={setIdField('probationEndDate')} />
                  <HrEditPair k={L.hrLeaveStartDate || '휴직 시작일'} type="date" value={idDraft.leaveStartDate} onChange={setIdField('leaveStartDate')} />
                  <HrEditPair k={L.hrLeaveEndDate || '휴직 종료일'} type="date" value={idDraft.leaveEndDate} onChange={setIdField('leaveEndDate')} />
                  <HrEditPair
                    k={L.hrMilitaryService || '병역'}
                    value={idDraft.militaryService}
                    onChange={setIdField('militaryService')}
                    options={L.hrMilitaryOptions || MILITARY_OPTIONS}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    {identityState === 'error' && (
                      <span style={{ fontSize: 11, color: '#DC2626' }} role="alert">
                        {L.hrIdentitySaveError || '저장에 실패했습니다.'}
                      </span>
                    )}
                    {identityState === 'saved' && (
                      <span style={{ fontSize: 11, color: '#16A34A' }} role="status">
                        {L.hrIdentitySaved || '저장됐습니다'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={submitIdentity}
                      disabled={!identityDirty || identityState === 'saving'}
                      className="admin-btn-primary"
                      style={{ fontSize: 12, padding: '6px 14px', opacity: !identityDirty || identityState === 'saving' ? 0.5 : 1 }}
                    >
                      {identityState === 'saving' ? (L.hrIdentitySaving || '저장 중…') : (L.hrIdentitySave || '신원 정보 저장')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <HrPair k={L.hrPersonalEmail || '개인 이메일'} v={identity.personalEmail} />
                  <HrPair k={L.hrBirthDate || '생년월일'} v={identity.birthDate} />
                  <HrPair k={L.hrGender || '성별'} v={identity.gender} />
                  <HrPair k={L.hrNationality || '국적'} v={identity.nationality} />
                  <HrPair k={L.hrAddress || '주소'} v={identity.address} />
                  <HrPair k={L.hrProbationEndDate || '수습 종료일'} v={identity.probationEndDate} />
                  <HrPair k={L.hrLeaveStartDate || '휴직 시작일'} v={identity.leaveStartDate} />
                  <HrPair k={L.hrLeaveEndDate || '휴직 종료일'} v={identity.leaveEndDate} />
                  <HrPair
                    k={L.hrMilitaryService || '병역'}
                    v={militaryLabel(identity.militaryService, L.hrMilitaryOptions)}
                  />
                </>
              )}
            </HrSection>
            <HrSection title={L.hrFamily || '가족'}>
              <HrPair k={L.hrMarital || '혼인 여부'} v={family.maritalStatus} />
              <HrPair k={L.hrEmergency || '비상연락처'} v={[ec.name, ec.relation, ec.phone].filter(Boolean).join(' · ')} />
            </HrSection>
            <HrSection title={`${L.hrDependents || '부양가족'} (${deps.length})`}>
              <HrList items={deps} empty={L.hrDependentsEmpty || '등록된 부양가족이 없습니다.'} render={(d) => `${d.name} · ${relLabel(d.relation)}${d.dateOfBirth ? ` · ${d.dateOfBirth}` : ''} · ${d.isDependent ? (L.hrDep || '부양중') : (L.hrNotDep || '비부양')}`} />
            </HrSection>
            <HrSection title={`${L.hrEducation || '학력'} (${(org.education ?? []).length})`}>
              <HrList items={org.education ?? []} empty={L.hrEducationEmpty || '등록된 학력이 없습니다.'} render={(e) => [e.school, e.major, e.degree, `${e.from ?? ''}~${e.to ?? ''}`, e.status].filter(Boolean).join(' · ')} />
            </HrSection>
            <HrSection title={`${L.hrCareer || '경력'} (${(org.career ?? []).length})`}>
              <HrList items={org.career ?? []} empty={L.hrCareerEmpty || '등록된 경력이 없습니다.'} render={(c) => [c.company, c.department, c.role, `${c.from ?? ''}~${c.to ?? ''}`].filter(Boolean).join(' · ')} />
            </HrSection>
            <HrSection title={`${L.hrCert || '자격증'} (${(org.certifications ?? []).length})`}>
              <HrList items={org.certifications ?? []} empty={L.hrCertEmpty || '등록된 자격증이 없습니다.'} render={(c) => [c.name, c.issuer, c.issuedDate && `발급 ${c.issuedDate}`, c.expiryDate && `만료 ${c.expiryDate}`].filter(Boolean).join(' · ')} />
            </HrSection>
            <HrSection title={`${L.hrDocuments || '증빙서류'} (${(org.documents ?? []).length})`}>
              <HrList items={org.documents ?? []} empty={L.hrDocumentsEmpty || '첨부된 서류가 없습니다.'} render={(d) => [d.fileName, d.docType, d.uploadedAt].filter(Boolean).join(' · ')} />
            </HrSection>
          </>
        )}
      </div>
    </div>
  );
}

// ── 연봉 이력 모달 ──────────────────────────────────────
function SalaryHistoryModal({ row, labels, onLoad, onAdd, onClose, onSalarySynced }) {
  const L = labels || {};
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ effectiveDate: '', amount: '', reason: '' });
  const [busy, setBusy] = useState(false);
  // 날짜 picker 팝오버 앵커 — 열려 있으면 { rect, el }.
  const [picker, setPicker] = useState(null);
  const [addError, setAddError] = useState(false);

  useEffect(() => {
    // loading 초기값이 true — 모달은 열 때마다 새로 마운트되므로 여기서 다시
    // 동기 setState 하지 않는다(effect 내 synchronous setState 회피).
    let alive = true;
    Promise.resolve(onLoad?.(row.id))
      .then((h) => {
        if (alive) setHistory(Array.isArray(h) ? h : []);
      })
      .catch(() => {
        if (alive) setHistory([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [row.id, onLoad]);

  // ESC 로 닫기 — 같은 파일의 SalaryExportModal 과 같은 관례.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sorted = [...history].sort((a, b) => String(a.effectiveDate).localeCompare(String(b.effectiveDate)));
  const canAdd = form.effectiveDate && form.amount && !busy;

  async function add() {
    if (!canAdd || !onAdd) return;
    setBusy(true);
    setAddError(false);
    try {
      const res = await onAdd(row.id, { ...form });
      if (res?.history) setHistory(res.history);
      else setHistory((prev) => [...prev, { ...form }]);
      if (res && 'salary' in res) onSalarySynced?.(res.salary);
      setForm({ effectiveDate: '', amount: '', reason: '' });
    } catch {
      // 저장 실패를 삼키면 "눌렀는데 아무 일도 안 난다"가 된다. 전역 에러 화면으로
      // 튕기지 않고(입력이 날아간다) 폼 안에서 알린다 — 입력값은 그대로 남긴다.
      setAddError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-modal-root" role="dialog" aria-modal="true" data-testid="salary-history-modal">
      <div className="admin-modal-backdrop" onClick={onClose} />
      <div className="admin-modal">
        <div className="admin-modal-header">
          <div className="admin-modal-headline">
            <span className="admin-modal-headline-icon"><IconSalary size={17} /></span>
            <div>
              <div className="admin-modal-title">
                {row.name || (L.newEmployee || '신규 직원')} · {L.salaryHistoryTitle || '연봉 이력'}
              </div>
              <div className="admin-modal-desc">
                {L.salaryHistoryDesc || '적용일 기준 누적 이력 · 최신 이력이 현재 연봉으로 반영'}
                {/* 자물쇠는 이모지가 아니라 인라인 SVG — 색은 감싸는 span 의 color 를 따른다. */}
                <span className="admin-emp-sal-mask">
                  <IconLock size={11} />
                  {L.salaryHistoryMask || '권한별 마스킹'}
                </span>
              </div>
            </div>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label={L.close || '닫기'}>
            <IconClose size={16} />
          </button>
        </div>
        <div className="admin-modal-body">
          {loading ? (
            <div className="admin-emp-sal-status">{L.loading || '불러오는 중…'}</div>
          ) : sorted.length === 0 ? (
            <div className="admin-emp-sal-status">{L.salaryHistoryEmpty || '등록된 연봉 이력이 없습니다. 아래에서 추가하세요. (연봉은 비필수 항목입니다)'}</div>
          ) : (
            <table className="admin-emp-sal-table">
              <thead>
                <tr>
                  <th>{L.salaryHistEffDate || '적용일'}</th>
                  <th className="is-amount">{L.salaryHistAmount || '연봉'}</th>
                  <th>{L.salaryHistReason || '사유'}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((h, i) => {
                  const isLatest = i === sorted.length - 1;
                  return (
                    <tr key={i} className={isLatest ? 'is-current' : undefined}>
                      <td className="is-date">
                        {h.effectiveDate}
                        {isLatest && <span className="admin-emp-sal-current">{L.salaryHistCurrent || '현재'}</span>}
                      </td>
                      <td className="is-amount">{fmtKRW(h.amount)}</td>
                      <td>{h.reason || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div className="admin-emp-sal-add">
            <div className="admin-emp-sal-add-title">{L.salaryHistAdd || '연봉 이력 추가'}</div>
            <div className="admin-emp-sal-add-row">
              <div className="admin-emp-field">
                <label className="admin-emp-field-label" htmlFor="sal-hist-date">{L.salaryHistEffDate || '적용일'}</label>
                {/* 브라우저 기본 date 입력은 로케일에 따라 mm/dd/yyyy 로 떠서 한국어 화면과
                    어긋난다. 다른 어드민 화면과 같은 공용 DatePicker 를 연다. */}
                <button
                  type="button"
                  id="sal-hist-date"
                  className={`admin-emp-input admin-emp-sal-date${picker ? ' is-open' : ''}${form.effectiveDate ? '' : ' is-empty'}`}
                  onClick={(e) => setPicker(picker ? null : { rect: e.currentTarget.getBoundingClientRect(), el: e.currentTarget })}
                >
                  {form.effectiveDate || (L.salaryHistEffDatePh || 'YYYY-MM-DD')}
                </button>
              </div>
              <div className="admin-emp-field">
                <label className="admin-emp-field-label" htmlFor="sal-hist-amount">{L.salaryHistAmount || '연봉'}</label>
                <input
                  id="sal-hist-amount"
                  className="admin-emp-input admin-emp-sal-amount"
                  type="text"
                  inputMode="numeric"
                  placeholder={L.salaryHistAmountPh || '연봉(원)'}
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9]/g, '') }))}
                />
              </div>
              <div className="admin-emp-field is-reason">
                <label className="admin-emp-field-label" htmlFor="sal-hist-reason">{L.salaryHistReason || '사유'}</label>
                <input
                  id="sal-hist-reason"
                  className="admin-emp-input"
                  type="text"
                  placeholder={L.salaryHistReasonPh || '사유 (예: 연봉 조정/승진)'}
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </div>
              <button type="button" className="admin-emp-btn is-primary" onClick={add} disabled={!canAdd}>
                {L.salaryHistAddBtn || '추가'}
              </button>
            </div>
            {addError && (
              <div className="admin-emp-sal-error" role="alert">
                {L.salaryHistAddError || '연봉 이력을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'}
              </div>
            )}
            <div className="admin-emp-sal-note">{L.salaryHistNote || '적용일은 발령/조정 효력 시작일입니다. 요청일과 다를 수 있습니다(effective-date 기준).'}</div>
          </div>
        </div>
      </div>
      {picker && (
        <DatePicker
          anchorRect={picker.rect}
          anchorEl={picker.el}
          selectedDate={isoToDate(form.effectiveDate)}
          onSelect={(d) => { setForm((f) => ({ ...f, effectiveDate: dateToIso(d) })); setPicker(null); }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}

// 로컬 타임존 기준 'YYYY-MM-DD' (toISOString 의 UTC off-by-one 회피).
// AdminNotificationsCanvas 와 같은 구현 — 날짜 입력이 하루 밀리던 자리다.
function dateToIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function isoToDate(iso) {
  const [y, m, d] = (iso || '').split('-').map(Number);
  return y ? new Date(y, m - 1, d) : new Date();
}
