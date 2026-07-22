import { useState, useRef, useEffect, useMemo } from 'react';

/**
 * AdminEmployeeSheetCanvas — 어드민 "직원 일괄 편집(스프레드시트)" 화면 Pure 컴포넌트.
 * pivit-specs 의 J. Admin_관리자/admin-employee-inline-edit.jsx 시안을 design-page
 * 정본으로 포팅한 것.
 *
 * 엑셀처럼 셀을 클릭해 인라인 편집하고(Tab/Enter 이동, 변경 셀 앰버 하이라이트),
 * 체크박스로 여러 명을 선택해 "일괄 편집 바"로 여러 필드를 한 번에 적용한다.
 * 모든 변경은 클라이언트 dirty 추적 → "변경 저장" 1클릭에 onSaveMembers 로 전송.
 *
 * 시안 대비 차이 (pivit-work 데이터 모델에 맞춤):
 *  - 권한(role) 은 읽기 전용 배지 — 권한 변경은 RBAC 화면 소관.
 *  - 매니저(managerName) 는 조직장에서 파생되는 읽기 전용 값.
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

// 백엔드 employmentStatus enum 기반.
const STATUS_META = {
  active: { label: '재직중', color: '#16A34A', bg: '#F0FDF4', dot: '#22C55E' },
  on_leave: { label: '휴직', color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  terminated: { label: '퇴사', color: '#94A3B8', bg: '#F8FAFC', dot: '#CBD5E1' },
  pending: { label: '대기', color: '#2563EB', bg: '#EFF6FF', dot: '#60A5FA' },
};
const STATUS_OPTIONS = ['active', 'on_leave', 'terminated', 'pending'];
// 권한 옵션 — admin 승격은 백엔드가 막지만(초대로만), 기존 어드민 표시를 위해 3종 노출.
const ROLE_OPTIONS = ['admin', 'manager', 'member'];

// select 셀·일괄바의 옵션 라벨(권한=ROLE_META, 상태=STATUS_META).
function optionLabel(colId, o) {
  if (colId === 'orgRole') return ROLE_META[o]?.label || o;
  return STATUS_META[o]?.label || o;
}

const fmtKRW = (v) => {
  if (v === '' || v === null || v === undefined) return '—';
  const n = Number(String(v).replace(/[^0-9]/g, ''));
  return Number.isFinite(n) && n > 0 ? '₩' + n.toLocaleString('ko-KR') : '—';
};

function initials(name) {
  return name?.slice(0, 2) || '??';
}
function avatarColor(seed) {
  const colors = ['#4F6AF5', '#22C55E', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6', '#EF4444', '#0EA5E9', '#F97316'];
  const idx = (String(seed || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % colors.length;
  return colors[idx];
}

// dirty 추적·패치 대상이 되는 편집 가능 필드(백엔드 UpdateUserDto 매핑).
const EDITABLE_FIELDS = ['name', 'nameEn', 'email', 'department', 'title', 'position', 'orgRole', 'employmentStatus', 'hireDate', 'terminationDate', 'salary', 'education'];

// members prop → 내부 편집 row 로 매핑(빈 값 정규화).
function mapMembers(list) {
  return (list || []).map((m) => ({
    id: m.id,
    name: m.name ?? '',
    nameEn: m.nameEn ?? '',
    email: m.email ?? '',
    department: m.department ?? '',
    title: m.title ?? '',
    position: m.position ?? '',
    orgRole: m.orgRole ?? 'member',
    employmentStatus: m.employmentStatus ?? 'active',
    managerName: m.managerName ?? '',
    hireDate: m.hireDate ?? '',
    terminationDate: m.terminationDate ?? '',
    salary: m.salary ?? '',
    education: m.education ?? '',
  }));
}

// ── 인라인 편집 셀 ──────────────────────────────────────
function EditCell({ col, value, onChange, onKeyDown, autoFocus }) {
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
    // 현재 값이 옵션에 없으면(카탈로그에 없는 기존/커스텀 값) 보존해 첫 옵션으로 노출.
    const opts =
      value && !col.options.includes(value) ? [value, ...col.options] : col.options;
    return (
      <select ref={ref} value={value ?? ''} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} style={{ ...base, cursor: 'pointer' }}>
        {opts.map((o) => (
          <option key={o} value={o}>
            {optionLabel(col.id, o)}
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

// ── 셀 렌더 (읽기) ──────────────────────────────────────
function CellDisplay({ col, row, renderAvatar }) {
  const value = row[col.id];
  if (col.id === 'name') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {renderAvatar ? (
          renderAvatar(row, 24)
        ) : (
          <div style={{ width: 24, height: 24, borderRadius: 6, background: avatarColor(row.id || value), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{initials(value)}</div>
        )}
        <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{value || '—'}</span>
      </div>
    );
  }
  if (col.id === 'orgRole') {
    const m = ROLE_META[value] || {};
    return (
      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: m.bg || T.bl, border: `1px solid ${m.bd || T.border}`, color: m.color || T.sub }}>{m.label || value || '—'}</span>
    );
  }
  if (col.id === 'employmentStatus') {
    const m = STATUS_META[value] || {};
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot || T.muted, flexShrink: 0 }} />
        <span style={{ fontSize: 11, color: m.color || T.sub, fontWeight: 600 }}>{m.label || value || '—'}</span>
      </div>
    );
  }
  if (col.type === 'currency') {
    const has = value !== '' && value !== null && value !== undefined;
    return <span style={{ fontSize: 12, fontWeight: has ? 600 : 400, color: has ? T.text : T.muted, fontVariantNumeric: 'tabular-nums' }}>{fmtKRW(value)}</span>;
  }
  return <span style={{ fontSize: 12, color: value ? T.text : T.muted }}>{value || '—'}</span>;
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
  onAddEmployee,
  // 조직 설정 필드옵션을 컬럼 드롭다운으로 연결(비면 자유 텍스트 폴백, 기존 값 보존).
  // gradeOptions→직급(grade 카탈로그), positionOptions→직책(position 카탈로그).
  gradeOptions = [],
  positionOptions = [],
  // embedded=true 면 다른 캔버스(AdminEmployeesCanvas 전체구성원 탭) 안에 들어가는 모드 —
  // 자체 페이지 타이틀/부제 헤더를 숨기고 저장 컨트롤만 우측 정렬로 노출한다.
  embedded = false,
  // 초기 검색어(딥링크용) — 개요 등에서 특정 인원으로 좁혀 진입할 때 사용.
  initialSearch = '',
}) {
  const L = labels;

  // ── 컬럼 정의 ──
  const COLUMNS = useMemo(() => {
    const cl = labels.cols || {};
    // 필드옵션 카탈로그가 있으면 select, 없으면 자유 텍스트로 폴백.
    const catCol = (id, label, width, options) =>
      options.length
        ? { id, label, width, type: 'select', editable: true, options }
        : { id, label, width, type: 'text', editable: true };
    const base = [
      { id: 'name', label: cl.name || '이름', width: 120, type: 'text', editable: true },
      { id: 'nameEn', label: cl.nameEn || '호칭', width: 110, type: 'text', editable: true },
      { id: 'email', label: cl.email || '이메일', width: 200, type: 'text', editable: true },
      { id: 'department', label: cl.department || '부서', width: 120, type: 'text', editable: true },
      catCol('title', cl.title || '직급', 110, gradeOptions),
      catCol('position', cl.position || '직책', 110, positionOptions),
      { id: 'orgRole', label: cl.role || '권한', width: 100, type: 'select', editable: true, options: ROLE_OPTIONS },
      { id: 'employmentStatus', label: cl.status || '상태', width: 100, type: 'select', editable: true, options: STATUS_OPTIONS },
      { id: 'managerName', label: cl.manager || '매니저', width: 110, type: 'readonly', editable: false },
      { id: 'hireDate', label: cl.hireDate || '입사일', width: 120, type: 'date', editable: true },
      { id: 'terminationDate', label: cl.terminationDate || '퇴사일', width: 120, type: 'date', editable: true },
    ];
    if (canViewSalary) {
      base.push({ id: 'salary', label: cl.salary || '연봉', width: 130, type: 'currency', editable: true, sensitive: true });
    }
    base.push({ id: 'education', label: cl.education || '학력', width: 160, type: 'text', editable: true });
    return base;
  }, [canViewSalary, labels, gradeOptions, positionOptions]);

  // ── 상태 ──
  const [rows, setRows] = useState(() => mapMembers(members));
  const [original, setOriginal] = useState(() => mapMembers(members));
  const [syncedMembers, setSyncedMembers] = useState(members);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [filterDept, setFilterDept] = useState('__all__');
  const [filterStatus, setFilterStatus] = useState('__all__');
  const [search, setSearch] = useState(initialSearch);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [barValues, setBarValues] = useState({});
  const [barApplied, setBarApplied] = useState(false);
  const [salaryHistRowId, setSalaryHistRowId] = useState(null);

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
    const rowIdx = filtered.findIndex((r) => r.id === rowId);
    const editableCols = COLUMNS.filter((c) => c.editable);
    const colPos = editableCols.findIndex((c) => c.id === colId);
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const nextPos = e.shiftKey ? colPos - 1 : colPos + 1;
      if (nextPos >= 0 && nextPos < editableCols.length) {
        setEditing({ rowId, colId: editableCols[nextPos].id });
      } else if (e.key === 'Enter') {
        const nextRow = filtered[rowIdx + 1];
        if (nextRow) setEditing({ rowId: nextRow.id, colId });
        else stopEdit();
      } else stopEdit();
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
  const depts = useMemo(() => ['__all__', ...Array.from(new Set(rows.map((r) => r.department).filter(Boolean)))], [rows]);
  let filtered = rows.filter((r) => {
    const md = filterDept === '__all__' || r.department === filterDept;
    const ms = filterStatus === '__all__' || r.employmentStatus === filterStatus;
    const q = search.trim().toLowerCase();
    const mq =
      !q ||
      (r.name || '').toLowerCase().includes(q) ||
      (r.nameEn || '').toLowerCase().includes(q) ||
      (r.email || '').toLowerCase().includes(q) ||
      (r.department || '').toLowerCase().includes(q) ||
      (r.position || '').toLowerCase().includes(q);
    return md && ms && mq;
  });
  if (sortCol) {
    filtered = [...filtered].sort((a, b) => {
      const av = String(a[sortCol] ?? '');
      const bv = String(b[sortCol] ?? '');
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
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
  const barCols = COLUMNS.filter((c) => c.editable && c.id !== 'name' && c.id !== 'email');
  const barActiveCount = Object.values(barValues).filter((v) => v !== '' && v !== undefined).length;
  function applyBar() {
    const fields = barCols.filter((c) => barValues[c.id] !== '' && barValues[c.id] !== undefined);
    if (!fields.length) return;
    setRows((prev) =>
      prev.map((r) => {
        if (!selected.has(r.id)) return r;
        const patch = {};
        fields.forEach((c) => {
          patch[c.id] = barValues[c.id];
        });
        return { ...r, ...patch };
      }),
    );
    setBarValues({});
    setBarApplied(true);
    setTimeout(() => setBarApplied(false), 2000);
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

  const ROW_H = 44;
  const CHECKBOX_W = 44;

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

        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} style={{ padding: '8px 12px', borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 12, fontFamily: T.font, background: T.card, color: T.text, cursor: 'pointer', outline: 'none' }}>
          {depts.map((d) => (
            <option key={d} value={d}>
              {d === '__all__' ? L.deptFilterAll || '전체 부서' : d}
            </option>
          ))}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '8px 12px', borderRadius: 9, border: `1px solid ${T.border}`, fontSize: 12, fontFamily: T.font, background: T.card, color: T.text, cursor: 'pointer', outline: 'none' }}>
          <option value="__all__">{L.statusFilterAll || '전체 상태'}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s]?.label || s}
            </option>
          ))}
        </select>

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

        {canEdit && onAddEmployee && (
          <button onClick={onAddEmployee} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: 'none', background: T.accent, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: T.font, boxShadow: '0 2px 10px rgba(79,106,245,.25)' }}>
            + {L.addEmployee || '직원 추가'}
          </button>
        )}
      </div>

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
                    {c.options.map((o) => (
                      <option key={o} value={o}>
                        {optionLabel(c.id, o)}
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
          <div style={{ width: 1, height: 28, background: T.border, flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
            {barApplied ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>✓ {L.bulkApplied || '적용됨'}</span>
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

      {/* 테이블 */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '11px 16px', borderBottom: `1px solid ${T.bl}`, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>
            {L.total || '전체'} <span style={{ color: T.accent, fontFamily: T.mono }}>{filtered.length}</span>
            {L.countUnit || '명'}
          </span>
          {dirtyCount > 0 && <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>● {dirtyCount}{L.rowsUnit || '개'} {L.rowsChanging || '행 변경 중'}</span>}
          <span style={{ fontSize: 11, color: T.muted, marginLeft: 'auto' }}>{L.hint || '셀 클릭하여 편집 · Tab 이동 · Enter 다음 행 · Esc 취소'}</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: CHECKBOX_W + COLUMNS.reduce((s, c) => s + c.width, 0) + 70 }}>
            <thead>
              <tr style={{ background: T.bg }}>
                <th style={{ width: CHECKBOX_W, padding: '10px 14px', borderBottom: `1px solid ${T.border}`, background: T.bg }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer', accentColor: T.accent }} />
                </th>
                {COLUMNS.map((c) => (
                  <th key={c.id} onClick={() => toggleSort(c.id)} style={{ width: c.width, padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: `1px solid ${T.border}`, cursor: 'pointer', userSelect: 'none', background: T.bg, whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {c.label}
                      {c.sensitive && (
                        <span title={L.sensitiveHint || '민감 정보 — 권한별 마스킹 대상'} style={{ fontSize: 10 }}>
                          🔒
                        </span>
                      )}
                      {sortCol === c.id && <span style={{ color: T.accent }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                ))}
                <th style={{ width: 70, padding: '10px 12px', borderBottom: `1px solid ${T.border}`, background: T.bg }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, ri) => {
                const rowDirty = isRowDirty(row.id);
                const isSel = selected.has(row.id);
                return (
                  <tr key={row.id} style={{ borderBottom: `1px solid ${T.bl}`, background: isSel ? '#F5F7FF' : rowDirty ? 'rgba(245,158,11,.04)' : ri % 2 === 0 ? T.card : '#FAFBFC' }}>
                    <td style={{ padding: '0 14px', textAlign: 'center', width: CHECKBOX_W }}>
                      <input type="checkbox" checked={isSel} onChange={() => toggleRow(row.id)} style={{ cursor: 'pointer', accentColor: T.accent }} />
                    </td>
                    {COLUMNS.map((c) => {
                      const isEditing = editing?.rowId === row.id && editing?.colId === c.id;
                      const cellDirty = isDirty(row.id, c.id);
                      const editableCell = canEdit && c.editable;
                      return (
                        <td
                          key={c.id}
                          onClick={() => editableCell && !isEditing && startEdit(row.id, c.id)}
                          style={{
                            height: ROW_H,
                            padding: isEditing ? 0 : '0 12px',
                            width: c.width,
                            cursor: editableCell ? 'text' : 'default',
                            borderLeft: cellDirty ? '2px solid #F59E0B' : 'none',
                            background: isEditing ? '#fff' : cellDirty ? 'rgba(245,158,11,.06)' : 'transparent',
                            outline: isEditing ? `2px solid ${T.accent}` : 'none',
                            outlineOffset: -1,
                          }}
                        >
                          {isEditing ? (
                            <EditCell col={c} value={row[c.id]} autoFocus onChange={(val) => updateCell(row.id, c.id, val)} onKeyDown={(e) => handleKeyDown(e, row.id, c.id)} />
                          ) : (
                            <CellDisplay col={c} row={row} renderAvatar={renderAvatar} />
                          )}
                        </td>
                      );
                    })}
                    <td style={{ padding: '0 8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        {canViewSalary && onLoadSalaryHistory && (
                          <button onClick={() => setSalaryHistRowId(row.id)} title={L.salaryHistoryTitle || '연봉 이력'} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.sub, fontSize: 12, fontWeight: 700, fontFamily: T.font }}>
                            ₩
                          </button>
                        )}
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

  const sorted = [...history].sort((a, b) => String(a.effectiveDate).localeCompare(String(b.effectiveDate)));
  const canAdd = form.effectiveDate && form.amount && !busy;

  async function add() {
    if (!canAdd || !onAdd) return;
    setBusy(true);
    try {
      const res = await onAdd(row.id, { ...form });
      if (res?.history) setHistory(res.history);
      else setHistory((prev) => [...prev, { ...form }]);
      if (res && 'salary' in res) onSalarySynced?.(res.salary);
      setForm({ effectiveDate: '', amount: '', reason: '' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24, fontFamily: T.font }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 14, width: 'min(560px,100%)', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.22)' }}>
        <div style={{ padding: '18px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>₩</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>
              {row.name || (L.newEmployee || '신규 직원')} · {L.salaryHistoryTitle || '연봉 이력'}
            </div>
            <div style={{ fontSize: 11, color: T.muted }}>{L.salaryHistoryDesc || '적용일 기준 누적 이력 · 최신 이력이 현재 연봉으로 반영 🔒 권한별 마스킹'}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: 20, lineHeight: 1 }}>
            ✕
          </button>
        </div>
        <div style={{ padding: '16px 22px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: T.muted, fontSize: 13 }}>{L.loading || '불러오는 중…'}</div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: T.muted, fontSize: 13 }}>{L.salaryHistoryEmpty || '등록된 연봉 이력이 없습니다. 아래에서 추가하세요. (연봉은 비필수 항목입니다)'}</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {[L.salaryHistEffDate || '적용일', L.salaryHistAmount || '연봉', L.salaryHistReason || '사유'].map((h, i) => (
                    <th key={i} style={{ textAlign: i === 1 ? 'right' : 'left', padding: '6px 8px', fontSize: 11, fontWeight: 700, color: T.muted, borderBottom: `1px solid ${T.border}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((h, i) => {
                  const isLatest = i === sorted.length - 1;
                  return (
                    <tr key={i} style={{ background: isLatest ? T.accent + '08' : 'transparent' }}>
                      <td style={{ padding: '8px', fontSize: 12, color: T.text, borderBottom: `1px solid ${T.bl}` }}>
                        {h.effectiveDate}
                        {isLatest && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: T.accent }}>{L.salaryHistCurrent || '현재'}</span>}
                      </td>
                      <td style={{ padding: '8px', fontSize: 12, fontWeight: 600, color: T.text, textAlign: 'right', borderBottom: `1px solid ${T.bl}`, fontVariantNumeric: 'tabular-nums' }}>{fmtKRW(h.amount)}</td>
                      <td style={{ padding: '8px', fontSize: 12, color: T.sub, borderBottom: `1px solid ${T.bl}` }}>{h.reason || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div style={{ marginTop: 14, padding: '12px 14px', border: `1px dashed ${T.border}`, borderRadius: 8, background: T.bg }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 8 }}>+ {L.salaryHistAdd || '연봉 이력 추가'}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input type="date" value={form.effectiveDate} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} style={{ flex: '1 1 130px', padding: '7px 10px', border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, fontFamily: T.font }} />
              <input type="text" inputMode="numeric" placeholder={L.salaryHistAmountPh || '연봉(원)'} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9]/g, '') }))} style={{ flex: '1 1 110px', padding: '7px 10px', border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, textAlign: 'right', fontFamily: T.font }} />
              <input type="text" placeholder={L.salaryHistReasonPh || '사유 (예: 연봉 조정/승진)'} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} style={{ flex: '2 1 160px', padding: '7px 10px', border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, fontFamily: T.font }} />
              <button onClick={add} disabled={!canAdd} style={{ padding: '7px 16px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700, fontFamily: T.font, cursor: canAdd ? 'pointer' : 'not-allowed', background: canAdd ? T.accent : T.border, color: canAdd ? '#fff' : T.muted }}>
                {L.salaryHistAddBtn || '추가'}
              </button>
            </div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 6 }}>{L.salaryHistNote || '적용일은 발령/조정 효력 시작일입니다. 요청일과 다를 수 있습니다(effective-date 기준).'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
