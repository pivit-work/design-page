#!/usr/bin/env node
/**
 * 같은 아이콘 그림을 **두 곳에 그리지 못하게** 막는다 (PW-1011).
 *
 * ## 왜
 *
 * 화면마다 아이콘을 코드에 직접 그리다 보니 같은 그림이 여러 파일에 복사돼 있었다. 2026-09-25 에
 * 재 보니 design-page 와 pivit-work 를 합쳐 45가지 그림이 155곳이었고, 닫기(X) 하나가 22곳이었다.
 * 한 곳을 고쳐도 복사본은 그대로 남아 화면마다 조금씩 갈라지고, 새 화면도 또 복사한다.
 * 그래서 두 곳 이상에서 쓰는 그림은 `src/components/shared/lineIcons.jsx` 한 곳에 두었다.
 *
 * ## 무엇을 세나
 *
 * `.jsx`·`.tsx` 파일의 `<svg>…</svg>`(그리고 모듈 안 `<Svg>` 틀)마다 **그림**을 뽑는다 — 틀(viewBox)과
 * 선·원·사각형의 좌표만. 크기·색·선 두께는 보지 않는다(같은 그림을 다른 크기로 쓰는 것은 괜찮다).
 * 좌표에 식(`{x}`)이 들어간 그림은 뺀다.
 *
 * 1. `copies`    — 같은 그림이 공용 모음 밖에서 **두 번 이상** 나온다(파일이 같아도 센다).
 * 2. `homeCopy`  — 공용 모음에 이미 있는 그림을 공용 모음 밖에서 **또** 그렸다.
 *
 * 여러 뿌리를 한꺼번에 넘길 수 있다 — 소비자(pivit-work)는 자기 `src` 와 설치된 이 패키지의 `src` 를
 * 함께 넘겨, 두 저장소에 걸친 복사본도 잡는다(`frontend/src/designPageIconCopies.guard.test.ts`).
 *
 * 실행: `npm run check:icon-copies` (pre-push 훅, publish 워크플로)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** 두 곳 이상 쓰는 그림이 사는 파일(뿌리 기준 경로). */
export const HOME = 'components/shared/lineIcons.jsx';

const SHAPES = ['path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse'];
const GEOMETRY = ['d', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'points'];

function attrValue(attrs, name) {
  const m = new RegExp(`(?:^|\\s)${name}=(?:"([^"]*)"|'([^']*)'|\\{\\s*["']([^"']*)["']\\s*\\}|\\{\\s*([\\d.\\-]+)\\s*\\})`).exec(attrs);
  if (!m) return null;
  return (m[1] ?? m[2] ?? m[3] ?? m[4]).replace(/\s+/g, ' ').trim();
}

/**
 * 파일 글에서 그림을 뽑는다 → `[{ line, key }]`. key 는 틀 + 도형 좌표를 이은 문자열이다.
 * 틀을 적지 않은 svg(헬퍼로 펼친 것)는 24칸 틀로 본다 — 이 저장소 헬퍼가 모두 그렇다.
 */
export function drawingsIn(text) {
  const out = [];
  const openRe = /<(svg|Svg|LineSvg|SolidSvg)\b/g;
  let m;
  while ((m = openRe.exec(text))) {
    const tag = m[1];
    const openEnd = tagEnd(text, m.index + m[0].length);
    if (openEnd < 0) break;
    const open = text.slice(m.index + m[0].length, openEnd);
    if (open.trimEnd().endsWith('/')) continue; // <Svg /> 처럼 속이 없는 것
    const close = text.indexOf(`</${tag}>`, openEnd);
    if (close < 0) continue;
    const inner = text.slice(openEnd + 1, close);
    openRe.lastIndex = close;
    const shapeRe = new RegExp(`<(${SHAPES.join('|')})\\b([^>]*?)\\/?>`, 'g');
    const parts = [];
    let dynamic = false;
    let s;
    while ((s = shapeRe.exec(inner))) {
      const [, shape, attrs] = s;
      const geo = [];
      for (const g of GEOMETRY) {
        if (new RegExp(`(?:^|\\s)${g}=\\{(?!\\s*["'\\d.\\-])`).test(attrs)) dynamic = true;
        const v = attrValue(attrs, g);
        if (v !== null) geo.push(`${g}=${v}`);
      }
      parts.push(`${shape}(${geo.join(',')})`);
    }
    if (!parts.length || dynamic) continue;
    const viewBox = attrValue(open, 'viewBox') ?? '0 0 24 24';
    out.push({ line: text.slice(0, m.index).split('\n').length, key: `[${viewBox}] ${parts.join(' ')}` });
  }
  return out;
}

/** 여는 태그의 끝 `>` 위치 — 속성 식(`onClick={() => …}`) 안의 `>` 는 건너뛴다. */
function tagEnd(text, from) {
  let depth = 0;
  let quote = null;
  for (let i = from; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      if (depth === 0) quote = ch;
    } else if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === '>' && depth === 0) return i;
  }
  return -1;
}

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(jsx|tsx)$/.test(ent.name) && !/\.(test|spec|stories)\./.test(ent.name)) acc.push(p);
  }
  return acc;
}

/**
 * 뿌리들(`[{ name, dir }]`)을 훑어 어긋난 자리를 돌려준다.
 * → `{ copies: [{ key, sites: ['이름:파일:줄'] }], homeCopy: [{ key, site }] }`
 * 공용 모음(HOME)은 `name` 이 무엇이든 그 경로로 알아본다.
 */
export function findIconCopies(roots) {
  const home = new Set();
  const sites = new Map();
  for (const { name, dir } of roots) {
    for (const file of walk(dir)) {
      const rel = path.relative(dir, file).split(path.sep).join('/');
      const isHome = rel === HOME;
      for (const d of drawingsIn(fs.readFileSync(file, 'utf8'))) {
        if (isHome) {
          home.add(d.key);
          continue;
        }
        const site = `${name}:${rel}:${d.line}`;
        if (!sites.has(d.key)) sites.set(d.key, []);
        sites.get(d.key).push(site);
      }
    }
  }
  const copies = [];
  const homeCopy = [];
  for (const [key, list] of sites) {
    if (home.has(key)) for (const site of list) homeCopy.push({ key, site });
    else if (list.length > 1) copies.push({ key, sites: list });
  }
  return { copies, homeCopy };
}

function main() {
  const { copies, homeCopy } = findIconCopies([{ name: 'design-page', dir: path.join(HERE, '..', 'src') }]);
  let bad = false;
  for (const c of copies) {
    bad = true;
    console.error(`✗ 같은 아이콘을 ${c.sites.length}곳에 그렸다 — src/${HOME} 로 옮겨 한 벌만 둔다\n    ${c.key.slice(0, 120)}\n    ${c.sites.join('\n    ')}`);
  }
  for (const h of homeCopy) {
    bad = true;
    console.error(`✗ 공용 아이콘 모음(src/${HOME})에 있는 그림을 또 그렸다 — 그 Glyph 를 쓴다\n    ${h.site}  ${h.key.slice(0, 100)}`);
  }
  if (bad) process.exit(1);
  console.log('✓ 같은 아이콘을 두 곳에 그린 자리가 없다');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
