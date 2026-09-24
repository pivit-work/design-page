#!/usr/bin/env node
/**
 * 화면 코드가 붙인 모양 이름(클래스)이 CSS 어디에도 정의돼 있지 않으면 실패한다 (PW-991).
 *
 * ## 무엇을 막는가
 *
 * `className="admin-btn-primary"` 처럼 이름을 붙였는데 그 이름의 규칙이 `src/**\/*.css` 어디에도
 * 없으면, 그 요소는 모양을 하나도 못 받고 브라우저 기본으로 그려진다. 버튼이면 회색 기본 버튼,
 * 표면 테두리 없는 맨 표, 칸이면 여백 없는 맨 상자가 된다.
 *
 * ## 왜 이 검사가 필요한가 — 실제로 그렇게 나갔다
 *
 * 어드민 → 구성원 설정 → 구성원 상세 창의 「신원 정보 저장」·「복리후생 저장」 버튼이
 * `admin-btn-primary` 를 붙이고 있었는데 그 이름은 정의된 적이 한 번도 없었다. 같은 창의
 * 「보상 이력」 저장 버튼만 제대로 보였다. eslint 도, 소비자(pivit-work)의 유닛 테스트도
 * 이것을 모른다 — 화면을 눈으로 봐야만 드러났다(PW-942 영상). 그날 전부 재 보니 정의 없는
 * 이름이 63개였다.
 *
 * ## 무엇을 보고 무엇을 안 보나
 *
 * - 보는 것: `className`·`bodyClassName`·`tableClassName` 처럼 `…className=` 속성에 **글자 그대로**
 *   적힌 이름. 따옴표 안, 백틱 안의 고정 조각, `{…}` 식 안의 문자열(`cond ? 'a' : 'b'`, `cx('a')`).
 * - 안 보는 것: 코드로 조립한 이름(`evs-nb-${kind}`, `'is-' + tone`) — 앞뒤가 잘린 조각이라
 *   판정하지 않는다. 이번 범위 밖이다(PW-991 「이번에 안 하는 것」).
 * - 요소를 찾으려고 붙인 표시는 클래스가 아니라 `data-` 속성으로 단다. 그래서 **예외 목록이 없다.**
 *
 * 실행: `npm run check:undefined-classes` (pre-push 훅·publish CI 에서 자동)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

function walk(dir, keep, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, keep, out);
    } else if (keep(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** CSS 본문에서 셀렉터에 나오는 클래스 이름을 모은다. */
export function cssClassNames(text) {
  const names = new Set();
  const cleaned = text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/url\([^)]*\)/g, ' ')
    .replace(/"[^"\n]*"|'[^'\n]*'/g, ' ');
  for (const [, name] of cleaned.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) names.add(name);
  return names;
}

/** 여는 괄호 위치에서 짝이 맞는 닫는 괄호까지 잘라 낸다(문자열·템플릿 안의 괄호는 센다에서 뺀다). */
function balanced(text, start) {
  let depth = 0;
  let quote = null;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start + 1, i);
    }
  }
  return text.slice(start + 1);
}

/**
 * 조각 하나(문자열 리터럴 또는 템플릿의 고정 구간)를 이름들로 쪼갠다.
 * 앞·뒤가 코드와 맞붙어 있으면(`'is-' + x`, `${a}-b`) 그 끝의 이름은 잘린 것이라 뺀다.
 */
function splitPiece(piece, cutStart, cutEnd) {
  const tokens = piece.split(/\s+/);
  const out = [];
  tokens.forEach((token, i) => {
    if (!token) return;
    if (i === 0 && cutStart) return;
    if (i === tokens.length - 1 && cutEnd) return;
    out.push(token);
  });
  return out;
}

