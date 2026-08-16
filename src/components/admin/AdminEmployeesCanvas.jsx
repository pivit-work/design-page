import { useState, useMemo, useRef, useEffect } from 'react';
import AvatarFallback from './AvatarFallback.jsx';
import Card from './Card.jsx';
import SectionLabel from './SectionLabel.jsx';
import AdminEmployeeSheetCanvas from './AdminEmployeeSheetCanvas.jsx';
import OrgTreePicker, { OrgPathLabel } from './OrgTreePicker.jsx';
import { buildOrgTree, primaryOrgEntry } from './orgTree.js';
import AdminInviteModal from './AdminInviteModal.jsx';
import {
  IconAlert, IconCheck, IconCheckmark, IconChevronDown, IconChevronRight, IconPlus,
} from './employeesIcons.jsx';

/**
 * AdminEmployeesCanvas — 어드민 "직원 관리" 화면 Pure 컴포넌트.
 * pivit-specs 의 admin-employees-view.jsx 시안을 design-page 정본으로 포팅.
 *
 * 시안 대비 차이 (pivit-work 데이터 모델에 맞춤):
 *  - "매니저" 는 조직장에서 자동 계산되는 읽기 전용 값 (managerName). 직접 배정 UI 없음.
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
  filters: { dept: '부서', level: '직급', manager: '매니저', status: '상태', all: '전체', reset: '필터 초기화' },
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
  unassignedPill: '미배정',
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
    teamNote: '※ 매니저는 조직장에서 자동 계산됩니다. 조직 구조 변경은 팀 관리 화면에서 진행됩니다.',
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
function RowActionMenu({ onEdit, onChangeManager, onDeactivate, onClose, labels, canEdit }) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="admin-emp-row-menu">
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

/* ── 탭 B: 미배정 관리 ──────────────────────────────────── */
function UnassignedTab({ members, orgUnits, labels, renderAvatar, onAssignOrgUnit, onManageTeams }) {
  const [pickerFor, setPickerFor] = useState(null);
  const orgTree = useMemo(() => buildOrgTree(orgUnits), [orgUnits]);

  const noOrg = members.filter((m) => !hasOrgUnit(m) && m.employmentStatus !== 'terminated');
  const noManager = members.filter((m) => hasOrgUnit(m) && !m.managerName && m.employmentStatus !== 'terminated');

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
          <span className="admin-emp-pill is-amber">{labels.unassignedPill} {noManager.length}{labels.countSuffix}</span>
        </div>
        {noManager.length === 0 ? (
          <div className="admin-emp-unassigned-empty is-ok"><IconCheck size={16} />{labels.unassigned.noManagerEmpty}</div>
        ) : (
          <div className="admin-emp-unassigned-list">
            {noManager.map((m) => (
              <div key={m.id} className="admin-emp-unassigned-row">
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
                <button type="button" className="admin-emp-btn is-soft is-sm" onClick={onManageTeams}>
                  {labels.unassigned.goTeamMgmt}<IconChevronRight size={13} />
                </button>
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
  loading = false,
  labels: providedLabels,
  canEdit = true,
  renderAvatar,
  onAssignOrgUnit,
  onCsvUpload,
  onManageTeams,
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
  onSaveMembers,
  onDeleteMember,
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
          onAssignCeo={onAssignCeo}
          onReleaseCeo={onReleaseCeo}
          // 스쿼드는 소속과 별도 축·별도 컬럼(SQ1). 원장이 비면 컬럼 자체가 안 뜬다.
          squadOptions={squadOptions}
          onChangeSquads={onChangeSquads}
          onExportRoster={onExportRoster}
          exporting={exporting}
          exportLabels={exportLabels}
        />
      ) : tab === 'unassigned' ? (
        <UnassignedTab
          members={members}
          orgUnits={orgUnits}
          labels={labels}
          renderAvatar={renderAvatar}
          onAssignOrgUnit={onAssignOrgUnit}
          onManageTeams={onManageTeams}
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
