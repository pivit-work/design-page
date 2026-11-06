/**
 * 스쿼드 «한눈에» — 비스듬히 내려다본 바닥 위에서 같은 사람들이 팀 판과 스쿼드 판을 오간다
 * (pivit-work PW-2607 · 기획 screen-org-chart-squad.policy.md §5-7 · TC-ORG-160). 보기 전용이다.
 *
 * 디자이너 원본이 없다(대응표는 pivit-work `openspec/changes/pw-2607-squad-iso-stage/design.md`).
 * 판·제목·확대 버튼은 같은 탭의 디자이너 모양을 쓰고, 무대 그림(`.sq-iso-*`)만 새로 그린다.
 *
 * 재생 중에는 블록 자리를 rAF 로 직접 옮긴다 — 100개 블록을 매 프레임 다시 그리지 않으려는 것이다.
 */
import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Button from '../shared/Button.jsx';
import { MinusGlyph, PlusGlyph } from '../shared/lineIcons.jsx';
import { useOrgLabels } from './orgchart-labels.jsx';
import {
  ISO,
  ISO_FAMILIES,
  ISO_PLAY_MAX_BLOCKS,
  ISO_VIEW_MAX_H,
  ISO_ZOOM_MAX,
  ISO_ZOOM_MIN,
  isoFit,
  isoPoint,
  isoPoints,
  isoScene,
} from './squadIsoLayout.js';

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
const translateOf = (x, y, z = 0) => {
  const [sx, sy] = isoPoint(x, y, z);
  return `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`;
};
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const spotOf = (tk, side) => (side === 'org' ? tk.teamAt : tk.squadAt);
const famClass = (f) => `sq-iso-fam-${f || 'none'}`;

const H2 = ISO.block / 2;
const cubeFaces = (h) => ({
  top: isoPoints([[-H2, -H2, h], [H2, -H2, h], [H2, H2, h], [-H2, H2, h]]),
  front: isoPoints([[-H2, H2, h], [H2, H2, h], [H2, H2, 0], [-H2, H2, 0]]),
  side: isoPoints([[H2, H2, h], [H2, -H2, h], [H2, -H2, 0], [H2, H2, 0]]),
});
const LOW = cubeFaces(ISO.blockH);
const TALL = cubeFaces(ISO.blockH * ISO.headRatio);

/** 판 — 윗면·앞면·옆면 세 단 명암. 앞면 위 띠는 팀이면 직군 색, 스쿼드면 직군 비율 줄무늬다. */
function Slab({ s, id, up, family, color, stripes, dashed }) {
  const { x, y, w, d } = s;
  const t = ISO.slab;
  const tot = stripes ? stripes.reduce((a, b) => a + b.n, 0) : 0;
  const parts = [];
  let acc = 0;
  (stripes || [{ family, n: 1 }]).forEach((st) => {
    parts.push({ family: st.family, x0: x + (w * acc) / (tot || 1), x1: x + (w * (acc + st.n)) / (tot || 1) });
    acc += st.n;
  });
  return (
    <g className={`sq-iso-slab${up ? '' : ' is-down'}${dashed ? ' is-dashed' : ''} ${famClass(family)}`} data-iso-slab={id} style={color ? { '--iso-c': color } : undefined}>
      <polygon className="sq-iso-slab-front" points={isoPoints([[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, -t], [x, y + d, -t]])} />
      {parts.map((pt) => (
        <polygon key={pt.family || 'none'} className={`sq-iso-slab-stripe ${famClass(pt.family)}`} points={isoPoints([[pt.x0, y + d, 0], [pt.x1, y + d, 0], [pt.x1, y + d, -4], [pt.x0, y + d, -4]])} />
      ))}
      <polygon className="sq-iso-slab-side" points={isoPoints([[x + w, y + d, 0], [x + w, y, 0], [x + w, y, -t], [x + w, y + d, -t]])} />
      <polygon className="sq-iso-slab-top" points={isoPoints([[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0]])} />
    </g>
  );
}

/**
 * 판 이름표 — 판 앞면과 같은 기울기로 바닥에 세운 표지. 1줄 이름 · 2줄 조직장·인원.
 * 넘치면 조직장 이름부터 줄이고(인원은 남긴다) 전문은 툴팁으로 본다.
 */
