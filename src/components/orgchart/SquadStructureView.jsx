/**
 * 그림 보기 «구조» 갈래 — 스쿼드 조직 트리 · 기능 조직 트리 (pivit-work PW-2599 ·
 * 기획 screen-org-chart-squad.policy.md §5-6-A · §5-6-B · §5-6-C 절 머리 · v3.44 · 엣지 86~105).
 *
 * 같은 사람들을 두 축으로 다시 묶어 본다 — `스쿼드 조직`(회사 → 트라이브·그룹 → 스쿼드 → 사람)과 `기능 조직`(회사 → 조직 단위 → 사람).
 * 두 쪽은 누르면 **움직임 없이 바로** 그린다. 같은 사람이 옮겨 가는 연출은 맨 위 탭 «한눈에» 하나다(§5-6-C 절 머리).
 * 보기 전용 — 값을 고치지 않는다. 숫자(캐파·비중)는 그리지 않는다(연결 갈래·카드 보기가 보인다).
 *
 * 디자이너 원본은 없다. 3회차(2026-11-09 커트 결정 · 카드 «3회차로 더합니다» A~F)부터 조직도 «트리» 화면의 부품을 그대로 쓴다:
 *   바탕            = 조직도 트리 캔버스의 흰 판 + 점 격자(.canvas-inner::before 와 같은 값)
 *   회사·묶음·스쿼드 = 조직도 부서 카드(DeptCard · 회사는 company 바탕 · 묶음은 고른 색을 옅게 · 미분류는 «직속» 칸처럼 점선)
 *   사람 카드       = 조직도 구성원 카드(.member-node — 사진 + 상태 점 · 이름 · 아래 줄 주 소속) · 리드 = 카드 보기의 LEAD 딱지
 *   선              = 조직도 BezierConnectors(직각) — 사람 카드 줄 아래에서 하위 노드로 나간다. 카드를 꿰뚫는 선이 없다
 *   도구 단추·접기  = 조직도 트리 캔버스 툴바(.org-tool-btn) · 부서 카드 접기 단추(.dept-toggle)
 * 디자이너 원본이 없는 조합(묶음 카드 바탕색 · 스쿼드 카드의 색 네모·상태 줄)은 pivit-work 카드에 design-review 라벨.
 * 사유표는 pivit-work `docs/ticket-notes/pw-2599.md` 「화면 점검」.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import { ContractVerticalGlyph, ExpandVerticalGlyph, MinusGlyph, PlusGlyph } from '../shared/lineIcons.jsx';
import { squadStatusText, useOrgLabels } from './orgchart-labels.jsx';
import { LeadTag } from './squadIcons.jsx';
import { squadStatusMeta } from './squad-constants.js';
import { MEMBER_STATUSES } from './constants.js';
import DeptCard from './DeptCard.jsx';
import PhotoOr from './PhotoOr.jsx';
import BezierConnectors from './BezierConnectors.jsx';
import { isEnterKey } from '../shared/enterKey.js';
import {
  STRUCT_CANVAS_MAX_H,
  STRUCT_DRAG_THRESHOLD,
  STRUCT_VIEW_ALL,
  STRUCT_ZOOM_MAX,
  STRUCT_ZOOM_MIN,
  STRUCT_ZOOM_STEP,
  buildOrgSide,
  buildSquadSide,
  structFitScale,
  structureView,
} from './squadStructureLayout.js';

const DIM = 0.2; // 마우스를 올린 것과 무관한 카드(§5-6-B «마우스 올림»)

const toggleIn = (setter) => (key) => setter((prev) => {
  const next = new Set(prev);
  if (next.has(key)) next.delete(key); else next.add(key);
  return next;
});

/** 사람 카드의 상태 점 — 조직도 구성원 카드와 같은 색표(휴직은 회색 점). */
const statusOf = (person) => MEMBER_STATUSES[person?.status]
  || MEMBER_STATUSES[person?.employmentStatus === 'on_leave' || person?.employmentStatus === 'leave' ? 'leave' : 'working'];

