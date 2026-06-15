import { useState, useMemo, useRef, useEffect } from 'react';
import AvatarFallback from './AvatarFallback.jsx';
import Card from './Card.jsx';
import SectionLabel from './SectionLabel.jsx';

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
  invite: '+ 구성원 초대',
  unassignedPill: '미배정',
  assignManager: '+ 조직 배정',
  cols: { name: '이름', email: '이메일', dept: '부서', level: '직급', manager: '매니저', joined: '입사일', status: '상태' },
  edit: '수정',
  emptyFiltered: '조건에 맞는 구성원이 없습니다.',
  loading: '불러오는 중…',
  pagination: { prev: '← 이전', next: '다음 →', of: '/' },
  menu: { edit: '수정', changeManager: '조직 배정', deactivate: '비활성화' },
  status: {
    active: '재직', on_leave: '휴직', terminated: '퇴사', pending: '수습', other: '기타',
  },
  role: { admin: '어드민', manager: '매니저', member: '멤버' },
  unassigned: {
    bannerTitle: '조직 또는 매니저가 배정되지 않은 구성원이 있습니다.',
    bannerBody: '온보딩에서 "나중에 배정"을 선택했거나 신규 합류 후 미배정 상태입니다. 1on1·OKR·평가가 정상 작동하려면 조직·매니저 배정이 필요합니다.',
    noOrgTitle: '조직(부서) 미배정 구성원',
    noOrgEmpty: '모든 구성원에게 조직이 배정되었습니다 ✓',
    noManagerTitle: '매니저 미배정 구성원',
    noManagerEmpty: '모든 구성원에게 매니저가 배정되었습니다 ✓',
    assignOrg: '조직 배정',
    goTeamMgmt: '팀 관리 →',
    teamNote: '※ 매니저는 조직장에서 자동 계산됩니다. 조직 구조 변경은 팀 관리 화면에서 진행됩니다.',
  },
  invites: {
    summaryPending: '대기중', summaryPendingSub: '수락 대기',
    summaryAccepted: '수락됨', summaryAcceptedSub: '온보딩 진행',
    summaryExpired: '만료됨', summaryExpiredSub: '재발송 필요',
    filterAll: '전체', newInvite: '+ 새 초대 발송',
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
    orgAssign: '조직 배정', orgNone: '조직 미배정', orgChange: '변경 ▾',
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
  return (
    <span className={`admin-emp-status is-${cls}`}>
      <span className="admin-emp-status-dot" />
      {label}
    </span>
  );
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

/* ── 편집 슬라이드 패널 ─────────────────────────────────── */
function EditPanel({ member, orgUnits, labels, renderAvatar, onClose, onSave }) {
  const [draft, setDraft] = useState(member);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!member) return null;
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const selectedUnit = orgUnits.find((u) => u.id === draft._orgUnitId) || null;
  const deptLabel = selectedUnit ? selectedUnit.name : draft.department;

  const statusOrder = ['active', 'pending', 'on_leave', 'terminated'];

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-emp-panel-backdrop" onClick={onClose} />
      <div className="admin-emp-panel" role="dialog" aria-modal="true">
        <div className="admin-emp-panel-header">
          <div className="admin-emp-panel-id">
            {renderAvatar ? renderAvatar(draft, 36) : <AvatarFallback row={draft} size={36} />}
            <div>
              <div className="admin-emp-panel-name">{draft.name}</div>
              <div className="admin-emp-panel-email">{draft.email}</div>
            </div>
          </div>
          <button type="button" className="admin-emp-panel-close" onClick={onClose} aria-label="close">×</button>
        </div>

        <div className="admin-emp-panel-body">
          <SectionLabel>{labels.panel.basicInfo}</SectionLabel>
          <div className="admin-emp-field-group">
            <label className="admin-emp-field">
              <span className="admin-emp-field-label">{labels.panel.name}</span>
              <input className="admin-emp-input" value={draft.name || ''} onChange={(e) => set('name', e.target.value)} />
            </label>
            <label className="admin-emp-field">
              <span className="admin-emp-field-label">{labels.panel.email}</span>
              <input className="admin-emp-input" value={draft.email || ''} onChange={(e) => set('email', e.target.value)} />
            </label>
            <label className="admin-emp-field">
              <span className="admin-emp-field-label">{labels.panel.level}</span>
              <input className="admin-emp-input" value={draft.title || ''} onChange={(e) => set('title', e.target.value)} />
            </label>
            <label className="admin-emp-field">
              <span className="admin-emp-field-label">{labels.panel.joined}</span>
              <input type="date" className="admin-emp-input" value={(draft.hireDate || '').slice(0, 10)} onChange={(e) => set('hireDate', e.target.value)} />
            </label>
          </div>

          <SectionLabel>{labels.panel.orgAssign}</SectionLabel>
          <div className="admin-emp-org-assign">
            <button
              type="button"
              className={`admin-emp-org-current${deptLabel ? '' : ' is-empty'}`}
              onClick={() => setPickerOpen((o) => !o)}
            >
              <span className="admin-emp-org-current-name">
                {deptLabel || labels.panel.orgNone}
              </span>
              <span className="admin-emp-org-current-arrow">{labels.panel.orgChange}</span>
            </button>
            {pickerOpen && (
              <OrgUnitPicker
                orgUnits={orgUnits}
                labels={labels}
                onSelect={(id) => { set('_orgUnitId', id); setPickerOpen(false); }}
                onClose={() => setPickerOpen(false)}
              />
            )}
          </div>

          <SectionLabel>{labels.panel.managerSection}</SectionLabel>
          <div className="admin-emp-manager-readonly">
            <span className="admin-emp-manager-name">{draft.managerName || '—'}</span>
            <span className="admin-emp-manager-note">{labels.panel.managerAuto}</span>
          </div>

          <SectionLabel>{labels.panel.statusSection}</SectionLabel>
          <div className="admin-emp-status-options">
            {statusOrder.map((key) => (
              <label key={key} className={`admin-emp-status-option is-${key.replace('_', '-')}${draft.employmentStatus === key ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="employmentStatus"
                  checked={draft.employmentStatus === key}
                  onChange={() => set('employmentStatus', key)}
                />
                <span className="admin-emp-status-option-dot" />
                <span className="admin-emp-status-option-label">{labels.status[key]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="admin-emp-panel-footer">
          <button type="button" className="admin-emp-btn is-ghost" onClick={onClose}>{labels.panel.cancel}</button>
          <button type="button" className="admin-emp-btn is-primary" onClick={handleSave} disabled={saving}>{labels.panel.save}</button>
        </div>
      </div>
    </>
  );
}

/* ── 탭 A: 전체 구성원 ──────────────────────────────────── */
function MembersTab({ members, labels, canEdit, pageSize, renderAvatar, onOpenEdit, onDeactivate, onInvite, onCsvUpload }) {
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('전체');
  const [level, setLevel] = useState('전체');
  const [mgrFilter, setMgrFilter] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState(null);

  const depts = useMemo(
    () => ['전체', ...Array.from(new Set(members.map((m) => m.department).filter(Boolean)))],
    [members],
  );
  const levels = useMemo(
    () => ['전체', ...Array.from(new Set(members.map((m) => m.title).filter(Boolean)))],
    [members],
  );
  const statusOpts = [
    { id: 'all', label: labels.filters.all },
    { id: 'active', label: labels.status.active },
    { id: 'pending', label: labels.status.pending },
    { id: 'on_leave', label: labels.status.on_leave },
    { id: 'terminated', label: labels.status.terminated },
  ];
  const mgrOpts = [
    { id: 'all', label: labels.managerFilter.all },
    { id: 'assigned', label: labels.managerFilter.assigned },
    { id: 'unassigned', label: labels.managerFilter.unassigned },
  ];

  const filtered = useMemo(
    () =>
      members.filter((m) => {
        if (q && !(m.name?.includes(q) || m.email?.includes(q) || (m.department || '').includes(q))) return false;
        if (dept !== '전체' && m.department !== dept) return false;
        if (level !== '전체' && m.title !== level) return false;
        if (mgrFilter === 'assigned' && !m.managerName) return false;
        if (mgrFilter === 'unassigned' && m.managerName) return false;
        if (status !== 'all' && m.employmentStatus !== status) return false;
        return true;
      }),
    [members, q, dept, level, mgrFilter, status],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasFilter = q || dept !== '전체' || level !== '전체' || mgrFilter !== 'all' || status !== 'all';

  function resetFilters() {
    setQ(''); setDept('전체'); setLevel('전체'); setMgrFilter('all'); setStatus('all'); setPage(1);
  }

  return (
    <Card>
      <div className="admin-emp-toolbar">
        <div className="admin-emp-search-wrap">
          <input
            className="admin-emp-search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder={labels.search}
          />
          <span className="admin-emp-count">{filtered.length}{labels.countSuffix}</span>
        </div>
        {canEdit && (onCsvUpload || onInvite) && (
          <div className="admin-emp-toolbar-actions">
            {onCsvUpload && (
              <button type="button" className="admin-emp-btn is-ghost" onClick={onCsvUpload}>{labels.csvUpload}</button>
            )}
            {onInvite && (
              <button type="button" className="admin-emp-btn is-primary" onClick={onInvite}>{labels.invite}</button>
            )}
          </div>
        )}
      </div>

      <div className="admin-emp-filterbar">
        <FilterChip label={labels.filters.dept} value={dept} options={depts} onChange={(v) => { setDept(v); setPage(1); }} />
        <FilterChip label={labels.filters.level} value={level} options={levels} onChange={(v) => { setLevel(v); setPage(1); }} />
        <FilterChip label={labels.filters.manager} value={mgrFilter} options={mgrOpts} onChange={(v) => { setMgrFilter(v); setPage(1); }} />
        <FilterChip label={labels.filters.status} value={status} options={statusOpts} onChange={(v) => { setStatus(v); setPage(1); }} />
        {hasFilter && (
          <button type="button" className="admin-emp-filter-reset" onClick={resetFilters}>{labels.filters.reset}</button>
        )}
      </div>

      <div className="admin-emp-table-scroll">
        <table className="admin-emp-table">
          <thead>
            <tr>
              <th>{labels.cols.name}</th>
              <th>{labels.cols.email}</th>
              <th>{labels.cols.dept}</th>
              <th>{labels.cols.level}</th>
              <th>{labels.cols.manager}</th>
              <th>{labels.cols.joined}</th>
              <th>{labels.cols.status}</th>
              <th aria-label="actions" />
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-emp-empty">{labels.emptyFiltered}</td>
              </tr>
            ) : (
              pageRows.map((m) => (
                <tr key={m.id}>
                  <td>
                    <button type="button" className="admin-emp-name-cell" onClick={() => onOpenEdit(m)}>
                      {renderAvatar ? renderAvatar(m, 28) : <AvatarFallback row={m} size={28} />}
                      <span className="admin-emp-name-text">
                        {m.name}
                        <RolePill role={m.orgRole} labels={labels} />
                      </span>
                    </button>
                  </td>
                  <td className="admin-emp-mono">{m.email}</td>
                  <td>
                    {m.department
                      ? <span className="admin-emp-dept">{m.department}</span>
                      : <span className="admin-emp-pill is-amber">{labels.unassignedPill}</span>}
                  </td>
                  <td className="admin-emp-muted">{m.title || '—'}</td>
                  <td>
                    {m.managerName
                      ? <span className="admin-emp-manager">{m.managerName}</span>
                      : <span className="admin-emp-muted">—</span>}
                  </td>
                  <td className="admin-emp-mono admin-emp-muted">{(m.hireDate || '').slice(0, 10) || '—'}</td>
                  <td><StatusBadge status={m.employmentStatus} labels={labels} /></td>
                  <td className="admin-emp-actions-cell">
                    <div className="admin-emp-actions">
                      <button type="button" className="admin-emp-btn is-soft is-sm" onClick={() => onOpenEdit(m)}>{labels.edit}</button>
                      <button type="button" className="admin-emp-btn is-ghost is-sm admin-emp-more" onClick={() => setOpenMenu(openMenu === m.id ? null : m.id)} aria-label="more">⋯</button>
                    </div>
                    {openMenu === m.id && (
                      <RowActionMenu
                        labels={labels}
                        canEdit={canEdit}
                        onEdit={() => onOpenEdit(m)}
                        onChangeManager={() => onOpenEdit(m)}
                        onDeactivate={() => onDeactivate(m)}
                        onClose={() => setOpenMenu(null)}
                      />
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="admin-emp-pagination">
          <span className="admin-emp-muted">
            {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} {labels.pagination.of} {filtered.length}{labels.countSuffix}
          </span>
          <div className="admin-emp-pagination-nav">
            <button type="button" className="admin-emp-btn is-ghost is-sm" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{labels.pagination.prev}</button>
            <span className="admin-emp-mono admin-emp-muted">{safePage} {labels.pagination.of} {totalPages}</span>
            <button type="button" className="admin-emp-btn is-ghost is-sm" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>{labels.pagination.next}</button>
          </div>
        </div>
      )}
    </Card>
  );
}

function FilterChip({ label, value, options, onChange }) {
  return (
    <div className="admin-emp-filter-chip">
      <span className="admin-emp-filter-chip-label">{label}</span>
      <select className="admin-emp-filter-chip-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => {
          const isObj = typeof opt === 'object';
          return (
            <option key={isObj ? opt.id : opt} value={isObj ? opt.id : opt}>
              {isObj ? opt.label : opt}
            </option>
          );
        })}
      </select>
    </div>
  );
}

/* ── 탭 B: 미배정 관리 ──────────────────────────────────── */
function UnassignedTab({ members, orgUnits, labels, renderAvatar, onAssignOrgUnit, onManageTeams }) {
  const [pickerFor, setPickerFor] = useState(null);

  const noOrg = members.filter((m) => !m.department && m.employmentStatus !== 'terminated');
  const noManager = members.filter((m) => m.department && !m.managerName && m.employmentStatus !== 'terminated');

  return (
    <div className="admin-emp-unassigned">
      <div className="admin-emp-banner">
        <span className="admin-emp-banner-icon" aria-hidden="true">⚠️</span>
        <div>
          <div className="admin-emp-banner-title">{labels.unassigned.bannerTitle}</div>
          <div className="admin-emp-banner-body">{labels.unassigned.bannerBody}</div>
        </div>
      </div>

      <Card>
        <div className="admin-emp-section-head">
          <SectionLabel>{labels.unassigned.noOrgTitle}</SectionLabel>
          <span className="admin-emp-pill is-red">{labels.unassignedPill} {noOrg.length}{labels.countSuffix}</span>
        </div>
        {noOrg.length === 0 ? (
          <div className="admin-emp-unassigned-empty">{labels.unassigned.noOrgEmpty}</div>
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
                    <span className="admin-emp-mono">{m.email}</span>
                    <span>{m.title || '—'}</span>
                    {m.hireDate && <span>{(m.hireDate || '').slice(0, 10)}</span>}
                  </div>
                </div>
                <StatusBadge status={m.employmentStatus} labels={labels} />
                <div className="admin-emp-unassigned-action">
                  <button type="button" className="admin-emp-btn is-primary is-sm" onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}>
                    {labels.unassigned.assignOrg}
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
          <div className="admin-emp-unassigned-empty">{labels.unassigned.noManagerEmpty}</div>
        ) : (
          <div className="admin-emp-unassigned-list">
            {noManager.map((m) => (
              <div key={m.id} className="admin-emp-unassigned-row">
                {renderAvatar ? renderAvatar(m, 32) : <AvatarFallback row={m} size={32} />}
                <div className="admin-emp-unassigned-info">
                  <div className="admin-emp-unassigned-name">{m.name}</div>
                  <div className="admin-emp-unassigned-meta">
                    <span className="admin-emp-mono">{m.email}</span>
                    <span>{m.department} · {m.title || '—'}</span>
                  </div>
                </div>
                <StatusBadge status={m.employmentStatus} labels={labels} />
                <button type="button" className="admin-emp-btn is-primary is-sm" onClick={onManageTeams}>
                  {labels.unassigned.goTeamMgmt}
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
          <FilterChip label={labels.filters.status} value={filter} options={filterOpts} onChange={setFilter} />
          {canEdit && (
            <button type="button" className="admin-emp-btn is-primary" onClick={() => setComposerOpen((o) => !o)}>
              {labels.invites.newInvite}
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
          <div className="admin-emp-table-scroll">
            <table className="admin-emp-table">
              <thead>
                <tr>
                  <th>{labels.invites.colEmail}</th>
                  <th>{labels.invites.colInviter}</th>
                  <th>{labels.invites.colSentAt}</th>
                  <th>{labels.invites.colStatus}</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id}>
                    <td className="admin-emp-mono">
                      {inv.email || labels.invites.linkType}
                    </td>
                    <td className="admin-emp-muted">{inv.invitedByName || '—'}</td>
                    <td className="admin-emp-mono admin-emp-muted">{inv.sentAt || '—'}</td>
                    <td><span className={`admin-emp-invite-badge is-${inv.status}`}>{statusLabel(inv.status)}</span></td>
                    <td className="admin-emp-actions-cell">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  loading = false,
  labels: providedLabels,
  pageSize = PAGE_SIZE,
  canEdit = true,
  renderAvatar,
  onSaveMember,
  onAssignOrgUnit,
  onDeactivateMember,
  onInvite,
  onCsvUpload,
  onManageTeams,
  onNewInvite,
  onResendInvite,
  onCancelInvite,
  onCopyInviteLink,
}) {
  const labels = useMemo(() => merge(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [tab, setTab] = useState('members');
  const [editing, setEditing] = useState(null);

  const unassignedCount = useMemo(
    () => members.filter((m) => m.employmentStatus !== 'terminated' && (!m.department || !m.managerName)).length,
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

  async function handleSave(draft) {
    const patch = {
      name: draft.name,
      email: draft.email,
      title: draft.title,
      hireDate: draft.hireDate || undefined,
      employmentStatus: draft.employmentStatus,
    };
    if (draft._orgUnitId) patch.orgUnitIds = [draft._orgUnitId];
    await onSaveMember(draft.id, patch);
    setEditing(null);
  }

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
              {t.warn ? '⚠ ' : ''}{t.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-emp-loading">{labels.loading}</div>
      ) : tab === 'members' ? (
        <MembersTab
          members={members}
          labels={labels}
          canEdit={canEdit}
          pageSize={pageSize}
          renderAvatar={renderAvatar}
          onOpenEdit={setEditing}
          onDeactivate={(m) => onDeactivateMember && onDeactivateMember(m.id)}
          onInvite={onInvite}
          onCsvUpload={onCsvUpload}
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

      {editing && (
        <EditPanel
          member={editing}
          orgUnits={orgUnits}
          labels={labels}
          renderAvatar={renderAvatar}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
