/**
 * 스쿼드 «한눈에» · 조직도 «입체» — 사람을 기둥으로 세운 2.5D 무대 (pivit-work PW-2616 · 기획 screen-org-chart-squad.policy.md
 * §5-7 v3.49 «임시 적용»). 디자이너 존의 다듬기 안(PW-2614)이 오기 전까지 PW-2616 첨부 시안(mock.html)대로 그린다.
 *
 * - 기둥 높이 = 그 배정의 개인 캐파 사용. 겸임이면 조직도 쪽은 조각이 쌓인 한 기둥, 스쿼드 쪽은 조각마다 한 기둥.
 * - 리드(스쿼드)·조직장(조직도) = 고리 두른 원기둥 + 알약 이름표. 판 맨 앞에 선다.
 * - 판 앞 막대 = 주 프로젝트 진행률 · 트라이브·그룹(스쿼드 계층)은 받침 단 · 조직도 쪽 받침은 회사 바로 아래 조직.
 * - 찾기(초성) · 살펴보기 단추 · 직군 거르기 · 남의 기둥 = 정보 고정 · 내 기둥 = 내 캐파 창(onOpenMine) · 판·받침 = 다가가며 요약.
 *
 * 디자이너 원본이 없다 — 요약 카드는 디자이너 스쿼드 카드 값(제목 20 · 색 상자 20 · 여백 24 · 모서리 16 · 막대 12),
 * 과부하 띠·LEAD 태그·검색칸·확대 단추는 같은 탭의 디자이너 부품을 쓴다. 재생 중에는 기둥 자리를 rAF 로 직접 옮긴다.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Button from '../shared/Button.jsx';
import SearchInput from '../shared/SearchInput.jsx';
import { CloseGlyph, MinusGlyph, PlusGlyph } from '../shared/lineIcons.jsx';
import { isEnterKey } from '../shared/enterKey.js';
import { useOrgLabels } from './orgchart-labels.jsx';
import { LeadTag, WarningIcon } from './squadIcons.jsx';
import {
  PILLAR,
  PILLAR_CHIPS,
  PILLAR_FAMILIES,
  PILLAR_FAMILY_COLOR,
  PILLAR_MIN_NAME_PX,
  PILLAR_OVER,
  PILLAR_ZOOM_MAX,
  PILLAR_ZOOM_MIN,
  flattenNodes,
  layoutTags,
  mixWhite,
  normQuery,
  pillarHit,
  pillarIso,
  pillarModel,
  pillarPts,
  pillarViewBox,
  shadeDark,
  squadPeriod,
} from './squadPillarLayout.js';

const { half: HALF, rad: RAD } = PILLAR;
const RX = RAD * 1.2247; const RY = RAD * 0.7071;
const ALERT_D = 'M12.8126 1.66837C12.2953 1.43834 11.7047 1.43834 11.1874 1.66837C10.7878 1.84602 10.5283 2.15894 10.3477 2.41391C10.1701 2.66461 9.98004 2.99303 9.77096 3.35422L1.50381 17.6339C1.2939 17.9964 1.10315 18.3258 0.973806 18.6054C0.842356 18.8895 0.699752 19.2714 0.745201 19.7074C0.804012 20.2715 1.09955 20.7841 1.55827 21.1176C1.91276 21.3753 2.31476 21.4433 2.62652 21.4719C2.93327 21.5 3.31392 21.5 3.73281 21.5H20.2671C20.686 21.5 21.0667 21.5 21.3734 21.4719C21.6852 21.4433 22.0872 21.3753 22.4417 21.1176C22.9004 20.7841 23.1959 20.2715 23.2547 19.7074C23.3002 19.2714 23.1576 18.8895 23.0261 18.6054C22.8968 18.3258 22.7061 17.9964 22.4962 17.6339L14.229 3.35419C14.0199 2.99301 13.8298 2.66459 13.6522 2.41391C13.4716 2.15894 13.2121 1.84602 12.8126 1.66837ZM13 9C13 8.44772 12.5523 8 12 8C11.4477 8 11 8.44772 11 9V13C11 13.5523 11.4477 14 12 14C12.5523 14 13 13.5523 13 13V9ZM12 16C11.4477 16 11 16.4477 11 17C11 17.5523 11.4477 18 12 18H12.01C12.5623 18 13.01 17.5523 13.01 17C13.01 16.4477 12.5623 16 12.01 16H12Z';
/** 무대 색 — 토큰만 쓴다. SVG 속성은 var() 를 풀지 못해 모두 style 로 칠한다. */
const C = {
  ink: 'var(--text-primary)', sub: 'var(--text-tertiary)', muted: 'var(--text-quaternary)', paper: 'var(--bg-primary)',
  line: 'var(--border-primary)', err: 'var(--text-error-primary)', errLine: 'var(--utility-error-500)', hatch: 'var(--utility-error-200)',
  brand: 'var(--utility-brand-700)', brandSoft: 'var(--bg-brand-primary)', warn: 'var(--utility-warning-600)',
  side: 'var(--utility-gray-200)', sideDark: 'var(--utility-gray-400)', groupTop: 'var(--bg-secondary)', gray: 'var(--utility-gray-500)',
};
const MAX_TAG_SCALE = 1.45;
/**
 * 내 캐파 창을 열 때 내 기둥 윗끝을 둘 자리(화면 위에서 px). 기둥 위 이름표(약 50px)까지 고정 머리글(아래끝 약 160) 밑으로
 * 들어가지 않고, 창(약 560px)이 기둥 아래에 들어갈 만큼 위다 — 200 이면 이름표 윗줄이 머리글에 가렸다(브라우저 확인 12).
 */
const MINE_TOP = 250;
/** 이보다 기둥이 많으면 재생하지 않는다 — 움직임이 끊긴다(PW-2607 과 같은 값 · 개발이 정함). */
const PLAY_MAX = 500;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
const famOf = (p) => (PILLAR_FAMILIES.includes(p?.jobFamilyGroup) ? p.jobFamilyGroup : 'none');
const colorOf = (p) => PILLAR_FAMILY_COLOR[famOf(p)];
const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const at = (tk, side) => (side === 'squad' ? tk.S : tk.O);
const translate = (x, y, z) => {
  const [sx, sy] = pillarIso(x, y, z);
  return `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`;
};

/** 둥근 판 윗면 */
function roundPath(x, y, w, d, r, z) {
  const P = [];
  const arc = (cx, cy, a0) => {
    for (let i = 0; i <= 5; i++) {
      const a = a0 + (i / 5) * (Math.PI / 2);
      P.push(pillarIso(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z));
    }
  };
  arc(x + r, y + r, Math.PI); arc(x + w - r, y + r, -Math.PI / 2); arc(x + w - r, y + d - r, 0); arc(x + r, y + d - r, Math.PI / 2);
  return `M${P.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L')}Z`;
}
const faceFront = (x0, x1, y, z, h) => pillarPts([[x0, y, z], [x1, y, z], [x1, y, z - h], [x0, y, z - h]]);
const faceRight = (x, y0, y1, z, h) => pillarPts([[x, y1, z], [x, y0, z], [x, y0, z - h], [x, y1, z - h]]);

/** 판·받침 — 두께 · 오른쪽 면 · 앞 띠(스쿼드 = 주 프로젝트 진행률, 받침 = 색) · 윗면 */
function Plate({ n }) {
  const isStep = n.kind !== 'plate';
  const r = isStep ? 12 : 7;
  const c = n.squad?.color || n.color || (n.family ? PILLAR_FAMILY_COLOR[n.family] : null);
  const topFill = n.dashed ? 'transparent' : isStep ? (n.kind === 'group' ? C.groupTop : mixWhite(c, 9)) : (c && n.squad ? mixWhite(c, 11) : C.paper);
  const side = n.kind === 'group' ? mixWhite(C.sideDark, 60) : C.side;
  const dark = n.kind === 'group' ? C.sideDark : mixWhite(C.sideDark, 70);
  const x0 = n.ax + 7; const x1 = n.ax + n.w - 7; const y = n.ay + n.d; const W = x1 - x0;
  const layers = [];
  if (!n.dashed) for (let k = n.t; k > 0; k -= 1.5) layers.push(k);
  let band = null;
  if (!n.dashed) {
    if (n.squad) {
      const pj = n.info?.project;
      const pct = pj ? Math.max(0, Math.min(100, Number(pj.progress) || 0)) : 0;
      band = (
        <>
          <polygon points={faceFront(x0, x1, y, n.top, n.t)} style={{ fill: mixWhite(pj ? c : C.sub, 16) }} />
          {pj && pct > 0 && <polygon data-pillar-progress={n.squad.id} points={faceFront(x0, x0 + (W * pct) / 100, y, n.top, n.t)} style={{ fill: mixWhite(c, 92) }} />}
        </>
      );
    } else if (c) {
      band = <polygon points={faceFront(x0, x1, y, n.top, n.t)} style={{ fill: mixWhite(c, n.kind === 'group' ? 48 : 62) }} />;
    } else {
      band = <polygon points={faceFront(x0, x1, y, n.top, n.t)} style={{ fill: C.line }} />;
    }
  }
  return (
    <>
      {layers.map((k) => <path key={k} d={roundPath(n.ax, n.ay, n.w, n.d, r, n.top - k)} style={{ fill: side }} />)}
      {!n.dashed && <polygon points={faceRight(n.ax + n.w, n.ay + r, n.ay + n.d - r, n.top, n.t)} style={{ fill: dark }} />}
      {band}
      <path
        d={roundPath(n.ax, n.ay, n.w, n.d, r, n.top)}
        style={{ fill: topFill, stroke: n.dashed ? C.muted : 'var(--alpha-white-90)' }}
        strokeWidth={1}
        strokeDasharray={n.dashed ? '5 4' : undefined}
      />
    </>
  );
}