export default function SquadStructureView({
  shown,
  all,
  levelNames = [],
  groups = [],
  people = [],
  units = [],
  companyName = '',
  personOf,
  onMemberClick,
}) {
  const L = useOrgLabels();
  // 기본·탭을 다시 열 때 = 스쿼드 조직(§5-6-C «트리거»)
  const [side, setSide] = useState('squad');
  const [noneOpen, setNoneOpen] = useState(false);
  const [focus, setFocus] = useState(null); // { kind: 'p' | 'sq' | 'g', id, ids? }
  const [zoom, setZoom] = useState(1);
  const [folded, setFolded] = useState(() => new Set());
  const [more, setMore] = useState(() => new Set());
  const [centerTick, setCenterTick] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const scrollRef = useRef(null);
  const treeRef = useRef(null);
  const rootCardRef = useRef(null);
  const drag = useRef(null);

  // «스쿼드 없음» 재료 — 조직도 명부의 재직 중 사람(스쿼드에만 남은 퇴사자 이름은 빼고)
  const roster = useMemo(() => people.filter((p) => p.employmentStatus !== 'terminated'), [people]);
  const tree = useMemo(() => (side === 'squad'
    ? buildSquadSide({ shown, all, levelNames, groups, roster, personOf, noneOpen })
    : buildOrgSide({ units, people })), [side, shown, all, levelNames, groups, roster, personOf, noneOpen, units, people]);
  const view = useMemo(() => structureView(tree, { folded, more }), [tree, folded, more]);

  // 트리 크기는 흐름 배치가 정한다 — 그린 뒤 재서 스크롤 판(배율만큼) 크기를 맞춘다.
  // 처음 · 쪽을 바꿀 때 · ⊞ ⊟ · 배율을 바꿀 때 회사 카드가 가로 가운데 · 맨 위(§5-6-B «큰 조직» ①).
  // 펼침·더 보기로 트리가 바뀔 때는 옮기지 않는다 — 보던 자리를 잃는다.
  const pendingCenter = useRef(true);
  useLayoutEffect(() => { pendingCenter.current = true; }, [centerTick, zoom]);
  useLayoutEffect(() => {
    const tr = treeRef.current;
    const el = scrollRef.current;
    if (!tr || !el) return;
    const w = tr.offsetWidth;
    const h = tr.offsetHeight;
    if (w !== size.w || h !== size.h) { setSize({ w, h }); return; }
    if (!pendingCenter.current) return;
    pendingCenter.current = false;
    const card = rootCardRef.current;
    const tRect = tr.getBoundingClientRect();
    const cRect = card ? card.getBoundingClientRect() : null;
    const cx = cRect ? (cRect.left + cRect.width / 2 - tRect.left) : (w * zoom) / 2;
    el.scrollLeft = Math.max(0, cx - el.clientWidth / 2);
    el.scrollTop = 0;
  }, [view, zoom, centerTick, size.w, size.h]);

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
    setFolded(new Set(structureView(tree, STRUCT_VIEW_ALL).foldable));
    setCenterTick((t) => t + 1);
  };
  const zoomBy = (d) => setZoom((z) => Math.round(Math.min(STRUCT_ZOOM_MAX, Math.max(STRUCT_ZOOM_MIN, z + d)) * 10) / 10);
  const fit = () => {
    const el = scrollRef.current;
    // 맞춘 뒤 세로 스크롤 막대가 생겨도 가로로 넘치지 않게 막대 폭만큼 남긴다
    if (el) setZoom(structFitScale(el.clientWidth - 24, size.w));
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
  const guard = (fn) => (e) => { e?.stopPropagation?.(); if (!dragged()) fn(); };
  const asButton = (fn) => ({
    role: 'button',
    tabIndex: 0,
    onClick: guard(fn),
    onKeyDown: (e) => { if (isEnterKey(e) || e.key === ' ') { e.preventDefault(); fn(); } },
  });

  const cardOn = useCallback((c) => {
    if (!focus) return true;
    if (focus.kind === 'p') return c.userId === focus.id;
    if (focus.kind === 'sq') return c.squadId === focus.id;
    if (focus.kind === 'g') return c.groupKey === focus.id || focus.ids.has(c.squadId);
    return true;
  }, [focus]);

  // 접기 단추 — 조직도 부서 카드의 단추 그대로(DeptCard). 숫자는 말풍선에.
  const foldProps = (n, name) => (n.foldTotal > 0 ? {
    isCollapsible: true,
    isCollapsed: n.folded,
    onToggle: () => { if (!dragged()) toggleFold(n.key); },
    toggleLabel: L(n.folded ? 'org.expandChildren' : 'org.collapseChildren', { name }),
    toggleProps: {
      'data-testid': `squad-struct-fold-${n.key}`,
      title: L(n.folded ? 'squad.struct.foldOpen' : 'squad.struct.foldClose', { count: n.foldTotal }),
    },
  } : {});

  const renderCard = (n) => {
    if (n.kind === 'root') {
      const d = n.data;
      const line = d.side === 'squad'
        ? L('squad.struct.rootSquad', { squads: d.squads, people: d.people })
        : d.ceo
          ? L('squad.struct.rootOrgCeo', { name: d.ceo.name, people: d.people })
          : L('squad.struct.rootOrg', { people: d.people });
      return (
        <DeptCard
          node={{ name: companyName, type: L('squad.struct.companyType'), count: line, level: 'company' }}
          cardProps={{ className: 'sq-struct-dept', 'data-testid': 'squad-struct-root', ref: rootCardRef }}
        />
      );
    }
    if (n.kind === 'unit') {
      const u = n.data;
      const name = u.virtual ? L('squad.struct.unassigned') : u.name;
      return (
        <DeptCard
          node={{ name, type: L('squad.struct.unitCount', { count: n.ownCount }) }}
          cardProps={{ className: `sq-struct-dept${u.virtual ? ' is-virtual' : ''}`, 'data-testid': `squad-struct-unit-${u.id || 'none'}`, title: name }}
          {...foldProps(n, name)}
        />
      );
    }
    if (n.kind === 'squad') {
      const sq = n.data;
      const st = squadStatusMeta(sq.status);
      const count = (sq.members || []).length;
      const hasLead = (sq.members || []).some((m) => m.role === 'lead');
      // 리드 이름은 쓰지 않는다 — 바로 아래 첫 사람 카드가 리드다(3회차 · 커트 결정). 없을 때만 «리드 미지정».
      return (
        <DeptCard
          node={{
            name: sq.name,
            type: (
              <span className="sq-struct-state" style={{ color: st.textColor }}>
                <span className="pj-status-dot" style={{ background: st.dotColor || st.textColor }} aria-hidden />
                {squadStatusText(L, sq.status)}
              </span>
            ),
          }}
          nameSlot={(
            <span className="sq-struct-dept-name">
              <span className="sq-color-box sq-struct-color-box" style={{ background: `${sq.color}cc` }} aria-hidden />
              <span className="sq-graph-ellipsis">{sq.name}</span>
            </span>
          )}
          metaExtra={(
            <span className="dept-type">
              {L(hasLead ? 'squad.struct.squadPeople' : 'squad.struct.squadPeopleNoLead', { count })}
            </span>
          )}
          cardProps={{
            className: 'sq-struct-dept',
            'data-testid': `squad-struct-squad-${sq.id}`,
            style: { background: 'var(--bg-quaternary)', opacity: sq.status === 'archived' ? 0.6 : 1 },
            onMouseEnter: () => setFocus({ kind: 'sq', id: sq.id }),
            title: sq.name,
          }}
          {...foldProps(n, sq.name)}
        />
      );
    }
    if (n.kind === 'group') {
      const g = n.data;
      const ids = n.squadIds || new Set();
      const count = ids.size
        ? L('squad.struct.groupCount', { squads: ids.size, people: n.peopleCount })
        : L(n.allCount ? 'squad.struct.groupNoneOn' : 'squad.struct.groupEmpty');
      const name = g.virtual ? L('squad.struct.ungrouped') : g.name;
      const headUnset = !g.virtual && !n.ownCount;
      return (
        <DeptCard
          node={{ name, type: n.levelName, count, countColor: g.virtual ? 'var(--text-tertiary)' : g.color }}
          metaExtra={headUnset && (
            <span className="dept-type" data-testid={`squad-struct-head-unset-${g.id}`}>{L('squad.struct.headUnset')}</span>
          )}
          cardProps={{
            className: `sq-struct-dept${g.virtual ? ' is-virtual' : ''}`,
            'data-testid': `squad-struct-group-${g.id || `none${g.level}`}`,
            // 고른 색을 옅게 깐 바탕 — 흰 카드 위에 겹쳐 칠해 영역 바탕보다 진하다
            style: g.virtual ? undefined : { backgroundColor: 'var(--bg-quaternary)', backgroundImage: `linear-gradient(${g.color}14, ${g.color}14)` },
            onMouseEnter: () => setFocus({ kind: 'g', id: n.key, ids }),
            title: g.virtual ? L('squad.struct.ungroupedTip', { level: n.levelName }) : `${n.levelName} · ${g.name}`,
          }}
          {...foldProps(n, name)}
        />
      );
    }
    if (n.kind === 'none') {
      return (
        <DeptCard
          node={{ name: L('squad.struct.none'), type: L(noneOpen ? 'squad.struct.noneOpen' : 'squad.struct.noneClosed', { count: n.data.count }) }}
          cardProps={{
            className: 'sq-struct-dept is-virtual is-clickable',
            'data-testid': 'squad-struct-none',
            'aria-expanded': noneOpen,
            title: L('squad.struct.noneTip', { count: n.data.count }),
            ...asButton(() => setNoneOpen((v) => !v)),
          }}
        />
      );
    }
    return null;
  };

  const renderPerson = (c) => {
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
    const status = statusOf(person);
    return (
      <Tooltip key={c.key} content={tip}>
        <div
          className={`member-node sq-struct-member${clickable ? ' is-clickable' : ''}`}
          data-testid={c.headOf ? `squad-struct-head-${c.headOf}` : `squad-struct-card-${c.key}`}
          style={{ opacity: (c.dim ?? 1) * (cardOn(c) ? 1 : DIM), '--member-border-color': status.borderColor }}
          onMouseEnter={() => setFocus({ kind: 'p', id: c.userId })}
          onClick={clickable ? () => { if (!dragged()) onMemberClick(person); } : undefined}
        >
          <div className="member-content">
            <div className="member-row">
              <div className="avatar-wrap">
                {/* 조직도 구성원 카드(MemberCard)와 같은 사진 칸 — 사진이 없으면 조직도와 같은 빈 사람 그림 */}
                <PhotoOr src={person?.photoUrl || null} className="avatar-sm" fallback={<BlankPerson />} />
                <span className="online-dot" style={{ background: status.dotColor }} />
              </div>
              <span className="member-name">{name}</span>
              {c.lead && <LeadTag />}
              {c.headOf && <StatusBadge tone="neutral" className="role-badge modal-team-chip">{L('squad.struct.headBadge')}</StatusBadge>}
              {c.unitHead && <StatusBadge tone="neutral" className="role-badge modal-team-chip">{L('squad.struct.unitHeadBadge')}</StatusBadge>}
              {mine && (
                <StatusBadge tone="neutral" className="role-badge modal-team-chip" data-testid={`squad-struct-multi-${c.key}`}>
                  {L('squad.struct.multi', { count: c.multi })}
                </StatusBadge>
              )}
            </div>
            <div className="member-grade">{line2}</div>
          </div>
        </div>
      </Tooltip>
    );
  };

  // 조직도 OrgNode 와 같은 뼈대 — 카드 · 사람 카드 줄(.members-list) · 하위 줄(.children-row > .child-branch).
  // 선은 BezierConnectors 가 이 뼈대를 읽어 긋는다(사람 카드가 있으면 마지막 사람 카드 아래에서 하위로).
  const renderNode = (n) => {
    const region = side === 'squad' && n.kind === 'group' && !n.data.virtual;
    const hasPeople = n.people.length > 0 || n.moreTotal > 0;
    return (
      <div
        className={`org-node${n.children.length ? ' has-children' : ''}${region ? ' sq-struct-region' : ''}`}
        data-node-id={n.key}
        data-testid={region ? `squad-struct-region-${n.key}/region` : undefined}
        style={region ? { background: `${n.data.color}0a`, boxShadow: `inset 0 0 0 1px ${n.data.color}2e` } : undefined}
      >
        {renderCard(n)}
        {hasPeople && (
          <div className="members-list">
            {n.people.map(renderPerson)}
            {n.moreTotal > 0 && (
              <div
                className="member-node sq-struct-more"
                data-testid={`squad-struct-more-${n.key}`}
                onMouseDown={(e) => e.stopPropagation()}
                {...asButton(() => toggleMore(n.key))}
              >
                {n.moreOpen ? L('squad.struct.moreClose') : L('squad.struct.more', { count: n.hidden })}
              </div>
            )}
          </div>
        )}
        {n.children.length > 0 && (
          <div className="children-row">
            {n.children.map((c) => <div key={c.key} className="child-branch">{renderNode(c)}</div>)}
          </div>
        )}
      </div>
    );
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
          <div className="sq-struct-sizer" style={{ width: Math.round(size.w * zoom), height: Math.round(size.h * zoom) }}>
            <div
              ref={treeRef}
              className="sq-struct-tree"
              style={{ transform: `scale(${zoom})` }}
              data-scale={zoom.toFixed(2)}
              onMouseLeave={() => setFocus(null)}
            >
              <BezierConnectors containerRef={treeRef} scale={zoom} />
              {renderNode(view.root)}
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

/**
 * 사진 없는 사람 — 조직도 «트리» 탭 구성원 카드와 같은 빈 사람 그림(pivit-work orgChartData.ts DEFAULT_AVATAR_SVG 와 같은 모양·색).
 * 조직도는 앱이 그림 주소로 넣어 주지만 이 판은 사진 주소만 받으므로 같은 그림을 여기서 그린다.
 */
function BlankPerson() {
  return (
    <svg className="avatar-sm" width={32} height={32} viewBox="0 0 24 24" fill="none" aria-hidden data-testid="squad-struct-blank-photo">
      <circle cx="12" cy="12" r="12" fill="var(--colors-grayLight-200)" />
      <circle cx="12" cy="9" r="3.5" fill="var(--colors-grayLight-400)" />
      <path d="M4.5 20.5c0-3.5 3.2-6 7.5-6s7.5 2.5 7.5 6" fill="var(--colors-grayLight-400)" />
    </svg>
  );
}

/** 사람 카드 2줄 — 주 소속 조직 단위 이름(§5-6 «사람 노드»와 같은 값 · `미배정` · `대표 직속`). */
function unitText(L, person) {
  const kind = person?.unitKind;
  if (kind === 'unit' && person?.unitName) return person.unitName;
  return L(`list.unit.${kind === 'ceo' || kind === 'ceoDirect' ? kind : 'unassigned'}`);
}
