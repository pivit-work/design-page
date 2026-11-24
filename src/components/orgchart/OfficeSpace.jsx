import React, { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../shared/Button.jsx';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import CustomSelect from '../timeline/CustomSelect.jsx';
import { isEnterKey } from '../shared/enterKey.js';
import { makeOrgLabels } from './orgchart-labels.jsx';
import { OrgToolButton } from './OrgCanvasFrame.jsx';
import { CloseGlyph, MinusGlyph, PlusGlyph } from '../shared/lineIcons.jsx';
import {
  FOV, FS, GAP, M4, U, VS, WALK_FOV, blockedBy, boundsOf, buildScene, canDraw3d, centerOf, clampWalk, fitCam,
  floorNo, homeWalk, mix, readRgb, rectOf, solidsOf, toWorld, toneVar, unionOf,
} from './officeSpaceScene.js';

/**
 * 근무 공간 보기 — 빌딩 · 층을 «평면 2D · 3D 조감 · 둘러보기 · 건물 보기»로 본다 (pivit-work PW-3238).
 *
 * 정본: 기획 `arch-office-space.md` v1.1(공통 규칙) · 조직도 쪽 `screen-org-chart-place.policy.md` §3 · 회사 자산 쪽
 * `screen-admin-company-assets-layout.policy.md` v1.5 §2 #17 ~ #19. 시안 = `조직도-renewal-with-public-card/org-chart-app.jsx`
 * 의 `OfficeSpace`(로직은 그대로 옮겼다 · 셈은 `officeSpaceScene.js`). 쓰는 곳 둘 — 조직도 «근무지» 탭 «빌딩 · 층»(mode="org")
 * · 회사 자산 «책상 배치»(mode="assets"). 디자이너 원본이 없어(design-page 에 같은 판 없음) 값은 office_space.css 머리 주석의
 * 디자이너 부품 값을 따른다.
 *
 * 저장된 배치만 받는다 — 이 부품은 배치를 고치지 않는다. 회사 자산의 편집 판은 `editor` 로 «평면 2D» 자리에 끼운다.
 *
 * @param {object} props
 * @param {'org'|'assets'} [props.mode]
 * @param {'loading'|'failed'|'ready'} [props.status]  판 불러오기 상태(정본 §8) — 왼쪽 목록은 받은 만큼 보인다
 * @param {() => void} [props.onRetry]
 * @param {string[]} [props.buildings]  빌딩 순서(필드 옵션 순번). 없으면 받은 층 순서
 * @param {Array<{id: string, building: string, floor: string, desks: object[], areas?: object[], loose?: Array<{id: string, deskName?: string|null, free?: boolean}>}>} props.floors
 *   그림이 있는 층. desks `{ id, name, kind: 'desk'|'room', x, y, rot, seatId }` · areas `{ id, name, kind: 'room'|'open'|'zone', x, y, w, h }`
 *   · loose = 그림에 자리가 없는 그 층 사람(자유석이면 deskName 없음 · 배치도에 없는 책상이면 그 이름)
 * @param {Array<{building: string, floor: string, people: Array<{id: string, deskName?: string|null, free?: boolean}>}>} [props.plain]  그림이 없는 층(org)
 * @param {(id: string) => object|null} [props.personOf]  `{ id, name, initials, title, unit, unitPath, group, tone, top, topTone, badges: [{label, tone: 'ceo'|'top'|'tl'}], lead, squads }`
 * @param {Array<{key: string, name: string, tone: number|null}>} [props.groups]  소속 조직(층 보기 범례)
 * @param {Array<{key: string, name: string, tone: number|null}>} [props.tops]  최상위 조직(건물 보기 범례)
 * @param {(deskId: string) => {count: number, resigned: boolean}|null} [props.assetsOf]  (assets 만)
 * @param {(id: string) => void} [props.onOpenPerson]
 * @param {(deskId: string, floorId: string) => void} [props.onOpenDesk]  (assets) 책상 서랍
 * @param {(deskId: string) => void} [props.onPickDesk]  (assets · 평면 2D) 편집 판에서 그 책상 고르기
 * @param {(areaId: string) => void} [props.onPickArea]  (assets · 평면 2D) 공간 · 구역 고르기
 * @param {'2d'|'3d'|'walk'} [props.initialView]
 * @param {string|null} [props.initialFloorKey]  보는 사람의 자리가 있는 층(그림이 없는 층이면 `x:{빌딩}|{층}`)
 * @param {string|null} [props.initialBuilding]
 * @param {string|null} [props.floorId]  밖에서 정한 층(회사 자산 · 배치도 추가 등)
 * @param {(floorId: string) => boolean|void} [props.onFloor]  층을 고를 때 — false 면 옮기지 않는다(초안 · AI 도는 중)
 * @param {() => void} [props.onPlaceChange]  층 · 빌딩을 고른 뒤(조직도가 층 그림을 다시 받는다 — 근무지 정책 §5 #1)
 * @param {(q: string) => void} [props.onQuery]
 * @param {(view: string) => void} [props.onView]
 * @param {import('react').ReactNode} [props.tools]  머리 줄 맨 앞(회사 자산 위 줄)
 * @param {import('react').ReactNode} [props.editor]  (assets) 평면 2D 자리의 편집 판
 * @param {import('react').ReactNode} [props.summary]  층 이름 아래 줄 대신
 * @param {import('react').ReactNode} [props.note]  평면 2D 가 아닐 때의 안내(초안 경고)
 * @param {import('react').ReactNode} [props.adminLink]  그림 없는 층 안내 뒤(어드민만)
 * @param {import('react').ReactNode} [props.noBuildingsLink]  빌딩 없음 뒤(어드민만)
 * @param {object|function} [props.labels]
 */
export default function OfficeSpace({
  mode = 'org', status = 'ready', onRetry, buildings: buildingOrder, floors = [], plain = [], personOf = () => null,
  groups = [], tops = [], assetsOf, onOpenPerson, onOpenDesk, onPickDesk, onPickArea,
  initialView, initialFloorKey = null, initialBuilding = null, floorId = null, onFloor = null, onPlaceChange = null, onQuery = null, onView = null,
  tools = null, editor = null, summary = null, note = null, adminLink = null, noBuildingsLink = null, labels,
}) {
  const L = makeOrgLabels(labels);
  const org = mode === 'org';
  const [noGl, setNoGl] = useState(() => !canDraw3d());
  const buildings = useMemo(() => {
    const seen = [...new Set([...floors, ...plain].map((f) => f.building))];
    if (!buildingOrder) return seen;
    return [...buildingOrder.filter((b) => seen.includes(b)), ...seen.filter((b) => !buildingOrder.includes(b))];
  }, [buildingOrder, floors, plain]);
  const seatedN = (f) => f.desks.filter((d) => d.seatId && personOf(d.seatId)).length;
  // 빌딩을 고를 때 여는 층 — 조직도는 앉은 사람이 가장 많은 층(근무지 정책 §3), 회사 자산은 책상이 가장 많은 층(정책서 §4 «빌딩 고르기»)
  const most = (list) => [...list].sort((a, b) => (org ? seatedN(b) - seatedN(a) : b.desks.length - a.desks.length))[0] || null;
  const plainKey = (f) => `x:${f.building}|${f.floor || ''}`;
  const firstRow = () => {
    const f = floors.find((x) => x.id === initialFloorKey);
    if (f) return { building: f.building, key: f.id, floorName: f.floor || '' };
    const p = plain.find((x) => plainKey(x) === initialFloorKey);
    if (p) return { building: p.building, key: plainKey(p), floorName: p.floor || '' };
    const pool = initialBuilding ? floors.filter((x) => x.building === initialBuilding) : floors;
    const m = most(pool);
    return { building: initialBuilding || (m ? m.building : buildings[0]), key: m ? m.id : null, floorName: m ? m.floor || '' : null };
  };
  const [{ building, key: floorKey, floorName: keptFloor }, setPlace] = useState(firstRow);
  const rows = useMemo(() => [
    ...floors.filter((f) => f.building === building).map((f) => ({ ...f, key: f.id, drawn: true })),
    ...plain.filter((f) => f.building === building).map((f) => ({ ...f, key: plainKey(f), drawn: false })),
  ].sort((a, b) => floorNo(b.floor) - floorNo(a.floor)), [floors, plain, building]);
  // 층 줄 — 처음 층이 정해지지 않았으면(그림이 없는 빌딩) 앉은 사람이 가장 많은 층, 아니면 맨 위
  // 고른 층이 다시 받은 목록에 없으면(«조직도에 보이기»가 꺼져 그림 층이 «목록만»이 됨) 같은 층 글자로 다시 찾는다
  const row = rows.find((r) => r.key === floorKey)
    || (keptFloor != null ? rows.find((r) => (r.floor || '') === keptFloor) : null)
    || (rows.length ? [...rows].sort((a, b) => rowHead(b) - rowHead(a))[0] : null);
  function rowHead(r) {
    return r.drawn ? seatedN(r) + (r.loose || []).filter((x) => personOf(x.id)).length : r.people.filter((x) => personOf(x.id)).length;
  }
  const floor = row && row.drawn ? row : null;
  const [view, setView] = useState(initialView || (org ? '3d' : '2d'));   // '2d' | '3d' | 'walk' | 'bldg'
  const [tab, setTab] = useState(org ? 'people' : 'desk');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const [grp, setGrp] = useState(null);
  const [listOpen, setListOpen] = useState(false);   // 좁은 화면에서 접힌 왼쪽 목록을 펼쳤나(§5 #10)
  const wrap = useRef(null), canvas = useRef(null), gl = useRef(null), cam = useRef(null), anim = useRef(null), tags = useRef({}), raf = useRef(0);
  const drawnRows = rows.filter((r) => r.drawn);
  const v = noGl && view !== '2d' ? '2d' : view;
  const bldgView = v === 'bldg';
  const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const looseOf = (r) => (r.drawn ? r.loose || [] : r.people || []);
  const people = useMemo(() => {
    const of = (r) => [
      ...(r.drawn ? r.desks.filter((d) => d.seatId && personOf(d.seatId)).map((d) => ({ p: personOf(d.seatId), desk: d, deskName: d.name, row: r })) : []),
      ...looseOf(r).map((x) => ({ p: personOf(x.id), desk: null, deskName: x.deskName || null, free: !!x.free, row: r })).filter((x) => x.p),
    ];
    return bldgView ? rows.flatMap(of) : row ? of(row) : [];
  }, [row && row.key, rows, bldgView, personOf]);
  // 책상 줄은 이름순(숫자는 수로 · «책상 2» 가 «책상 10» 앞) — 건물 보기는 층 줄 순서(높은 층부터) 안에서
  const byDeskName = (a, b) => String(a.name).localeCompare(String(b.name), 'ko', { numeric: true });
  const deskRows = bldgView
    ? drawnRows.flatMap((r) => [...r.desks].sort(byDeskName).map((d) => ({ d, r })))
    : floor ? [...floor.desks].sort(byDeskName).map((d) => ({ d, r: floor })) : [];
  const norm = (s) => String(s || '').trim().toLowerCase();
  const hitP = (x) => !norm(q) || [x.p.name, x.p.unit, x.p.unitPath, x.p.title, x.deskName].some((s) => norm(s).includes(norm(q)));
  const hitD = (d) => !norm(q) || [d.name, d.seatId && personOf(d.seatId) && personOf(d.seatId).name].some((s) => norm(s).includes(norm(q)));
  const keyOf = (p) => (bldgView ? p.top || p.group : p.group);
  const toneOfP = (p) => (bldgView ? (p.topTone !== undefined ? p.topTone : p.tone) : p.tone);
  // 흐림 — 목록 찾기와 같은 재료(이름 · 소속 · 직함 · 책상 이름)로 맞춘다
  const deskNameOf = new Map(people.map((x) => [x.p.id, x.deskName]));
  const dim = (p) => (grp && (!p || keyOf(p) !== grp)) || (norm(q) && org && p && !hitP({ p, deskName: deskNameOf.get(p.id) ?? null }));
  const selDesk = (floor && floor.desks.find((d) => d.id === sel)) || null;
  const selPerson = selDesk && selDesk.seatId ? personOf(selDesk.seatId) : null;
  const cntOf = (r) => (org ? L('office.countPeople', { count: rowHead(r) }) : r.drawn ? L('office.countDesks', { count: r.desks.length }) : '');
  const floorName = (r) => r.floor || L('office.floorUnset');

  useEffect(() => { if (onView) onView(v); }, [v]);
  useEffect(() => { if (onQuery) onQuery(q); }, [q]);
  // 밖에서 정한 층(배치도 추가 · 배치도에서 보기) — 값이 바뀐 그 그리기에서 맞춘다
  const outerKey = `${floorId || ''}|${floors.length}`;
  const [seenOuter, setSeenOuter] = useState(outerKey);
  if (seenOuter !== outerKey) {
    setSeenOuter(outerKey);
    const f = floorId && floors.find((x) => x.id === floorId);
    if (f && f.id !== floorKey) {
      setPlace({ building: f.building, key: f.id, floorName: f.floor || '' });
      setSel(null);
      if (view === 'bldg') setView('3d');
    }
  }

  // ── 카메라
  const b3 = floor ? toWorld(boundsOf(floor)) : null;
  const unionB = unionOf(drawnRows);
  const asp = () => (wrap.current ? wrap.current.clientWidth / Math.max(1, wrap.current.clientHeight) : 1.4);
  const homeCam = () => {
    if (v === 'bldg') return fitCam(-0.62, 0.46, toWorld(unionB), 0, (drawnRows.length - 1) * GAP + 0.6, asp(), 0.26);
    return fitCam(-0.5, 0.82, b3, 0, 2.5, asp());
  };
  const solids = solidsOf(floor);
  const blocked = blockedBy(solids);
  const kick = () => { if (!raf.current) raf.current = requestAnimationFrame(frame); };
  const eye = () => {
    const c = cam.current;
    if (!c) return null;
    if (c.walk) {
      const w = c.walk;
      return { e: w.e, t: [w.e[0] - Math.sin(w.yaw) * Math.cos(w.pitch), w.e[1] + Math.sin(w.pitch), w.e[2] - Math.cos(w.yaw) * Math.cos(w.pitch)] };
    }
    const o = c.orbit;
    return { e: [o.t[0] + o.dist * Math.cos(o.pitch) * Math.sin(o.yaw), o.t[1] + o.dist * Math.sin(o.pitch), o.t[2] + o.dist * Math.cos(o.pitch) * Math.cos(o.yaw)], t: o.t };
  };
  // 다가가는 움직임 — 움직임 줄이기를 켠 기기는 바로 그 자리(정책 §5 #11)
  const fly = (to, ms = 520) => {
    const c = cam.current;
    if (!c) return;
    if (reduced) { Object.assign(c.walk || c.orbit, JSON.parse(JSON.stringify(to))); kick(); return; }
    anim.current = { from: JSON.parse(JSON.stringify(c.walk || c.orbit)), to, t0: null, ms };   // 첫 그림 시각에서 센다
    kick();
  };
  function frame(now) {
    raf.current = 0;
    const g = gl.current, cv = canvas.current, c = cam.current;
    if (!g || !cv || !c) return;
    if (anim.current) {
      const a = anim.current;
      if (a.t0 == null) a.t0 = now;
      const k = Math.min(1, (now - a.t0) / a.ms), s = k * k * (3 - 2 * k), o = c.walk || c.orbit;
      const lerp = (x, y) => (Array.isArray(x) ? x.map((z, i) => z + (y[i] - z) * s) : x + (y - x) * s);
      Object.keys(a.to).forEach((n) => { o[n] = lerp(a.from[n], a.to[n]); });
      if (k < 1) raf.current = requestAnimationFrame(frame); else anim.current = null;
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const x = g.ctx;
    x.viewport(0, 0, cv.width, cv.height);
    x.clearColor(g.bg[0], g.bg[1], g.bg[2], 1);
    x.clear(x.COLOR_BUFFER_BIT | x.DEPTH_BUFFER_BIT);
    const ey = eye();
    const m = M4.mul(M4.persp(c.walk ? WALK_FOV : c.orbit.fov || FOV, W / Math.max(1, H), c.walk ? 0.12 : Math.max(0.2, c.orbit.dist * 0.12), c.walk ? 90 : c.orbit.dist * 2 + 60), M4.look(ey.e, ey.t));
    x.useProgram(g.prog);
    x.uniformMatrix4fv(g.u, false, m);
    const draw = (buf, n, blend) => {
      if (!n) return;
      x.bindBuffer(x.ARRAY_BUFFER, buf);
      [[g.a.p, 3, 0], [g.a.n, 3, 12], [g.a.c, 4, 24]].forEach(([loc, sz, off]) => { x.enableVertexAttribArray(loc); x.vertexAttribPointer(loc, sz, x.FLOAT, false, 40, off); });
      if (blend) { x.enable(x.BLEND); x.blendFunc(x.ONE, x.ONE_MINUS_SRC_ALPHA); x.depthMask(false); } else { x.disable(x.BLEND); x.depthMask(true); }
      x.drawArrays(x.TRIANGLES, 0, n);
      x.depthMask(true);
    };
    x.enable(x.DEPTH_TEST);
    draw(g.solid, g.nSolid, false);
    draw(g.glass, g.nGlass, true);
    // 이름표 — 3D 자리를 화면 자리로. 둘러보기는 멀거나 벽 너머면 숨긴다(정본 §2)
    Object.values(tags.current).forEach(({ el, pos, kind }) => {
      if (!el) return;
      const X = m[0] * pos[0] + m[4] * pos[1] + m[8] * pos[2] + m[12], Y = m[1] * pos[0] + m[5] * pos[1] + m[9] * pos[2] + m[13], w = m[3] * pos[0] + m[7] * pos[1] + m[11] * pos[2] + m[15];
      const far = c.walk ? (kind === 'person' ? 11 : 16) : 1e9;
      if (w < 0.3 || w > far || (c.walk && blocked(c.walk.e[0], c.walk.e[2], pos[0], pos[2]))) { el.dataset.hidden = '1'; return; }
      const k = kind === 'floor' ? 1 : Math.max(0.66, Math.min(c.walk ? 1.25 : 1, (c.walk ? 6 : 24) / w));
      el.dataset.hidden = '0';
      el.style.zIndex = String(Math.round(5000 - Math.min(w, 200) * 20) + (kind === 'area' ? -200 : 0));
      el.style.transform = `translate(${((X / w) * 0.5 + 0.5) * W}px, ${((-Y / w) * 0.5 + 0.5) * H}px) translate(-50%, -50%) scale(${k})`;
      el.dataset.near = (c.walk ? w < 7 : w < 17) ? '1' : '0';
    });
  }
  const step = (f, s) => {
    const w = cam.current && cam.current.walk;
    if (!w || !b3) return;
    w.e = clampWalk(b3, [w.e[0] - Math.sin(w.yaw) * f + Math.cos(w.yaw) * s, 1.6, w.e[2] - Math.cos(w.yaw) * f - Math.sin(w.yaw) * s]);
    kick();
  };
  // ── 장면 올리기
  useEffect(() => {
    if (v === '2d' || status !== 'ready' || !canvas.current || (!floor && v !== 'bldg')) return undefined;
    let ctx = gl.current && gl.current.ctx;
    if (!ctx || ctx.canvas !== canvas.current) {
      // 보기를 바꿔 캔버스가 새로 생겼으면 앞 캔버스의 연결을 거둔다(브라우저의 연결 수 한도)
      if (ctx) { const l = ctx.getExtension('WEBGL_lose_context'); if (l) l.loseContext(); }
      ctx = canvas.current.getContext('webgl', { antialias: true, alpha: false });
      if (!ctx) { setNoGl(true); return undefined; }
      const sh = (ty, src) => { const s = ctx.createShader(ty); ctx.shaderSource(s, src); ctx.compileShader(s); return s; };
      const prog = ctx.createProgram();
      ctx.attachShader(prog, sh(ctx.VERTEX_SHADER, VS));
      ctx.attachShader(prog, sh(ctx.FRAGMENT_SHADER, FS));
      ctx.linkProgram(prog);
      gl.current = { ctx, prog, u: ctx.getUniformLocation(prog, 'm'), a: { p: ctx.getAttribLocation(prog, 'p'), n: ctx.getAttribLocation(prog, 'n'), c: ctx.getAttribLocation(prog, 'c') }, solid: ctx.createBuffer(), glass: ctx.createBuffer() };
    }
    const g = gl.current;
    const tok = (n) => readRgb(`var(${n})`);
    const strong = tok('--text-primary'), card = tok('--bg-primary'), bl = tok('--border-secondary'), sub = tok('--text-secondary'), muted = tok('--text-tertiary'), bd = tok('--border-primary');
    const C = {
      slab: mix(strong, card, 0.35), floorA: mix(sub, strong, 0.55), floorB: mix(sub, strong, 0.48), wall: mix(card, bl, 0.25), cap: mix(strong, sub, 0.25),
      glass: mix(card, tok('--utility-blue-200'), 0.6), room: mix(muted, bl, 0.35), open: mix(bd, card, 0.3), zone: mix(sub, strong, 0.38),
      desk: card, leg: bd, chair: mix(strong, sub, 0.5), screen: strong, shadow: strong,
    };
    g.bg = mix(bl, bd, 0.25);
    const brand = tok('--fg-brand-primary'), warn = tok('--fg-warning-primary'), toneCache = {};
    const toneRgb = (t) => { const n = toneVar(t); if (!toneCache[n]) toneCache[n] = tok(n); return toneCache[n]; };
    const toneOf = (d) => {
      const p = d.seatId ? personOf(d.seatId) : null;
      if (!org) { const a = assetsOf ? assetsOf(d.id) : null; return a && a.resigned ? warn : p ? brand : C.leg; }
      return p && !dim(p) ? toneRgb(toneOfP(p)) : C.leg;
    };
    const parts = v === 'bldg'
      ? [...drawnRows].reverse().map((f, i) => buildScene(f, C, { oy: i * GAP, low: true, toneOf, bounds: unionB }))
      : [buildScene(floor, C, { toneOf })];
    const S = new Float32Array(parts.flatMap((p) => p.solid)), G = new Float32Array(parts.flatMap((p) => p.glass));
    ctx.bindBuffer(ctx.ARRAY_BUFFER, g.solid); ctx.bufferData(ctx.ARRAY_BUFFER, S, ctx.STATIC_DRAW); g.nSolid = S.length / 10;
    ctx.bindBuffer(ctx.ARRAY_BUFFER, g.glass); ctx.bufferData(ctx.ARRAY_BUFFER, G, ctx.STATIC_DRAW); g.nGlass = G.length / 10;
    kick();
    return undefined;
  }, [v, status, row && row.key, building, grp, q, floors]);
  useEffect(() => {
    if (v === '2d' || status !== 'ready' || (!floor && v !== 'bldg')) return undefined;
    cam.current = v === 'walk' ? { walk: homeWalk(floor) } : { orbit: homeCam() };
    anim.current = null;
    kick();
    const el = wrap.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const c = cam.current;
      if (!c) return;
      if (c.walk) step(-Math.sign(e.deltaY) * 0.5, 0); else c.orbit.dist = Math.max(4, Math.min(600, c.orbit.dist * Math.exp(e.deltaY * 0.0012)));
      kick();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => kick()) : null;
    if (ro) ro.observe(el);
    return () => { el.removeEventListener('wheel', onWheel); if (ro) ro.disconnect(); };
  }, [v, status, row && row.key, building]);
  // 사라질 때 예약한 그리기만 거둔다 — 예약 표시를 0 으로 되돌려야 다시 붙을 때(개발 모드의 미리 정리 포함) 그리기가 다시 돈다.
  // WebGL 연결은 끊지 않는다: 같은 캔버스로 다시 붙으면 끊긴 연결을 받아 판이 검게 남는다(캔버스와 함께 거둬진다).
  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
  }, []);
  useEffect(() => { kick(); });
  const onKey = (e) => {
    if (v !== 'walk' || !cam.current || !cam.current.walk) return;
    const k = e.key.toLowerCase(), w = cam.current.walk;
    if (k === 'w' || k === 'arrowup') step(0.4, 0);
    else if (k === 's' || k === 'arrowdown') step(-0.4, 0);
    else if (k === 'a') step(0, -0.4);
    else if (k === 'd') step(0, 0.4);
    else if (k === 'arrowleft') { w.yaw += 0.12; kick(); } else if (k === 'arrowright') { w.yaw -= 0.12; kick(); } else return;
    e.preventDefault();
  };
  const down = (e) => {
    if (e.target.closest && e.target.closest('button, [role="button"]')) return;
    const c = cam.current;
    if (!c) return;
    const sx = e.clientX, sy = e.clientY, pan = e.button === 2 || e.shiftKey, from = JSON.parse(JSON.stringify(c.walk || c.orbit));
    let moved = false;
    anim.current = null;
    const mv = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (!moved && Math.hypot(dx, dy) < 4) return;
      moved = true;
      if (c.walk) { c.walk.yaw = from.yaw + dx * 0.005; c.walk.pitch = Math.max(-0.9, Math.min(0.9, from.pitch + dy * 0.004)); } else if (pan) {
        const k = from.dist * 0.0011, o = c.orbit;
        o.t = [from.t[0] - (Math.cos(from.yaw) * dx + Math.sin(from.yaw) * dy) * k, from.t[1], from.t[2] - (-Math.sin(from.yaw) * dx + Math.cos(from.yaw) * dy) * k];
      } else { c.orbit.yaw = from.yaw - dx * 0.006; c.orbit.pitch = Math.max(0.12, Math.min(1.5, from.pitch + dy * 0.005)); }
      kick();
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      if (moved) return;
      if (c.walk) {
        // 바닥을 누르면 그 자리로 간다
        const r = wrap.current.getBoundingClientRect(), half = Math.tan(WALK_FOV / 2);
        const nx = (((ev.clientX - r.left) / r.width) * 2 - 1) * half * (r.width / r.height), ny = (1 - ((ev.clientY - r.top) / r.height) * 2) * half, w = c.walk;
        const pit = Math.atan(ny) + w.pitch;
        if (pit < -0.03) { const dist = Math.min(9, 1.6 / Math.tan(-pit)), a = w.yaw - Math.atan(nx); fly({ e: clampWalk(b3, [w.e[0] - Math.sin(a) * dist, 1.6, w.e[2] - Math.cos(a) * dist]) }, 700); }
      } else setSel(null);
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };
  const goTo = (r) => {
    if (v === '2d' || v === 'bldg' || !cam.current || !b3) return;
    const t = centerOf(r);
    if (cam.current.walk) fly({ e: clampWalk(b3, [t[0], 1.6, t[2] + 2.4]), yaw: 0, pitch: -0.18 }, 800);
    else fly({ t, dist: Math.min(cam.current.orbit.dist, 13), pitch: 0.7 });
  };
  const pickDesk = (d) => {
    setSel(d.id);
    if (v === '2d' && !org) { if (onPickDesk) onPickDesk(d.id); } else goTo(rectOf(d));
    if (!org && onOpenDesk && floor) onOpenDesk(d.id, floor.id);
  };
  const pickArea = (a) => {
    setSel(a.id);
    if (v === '2d' && !org) { if (onPickArea) onPickArea(a.id); } else goTo(a);
  };
  const pickFloor = (k, deskId = null) => {
    if (onFloor && k !== floorKey && rows.find((r) => r.key === k && r.drawn) && onFloor(k) === false) return;
    const target = rows.find((r) => r.key === k);
    setPlace({ building, key: k, floorName: target ? target.floor || '' : null });
    setSel(deskId);
    setGrp(null);
    if (view === 'bldg') setView('3d');
    if (onPlaceChange) onPlaceChange();
  };
  const pickBuilding = (n) => {
    const m = most(floors.filter((f) => f.building === n));
    if (onFloor && m && onFloor(m.id) === false) return;
    setPlace({ building: n, key: m ? m.id : null, floorName: m ? m.floor || '' : null });
    setSel(null);
    setGrp(null);
    if (view === 'bldg' && floors.filter((f) => f.building === n).length === 0) setView('3d');
    if (onPlaceChange) onPlaceChange();
  };
  const zoomBy = (k) => {
    const c = cam.current;
    if (!c) return;
    if (c.walk) step(k < 1 ? 0.8 : -0.8, 0); else fly({ dist: Math.max(4, Math.min(600, c.orbit.dist * k)) }, 220);
  };
  const fit = () => { if (!cam.current) return; setSel(null); fly(cam.current.walk ? homeWalk(floor) : homeCam(), 420); };

  // ── 조각
  const setTag = (el, id, pos, kind) => { if (el) tags.current[id] = { el, pos, kind }; else delete tags.current[id]; };
  const areas = floor ? floor.areas || [] : [];
  const spaceN = areas.filter((a) => a.kind !== 'zone').length;
  const zoneN = areas.length - spaceN;
  const kindName = { room: L('office.kindRoom'), open: L('office.kindOpen'), zone: L('office.kindZone') };
  const labelOf = (a) => (a.kind === 'zone' ? L('office.zoneLabel', { name: a.name }) : a.name);
  const emptyN = floor ? floor.desks.filter((d) => !d.seatId || !personOf(d.seatId)).length : 0;
  const looseN = floor ? (floor.loose || []).filter((x) => x.free && personOf(x.id)).length : 0;
  const byUnit = useMemo(() => {
    const m = new Map();
    people.filter(hitP).forEach((x) => { const u = x.p.unit || L('office.unassigned'); m.set(u, [...(m.get(u) || []), x]); });
    return [...m.entries()];
  }, [people, q]);
  const legend = (bldgView ? tops : groups)
    .map((g) => ({ ...g, n: people.filter((x) => keyOf(x.p) === g.key && (!bldgView || x.row.drawn)).length }))
    .filter((g) => g.n)
    .sort((a, b) => b.n - a.n);
  const noGlTip = noGl ? L('office.noGlTip') : undefined;
  const views = [
    { value: '2d', label: L('office.view2d'), testId: 'office-view-2d' },
    { value: '3d', label: L('office.view3d'), disabled: noGl, title: noGlTip, testId: 'office-view-3d' },
    { value: 'walk', label: L('office.viewWalk'), disabled: noGl, title: noGlTip, testId: 'office-view-walk' },
  ];
  const help = { '2d': editor ? L('office.help2dEdit') : L('office.help2d'), '3d': L('office.help3d'), walk: L('office.helpWalk'), bldg: L('office.helpBldg') }[v];
  const tone = (t) => (t == null ? 'osp-tone-muted' : `osp-tone-${((t % 8) + 8) % 8}`);
  const seatLine = (x) => [x.row.building, floorName(x.row), x.deskName || L('office.freeSeat')].join(' · ');

  const personRow = (x, i) => {
    const on = x.desk && x.desk.id === sel;
    const go = () => {
      if (bldgView && x.desk) pickFloor(x.row.key, x.desk.id);
      else if (x.desk) pickDesk(x.desk);
      else if (onOpenPerson) onOpenPerson(x.p.id);
    };
    const place = [bldgView ? floorName(x.row) : '', x.deskName || (x.free ? L('office.freeSeat') : '')].filter(Boolean).join(' · ');
    return (
      <div key={`${x.p.id}:${i}`} className={`osp-row${on ? ' is-on' : ''}`} data-person={x.p.name} role="button" tabIndex={0} onClick={go} onKeyDown={onActKey}>
        <span className={`osp-avatar ${tone(toneOfP(x.p))}`} aria-hidden="true">{x.p.initials || String(x.p.name || '?').slice(-2)}</span>
        <span className="osp-row-main">
          <span className="osp-row-name">
            <span className="osp-cut">{x.p.name}</span>
            {(x.p.badges || []).map((b) => <StatusBadge key={b.label} className={`role-badge role-badge-${b.tone || 'tl'} osp-badge`}>{b.label}</StatusBadge>)}
          </span>
          <span className="osp-row-sub osp-cut">{x.p.title}</span>
        </span>
        <span className="osp-row-side">{place}</span>
      </div>
    );
  };

  const head = (() => {
    if (bldgView) {
      const total = org ? drawnRows.reduce((s, f) => s + rowHead(f), 0) : drawnRows.reduce((s, f) => s + f.desks.length, 0);
      return L(org ? 'office.bldgSummaryOrg' : 'office.bldgSummaryAssets', { floors: drawnRows.length, count: total });
    }
    if (floor) {
      if (!org) return summary;
      return L('office.floorSummary', {
        people: rowHead(row), loose: looseN ? L('office.looseSuffix', { count: looseN }) : '', empty: emptyN, spaces: spaceN,
        zones: zoneN ? L('office.zoneSuffix', { count: zoneN }) : '',
      });
    }
    return row ? L('office.plainSummary', { count: people.length }) : '';
  })();

  const listTabs = [
    org ? { value: 'people', label: L('office.tabPeople', { count: people.length }), testId: 'office-tab-people' } : { value: 'desk', label: L('office.tabDesks', { count: deskRows.length }), testId: 'office-tab-desk' },
    ...(bldgView ? [] : [{ value: 'area', label: L('office.tabAreas', { count: areas.length }), testId: 'office-tab-area' }]),
  ];
  const curTab = bldgView ? (org ? 'people' : 'desk') : tab;
  const buildingSelect = buildings.length > 0 && (
    <CustomSelect value={building || ''} onChange={pickBuilding} options={buildings.map((n) => ({ value: n, label: n }))} ariaLabel={L('office.pickBuilding')} size="sm" />
  );

  let stage;
  if (status === 'loading') stage = <div className="osp-stage-msg" role="status" data-testid="office-loading">{L('office.loading')}</div>;
  else if (status === 'failed') {
    stage = (
      <div className="osp-stage-msg" data-testid="office-failed">
        <span>{L('office.failed')}</span>
        {onRetry && <Button variant="secondary" size="sm" onClick={onRetry} data-testid="office-retry">{L('office.retry')}</Button>}
      </div>
    );
  } else if (!row) {
    stage = (
      <div className="osp-stage-msg" data-testid="office-no-buildings">
        <span>{L('office.noBuildings')}</span>
        {noBuildingsLink}
      </div>
    );
  } else if (!floor && !bldgView) {
    stage = (
      <div className="osp-plain" data-testid="office-plain">
        <p className="osp-plain-note">{L('office.plainNote')}{adminLink}</p>
        <div className="osp-plain-grid">
          {people.filter(hitP).map((x, i) => <div key={x.p.id} className="osp-plain-card">{personRow(x, i)}</div>)}
        </div>
      </div>
    );
  } else if (v === '2d') {
    stage = <div className="osp-stage">{editor || <Plan2D key={row.key} floor={floor} personOf={personOf} org={org} assetsOf={assetsOf} sel={sel} dim={dim} hitD={hitD} toneOf={toneOfP} L={L} onEmpty={() => setSel(null)} onPick={(id) => { const d = floor.desks.find((x) => x.id === id); if (d) pickDesk(d); else { const a = areas.find((x) => x.id === id); if (a) pickArea(a); } }} />}</div>;
  } else {
    stage = (
      <div className="osp-stage">
        <div
          ref={wrap}
          className="osp-gl"
          tabIndex={0}
          role="application"
          aria-label={bldgView ? L('office.stageAriaBldg', { building }) : L(v === 'walk' ? 'office.stageAriaWalk' : 'office.stageAria', { building, floor: floorName(row) })}
          data-testid="office-stage"
          data-view={v}
          onKeyDown={onKey}
          onPointerDown={down}
          onContextMenu={(e) => e.preventDefault()}
        >
          <canvas ref={canvas} className="osp-canvas" />
          {bldgView && [...drawnRows].reverse().map((f, i) => (
            <div key={f.key} className="osp-tag osp-floor-tag" data-tag-floor={f.floor} ref={(el) => setTag(el, `f:${f.key}`, [(unionB.x - 30) * U, i * GAP + 0.3, (unionB.y + unionB.h - 20) * U], 'floor')} role="button" tabIndex={0} onClick={() => pickFloor(f.key)} onKeyDown={onActKey}>
              {floorName(f)} <span className="osp-floor-tag-n">{cntOf(f)}</span>
            </div>
          ))}
          {!bldgView && areas.map((a) => {
            const c = a.kind === 'zone' ? [(a.x + 0.6 - 30) * U, 0, (a.y + a.h - 0.4 - 20) * U] : centerOf(a);
            return (
              <div key={a.id} className={`osp-tag osp-area-tag${sel === a.id ? ' is-on' : ''}`} data-area={labelOf(a)} ref={(el) => setTag(el, `a:${a.id}`, [c[0], a.kind === 'room' ? 2.3 : 0.25, c[2]], 'area')} role="button" tabIndex={0} onClick={() => pickArea(a)} onKeyDown={onActKey}>
                {labelOf(a)}
              </div>
            );
          })}
          {!bldgView && floor.desks.map((d) => {
            const p = d.seatId ? personOf(d.seatId) : null, a = assetsOf ? assetsOf(d.id) : null, c = centerOf(rectOf(d)), on = sel === d.id;
            const off = org ? (p ? dim(p) : true) : !!norm(q) && !hitD(d);
            if (org && !p) return null;   // 빈 책상에는 표시가 없다(정책 §3 «사람 표시»)
            const dotCls = org ? tone(toneOfP(p)) : a && a.resigned ? 'osp-dot-resigned' : p ? 'osp-dot-seated' : 'osp-dot-empty';
            return (
              <div
                key={d.id}
                className={`osp-tag osp-desk-tag${on ? ' is-on' : ''}${off ? ' is-dim' : ''}`}
                data-on={on ? '1' : '0'}
                data-desk={d.name}
                ref={(el) => setTag(el, `d:${d.id}`, [c[0], org ? 1.55 : 1.35, c[2]], 'person')}
                aria-label={p ? L('office.deskAria', { name: p.name, desk: d.name }) : L('office.emptyDeskAria', { desk: d.name })}
                role="button" tabIndex={0} onClick={() => pickDesk(d)} onKeyDown={onActKey}
              >
                <span className={`osp-dot ${dotCls}${org ? '' : ' is-sm'}`}>
                  {org ? (p.initials || String(p.name).slice(-2)) : null}
                  {!org && a && a.count > 0 && <span className="osp-dot-count">{a.count}</span>}
                  {org && p.lead && <span className="osp-dot-lead" />}
                </span>
                <span className="osp-tag-full">
                  <span className="osp-tag-name">{p ? p.name : d.name}</span>
                  <span className="osp-tag-sub">{org ? p.title : p ? d.name : L('office.emptyDesk')}</span>
                </span>
              </div>
            );
          })}
          <div className="osp-zoom">
            <OrgToolButton label={L('office.zoomIn')} onClick={() => zoomBy(0.8)} data-testid="office-zoom-in"><PlusGlyph size={20} /></OrgToolButton>
            <OrgToolButton label={L('office.zoomOut')} onClick={() => zoomBy(1.25)} data-testid="office-zoom-out"><MinusGlyph size={20} /></OrgToolButton>
            <OrgToolButton label={L('office.fit')} title={L('office.fitTip')} className="has-label" onClick={fit} data-testid="office-fit"><span>{L('office.fit')}</span></OrgToolButton>
          </div>
        </div>
      </div>
    );
  }

  const personCard = org && selPerson && selDesk && (v === '2d' || v === '3d' || v === 'walk') && (
    <div className="osp-card" data-testid="office-person-card" onPointerDown={(e) => e.stopPropagation()}>
      <div className="osp-card-head">
        <span className={`osp-avatar is-lg ${tone(toneOfP(selPerson))}`} aria-hidden="true">{selPerson.initials || String(selPerson.name).slice(-2)}</span>
        <span className="osp-card-who">
          <span className="osp-card-name osp-cut">{selPerson.name}</span>
          <span className="osp-card-title osp-cut">{selPerson.title}</span>
        </span>
        <Button variant="ghost" size="sm" onClick={() => setSel(null)} aria-label={L('office.close')} data-testid="office-card-close"><CloseGlyph size={16} /></Button>
      </div>
      <dl className="osp-card-rows">
        <dt>{L('office.cardUnit')}</dt><dd>{selPerson.unitPath || selPerson.unit || L('office.unassigned')}</dd>
        {(selPerson.badges || []).length > 0 && <><dt>{L('office.cardRole')}</dt><dd>{selPerson.badges.map((b) => b.label).join(' · ')}</dd></>}
        {(selPerson.squads || []).length > 0 && <><dt>{L('office.cardSquad')}</dt><dd>{selPerson.squads.map((s) => (s.lead ? L('office.squadLead', { name: s.name }) : s.name)).join(', ')}</dd></>}
        <dt>{L('office.cardSeat')}</dt><dd>{seatLine({ row, deskName: selDesk.name })}</dd>
      </dl>
      <div className="osp-card-actions">
        <Button variant="primary" size="sm" onClick={() => onOpenPerson && onOpenPerson(selPerson.id)} data-testid="office-open-profile">{L('office.openProfile')}</Button>
        <Button variant="secondary" size="sm" onClick={() => setGrp(grp === selPerson.group ? null : selPerson.group)} data-testid="office-same-unit">{grp === selPerson.group ? L('office.showAll') : L('office.sameUnit')}</Button>
      </div>
    </div>
  );

  return (
    <div className={`osp${listOpen ? ' is-list-open' : ''}`} data-office-space={mode} data-view={v}>
      <aside className="osp-aside" aria-label={L('office.listAria')}>
        <div className="osp-aside-top">{buildingSelect}</div>
        <div className="osp-floors">
          {rows.map((r) => {
            const on = row && r.key === row.key && !bldgView;
            return (
              <div key={r.key} className={`osp-floor${on ? ' is-on' : ''}`} data-floor={floorName(r)} aria-pressed={on} role="button" tabIndex={0} onClick={() => pickFloor(r.key)} onKeyDown={onActKey}>
                <span className="osp-floor-name">{floorName(r)}</span>
                {!r.drawn && status === 'ready' && <span className="osp-floor-only">{L('office.listOnly')}</span>}
                <span className="osp-floor-n">{cntOf(r)}</span>
              </div>
            );
          })}
        </div>
        {row && (
          <div className="osp-aside-tabs">
            {/* 건물 보기는 갈래가 하나뿐(사람 · 책상)이라 고를 것이 없다 — 세그먼트 대신 그 수만 */}
            {listTabs.length > 1
              ? <SegmentedControl items={listTabs} value={curTab} onChange={setTab} ariaLabel={L('office.listAria')} block equal />
              : <div className="osp-unit-head" data-testid="office-list-count">{listTabs[0].label}</div>}
          </div>
        )}
        {row && (
          <div className="osp-aside-search">
            <input
              className="osp-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Escape') setQ(''); }}
              placeholder={org ? L('office.searchOrg') : L('office.searchAssets')}
              aria-label={bldgView ? L('office.searchBuildingAria') : L('office.searchFloorAria')}
              data-testid="office-search"
            />
          </div>
        )}
        <div className="osp-list" data-testid="office-list">
          {curTab === 'people' && byUnit.map(([u, list]) => (
            <div key={u}>
              <div className="osp-unit-head">{L('office.unitHead', { name: u, count: list.length })}</div>
              {list.map(personRow)}
            </div>
          ))}
          {curTab === 'people' && row && byUnit.length === 0 && (
            <div className="osp-list-empty">{norm(q) ? (bldgView ? L('office.noMatchBuilding') : L('office.noMatchFloor')) : L('office.noneHere')}</div>
          )}
          {curTab === 'desk' && deskRows.filter((x) => hitD(x.d)).map(({ d, r }) => {
            const p = d.seatId ? personOf(d.seatId) : null, a = (assetsOf && assetsOf(d.id)) || { count: 0, resigned: false };
            return (
              <div key={d.id} className={`osp-row${d.id === sel ? ' is-on' : ''}`} data-desk-row={d.name} role="button" tabIndex={0} onClick={() => { if (bldgView) pickFloor(r.key, d.id); else pickDesk(d); }} onKeyDown={onActKey}>
                <span className={`osp-desk-name osp-cut${bldgView ? ' is-wide' : ''}`}>{bldgView ? `${floorName(r)} ${d.name}` : d.name}</span>
                <span className={`osp-desk-who osp-cut${p ? '' : ' is-empty'}`}>
                  {p ? p.name : L('office.emptyDesk')}
                  {a.resigned && <StatusBadge tone="warning" className="osp-badge">{L('office.resigned')}</StatusBadge>}
                </span>
                <span className={`osp-desk-assets${a.count ? ' has-assets' : ''}`}>{L('office.assetCount', { count: a.count })}</span>
              </div>
            );
          })}
          {curTab === 'desk' && !!norm(q) && !deskRows.some((x) => hitD(x.d)) && <div className="osp-list-empty">{L('office.noDeskMatch')}</div>}
          {curTab === 'area' && areas.map((a) => (
            <div key={a.id} className={`osp-row${a.id === sel ? ' is-on' : ''}`} data-area-row={labelOf(a)} role="button" tabIndex={0} onClick={() => pickArea(a)} onKeyDown={onActKey}>
              <span className="osp-area-name osp-cut">{labelOf(a)}</span>
              <span className="osp-row-side">{kindName[a.kind]}</span>
            </div>
          ))}
          {curTab === 'area' && floor && areas.length === 0 && <div className="osp-list-empty">{L('office.noAreas')}</div>}
        </div>
      </aside>

      <section className="osp-main">
        <div className="osp-head">
          {tools}
          {/* 좁은 화면 — 왼쪽 목록을 접고 빌딩 · 층 고르기를 무대 위 한 줄로(정책 §5 #10) */}
          <div className="osp-narrow-pick">
            <Button variant="secondary" size="sm" aria-expanded={listOpen} onClick={() => setListOpen((o) => !o)} data-testid="office-list-toggle">
              {listOpen ? L('office.listClose') : L('office.listOpen')}
            </Button>
            {buildingSelect}
            {rows.length > 0 && (
              <CustomSelect value={row ? row.key : ''} onChange={(k) => pickFloor(k)} options={rows.map((r) => ({ value: r.key, label: `${floorName(r)} · ${cntOf(r) || L('office.listOnly')}` }))} ariaLabel={L('office.pickFloor')} size="sm" />
            )}
          </div>
          <div className="osp-title">
            <div className="osp-title-main" data-testid="office-title">
              {building ? (bldgView ? L('office.allFloors', { building }) : row ? L('office.titleFloor', { building, floor: floorName(row) }) : building) : ''}
            </div>
            <div className="osp-title-sub" data-testid="office-summary">{head}</div>
          </div>
          <span className="osp-grow" />
          {floor && !bldgView && <SegmentedControl items={views} value={v} onChange={(k) => { setView(k); setSel(null); }} ariaLabel={L('office.viewsAria')} />}
          {drawnRows.length > 0 && (
            <Tooltip content={noGlTip}>
              <Button
                variant="secondary"
                size="md"
                disabled={noGl}
                aria-pressed={bldgView}
                onClick={() => { setGrp(null); setSel(null); setView(bldgView ? '3d' : 'bldg'); }}
                data-testid="office-building-toggle"
              >
                {bldgView ? L('office.backToFloor') : L('office.building')}
              </Button>
            </Tooltip>
          )}
        </div>
        {noGl && <div className="osp-note" data-testid="office-no-gl">{L('office.noGl')}</div>}
        {note && v !== '2d' && <div className="osp-note" role="status" data-testid="office-draft-note">{note}</div>}
        <div className="osp-body">
          {stage}
          {personCard}
        </div>
        {status === 'ready' && row && (floor || bldgView) && (
          <div className="osp-legend">
            {org
              ? legend.map((g) => {
                const on = grp === g.key;
                return (
                  <div key={g.key} className={`osp-chip${on ? ' is-on' : ''}`} aria-pressed={on} data-legend={g.name} role="button" tabIndex={0} onClick={() => setGrp(on ? null : g.key)} onKeyDown={onActKey}>
                    <span className={`osp-swatch ${tone(g.tone)}`} aria-hidden="true" />
                    {g.name} {g.n}
                  </div>
                );
              })
              : v === '2d' && editor
                ? null
                : [['office.legendSeated', 'osp-dot-seated'], ['office.legendEmpty', 'osp-dot-empty'], ['office.legendResigned', 'osp-dot-resigned']].map(([k, cls]) => (
                  <span key={k} className="osp-legend-item"><span className={`osp-swatch ${cls}`} aria-hidden="true" />{L(k)}</span>
                ))}
            <span className="osp-grow" />
            <span className="osp-help">{help}</span>
          </div>
        )}
      </section>
    </div>
  );
}