function SlabLabel({ s, id, up, name, role, headName, unsetLabel, sub, family, color }) {
  const [lx, ly] = isoPoint(s.x + s.w / 2, s.y + s.d, -ISO.slab);
  const head = headName || unsetLabel;
  const prefix = role ? `${role} ` : '';
  const suffix = `${role ? ' · ' : ''}${sub}`;
  const suffixPx = [...`${prefix}${suffix}`].reduce((a, c) => a + (/[ㄱ-힣]/.test(c) ? 12 : 7), 0);
  const fittedHead = role ? isoFit(head, Math.max(36, s.w - suffixPx - 20), 12) : '';
  return (
    <g className={`sq-iso-label${up ? '' : ' is-down'}`} data-iso-label={id} transform={`matrix(${ISO.cos} ${ISO.sin} 0 1 ${lx.toFixed(1)} ${ly.toFixed(1)})`}>
      <title>{`${name}${role ? ` · ${prefix}${head}` : ''} · ${sub}`}</title>
      <text className="sq-iso-label-name" x={0} y={18} textAnchor="middle">
        <tspan className={`sq-iso-label-dot ${famClass(family)}`} style={color ? { '--iso-c': color } : undefined}>{'● '}</tspan>
        {isoFit(name, s.w - 20, 14)}
      </text>
      <text className="sq-iso-label-sub" x={0} y={35} textAnchor="middle">
        {role && <tspan className="sq-iso-star">{'★ '}</tspan>}
        {prefix}{fittedHead}{suffix}
      </text>
    </g>
  );
}

/** 사람 블록 + 이름표. 올린 사람이 바뀔 때 그 블록만 다시 그리도록 값만 받는다 — 마우스·클릭은 무대가 한 곳에서 받는다. */
const Block = memo(function Block({ tk, transform, isHead, role, line1, line2, tip, hot, faded, clickable }) {
  const f = isHead ? TALL : LOW;
  const bh = isHead ? ISO.blockH * ISO.headRatio : ISO.blockH;
  const W = ISO.tagW; const H = ISO.tagH;
  const cy = -bh - H2 - 9 - H; // 이름표 윗변 — 블록 꼭대기 위 9px(꼭지 자리)
  const nameMax = W - (isHead ? 50 : 14);
  return (
    <g
      className={`sq-iso-block ${famClass(tk.person.jobFamilyGroup)}${hot ? ' is-hot' : ''}${faded ? ' is-faded' : ''}${clickable ? ' is-clickable' : ''}`}
      data-iso-block={tk.key}
      data-person={tk.person.id}
      transform={transform}
    >
      <title>{tip}</title>
      <polygon className="sq-iso-block-front" points={f.front} />
      <polygon className="sq-iso-block-side" points={f.side} />
      <polygon className="sq-iso-block-top" points={f.top} />
      <path className="sq-iso-tag" d={`M -6 ${cy + H - 1} L 0 ${cy + H + 7} L 6 ${cy + H - 1} Z`} />
      <rect className="sq-iso-tag" x={-W / 2} y={cy} width={W} height={H} rx={6} />
      <rect className="sq-iso-tag-seam" x={-5} y={cy + H - 2} width={10} height={3} />
      <rect className="sq-iso-tag-band" x={-W / 2} y={cy} width={3} height={H} rx={1.5} />
      <text className="sq-iso-tag-name" x={-W / 2 + 9} y={cy + 14}>
        {isHead && <tspan className="sq-iso-star">★</tspan>}
        {isoFit(line1, nameMax, 12)}
        {isHead && <tspan className="sq-iso-tag-role">{` · ${role}`}</tspan>}
      </text>
      <text className="sq-iso-tag-line" x={-W / 2 + 9} y={cy + 28}>{isoFit(line2, W - 14, 11)}</text>
    </g>
  );
});

/**
 * @param {'squad'|'org'} to  도착 쪽
 * @param {boolean} animate  출발 모습에서 재생할지(거짓이면 도착 모습을 바로 그린다)
 * @param {boolean} overlay  조직도로 돌아가는 덮개 — 끝나면 onDone 으로 트리를 연다
 */
