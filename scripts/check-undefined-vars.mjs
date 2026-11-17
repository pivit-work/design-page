#!/usr/bin/env node
/**
 * 대체값 없이 쓴 색·값 이름(`var(--x)`)이 design-page 어디에도 정의돼 있지 않으면 막는다 (pivit-work PW-2943).
 *
 * ## 왜 필요한가
 *
 * 가입 › 구성원 초대의 메일 칩은 `border: 1px solid var(--onb-brand-pill-border)` 였는데, 10-17 에
 * 가입 화면 색을 디자이너 모양으로 맞추며(PW-1885) 그 이름의 정의를 지웠다. 이름이 없으면 브라우저는
 * 그 줄 전체를 버려 선이 통째로 사라진다. 오류도 경고도 없어 한 달 동안 아무도 몰랐다.
 *
 * ## 판정
 *
 * - src 의 .css·.jsx·.js 에서 `var(--이름)` 처럼 **대체값 없이** 쓴 이름을 모은다.
 *   `var(--이름, 대체값)` 은 이름이 없어도 대체값으로 그려지므로 세지 않는다.
 * - 같은 src 어딘가에 `--이름:` (CSS) 또는 `'--이름':` (JSX 인라인 스타일)로 정의돼 있어야 한다.
 * - 주석(`/* … *\/`, 줄 첫머리·공백 뒤 `//`) 안의 글은 세지 않는다.
 *
 * 실행: npm run check:undefined-vars  (lefthook pre-push · publish CI 에서 자동 실행)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((l) => l.replace(/(^|\s)\/\/.*$/, '$1'))
    .join('\n');
}

export function definedNames(src) {
  const s = stripComments(src);
  const out = new Set();
  for (const m of s.matchAll(/(?:^|[\s{;'"`\[])(--[A-Za-z0-9_-]+)['"`]?\]?\s*:/g)) out.add(m[1]);
  // style.setProperty('--x', …) 로 정의한 이름 (BroadcastPage 처럼)
  for (const m of s.matchAll(/setProperty\(\s*['"`](--[A-Za-z0-9_-]+)['"`]/g)) out.add(m[1]);
  return out;
}

export function bareUses(src) {
  const s = stripComments(src);
  const out = [];
  for (const m of s.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)\s*\)/g)) {
    out.push({ name: m[1], line: s.slice(0, m.index).split('\n').length, outer: outerFallbackName(s, m.index) });
  }
  return out;
}

// var(--a, var(--b)) 의 --b 처럼 다른 이름의 대체값 안에 든 경우, 바깥 이름(--a)을 돌려준다.
// 바깥 이름이 정의돼 있으면 안쪽은 쓰이지 않으므로 막지 않는다.
function outerFallbackName(s, at) {
  let depth = 0;
  for (let i = at - 1; i >= 0; i -= 1) {
    const c = s[i];
    if (c === ')') depth += 1;
    else if (c === '(') {
      if (depth > 0) { depth -= 1; continue; }
      if (s.slice(i - 3, i) !== 'var') return null;
      const head = /^\s*(--[A-Za-z0-9_-]+)\s*,/.exec(s.slice(i + 1, at));
      return head ? head[1] : null;
    } else if (c === ';' || c === '{' || c === '}') return null;
  }
  return null;
}

export function findUndefined(files) {
  const defs = new Set();
  for (const f of files) for (const n of definedNames(f.src)) defs.add(n);
  const bad = [];
  for (const f of files) for (const u of bareUses(f.src)) if (!defs.has(u.name) && !(u.outer && defs.has(u.outer))) bad.push({ file: f.path, ...u });
  return bad;
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(css|jsx|js)$/.test(name)) acc.push(p);
  }
  return acc;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
  const files = walk(join(root, 'src')).map((p) => ({ path: relative(root, p), src: readFileSync(p, 'utf8') }));
  const bad = findUndefined(files);
  if (bad.length) {
    console.error(`[check:undefined-vars] 정의되지 않은 이름을 대체값 없이 쓴 곳 ${bad.length}곳 — 그 줄은 브라우저가 통째로 버린다`);
    for (const b of bad) console.error(`  ${b.file}:${b.line} — var(${b.name})`);
    console.error('  있는 이름(토큰)으로 바꾸거나 정의를 되살린다. (pivit-work PW-2943)');
    process.exit(1);
  }
  console.log(`[check:undefined-vars] 통과 — 파일 ${files.length}개 · 대체값 없이 쓴 이름 모두 정의됨`);
}