/** 평면 2D — 같은 배치를 위에서 본 그림(읽기 전용). 3D 를 못 그리는 기기의 기본 보기이기도 하다 */
function Plan2D({ floor, personOf, org, assetsOf, sel, dim, hitD, toneOf, L, onPick, onEmpty }) {
  const b = boundsOf(floor), G = 20, pad = 1.5;
  const [vb, setVb] = useState({ x: (b.x - pad) * G, y: (b.y - pad) * G, w: (b.w + pad * 2) * G, h: (b.h + pad * 2) * G });
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect(), k = Math.exp(e.deltaY * 0.0012), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
      setVb((o) => { const w = Math.max(160, Math.min(2600, o.w * k)), h = o.h * (w / o.w); return { x: o.x + (o.w - w) * fx, y: o.y + (o.h - h) * fy, w, h }; });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  const down = (e) => {
    const sx = e.clientX, sy = e.clientY, o = vb, r = ref.current.getBoundingClientRect(), s = Math.max(o.w / r.width, o.h / r.height);
    let moved = false;
    const mv = (ev) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
      moved = true;
      setVb({ ...o, x: o.x - (ev.clientX - sx) * s, y: o.y - (ev.clientY - sy) * s });
    };
    const up = () => {
      window.removeEventListener('pointermove', mv);
      window.removeEventListener('pointerup', up);
      // 빈 곳을 누르면(끌지 않고) 고른 사람 카드를 닫는다 — 3D 와 같다(§3 «사람 고르기»)
      if (!moved && onEmpty && !(e.target.closest && e.target.closest('[data-desk], [data-area]'))) onEmpty();
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };
  const toneCls = (t) => (t == null ? 'osp-fill-muted' : `osp-fill-${((t % 8) + 8) % 8}`);
  return (
    <div className="osp-plan">
      <svg ref={ref} className="osp-plan-svg" data-plan2d viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} onPointerDown={down}>
        <rect className="osp-plan-outline" x={b.x * G} y={b.y * G} width={b.w * G} height={b.h * G} rx={4} />
        {(floor.areas || []).map((a) => (
          <g key={a.id} className="osp-plan-hit" data-area={a.name} onClick={() => onPick(a.id)}>
            <rect className={`osp-plan-area is-${a.kind}${sel === a.id ? ' is-on' : ''}`} x={a.x * G} y={a.y * G} width={a.w * G} height={a.h * G} rx={3} />
            {a.kind === 'zone'
              ? <text className="osp-plan-zone-text" x={a.x * G + 6} y={(a.y + a.h) * G - 6}>{L('office.zoneLabel', { name: a.name })}</text>
              : <text className="osp-plan-area-text" x={(a.x + a.w / 2) * G} y={(a.y + a.h / 2) * G + 4} textAnchor="middle">{a.name}</text>}
          </g>
        ))}
        {floor.desks.map((d) => {
          const r = rectOf(d), p = d.seatId ? personOf(d.seatId) : null, a = assetsOf ? assetsOf(d.id) : null;
          const off = org ? (p ? dim(p) : false) : !hitD(d), w = r.w * G - 4, h = r.h * G - 4;
          const bar = org ? (p ? toneCls(toneOf(p)) : 'osp-fill-disabled') : a && a.resigned ? 'osp-fill-resigned' : p ? 'osp-fill-seated' : 'osp-fill-disabled';
          const cut = Math.max(2, Math.floor(w / 11));
          return (
            <g key={d.id} className="osp-plan-hit" data-desk={d.name} onClick={() => onPick(d.id)} opacity={off ? 0.25 : 1}>
              <rect className={`osp-plan-desk${d.kind === 'room' ? ' is-room' : ''}${sel === d.id ? ' is-on' : ''}`} x={r.x * G + 2} y={r.y * G + 2} width={w} height={h} rx={5} />
              <rect className={bar} x={r.x * G + 2} y={r.y * G + 2} width={4} height={h} rx={2} />
              <text className="osp-plan-desk-name" x={r.x * G + 10} y={r.y * G + 15}>{d.name}</text>
              <text className={`osp-plan-desk-who${p ? ' is-seated' : ''}`} x={r.x * G + 10} y={r.y * G + 29}>{(p ? p.name : L('office.emptyDesk')).slice(0, cut)}</text>
              {d.kind === 'room' && p && org && <text className="osp-plan-desk-title" x={r.x * G + 10} y={r.y * G + 44}>{p.title}</text>}
              {!org && a && a.count > 0 && <text className="osp-plan-desk-assets" x={r.x * G + w - 4} y={r.y * G + 15} textAnchor="end">{a.count}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** 누르는 칸(role="button")의 Enter · Space — 그 칸을 누른 것과 같게 */
function onActKey(e) {
  if (isEnterKey(e) || e.key === ' ') {
    e.preventDefault();
    e.currentTarget.click();
  }
}
