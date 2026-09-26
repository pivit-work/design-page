#!/usr/bin/env node
/**
 * 카드·안내 상자의 «한쪽에만 그은 굵은 색 선»을 막는다 (PW-1101).
 *
 * ## 무엇을 막는가
 *
 * 상자(바탕을 칠했거나 테두리가 있는 칸)에 왼쪽·오른쪽 한 변만 2px 이상 색 선을 긋는 모양.
 * `border-left: 3px solid …`, `box-shadow: inset 3px 0 0 …`, JSX 의 `borderLeft: '3px solid …'` 가 그것이다.
 *
 * ## 왜 필요한가 — 실제로 그렇게 쌓였다
 *
 * 앱 전체에 이 모양이 20곳 있었는데 디자이너가 그린 것은 2곳뿐이었다(리포트 Weekly 의 요약 한 줄,
 * 개인 OKR 작성 창의 머리글). 그 둘은 상자가 아니라 «글자 왼쪽에 선만» 긋는다. 나머지 18곳은
 * 기획서 시안을 옮기거나 「고른 줄」을 표시하려고 개발이 따로 붙인 것이라 색·두께가 제각각이었다.
 * 커트 결정(2026-09-26)으로 18곳을 디자이너 모양으로 바꾸거나 선을 없앴다. 모양만의 문제라
 * eslint 도 소비자 유닛 테스트도 이것을 모른다.
 *
 * ## 판정
 *
 * - CSS: 한쪽 굵은 선은 아래 ALLOWED 의 규칙에만 둔다. 그 규칙도 **상자가 아니어야** 한다 —
 *   같은 규칙 안에 바탕색·네 변 테두리·그림자가 있으면 실패한다.
 * - JSX 인라인 스타일: 예외 없이 실패한다. 글자 옆 선이 필요하면 CSS 클래스로 옮겨 ALLOWED 에 싣는다.
 * - 안 보는 것: 1px 구분선, 점선(목표선·끌어 놓을 자리 안내), 탭 밑줄(위·아래 변), `::before` 로 그린
 *   세로 타임라인 줄. 선이긴 하지만 상자 강조가 아니다(PW-1101 「이번에 안 하는 것」).
 * - src/devtools/ 는 미리보기 사이트의 개발 도구 창이라 뺀다.
 *
 * ALLOWED 에 새 줄을 더하는 것은 디자이너가 그 자리를 «상자 없이 글자 옆 선»으로 그렸을 때뿐이다.
 *
 * 실행: npm run check:side-stripes  (lefthook pre-push · publish CI 에서 자동 실행)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 파일 → 한쪽 선을 둬도 되는 선택자. 모두 «바탕·테두리 없이 글자 왼쪽 선만» 이다. */
export const ALLOWED = {
  // 디자이너가 그린 두 곳
  'src/timeline.css': ['.tl-weekly-entry-highlight'],
  'src/okr.css': ['.okr-cf-header'],
  // 위 모양(2px 회청색)에 맞춘 곳 (PW-1101 ①)
  'src/eval-cycle.css': ['.evc-note', '.evs-cw-timeline-item'],
  'src/one_on_one.css': ['.ono-guide-script'],
  'src/admin.css': ['.admin-emp-hist-reason'],
};

const MIN_PX = 2;

/** 선언 하나가 한쪽 굵은 선인지. */
export function isSideStripe(prop, value) {
  const p = prop.toLowerCase();
  const v = value.toLowerCase();
  // 투명한 변은 선이 아니다 — CSS 로 그린 세모(말풍선 꼬리·눈금 표시)가 이 모양이다
  if (/\btransparent\b/.test(v)) return false;
  if (/^border-(left|right|inline-start|inline-end)$/.test(p)) {
    const m = v.match(/(\d+(?:\.\d+)?)px/);
    return !!m && Number(m[1]) >= MIN_PX && /\bsolid\b/.test(v);
  }
  if (/^border-(left|right|inline-start|inline-end)-width$/.test(p)) {
    const m = v.match(/(\d+(?:\.\d+)?)px/);
    return !!m && Number(m[1]) >= MIN_PX;
  }
  if (p === 'box-shadow') {
    // inset Npx 0 0 … — 가로로만 밀린 안쪽 그림자는 한쪽 선으로 보인다
    for (const m of v.matchAll(/inset\s+-?(\d+(?:\.\d+)?)px\s+0(?:px)?\s+0(?:px)?\b/g)) {
      if (Number(m[1]) >= MIN_PX) return true;
    }
  }
  return false;
}

/** 허용된 글자 옆 선 규칙 안에 상자를 만드는 선언이 있는지. */
export function boxDeclarations(decls) {
  return decls.filter(([p, v]) => {
    const prop = p.toLowerCase();
    const val = v.trim().toLowerCase();
    if (prop === 'background' || prop === 'background-color') return !/^(transparent|none)$/.test(val);
    if (prop === 'border') return !/^(0|none)$/.test(val);
    if (prop === 'box-shadow') return val !== 'none';
    return false;
  });
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
}

const SIDE_RE = /^border-(left|right)$/;

function parseRules(css) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    index: m.index,
    head: m[0].indexOf('{'),
    selector: m[1].trim().replace(/\s+/g, ' '),
    decls: m[2]
      .split(';')
      .map((d) => d.split(':'))
      .filter((parts) => parts.length >= 2)
      .map(([p, ...rest]) => [p.trim().toLowerCase(), rest.join(':').trim()]),
  }));
}