export default function SquadIsoStage({ to, animate, overlay, squads, people, onMemberClick, onDone }) {
  const L = useOrgLabels();
  const from = to === 'squad' ? 'org' : 'squad';
  const scene = useMemo(() => isoScene({ squads, people }), [squads, people]);
  const [play] = useState(() => !!animate && !prefersReducedMotion() && scene.blocks.length <= ISO_PLAY_MAX_BLOCKS);
  const [phase, setPhase] = useState(play ? 'play' : 'done');
  const [up, setUp] = useState(play ? from : to); // 지금 솟아 있는 판 — org | squad | none(둘 다 가라앉음)
  const [leaving, setLeaving] = useState(false);
  const [hov, setHov] = useState(null);
  const [zoom, setZoom] = useState(1);
  const svg = useRef(null);
  const run = useRef({ raf: 0, timers: [] });
  const scroller = useRef(null);
  const drag = useRef(null);
  const onDoneRef = useRef(onDone);
  useLayoutEffect(() => { onDoneRef.current = onDone; });

  const A = (tk) => spotOf(tk, from);
  const B = (tk) => spotOf(tk, to);
  // 그리는 순서 = 도착 자리의 깊이(뒤 → 앞)
  const drawn = useMemo(
    () => [...scene.blocks].sort((a, b) => (spotOf(a, to).x + spotOf(a, to).y) - (spotOf(b, to).x + spotOf(b, to).y)),
    [scene, to],
  );

  const blockNodes = () => new Map(
    [...(svg.current?.querySelectorAll('[data-iso-block]') ?? [])].map((el) => [el.getAttribute('data-iso-block'), el]),
  );
  const shadowNodes = () => new Map(
    [...(svg.current?.querySelectorAll('[data-iso-shadow]') ?? [])].map((el) => [el.getAttribute('data-iso-shadow'), el]),
  );

  const finish = () => {
    const r = run.current;
    cancelAnimationFrame(r.raf);
    r.timers.forEach(clearTimeout);
    r.timers = [];
    // 건너뛰면 공중의 블록 자리가 리액트가 아는 값과 달라 직접 맞춘다
    const nodes = blockNodes();
    drawn.forEach((tk) => {
      const p = B(tk);
      nodes.get(tk.key)?.setAttribute('transform', translateOf(p.x, p.y));
    });
    setUp(to);
    setPhase('done');
    if (overlay) {
      r.timers.push(setTimeout(() => setLeaving(true), 450), setTimeout(() => onDoneRef.current?.(), 850));
    } else {
      onDoneRef.current?.();
    }
  };

  useLayoutEffect(() => {
    if (!play) {
      if (overlay) onDoneRef.current?.();
      return undefined;
    }
    const r = run.current;
    const n = Math.max(1, drawn.length);
    const liftOrder = new Map(
      [...drawn].sort((a, b) => (A(a).x + A(a).y) - (A(b).x + A(b).y)).map((tk, i) => [tk.key, i]),
    );
    const items = drawn.map((tk, i) => ({
      tk,
      a: A(tk),
      b: B(tk),
      s1: liftOrder.get(tk.key) * (300 / n),
      s2: 980 + i * (520 / n),
      arc: 24 + Math.hypot(B(tk).x - A(tk).x, B(tk).y - A(tk).y) * 0.1,
    }));
    const nodes = blockNodes();
    const shadows = shadowNodes();
    let t0 = 0;
    const step = (now) => {
      if (!t0) t0 = now;
      const el = now - t0;
      let left = false;
      items.forEach(({ tk, a, b, s1, s2, arc }) => {
        let x = a.x; let y = a.y; let z;
        if (el < s2) {
          z = ISO.lift * easeOut(clamp01((el - s1) / 420));
          left = true;
        } else {
          const e = easeInOut(clamp01((el - s2) / 900));
          if (e < 1) left = true;
          x = a.x + (b.x - a.x) * e;
          y = a.y + (b.y - a.y) * e;
          z = ISO.lift * (1 - e) + arc * Math.sin(Math.PI * e);
        }
        nodes.get(tk.key)?.setAttribute('transform', translateOf(x, y, z));
        const sh = shadows.get(tk.key);
        if (sh) {
          sh.setAttribute('transform', `${translateOf(x, y)} scale(${(1 - Math.min(0.45, z / 220)).toFixed(3)})`);
          sh.setAttribute('opacity', (0.9 * Math.min(1, z / 16)).toFixed(2));
        }
      });
      if (left) r.raf = requestAnimationFrame(step);
      else finish();
    };
    r.timers.push(setTimeout(() => setUp('none'), 470), setTimeout(() => setUp(to), 800));
    r.raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(r.raf);
      r.timers.forEach(clearTimeout);
    };
    // 한 번만 돈다 — 다시 재생은 부모가 key 를 바꿔 새로 띄운다
  }, []);

  const G0 = -40; const gx1 = scene.floorW + 40; const gy1 = scene.floorH + 40; const step4 = ISO.cell * 4;
  const grid = [];
  for (let v = G0 + step4; v < gx1; v += step4) grid.push([[v, G0, 0], [v, gy1, 0]]);
  for (let v = G0 + step4; v < gy1; v += step4) grid.push([[G0, v, 0], [gx1, v, 0]]);
  const vbX = isoPoint(G0, gy1)[0] - 56;
  const vbW = isoPoint(gx1, G0)[0] + 56 - vbX;
  const vbY = isoPoint(G0, G0)[1] - 80;
  const vbH = isoPoint(gx1, gy1)[1] + 60 - vbY;

  // 처음엔 가로 가운데(§5-7 «캔버스») — 바닥은 마름모라 맨 위가 빈 꼭지다. 도착 판들이 시작하는 곳부터 보인다.
  // 스쿼드 쪽은 «스쿼드 없음» 판을 뺀다 — 그 판이 가장 커서 스쿼드들이 화면 밖으로 밀린다.
  const arrival = to === 'squad' && scene.squadRows.length > 0
    ? scene.squadSlabs.slice(0, scene.squadRows.length)
    : (to === 'squad' ? scene.squadSlabs : scene.teamSlabs);
  const corners = arrival.flatMap((sl) => [isoPoint(sl.x, sl.y), isoPoint(sl.x + sl.w, sl.y), isoPoint(sl.x, sl.y + sl.d), isoPoint(sl.x + sl.w, sl.y + sl.d)]);
  const firstY = Math.min(...corners.map((c) => c[1]));
  const centerX = (Math.min(...corners.map((c) => c[0])) + Math.max(...corners.map((c) => c[0]))) / 2;
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollLeft = (centerX - vbX) * zoom - el.clientWidth / 2;
    el.scrollTop = Math.max(0, (firstY - vbY) * zoom - 88);
  }, [zoom, centerX, firstY, vbX, vbY]);

  const onDown = (e) => {
    const el = scroller.current;
    if (!el || e.target.closest('[data-iso-tools]')) return;
    drag.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop, moved: false };
  };
  const onMove = (e) => {
    const d = drag.current; const el = scroller.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x; const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    el.scrollLeft = d.sl - dx;
    el.scrollTop = d.st - dy;
  };
  // 클릭이 먼저 판정하도록 한 박자 늦게 지운다 — 끌어서 놓은 것은 클릭으로 치지 않는다
  const onUp = () => { setTimeout(() => { drag.current = null; }, 0); };
  const fit = () => {
    const el = scroller.current;
    if (!el) return;
    const next = Math.min((el.clientWidth - 8) / vbW, (ISO_VIEW_MAX_H - 8) / vbH, 1);
    setZoom(Math.max(ISO_ZOOM_MIN, next));
  };

  const onSquadFloor = phase === 'done' ? to === 'squad' : from === 'squad';
  const unitName = (t) => (t?.kind === 'unit' ? t.name : L(`list.unit.${t?.kind === 'ceo' || t?.kind === 'ceoDirect' ? t.kind : 'unassigned'}`));
  const nameOf = (p) => p?.name || L('squad.unknownMember');
  const familyName = (f) => L(`squad.iso.family.${f || 'none'}`);
  const atSquad = phase === 'done' && to === 'squad';

  const personAt = (target) => {
    const id = target.closest?.('[data-person]')?.getAttribute('data-person');
    return id ? scene.personById.get(id) ?? null : null;
  };
  const onBlockOver = (e) => {
    if (phase === 'done') setHov(personAt(e.target)?.id ?? null);
  };
  const onBlockClick = (e) => {
    if (phase !== 'done' || !onMemberClick || drag.current?.moved) return;
    const p = personAt(e.target);
    if (p && !p.unknown) onMemberClick(p);
  };

  const hovPerson = hov ? scene.personById.get(hov) : null;
  const hovLine = hovPerson
    ? [
      nameOf(hovPerson),
      hovPerson.businessTitle,
      unitName(scene.teamOfPerson.get(hov)),
      scene.squadsOf(hov).length > 0
        ? L('squad.iso.hoverSquads', { count: scene.squadsOf(hov).length, names: scene.squadsOf(hov).map((sq) => sq.name).join(', ') })
        : L('squad.iso.hoverNoSquad'),
    ].filter(Boolean).join(' · ')
    : null;

  return (
    <div className={`sq-iso${leaving ? ' is-leaving' : ''}${hov ? ' is-hovering' : ''}`} data-testid="squad-iso-stage" data-phase={phase} data-to={to}>
      <div className="pj-table-header-text sq-matrix-head sq-graph-head">
        <p className="pj-table-title sq-iso-summary" data-testid="squad-iso-summary">
          <span className={atSquad ? 'sq-iso-off' : undefined}>{L('squad.iso.summaryTeams', { teams: scene.teams.length, people: scene.persons.length })}</span>
          <span className="sq-iso-off"> {to === 'squad' ? '→' : '←'} </span>
          <span className={to === 'squad' ? undefined : 'sq-iso-off'}>{L('squad.iso.summarySquads', { count: scene.squadRows.length })}</span>
        </p>
        {phase === 'play' && (
          <Button variant="secondary" size="sm" onClick={overlay ? () => onDoneRef.current?.() : finish} data-testid="squad-iso-skip">
            {L('squad.iso.skip')}
          </Button>
        )}
      </div>
      <div className="sq-panel sq-iso-panel">
        <div className="org-toolbar org-toolbar-right" data-iso-tools data-testid="squad-iso-tools">
          <div className="org-toolbar-group">
            <button type="button" className="org-tool-btn" onClick={() => setZoom((z) => Math.min(z + 0.1, ISO_ZOOM_MAX))} disabled={zoom >= ISO_ZOOM_MAX}
              title={L('org.zoomIn')} aria-label={L('org.zoomIn')} data-action="zoom-in"><PlusGlyph size={20} /></button>
            <button type="button" className="org-tool-btn" onClick={() => setZoom((z) => Math.max(z - 0.1, ISO_ZOOM_MIN))} disabled={zoom <= ISO_ZOOM_MIN}
              title={L('org.zoomOut')} aria-label={L('org.zoomOut')} data-action="zoom-out"><MinusGlyph size={20} /></button>
            <button type="button" className="org-tool-btn has-label" onClick={fit} title={L('squad.iso.zoomFitTip')} data-action="zoom-fit">
              <span>{L('squad.graph.zoomFit')}</span>
            </button>
          </div>
        </div>
        <div
          ref={scroller}
          className="sq-iso-scroll"
          data-testid="squad-iso-scroll"
          data-zoom={zoom.toFixed(2)}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
        >
          <svg
            ref={svg}
            className="sq-iso-svg"
            onMouseOver={onBlockOver}
            onMouseLeave={() => setHov(null)}
            onClick={onBlockClick}
            viewBox={`${vbX.toFixed(0)} ${vbY.toFixed(0)} ${vbW.toFixed(0)} ${vbH.toFixed(0)}`}
            width={Math.round(vbW * zoom)}
            height={Math.round(vbH * zoom)}
          >
            <polygon className="sq-iso-floor-front" points={isoPoints([[G0, gy1, 0], [gx1, gy1, 0], [gx1, gy1, -6], [G0, gy1, -6]])} />
            <polygon className="sq-iso-floor-side" points={isoPoints([[gx1, gy1, 0], [gx1, G0, 0], [gx1, G0, -6], [gx1, gy1, -6]])} />
            <polygon className="sq-iso-floor" points={isoPoints([[G0, G0, 0], [gx1, G0, 0], [gx1, gy1, 0], [G0, gy1, 0]])} />
            {grid.map((ln, i) => <polyline key={`g${i}`} className="sq-iso-grid" points={isoPoints(ln)} />)}

            {scene.teams.map((t, i) => (
              <Slab key={`t-${t.key}`} id={`t-${t.key}`} s={scene.teamSlabs[i]} up={up === 'org'} family={t.family} />
            ))}
            {scene.squadRows.map((r, i) => (
              <Slab key={`s-${r.squad.id}`} id={`s-${r.squad.id}`} s={scene.squadSlabs[i]} up={up === 'squad'} color={r.squad.color}
                stripes={[...r.familyCounts, ...(r.unsetCount ? [{ family: null, n: r.unsetCount }] : [])]} />
            ))}
            {scene.noSquadSlab && <Slab id="s-none" s={scene.noSquadSlab} up={up === 'squad'} dashed />}

            {scene.teams.map((t, i) => (
              <SlabLabel key={`lt-${t.key}`} id={`t-${t.key}`} s={scene.teamSlabs[i]} up={up === 'org'} family={t.family}
                name={unitName(t)} role={L('squad.iso.headTeam')} headName={t.head ? nameOf(t.head) : ''} unsetLabel={L('squad.iso.unset')}
                sub={L('squad.iso.teamSub', { count: t.people.length, family: familyName(t.family) })} />
            ))}
            {scene.squadRows.map((r, i) => (
              <SlabLabel key={`ls-${r.squad.id}`} id={`s-${r.squad.id}`} s={scene.squadSlabs[i]} up={up === 'squad'} color={r.squad.color}
                name={r.squad.name} role={L('squad.iso.headSquad')} headName={r.lead ? nameOf(r.lead) : ''} unsetLabel={L('squad.iso.unset')}
                sub={r.familyCounts.length > 0
                  ? L('squad.iso.squadSub', { count: r.members.length, families: r.familyCounts.length })
                  : L('squad.iso.count', { count: r.members.length })} />
            ))}
            {scene.noSquadSlab && (
              <SlabLabel id="s-none" s={scene.noSquadSlab} up={up === 'squad'} name={L('squad.iso.noSquad')} sub={L('squad.iso.count', { count: scene.noSquadCount })} />
            )}

            {phase === 'play' && drawn.map((tk) => {
              const a = A(tk);
              return (
                <ellipse key={`sh-${tk.key}`} className="sq-iso-shadow" data-iso-shadow={tk.key}
                  cx={0} cy={0} rx={ISO.block * 0.8} ry={ISO.block * 0.42} opacity={0} transform={translateOf(a.x, a.y)} />
              );
            })}

            {drawn.map((tk) => {
              if (phase === 'done' && to === 'org' && tk.dup) return null;
              const at = phase === 'done' ? B(tk) : A(tk);
              const isHead = onSquadFloor ? tk.lead : tk.head;
              const role = onSquadFloor ? L('squad.iso.headSquad') : L('squad.iso.headTeam');
              const team = unitName(tk.team);
              const title = tk.person.businessTitle || '';
              const name = nameOf(tk.person);
              const tip = [name, isHead ? role : '', title, team, tk.none ? L('squad.iso.noSquad') : ''].filter(Boolean).join(' · ');
              const clickable = !tk.person.unknown && !!onMemberClick;
              return (
                <Block
                  key={tk.key}
                  tk={tk}
                  transform={translateOf(at.x, at.y)}
                  isHead={isHead}
                  role={role}
                  line1={name}
                  line2={onSquadFloor ? team : (title || team)}
                  tip={tip}
                  hot={hov === tk.person.id}
                  faded={tk.none && onSquadFloor}
                  clickable={clickable}
                />
              );
            })}
          </svg>
        </div>
      </div>
      <div className="sq-graph-legend" data-testid="squad-iso-legend">
        <div className="sq-iso-legend-row">
          <span className="sq-iso-legend-title">{L('squad.iso.legendTitle')}</span>
          {[...ISO_FAMILIES, null].map((f) => (
            <span key={f || 'none'} className={`sq-iso-legend-item ${famClass(f)}`}>
              <span className="sq-iso-legend-box" aria-hidden />{familyName(f)}
            </span>
          ))}
        </div>
        <p className={`pj-table-subtitle sq-iso-hint${hovLine ? ' is-on' : ''}`} data-testid="squad-iso-hint">
          {hovLine || L('squad.iso.hint')}
        </p>
      </div>
    </div>
  );
}
