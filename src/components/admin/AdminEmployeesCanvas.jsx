import { useState, useMemo, useRef, useEffect } from 'react';
import AvatarFallback from './AvatarFallback.jsx';
import Card from './Card.jsx';
import SectionLabel from './SectionLabel.jsx';
import AdminEmployeeSheetCanvas from './AdminEmployeeSheetCanvas.jsx';

/* ── 인라인 라인 아이콘 ──────────────────────────────────────
 * emoji/타이포 글리프(⚠️ ✓ × ⋯ ▾ ← →) 대체. design-page 의 클린
 * 라인 아이콘 톤(stroke 2, round cap/join)에 맞춘 self-contained SVG.
 * 색은 currentColor 상속 → 버튼/배지 톤을 그대로 따른다.
 * ------------------------------------------------------------ */
function strokeProps(size) {
  return {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round',
    strokeLinejoin: 'round', 'aria-hidden': true, focusable: false,
    style: { display: 'block', flexShrink: 0 },
  };
}
const IconAlert = ({ size = 18 }) => (
  <svg {...strokeProps(size)}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const IconCheck = ({ size = 16 }) => (
  <svg {...strokeProps(size)}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const IconX = ({ size = 16 }) => (
  <svg {...strokeProps(size)}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
const IconMore = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable={false} style={{ display: 'block', flexShrink: 0 }}>
    <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
  </svg>
);
const IconChevronDown = ({ size = 14 }) => (
  <svg {...strokeProps(size)}><polyline points="6 9 12 15 18 9" /></svg>
);
const IconChevronLeft = ({ size = 14 }) => (
  <svg {...strokeProps(size)}><polyline points="15 18 9 12 15 6" /></svg>
);
const IconChevronRight = ({ size = 14 }) => (
  <svg {...strokeProps(size)}><polyline points="9 18 15 12 9 6" /></svg>
);
const IconPlus = ({ size = 14 }) => (
  <svg {...strokeProps(size)}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const IconSearch = ({ size = 15 }) => (
  <svg {...strokeProps(size)}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
);
const IconCheckmark = ({ size = 15 }) => (
  <svg {...strokeProps(size)}><polyline points="20 6 9 17 4 12" /></svg>
);

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
  search: '이름 / 이메일 / 부서 검색',
  countSuffix: '명',
  filters: { dept: '부서', level: '직급', manager: '매니저', status: '상태', all: '전체', reset: '필터 초기화' },
  managerFilter: { all: '전체', assigned: '배정됨', unassigned: '미배정' },
  csvUpload: 'CSV 업로드',
  invite: '구성원 초대',
  unassignedPill: '미배정',
  assignManager: '조직 배정',
  cols: { name: '이름', email: '이메일', dept: '부서', level: '직급', manager: '매니저', joined: '입사일', status: '상태' },
  edit: '수정',
  emptyFiltered: '조건에 맞는 구성원이 없습니다.',
  loading: '불러오는 중…',
  pagination: { prev: '이전', next: '다음', of: '/' },
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
    composerEmail: '초대할 이메일', composerRole: '권한', composerSend: '발송', composerCancel: '취소',
    colEmail: '이메일', colInviter: '발송자', colSentAt: '발송일시', colStatus: '상태', colActions: '액션',
    copyLink: '링크 복사', resend: '재발송', cancel: '취소',
    statusPending: '대기중', statusAccepted: '수락됨', statusExpired: '만료됨',
    empty: '해당 상태의 초대가 없습니다.',
    linkType: '링크',
  },
  picker: { search: '조직 검색…', empty: '검색 결과 없음', none: '조직 없음' },
  panel: {
    basicInfo: '기본 정보',
    name: '이름', email: '이메일', level: '직급', joined: '입사일',
    orgAssign: '조직 배정', orgNone: '조직 미배정', orgChange: '변경',
    managerSection: '매니저', managerAuto: '조직장에서 자동 계산',
    statusSection: '재직 상태',
    cancel: '취소', save: '저장',
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

/* ── 조직 선택 드롭다운 (검색 가능) ─────────────────────── */
function OrgUnitPicker({ orgUnits, onSelect, onClose, labels }) {
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const candidates = orgUnits.filter(
    (u) => q === '' || u.name.includes(q) || (u.path || '').includes(q),
  );

  return (
    <div ref={ref} className="admin-emp-picker">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={labels.picker.search}
        className="admin-emp-picker-search"
      />
      <div className="admin-emp-picker-list">
        {candidates.length === 0 ? (
          <div className="admin-emp-picker-empty">{labels.picker.empty}</div>
        ) : (
          candidates.map((u) => (
            <button
              key={u.id}
              type="button"
              className="admin-emp-picker-item"
              onClick={() => onSelect(u.id)}
            >
              <span className="admin-emp-picker-item-name">{u.name}</span>
              {u.path && <span className="admin-emp-picker-item-path">{u.path}</span>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

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
                    <OrgUnitPicker
                      orgUnits={orgUnits}
                      labels={labels}
                      onSelect={(unitId) => { onAssignOrgUnit(m.id, unitId); setPickerFor(null); }}
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
                    <span>{m.department} · {m.title || '—'}</span>
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

function InvitesTab({ invites, labels, canEdit, onNewInvite, onResendInvite, onCancelInvite, onCopyInviteLink }) {
  const [filter, setFilter] = useState('all');
  const [composerOpen, setComposerOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [sending, setSending] = useState(false);

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

  async function handleSend() {
    if (!email.trim()) return;
    setSending(true);
    try {
      await onNewInvite(email.trim(), role);
      setEmail('');
      setRole('member');
      setComposerOpen(false);
    } finally {
      setSending(false);
    }
  }

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
            <button type="button" className="admin-emp-btn is-primary" onClick={() => setComposerOpen((o) => !o)}>
              <IconPlus size={14} />{labels.invites.newInvite}
            </button>
          )}
        </div>

        {composerOpen && canEdit && (
          <div className="admin-emp-invite-composer">
            <input
              type="email"
              className="admin-emp-input admin-emp-invite-email"
              placeholder={labels.invites.composerEmail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            />
            <select className="admin-emp-input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="member">{labels.role.member}</option>
              <option value="manager">{labels.role.manager}</option>
              <option value="admin">{labels.role.admin}</option>
            </select>
            <button type="button" className="admin-emp-btn is-primary is-sm" onClick={handleSend} disabled={sending || !email.trim()}>
              {labels.invites.composerSend}
            </button>
            <button type="button" className="admin-emp-btn is-ghost is-sm" onClick={() => { setComposerOpen(false); setEmail(''); }}>
              {labels.invites.composerCancel}
            </button>
          </div>
        )}

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
  loading = false,
  labels: providedLabels,
  canEdit = true,
  renderAvatar,
  onAssignOrgUnit,
  onCsvUpload,
  onManageTeams,
  onNewInvite,
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
}) {
  const labels = useMemo(() => merge(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [tab, setTab] = useState(
    ['members', 'unassigned', 'invites'].includes(initialTab) ? initialTab : 'members',
  );

  const unassignedCount = useMemo(
    () => members.filter((m) => m.employmentStatus !== 'terminated' && (!hasOrgUnit(m) || !m.managerName)).length,
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
            onClick={() => setTab(t.id)}
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
          onAddEmployee={onCsvUpload}
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
          canEdit={canEdit}
          onNewInvite={onNewInvite}
          onResendInvite={onResendInvite}
          onCancelInvite={onCancelInvite}
          onCopyInviteLink={onCopyInviteLink}
        />
      )}
    </div>
  );
}
