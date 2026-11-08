/**
 * 그림 보기 «구조» 갈래 — 스쿼드 조직 트리 · 기능 조직 트리 (pivit-work PW-2599 ·
 * 기획 screen-org-chart-squad.policy.md §5-6-A · §5-6-B · §5-6-C 절 머리 · v3.44 · 엣지 86~105).
 *
 * 같은 사람들을 두 축으로 다시 묶어 본다 — `스쿼드 조직`(회사 → 묶음 → 스쿼드 → 사람)과 `기능 조직`(회사 → 조직 단위 → 사람).
 * 두 쪽은 누르면 **움직임 없이 바로** 그린다. 같은 사람이 옮겨 가는 연출은 맨 위 탭 «한눈에» 하나다(§5-6-C 절 머리).
 * 보기 전용 — 값을 고치지 않는다. 숫자(캐파·비중)는 그리지 않는다(연결 갈래·카드 보기가 보인다).
 *
 * 디자이너 원본은 없다(design-page 에 구조 트리 시안이 없다). 새 모양을 짓지 않고 같은 화면의 디자이너 모양을 옮겼다:
 *   캔버스 바탕     = 조직도 트리 캔버스(.canvas-area 의 var(--bg-quaternary) 판 · r14)
 *   도구 단추       = 조직도 트리 캔버스 툴바(.org-toolbar · .org-tool-btn) — 그림 보기 연결 갈래와 같다
 *   노드 접기 단추  = 조직도 부서 카드 접기 단추(.dept-toggle)
 *   스쿼드 노드     = 연결 갈래 스쿼드 노드(.sq-graph-squad) 그대로
 *   묶음·조직 노드  = 같은 판의 스쿼드 노드 상자(.sq-graph-squad 테두리·r) + 묶음 색 4px 띠
 *   사람 카드       = 매트릭스 이름 칸(.sq-photo 24 · .pj-member-name) 을 한 줄 상자에
 *   세그먼트        = 공용 SegmentedControl(카드 / 그림 고르기와 같다)
 * 사유표는 pivit-work `docs/ticket-notes/pw-2599.md` 「화면 점검」.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import Icon from '../shared/Icon.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import { ContractVerticalGlyph, ExpandVerticalGlyph, MinusGlyph, PlusGlyph } from '../shared/lineIcons.jsx';
import { squadStatusText, useOrgLabels } from './orgchart-labels.jsx';
import { LeadStarIcon } from './squadIcons.jsx';
import { squadStatusMeta } from './squad-constants.js';
import {
  STRUCT_CANVAS_MAX_H,
  STRUCT_DRAG_THRESHOLD,
  STRUCT_GEOM,
  STRUCT_VIEW_ALL,
  STRUCT_ZOOM_MAX,
  STRUCT_ZOOM_MIN,
  STRUCT_ZOOM_STEP,
  buildOrgSide,
  buildSquadSide,
  layoutStructure,
  structFitScale,
} from './squadStructureLayout.js';

const DIM = 0.2; // 마우스를 올린 것과 무관한 카드(§5-6-B «마우스 올림»)

const toggleIn = (setter) => (key) => setter((prev) => {
  const next = new Set(prev);
  if (next.has(key)) next.delete(key); else next.add(key);
  return next;
});

export default function SquadStructureView({
  shown,
  all,
  levelNames = [],
  groups = [],
  people = [],
  units = [],
  companyName = '',
  personOf,
  renderAvatar,
  onMemberClick,
}) {
  const L = useOrgLabels();
  const G = STRUCT_GEOM;
  // 기본·탭을 다시 열 때 = 스쿼드 조직(§5-6-C «트리거»)
  const [side, setSide] = useState('squad');
  const [noneOpen, setNoneOpen] = useState(false);
  const [focus, setFocus] = useState(null); // { kind: 'p' | 'sq' | 'g', id, ids? }
  const [zoom, setZoom] = useState(1);
  const [folded, setFolded] = useState(() => new Set());
  const [more, setMore] = useState(() => new Set());
  const [centerTick, setCenterTick] = useState(0);
  const scrollRef = useRef(null);
  const drag = useRef(null);

  // «스쿼드 없음» 재료 — 조직도 명부의 재직 중 사람(스쿼드에만 남은 퇴사자 이름은 빼고)
  const roster = useMemo(() => people.filter((p) => p.employmentStatus !== 'terminated'), [people]);
  const tree = useMemo(() => (side === 'squad'
    ? buildSquadSide({ shown, all, levelNames, groups, roster, personOf, noneOpen })
    : buildOrgSide({ units, people })), [side, shown, all, levelNames, groups, roster, personOf, noneOpen, units, people]);
  const lay = useMemo(() => layoutStructure(structuredCloneTree(tree), { folded, more }), [tree, folded, more]);
  const W = lay.w + G.pad * 2;
  const H = lay.h + G.pad * 2;

  // 처음 · 쪽을 바꿀 때 · ⊞ ⊟ · 배율을 바꿀 때 회사 노드가 가로 가운데 · 맨 위(§5-6-B «큰 조직» ①).
  // 트리가 바뀔 때마다(펼침·더 보기) 옮기면 보던 자리를 잃는다 — 회사 노드 자리는 ref 로 읽고 정해진 순간에만 옮긴다.
  const rootCx = useRef(0);
  useLayoutEffect(() => { rootCx.current = lay.root.cx; });
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = Math.max(0, (rootCx.current + STRUCT_GEOM.pad) * zoom - el.clientWidth / 2);
    el.scrollTop = 0;
  }, [centerTick, zoom]);

  // 쪽을 바꾸면 바로 그린다 · 접힘과 더 보기는 처음 모습으로 · 배율은 그대로(§5-6-B ⑤)
  const changeSide = (to) => {
    if (to === side) return;
    setFocus(null);
    setFolded(new Set());
    setMore(new Set());
    setSide(to);
    setCenterTick((t) => t + 1);
  };
  const toggleFold = toggleIn(setFolded);
  const toggleMore = toggleIn(setMore);
  const expandAll = () => { setFolded(new Set()); setMore(new Set()); setCenterTick((t) => t + 1); };
  const collapseAll = () => {
    setFolded(new Set(layoutStructure(structuredCloneTree(tree), STRUCT_VIEW_ALL).foldable));
    setCenterTick((t) => t + 1);
  };
  const zoomBy = (d) => setZoom((z) => Math.round(Math.min(STRUCT_ZOOM_MAX, Math.max(STRUCT_ZOOM_MIN, z + d)) * 10) / 10);
  const fit = () => {
    const el = scrollRef.current;
    if (el) setZoom(structFitScale(el.clientWidth - 8, W));
  };

  // 끌어서 옮기기 — 4px 넘게 움직였으면 놓을 때 클릭으로 치지 않는다(엣지 104)
  const onDown = (e) => {
    const el = scrollRef.current;
    if (!el || e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop, moved: false };
  };
  const onMove = (e) => {
    const d = drag.current;
    const el = scrollRef.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > STRUCT_DRAG_THRESHOLD) d.moved = true;
    if (d.moved) { el.scrollLeft = d.sl - dx; el.scrollTop = d.st - dy; }
  };
  const onUp = () => { setTimeout(() => { drag.current = null; }, 0); };
  const dragged = () => !!drag.current?.moved;
  const guard = (fn) => (e) => { e.stopPropagation(); if (!dragged()) fn(); };

  const cardOn = useCallback((c) => {
    if (!focus) return true;
    if (focus.kind === 'p') return c.userId === focus.id;
    if (focus.kind === 'sq') return c.squadId === focus.id;
    if (focus.kind === 'g') return focus.ids.has(c.squadId);
    return true;
  }, [focus]);

  const foldButton = (n, name) => n.foldTotal > 0 && (
    <button
      type="button"
      className={`dept-toggle${n.folded ? ' is-collapsed' : ''}`}
      aria-label={L(n.folded ? 'org.expandChildren' : 'org.collapseChildren', { name })}
      title={L(n.folded ? 'squad.struct.foldOpen' : 'squad.struct.foldClose', { count: n.foldTotal })}
      data-testid={`squad-struct-fold-${n.key}`}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={guard(() => toggleFold(n.key))}
    >
      <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M2.5 7.5 6 4l3.5 3.5" />
      </svg>
    </button>
  );

  const box = (n, extra = {}) => ({
    left: n.cx + G.pad - G.nodeW / 2,
    top: n.y + G.pad,
    width: G.nodeW,
    height: n.h,
    ...extra,
  });

  const renderNode = (n) => {
    if (n.kind === 'root') {
      const d = n.data;
      const line = d.side === 'squad'
        ? L('squad.struct.rootSquad', { squads: d.squads, people: d.people })
        : d.ceo
          ? L('squad.struct.rootOrgCeo', { name: d.ceo.name, people: d.people })
          : L('squad.struct.rootOrg', { people: d.people });
      return (
        <div key={n.key} className="sq-struct-node sq-struct-root" style={box(n)} data-testid="squad-struct-root">
          <span className="sq-struct-node-name sq-graph-ellipsis">{companyName}</span>
          <span className="sq-struct-root-meta sq-graph-ellipsis">{line}</span>
        </div>
      );
    }
    if (n.kind === 'unit') {
      const u = n.data;
      const name = u.virtual ? L('squad.struct.unassigned') : u.name;
      return (
        <div key={n.key} className={`sq-struct-node${u.virtual ? ' is-virtual' : ''}`} style={box(n)}
          data-testid={`squad-struct-unit-${u.id || 'none'}`} title={name}>
          <span className="sq-struct-node-name sq-graph-ellipsis">{name}</span>
          <span className="sq-struct-node-meta">{L('squad.struct.unitCount', { count: n.ownCount })}</span>
          {foldButton(n, name)}
        </div>
      );
    }
    if (n.kind === 'squad') {
      const sq = n.data;
      const st = squadStatusMeta(sq.status);
      const lead = (sq.members || []).find((m) => m.role === 'lead');
      const leadName = lead ? (personOf(lead.userId)?.name || '') : L('squad.card.leadUnset');
      const meta = L('squad.graph.squadMeta', { count: (sq.members || []).length, lead: leadName });
      return (
        <div
          key={n.key}
          className="sq-graph-squad"
          data-testid={`squad-struct-squad-${sq.id}`}
          style={box(n, { opacity: sq.status === 'archived' ? 0.6 : 1 })}
          onMouseEnter={() => setFocus({ kind: 'sq', id: sq.id })}
          title={sq.name}
        >
          <p className="pj-card-name sq-card-name sq-graph-squad-name">
            <span className="sq-color-box" style={{ background: `${sq.color}cc` }} aria-hidden />
            <span className="sq-graph-ellipsis">{sq.name}</span>
          </p>
          <div className="sq-graph-squad-meta">
            <StatusBadge className="pj-card-status sq-status" style={{ color: st.textColor }}>
              {st.icon ? <Icon src={st.icon} size={16} color="currentColor" /> : <span className="pj-status-dot" style={{ background: st.dotColor }} />}
              <span>{squadStatusText(L, sq.status)}</span>
            </StatusBadge>
            <span className="sq-graph-ellipsis">{meta}</span>
          </div>
          {foldButton(n, sq.name)}
        </div>
      );
    }
    if (n.kind === 'group') {
      const g = n.data;
      const ids = n.squadIds || new Set();
      const count = ids.size
        ? L('squad.struct.groupCount', { squads: ids.size, people: n.peopleCount })
        : L(n.allCount ? 'squad.struct.groupNoneOn' : 'squad.struct.groupEmpty');
      const name = g.virtual ? L('squad.struct.ungrouped') : g.name;
      const head = !g.virtual && g.headActive && g.headUserId ? personOf(g.headUserId) : null;
      return (
        <div
          key={n.key}
          className={`sq-struct-node sq-struct-group${g.virtual ? ' is-virtual' : ''}`}
          style={box(n, g.virtual ? {} : { '--sq-struct-color': g.color })}
          data-testid={`squad-struct-group-${g.id || `none${g.level}`}`}
          onMouseEnter={() => setFocus({ kind: 'g', id: n.key, ids })}
          title={g.virtual ? L('squad.struct.ungroupedTip', { level: n.levelName }) : `${n.levelName} · ${g.name}`}
        >
          <span className="sq-struct-group-level">
            {!g.virtual && <span className="sq-struct-dot" style={{ background: g.color }} aria-hidden />}
            {n.levelName}
          </span>
          <span className="sq-struct-node-name sq-graph-ellipsis">{name}</span>
          {!g.virtual && (head ? (
            <Tooltip content={L('squad.struct.headTip', { level: n.levelName, name: head.name })}>
              <button
                type="button"
                className="sq-struct-head"
                data-testid={`squad-struct-head-${g.id}`}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={guard(() => onMemberClick?.(head))}
              >
                {renderAvatar(head, 24)}
                <span className="pj-member-name sq-graph-ellipsis">{head.name}</span>
                <StatusBadge tone="neutral" className="sq-struct-head-badge">{L('squad.struct.headBadge')}</StatusBadge>
              </button>
            </Tooltip>
          ) : (
            <span className="sq-struct-node-meta" data-testid={`squad-struct-head-unset-${g.id}`}>{L('squad.struct.headUnset')}</span>
          ))}
          <span className="sq-struct-node-meta">{count}</span>
          {foldButton(n, name)}
        </div>
      );
    }
    if (n.kind === 'none') {
      return (
        <button
          key={n.key}
          type="button"
          className="sq-struct-node is-virtual sq-struct-none"
          style={box(n)}
          data-testid="squad-struct-none"
          aria-expanded={noneOpen}
          title={L('squad.struct.noneTip', { count: n.data.count })}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={guard(() => setNoneOpen((v) => !v))}
        >
          <span className="sq-struct-node-name">{L('squad.struct.none')}</span>
          <span className="sq-struct-node-meta">
            {L(noneOpen ? 'squad.struct.noneOpen' : 'squad.struct.noneClosed', { count: n.data.count })}
          </span>
        </button>
      );
    }
    return null;
  };

  const renderCard = (c) => {
    const person = personOf(c.userId);
    const name = person?.name || '';
    const line2 = side === 'org' ? (person?.businessTitle || unitText(L, person)) : unitText(L, person);
    const mine = side === 'squad' && c.multi > 1;
    const squadNames = side === 'squad'
      ? shown.filter((sq) => (sq.members || []).some((m) => m.userId === c.userId)).map((sq) => sq.name)
      : [];
    const tip = [
      name,
      [person?.businessTitle, unitText(L, person)].filter(Boolean).join(' · '),
      squadNames.length ? L('squad.struct.cardTipSquads', { count: squadNames.length, names: squadNames.join(', ') }) : '',
    ].filter(Boolean).join('\n');
    const clickable = !!(person && onMemberClick);
    return (
      <Tooltip key={c.key} content={tip}>
        <div
          className={`sq-struct-card${clickable ? ' is-clickable' : ''}`}
          data-testid={`squad-struct-card-${c.key}`}
          style={{ left: c.x + G.pad, top: c.y + G.pad, width: G.cardW, height: G.cardH, opacity: (c.dim ?? 1) * (cardOn(c) ? 1 : DIM) }}
          onMouseEnter={() => setFocus({ kind: 'p', id: c.userId })}
          onClick={clickable ? () => { if (!dragged()) onMemberClick(person); } : undefined}
        >
          {renderAvatar(person || { name }, 24)}
          <span className="sq-struct-card-text">
            <span className="pj-member-name sq-struct-card-name">
              {c.lead && <span className="sq-lead-mark" aria-hidden><LeadStarIcon size={11} /></span>}
              <span className="sq-graph-ellipsis">{name}</span>
              {c.lead && <span className="sq-struct-card-role">{L('squad.struct.leadSuffix')}</span>}
              {c.head && <span className="sq-struct-card-role is-head">{L('squad.struct.headSuffix')}</span>}
            </span>
            <span className="sq-struct-card-line sq-graph-ellipsis">{line2}</span>
          </span>
          {mine && (
            <StatusBadge tone="neutral" className="sq-struct-multi" data-testid={`squad-struct-multi-${c.key}`}>
              {L('squad.struct.multi', { count: c.multi })}
            </StatusBadge>
          )}
        </div>
      </Tooltip>
    );
  };

  const curve = (e) => {
    const my = (e.y1 + e.y2) / 2 + G.pad;
    return `M ${e.x1 + G.pad} ${e.y1 + G.pad} C ${e.x1 + G.pad} ${my}, ${e.x2 + G.pad} ${my}, ${e.x2 + G.pad} ${e.y2 + G.pad}`;
  };

  const levels = levelNames.length;
  const pathDesc = levels
    ? L('squad.struct.descSquad', { path: [...levelNames].reverse().join(' → '), level: levelNames[0] })
    : L('squad.struct.descSquadFlat');

  return (
    <div data-testid="squad-struct" data-side={side}>
      <div className="sq-struct-bar">
        <SegmentedControl
          ariaLabel={L('squad.struct.sideLabel')}
          items={[
            { value: 'org', label: L('squad.struct.side.org'), testId: 'squad-struct-side-org' },
            { value: 'squad', label: L('squad.struct.side.squad'), testId: 'squad-struct-side-squad' },
          ]}
          value={side}
          onChange={changeSide}
        />
        <p className="pj-table-subtitle" data-testid="squad-struct-desc">{side === 'squad' ? pathDesc : L('squad.struct.descOrg')}</p>
      </div>

      <div className="sq-struct-canvas">
        <div className="org-toolbar org-toolbar-right sq-struct-tools" data-testid="squad-struct-tools">
          <div className="org-toolbar-group">
            <button type="button" className="org-tool-btn" onClick={() => zoomBy(STRUCT_ZOOM_STEP)} disabled={zoom >= STRUCT_ZOOM_MAX}
              title={L('org.zoomIn')} aria-label={L('org.zoomIn')} data-action="zoom-in">
              <PlusGlyph size={20} />
            </button>
            <button type="button" className="org-tool-btn" onClick={() => zoomBy(-STRUCT_ZOOM_STEP)} disabled={zoom <= STRUCT_ZOOM_MIN}
              title={L('org.zoomOut')} aria-label={L('org.zoomOut')} data-action="zoom-out">
              <MinusGlyph size={20} />
            </button>
            <button type="button" className="org-tool-btn has-label" onClick={fit} title={L('squad.graph.zoomFitTip')} data-action="zoom-fit">
              <span>{L('squad.graph.zoomFit')}</span>
            </button>
            <button type="button" className="org-tool-btn" onClick={expandAll} title={L('squad.struct.expandAllTip')}
              aria-label={L('org.expandAll')} data-action="expand-all">
              <ExpandVerticalGlyph size={20} />
            </button>
            <button type="button" className="org-tool-btn" onClick={collapseAll} title={L('squad.struct.collapseAllTip')}
              aria-label={L('org.collapseAll')} data-action="collapse-all">
              <ContractVerticalGlyph size={20} />
            </button>
          </div>
        </div>
        <div
          ref={scrollRef}
          className="sq-struct-scroll"
          style={{ maxHeight: STRUCT_CANVAS_MAX_H }}
          data-testid="squad-struct-scroll"
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
        >
          <div className="sq-struct-sizer" style={{ width: Math.round(W * zoom), height: Math.round(H * zoom) }}>
            <div
              className="sq-struct-tree"
              style={{ width: W, height: H, transform: `scale(${zoom})` }}
              data-scale={zoom.toFixed(2)}
              onMouseLeave={() => setFocus(null)}
            >
              <svg className="sq-graph-lines" width={W} height={H} aria-hidden>
                {side === 'squad' && lay.regions.map((r) => (
                  <rect key={r.key} x={r.x + G.pad} y={r.y + G.pad} width={r.w} height={r.h} rx={16}
                    style={{ fill: `${r.color}12`, stroke: `${r.color}38` }} data-testid={`squad-struct-region-${r.key}`} />
                ))}
                {lay.edges.map((e) => <path key={e.key} className="sq-struct-edge" d={curve(e)} />)}
                {lay.spines.map((s) => (
                  <line key={s.key} className={`sq-struct-edge${s.dashed ? ' is-dashed' : ''}`}
                    x1={s.x + G.pad} y1={s.y1 + G.pad} x2={s.x + G.pad} y2={s.y2 + G.pad} />
                ))}
              </svg>
              {lay.nodes.map(renderNode)}
              {lay.mores.map((m) => (
                <button
                  key={`${m.key}/more`}
                  type="button"
                  className="sq-struct-card sq-struct-more"
                  data-testid={`squad-struct-more-${m.key}`}
                  style={{ left: m.x + G.pad, top: m.y + G.pad, width: G.cardW, height: G.cardH }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={guard(() => toggleMore(m.key))}
                >
                  {m.open ? L('squad.struct.moreClose') : L('squad.struct.more', { count: m.hidden })}
                </button>
              ))}
              {lay.cards.map(renderCard)}
            </div>
          </div>
        </div>
      </div>

      <div className="sq-graph-legend" data-testid="squad-struct-legend">
        <p className="pj-table-subtitle">
          {side === 'squad'
            ? `${L('squad.struct.legendSquad')}${levels ? L('squad.struct.legendGroups', { level: levelNames[0] }) : ''}`
            : L('squad.struct.legendOrg')}
        </p>
        <p className="pj-table-subtitle">{L('squad.struct.legendNote')}</p>
      </div>
    </div>
  );
}

/** 사람 카드 2줄 — 주 소속 조직 단위 이름(§5-6 «사람 노드»와 같은 값 · `미배정` · `대표 직속`). */
function unitText(L, person) {
  const kind = person?.unitKind;
  if (kind === 'unit' && person?.unitName) return person.unitName;
  return L(`list.unit.${kind === 'ceo' || kind === 'ceoDirect' ? kind : 'unassigned'}`);
}

/** 배치 함수가 노드에 좌표를 덧쓰므로, 메모해 둔 트리를 건드리지 않게 얕게 다시 만든다. */
function structuredCloneTree(n) {
  return { ...n, children: (n.children || []).map(structuredCloneTree), people: [...(n.people || [])] };
}