/** 판 밑 글자 — 이름만(스쿼드는 색 상자 + 이름 · 받침은 층 이름 + 이름) */
function PlateLabel({ n, name }) {
  const [lx, ly] = pillarIso(n.ax + 2, n.ay + n.d, n.z);
  const tf = `matrix(${PILLAR.cos} ${PILLAR.sin} 0 1 ${lx.toFixed(1)} ${ly.toFixed(1)})`;
  const halo = { paintOrder: 'stroke', stroke: 'var(--alpha-white-90)', strokeWidth: 3.5, strokeLinejoin: 'round' };
  let body;
  if (n.squad) {
    body = (
      <>
        <rect x={2} y={n.t + 7} width={9} height={9} rx={2} style={{ fill: n.squad.color }} />
        <text x={16} y={n.t + 18} fontSize={15} fontWeight={700} style={{ ...halo, fill: C.ink }}>{name}</text>
      </>
    );
  } else if (n.kind === 'plate') {
    body = <text x={2} y={n.t + 17} fontSize={14} fontWeight={700} style={{ ...halo, fill: n.team ? C.ink : C.sub }}>{name}</text>;
  } else {
    const big = n.kind === 'group' ? 17 : n.kind === 'div' ? 16 : 15;
    body = (
      <text x={2} y={n.t + 20} fontSize={big} fontWeight={700} style={{ ...halo, fill: C.ink }}>
        {n.layer && <tspan fontSize={12} fontWeight={600} style={{ fill: shadeDark(n.color, 75) }}>{`${n.layer} `}</tspan>}
        {name}
      </text>
    );
  }
  return <g transform={tf} pointerEvents="none" data-pillar-label={n.id}>{body}</g>;
}

/** 기둥 하나(조각 하나). side = 그 기둥이 그려지는 쪽의 모양 */
function Pillar({ tk, side, gradId, hatchId, unsetOn }) {
  const p = tk.x.person;
  const c = colorOf(p);
  const { a, h } = tk;
  const isCyl = side === 'squad' ? tk.lead : tk.head;
  const ring = <ellipse cx={0} cy={0} rx={RX + 5} ry={RY + 3} strokeWidth={1.6} style={{ fill: C.paper, stroke: C.ink }} />;
  if (!a && side === 'org' && tk.head) {
    return <>{ring}<ellipse cx={0} cy={-2} rx={RX} ry={RY} style={{ fill: mixWhite(c, 34) }} /></>;
  }
  if (!a) {
    const s = 7;
    return <polygon points={pillarPts([[-s, -s, h], [s, -s, h], [s, s, h], [-s, s, h]])} opacity={0.85} style={{ fill: mixWhite(c, 22) }} />;
  }
  const unset = unsetOn && a.unset;
  const dash = unset ? { fillOpacity: 0.18, stroke: mixWhite(c, 70), strokeWidth: 1, strokeDasharray: '3 2.5' } : null;
  const len = h * 0.42;
  const out = [];
  if (isCyl && (side === 'squad' || tk.bottom)) out.push(<g key="ring">{ring}</g>);
  out.push(<polygon key="sh" points={pillarPts([[HALF, -HALF, 0], [HALF + len, -HALF + len * 0.15, 0], [HALF + len, HALF + len * 0.15, 0], [HALF, HALF, 0]])} style={{ fill: 'var(--alpha-black-5)' }} />);
  if (isCyl) {
    const ty = -h;
    out.push(<path key="b" d={`M${-RX} ${ty}L${-RX} 0A${RX} ${RY} 0 0 0 ${RX} 0L${RX} ${ty}Z`} fill={`url(#${gradId}-${famOf(p)})`} style={dash || undefined} />);
    out.push(<ellipse key="t" cx={0} cy={ty} rx={RX} ry={RY} strokeWidth={0.8} style={{ fill: mixWhite(c, 34), stroke: 'var(--alpha-white-80)', ...dash }} />);
  } else {
    out.push(<polygon key="f" points={pillarPts([[-HALF, HALF, h], [HALF, HALF, h], [HALF, HALF, 0], [-HALF, HALF, 0]])} style={{ fill: mixWhite(c, 66), ...dash }} />);
    out.push(<polygon key="s" points={pillarPts([[HALF, HALF, h], [HALF, -HALF, h], [HALF, -HALF, 0], [HALF, HALF, 0]])} style={{ fill: mixWhite(c, 92), ...dash }} />);
    out.push(<polygon key="t" points={pillarPts([[-HALF, -HALF, h], [HALF, -HALF, h], [HALF, HALF, h], [-HALF, HALF, h]])} strokeWidth={0.8} style={{ fill: mixWhite(c, 30), stroke: 'var(--alpha-white-80)', ...dash }} />);
  }
  if (side === 'squad' && tk.multi > 1) {
    for (let i = 0; i < tk.multi; i++) {
      out.push(<circle key={`d${i}`} data-pillar-dot cx={(i - (tk.multi - 1) / 2) * 6} cy={-h} r={2} strokeWidth={0.7} style={{ fill: C.paper, stroke: shadeDark(c, 70) }} />);
    }
  }
  if (tk.x.total > PILLAR_OVER) {
    const L100 = PILLAR_OVER * PILLAR.heightPerPct;
    const off = side === 'org' ? tk.off : 0;
    const lo = Math.max(0, L100 - off);
    // 빗금·눈금은 기둥에서 100을 넘은 부분에만. 스쿼드 쪽 조각은 그 자리 높이로는 100을 넘지 않으면 아이콘만 남는다
    if (h > lo) {
      if (isCyl) {
        out.push(<path key="hc" data-pillar-hatch d={`M${-RX} ${-h}L${-RX} ${-lo}A${RX} ${RY} 0 0 0 ${RX} ${-lo}L${RX} ${-h}A${RX} ${RY} 0 0 1 ${-RX} ${-h}Z`} fill={`url(#${hatchId})`} />);
        if (off < L100) out.push(<path key="mk" data-pillar-mark d={`M${-RX} ${-lo}A${RX} ${RY} 0 0 0 ${RX} ${-lo}`} fill="none" strokeWidth={1.6} style={{ stroke: C.errLine }} />);
      } else {
        out.push(<polygon key="h1" data-pillar-hatch points={pillarPts([[-HALF, HALF, h], [HALF, HALF, h], [HALF, HALF, lo], [-HALF, HALF, lo]])} fill={`url(#${hatchId})`} />);
        out.push(<polygon key="h2" points={pillarPts([[HALF, HALF, h], [HALF, -HALF, h], [HALF, -HALF, lo], [HALF, HALF, lo]])} fill={`url(#${hatchId})`} />);
        if (off < L100) out.push(<polyline key="mk" data-pillar-mark points={pillarPts([[-HALF, HALF, lo], [HALF, HALF, lo], [HALF, -HALF, lo]])} fill="none" strokeWidth={1.6} style={{ stroke: C.errLine }} />);
      }
    }
    // 조직도 쪽은 한 사람이 조각으로 쌓이므로 꼭대기 조각에만 단다
    if (side === 'squad' || tk.top) {
      out.push(<path key="al" data-pillar-alert transform={`translate(-7 ${-h - 20}) scale(.5833)`} fillRule="evenodd" clipRule="evenodd" strokeWidth={3} paintOrder="stroke" d={ALERT_D} style={{ fill: C.err, stroke: C.paper }} />);
    }
  }
  return <>{out}</>;
}