/** 식이 문자열만 내놓고(`cond ? ' is-on' : ''`) 그 문자열이 모두 비었거나 빈칸으로 시작하나. */
function startsWithSpaceOnly(expr) {
  const lits = [...expr.matchAll(/'([^'\\]*)'|"([^"\\]*)"/g)].map((m) => m[1] ?? m[2]);
  const rest = expr.replace(/'[^'\\]*'|"[^"\\]*"/g, '').replace(/[\s?:&|()]/g, '');
  // 문자열 말고 남은 것은 조건 쪽이어야 한다 — `a ? 'x' : 'y'` 의 `a`. 값 자체를 내놓는 식(`${tone}`)은 문자열이 없다.
  return lits.length > 0 && lits.every((l) => l === '' || /^\s/.test(l)) && !/^[\w.$]*$/.test(expr.trim());
}

/** 이름을 이어 붙이는 도우미 — 이 함수에 넘긴 문자열은 이름이다. 다른 함수에 넘긴 문자열(`inputClass('name')`)은 이름이 아니다. */
const CLASS_HELPERS = new Set(['cx', 'clsx', 'classNames', 'cn']);

/**
 * 식 안에서 글자 그대로 적힌 이름만 뽑는다.
 * `glued` — 이 식이 템플릿 안에서 앞·뒤 글자와 맞붙어 있나(`is-${…}`). 맞붙은 쪽 끝의 조각은 잘린 이름이다.
 */
function namesInExpression(expr, glued = { start: false, end: false }) {
  const out = [];
  const calls = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === '(') {
      const callee = /([A-Za-z_$][\w$]*)\s*$/.exec(expr.slice(0, i));
      calls.push(callee ? callee[1] : null);
      i += 1;
      continue;
    }
    if (ch === ')') {
      calls.pop();
      i += 1;
      continue;
    }
    const inForeignCall = calls.some((c) => c && !CLASS_HELPERS.has(c));
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < expr.length && expr[j] !== ch) j += expr[j] === '\\' ? 2 : 1;
      const before = expr.slice(0, i).trimEnd();
      const after = expr.slice(j + 1).trimStart();
      const lit = expr.slice(i + 1, j);
      // 비교 대상(`kind === 'done'`)은 이름이 아니다.
      const compared = /(===|!==|==|!=)$/.test(before) || /^(===|!==|==|!=)/.test(after);
      if (!compared && !inForeignCall) {
        const cutStart = /\+$/.test(before) || (glued.start && !/^\s/.test(lit));
        const cutEnd = /^\+/.test(after) || (glued.end && !/\s$/.test(lit));
        out.push(...splitPiece(lit, cutStart, cutEnd));
      }
      i = j + 1;
      continue;
    }
    if (ch === '`') {
      let j = i + 1;
      let buf = '';
      let cutStart = false;
      while (j < expr.length && expr[j] !== '`') {
        if (expr[j] === '$' && expr[j + 1] === '{') {
          const inner = balanced(expr, j + 1);
          const gluedStart = buf.length > 0 && !/\s$/.test(buf);
          // `base${on ? ' is-on' : ''}` — 식이 내놓는 글자가 모두 빈칸으로 시작하면 앞 이름은 잘리지 않는다.
          const spaced = startsWithSpaceOnly(inner);
          if (!inForeignCall) out.push(...splitPiece(buf, cutStart, gluedStart && !spaced));
          j += inner.length + 3;
          const next = expr[j];
          const gluedEnd = next !== undefined && next !== '`' && !/\s/.test(next);
          if (!inForeignCall) out.push(...namesInExpression(inner, { start: gluedStart, end: gluedEnd }));
          buf = '';
          cutStart = gluedEnd;
          continue;
        }
        buf += expr[j];
        j += 1;
      }
      if (!inForeignCall) out.push(...splitPiece(buf, cutStart, false));
      i = j + 1;
      continue;
    }
    i += 1;
  }
  return out;
}

const ATTR = /\b[A-Za-z]*[cC]lassName=/g;

/** JSX 본문에서 `…className=` 속성에 글자 그대로 적힌 이름을 {name, line} 으로 모은다. */
export function jsxClassUsages(text) {
  const usages = [];
  for (const m of text.matchAll(ATTR)) {
    const at = m.index + m[0].length;
    const line = text.slice(0, m.index).split('\n').length;
    const ch = text[at];
    let names = [];
    if (ch === '"' || ch === "'") {
      const end = text.indexOf(ch, at + 1);
      names = splitPiece(text.slice(at + 1, end), false, false);
    } else if (ch === '{') {
      names = namesInExpression(balanced(text, at));
    }
    for (const name of names) {
      if (/^-?[A-Za-z_][\w-]*$/.test(name)) usages.push({ name, line });
    }
  }
  return usages;
}

