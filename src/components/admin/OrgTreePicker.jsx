import { useState, useMemo, useRef } from 'react';
import { buildOrgTree, findOrgEntry, ORG_PATH_SEP } from './orgTree.js';

/**
 * OrgTreePicker — 소속(조직)을 계층 트리에서 고르는 팝업.
 * 정본: pivit-specs `spec-team-management.md §5-A` (OrgPicker P1~P9),
 *      시안 `J. Admin_관리자/admin-employees-view.jsx` 의 OrgTreePicker.
 *
 * 어드민에서 조직을 고르는 지점(구성원 소속 셀, 미배정 배정)이 전부 이 컴포넌트를
 * 쓴다 — 화면마다 다른 표기를 만들지 않는다.
 *
 * 규칙
 *  · P1 depth 당 왼쪽 패딩 12px. 공백문자·`└─` 문자 들여쓰기를 쓰지 않는다
 *       (폰트에 따라 정렬이 깨지고 스크린리더가 무의미한 문자를 읽는다)
 *  · P3 상위(중간 관리) 조직도 **선택 가능** — leaf 만 허용하지 않는다
 *  · P4 경로 표기 구분자는 `›`
 *  · P5 검색 시 매칭 노드 + 조상 경로를 함께 남기고, 조상은 선택 불가(dim)
 *  · P7 `— 미배정 —` 은 목록 최하단 고정, 들여쓰기 0
 *  · 접근성: role="tree" + aria-level. 들여쓰기는 시각 표현일 뿐이므로 계층을
 *       별도로 전달한다. 키보드 ↑↓ 이동 / → 펼침 / ← 접기 / Enter 선택
 *
 * 겸직(다중 선택) — `multi` (PW-368)
 *  · 정본 `admin-spec.md §3.8.3-B`. 소속 셀은 겸직을 칩으로 쌓아 **보여주는데** 편집만
 *    단일 선택이면, 하나를 고르는 순간 나머지 소속이 조용히 사라진다. 그래서 편집도
 *    배열이어야 한다.
 *  · 체크박스로 여러 조직을 고르고, 그중 하나를 `[주 소속으로]` 로 지정한다.
 *    1곳만 고르면 **자동으로** 주 소속이다 — 한 곳뿐인데 따로 누르게 하면 대부분
 *    주 소속 없는 상태를 만든다.
 *  · 주 소속을 체크 해제하면 **남은 첫 조직**이 주 소속이 된다(B1). 선택이 비지 않는다.
 *  · 전부 해제하면 「선택 없음」 문구로 미배정이 된다고 **적용 전에** 고지한다(B2).
 *
 * 유지되는 상위 경로 — `retainedIds` (PW-404)
 *  · 선택(`selectedIds`)은 **단말 소속**만 담는다. 서버가 배정 행 중 「다른 행의 조상」을
 *    접기 때문이다(CSV import 가 본부·부서·팀마다 행을 만들어서, 안 접으면 겸직이 아닌
 *    사람도 소속 3곳으로 보인다).
 *  · 그래서 「선택 2곳」인데 서버가 아는 행은 3개인 상황이 생긴다. 화면이 그 한 행을
 *    말하지 않으면 **적용해도 지켜지는지 알 방법이 없다** — 실제로 어드민이 「상위 소속이
 *    함께 떨어질까 봐」 올바른 조작을 포기했다(PW-404).
 *  · `retainedIds` 로 그 접힌 행을 받아, **지금 고른 조직의 조상인 동안** 「유지」 로
 *    표시한다. 체크박스는 켜진 채 **잠근다** — 하위 조직에 속한 이상 끌 수 없는데
 *    끌 수 있는 것처럼 그리면 거짓말이다.
 *  · 유지되는 개수는 「선택 N곳」에 **더하지 않는다.** 소속 셀과 팝업이 같은 「소속」
 *    (주 소속 + 겸직 단말)을 말해야 한다 — 한쪽만 조상을 세면 두 뷰가 다른 숫자를 말한다.
 *
 * 조직장(매니저) 지정 — `onToggleLeader` (PW-400)
 *  · **주입한 호출부에만** `[매니저로]` 가 뜬다. 미주입이면 버튼 자체가 없다.
 *  · 시트의 소속 팝업에는 **주입하지 않는다** — 남의 자격을 떼고 권한을 승격시키는
 *    파괴적 단건 동작이라 확인이 따라붙는데, 수십 행을 훑는 편집 화면의 성격이 아니다
 *    (PW-110 · PW-326 David 확정 · §3.8.3-B 「의도적으로 다른 점」).
 *  · 그래서 이 버튼이 서는 자리는 **목록 뷰의 소속 팝업 하나**다. 목록 뷰가 표가 아니던
 *    동안에는 두 뷰 어디에도 없었다.
 *  · 소속한(=체크된) 조직에만 뜬다(L3). 소속하지 않은 조직의 장이 되는 경로는 없다.
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
  amber: '#B45309',
};

const DEFAULT_LABELS = {
  title: '소속 선택',
  hint: '상위 조직도 선택할 수 있습니다.',
  search: '조직 검색',
  empty: '검색 결과가 없어요',
  unassigned: '— 미배정 —',
  selected: '선택',
  none: '선택 없음 — 저장하면 미배정이 됩니다',
  apply: '적용',
  cancel: '취소',
  expand: '펼치기',
  collapse: '접기',
  // 겸직(다중 선택) 전용 — PW-368
  multiHint: '여러 조직을 고를 수 있습니다. 주 소속은 한 곳입니다.',
  primary: '주 소속',
  makePrimary: '주 소속으로',
  makePrimaryTitle: '이 조직을 주 소속으로 지정합니다',
  // 조직장 지정 — PW-400
  makeLeader: '매니저로',
  makeLeaderTitle: '이 조직의 매니저(조직장)로 지정합니다. 권한이 매니저로 오르고 팀당 1명만 유지됩니다',
  leaderBadge: '매니저',
  leaderBadgeTitle: '이 조직의 조직장입니다. 눌러서 해제합니다 (권한은 유지)',
  leaderBlocked: '퇴사자는 조직장으로 지정할 수 없습니다',
  selectedCount: '선택 {count}곳',
  clearAll: '모두 해제',
  // 유지되는 상위 경로 — PW-404
  retainedBadge: '유지',
  retainedBadgeTitle: '하위 조직에 속해 있어 이 상위 조직은 그대로 유지됩니다. 따로 끌 수 없습니다',
  retainedSuffix: '상위 경로 {count}곳 유지',
  // 추가 전용(`primarySelectable={false}`) 전용 — PW-373
  appendHint: '고른 조직이 더해집니다. 기존 소속과 주 소속은 그대로 남습니다.',
  appendNone: '고른 조직이 없습니다 — 적용해도 아무것도 더해지지 않습니다',
};

/** 접힘 여부 — 조상 중 하나라도 접혀 있으면 숨긴다. 검색 중에는 접힘을 무시한다. */
function isHidden(entry, collapsed, searching) {
  if (searching) return false;
  return entry.ancestorIds.some((id) => collapsed[id]);
}