/** 이름표 — 리드 = LEAD 알약 · 조직장 = «이름 · 팀장» 알약 · 나 = 초록 테두리 두 줄 · 그 밖 = 이름만 */
function Tag({ tk, side, name, mine, L }) {
  const p = tk.x;
  const lift = tk.a && p.total > PILLAR_OVER ? 20 : 0;
  if (side === 'squad' && mine) {
    const w = Math.max([...name].length + 2, 7) * 11 + 24;
    const y = -10 - lift;
    const unset = tk.a.unset;
    const sub = unset ? L('squad.pillar.mineUnset') : L('squad.pillar.minePct', { pct: tk.a.capa });
    return (
      <g data-pillar-mine-tag>
        <rect x={-w / 2} y={y - 32} width={w} height={34} rx={8} strokeWidth={1.6} strokeDasharray={unset ? '4 3' : undefined} style={{ fill: C.brandSoft, stroke: C.brand }} />
        <text x={0} y={y - 18} textAnchor="middle" fontSize={11.5} fontWeight={700} style={{ fill: C.ink }}>{L('squad.pillar.mineName', { name })}</text>
        <text x={0} y={y - 4} textAnchor="middle" fontSize={10.5} fontWeight={600} style={{ fill: unset ? C.warn : C.brand }}>{sub}</text>
      </g>
    );
  }
  const lead = side === 'squad' ? tk.lead : tk.head;
  if (lead) {
    const y = -10 - lift;
    if (side === 'squad') {
      const w = [...name].length * 11.5 + 44; const x0 = -w / 2;
      return (
        <g>
          <rect x={x0} y={y - 15} width={w} height={22} rx={8} style={{ fill: C.paper, stroke: C.line }} />
          <rect x={x0 + 6} y={y - 10.5} width={27} height={13} rx={3} style={{ fill: 'var(--alpha-black-40)' }} />
          <text x={x0 + 19.5} y={y - 1} textAnchor="middle" fontSize={7.5} fontWeight={700} letterSpacing={0.6} style={{ fill: C.paper }}>LEAD</text>
          <text x={x0 + 38} y={y + 0.5} fontSize={11.5} fontWeight={600} style={{ fill: C.ink }}>{name}</text>
        </g>
      );
    }
    const label = L('squad.pillar.headName', { name });
    const w = [...label].length * 11.5 + 12;
    return (
      <g>
        <rect x={-w / 2} y={y - 15} width={w} height={22} rx={8} style={{ fill: C.paper, stroke: C.line }} />
        <text x={0} y={y + 0.5} textAnchor="middle" fontSize={11.5} fontWeight={600} style={{ fill: C.ink }}>{label}</text>
      </g>
    );
  }
  return (
    <text x={0} y={-5 - lift} textAnchor="middle" fontSize={10} fontWeight={600}
      paintOrder="stroke" strokeWidth={2.6} strokeLinejoin="round" style={{ fill: tk.a ? C.ink : C.sub, stroke: 'var(--alpha-white-90)' }}>{name}</text>
  );
}

/** 범례 작은 기둥 */
function Mini({ h, c, cyl, dash, dots, warn }) {
  const w = 34; const H = h + 22; const ox = 17; const oy = h + 12; const s = 7;
  const q = (x, y, z) => { const [a, b] = pillarIso(x, y, z); return `${(a + ox).toFixed(1)},${(b + oy).toFixed(1)}`; };
  const f = (arr) => arr.map((v) => q(...v)).join(' ');
  const d = dash ? { fillOpacity: 0.18, stroke: mixWhite(c, 70), strokeDasharray: '3 2.5' } : null;
  return (
    <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} aria-hidden>
      {cyl ? (
        <>
          <path d={`M${ox - 10} ${oy - h}L${ox - 10} ${oy}A10 5.8 0 0 0 ${ox + 10} ${oy}L${ox + 10} ${oy - h}Z`} style={{ fill: mixWhite(c, 74) }} />
          <ellipse cx={ox} cy={oy - h} rx={10} ry={5.8} style={{ fill: mixWhite(c, 34) }} />
        </>
      ) : (
        <>
          <polygon points={f([[-s, s, h], [s, s, h], [s, s, 0], [-s, s, 0]])} style={{ fill: mixWhite(c, 66), ...d }} />
          <polygon points={f([[s, s, h], [s, -s, h], [s, -s, 0], [s, s, 0]])} style={{ fill: mixWhite(c, 92), ...d }} />
          <polygon points={f([[-s, -s, h], [s, -s, h], [s, s, h], [-s, s, h]])} style={{ fill: mixWhite(c, 30), ...d }} />
        </>
      )}
      {dots && [-3.5, 3.5].map((dx) => <circle key={dx} cx={ox + dx} cy={oy - h} r={2} strokeWidth={0.7} style={{ fill: C.paper, stroke: shadeDark(c, 70) }} />)}
      {warn && <path transform={`translate(${ox - 6} ${oy - h - 16}) scale(.5)`} fillRule="evenodd" clipRule="evenodd" d={ALERT_D} style={{ fill: C.err }} />}
    </svg>
  );
}

/**
 * @param {'squad'|'org'} side  그리는 쪽(재생이 끝난 뒤의 쪽)
 * @param {'squad'|'org'|null} playFrom  이 쪽에서 출발해 side 로 날아간다. 없으면 바로 그린다
 * @param {boolean} overlay  조직도로 돌아가는 덮개 — 끝나면 onDone
 * @param {(arg: { squadId, userId, rect, selector }) => void} onOpenMine  내 기둥(스쿼드 쪽) 누름 → 내 캐파 창
 * @param {(person) => void} onOpenProfile  고정한 사람 정보의 [프로필 보기]
 * @param {{ squadId: string, n: number } | null} focusMine  「내 캐파」 배너 — 그 스쿼드의 내 기둥으로 옮겨 가 창을 연다
 */
