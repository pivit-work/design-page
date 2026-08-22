import { useState, useMemo } from 'react';
import { LeadStarIcon, LeadStarOutlineIcon } from '../orgchart/squadIcons.jsx';
import { squadStatusMeta } from '../orgchart/squad-constants.js';

/**
 * SquadPicker — 한 사람의 **스쿼드 배정·리드 지정**을 고르는 팝업.
 *
 * 정본: `arch-core-data-model.md §1-5-b` (SQ3 개정 · SQ5 · SQ6 · SQ9 · SQ10 · SQ11),
 *      시안 `J. Admin_관리자/admin-employees-view.jsx` 의 SquadPicker.
 *
 * 소속(기능조직)의 `OrgTreePicker` 와 **같은 셸·같은 조작감**을 쓰되, 결정적으로 다른
 * 점이 하나 있다:
 *
 *  · SQ9 — **스쿼드에는 계층(`parent_id`)이 없다.** 그래서 트리로 그릴 수 없고,
 *    대신 **상태(진행중 / 준비중 / 종료·보관)로 그룹핑**한다. 없는 계층을 UI 에서
 *    만들어내지 않는다. 접근성 트리 구조(role="tree" + aria-level 1~2)는 유지해
 *    조작감을 맞춘다 — 1레벨이 상태 그룹, 2레벨이 스쿼드다.
 *
 * 그 밖의 규칙
 *  · SQ3 — 여기서 하는 것은 **배정과 리드 지정뿐**이다. 스쿼드 원장 CRUD(생성·상태
 *    전환·삭제, `p013`)는 조직도 스쿼드 뷰 전용이라 이 팝업에 만들기 버튼이 없다.
 *    "여기서는 못 만든다" 를 안내 문구로 밝힌다 — 안 보이는 이유를 모르면 버그로 읽힌다.
 *  · SQ6 — **계획 투입%를 표시·입력하지 않는다.** 정본은 조직도 스쿼드 뷰(매트릭스)다.
 *    같은 숫자를 두 화면에서 받으면 어느 쪽이 최신인지 판정 규칙이 필요해지고, 캐파
 *    게이지·과부하 경고가 매트릭스에만 있어 여기서는 100을 넘는지조차 보여줄 수 없다.
 *    신규 배정의 %는 서버 기본값(20)을 쓴다.
 *  · SQ10 — 리드는 스쿼드당 1명. 기존 리드가 있는 스쿼드에 지정하면 **확인 모달**을
 *    거치고, 교체는 서버가 한 트랜잭션으로 처리한다.
 *  · SQ11 — 스쿼드 리드는 `role` 파생 대상이 **아니다**. 한시 조직 리드로 상설 권한을
 *    올리면 스쿼드가 끝난 뒤에도 권한이 남는다. 그래서 확인 모달에 기능조직 조직장이
 *    쓰는 **승격 안내·강등 체크박스를 렌더하지 않는다.**
 */

const T = {
  font: "'Pretendard','Noto Sans KR',sans-serif",
  bg: '#F8FAFC',
  card: '#fff',
  border: '#E2E8F0',
  text: '#0F172A',
  sub: '#64748B',
  muted: '#94A3B8',
  accent: '#4F6AF5',
  // PW-194 — 리드 표기는 조직도(`org_squad.css` 의 `.sq-lead-mark`)가 정본이라
  // 같은 토큰을 탄다. 별표(표식)와 글자는 역할이 달라 색을 가른다:
  //  · leadMark = warning-500 — 조직도 별표와 같은 주황
  //  · lead     = warning-700 — 9~12px 글씨에 warning-500 을 쓰면 연노랑 배경에서
  //               대비가 2.2:1 로 떨어진다
  leadMark: 'var(--utility-warning-500, #F79009)',
  lead: 'var(--utility-warning-700, #B45309)',
  leadBg: 'var(--utility-warning-50, #FFFBEB)',
};

/** 조직도 별표와 맞춘 크기 — `SquadCanvas`/`SquadPieces` 의 `LeadStarIcon size={11}`. */
const LEAD_MARK_SIZE = 11;

/**
 * 상태 그룹 — SQ9 의 "계층 대신 상태" 정본 목록.
 * `done`·`archived` 를 한 묶음으로 두는 것은 SQ5 의 "종료·보관은 기본 숨김" 과 같은 축이다.
 */