/**
 * 두께는 투명하게 한쪽에만 잡아 두고 «고른 때» 다른 규칙이 `border-left-color` 로 색만 칠하는 모양
 * (예전 매니저 KR 드릴다운 Objective 칩). 양쪽이 다 투명한 규칙은 CSS 세모라 뺀다.
 */
function reservedSides(rules) {
  const out = [];
  for (const r of rules) {
    const sides = r.decls
      .filter(([p, v]) => SIDE_RE.test(p) && /\btransparent\b/i.test(v) && /\bsolid\b/i.test(v))
      .filter(([, v]) => Number((v.match(/(\d+(?:\.\d+)?)px/) ?? [])[1]) >= MIN_PX)
      .map(([p]) => p.slice('border-'.length));
    if (sides.length === 1) for (const sel of r.selector.split(',')) out.push([sel.trim(), sides[0]]);
  }
  return out;
}

export function checkCss(rel, text) {
  const problems = [];
  const css = stripComments(text);
  const allowed = new Set(ALLOWED[rel] ?? []);
  const rules = parseRules(css);
  const reserved = reservedSides(rules);
  for (const { index, head, selector, decls } of rules) {
    const stripes = decls.filter(([p, v]) => isSideStripe(p, v));
    for (const [p, v] of decls) {
      const side = (p.match(/^border-(left|right)-color$/) ?? [])[1];
      if (!side || /\btransparent\b/i.test(v)) continue;
      const parts = selector.split(',').map((x) => x.trim());
      if (reserved.some(([base, s]) => s === side && parts.some((x) => x.startsWith(base)))) stripes.push([p, v]);
    }
    if (!stripes.length) continue;
    const line = css.slice(0, index + head).split('\n').length;
    if (!allowed.has(selector)) {
      for (const [p, v] of stripes) problems.push(`${rel}:${line}  ${selector} { ${p}: ${v} }`);
      continue;
    }
    for (const [p, v] of boxDeclarations(decls)) {
      problems.push(`${rel}:${line}  ${selector} 는 글자 옆 선만 두는 자리인데 상자를 만든다 — ${p}: ${v}`);
    }
  }
  return problems;
}

/** `key:` 뒤의 값을 끝(맨 바깥의 `,` 나 `}`)까지 읽는다 — 여러 줄 삼항식도 한 값이다. */
function readValue(src, start) {
  const stack = []; // 여는 괄호 · '`'(템플릿 글자) · '${'(템플릿 안 식)
  let quote = null; // ' 또는 "
  for (let i = start; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (stack.at(-1) === '`') {
      if (ch === '\\') i += 1;
      else if (ch === '`') stack.pop();
      else if (ch === '$' && src[i + 1] === '{') {
        stack.push('${');
        i += 1;
      }
      continue;
    }
    if (ch === "'" || ch === '"') quote = ch;
    else if (ch === '`' || ch === '(' || ch === '[' || ch === '{') stack.push(ch);
    else if (ch === ')' || ch === ']' || ch === '}') {
      if (!stack.length) return src.slice(start, i);
      stack.pop();
    } else if (ch === ',' && !stack.length) return src.slice(start, i);
  }
  return src.slice(start);
}

/** 값 안의 글자 조각(따옴표·백틱)을 하나씩 — 삼항식은 갈래마다 따로 판정한다. */
function literalPieces(value) {
  const pieces = [...value.matchAll(/'([^']*)'|"([^"]*)"|`([^`]*)`/g)].map((m) => m[1] ?? m[2] ?? m[3]);
  return pieces.length ? pieces : [value];
}

export function checkJsx(rel, text) {
  const problems = [];
  const src = text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const re = /\b(borderLeft|borderRight|borderInlineStart|borderInlineEnd|borderLeftWidth|borderRightWidth|boxShadow)\s*:\s*/g;
  for (const m of src.matchAll(re)) {
    const prop = m[1].replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    const value = readValue(src, m.index + m[0].length);
    for (const piece of literalPieces(value)) {
      if (!isSideStripe(prop, piece)) continue;
      const line = src.slice(0, m.index).split('\n').length;
      problems.push(`${rel}:${line}  ${m[1]}: ${piece.trim()}`);
    }
  }
  return problems;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'devtools') continue;
      walk(full, out);
    } else if (/\.(css|jsx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function main() {
  const problems = [];
  const seen = new Set();
  for (const file of walk(join(root, 'src'))) {
    const rel = relative(root, file).split(sep).join('/');
    const text = readFileSync(file, 'utf8');
    if (rel.endsWith('.css')) {
      problems.push(...checkCss(rel, text));
      for (const sel of ALLOWED[rel] ?? []) if (stripComments(text).includes(`${sel} {`)) seen.add(`${rel} ${sel}`);
    } else {
      problems.push(...checkJsx(rel, text));
    }
  }
  // 허용 목록이 낡지 않게 — 사라진 선택자는 목록에서도 지운다
  for (const [rel, sels] of Object.entries(ALLOWED)) {
    for (const sel of sels) if (!seen.has(`${rel} ${sel}`)) problems.push(`ALLOWED 의 ${rel} ${sel} 가 CSS 에 없습니다 — 목록에서 지우세요`);
  }

  if (problems.length) {
    console.error('✗ 상자에 한쪽 굵은 색 선이 있습니다 (PW-1101).');
    console.error('  디자이너 모양은 «바탕·테두리 없이 글자 왼쪽에 선만» 이다. 상자로 남아야 하면 선을 빼고,');
    console.error('  글자 옆 선이어야 하면 상자를 빼고 scripts/check-side-stripes.mjs 의 ALLOWED 에 싣는다.\n');
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log('✓ 한쪽 굵은 색 선 — 허용된 글자 옆 선만 있습니다');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