export default function SquadPillarStage({
  side, playFrom = null, overlay = false,
  squads, people, orgUnits = [], groupLevelNames = [], squadGroups = [],
  currentUserId = null, onOpenMine, onOpenProfile, onDone, focusMine = null,
}) {
  const L = useOrgLabels();
  const uid = useId().replace(/:/g, '');
  const gradId = `pl-cyl-${uid}`; const hatchId = `pl-hatch-${uid}`;
  const model = useMemo(
    () => pillarModel({ squads, people, orgUnits, groupLevelNames, squadGroups }),
    [squads, people, orgUnits, groupLevelNames, squadGroups],
  );
  const [canPlay] = useState(() => !!playFrom && playFrom !== side && !prefersReducedMotion() && model.tokens.length <= PLAY_MAX);
  const [view, setView] = useState(canPlay ? playFrom : side);
  const [playing, setPlaying] = useState(canPlay);
  const [platesUp, setPlatesUp] = useState(canPlay ? playFrom : side);
  const [zoom, setZoom] = useState(null);
  const [hov, setHov] = useState(null);
  const [sel, setSel] = useState(null); // { type: 'person'|'node', id }
  const [q, setQ] = useState('');
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultOn, setResultOn] = useState(0);
  const [chip, setChip] = useState(null);
  const [fam, setFam] = useState(null);
  const [box, setBox] = useState({ w: 1000, h: 640 });
  const svgRef = useRef(null);
  const scrollRef = useRef(null);
  const cardRef = useRef(null);
  const dockRef = useRef(null);
  const qRef = useRef(null);
  const drag = useRef(null);
  const flyRef = useRef(0);
  const recenter = useRef(true);
  const runRef = useRef({ raf: 0, timers: [] });
  const onDoneRef = useRef(onDone);
  useLayoutEffect(() => { onDoneRef.current = onDone; });
  const today = useMemo(localToday, []);

  const { tokens, personById } = model;
  const tree = view === 'squad' ? model.sTree : model.oTree;
  const nodes = useMemo(() => flattenNodes(tree), [tree]);
  const VB = useMemo(() => pillarViewBox(tree), [tree]);
  const fitZoom = Math.min(1.5, Math.max(PILLAR_ZOOM_MIN, Math.min((box.w - 8) / VB.w, (box.h - 8) / VB.h)));
  const z = zoom == null ? fitZoom : zoom;
  const k = Math.min(MAX_TAG_SCALE, Math.max(1, 0.95 / z));
  const far = z * k * 10 < PILLAR_MIN_NAME_PX;

  const nameOf = useCallback((x) => x?.person?.name || L('squad.unknownMember'), [L]);
  const isMine = useCallback((tk) => !!currentUserId && tk.x.id === currentUserId && !!tk.a, [currentUserId]);
  const unitName = useCallback((t) => (t?.kind === 'unit' ? t.name : L(`list.unit.${t?.kind === 'ceo' || t?.kind === 'ceoDirect' ? t.kind : 'unassigned'}`)), [L]);
  const nodeName = (n) => (n.dashed ? L('squad.iso.noSquad') : n.team ? unitName(n.team) : n.name);
  const famName = (f) => L(`squad.iso.family.${f}`);

  // 판 크기를 잰다 — «맞춤» 배율의 바탕
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const measure = () => setBox((b) => (b.w === el.clientWidth && b.h === el.clientHeight ? b : { w: el.clientWidth || 1000, h: el.clientHeight || 640 }));
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // 배율을 단추·키·맞춤으로 바꾸면 가운데로 — 휠·다가가기는 스스로 자리를 잡는다
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || !recenter.current) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
  });
  const setZoomCentered = (v) => { flyRef.current++; recenter.current = true; setZoom(v); };

  // ── 재생: 기둥이 떠올라 포물선으로 날아 도착 판에 내려앉는다 ──
  const finish = useCallback(() => {
    const r = runRef.current;
    cancelAnimationFrame(r.raf);
    r.timers.forEach(clearTimeout);
    r.timers = [];
    const svg = svgRef.current;
    svg?.querySelectorAll('[data-pillar-key]').forEach((el) => {
      const tk = tokens.find((t) => t.key === el.getAttribute('data-pillar-key'));
      if (tk) { const p = at(tk, side); el.setAttribute('transform', translate(p.x, p.y, p.z)); }
    });
    recenter.current = true;
    setView(side); setPlatesUp(side); setPlaying(false);
    if (overlay) r.timers.push(setTimeout(() => onDoneRef.current?.(), 350));
    else onDoneRef.current?.();
  }, [tokens, side, overlay]);

  useLayoutEffect(() => {
    if (!canPlay) {
      if (overlay) onDoneRef.current?.();
      return undefined;
    }
    const r = runRef.current;
    const svg = svgRef.current;
    const from = playFrom;
    const ord = [...tokens].sort((a, b) => (at(a, side).x + at(a, side).y) - (at(b, side).x + at(b, side).y) || at(a, side).z - at(b, side).z);
    const n = ord.length || 1;
    const els = new Map([...(svg?.querySelectorAll('[data-pillar-key]') ?? [])].map((el) => [el.getAttribute('data-pillar-key'), el]));
    const items = ord.map((t, i) => ({ t, a: at(t, from), b: at(t, side), s1: i * (260 / n), s2: 640 + i * (380 / n) }));
    const vb0 = pillarViewBox(from === 'squad' ? model.sTree : model.oTree);
    const vb1 = pillarViewBox(side === 'squad' ? model.sTree : model.oTree);
    const lift = 26;
    r.timers.push(setTimeout(() => setPlatesUp(side), 620));
    let t0 = 0;
    const step = (now) => {
      if (!t0) t0 = now;
      const el = now - t0;
      let busy = false;
      const ve = easeInOut(clamp01(el / 1500));
      svg?.setAttribute('viewBox', [vb0.x + (vb1.x - vb0.x) * ve, vb0.y + (vb1.y - vb0.y) * ve, vb0.w + (vb1.w - vb0.w) * ve, vb0.h + (vb1.h - vb0.h) * ve].map((v) => v.toFixed(0)).join(' '));
      items.forEach(({ t, a, b, s1, s2 }) => {
        let x = a.x; let y = a.y; let zz;
        if (el < s2) { zz = a.z + lift * easeOut(clamp01((el - s1) / 340)); busy = true; } else {
          const e = easeInOut(clamp01((el - s2) / 760));
          if (e < 1) busy = true;
          x = a.x + (b.x - a.x) * e; y = a.y + (b.y - a.y) * e;
          zz = (a.z + lift) * (1 - e) + b.z * e + Math.sin(Math.PI * e) * (22 + Math.hypot(b.x - a.x, b.y - a.y) * 0.08);
        }
        els.get(t.key)?.setAttribute('transform', translate(x, y, zz));
      });
      if (busy) r.raf = requestAnimationFrame(step);
      else finish();
    };
    r.raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(r.raf); r.timers.forEach(clearTimeout); };
    // 한 번만 돈다 — 다시 재생은 부모가 key 를 바꿔 새로 띄운다
  }, []);

  // ── 찍은 곳으로 카메라가 다가간다. 휠·끌기를 하면 바로 멈춘다 ──
  const flyTo = useCallback((wx0, wy0, wx1, wy1, maxZ, then) => {
    const el = scrollRef.current; const svg = svgRef.current;
    if (!el || !svg) { then?.(); return; }
    const id = ++flyRef.current;
    const m = 90;
    const pad = dockRef.current && !dockRef.current.hidden ? 364 : 0;
    const target = Math.max(PILLAR_ZOOM_MIN, Math.min(maxZ, (el.clientWidth - pad - m * 2) / Math.max(1, wx1 - wx0), (el.clientHeight - m * 2) / Math.max(1, wy1 - wy0)));
    const z0 = z; const cx = (wx0 + wx1) / 2; const cy = (wy0 + wy1) / 2;
    const a = svg.getBoundingClientRect(); const b = el.getBoundingClientRect();
    const c0x = VB.x + (b.left + (b.width + pad) / 2 - a.left) / z0;
    const c0y = VB.y + (b.top + b.height / 2 - a.top) / z0;
    const T = prefersReducedMotion() ? 1 : 460;
    const t0 = performance.now();
    recenter.current = false;
    const frame = (now) => {
      if (id !== flyRef.current) return;
      const u = Math.min(1, (now - t0) / T); const e = 1 - (1 - u) ** 3; const zz = z0 + (target - z0) * e;
      setZoom(zz);
      // 배율을 바꾼 그림이 그려진 다음에 옮긴다
      requestAnimationFrame(() => {
        if (id !== flyRef.current && u < 1) return;
        el.scrollLeft = (c0x + (cx - c0x) * e - VB.x) * zz - (el.clientWidth + pad) / 2;
        el.scrollTop = (c0y + (cy - c0y) * e - VB.y) * zz - el.clientHeight / 2;
        if (u >= 1) then?.();
      });
      if (u < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [z, VB]);

  const tokenTopOnScreen = (tk) => { const qq = at(tk, view); return pillarIso(qq.x, qq.y, qq.z + tk.h / 2); };
  const selectPerson = (pid) => {
    setSel({ type: 'person', id: pid }); setHov(null); hideCard();
    const ts = tokens.filter((t) => t.x.id === pid && (view === 'squad' || t.top)).map(tokenTopOnScreen);
    if (!ts.length) return;
    const X = ts.map((v) => v[0]); const Y = ts.map((v) => v[1]);
    flyTo(Math.min(...X) - 60, Math.min(...Y) - 80, Math.max(...X) + 60, Math.max(...Y) + 60, 1.6);
  };
  const selectNode = (id) => {
    const n = nodes.find((x) => x.id === id);
    if (!n) return;
    setSel({ type: 'node', id }); setHov(null); hideCard();
    const c = [[n.ax, n.ay, n.top + 70], [n.ax + n.w, n.ay, n.top], [n.ax, n.ay + n.d + PILLAR.lane, n.z], [n.ax + n.w, n.ay + n.d + PILLAR.lane, n.z]].map((v) => pillarIso(...v));
    const X = c.map((v) => v[0]); const Y = c.map((v) => v[1]);
    flyTo(Math.min(...X), Math.min(...Y), Math.max(...X), Math.max(...Y), 2);
  };
  const clearAll = () => {
    setSel(null); setQ(''); setChip(null); setFam(null); setHov(null); setResultsOpen(false); hideCard();
    setZoomCentered(null);
  };

  // 「내 캐파」 배너 — 그 스쿼드의 내 기둥으로 옮겨 가 그 자리에서 창을 연다
  const openMine = useCallback((tk) => {
    const el = svgRef.current?.querySelector(`[data-pillar-key="${tk.key}"]`);
    if (!el || !onOpenMine) return;
    const selector = `[data-pillar-key="${tk.key}"]`;
    // 창이 기둥 바로 아래에 열리게 기둥을 화면 위쪽으로 올린다 — 창이 높아 아래 자리가 모자라면 위로 떠서 기둥을 덮는다(브라우저 확인 11·12)
    recenter.current = false;
    el.scrollIntoView?.({ block: 'start', inline: 'center' });
    // 맨 위로 올리면 위쪽 고정 머리글 밑에 깔린다 — 기둥 윗끝이 화면 위에서 MINE_TOP 아래에 오게 조상 스크롤을 되돌린다
    let need = el.getBoundingClientRect().top - MINE_TOP;
    for (let a = el.parentElement; a && need < 0; a = a.parentElement) {
      if (a.scrollHeight > a.clientHeight && /auto|scroll/.test(getComputedStyle(a).overflowY)) {
        const back = Math.min(a.scrollTop, -need);
        a.scrollTop -= back;
        need += back;
      }
    }
    if (need < 0) window.scrollBy?.(0, need);
    requestAnimationFrame(() => {
      onOpenMine({ squadId: tk.a.squadId, userId: tk.x.id, rect: el.getBoundingClientRect(), selector });
    });
  }, [onOpenMine]);
  const focusKey = focusMine ? `${focusMine.squadId}:${focusMine.n}` : null;
  useEffect(() => {
    if (!focusMine || playing || view !== 'squad' || !currentUserId) return;
    const tk = tokens.find((t) => t.x.id === currentUserId && t.a?.squadId === focusMine.squadId);
    if (!tk) return;
    const [x, y] = tokenTopOnScreen(tk);
    flyTo(x - 160, y - 120, x + 160, y + 160, 1.4, () => openMine(tk));
    // focusKey 가 바뀔 때만 — 같은 요청을 두 번 열지 않는다
  }, [focusKey, playing, view]);

  // ── 찾기·살펴보기·직군 거르기 ──
  const hay = (x) => {
    const p = x.person;
    return [p.name, p.unitName, p.businessTitle, famName(famOf(p)),
      ...x.as.flatMap((a) => [a.squad.name, ...(a.squad.projects || []).map((pj) => pj.name), groupNameOf(a.squad)])].filter(Boolean).join(' ');
  };
  const groupNameOf = (sq) => (sq.groupId ? squadGroups.find((g) => g.id === sq.groupId)?.name || '' : '');
  const nq = normQuery(q);
  const chipFn = chip ? PILLAR_CHIPS.find((c) => c[0] === chip)[1] : null;
  const passFilters = (x) => (!nq || pillarHit(hay(x), nq)) && (!chipFn || chipFn(x)) && (!fam || famOf(x.person) === fam);
  const plateIdOf = (t) => (view === 'squad' ? t.squadPlateId : t.orgPlateId);
  const matcher = (() => {
    const pid = hov || (sel?.type === 'person' ? sel.id : null);
    if (pid) return (t) => t.x.id === pid;
    if (sel?.type === 'node') {
      const n = nodes.find((x) => x.id === sel.id);
      if (n) { const ids = new Set(flattenNodes(n).filter((x) => x.kind === 'plate').map((x) => x.id)); return (t) => ids.has(plateIdOf(t)); }
    }
    if (nq || chip || fam) return (t) => passFilters(t.x);
    return null;
  })();

  const results = useMemo(() => {
    if (!nq) return [];
    const ps = model.persons.filter((x) => pillarHit(hay(x), nq))
      .sort((a, b) => pillarHit(b.person.name || '', nq) - pillarHit(a.person.name || '', nq)).slice(0, 8)
      .map((x) => ({
        type: 'person', id: x.id, title: nameOf(x),
        sub: [x.person.unitName || unitName({ kind: x.person.unitKind }), x.person.businessTitle,
          x.as.length ? x.as.map((a) => a.squad.name).join(', ') : L('squad.iso.noSquad')].filter(Boolean).join(' · '),
      }));
    const ns = nodes.filter((n) => pillarHit(nodeName(n), nq)).slice(0, 5).map((n) => ({
      type: 'node', id: n.id, title: nodeName(n),
      sub: n.squad ? L('squad.pillar.resultSquad', { count: n.people.length })
        : n.layer ? L('squad.pillar.resultLayer', { layer: n.layer, count: n.peopleCount })
          : n.kind === 'div' ? L('squad.pillar.resultDiv', { count: n.peopleCount })
            : L('squad.pillar.resultTeam', { count: n.people.length }),
    }));
    return [...ns, ...ps];
    // hay·이름 함수는 문구(L)·묶음에 따라서만 바뀐다
  }, [nq, model, nodes, L, squadGroups]);

  const pick = (r) => {
    setResultsOpen(false); setQ(''); qRef.current?.blur();
    if (r.type === 'person') selectPerson(r.id); else selectNode(r.id);
  };

  // ── 키 — / 찾기 · Esc 원래대로 · + − 0 배율 ──
  useEffect(() => {
    const onKey = (e) => {
      const ae = document.activeElement;
      const typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable);
      if (e.key === 'Escape' && (ae === qRef.current || !typing)) { clearAll(); qRef.current?.blur(); return; }
      if (typing || playing) return;
      if (e.key === '/') { e.preventDefault(); qRef.current?.focus(); } else if (e.key === '+' || e.key === '=') setZoomCentered(Math.min(z + 0.1, PILLAR_ZOOM_MAX));
      else if (e.key === '-') setZoomCentered(Math.max(z - 0.1, PILLAR_ZOOM_MIN));
      else if (e.key === '0') setZoomCentered(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ── 휠 = 확대·축소 — 마우스가 가리키는 자리가 그대로 남는다 ──
  const zRef = useRef(z); zRef.current = z;
  const playingRef = useRef(playing); playingRef.current = playing;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      if (playingRef.current) return;
      flyRef.current++;
      const unit = e.deltaMode === 1 ? 16 : 1; const rate = e.ctrlKey ? 0.01 : 0.0015;
      const next = Math.min(PILLAR_ZOOM_MAX, Math.max(PILLAR_ZOOM_MIN, zRef.current * Math.exp(-e.deltaY * unit * rate)));
      const svg = svgRef.current; if (!svg) return;
      const a = svg.getBoundingClientRect();
      const fx = (e.clientX - a.left) / a.width; const fy = (e.clientY - a.top) / a.height;
      recenter.current = false;
      setZoom(next);
      requestAnimationFrame(() => {
        const b = svg.getBoundingClientRect();
        el.scrollLeft += b.left + fx * b.width - e.clientX;
        el.scrollTop += b.top + fy * b.height - e.clientY;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ── 끌기 — 끌어서 옮긴 것은 누른 것으로 치지 않는다 ──
  const onDown = (e) => {
    const el = scrollRef.current;
    if (!el || e.button !== 0) return;
    flyRef.current++;
    drag.current = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop, moved: false };
  };
  const onMove = (e) => {
    const d = drag.current; const el = scrollRef.current;
    if (!d || !el) return;
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) { d.moved = true; hideCard(); }
    recenter.current = false;
    el.scrollLeft = d.sl - (e.clientX - d.x);
    el.scrollTop = d.st - (e.clientY - d.y);
  };
  const onUp = () => { setTimeout(() => { drag.current = null; }, 0); };

  // ── 마우스 올림 카드 — 매 움직임마다 화면 전체를 다시 그리지 않게 자리만 직접 옮긴다 ──
  function hideCard() { if (cardRef.current) cardRef.current.style.display = 'none'; }
  const moveCard = (e) => {
    const c = cardRef.current; if (!c) return;
    const w = 252;
    c.style.left = `${Math.min(e.clientX + 16, window.innerWidth - w - 12)}px`;
    c.style.top = `${Math.min(e.clientY + 14, window.innerHeight - c.offsetHeight - 12)}px`;
  };
  const tokenAt = (target) => {
    const key = target?.closest?.('[data-pillar-key]')?.getAttribute('data-pillar-key');
    return key ? tokens.find((t) => t.key === key) : null;
  };
  const onOver = (e) => {
    if (playing || drag.current?.moved) return;
    const tk = tokenAt(e.target);
    const pid = tk ? tk.x.id : null;
    if (pid !== hov) setHov(pid);
    if (tk && !(sel?.type === 'person' && sel.id === pid)) {
      if (cardRef.current) { cardRef.current.style.display = 'block'; moveCard(e); }
    } else hideCard();
  };
  const onLeave = () => { setHov(null); hideCard(); };
  const onClick = (e) => {
    if (drag.current?.moved || playing) return;
    const tk = tokenAt(e.target);
    if (tk) {
      if (view === 'squad' && isMine(tk) && onOpenMine) { openMine(tk); return; }
      selectPerson(tk.x.id);
      return;
    }
    const nd = e.target.closest?.('[data-pillar-node]')?.getAttribute('data-pillar-node');
    if (nd) selectNode(nd); else setSel(null);
  };
  const onKeyDown = (e) => {
    if (!isEnterKey(e) && e.key !== ' ') return;
    if (!e.target.closest?.('[data-pillar-key]')) return;
    e.preventDefault();
    onClick(e);
  };

  // ── 그리기 순서 ──
  const shapeSide = playing ? side : view;
  const drawn = useMemo(() => [...tokens].sort((a, b) => {
    const pa = at(a, shapeSide); const pb = at(b, shapeSide);
    return (pa.x + pa.y) - (pb.x + pb.y) || pa.z - pb.z;
  }), [tokens, shapeSide]);
  const tagList = useMemo(() => (view === 'squad' ? tokens : tokens.filter((t) => t.top)), [tokens, view]);
  const tagNameOf = useCallback((t) => nameOf(t.x), [nameOf]);
  const lifts = useMemo(() => layoutTags(tagList, view, k, tagNameOf, (t) => view === 'squad' && isMine(t)), [tagList, view, k, tagNameOf, isMine]);
  const tagsSorted = useMemo(() => [...tagList].sort((a, b) => (at(a, view).x + at(a, view).y) - (at(b, view).x + at(b, view).y)), [tagList, view]);

  const links = (() => {
    const pid = hov || (sel?.type === 'person' ? sel.id : null);
    if (!pid || view !== 'squad' || playing) return [];
    const tops = tokens.filter((t) => t.x.id === pid && t.a).map((t) => pillarIso(t.S.x, t.S.y, t.S.z + t.h));
    const out = [];
    for (let i = 1; i < tops.length; i++) {
      const [a, b] = tops[i - 1]; const [c, d] = tops[i]; const my = Math.min(b, d) - 46;
      out.push(`M${a} ${b}Q${(a + c) / 2} ${my} ${c} ${d}`);
    }
    return out;
  })();

  // ── 고정·요약 카드 ──
  const overList = model.persons.filter((x) => x.total > PILLAR_OVER);
  const hovPerson = hov ? personById.get(hov) : null;
  const personCard = (x, pinned) => <PersonCard x={x} L={L} nameOf={nameOf} unitName={unitName} famName={famName} mineHint={!pinned && view === 'squad' && x.id === currentUserId && x.as.length > 0} />;
  let dock = null;
  if (sel?.type === 'person') {
    const x = personById.get(sel.id);
    if (x) {
      dock = (
        <>
          {personCard(x, true)}
          {onOpenProfile && !x.person.unknown && (
            <div className="sq-pillar-dock-foot">
              <Button variant="secondary" size="sm" onClick={() => onOpenProfile(x.person)} data-testid="squad-pillar-profile">{L('squad.pillar.openProfile')}</Button>
            </div>
          )}
        </>
      );
    }
  } else if (sel?.type === 'node') {
    const n = nodes.find((x) => x.id === sel.id);
    if (n) dock = <NodeCard n={n} L={L} nameOf={nameOf} famName={famName} today={today} onGo={selectNode} unitName={unitName} />;
  }

  const chipCount = (fn) => model.persons.filter(fn).length;
  const atSquad = view === 'squad';
  const hasMine = !!currentUserId && tokens.some((t) => isMine(t));

  return (
    <div className={`sq-pillar${far ? ' is-far' : ''}`} data-testid="squad-pillar-stage" data-phase={playing ? 'play' : 'done'} data-side={view} data-zoom={z.toFixed(2)}>
      <div className="sq-pillar-head">
        <p className="pj-table-title sq-iso-summary" data-testid="squad-iso-summary">
          <span className={atSquad ? 'sq-iso-off' : undefined}>{L('squad.iso.summaryTeams', { teams: model.teamCount, people: model.headcount })}</span>
          <span className="sq-iso-off"> {side === 'squad' ? '→' : '←'} </span>
          <span className={atSquad ? undefined : 'sq-iso-off'}>{L('squad.iso.summarySquads', { count: model.squadInfo.length })}</span>
        </p>
        {playing ? (
          <Button variant="secondary" size="sm" onClick={overlay ? () => onDoneRef.current?.() : finish} data-testid="squad-iso-skip">{L('squad.iso.skip')}</Button>
        ) : (
          <div className="sq-pillar-search">
            <SearchInput
              ref={qRef}
              value={q}
              placeholder={L('squad.pillar.searchPlaceholder')}
              aria-label={L('squad.pillar.searchLabel')}
              title={L('squad.pillar.searchTip')}
              data-testid="squad-pillar-search"
              onChange={(e) => { setQ(e.target.value); setSel(null); setResultsOpen(true); setResultOn(0); }}
              onFocus={() => setResultsOpen(true)}
              onBlur={() => setTimeout(() => setResultsOpen(false), 0)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); setResultOn((i) => (i + 1) % results.length); } else if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); setResultOn((i) => (i - 1 + results.length) % results.length); } else if (isEnterKey(e) && results[resultOn]) { e.preventDefault(); pick(results[resultOn]); }
              }}
            />
            {!q && <kbd className="sq-pillar-kbd" aria-hidden>/</kbd>}
            {resultsOpen && nq && (
              <div className="sq-pillar-results" role="listbox" data-testid="squad-pillar-results">
                {results.length ? results.map((r, i) => (
                  <Button
                    type="button" key={`${r.type}-${r.id}`} role="option" aria-selected={i === resultOn}
                    className={i === resultOn ? 'is-on' : undefined}
                    onMouseDown={(e) => { e.preventDefault(); pick(r); }}
                  >
                    <b>{r.title}</b>{r.sub}
                  </Button>
                )) : <div className="sq-pillar-empty">{L('squad.pillar.noResult')}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="sq-pillar-tools" data-testid="squad-pillar-chips">
        <span className="sq-pillar-tools-label">{L('squad.pillar.chipsLabel')}</span>
        {PILLAR_CHIPS.map(([key, fn]) => (
          <Button
            key={key} type="button" className="sq-pillar-chip" aria-pressed={chip === key} disabled={playing}
            data-testid={`squad-pillar-chip-${key}`}
            onClick={() => { setChip(chip === key ? null : key); setSel(null); }}
          >
            {L(`squad.pillar.chip.${key}`)} <b>{L('squad.iso.count', { count: chipCount(fn) })}</b>
          </Button>
        ))}
      </div>
      {chip === 'over' && (
        <div className="sq-overload sq-pillar-overload" data-testid="squad-pillar-overload" role="status">
          <span className="sq-overload-title"><WarningIcon size={14} /> {L('squad.overload.title')}</span>
          {overList.map((x) => (
            <Button key={x.id} type="button" className="sq-overload-person sq-pillar-ov-person" title={`${nameOf(x)} ${x.total}%`} onClick={() => selectPerson(x.id)}>
              <span>{nameOf(x)}</span>
            </Button>
          ))}
          <span className="sq-overload-body">{L('squad.overload.body')}</span>
        </div>
      )}

      <div className="sq-pillar-wrap">
        <div className="org-toolbar org-toolbar-right sq-pillar-zoom" data-testid="squad-iso-tools">
          <div className="org-toolbar-group">
            <Button type="button" className="org-tool-btn" onClick={() => setZoomCentered(Math.min(z + 0.1, PILLAR_ZOOM_MAX))} title={L('org.zoomIn')} aria-label={L('org.zoomIn')} data-action="zoom-in"><PlusGlyph size={20} /></Button>
            <Button type="button" className="org-tool-btn" onClick={() => setZoomCentered(Math.max(z - 0.1, PILLAR_ZOOM_MIN))} title={L('org.zoomOut')} aria-label={L('org.zoomOut')} data-action="zoom-out"><MinusGlyph size={20} /></Button>
            <Button type="button" className="org-tool-btn has-label" onClick={() => setZoomCentered(null)} title={L('squad.iso.zoomFitTip')} data-action="zoom-fit"><span>{L('squad.graph.zoomFit')}</span></Button>
          </div>
        </div>
        <div className="sq-pillar-dock" ref={dockRef} hidden={!dock} data-testid="squad-pillar-dock">
          <Button type="button" className="sq-pillar-dock-x" aria-label={L('squad.pillar.close')} onClick={() => setSel(null)}><CloseGlyph size={14} /></Button>
          {dock}
        </div>
        <div
          ref={scrollRef}
          className="sq-pillar-scroll"
          data-testid="squad-iso-scroll"
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
        >
          <svg
            ref={svgRef}
            className="sq-pillar-svg"
            viewBox={`${VB.x.toFixed(0)} ${VB.y.toFixed(0)} ${VB.w.toFixed(0)} ${VB.h.toFixed(0)}`}
            width={Math.round(VB.w * z)}
            height={Math.round(VB.h * z)}
            onMouseOver={onOver}
            onMouseMove={(e) => { if (cardRef.current?.style.display === 'block') moveCard(e); }}
            onMouseLeave={onLeave}
            onClick={onClick}
            onKeyDown={onKeyDown}
          >
            <defs>
              <pattern id={hatchId} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)"><rect width="2" height="4" style={{ fill: C.hatch }} /></pattern>
              {[...PILLAR_FAMILIES, 'none'].map((f) => {
                const c = PILLAR_FAMILY_COLOR[f];
                return (
                  <linearGradient key={f} id={`${gradId}-${f}`} x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" style={{ stopColor: mixWhite(c, 58) }} /><stop offset=".55" style={{ stopColor: mixWhite(c, 74) }} /><stop offset="1" style={{ stopColor: mixWhite(c, 96) }} />
                  </linearGradient>
                );
              })}
            </defs>
            {['org', 'squad'].map((s) => (
              <g key={s} className="sq-pillar-plates" data-side={s} style={{ opacity: platesUp === s ? 1 : 0, pointerEvents: platesUp === s && !playing ? 'auto' : 'none' }}>
                {flattenNodes(s === 'squad' ? model.sTree : model.oTree).map((n) => (
                  <g key={n.id} data-pillar-node={n.id} className="sq-pillar-node">
                    <title>{n.squad
                      ? `${n.squad.name} · ${n.info?.project ? `${n.info.project.name} ${n.info.project.progress ?? 0}%` : L('squad.pillar.noProject')}`
                      : nodeName(n)}</title>
                    <Plate n={n} />
                  </g>
                ))}
              </g>
            ))}
            <g data-testid="squad-pillar-tokens">
              {drawn.map((t) => {
                const p = at(t, view);
                const on = matcher ? matcher(t) : true;
                const mine = view === 'squad' && isMine(t);
                return (
                  <g
                    key={t.key}
                    data-pillar-key={t.key}
                    data-person={t.x.id}
                    data-mine={mine ? 'true' : undefined}
                    className={`sq-pillar-token${mine ? ' is-mine' : ''}`}
                    transform={translate(p.x, p.y, p.z)}
                    style={{ opacity: playing ? 1 : matcher ? (on ? 1 : 0.13) : (t.a ? 1 : 0.6) }}
                    role="button"
                    tabIndex={playing ? -1 : 0}
                    aria-label={mine ? L('squad.pillar.mineAria', { name: nameOf(t.x), squad: t.a.squad.name }) : nameOf(t.x)}
                  >
                    <Pillar tk={t} side={shapeSide} gradId={gradId} hatchId={hatchId} unsetOn />
                  </g>
                );
              })}
            </g>
            <g pointerEvents="none">
              {links.map((d) => <path key={d} d={d} fill="none" strokeWidth={1.4} strokeDasharray="4 3" style={{ stroke: C.ink }} />)}
            </g>
            {['org', 'squad'].map((s) => (
              <g key={s} className="sq-pillar-labels" style={{ opacity: platesUp === s ? 1 : 0 }}>
                {flattenNodes(s === 'squad' ? model.sTree : model.oTree).map((n) => <PlateLabel key={n.id} n={n} name={nodeName(n)} />)}
              </g>
            ))}
            <g pointerEvents="none" style={{ opacity: playing ? 0 : 1 }} data-testid="squad-pillar-tags">
              {!playing && tagsSorted.map((t) => {
                const qq = at(t, view);
                const [sx, sy] = pillarIso(qq.x, qq.y, qq.z + t.h);
                const lead = view === 'squad' ? t.lead : t.head;
                const mine = view === 'squad' && isMine(t);
                const on = matcher ? matcher(t) : false;
                return (
                  <g key={t.key} transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)})`}>
                    <g
                      className={`sq-pillar-tag${lead || mine ? '' : ' is-name'}${on ? ' is-lit' : ''}`}
                      data-pillar-tag={t.key}
                      transform={`translate(0 ${(-(lifts.get(t.key) || 0)).toFixed(1)}) scale(${k.toFixed(3)})`}
                      style={{ opacity: matcher ? (on ? 1 : 0.1) : 1 }}
                    >
                      <Tag tk={t} side={view} name={nameOf(t.x)} mine={mine} L={L} />
                    </g>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      <div className="sq-pillar-legend" data-testid="squad-iso-legend">
        <span className="sq-pillar-legend-item"><b>{L('squad.pillar.legendHeight')}</b></span>
        {[25, 50, 100].map((v) => (
          <span key={v} className="sq-pillar-legend-item"><Mini h={v * PILLAR.heightPerPct * 0.5} c={PILLAR_FAMILY_COLOR.dev} />{`${v}%`}</span>
        ))}
        <span className="sq-pillar-legend-item"><Mini h={12} c={PILLAR_FAMILY_COLOR.dev} cyl />{L(atSquad ? 'squad.pillar.legendLead' : 'squad.pillar.legendHead')}</span>
        {atSquad
          ? <span className="sq-pillar-legend-item"><Mini h={12} c={PILLAR_FAMILY_COLOR.dev} dots />{L('squad.pillar.legendDots')}</span>
          : <span className="sq-pillar-legend-item"><Mini h={16} c={PILLAR_FAMILY_COLOR.dev} />{L('squad.pillar.legendStack')}</span>}
        <span className="sq-pillar-legend-item"><Mini h={10} c={PILLAR_FAMILY_COLOR.dev} dash />{L('squad.pillar.legendUnset')}</span>
        <span className="sq-pillar-legend-item"><Mini h={10} c={PILLAR_FAMILY_COLOR.dev} warn />{L('squad.pillar.legendOver')}</span>
        <span className="sq-pillar-legend-item" data-testid="squad-pillar-families">
          {PILLAR_FAMILIES.map((f) => (
            <Button key={f} type="button" className="sq-pillar-fam" aria-pressed={fam === f} disabled={playing}
              onClick={() => { setFam(fam === f ? null : f); setSel(null); }} data-testid={`squad-pillar-fam-${f}`}>
              <i className="sq-pillar-sw" style={{ background: mixWhite(PILLAR_FAMILY_COLOR[f], 72) }} />{famName(f)}
            </Button>
          ))}
        </span>
        <span className="sq-pillar-legend-item"><b>{L(atSquad ? 'squad.pillar.legendBand' : 'squad.pillar.legendDiv')}</b></span>
        {atSquad && model.layers > 0 && <span className="sq-pillar-legend-item">{L('squad.pillar.legendLayers', { layers: groupLevelNames.slice(0, model.layers).join('·') })}</span>}
        {atSquad && hasMine && <span className="sq-pillar-legend-item">{L('squad.pillar.legendMine')}</span>}
      </div>
      <div className="sq-pillar-hovercard" ref={cardRef} aria-hidden data-testid="squad-pillar-hovercard">
        {hovPerson && personCard(hovPerson, false)}
      </div>
    </div>
  );
}

/** 사람 정보 — 마우스 올림 카드와 고정 카드가 같이 쓴다 */
function PersonCard({ x, L, nameOf, unitName, famName, mineHint }) {
  const p = x.person;
  const scale = Math.max(100, x.total);
  // 앞 조각까지 쌓인 몫에서 100을 넘은 만큼이 그 조각의 빗금이다
  const set = x.as.filter((a) => !a.unset);
  const segs = set.map((a, i) => {
    const end = set.slice(0, i + 1).reduce((t, v) => t + v.capa, 0);
    return { a, ov: Math.max(0, Math.min(a.capa, end - 100)) };
  });
  const over = x.total > PILLAR_OVER;
  return (
    <div data-testid="squad-pillar-person">
      <div className="sq-pillar-person-name">{nameOf(x)}</div>
      <div>{[p.businessTitle, p.unitName || unitName({ kind: p.unitKind }), famName(famOf(p))].filter(Boolean).join(' · ')}</div>
      {x.as.length > 0 ? (
        <>
          <div className="sq-pillar-gwrap">
            <div className="sq-pillar-gauge">
              {segs.map(({ a, ov }) => (
                <i key={a.squadId} className="sq-pillar-gseg" style={{ width: `${(a.capa / scale) * 100}%` }}>
                  <i style={{ width: `${a.capa ? ((a.capa - ov) / a.capa) * 100 : 0}%`, background: a.squad.color }} />
                  {ov > 0 && <i style={{ width: `${(ov / a.capa) * 100}%`, background: `repeating-linear-gradient(45deg,${a.squad.color},${a.squad.color} 2px,${C.hatch} 2px,${C.hatch} 4px)` }} />}
                </i>
              ))}
            </div>
            {over && <i className="sq-pillar-gmark" style={{ left: `${(100 / scale) * 100}%` }} />}
          </div>
          <div className={`sq-pillar-capline${over ? ' is-over' : ''}`} data-testid="squad-pillar-capline">
            {over && <WarningIcon size={14} />}
            <b>{x.total}</b><span className="sq-pillar-capmax">/ 100</span>
            {over
              ? <span>{L('squad.mycap.over', { diff: x.total - 100 })}</span>
              : <span className="sq-pillar-capmax">{L('squad.mycap.slack', { diff: 100 - x.total })}</span>}
          </div>
          {x.as.map((a) => (
            <div key={a.squadId} className="sq-pillar-row">
              <span><i className="sq-pillar-dot" style={{ background: a.squad.color }} />{a.squad.name}{a.lead && <> <LeadTag /></>}</span>
              <span>{a.unset ? L('squad.pillar.rowUnset', { share: a.share }) : L('squad.pillar.row', { capa: a.capa, share: a.share })}</span>
            </div>
          ))}
          {mineHint && <div className="sq-pillar-note">{L('squad.pillar.mineHint')}</div>}
        </>
      ) : <div className="sq-pillar-note">{L('squad.pillar.noActiveSquad')}</div>}
    </div>
  );
}

/** 판·받침 요약 — 디자이너 스쿼드 카드 값(제목 20 · 색 상자 20 · 여백 24 · 모서리 16 · 막대 12) */
function NodeCard({ n, L, nameOf, famName, today, onGo, unitName }) {
  const famBar = (list) => {
    const tot = list.length || 1;
    const fams = [...PILLAR_FAMILIES, 'none'].map((f) => [f, list.filter((x) => famOf(x.person) === f).length]).filter((v) => v[1] > 0);
    return (
      <>
        <h4>{L('squad.iso.legendTitle')}</h4>
        <div className="sq-pillar-bar">{fams.map(([f, c]) => <i key={f} style={{ width: `${(c / tot) * 100}%`, background: mixWhite(PILLAR_FAMILY_COLOR[f], 72) }} />)}</div>
        <div className="sq-pillar-famline">{fams.map(([f, c]) => `${famName(f)} ${c}`).join(' · ')}</div>
      </>
    );
  };
  const periodText = (sq) => {
    const pd = squadPeriod(sq, today);
    return pd.kind === 'open' ? L('squad.pillar.periodOpen') : pd.kind === 'overdue' ? L('squad.pillar.periodOverdue', { days: pd.days }) : L('squad.pillar.periodLeft', { days: pd.days });
  };
  const leadOf = (pl) => pl.people.find((x) => x.id === pl.info?.leadId);
  const squadRow = (pl) => {
    const pj = pl.info.project; const lead = leadOf(pl);
    return (
      <Button type="button" key={pl.id} className="sq-pillar-go" onClick={() => onGo(pl.id)}>
        <span className="sq-pillar-row"><span><i className="sq-pillar-dot" style={{ background: pl.squad.color }} /><b>{pl.squad.name}</b></span><span>{L('squad.iso.count', { count: pl.people.length })}</span></span>
        <span className="sq-pillar-line2">{lead && <><LeadTag />{nameOf(lead)} · </>}{pj ? `${pj.name} ${pj.progress ?? 0}%` : L('squad.pillar.noProject')}</span>
        <span className="sq-pillar-bar is-thin"><i style={{ width: `${pj ? pj.progress ?? 0 : 0}%`, background: pl.squad.color }} /></span>
      </Button>
    );
  };
  if (n.squad) {
    const sq = n.squad; const lead = leadOf(n);
    const over = n.people.filter((x) => x.total > PILLAR_OVER).length;
    const unset = n.people.filter((x) => x.as.find((a) => a.squadId === sq.id)?.unset).length;
    const projects = sq.projects || [];
    return (
      <div data-testid="squad-pillar-node-card">
        <div className="sq-pillar-title"><i className="sq-pillar-colorbox" style={{ background: sq.color }} />{sq.name}</div>
        <div className="sq-pillar-meta">{lead && <><LeadTag /><span>{nameOf(lead)}</span></>}<span>{L('squad.iso.count', { count: n.people.length })}</span><span>{periodText(sq)}</span></div>
        <h4>{L('squad.pillar.projects')}</h4>
        {projects.length ? projects.map((pj) => (
          <div key={pj.id} className="sq-pillar-pj">
            <div className="sq-pillar-row"><span>{pj.isPrimary ? '主 ' : ''}{pj.name}</span><span>{`${pj.progress ?? 0}%`}</span></div>
            <div className="sq-pillar-bar"><i style={{ width: `${pj.progress ?? 0}%`, background: pj.isPrimary ? sq.color : mixWhite(sq.color, 52) }} /></div>
          </div>
        )) : <div>{L('squad.pillar.noProjects')}</div>}
        {famBar(n.people)}
        {(over || unset) ? (
          <>
            <h4>{L('squad.pillar.notes')}</h4>
            <div className="sq-pillar-notes">
              {over > 0 && <div>{L('squad.pillar.noteOver', { count: over })}</div>}
              {unset > 0 && <div>{L('squad.pillar.noteUnset', { count: unset })}</div>}
            </div>
          </>
        ) : null}
      </div>
    );
  }
  if (n.layer) {
    const plates = flattenNodes(n).filter((x) => x.squad);
    const people = [...new Map(plates.flatMap((pl) => pl.people).map((x) => [x.id, x])).values()];
    const over = people.filter((x) => x.total > PILLAR_OVER).length;
    const unset = people.filter((x) => x.as.some((a) => a.unset)).length;
    const multi = people.filter((x) => x.as.length > 1).length;
    const overdue = plates.filter((pl) => squadPeriod(pl.squad, today).kind === 'overdue').length;
    const noProject = plates.filter((pl) => !pl.info.project).length;
    const noHead = n.kind === 'group' ? n.children.filter((t) => !t.headName).length : 0;
    const notes = [
      over && L('squad.pillar.noteOver', { count: over }),
      unset && L('squad.pillar.noteUnset', { count: unset }),
      multi && L('squad.pillar.noteMulti', { count: multi }),
      overdue && L('squad.pillar.noteOverdue', { count: overdue }),
      noProject && L('squad.pillar.noteNoProject', { count: noProject }),
      !n.headName && L('squad.pillar.noHead'),
      noHead && L('squad.pillar.noteNoHead', { layer: n.children[0]?.layer || '', count: noHead }),
    ].filter(Boolean);
    return (
      <div data-testid="squad-pillar-node-card">
        <div className="sq-pillar-title"><i className="sq-pillar-colorbox" style={{ background: n.color }} />{n.name}</div>
        <div className="sq-pillar-meta">
          <span>{n.layer}</span>
          <span>{n.headName ? L('squad.pillar.head', { name: n.headName }) : L('squad.pillar.noHead')}</span>
          <span>{L('squad.pillar.squadCount', { count: plates.length })}</span>
          <span>{L('squad.iso.count', { count: people.length })}</span>
        </div>
        <h4>{n.kind === 'group' ? L('squad.pillar.layerAndSquads', { layer: n.children[0]?.layer || '' }) : L('squad.pillar.squads')}</h4>
        {n.kind === 'group'
          ? n.children.map((t) => (
            <div key={t.id}>
              <Button type="button" className="sq-pillar-go is-head" onClick={() => onGo(t.id)}>
                {`${t.layer} ${t.name}`}
                <span>{`${t.headName ? L('squad.pillar.head', { name: t.headName }) : L('squad.pillar.noHead')} · ${L('squad.iso.count', { count: t.peopleCount })}`}</span>
              </Button>
              {t.children.map(squadRow)}
            </div>
          ))
          : plates.map(squadRow)}
        {famBar(people)}
        {notes.length > 0 && (<><h4>{L('squad.pillar.notes')}</h4><div className="sq-pillar-notes">{notes.map((t) => <div key={t}>{t}</div>)}</div></>)}
      </div>
    );
  }
  if (n.team) {
    const head = n.people.find((x) => x.id === n.team.headId);
    return (
      <div data-testid="squad-pillar-node-card">
        <div className="sq-pillar-title">{unitName(n.team)}</div>
        <div className="sq-pillar-meta"><span>{head ? L('squad.pillar.teamHead', { name: nameOf(head) }) : L('squad.pillar.teamNoHead')}</span><span>{L('squad.iso.count', { count: n.people.length })}</span></div>
        {famBar(n.people)}
      </div>
    );
  }
  if (n.dashed) {
    return (
      <div data-testid="squad-pillar-node-card">
        <div className="sq-pillar-title">{L('squad.iso.noSquad')}</div>
        <div className="sq-pillar-meta"><span>{L('squad.iso.count', { count: n.people.length })}</span></div>
      </div>
    );
  }
  const ppl = flattenNodes(n).filter((x) => x.kind === 'plate').flatMap((x) => x.people);
  return (
    <div data-testid="squad-pillar-node-card">
      <div className="sq-pillar-title">{n.name}</div>
      <div className="sq-pillar-meta"><span>{L('squad.pillar.divMeta', { teams: n.teamCount, count: n.peopleCount })}</span></div>
      {famBar(ppl)}
    </div>
  );
}
