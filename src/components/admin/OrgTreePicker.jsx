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
 * 겸직(다중 선택)·조직장 지정은 이 컴포넌트의 책임이 아니다(PW-111·PW-110).
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
};

/** 접힘 여부 — 조상 중 하나라도 접혀 있으면 숨긴다. 검색 중에는 접힘을 무시한다. */
function isHidden(entry, collapsed, searching) {
  if (searching) return false;
  return entry.ancestorIds.some((id) => collapsed[id]);
}

export default function OrgTreePicker({
  open = true,
  units = [],
  /** 현재 선택된 조직 id ('' 이면 미배정) */
  value = '',
  onApply,
  onClose,
  labels: providedLabels,
  /** 헤더 부제 — 대상 구성원 이름 등 */
  subtitle,
}) {
  const labels = useMemo(() => ({ ...DEFAULT_LABELS, ...(providedLabels || {}) }), [providedLabels]);
  const tree = useMemo(() => buildOrgTree(units), [units]);

  const initial = value != null ? String(value) : '';
  const [syncedValue, setSyncedValue] = useState(initial);
  const [sel, setSel] = useState(initial);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [activeIdx, setActiveIdx] = useState(0);
  const listRef = useRef(null);

  // 대상이 바뀌면(다른 행에서 같은 팝업을 재사용) 현재 값으로 초기화한다.
  // "이전 props 와 비교해 렌더 중 상태 조정" 패턴 — effect 안 setState 는 캐스케이드 렌더가 된다.
  if (syncedValue !== initial) {
    setSyncedValue(initial);
    setSel(initial);
    setQuery('');
    setCollapsed({});
    setActiveIdx(0);
  }

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
      setSel(cur ?? '');
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
          <p style={{ margin: '4px 0 10px', fontSize: 11, color: T.muted, lineHeight: 1.5 }}>{labels.hint}</p>
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
                <button
                  type="button"
                  disabled={ghost}
                  onClick={() => { setSel(e.id); if (navIdx >= 0) setActiveIdx(navIdx); }}
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
              </div>
            );
          })}

          {rows.length === 0 && (
            <p style={{ margin: '20px 0', textAlign: 'center', fontSize: 12, color: T.muted }}>{labels.empty}</p>
          )}

          {/* P7 — 미배정은 항상 최하단, 들여쓰기 0 */}
          <div role="treeitem" aria-level={1} aria-selected={sel === ''}>
            <button
              type="button"
              onClick={() => { setSel(''); setActiveIdx(navRows.length - 1); }}
              style={{
                ...rowStyle(sel === '', false),
                marginTop: 4,
                borderTop: `1px solid ${T.border}`,
                borderRadius: 0,
                color: sel === '' ? T.accent : T.sub,
                outline: cursor === navRows.length - 1 ? `2px solid ${T.accent}` : 'none',
                outlineOffset: -2,
              }}
            >
              {labels.unassigned}
            </button>
          </div>
        </div>

        {/* 선택 요약 — 전체 경로로 보여준다(동명이팀 구분, P4) */}
        <div style={{ padding: '10px 20px', borderTop: `1px solid ${T.border}`, background: T.bg }}>
          {selEntry ? (
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
            onClick={() => { onApply?.(sel); onClose?.(); }}
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