export const SQUAD_GROUPS = [
  { key: 'active', statuses: ['active'] },
  { key: 'planned', statuses: ['planned'] },
  { key: 'closed', statuses: ['done', 'archived'] },
];

/** SQ5 — 목록·셀에 보이는 스쿼드. 종료·보관은 개수로만 센다. */
export function isVisibleSquadStatus(status) {
  return status === 'planned' || status === 'active';
}

const DEFAULT_LABELS = {
  title: '스쿼드 선택',
  hint: '스쿼드는 기능조직과 평행한 한시 조직축입니다. 계층이 없어 상태별로 묶어 보여줍니다.',
  leadHint: '소속한 스쿼드에는 [리드로] 버튼이 뜹니다 — 스쿼드당 리드 1명만 유지됩니다.',
  ledgerHint: '스쿼드 생성·상태 전환·삭제, 계획 투입%는 조직도 스쿼드 뷰에서 합니다.',
  search: '스쿼드 검색',
  empty: '검색 결과가 없어요',
  groupActive: '진행중',
  groupPlanned: '준비중',
  groupClosed: '종료·보관',
  // 라벨은 PW-422 에서 「매니저로」 → 「리드로」. 소속 트리 팝업의 `[조직장으로]` 와
  // 달리 스쿼드 리드는 권한(`role`)을 올리지 않는다(SQ11) — 두 버튼이 같은 말을 쓰면
  // 어드민이 「누르면 권한이 바뀐다」 와 「안 바뀐다」 를 구분할 근거가 화면에 없다.
  makeLead: '리드로',
  isLead: '리드',
  makeLeadTitle: '이 스쿼드의 리드로 지정합니다 (계정 권한은 바뀌지 않습니다)',
  releaseLeadTitle: '스쿼드 리드 지정을 해제합니다',
  selectedCount: '선택 {count}개 (종료·보관 제외)',
  apply: '적용',
  cancel: '취소',
  // 리드 확인 모달(SQ10)
  leadAssignTitle: '스쿼드 리드 지정',
  leadReleaseTitle: '스쿼드 리드 해제',
  leadAssignBody: '{name} 님을 {squad} 의 리드로 지정합니다.',
  leadReplaceBody: '기존 리드 {current} 님의 지정은 해제됩니다 — 스쿼드당 리드는 1명입니다.',
  leadReleaseBody: '{name} 님의 {squad} 리드 지정을 해제합니다. 리드가 없는 스쿼드도 정상입니다.',
  leadNoRoleChange: '스쿼드 리드는 한시 조직의 역할이라 계정 권한(역할)은 바뀌지 않습니다.',
  leadConfirm: '확인',
};

function fill(template, vars) {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.split(`{${k}}`).join(String(v ?? '')),
    String(template ?? ''),
  );
}

/**
 * 리드 확인 모달 — 기능조직 조직장과 **같은 확인 절차**(SQ10).
 *
 * 다만 승격 안내·강등 체크박스는 없다(SQ11). 그게 이 모달이 조직장 모달의 복제가
 * 아니라 별도 컴포넌트인 이유다 — 체크박스를 하나 끼워 넣기만 해도 한시 조직 리드가
 * 상설 권한을 남기게 된다.
 */