export function findUndefined() {
  const defined = new Set();
  for (const file of walk(SRC, (n) => n.endsWith('.css'))) {
    for (const name of cssClassNames(fs.readFileSync(file, 'utf8'))) defined.add(name);
  }
  const offenders = [];
  for (const file of walk(SRC, (n) => /\.jsx?$/.test(n))) {
    const rel = path.relative(ROOT, file);
    for (const { name, line } of jsxClassUsages(fs.readFileSync(file, 'utf8'))) {
      if (!defined.has(name)) offenders.push({ rel, line, name });
    }
  }
  return { defined, offenders };
}

/**
 * 읽는 법이 무너지면 검사가 조용히 «0개» 를 낸다. 알려진 모양 몇 개를 먼저 읽혀 보고 틀리면 멈춘다.
 * (`.a.b` 의 `b` 를 놓쳐 정의된 이름 수백 개를 없는 것으로 읽은 적이 실제로 있다 — 이 검사를 짤 때.)
 */
function selfTest() {
  const css = cssClassNames('.admin-emp-btn.is-primary:hover, .x > .y { color: red; background: url(a.png); width: 1.5em; }');
  const cssWant = ['admin-emp-btn', 'is-primary', 'x', 'y'];
  const cssBad = cssWant.filter((n) => !css.has(n)).concat(['png', '5em'].filter((n) => css.has(n)));

  const jsx = [
    '<button className="admin-btn-primary" />',
    "<div className={`a is-${tone} b${on ? ' is-on' : ''}`} />",
    "<div className={cond ? 'yes' : 'no'} />",
    "<div className={`seg-${i === 0 ? 'top' : 'mid'}`} />",
    "<input className={inputClass('name')} />",
    "<RosterTable tableClassName=\"t\" />",
    "<div className={x === 'done' ? 'c' : ''} />",
  ].join('\n');
  const got = jsxClassUsages(jsx).map((u) => u.name).sort();
  const want = ['a', 'admin-btn-primary', 'b', 'c', 'is-on', 'no', 't', 'yes'].sort();
  const jsxBad = JSON.stringify(got) !== JSON.stringify(want);

  if (cssBad.length > 0 || jsxBad) {
    console.error('[check-undefined-classes] 읽는 법이 무너졌다 — 검사 결과를 믿을 수 없다.');
    if (cssBad.length > 0) console.error(`  CSS 에서 잘못 읽은 이름: ${cssBad.join(', ')}`);
    if (jsxBad) console.error(`  화면 코드에서 읽은 이름: ${got.join(', ')}\n  기대한 이름:            ${want.join(', ')}`);
    process.exit(1);
  }
}

function main() {
  selfTest();
  const { defined, offenders } = findUndefined();
  if (defined.size < 100) {
    console.error(`[check-undefined-classes] 정의된 이름을 ${defined.size}개밖에 못 찾았다 — 검사가 공회전한다.`);
    process.exit(1);
  }
  if (offenders.length > 0) {
    const names = new Set(offenders.map((o) => o.name));
    console.error(`\n[check-undefined-classes] CSS 어디에도 정의되지 않은 이름 ${names.size}개 (${offenders.length}군데):\n`);
    for (const { rel, line, name } of offenders) console.error(`  ${rel}:${line}  ${name}`);
    console.error('\n  정의 없는 이름을 붙인 요소는 모양 없이 브라우저 기본으로 그려진다.');
    console.error('  같은 화면에서 같은 역할을 하는 요소가 이미 쓰는 이름으로 바꾸거나,');
    console.error('  요소를 찾기 위한 표시라면 클래스 대신 data- 속성으로 단다. (PW-991)\n');
    process.exit(1);
  }
  console.log(`[check-undefined-classes] OK — 정의된 이름 ${defined.size}개, 정의 없는 이름 0개`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
