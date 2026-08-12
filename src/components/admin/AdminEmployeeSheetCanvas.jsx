import { useState, useRef, useEffect, useMemo } from 'react';
import { nameFontSize, nameInitials } from '../shared/nameInitials.js';
import OrgTreePicker, { OrgPathLabel } from './OrgTreePicker.jsx';
import SquadPicker, { SquadCell, isVisibleSquadStatus } from './SquadPicker.jsx';
import { buildOrgTree, findOrgEntry, primaryOrgEntry, matchesOrgSubtree, ORG_FILTER_UNASSIGNED } from './orgTree.js';

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
  // 한글 이름은 전체를 보인다(PW-24) — '서동현' 을 '서동' 으로 자르지 않는다.
  return nameInitials(name) || '??';
}
function avatarColor(seed) {
  const colors = ['#4F6AF5', '#22C55E', '#F59E0B', '#EC4899', '#8B5CF6', '#14B8A6', '#EF4444', '#0EA5E9', '#F97316'];
  const idx = (String(seed || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % colors.length;
  return colors[idx];
}

// dirty 추적·패치 대상이 되는 편집 가능 필드(백엔드 UpdateUserDto 매핑).
const EDITABLE_FIELDS = ['name', 'displayName', 'email', 'phone', 'department', 'jobLevel', 'jobPosition', 'workLocation', 'orgRole', 'employmentStatus', 'hireDate', 'terminationDate', 'salary', 'education'];

/**
 * 기본값으로 쓰는 **고정 빈 배열**.
 *
 * `prop = []` 로 두면 렌더마다 새 배열이 만들어져, 그 prop 에 걸린 useMemo 가 전부
 * 매 렌더 다시 돈다(컬럼 정의·필터 옵션·인덱스 맵). 이 시트는 수백 행을 그리는
 * 화면이라 그 비용이 눈에 띈다.
 */
const NO_SQUADS = [];

// members prop → 내부 편집 row 로 매핑(빈 값 정규화).
function mapMembers(list) {
  return (list || []).map((m) => ({
    id: m.id,
    name: m.name ?? '',
    displayName: m.displayName ?? '',
    email: m.email ?? '',
    phone: m.phone ?? '',
    department: m.department ?? '',
    // 겸직(중복 소속) — 소속 셀은 행을 복제하지 않고 칩을 세로로 쌓는다(PW-111).
    // 행을 복제하면 ① 체크박스 선택·일괄 저장·페이지네이션의 단위가 사람 수와
    // 어긋나고 ② 어느 행을 지워야 하는지 모호해진다.
    // 형태: [{ name, isPrimary, orgUnitId? }] — 주 소속이 맨 앞. 미지정이면 department 폴백.
    // orgUnitId 가 있으면 칩을 **전체 조직 경로**로 그린다(PW-112).
    depts: Array.isArray(m.depts) && m.depts.length > 0
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
    jobPosition: m.jobPosition ?? '',
    workLocation: m.workLocation ?? '',
    orgRole: m.orgRole ?? 'member',
    // 대표 여부는 편집 대상 컬럼이 아니라 행 상태다 — dirty 추적에 끼지 않도록
    // COLUMNS 에 넣지 않고 행에만 실어둔다.
    isCeo: m.isCeo === true,
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

function CellDisplay({ col, row, renderAvatar, ceoLabel, ceoNoManagerHint, primaryLabel, concurrentLabel, orgTree, squadOptions, squadLabels, onOpenSquads, canEditSquads }) {
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
  // 대표는 조직 최상위라 상급자가 없다 — 조직장에서 파생된 값이 남아 있어도
  // 매니저 칸은 '—' 로 비우고 이유를 툴팁으로 알린다(정책 §2).
  if (col.id === 'managerName' && row.isCeo) {
    return (
      <span title={ceoNoManagerHint || '조직 최상위 — 상급자를 가질 수 없습니다'} style={{ fontSize: 12, color: T.muted }}>
        —
      </span>
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

// ── 검색 가능한 필터 드롭다운 ───────────────────────────────
// OrgUnitPicker/tm-add-member 패턴(검색 input + 필터된 버튼 리스트 + 바깥 클릭 닫기)을
// 시트 톤(T 토큰)으로 옮긴 것. 컬럼별로 재사용.
function FilterMenu({ label, value, options, onChange, allLabel, searchPlaceholder, noResult }) {
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
  // 부서 셀(파생 컬럼) 클릭 시 팀 관리로 보낸다. 미주입이면 그냥 읽기전용 셀.
  onManageTeams,
  // 부서 셀에서 **그 자리에서** 팀을 고르게 한다(PW-23). 둘 다 주어지면 화면 이동
  // 대신 인라인 선택이 열린다 — 부서를 바꾸려고 눌렀다가 다른 화면으로 튕기지 않도록.
  // orgUnitOptions: [{ id, name }], onAssignTeam(memberId, orgUnitId) — '' 이면 미배정.
  orgUnitOptions = [],
  onAssignTeam,
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
  // embedded=true 면 다른 캔버스(AdminEmployeesCanvas 전체구성원 탭) 안에 들어가는 모드 —
  // 자체 페이지 타이틀/부제 헤더를 숨기고 저장 컨트롤만 우측 정렬로 노출한다.
  embedded = false,
  // 초기 검색어(딥링크용) — 개요 등에서 특정 인원으로 좁혀 진입할 때 사용.
  initialSearch = '',
  // ── 대표(CEO) 지정·해제 (screen-admin-ceo-assign.policy.md) ──
  // 주입되면 행에 왕관 버튼이 노출된다. 권한이 없으면 아예 주입하지 않는다 —
  // disabled 버튼을 보여주지 않는 게 정책(§6 미표시 원칙)이다.
  // onAssignCeo(memberId, { alsoSetJobPosition }) / onReleaseCeo(memberId)
  // 둘 다 실패 시 throw 하면 모달이 열린 채 인라인 에러를 띄운다.
  onAssignCeo,
  onReleaseCeo,
}) {
  const L = labels;

  // 소속(조직) 계층 — 소속 셀 표기·트리 팝업·서브트리 필터가 같은 트리를 쓴다(PW-112).
  // orgUnitOptions 가 parentId 를 안 주면 전부 depth 0 인 평면 트리가 되어
  // 종전과 같은 평면 동작으로 자연히 폴백한다.
  const orgTree = useMemo(() => buildOrgTree(orgUnitOptions), [orgUnitOptions]);

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
      // 닉네임(내부 호칭) — 평가·조직도·슬랙 표시명. 어드민이 관리하는 값이라 시트에서
      // 편집한다(PW-8). 본인도 내 설정에서 볼 수 있지만 정본은 여기다.
      { id: 'displayName', label: cl.displayName || '닉네임', width: 120, type: 'text', editable: true },
      { id: 'email', label: cl.email || '이메일', width: 200, type: 'text', editable: true },
      // 전화번호·근무지도 본인 프로필에서 잠긴 인사 정보 — 어드민이 여기서 넣는다(PW-25).
      { id: 'phone', label: cl.phone || '전화번호', width: 130, type: 'text', editable: true },
      // 부서는 조직 단위 배정에서 파생되는 값이라 직접 편집하지 않는다. 텍스트를 고쳐도
      // 조직 단위가 있는 구성원에게는 반영되지 않아 죽은 입력이 된다(팀 이동은 팀 관리에서).
      // 소속은 최하위 팀명이 아니라 전체 경로를 보여준다(PW-112) — 한 칸 더 넓게 잡는다.
      { id: 'department', label: cl.department || '부서', width: 180, type: 'readonly', editable: false, derived: true },
      catCol('jobLevel', cl.jobLevel || '직급', 110, gradeOptions),
      catCol('jobPosition', cl.jobPosition || '직책', 110, positionOptions),
      { id: 'workLocation', label: cl.workLocation || '근무지', width: 110, type: 'text', editable: true },
      { id: 'orgRole', label: cl.role || '권한', width: 100, type: 'select', editable: true, options: ROLE_OPTIONS },
      { id: 'employmentStatus', label: cl.status || '상태', width: 100, type: 'select', editable: true, options: STATUS_OPTIONS },
      { id: 'managerName', label: cl.manager || '매니저', width: 110, type: 'readonly', editable: false },
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
  }, [canViewSalary, labels, gradeOptions, positionOptions, squadOptions]);

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
  const [filters, setFilters] = useState({});
  const setFilter = (colId, v) => setFilters((f) => ({ ...f, [colId]: v }));
  const [search, setSearch] = useState(initialSearch);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [barValues, setBarValues] = useState({});
  const [barApplied, setBarApplied] = useState(false);
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
    { id: 'orgRole', label: cl.role || '권한', meta: 'role' },
    { id: 'employmentStatus', label: cl.status || '상태', meta: 'status' },
  ]), [cl.department, cl.squads, cl.jobLevel, cl.jobPosition, cl.role, cl.status, squadOptions]);
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
      const vals = Array.from(new Set(raw.filter((v) => v !== '' && v != null)));
      out[fc.id] = vals
        .map((v) => ({
          value: String(v),
          label: fc.meta === 'role' ? (ROLE_META[v]?.label || String(v))
            : fc.meta === 'status' ? (STATUS_META[v]?.label || String(v))
              : String(v),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    return out;
  }, [rows, FILTER_COLS, orgTree, L.unassigned, squadOptions]);

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
        || ['name', 'displayName', 'email', 'jobPosition', 'jobLevel'].some(
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
  const PER_PERSON_COLS = new Set(['name', 'displayName', 'email', 'phone']);
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

        {FILTER_COLS.map((fc) => (
          <FilterMenu
            key={fc.id}
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
          <span style={{ fontSize: 11, color: T.muted, marginLeft: 'auto' }}>{L.hint || '셀 클릭하여 편집 · Tab 이동 · Enter 편집 종료 · Esc 취소'}</span>
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
                      // 파생 컬럼(부서)은 편집 대신 관리 화면으로 보낸다 — 값을 바꾸는 곳이
                      // 어디인지 알려주지 않으면 읽기전용이 그냥 막힌 셀로만 보인다.
                      // 부서 셀: 조직 트리 팝업이 가능하면 그걸 우선한다(화면 이동은 폴백).
                      const canAssign =
                        c.derived && canEdit && !!onAssignTeam && orgUnitOptions.length > 0;
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
                            background: isEditing ? '#fff' : cellDirty ? 'rgba(245,158,11,.06)' : 'transparent',
                            outline: isEditing ? `2px solid ${T.accent}` : 'none',
                            outlineOffset: -1,
                          }}
                        >
                          {isEditing ? (
                            <EditCell col={c} value={row[c.id]} autoFocus onChange={(val) => updateCell(row.id, c.id, val)} onKeyDown={(e) => handleKeyDown(e, row.id, c.id)} />
                          ) : (
                            <CellDisplay
                              col={c}
                              row={row}
                              renderAvatar={renderAvatar}
                              ceoLabel={L.ceoBadge}
                              ceoNoManagerHint={L.ceoNoManagerHint}
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
                    <td style={{ padding: '0 8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        {canViewSalary && onLoadSalaryHistory && (
                          <button onClick={() => setSalaryHistRowId(row.id)} title={L.salaryHistoryTitle || '연봉 이력'} style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.sub, fontSize: 12, fontWeight: 700, fontFamily: T.font }}>
                            ₩
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
      {assignRowId && canEdit && onAssignTeam && orgUnitOptions.length > 0 && (
        <OrgTreePicker
          open
          units={orgUnitOptions}
          value={primaryOrgEntry(orgTree, (rows.find((r) => r.id === assignRowId) || {}).orgUnitIds)?.id ?? ''}
          subtitle={(rows.find((r) => r.id === assignRowId) || {}).name}
          labels={L.orgPicker}
          onApply={(unitId) => onAssignTeam(assignRowId, unitId)}
          onClose={() => setAssignRowId(null)}
        />
      )}

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
    ['personalEmail', 'birthDate', 'gender', 'nationality', 'address'].some(
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
            <div style={{ fontSize: 11, color: T.muted }}>{L.salaryHistoryDesc || '적용일 기준 누적 이력 · 최신 이력이 현재 연봉으로 반영'}</div>
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
