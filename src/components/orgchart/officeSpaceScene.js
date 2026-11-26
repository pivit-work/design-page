/**
 * 근무 공간 보기(OfficeSpace)의 셈과 3D 장면 — 화면이 없는 순수 함수만 둔다 (pivit-work PW-3238).
 *
 * 정본: 기획 `arch-office-space.md` §2 · §3 · 시안 `조직도-renewal-with-public-card/org-chart-app.jsx` 의 `OfficeSpace`
 * (buildScene · fitCam · homeWalk 를 그대로 옮겼다). 3D 는 저장된 배치(책상 · 개인실 · 공간 · 구역)에서만 나오고
 * 따로 그리거나 저장하지 않는다(정본 §3) — 이 파일은 받은 배치를 삼각형으로 바꿀 뿐이다.
 *
 * 판은 가로 60 · 세로 40 눈금(회사 자산 «책상 배치» 판 그대로) · 한 눈금 = 0.5 (3D 단위).
 */

export const U = 0.5;
export const BOARD = { w: 60, h: 40 };
/** 책상 3×2 · 개인실 6×5 — 회사 자산 판과 같은 크기 */
export const DESK = { desk: { w: 3, h: 2 }, room: { w: 6, h: 5 } };
export const FOV = Math.PI / 4.6;
export const WALK_FOV = Math.PI / 2.9;
/** 건물 보기 층 사이 */
export const GAP = 8;

export const dimsOf = (d) => {
  const k = DESK[d.kind] || DESK.desk;
  return d.kind === 'desk' && d.rot ? { w: k.h, h: k.w } : k;
};
export const rectOf = (d) => ({ x: d.x, y: d.y, ...dimsOf(d) });

/** 층 쌓는 순서 — 층 글자에서 읽은 수(지하 · B 는 음수 · 못 읽으면 0 · 정본 §2 · 근무지 정책 §5 #5) */
export const floorNo = (s) => {
  const m = String(s || '').match(/(지하|B)?\s*(\d+)/i);
  return m ? (m[1] ? -1 : 1) * Number(m[2]) : 0;
};

/** 놓인 것 전체를 감싸는 사각 + 한 칸 여유(바깥 벽 · 정본 §3). 아무것도 없으면 판 전체 */
export const boundsOf = (f) => {
  const rs = [...f.desks.map(rectOf), ...(f.areas || [])];
  if (!rs.length) return { x: 0, y: 0, w: BOARD.w, h: BOARD.h };
  const x0 = Math.max(0, Math.min(...rs.map((r) => r.x)) - 1);
  const y0 = Math.max(0, Math.min(...rs.map((r) => r.y)) - 1);
  const x1 = Math.min(BOARD.w, Math.max(...rs.map((r) => r.x + r.w)) + 1);
  const y1 = Math.min(BOARD.h, Math.max(...rs.map((r) => r.y + r.h)) + 1);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

/** 건물 보기 바닥 — 그 빌딩 층들을 함께 감싸는 사각 하나(정본 §2) */
export const unionOf = (floors) => {
  const all = floors.map(boundsOf);
  if (!all.length) return { x: 0, y: 0, w: BOARD.w, h: BOARD.h };
  const x = Math.min(...all.map((b) => b.x));
  const y = Math.min(...all.map((b) => b.y));
  return { x, y, w: Math.max(...all.map((b) => b.x + b.w)) - x, h: Math.max(...all.map((b) => b.y + b.h)) - y };
};

export const toWorld = (b) => ({ x0: (b.x - 30) * U, x1: (b.x + b.w - 30) * U, z0: (b.y - 20) * U, z1: (b.y + b.h - 20) * U });
export const centerOf = (r) => [(r.x + r.w / 2 - 30) * U, 0, (r.y + r.h / 2 - 20) * U];

// ── 색 — 토큰(CSS 변수)을 화면에서 읽어 0~1 rgb 로 바꾼다. 값을 적지 않는다(hex 0)
export const readRgb = (css) => {
  if (typeof document === 'undefined' || !document.body) return [0.5, 0.5, 0.5];
  const el = document.createElement('span');
  el.style.color = css;
  el.style.display = 'none';
  document.body.appendChild(el);
  const v = getComputedStyle(el).color || '';
  el.remove();
  const n = (v.match(/[\d.]+/g) || [128, 128, 128]).map(Number);
  return v.startsWith('color(') ? n.slice(0, 3) : n.slice(0, 3).map((x) => x / 255);
};
export const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);