export default function OrgTreePicker({
  open = true,
  units = [],
  /** 현재 선택된 조직 id ('' 이면 미배정). `multi` 면 무시된다. */
  value = '',
  /**
   * 겸직(다중 선택) 모드 — PW-368. 켜면 `selectedIds`·`primaryId` 를 읽고
   * `onApply({ unitIds, primaryUnitId })` 로 돌려준다. 끄면 종전과 같이
   * 단일 선택이며 `onApply(unitId)` 다.
   */
  multi = false,
  /** multi 모드의 현재 소속 id 배열 — 주 소속이 맨 앞일 필요는 없다. */
  selectedIds = [],
  /** multi 모드의 현재 주 소속 id. */
  primaryId = '',
  /**
   * 주 소속을 고를 수 있는가 — 기본 true (PW-373).
   *
   * **추가 전용** 경로(일괄 편집 바의 «소속 추가»)에서 false 로 끈다. 그 경로는
   * 여러 사람에게 조직을 더하기만 하는데, 주 소속은 사람마다 이미 다르다 —
   * 팝업에서 하나를 고르게 하면 「선택한 전원의 주 소속을 이걸로 바꾼다」는 뜻이
   * 되고, 그게 정본이 금지한 일괄 교체다(§3.8.3-B 「일괄 편집 바」).
   */
  primarySelectable = true,
  /**
   * 배정 행 중 **선택에 나타나지 않는 조상 행** id 배열 (PW-404).
   *
   * 호출부가 `orgUnitIds`(원본 행) − `selectedIds`(단말) 로 만들어 넘긴다. 팝업은 이 중
   * **지금 고른 조직의 조상인 것만** 「유지」로 표시한다 — 조상이 아니게 된 행은 적용 시
   * 실제로 정리되므로, 그때는 유지라고 말하면 안 된다.
   */
  retainedIds = [],
  /**
   * 조직장(매니저)인 조직 id 배열 (PW-400). `onToggleLeader` 와 짝이다.
   */
  leaderUnitIds = [],
  /**
   * 조직장 지정·해제 `(unitId, next: boolean) => void`.
   *
   * 미주입이면 `[매니저로]` 버튼이 **아예 뜨지 않는다** — 눌러도 아무 일 없는 버튼을
   * 두지 않는다. 시트의 소속 팝업이 바로 이 경우다.
   */
  onToggleLeader,
  /**
   * 조직장으로 지정할 수 있는 대상인가 (L6). 퇴사자면 false.
   * 버튼을 감추지 않고 **비활성 + 이유**로 남긴다 — 없으면 「왜 나만 안 되지」 가 된다.
   */
  canBeLeader = true,
  onApply,
  onClose,
  labels: providedLabels,
  /** 헤더 부제 — 대상 구성원 이름 등 */
  subtitle,
}) {
  const labels = useMemo(() => ({ ...DEFAULT_LABELS, ...(providedLabels || {}) }), [providedLabels]);
  const tree = useMemo(() => buildOrgTree(units), [units]);

  const initial = value != null ? String(value) : '';
  // multi 의 초기값은 배열이라 `!==` 비교로는 매 렌더가 "바뀜" 이 된다 — 문자열 키로 굳힌다.
  const initialMulti = useMemo(
    () => (selectedIds || []).map(String).filter(Boolean),
    [selectedIds],
  );
  const initialPrimary = primaryId != null ? String(primaryId) : '';
  const syncKey = multi
    ? `m:${initialMulti.join(',')}|${initialPrimary}`
    : `s:${initial}`;

  const [syncedValue, setSyncedValue] = useState(syncKey);
  const [sel, setSel] = useState(initial);
  // multi: 고른 조직 id 배열. **선택 순서를 보존**한다 — 주 소속이 빠졌을 때
  // "남은 첫 조직" 이 무엇인지가 이 순서로 정해진다(B1).
  const [picked, setPicked] = useState(initialMulti);
  const [primary, setPrimary] = useState(
    initialPrimary || initialMulti[0] || '',
  );
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef(null);

  // 대상이 바뀌면(다른 행에서 같은 팝업을 재사용) 현재 값으로 초기화한다.
  // "이전 props 와 비교해 렌더 중 상태 조정" 패턴 — effect 안 setState 는 캐스케이드 렌더가 된다.
  if (syncedValue !== syncKey) {
    setSyncedValue(syncKey);
    setSel(initial);
    setPicked(initialMulti);
    setPrimary(initialPrimary || initialMulti[0] || '');
    setQuery('');
    setCollapsed({});
    setActiveIdx(0);
  }

  // props 배열은 매 렌더 새 참조라 `.includes` 판정만 쓰고 상태로 들지 않는다 —
  // 조직장 자리의 정본은 서버이고, 팝업은 그 값을 그릴 뿐이다.
  const leaderIds = useMemo(
    () => (leaderUnitIds || []).map(String).filter(Boolean),
    [leaderUnitIds],
  );

  /**
   * 지금 「유지」로 표시할 조상 행 (PW-404).
   *
   * `retainedIds` 를 그대로 쓰지 않는다 — 고른 조직이 바뀌어 더 이상 조상이 아니게 되면
   * 서버는 그 행을 **정리한다.** 화면이 계속 「유지」라고 말하면 적용 결과와 어긋난다.
   * 명시적으로 고른 것(`picked`)은 「선택」이지 「유지」가 아니므로 뺀다.
   */
  const retainedActive = useMemo(() => {
    const pool = new Set((retainedIds || []).map(String).filter(Boolean));
    if (pool.size === 0) return new Set();
    const out = new Set();
    for (const id of picked) {
      const entry = findOrgEntry(tree, id);
      for (const anc of entry?.ancestorIds || []) {
        if (pool.has(anc) && !picked.includes(anc)) out.add(anc);
      }
    }
    return out;
  }, [retainedIds, picked, tree]);

  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  // P5 — 매칭 노드 + 조상까지 남긴다. 조상은 ghost(선택 불가)로 표시한다.
  const { rows, ghostIds } = useMemo(() => {
    if (!searching) {
      return { rows: tree.filter((e) => !isHidden(e, collapsed, false)), ghostIds: new Set() };
    }
    const matched = tree.filter((e) => e.name.toLowerCase().includes(q));
    const keep = new Set();
    const ghosts = new Set();
    for (const e of matched) {
      keep.add(e.id);
      for (const anc of e.ancestorIds) {
        if (!keep.has(anc)) ghosts.add(anc);
        keep.add(anc);
      }
    }
    for (const e of matched) ghosts.delete(e.id);
    return { rows: tree.filter((e) => keep.has(e.id)), ghostIds: ghosts };
  }, [tree, q, searching, collapsed]);

  // 키보드 이동 대상 = 트리 행 + 미배정 행(마지막). 선택 불가(ghost)는 건너뛴다.
  const navRows = useMemo(
    () => [...rows.filter((e) => !ghostIds.has(e.id)).map((e) => e.id), ''],
    [rows, ghostIds],
  );

  // 검색으로 행이 줄면 커서가 목록 밖을 가리킬 수 있다 — 렌더 시점에 클램프한다.
  const cursor = Math.min(activeIdx, Math.max(navRows.length - 1, 0));

  if (!open) return null;

  const selEntry = findOrgEntry(tree, sel);
  const toggleCollapse = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

  /**
   * 다중 선택 토글 (PW-368).
   *
   * 주 소속 규칙을 **선택을 바꾸는 그 자리에서** 함께 맞춘다. 따로 두면 「주 소속이
   * 선택 밖을 가리키는」 중간 상태가 화면에 생기고, 그게 서버에서 422 로 돌아온다.
   *  · 처음 고른 한 곳은 자동으로 주 소속
   *  · 주 소속을 해제하면 남은 **첫 조직**이 주 소속
   *  · 전부 해제하면 주 소속도 비운다(= 미배정)
   */
  const togglePick = (id) => {
    if (!id) return;
    setPicked((prev) => {
      const on = prev.includes(id);
      const next = on ? prev.filter((x) => x !== id) : [...prev, id];
      setPrimary((cur) => {
        if (next.length === 0) return '';
        if (!on) return cur && next.includes(cur) ? cur : next[0];
        return cur === id || !next.includes(cur) ? next[0] : cur;
      });
      return next;
    });
  };

  const clearAll = () => {
    setPicked([]);
    setPrimary('');
  };

  const onKeyDown = (e) => {
    if (navRows.length === 0) return;
    const cur = navRows[cursor];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(Math.min(cursor + 1, navRows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(Math.max(cursor - 1, 0));
    } else if (e.key === 'ArrowRight') {
      if (cur && collapsed[cur]) { e.preventDefault(); toggleCollapse(cur); }
    } else if (e.key === 'ArrowLeft') {
      if (cur && !collapsed[cur]) { e.preventDefault(); toggleCollapse(cur); }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // multi 에서 Enter 는 체크 토글이다 — 단일 모드의 "이 하나로 정한다" 와 다르다.
      if (multi) {
        if (cur) togglePick(cur);
        else clearAll();
      } else {
        setSel(cur ?? '');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
    }
  };

  const rowStyle = (selected, ghost) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    boxSizing: 'border-box',
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 5,
    paddingBottom: 5,
    borderRadius: 6,
    border: 'none',
    textAlign: 'left',
    background: selected ? '#EEF2FF' : 'transparent',
    color: selected ? T.accent : T.text,
    fontWeight: selected ? 700 : 500,
    fontFamily: T.font,
    fontSize: 12,
    cursor: ghost ? 'default' : 'pointer',
    opacity: ghost ? 0.45 : 1,
  });

  return (
    <div
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 24, fontFamily: T.font,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={labels.title}
        data-testid="org-tree-picker"
        style={{
          width: 460, maxWidth: '100%', maxHeight: '78vh', display: 'flex', flexDirection: 'column',
          background: T.card, borderRadius: 14, boxShadow: '0 24px 64px rgba(15,23,42,.24)',
        }}
      >
        <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${T.border}` }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.text }}>
            {labels.title}
            {subtitle && <span style={{ marginLeft: 6, fontWeight: 600, color: T.sub }}>{subtitle}</span>}
          </h3>
          <p style={{ margin: '4px 0 10px', fontSize: 11, color: T.muted, lineHeight: 1.5 }}>
            {labels.hint}
            {multi && (
              <>
                <br />
                <span data-testid="org-tree-picker-multi-hint">
                  {primarySelectable ? labels.multiHint : labels.appendHint}
                </span>
              </>
            )}
          </p>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={labels.search}
            aria-label={labels.search}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 8,
              border: `1px solid ${T.border}`, fontSize: 12, fontFamily: T.font,
              color: T.text, background: T.bg, outline: 'none',
            }}
          />
        </div>

        <div
          ref={listRef}
          role="tree"
          aria-label={labels.title}
          tabIndex={0}
          onKeyDown={onKeyDown}
          style={{ flex: 1, minHeight: 120, overflowY: 'auto', padding: '8px 12px', outline: 'none' }}
        >
          {rows.map((e) => {
            const ghost = ghostIds.has(e.id);
            const selected = sel === e.id;
            const navIdx = navRows.indexOf(e.id);
            return (
              <div
                key={e.id}
                role="treeitem"
                aria-level={e.depth + 1}
                aria-selected={selected}
                aria-expanded={e.hasChildren ? !collapsed[e.id] : undefined}
                aria-disabled={ghost || undefined}
                data-depth={e.depth}
                // P1 — depth 당 왼쪽 패딩 12px. 공백문자·`└─` 로 들여쓰지 않는다.
                style={{ display: 'flex', alignItems: 'center', paddingLeft: e.depth * 12 }}
              >
                {e.hasChildren && !searching ? (
                  <button
                    type="button"
                    onClick={() => toggleCollapse(e.id)}
                    aria-label={`${e.name} ${collapsed[e.id] ? labels.expand : labels.collapse}`}
                    style={{
                      width: 16, height: 20, flexShrink: 0,
                      background: 'none', border: 'none', cursor: 'pointer', color: T.muted,
                      padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <svg
                      width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden
                      style={{ transform: collapsed[e.id] ? 'rotate(-90deg)' : 'none', transition: 'transform .12s' }}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                ) : (
                  <span style={{ width: 16, flexShrink: 0 }} />
                )}
                {multi && !ghost && (
                  // PW-404 — 유지되는 상위 경로는 **켜진 채 잠근다.** 하위 조직에 속한 이상
                  // 끌 수 없는데 끌 수 있는 것처럼 그리면, 눌러도 안 꺼지는 체크박스가 된다.
                  <input
                    type="checkbox"
                    checked={picked.includes(e.id) || retainedActive.has(e.id)}
                    disabled={retainedActive.has(e.id)}
                    onChange={() => { togglePick(e.id); if (navIdx >= 0) setActiveIdx(navIdx); }}
                    aria-label={retainedActive.has(e.id)
                      ? `${e.pathLabel} — ${labels.retainedBadgeTitle}`
                      : e.pathLabel}
                    data-testid={`org-tree-check-${e.id}`}
                    style={{
                      cursor: retainedActive.has(e.id) ? 'not-allowed' : 'pointer',
                      accentColor: T.accent, flexShrink: 0, marginRight: 2,
                    }}
                  />
                )}
                <button
                  type="button"
                  disabled={ghost}
                  onClick={() => {
                    // 유지되는 상위 경로는 토글 대상이 아니다 — 체크박스와 같은 규칙(PW-404).
                    if (multi && retainedActive.has(e.id)) return;
                    if (multi) togglePick(e.id);
                    else setSel(e.id);
                    if (navIdx >= 0) setActiveIdx(navIdx);
                  }}
                  title={e.pathLabel}
                  style={{
                    ...rowStyle(selected, ghost),
                    flex: 1,
                    minWidth: 0,
                    outline: navIdx >= 0 && navIdx === cursor ? `2px solid ${T.accent}` : 'none',
                    outlineOffset: -2,
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
                </button>
                {/* 유지되는 상위 경로 (PW-404) — 왜 체크가 켜져 있고 못 끄는지를 말한다. */}
                {multi && retainedActive.has(e.id) && (
                  <span
                    data-testid={`org-tree-retained-badge-${e.id}`}
                    title={labels.retainedBadgeTitle}
                    style={{
                      flexShrink: 0, fontSize: 9, fontWeight: 800, lineHeight: 1.5,
                      padding: '1px 6px', borderRadius: 99, boxSizing: 'border-box',
                      background: T.bg, border: `1px dashed ${T.border}`, color: T.sub,
                    }}
                  >
                    {labels.retainedBadge}
                  </span>
                )}
                {/* 주 소속 지정 — 고른 조직에만 뜬다. 한 곳뿐이면 이미 주 소속이라 배지만 보인다. */}
                {multi && primarySelectable && picked.includes(e.id) && (
                  primary === e.id ? (
                    <span
                      data-testid={`org-tree-primary-badge-${e.id}`}
                      style={{
                        flexShrink: 0, fontSize: 9, fontWeight: 800, lineHeight: 1.5,
                        padding: '1px 6px', borderRadius: 99, boxSizing: 'border-box',
                        background: '#EEF2FF', border: `1px solid #C7D2FE`, color: T.accent,
                      }}
                    >
                      {labels.primary}
                    </span>
                  ) : (
                    <button
                      type="button"
                      data-testid={`org-tree-make-primary-${e.id}`}
                      onClick={() => setPrimary(e.id)}
                      title={labels.makePrimaryTitle}
                      style={{
                        flexShrink: 0, fontSize: 10, color: T.muted, background: 'none',
                        border: 'none', cursor: 'pointer', fontFamily: T.font, padding: '0 2px',
                      }}
                    >
                      {labels.makePrimary}
                    </button>
                  )
                )}
                {/* 이 조직의 매니저(조직장) 지정 — 소속한 조직에만 노출(L3).
                    해제해도 권한은 그대로 둔다(L11) — 조직장 해제와 권한 강등은 별개 결정이다. */}
                {multi && onToggleLeader && picked.includes(e.id) && (
                  leaderIds.includes(e.id) ? (
                    <button
                      type="button"
                      data-testid={`org-tree-leader-badge-${e.id}`}
                      onClick={() => onToggleLeader(e.id, false)}
                      title={labels.leaderBadgeTitle}
                      style={{
                        flexShrink: 0, fontSize: 9, fontWeight: 800, lineHeight: 1.5,
                        padding: '1px 7px', borderRadius: 99, boxSizing: 'border-box',
                        background: T.bg, border: `1px solid ${T.border}`, color: T.text,
                        cursor: 'pointer', fontFamily: T.font,
                      }}
                    >
                      {labels.leaderBadge}
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-testid={`org-tree-make-leader-${e.id}`}
                      disabled={!canBeLeader}
                      onClick={() => canBeLeader && onToggleLeader(e.id, true)}
                      title={canBeLeader ? labels.makeLeaderTitle : labels.leaderBlocked}
                      style={{
                        flexShrink: 0, fontSize: 10, color: canBeLeader ? T.muted : T.border,
                        background: 'none', border: 'none', fontFamily: T.font, padding: '0 2px',
                        cursor: canBeLeader ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {labels.makeLeader}
                    </button>
                  )
                )}
              </div>
            );
          })}

          {rows.length === 0 && (
            <p style={{ margin: '20px 0', textAlign: 'center', fontSize: 12, color: T.muted }}>{labels.empty}</p>
          )}

          {/* P7 — 미배정은 항상 최하단, 들여쓰기 0.
              multi 에서는 「미배정을 고른다」가 아니라 **모두 해제**다 — 선택을 비우는
              것이 곧 미배정이므로 같은 뜻을 두 조작으로 두지 않는다. */}
          <div role="treeitem" aria-level={1} aria-selected={multi ? picked.length === 0 : sel === ''}>
            <button
              type="button"
              data-testid={multi ? 'org-tree-clear-all' : undefined}
              onClick={() => {
                if (multi) clearAll();
                else setSel('');
                setActiveIdx(navRows.length - 1);
              }}
              style={{
                ...rowStyle(multi ? picked.length === 0 : sel === '', false),
                marginTop: 4,
                borderTop: `1px solid ${T.border}`,
                borderRadius: 0,
                color: (multi ? picked.length === 0 : sel === '') ? T.accent : T.sub,
                outline: cursor === navRows.length - 1 ? `2px solid ${T.accent}` : 'none',
                outlineOffset: -2,
              }}
            >
              {multi ? labels.clearAll : labels.unassigned}
            </button>
          </div>
        </div>

        {/* 선택 요약 — 전체 경로로 보여준다(동명이팀 구분, P4) */}
        <div style={{ padding: '10px 20px', borderTop: `1px solid ${T.border}`, background: T.bg }}>
          {multi ? (
            picked.length === 0 ? (
              // B2 — 적용 버튼을 누르기 **전에** 미배정이 된다고 말한다.
              // 추가 전용에서는 아무것도 비우지 않으므로 «미배정» 이라고 말하면 거짓말이다.
              <span data-testid="org-tree-picker-selection" style={{ fontSize: 11, color: T.amber }}>
                {primarySelectable ? labels.none : labels.appendNone}
              </span>
            ) : (
              <div data-testid="org-tree-picker-selection" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: T.sub, marginRight: 2 }}>
                  {String(labels.selectedCount).split('{count}').join(String(picked.length))}
                </span>
                {retainedActive.size > 0 && (
                  // 「선택 N곳」에 더하지 않고 **따로** 적는다 — 소속 셀은 단말만 세므로,
                  // 여기서 합치면 같은 사람을 두 화면이 다른 숫자로 말하게 된다(PW-404).
                  <span
                    data-testid="org-tree-picker-retained"
                    title={labels.retainedBadgeTitle}
                    style={{ fontSize: 11, color: T.sub, marginRight: 2 }}
                  >
                    · {String(labels.retainedSuffix).split('{count}').join(String(retainedActive.size))}
                  </span>
                )}
                {picked.map((id) => {
                  const entry = findOrgEntry(tree, id);
                  const isPrimary = primarySelectable && id === primary;
                  return (
                    <span
                      key={id}
                      data-testid={`org-tree-picked-${id}`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
                        color: isPrimary ? T.accent : T.sub, background: T.card,
                        border: `1px solid ${isPrimary ? '#C7D2FE' : T.border}`,
                        borderRadius: 99, padding: '2px 9px', boxSizing: 'border-box',
                        overflowWrap: 'anywhere',
                        fontWeight: isPrimary ? 700 : 500,
                      }}
                    >
                      {entry ? entry.pathLabel : id}
                      {isPrimary && (
                        <span style={{ fontSize: 9, fontWeight: 800 }}>{labels.primary}</span>
                      )}
                    </span>
                  );
                })}
              </div>
            )
          ) : selEntry ? (
            <span
              data-testid="org-tree-picker-selection"
              style={{
                display: 'inline-flex', alignItems: 'center', fontSize: 11, color: T.sub,
                background: T.card, border: `1px solid ${T.border}`, borderRadius: 99,
                padding: '2px 9px', boxSizing: 'border-box', overflowWrap: 'anywhere',
              }}
            >
              {selEntry.pathLabel}
            </span>
          ) : (
            <span data-testid="org-tree-picker-selection" style={{ fontSize: 11, color: T.amber }}>{labels.none}</span>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`,
              background: T.card, color: T.sub, fontSize: 12, fontWeight: 600,
              fontFamily: T.font, cursor: 'pointer',
            }}
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            onClick={() => {
              // multi 는 배열과 주 소속을 **한 번에** 넘긴다 — 따로 쓰면 주 소속이
              // 배열 밖을 가리키는 중간 상태가 생긴다(§3.8.3-B 「적용」).
              if (multi) {
                onApply?.({
                  unitIds: picked,
                  // 추가 전용은 주 소속을 고르지 않는다 — 서버가 사람마다 유지한다.
                  primaryUnitId: primarySelectable && picked.length ? primary : null,
                });
              }
              else onApply?.(sel);
              onClose?.();
            }}
            style={{
              padding: '7px 16px', borderRadius: 8, border: 'none', background: T.accent,
              color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: T.font, cursor: 'pointer',
            }}
          >
            {labels.apply}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 소속 컬럼·칩의 단일 값 표기 — 상위 경로는 회색 작은 글씨, 최하위 팀명만 본문 색(§5-A P4).
 * 트리에 없는 값(레거시 텍스트 부서)은 그대로 한 덩어리로 보여준다.
 */
export function OrgPathLabel({ entry, fallback, muted = '#94A3B8', color = '#0F172A', maxWidth }) {
  if (!entry) {
    return <span style={{ fontSize: 12, color: fallback ? color : muted }}>{fallback || '—'}</span>;
  }
  const parents = entry.pathNames.slice(0, -1);
  const leaf = entry.pathNames[entry.pathNames.length - 1];
  return (
    <span
      title={entry.pathLabel}
      style={{
        display: 'inline-flex', alignItems: 'baseline', gap: 0,
        minWidth: 0, maxWidth: maxWidth ?? '100%', overflow: 'hidden', boxSizing: 'border-box',
      }}
    >
      {/* 좁은 폭에서는 **앞을 생략**하고 최하위 팀명은 항상 남긴다(§5-A). 전체 경로는 tooltip. */}
      {parents.length > 0 && (
        <span
          style={{
            fontSize: 11, color: muted, minWidth: 0, flex: '0 1 auto',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {parents.join(ORG_PATH_SEP)}
          {ORG_PATH_SEP}
        </span>
      )}
      <span
        style={{
          fontSize: 12, color, fontWeight: parents.length > 0 ? 600 : 400,
          whiteSpace: 'nowrap', flex: '0 0 auto',
        }}
      >
        {leaf}
      </span>
    </span>
  );
}