function SquadLeadConfirm({ mode, memberName, squadName, currentLeadName, labels, onCancel, onConfirm }) {
  const L = labels;
  const assigning = mode === 'assign';
  return (
    <div
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 10060, padding: 24, fontFamily: T.font,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        data-testid="squad-lead-confirm"
        style={{ width: 380, maxWidth: '100%', background: T.card, borderRadius: 12, padding: 20, boxShadow: '0 24px 64px rgba(15,23,42,.24)' }}
      >
        <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: T.text }}>
          {assigning ? L.leadAssignTitle : L.leadReleaseTitle}
        </h4>
        <p style={{ margin: '0 0 6px', fontSize: 12, color: T.sub, lineHeight: 1.6 }}>
          {fill(assigning ? L.leadAssignBody : L.leadReleaseBody, { name: memberName, squad: squadName })}
        </p>
        {assigning && currentLeadName && (
          <p data-testid="squad-lead-replace-note" style={{ margin: '0 0 6px', fontSize: 12, color: T.lead, lineHeight: 1.6 }}>
            {fill(L.leadReplaceBody, { current: currentLeadName })}
          </p>
        )}
        {/* SQ11 — 권한(역할)은 바뀌지 않는다. 조직장 모달의 승격 안내·강등 체크박스가
            여기 없는 이유를 사용자에게도 밝힌다. */}
        <p style={{ margin: '0 0 14px', fontSize: 11, color: T.muted, lineHeight: 1.6 }}>{L.leadNoRoleChange}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.sub, fontSize: 12, fontWeight: 600, fontFamily: T.font, cursor: 'pointer' }}
          >
            {L.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: T.accent, color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: T.font, cursor: 'pointer' }}
          >
            {L.leadConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SquadPicker({
  open = true,
  /** 전체 스쿼드 원장 — [{ id, name, status }] */
  squads = [],
  /** 대상 구성원 이름(헤더 부제) */
  memberName = '',
  /** 현재 배정 — [{ squadId, isLead }] */
  value = [],
  /** 스쿼드별 현 리드 이름 — { [squadId]: name }. 교체 확인 문구에 쓴다. */
  leadNameBySquadId = {},
  onApply,
  onClose,
  labels: providedLabels,
}) {
  const L = useMemo(() => ({ ...DEFAULT_LABELS, ...(providedLabels || {}) }), [providedLabels]);

  const initial = useMemo(
    () => value.map((s) => ({ squadId: String(s.squadId), isLead: s.isLead === true })),
    [value],
  );
  // 다른 행에서 같은 팝업을 재사용해도 현재 값으로 초기화된다.
  // "이전 props 와 비교해 렌더 중 상태 조정" — effect 안 setState 는 캐스케이드 렌더가 된다.
  const [syncedValue, setSyncedValue] = useState(initial);
  const [sel, setSel] = useState(initial);
  const [query, setQuery] = useState('');
  const [confirm, setConfirm] = useState(null); // { mode, squadId }

  if (syncedValue !== initial) {
    setSyncedValue(initial);
    setSel(initial);
    setQuery('');
    setConfirm(null);
  }

  const groupLabel = { active: L.groupActive, planned: L.groupPlanned, closed: L.groupClosed };
  const q = query.trim().toLowerCase();
  const rowOf = (id) => sel.find((s) => s.squadId === id);
  const squadById = (id) => squads.find((s) => String(s.id) === id);

  const groups = useMemo(() => {
    return SQUAD_GROUPS.map((g) => ({
      ...g,
      items: squads
        .filter((s) => g.statuses.includes(s.status))
        .filter((s) => !q || String(s.name || '').toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [squads, q]);

  if (!open) return null;

  const toggle = (id) => {
    setSel((prev) =>
      prev.some((s) => s.squadId === id)
        // 배정을 풀면 리드 자격도 함께 사라진다 — 배정되지 않은 사람은 리드일 수 없다.
        ? prev.filter((s) => s.squadId !== id)
        // SQ6 — 계획 투입%는 여기서 정하지 않는다. 서버 기본값(20)이 붙는다.
        : [...prev, { squadId: id, isLead: false }],
    );
  };

  const toggleLead = (id) => {
    const cur = rowOf(id);
    if (cur?.isLead) { setConfirm({ mode: 'release', squadId: id }); return; }
    // 기존 리드가 있으면 교체다 — 확인을 거친다(SQ10).
    if (leadNameBySquadId[id]) { setConfirm({ mode: 'assign', squadId: id }); return; }
    setSel((prev) => prev.map((s) => (s.squadId === id ? { ...s, isLead: true } : s)));
  };

  const commitConfirm = () => {
    const { mode, squadId } = confirm;
    setSel((prev) => prev.map((s) => (s.squadId === squadId ? { ...s, isLead: mode === 'assign' } : s)));
    setConfirm(null);
  };

  // SQ5 — 헤더 카운트도 종료·보관을 제외한다. 셀 표기와 같은 기준이어야 한다.
  const activeCount = sel.filter((s) => isVisibleSquadStatus(squadById(s.squadId)?.status)).length;

  return (
    <div
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24, fontFamily: T.font,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={L.title}
        data-testid="squad-picker"
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); } }}
        style={{
          width: 480, maxWidth: '100%', maxHeight: '78vh', display: 'flex', flexDirection: 'column',
          background: T.card, borderRadius: 14, boxShadow: '0 24px 64px rgba(15,23,42,.24)',
        }}
      >
        <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${T.border}` }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.text }}>
            {L.title}
            {memberName && <span style={{ marginLeft: 6, fontWeight: 600, color: T.sub }}>{memberName}</span>}
          </h3>
          <p style={{ margin: '4px 0 10px', fontSize: 11, color: T.muted, lineHeight: 1.6 }}>
            {L.hint}
            <br />{L.leadHint}
            {/* SQ3 — 원장 CRUD 가 여기 없는 이유를 밝힌다. */}
            <br /><span data-testid="squad-picker-ledger-hint">{L.ledgerHint}</span>
          </p>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={L.search}
            aria-label={L.search}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 8,
              border: `1px solid ${T.border}`, fontSize: 12, fontFamily: T.font,
              color: T.text, background: T.bg, outline: 'none',
            }}
          />
        </div>

        {/* SQ9 — 계층이 없으므로 1레벨은 **상태 그룹**, 2레벨이 스쿼드다. */}
        <div role="tree" aria-label={L.title} style={{ flex: 1, minHeight: 120, overflowY: 'auto', padding: '8px 12px' }}>
          {groups.map((g) => (
            <div key={g.key} role="group" aria-label={groupLabel[g.key]} data-testid={`squad-group-${g.key}`}>
              <div
                role="treeitem"
                aria-level={1}
                aria-expanded="true"
                style={{ padding: '6px 8px', fontSize: 10, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {groupLabel[g.key]}
              </div>
              {g.items.map((sq) => {
                const id = String(sq.id);
                const row = rowOf(id);
                const on = !!row;
                const closed = g.key === 'closed';
                return (
                  <div
                    key={id}
                    role="treeitem"
                    aria-level={2}
                    aria-selected={on}
                    data-testid={`squad-option-${id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 20,
                      paddingTop: 4, paddingBottom: 4, borderRadius: 6,
                      background: row?.isLead ? T.leadBg : 'transparent',
                      opacity: closed ? 0.55 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(id)}
                      aria-label={sq.name}
                      style={{ cursor: 'pointer', accentColor: T.accent }}
                    />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: T.text, overflowWrap: 'anywhere' }}>{sq.name}</span>

                    {/* 스쿼드 리드 — 배정된 스쿼드에만 노출된다. */}
                    {on && (row.isLead ? (
                      <button
                        type="button"
                        data-testid={`squad-lead-on-${id}`}
                        onClick={() => toggleLead(id)}
                        title={L.releaseLeadTitle}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0,
                          fontSize: 9, fontWeight: 800, color: T.lead, background: T.leadBg,
                          border: `1px solid var(--utility-warning-200, #FDE68A)`,
                          borderRadius: 99, padding: '1px 7px',
                          cursor: 'pointer', fontFamily: T.font,
                        }}
                      >
                        {/* 별표만 조직도와 같은 주황 — 칩 글자는 대비를 위해 진한 warning-700 유지 */}
                        <span data-testid={`squad-lead-chip-mark-${id}`} style={{ color: T.leadMark, display: 'inline-flex' }}>
                          <LeadStarIcon size={9} />
                        </span>
                        {L.isLead}
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid={`squad-lead-off-${id}`}
                        onClick={() => toggleLead(id)}
                        title={L.makeLeadTitle}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0,
                          fontSize: 10, color: T.muted, background: 'none', border: 'none',
                          cursor: 'pointer', fontFamily: T.font, padding: 0,
                        }}
                      >
                        <LeadStarOutlineIcon size={10} />
                        {L.makeLead}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
          {groups.length === 0 && (
            <p style={{ margin: '20px 0', textAlign: 'center', fontSize: 12, color: T.muted }}>{L.empty}</p>
          )}
        </div>

        <div style={{ padding: '10px 20px', borderTop: `1px solid ${T.border}`, background: T.bg }}>
          <span data-testid="squad-picker-count" style={{ fontSize: 11, color: T.sub }}>
            {fill(L.selectedCount, { count: activeCount })}
          </span>
        </div>

        <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.card, color: T.sub, fontSize: 12, fontWeight: 600, fontFamily: T.font, cursor: 'pointer' }}
          >
            {L.cancel}
          </button>
          <button
            type="button"
            onClick={() => { onApply?.(sel); onClose?.(); }}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: T.accent, color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: T.font, cursor: 'pointer' }}
          >
            {L.apply}
          </button>
        </div>
      </div>

      {confirm && (
        <SquadLeadConfirm
          mode={confirm.mode}
          memberName={memberName}
          squadName={squadById(confirm.squadId)?.name || ''}
          currentLeadName={confirm.mode === 'assign' ? leadNameBySquadId[confirm.squadId] : null}
          labels={L}
          onCancel={() => setConfirm(null)}
          onConfirm={commitConfirm}
        />
      )}
    </div>
  );
}