/** 사람 색 여덟 — 조직장 주황 점(--utility-orange-500)과 멀고 서로 덜 닮은 여덟(Lab 거리 최소 27 · 주황과 91 이상).
 *  청록 · 연두는 600 — 500 은 동그라미 안 흰 이름 대비가 2.5 · 2.2 로 낮다(600 은 3.8 · 3.2).
 *  앞 판(근무지 «지역» .op-tone 과 같은 여덟)은 초록 · 브랜드 초록이 12 로 거의 같고 주황이 조직장 점과 같았다(PW-3238 11-25 되돌림).
 *  자리는 화면마다 많은 조직부터 0, 1, 2 … 로 준다(OfficeSpace toneSlot) · 넘치면 돌려 쓴다(정책 §5 #9) */
export const TONE_VARS = [
  '--utility-blue-500',
  '--utility-pink-500',
  '--utility-green-500',
  '--utility-purple-500',
  '--colors-teal-600',
  '--utility-fuchsia-500',
  '--colors-grayBlue-500',
  '--colors-greenLight-600',
];
/**
 * 색 자리 — 지금 보이는 사람의 조직을 범례와 같은 셈(많은 순 · 같으면 `order` 순)으로 세워 0, 1, 2 … 를 준다.
 * `shown` 이 거짓인 사람(건물 보기의 «목록만» 층)은 범례에 안 세므로 그 조직은 범례 조직 뒤에 둔다 —
 * 그래야 범례가 여덟 이하면 범례 · 3D · 목록 색이 겹치지 않는다(정책 §3 «범례» · §5 #9).
 * @param {Array<{key: string, shown: boolean}>} people  색이 있는 사람만(미배정 · 회사 회색은 넣지 않는다)
 * @param {string[]} order  조직 순서(트리 순)
 * @returns {Map<string, number>}
 */
export function toneSlots(people, order) {
  const n = new Map(), all = new Set();
  people.forEach(({ key, shown }) => { all.add(key); if (shown) n.set(key, (n.get(key) || 0) + 1); });
  const at = (k) => { const i = order.indexOf(k); return i < 0 ? order.length : i; };
  const slot = new Map();
  [...all].sort((a, b) => (n.get(b) || 0) - (n.get(a) || 0) || at(a) - at(b)).forEach((k, i) => slot.set(k, i));
  return slot;
}
export const toneVar = (tone) => (tone == null ? '--utility-gray-500' : TONE_VARS[((tone % 8) + 8) % 8]);

