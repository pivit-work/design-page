import { useState, useMemo, useRef, useEffect } from 'react';
import AvatarFallback from './AvatarFallback.jsx';
import Card from './Card.jsx';
import SectionLabel from './SectionLabel.jsx';
import AdminEmployeeSheetCanvas from './AdminEmployeeSheetCanvas.jsx';
import { narrowByParent } from './jobAxis.js';
import OrgTreePicker, { OrgPathLabel } from './OrgTreePicker.jsx';
import { buildOrgTree, findOrgEntry, primaryOrgEntry } from './orgTree.js';
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
  countSuffix: '명',
  // `dept` 는 «소속(기능조직)» 이다 — 구 «부서»·단일 select 는 폐기됐다(§3.8.1).
  /* 목록 뷰의 필터 칩 11종 (PW-400 · §3.1).
     🔴 정본 12종 중 「직종」(`job_category`)만 빠져 있다 — 이 코드베이스에 저장 컬럼이
        아직 없어서다. 없는 필드로 칩을 만들면 늘 0건인 축이 생긴다(E6). */
  filters: {
    dept: '소속(기능조직)',
    squad: '스쿼드',
    position: '직책',
    level: '직급',
    family: '직군',
    ladder: '직렬',
    duty: '직무',
    workLocation: '근무지',
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
  // 탭이 이 캔버스의 자체 표에서 `AdminEmployeeSheetCanvas` 위임으로 바뀌면서
  // (시트는 `sheetLabels` 라는 **별도 prop** 을 쓴다) 이 라벨들을 읽는 자리가
  // 전부 사라졌는데, 기본값만 남아 있었다.
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
  // 뷰 토글 · 목록 뷰 (PW-373) — `#104` 이전 라벨을 되살렸다. 자리가 다시 생겼으므로
  // 「그리는 자리가 먼저」 규칙을 지킨 복원이다.
  viewSwitch: { list: '목록', sheet: '스프레드시트', aria: '보기 전환' },
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
      jobFamily: '직군',
      /* ⚠ `jobTitle` 은 직무가 아니라 **직렬**이다(2026-08-10 M5-b). */
      jobTitle: '직렬',
      jobDuty: '직무',
      employmentType: '고용형태',
      employmentStatus: '재직상태',
      workLocation: '근무지',
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
    emailReadOnly: '로그인 키라 스프레드시트에서만 바꿉니다',
    level: '직급',
    position: '직책',
    joined: '입사일',
    none: '— 미지정 —',
    orgAssign: '소속',
    orgNone: '미배정',
    orgChange: '변경',
    managerSection: '매니저',
    managerWhere: '매니저 배정은 «미배정 관리» 탭에서 합니다',
    statusSection: '재직 상태',
    close: '닫기',
    cancel: '취소',
    save: '저장',
    saving: '저장 중…',
  },
  loading: '불러오는 중…',
  menu: { edit: '수정', changeManager: '조직 배정', deactivate: '비활성화' },
  status: {
    active: '재직', on_leave: '휴직', terminated: '퇴사', pending: '수습', other: '기타',
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
function StatusBadge({ status, labels }) {
  const known = ['active', 'on_leave', 'terminated', 'pending', 'other'];
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
function RowActionMenu({ onEdit, onChangeManager, onDeactivate, onClose, labels, canEdit, openUp = false }) {
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
function FilterDropdown({ label, value, options, onChange }) {
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

/* ── 뷰 토글 (PW-373) ──────────────────────────────────────
   정본 `admin-spec.md` §1.1 · §3.8 — 직원 관리는 **한 메뉴 안의 두 뷰**다.
   목록(단건 상세 편집) ↔ 스프레드시트(다건 일괄 편집).

   2026-07-19 정기미팅 [F] 는 «뷰 토글로 통합» 을 정했는데, 하루 뒤 구현(#104)이
   목록을 **삭제하고** 시트로 대체해 버렸다. 그 뒤 한 사람의 정보를 고치려는 사람도
   수십 행짜리 표에서 자기 행을 찾아야 했다. 여기서 목록을 되살리고 토글로 나란히 둔다. */
function EmployeesViewSwitch({ mode, onChange, labels }) {
  const options = [
    { id: 'list', label: labels.viewSwitch.list },
    { id: 'sheet', label: labels.viewSwitch.sheet },
  ];
  return (
    <div className="admin-emp-viewswitch" role="tablist" aria-label={labels.viewSwitch.aria}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={mode === o.id}
          data-testid={`employees-view-tab-${o.id}`}
          className={`admin-emp-viewswitch-btn${mode === o.id ? ' is-active' : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

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
 * 🔴 정본 시안에는 직종·직함·근무지(국가)·FTE·담당 HRBP·근무 일정처럼 이 코드베이스에
 *    저장 컬럼이 아직 없는 열이 함께 있다. 없는 필드로 열·필터를 만들면 늘 비어 있는
 *    칸이 생기고, 그건 「이 회사는 안 쓰는 값」 과 구분되지 않는다(E6 — 없는 필드는
 *    열도 필터도 만들지 않는다). 컬럼이 생기는 티켓에서 여기 한 줄씩 는다.
 */
const LIST_OPTIONAL_COLS = [
  { id: 'employeeCode', width: 100 },
  { id: 'nickname', width: 110 },
  { id: 'displayName', width: 130 },
  { id: 'phone', width: 130 },
  /** 직위 — 국내식 호칭(과장). 직급(`jobLevel` = Senior)과 별개 축이다(PW-400). */
  { id: 'jobRank', width: 90 },
  { id: 'workLocation', width: 110 },
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
}) {
  const [q, setQ] = useState('');
  const [dept, setDept] = useState(LIST_ALL);
  const [squad, setSquad] = useState(LIST_ALL);
  const [position, setPosition] = useState(LIST_ALL);
  const [level, setLevel] = useState(LIST_ALL);
  const [family, setFamily] = useState(LIST_ALL);
  const [ladder, setLadder] = useState(LIST_ALL);
  const [duty, setDuty] = useState(LIST_ALL);
  const [location, setLocation] = useState(LIST_ALL);
  const [empType, setEmpType] = useState(LIST_ALL);
  // ALL 은 `'all'` 이다 — 라벨을 sentinel 로 쓰면(옛 `'전체'`) 로케일을 바꾸는 순간
  // 「필터 안 걸림」 판정이 깨진다.
  const [mgrFilter, setMgrFilter] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState(null);
  // 행 액션 메뉴가 위로 열려야 하는가 — 아래 공간을 재서 정한다(아래 `openRowMenu`).
  const [menuUp, setMenuUp] = useState(false);
  const tableWrapRef = useRef(null);
  // 소속 팝업을 연 구성원 id. 조직장 지정([매니저로])이 사는 유일한 자리다(PW-400).
  const [deptPickerFor, setDeptPickerFor] = useState(null);
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
  const squadNamesOf = (m) => (Array.isArray(m.squads) ? m.squads : [])
    .map((s) => s.name || s.squadName)
    .filter(Boolean);

  const allLabel = labels.filters.all;
  const depts = useMemo(() => {
    const seen = new Set();
    for (const m of members) for (const n of deptNamesOf(m)) seen.add(n);
    return [
      { id: LIST_ALL, label: allLabel },
      ...[...seen].sort((a, b) => a.localeCompare(b, 'ko')).map((n) => ({ id: n, label: n })),
    ];
  }, [members, allLabel]);
  const squads = useMemo(() => {
    const seen = new Set();
    for (const m of members) for (const n of squadNamesOf(m)) seen.add(n);
    return [
      { id: LIST_ALL, label: allLabel },
      ...[...seen].sort((a, b) => a.localeCompare(b, 'ko')).map((n) => ({ id: n, label: n })),
    ];
  }, [members, allLabel]);
  const positions = useMemo(() => optionsOf(members, (m) => m.jobPosition, allLabel), [members, allLabel]);
  const levels = useMemo(() => optionsOf(members, (m) => m.jobLevel, allLabel), [members, allLabel]);
  const locations = useMemo(() => optionsOf(members, (m) => m.workLocation, allLabel), [members, allLabel]);
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

  const statusOpts = [
    { id: 'all', label: labels.filters.all },
    { id: 'active', label: labels.status.active },
    { id: 'pending', label: labels.status.pending },
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
          const hay = `${m.name || ''} ${m.email || ''} ${names.join(' ')}`.toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        if (dept !== LIST_ALL && !names.includes(dept)) return false;
        if (squad !== LIST_ALL && !squadNamesOf(m).includes(squad)) return false;
        if (position !== LIST_ALL && m.jobPosition !== position) return false;
        if (level !== LIST_ALL && m.jobLevel !== level) return false;
        if (family !== LIST_ALL && m.jobFamily !== family) return false;
        if (ladder !== LIST_ALL && m.jobTitle !== ladder) return false;
        if (duty !== LIST_ALL && m.jobDuty !== duty) return false;
        if (location !== LIST_ALL && m.workLocation !== location) return false;
        if (empType !== LIST_ALL && m.employmentType !== empType) return false;
        if (mgrFilter === 'assigned' && !m.managerName) return false;
        // 대표는 상급자를 가질 수 없으므로 「매니저 미배정」 대상이 아니다 — 넣으면
        // 영원히 처리되지 않는 한 건이 목록에 남는다.
        if (mgrFilter === 'unassigned' && (m.managerName || m.isCeo)) return false;
        if (status !== 'all' && m.employmentStatus !== status) return false;
        return true;
      }),
    [members, q, dept, squad, position, level, family, ladder, duty, location, empType, mgrFilter, status],
  );

  // 대표 행은 필터·정렬과 무관하게 최상단 고정 (§3.1).
  const ordered = useMemo(
    () => [...filtered].sort((a, b) => (b.isCeo ? 1 : 0) - (a.isCeo ? 1 : 0)),
    [filtered],
  );

  const totalPages = Math.max(1, Math.ceil(ordered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = ordered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasFilter = q || dept !== LIST_ALL || squad !== LIST_ALL || position !== LIST_ALL
    || level !== LIST_ALL || family !== LIST_ALL || ladder !== LIST_ALL || duty !== LIST_ALL
    || location !== LIST_ALL || empType !== LIST_ALL || mgrFilter !== 'all' || status !== 'all';

  function resetFilters() {
    setQ(''); setDept(LIST_ALL); setSquad(LIST_ALL); setPosition(LIST_ALL); setLevel(LIST_ALL);
    setFamily(LIST_ALL); setLadder(LIST_ALL); setDuty(LIST_ALL); setLocation(LIST_ALL);
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
  const optOn = (id) => optCols[id] !== false && (id !== 'salary' || canViewSalary);
  const cols = [
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
    { id: 'jobFamily', label: cl.jobFamily, width: 100 },
    { id: 'jobTitle', label: cl.jobTitle, width: 120 },
    { id: 'jobDuty', label: cl.jobDuty, width: 140 },
    { id: 'employmentType', label: cl.employmentType, width: 100 },
    { id: 'employmentStatus', label: cl.employmentStatus, width: 100 },
    ...(optOn('workLocation') ? [{ id: 'workLocation', label: cl.workLocation, width: 110 }] : []),
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

  const optionalForMenu = LIST_OPTIONAL_COLS.filter((c) => c.id !== 'salary' || canViewSalary);

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
      case 'name':
        return (
          <button type="button" className="admin-emp-cell-name" onClick={() => onOpenEdit(m)}>
            {renderAvatar ? renderAvatar(m, 28) : <AvatarFallback row={m} size={28} />}
            <span className="admin-emp-cell-name-text">
              {m.displayName || m.name}
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
        const names = squadNamesOf(m);
        return names.length ? <TextCell value={names.join(', ')} /> : <Dash />;
      }
      case 'jobPosition': return <TextCell value={m.jobPosition} />;
      case 'jobLevel': return <TextCell value={m.jobLevel} />;
      case 'jobRank': return <TextCell value={m.jobRank} />;
      case 'jobFamily': return <TextCell value={m.jobFamily} />;
      case 'jobTitle': return <TextCell value={m.jobTitle} />;
      case 'jobDuty': return <TextCell value={m.jobDuty} />;
      case 'employmentType': return <TextCell value={m.employmentType} />;
      case 'employmentStatus': return <StatusBadge status={m.employmentStatus} labels={labels} />;
      case 'workLocation': return <TextCell value={m.workLocation} />;
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
          <ColumnMenu cols={optionalForMenu} value={optCols} onChange={setOptCols} labels={labels} />
          {canEdit && onCsvUpload && (
            <button type="button" className="admin-emp-btn is-ghost" onClick={onCsvUpload}>{labels.csvUpload}</button>
          )}
          {canEdit && onInvite && (
            <button type="button" className="admin-emp-btn is-primary" onClick={onInvite}><IconPlus size={14} />{labels.invite}</button>
          )}
        </div>
      </div>

      <div className="admin-emp-filterbar">
        <FilterDropdown label={labels.filters.dept} value={dept} options={depts} onChange={(v) => { setDept(v); setPage(1); }} />
        <FilterDropdown label={labels.filters.squad} value={squad} options={squads} onChange={(v) => { setSquad(v); setPage(1); }} />
        <FilterDropdown label={labels.filters.position} value={position} options={positions} onChange={(v) => { setPosition(v); setPage(1); }} />
        <FilterDropdown label={labels.filters.level} value={level} options={levels} onChange={(v) => { setLevel(v); setPage(1); }} />
        <FilterDropdown label={labels.filters.family} value={family} options={families} onChange={changeFamily} />
        <FilterDropdown label={labels.filters.ladder} value={ladder} options={ladders} onChange={changeLadder} />
        <FilterDropdown label={labels.filters.duty} value={duty} options={duties} onChange={(v) => { setDuty(v); setPage(1); }} />
        <FilterDropdown label={labels.filters.workLocation} value={location} options={locations} onChange={(v) => { setLocation(v); setPage(1); }} />
        <FilterDropdown label={labels.filters.employmentType} value={empType} options={empTypes} onChange={(v) => { setEmpType(v); setPage(1); }} />
        <FilterDropdown label={labels.filters.manager} value={mgrFilter} options={mgrOpts} onChange={(v) => { setMgrFilter(v); setPage(1); }} />
        <FilterDropdown label={labels.filters.status} value={status} options={statusOpts} onChange={(v) => { setStatus(v); setPage(1); }} />
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
                <th key={c.id} style={{ width: c.width }} scope="col">{c.label}</th>
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
 * 슬라이드오버 단건 편집 패널 — 목록 뷰의 «단건 상세 편집» (§3.2).
 *
 * 저장은 시트와 **같은 patch 계약**(`onSaveMembers([{ id, ...changed }])`)을 쓴다.
 * 소속도 시트와 **같은 배열 원자 치환**(`onChangeAffiliations`)을 탄다 — 두 뷰가 같은
 * 값을 다른 계약으로 쓰면 한쪽이 다른 쪽을 덮어쓴다.
 *
 * 이메일은 **읽기 전용**이다. 로그인 키라 확인 모달이 따라붙는데(§3.2-A), 그 경로의
 * 정본은 시트다. 여기에 두 번째 진입점을 만들면 확인 절차가 갈린다.
 */
function EmployeesEditPanel({
  member, orgUnits, labels, renderAvatar, canEdit,
  gradeOptions, positionOptions, onClose, onSave, onChangeAffiliations,
}) {
  const [draft, setDraft] = useState(member);
  const [syncedId, setSyncedId] = useState(member?.id);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // 다른 사람을 열면 draft 를 그 사람으로 갈아끼운다. 같은 사람이면 편집 중인 값을
  // 유지한다 — members 가 재조회될 때마다 입력이 되돌아가면 타이핑을 못 한다.
  if (member && syncedId !== member.id) {
    setSyncedId(member.id);
    setDraft(member);
    setPickerOpen(false);
  }

  const orgTree = useMemo(() => buildOrgTree(orgUnits), [orgUnits]);

  if (!member) return null;
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const statusOrder = ['active', 'pending', 'on_leave', 'terminated'];
  // 소속 팝업의 초기 선택 — 칩이 든 조직 id 가 정본, 없으면 orgUnitIds 폴백.
  const chips = (member.depts || []).filter((d) => d.orgUnitId);
  const fallbackPrimary = primaryOrgEntry(orgTree, member.orgUnitIds)?.id ?? '';
  const selectedIds = chips.length > 0 ? chips.map((d) => d.orgUnitId) : (fallbackPrimary ? [fallbackPrimary] : []);
  const primaryUnitId = chips.find((d) => d.isPrimary)?.orgUnitId || fallbackPrimary;
  /* 목록 행 팝업과 같은 계산 — 두 자리가 다른 말을 하면 안 된다 (PW-404). */
  const retainedIds = retainedOrgIds(member, selectedIds);
  const primaryEntry = primaryUnitId ? findOrgEntry(orgTree, primaryUnitId) : null;

  /** 바뀐 칸만 담은 patch — 시트의 dirty → patch 와 같은 모양이다. */
  function buildPatch() {
    const patch = { id: draft.id };
    for (const f of ['name', 'jobLevel', 'jobPosition', 'hireDate', 'employmentStatus']) {
      if ((draft[f] ?? '') !== (member[f] ?? '')) patch[f] = draft[f] ?? '';
    }
    return patch;
  }
  const patch = buildPatch();
  const dirty = Object.keys(patch).length > 1;

  async function handleSave() {
    if (!dirty) { onClose(); return; }
    setSaving(true);
    try {
      await onSave([patch]);
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

        <div className="admin-emp-panel-body">
          <SectionLabel>{labels.panel.basicInfo}</SectionLabel>
          <div className="admin-emp-field-group">
            <label className="admin-emp-field">
              <span className="admin-emp-field-label">{labels.panel.name}</span>
              <input className="admin-emp-input" value={draft.name || ''} disabled={!canEdit} onChange={(e) => set('name', e.target.value)} />
            </label>
            <label className="admin-emp-field">
              <span className="admin-emp-field-label">{labels.panel.email}</span>
              {/* 로그인 키 — 이 화면에서 고치지 않는다(§3.2-A, 확인 모달은 시트가 정본) */}
              <input className="admin-emp-input" value={draft.email || ''} readOnly disabled />
              <span className="admin-emp-manager-note">{labels.panel.emailReadOnly}</span>
            </label>
            <label className="admin-emp-field">
              <span className="admin-emp-field-label">{labels.panel.level}</span>
              {gradeOptions.length > 0 ? (
                <select className="admin-emp-input" value={draft.jobLevel || ''} disabled={!canEdit} onChange={(e) => set('jobLevel', e.target.value)}>
                  <option value="">{labels.panel.none}</option>
                  {gradeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className="admin-emp-input" value={draft.jobLevel || ''} disabled={!canEdit} onChange={(e) => set('jobLevel', e.target.value)} />
              )}
            </label>
            <label className="admin-emp-field">
              <span className="admin-emp-field-label">{labels.panel.position}</span>
              {positionOptions.length > 0 ? (
                <select className="admin-emp-input" value={draft.jobPosition || ''} disabled={!canEdit} onChange={(e) => set('jobPosition', e.target.value)}>
                  <option value="">{labels.panel.none}</option>
                  {positionOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className="admin-emp-input" value={draft.jobPosition || ''} disabled={!canEdit} onChange={(e) => set('jobPosition', e.target.value)} />
              )}
            </label>
            <label className="admin-emp-field">
              <span className="admin-emp-field-label">{labels.panel.joined}</span>
              <input type="date" className="admin-emp-input" value={(draft.hireDate || '').slice(0, 10)} disabled={!canEdit} onChange={(e) => set('hireDate', e.target.value)} />
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
        </div>

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
      </div>
    </>
  );
}

export default function AdminEmployeesCanvas({
  members = [],
  orgUnits = [],
  invites = [],
  initialTab,
  // 전체 구성원 탭 시트의 초기 검색어(딥링크용) — 개요에서 특정 인원 클릭 시 사용.
  initialSearch = '',
  /**
   * 목록 보기 상태 되살리기 (PW-157) — 전체 구성원 탭 시트로 그대로 내려간다.
   * `onTabChange` 는 탭을 옮길 때마다 부른다(딥링크의 `initialTab` 과 짝이다).
   */
  initialFilters,
  initialSort,
  onViewStateChange,
  onTabChange,
  /**
   * 「전체 구성원」 탭의 뷰 (PW-373) — `'list'`(목록) | `'sheet'`(스프레드시트).
   *
   * 정본 `admin-spec.md §1.1 · §3.8` 은 직원 관리를 **한 메뉴 두 뷰**로 정의한다.
   * 어느 뷰를 보고 있었는지는 소비자가 URL·저장된 상태로 들고 있을 수 있게
   * `onViewModeChange` 로 알린다.
   */
  initialViewMode = 'sheet',
  onViewModeChange,
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
  onManageTeams,
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
  /** `{ jobLevel: [], jobFamily: [], jobTitle: [], workLocation: [] }` */
  fieldOptions,
  /** 초대 모달 문구 — i18n 은 소비자(pivit-work)가 소유한다. */
  inviteLabels,
  /** 좌석 부족 배너의 `결제·구독` 이동. */
  onGoBilling,
  /** 딥링크 `?invite=new` 로 모달이 열린 상태로 진입(§1 URL). */
  initialInviteOpen = false,
  onResendInvite,
  onCancelInvite,
  onCopyInviteLink,
  // 전체 구성원 탭(스프레드시트) 배선 — 직원 일괄 편집이 여기로 통합됨.
  sheetLabels,
  canViewSalary = false,
  gradeOptions,
  positionOptions,
  // 직군 > 직렬 > 직무 3단 축 — 시트로 그대로 내려간다(PW-323). 여기서 빠뜨리면
  // 세 컬럼이 카탈로그 없는 자유 텍스트로 폴백해, 좁히기도 드롭다운도 사라진다.
  jobAxis,
  onSaveMembers,
  onDeleteMember,
  /** 일괄 «소속 추가» — 스프레드시트 뷰의 일괄 편집 바로 그대로 내려간다(PW-373). */
  onAppendAffiliations,
  onLoadSalaryHistory,
  onAddSalaryHistory,
  onLoadHrProfile,
  // 시트가 HR 모달을 렌더하므로 여기서 함께 내려줘야 신원 편집이 열린다(PW-25).
  onSaveIdentity,
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
  const labels = useMemo(() => merge(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [tab, setTab] = useState(
    ['members', 'unassigned', 'invites'].includes(initialTab) ? initialTab : 'members',
  );
  // 「전체 구성원」 탭의 두 뷰 (PW-373). 목록 ↔ 스프레드시트.
  const [viewMode, setViewMode] = useState(initialViewMode === 'list' ? 'list' : 'sheet');
  /**
   * **한 번 마운트한 뷰는 다시 언마운트하지 않는다** (§3.8.3-B B5).
   *
   * 조건부 렌더로 갈아끼우면 토글 한 번에 미저장 변경이 되돌릴 경고 없이 사라진다.
   * 다만 **처음부터 둘 다** 그리지는 않는다 — 한 번도 열지 않은 뷰는 아직 잃을 값이
   * 없고, 수백 행짜리 표를 두 벌 그리는 값을 사람이 보지도 않은 채 치르게 된다.
   * 한 번이라도 연 뒤로는 계속 살아 있으므로 B5 는 양방향으로 성립한다.
   */
  const [mountedViews, setMountedViews] = useState(
    () => new Set([initialViewMode === 'list' ? 'list' : 'sheet']),
  );
  // 목록 뷰에서 편집 패널이 열린 구성원 id. 패널은 두 뷰 **바깥**에 그린다 —
  // 감춰진 뷰 안에 두면 시트로 토글했을 때 패널까지 `hidden` 에 함께 묻힌다.
  const [editMemberId, setEditMemberId] = useState(null);
  const goView = (id) => {
    setMountedViews((prev) => (prev.has(id) ? prev : new Set([...prev, id])));
    setViewMode(id);
    onViewModeChange?.(id);
  };
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
        <>
          <EmployeesViewSwitch mode={viewMode} onChange={goView} labels={labels} />
          {/* 🔴 두 뷰를 **동시에 마운트**한다(§3.8.3-B B5). 조건부 렌더로 갈아끼우면
              토글 한 번에 미저장 변경이 되돌릴 경고 없이 사라진다. 감춘 쪽은
              `hidden` 이라 접근성 트리·탭 이동에서도 함께 빠진다. */}
          {mountedViews.has('list') && (
          <div hidden={viewMode !== 'list'} data-testid="employees-view-list">
            <EmployeesListView
              members={members}
              orgUnits={orgUnits}
              labels={labels}
              canEdit={canEdit}
              pageSize={pageSize}
              renderAvatar={renderAvatar}
              // 직군>직렬>직무 좁히기는 시트와 **같은 축**을 쓴다 — 한쪽만 다른 카탈로그를
              // 읽으면 두 뷰에서 고를 수 있는 값이 갈린다.
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
            />
          </div>
          )}
          {mountedViews.has('sheet') && (
          <div hidden={viewMode !== 'sheet'} data-testid="employees-view-sheet">
        <AdminEmployeeSheetCanvas
          embedded
          initialSearch={initialSearch}
          initialFilters={initialFilters}
          initialSort={initialSort}
          onViewStateChange={onViewStateChange}
          members={members}
          labels={sheetLabels}
          canViewSalary={canViewSalary}
          gradeOptions={gradeOptions}
          positionOptions={positionOptions}
          jobAxis={jobAxis}
          canEdit={canEdit}
          renderAvatar={renderAvatar}
          onSaveMembers={onSaveMembers}
          onDeleteMember={onDeleteMember}
          onLoadSalaryHistory={onLoadSalaryHistory}
          onAddSalaryHistory={onAddSalaryHistory}
          onLoadHrProfile={onLoadHrProfile}
          onSaveIdentity={onSaveIdentity}
          onAddEmployee={onCsvUpload}
          // [PW-114] 탭 A 의 `+ 구성원 초대` — 탭 C 와 **같은 모달**을 연다.
          // 종전에는 이 버튼이 없어서, 온보딩을 끝낸 워크스페이스는 사람을 더
          // 초대하려면 초대 관리 탭까지 들어가야 했다(그마저도 데모였다).
          onInviteMember={canInvite ? openInvite : undefined}
          inviteLabel={labels.invite}
          onManageTeams={onManageTeams}
          // 부서 셀에서 바로 팀을 고를 수 있게 — 미배정 탭과 같은 배정 핸들러를 쓴다(PW-23).
          orgUnitOptions={orgUnits}
          onAssignTeam={onAssignOrgUnit}
          // 소속 셀의 정본 경로 — 배열 치환(PW-368). 주어지면 팝업이 다중 선택으로 열린다.
          onChangeAffiliations={onChangeAffiliations}
          onAssignCeo={onAssignCeo}
          onReleaseCeo={onReleaseCeo}
          // 스쿼드는 소속과 별도 축·별도 컬럼(SQ1). 원장이 비면 컬럼 자체가 안 뜬다.
          squadOptions={squadOptions}
          onChangeSquads={onChangeSquads}
          onExportRoster={onExportRoster}
          exporting={exporting}
          exportLabels={exportLabels}
          // 일괄 «소속 추가» — 추가 전용이다(PW-373 · §3.8.3-B 「일괄 편집 바」).
          onAppendAffiliations={onAppendAffiliations}
        />
          </div>
          )}
        </>
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
          />
        );
      })()}

      {/* 초대 발송 모달 — 탭 A·탭 C 두 진입점이 **공유**한다(§1).
          직급 선택지는 캔버스가 이미 받는 `gradeOptions` 를 기본으로 쓰고,
          직군·직무·근무지는 `fieldOptions` 로 받는다. */}
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
          onGoBilling={onGoBilling}
          labels={inviteLabels}
        />
      )}
    </div>
  );
}