/**
 * 스쿼드 셀 — 목록에서 한 사람의 스쿼드를 보여주고, 누르면 위 팝업을 연다.
 *
 * 소속(기능조직) 셀과 **별도 컬럼**이다(SQ1) — 한 칸에 두 축을 섞으면 인원 집계의
 * 분모가 오염되고(SQ2) 한시 조직이 상설 조직처럼 보인다.
 *
 * 표기 규칙
 *  · SQ5 — planned·active 만 이름으로 보이고, done·archived 는 「종료 N」 한 줄로만.
 *  · SQ7 — ⭐ 는 **읽기 전용 표기**다. 지정·해제는 팝업 안에서만 한다. 기능조직
 *    조직장(👤)과 다른 개념이라 아이콘을 분리한다.
 *  · SQ6 — 계획 투입%를 쓰지 않는다.
 */
export function SquadCell({ squads = [], assignments = [], statusLabels = {}, closedLabel, emptyLabel, onOpen, canEdit }) {
  const byId = new Map(squads.map((s) => [String(s.id), s]));
  const rows = assignments
    .map((a) => ({ ...a, squad: byId.get(String(a.squadId)) }))
    .filter((a) => a.squad);
  const visible = rows.filter((a) => isVisibleSquadStatus(a.squad.status));
  const hidden = rows.length - visible.length;

  const closedText = (closedLabel || '종료 {count}').replace('{count}', String(hidden));

  return (
    <div
      onClick={() => canEdit && onOpen?.()}
      data-testid="squad-cell"
      style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 0', minWidth: 0, cursor: canEdit ? 'pointer' : 'default' }}
    >
      {visible.length === 0 ? (
        hidden > 0
          ? <span style={{ fontSize: 10.5, color: T.muted }}>{closedText}</span>
          : <span style={{ fontSize: 12, color: T.muted }}>{emptyLabel || '—'}</span>
      ) : (
        visible.map((a) => (
          <span
            key={a.squadId}
            title={a.squad.name}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }}
          >
            {/* SQ7 — 읽기 전용 표기. 색은 감싸는 span 의 color 를 아이콘이 상속한다. */}
            {a.isLead && (
              <span data-testid={`squad-lead-badge-${a.squadId}`} title={statusLabels.lead || '스쿼드 리드'} style={{ color: T.leadMark, display: 'inline-flex', flexShrink: 0 }}>
                <LeadStarIcon size={LEAD_MARK_SIZE} />
              </span>
            )}
            <span style={{ fontSize: 12, color: T.text, overflowWrap: 'anywhere' }}>{a.squad.name}</span>
            {a.squad.status === 'planned' && (
              <span
                style={{
                  flexShrink: 0, fontSize: 9, fontWeight: 700, lineHeight: 1.4, padding: '0 4px',
                  borderRadius: 3, boxSizing: 'border-box',
                  background: squadStatusMeta('planned').bg,
                  border: `1px solid ${T.border}`,
                  color: squadStatusMeta('planned').text,
                }}
              >
                {statusLabels.planned || squadStatusMeta('planned').label}
              </span>
            )}
          </span>
        ))
      )}
      {visible.length > 0 && hidden > 0 && (
        <span style={{ fontSize: 9.5, color: T.muted }}>{closedText}</span>
      )}
    </div>
  );
}