// ── 행렬(열 우선)
export const M4 = {
  mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      o[c * 4 + r] = s;
    }
    return o;
  },
  persp(fov, asp, n, f) {
    const t = 1 / Math.tan(fov / 2);
    return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]);
  },
  look(e, t) {
    let zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2];
    let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = zz, xz = -zx;
    l = Math.hypot(xx, xz) || 1; xx /= l; xz /= l;
    const yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;
    return new Float32Array([xx, yx, zx, 0, 0, yy, zy, 0, xz, yz, zz, 0,
      -(xx * e[0] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
  },
};

/**
 * 장면 만들기 — 저장된 배치(책상 · 개인실 · 공간 · 구역)만으로 그린다(정본 §3).
 * 책상 = 상판 · 모니터 · 의자, 개인실 = 네 벽 + 책상, 막힌 방 = 네 벽 + 문 한 칸, 열린 곳 = 바닥색, 구역 = 옅은 바닥색.
 * 문 자리 · 벽 높이 · 방 안 탁자 · 의자 방향은 그림일 뿐 고르지 않는다.
 * @returns {{ solid: number[], glass: number[] }} 꼭짓점마다 위치3 · 법선3 · 색4
 */
export function buildScene(f, C, opt = {}) {
  const solid = [], glass = [];
  const push = (arr, x0, y0, z0, x1, y1, z1, rgb, a = 1, topOnly = false) => {
    const q = (p, n) => [[0, 1, 2], [0, 2, 3]].forEach((t) => t.forEach((i) => arr.push(p[i][0], p[i][1], p[i][2], n[0], n[1], n[2], rgb[0], rgb[1], rgb[2], a)));
    q([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], [0, 1, 0]);
    if (topOnly) return;
    q([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1]);
    q([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1]);
    q([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], [1, 0, 0]);
    q([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], [-1, 0, 0]);
  };
  const oy = opt.oy || 0, low = !!opt.low, b = opt.bounds || boundsOf(f);
  const X = (v) => (v - 30) * U, Z = (v) => (v - 20) * U;
  const box = (x0, y0, z0, x1, y1, z1, rgb, a) => push(a && a < 1 ? glass : solid, x0, y0 + oy, z0, x1, y1 + oy, z1, rgb, a);
  const shadow = (x0, z0, x1, z1, a = 0.22) => push(glass, x0 + 0.06, oy + 0.04, z0 + 0.06, x1 + 0.16, oy + 0.045, z1 + 0.16, C.shadow, a);
  const bx0 = X(b.x), bx1 = X(b.x + b.w), bz0 = Z(b.y), bz1 = Z(b.y + b.h);
  // 바닥 — 카펫 타일 결을 옅게
  box(bx0 - 0.25, -0.35, bz0 - 0.25, bx1 + 0.25, -0.02, bz1 + 0.25, C.slab);
  for (let i = 0, x = bx0; x < bx1 - 0.01; x += 2, i++) for (let j = 0, z = bz0; z < bz1 - 0.01; z += 2, j++)
    push(solid, x, oy - 0.03, z, Math.min(bx1, x + 2), oy, Math.min(bz1, z + 2), (i + j) % 2 ? C.floorA : C.floorB, 1, true);
  // 바깥 벽 — 아래는 막힌 띠 · 위는 유리 · 머리띠
  const t = 0.16, wh = low ? 0.55 : 2.5;
  const outer = (x0, z0, x1, z1, alongX) => {
    box(x0, 0, z0, x1, low ? wh : 0.55, z1, C.wall);
    if (low) return;
    box(x0, 2.38, z0, x1, wh, z1, C.cap);
    box(x0 + (alongX ? 0 : t * 0.4), 0.55, z0 + (alongX ? t * 0.4 : 0), x1 - (alongX ? 0 : t * 0.4), 2.38, z1 - (alongX ? t * 0.4 : 0), C.glass, 0.2);
    const L = alongX ? x1 - x0 : z1 - z0;
    for (let k = 0; k <= L + 0.01; k += 1.5) {
      const p = Math.min(L - 0.07, k);
      if (alongX) box(x0 + p, 0.55, z0 + 0.02, x0 + p + 0.07, 2.38, z1 - 0.02, C.cap);
      else box(x0 + 0.02, 0.55, z0 + p, x1 - 0.02, 2.38, z0 + p + 0.07, C.cap);
    }
  };
  outer(bx0 - t, bz0 - t, bx1 + t, bz0, true); outer(bx0 - t, bz1, bx1 + t, bz1 + t, true);
  outer(bx0 - t, bz0, bx0, bz1, false); outer(bx1, bz0, bx1 + t, bz1, false);
  const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
  // 막힌 방 — 네 벽 + 문 한 칸(층 가운데를 보는 긴 쪽)
  const walls = (r, rgb) => {
    const x0 = X(r.x) + 0.04, x1 = X(r.x + r.w) - 0.04, z0 = Z(r.y) + 0.04, z1 = Z(r.y + r.h) - 0.04, w = 0.1, h = low ? 0.55 : 2.15;
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, horiz = r.w >= r.h;
    const side = horiz ? (mz < cz ? 's' : 'n') : (mx < cx ? 'e' : 'w');
    const seg = (a0, c0, a1, c1) => { if (a1 - a0 < 0.02 || c1 - c0 < 0.02) return; box(a0, 0, c0, a1, h, c1, rgb); box(a0, h, c0, a1, h + 0.06, c1, C.cap); };
    const run = (k, a0, c0, a1, c1) => {
      if (side !== k) { seg(a0, c0, a1, c1); return; }
      const ax = k === 'n' || k === 's', m = ax ? (a0 + a1) / 2 : (c0 + c1) / 2, d = Math.min(0.5, (ax ? a1 - a0 : c1 - c0) / 4);
      if (ax) { seg(a0, c0, m - d, c1); seg(m + d, c0, a1, c1); } else { seg(a0, c0, a1, m - d); seg(a0, m + d, a1, c1); }
    };
    run('n', x0, z0, x1, z0 + w); run('s', x0, z1 - w, x1, z1); run('w', x0, z0, x0 + w, z1); run('e', x1 - w, z0, x1, z1);
  };
  const chair = (x, z, rgb) => { box(x - 0.2, 0.42, z - 0.2, x + 0.2, 0.5, z + 0.2, rgb); box(x - 0.05, 0, z - 0.05, x + 0.05, 0.42, z + 0.05, C.cap); };
  (f.areas || []).forEach((r) => {
    const x0 = X(r.x), x1 = X(r.x + r.w), z0 = Z(r.y), z1 = Z(r.y + r.h);
    if (r.kind === 'zone') { box(x0, 0, z0, x1, 0.02, z1, C.zone); return; }
    if (r.kind === 'open') { box(x0, 0, z0, x1, 0.03, z1, C.open); return; }
    box(x0 + 0.1, 0, z0 + 0.1, x1 - 0.1, 0.03, z1 - 0.1, C.room);
    walls(r, C.wall);
    const inside = f.desks.some((d) => d.x >= r.x && d.y >= r.y && d.x < r.x + r.w && d.y < r.y + r.h);
    if (inside || low || r.w < 5 || r.h < 5) return;
    // 책상이 없는 막힌 방에는 가운데 탁자와 의자를 둔다(그림)
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, tw = (x1 - x0) * 0.26, th = (z1 - z0) * 0.16;
    shadow(mx - tw, mz - th, mx + tw, mz + th);
    box(mx - tw, 0.66, mz - th, mx + tw, 0.73, mz + th, C.desk);
    box(mx - 0.1, 0, mz - 0.1, mx + 0.1, 0.66, mz + 0.1, C.cap);
    for (let q = -tw + 0.35; q <= tw - 0.2; q += 0.7) { chair(mx + q, mz - th - 0.35, C.chair); chair(mx + q, mz + th + 0.35, C.chair); }
  });
  f.desks.forEach((d) => {
    const r = rectOf(d), tone = opt.toneOf ? opt.toneOf(d) : C.chair;
    if (d.kind === 'room') { box(X(r.x) + 0.1, 0, Z(r.y) + 0.1, X(r.x + r.w) - 0.1, 0.03, Z(r.y + r.h) - 0.1, C.room); walls(r, C.wall); }
    const c = d.kind === 'room' ? { x: r.x + 1.5, y: r.y + 1, w: 3, h: 2 } : r;
    const x0 = X(c.x) + 0.08, x1 = X(c.x + c.w) - 0.08, z0 = Z(c.y) + 0.08, z1 = Z(c.y + c.h) - 0.08;
    shadow(x0, z0, x1, z1);
    box(x0, 0.66, z0, x1, 0.73, z1, C.desk);
    box(x0 + 0.03, 0, z0 + 0.03, x0 + 0.08, 0.66, z1 - 0.03, C.leg);
    box(x1 - 0.08, 0, z0 + 0.03, x1 - 0.03, 0.66, z1 - 0.03, C.leg);
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    // 의자는 빈 쪽에 둔다 — 아래(오른쪽)에 다른 책상이 붙어 있으면 위(왼쪽)로 돌린다
    const touch = (o) => {
      if (o === d) return false;
      const q = rectOf(o);
      return d.rot ? q.x === r.x + r.w && q.y < r.y + r.h && q.y + q.h > r.y : q.y === r.y + r.h && q.x < r.x + r.w && q.x + q.w > r.x;
    };
    const flip = d.kind === 'desk' && f.desks.some(touch), fx = (v) => (flip ? x0 + x1 - v : v), fz = (v) => (flip ? z0 + z1 - v : v);
    const bx = (a0, y0, c0, a1, y1, c1, rgb) => (d.rot
      ? box(Math.min(fx(a0), fx(a1)), y0, c0, Math.max(fx(a0), fx(a1)), y1, c1, rgb)
      : box(a0, y0, Math.min(fz(c0), fz(c1)), a1, y1, Math.max(fz(c0), fz(c1)), rgb));
    if (!d.rot) {
      bx(x0 + 0.12, 0.73, mz + 0.02, x1 - 0.12, 0.745, z1 - 0.06, tone);
      bx(mx - 0.3, 0.84, z0 + 0.1, mx + 0.3, 1.18, z0 + 0.14, C.screen);
      bx(mx - 0.04, 0.73, z0 + 0.1, mx + 0.04, 0.86, z0 + 0.14, C.cap);
      if (!low) chair(mx, fz(z1 + 0.2), tone);
    } else {
      bx(mx + 0.02, 0.73, z0 + 0.12, x1 - 0.06, 0.745, z1 - 0.12, tone);
      bx(x0 + 0.1, 0.84, mz - 0.3, x0 + 0.14, 1.18, mz + 0.3, C.screen);
      bx(x0 + 0.1, 0.73, mz - 0.04, x0 + 0.14, 0.86, mz + 0.04, C.cap);
      if (!low) chair(fx(x1 + 0.2), mz, tone);
    }
  });
  return { solid, glass };
}

/**
 * 처음 시야 — 놓인 것 전체(B · 높이 y0~y1)가 판 안에 다 들어오는 가장 가까운 거리(정본 §2).
 * @param {number} asp 무대 가로 / 세로
 */
export function fitCam(yaw, pitch, B, y0, y1, asp, fov = FOV) {
  const half = Math.tan(fov / 2);
  const pts = [B.x0, B.x1].flatMap((x) => [B.z0, B.z1].flatMap((z) => [y0, y1].map((y) => [x, y, z])));
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  const back = [cp * sy, sp, cp * cy], right = [cy, 0, -sy], up = [-sp * sy, cp, -sp * cy];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  let t = [(B.x0 + B.x1) / 2, (y0 + y1) / 2, (B.z0 + B.z1) / 2], dist = 20;
  for (let n = 0; n < 6; n++) {
    const ext = (D) => {
      let x0 = 9, x1 = -9, v0 = 9, v1 = -9;
      pts.forEach((q) => {
        const d = [q[0] - t[0], q[1] - t[1], q[2] - t[2]], z = Math.max(0.1, D - dot(d, back));
        const x = dot(d, right) / (z * half * asp), y = dot(d, up) / (z * half);
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); v0 = Math.min(v0, y); v1 = Math.max(v1, y);
      });
      return [x0, x1, v0, v1];
    };
    let lo = 4, hi = 600;
    for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2, [x0, x1, v0, v1] = ext(m); if (x1 - x0 < 1.8 && v1 - v0 < 1.78) hi = m; else lo = m; }
    dist = hi;
    const [x0, x1, v0, v1] = ext(dist), ox = ((x0 + x1) / 2) * half * asp * dist, oy = ((v0 + v1) / 2) * half * dist;
    t = t.map((c, i) => c + right[i] * ox + up[i] * oy);
  }
  return { yaw, pitch, dist, t, fov };
}

/** 막힌 곳(막힌 방 · 개인실) — 둘러보기에서 벽 너머 이름표를 숨기고 첫 자리를 고르는 데 쓴다 */
export const solidsOf = (floor) => (floor
  ? [...(floor.areas || []).filter((a) => a.kind === 'room'), ...floor.desks.filter((d) => d.kind === 'room').map(rectOf)]
    .map((r) => [(r.x - 30) * U, (r.y - 20) * U, (r.x + r.w - 30) * U, (r.y + r.h - 20) * U])
  : []);
const within = (r, x, z) => x > r[0] && x < r[2] && z > r[1] && z < r[3];

/** a → b 선분이 막힌 곳을 지나나. 자기가 든 방의 벽은 가리지 않는 것으로 본다(정본 §2) */
export const blockedBy = (solids) => (ax, az, bx, bz) => solids.some((r) => {
  if (within(r, ax, az) || within(r, bx, bz)) return false;
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  for (const [p, q] of [[-dx, ax - r[0]], [dx, r[2] - ax], [-dz, az - r[1]], [dz, r[3] - az]]) {
    if (Math.abs(p) < 1e-9) { if (q < 0) return false; } else {
      const u = q / p;
      if (p < 0) t0 = Math.max(t0, u); else t1 = Math.min(t1, u);
      if (t0 > t1) return false;
    }
  }
  return true;
});

/** 둘러보기 — 바깥 벽을 넘지 못한다 */
export const clampWalk = (b3, e) => [Math.max(b3.x0 + 0.4, Math.min(b3.x1 - 0.4, e[0])), 1.6, Math.max(b3.z0 + 0.4, Math.min(b3.z1 - 0.4, e[2]))];

/**
 * 둘러보기 첫 자리 — 층 가장자리에서 책상이 가장 많이 보이는 곳(같으면 아래쪽 가운데에 가까운 곳) · 그 책상들을 바라본다(정본 §2)
 */
export function homeWalk(floor) {
  const b3 = toWorld(boundsOf(floor)), solids = solidsOf(floor), blocked = blockedBy(solids);
  const cs = floor.desks.filter((d) => d.kind === 'desk').map((d) => centerOf(rectOf(d)));
  const list = cs.length ? cs : floor.desks.map((d) => centerOf(rectOf(d)));
  const mid = (b3.x0 + b3.x1) / 2;
  let best = null;
  for (let i = 0; i <= 12; i++) {
    [[b3.x0 + 1 + ((b3.x1 - b3.x0 - 2) * i) / 12, b3.z1 - 1], [b3.x0 + 1, b3.z0 + 1 + ((b3.z1 - b3.z0 - 2) * i) / 12], [b3.x1 - 1, b3.z0 + 1 + ((b3.z1 - b3.z0 - 2) * i) / 12]].forEach(([x, z]) => {
      if (solids.some((r) => within([r[0] - 0.4, r[1] - 0.4, r[2] + 0.4, r[3] + 0.4], x, z)) || list.some((c) => Math.hypot(c[0] - x, c[2] - z) < 1.2)) return;
      const seen = list.filter((c) => !blocked(x, z, c[0], c[2]));
      const score = seen.length - (Math.abs(x - mid) + (b3.z1 - z)) * 0.01;
      if (!best || score > best.score) best = { x, z, seen, score };
    });
  }
  if (!best) return { e: [mid, 1.6, b3.z1 - 1.2], yaw: 0, pitch: -0.06 };
  const k = Math.max(1, best.seen.length);
  const gx = best.seen.reduce((a, c) => a + c[0], 0) / k, gz = best.seen.reduce((a, c) => a + c[2], 0) / k;
  return { e: [best.x, 1.6, best.z], yaw: best.seen.length ? Math.atan2(best.x - gx, best.z - gz) : 0, pitch: -0.06 };
}

export const VS = 'attribute vec3 p;attribute vec3 n;attribute vec4 c;uniform mat4 m;varying vec4 v;void main(){gl_Position=m*vec4(p,1.);float l=.76+.24*max(dot(n,normalize(vec3(.45,.85,.35))),0.)+.07*max(dot(n,normalize(vec3(-.6,.2,-.7))),0.);v=vec4(c.rgb*l,c.a);}';
export const FS = 'precision mediump float;varying vec4 v;void main(){gl_FragColor=vec4(v.rgb*v.a,v.a);}';

/** 이 기기가 WebGL 을 그릴 수 있나 — 못 그리면 평면 2D 로 연다(정본 §2) */
export function canDraw3d() {
  try {
    if (typeof document === 'undefined') return false;
    const c = document.createElement('canvas');
    return !!(c.getContext && c.getContext('webgl'));
  } catch {
    return false;
  }
}
