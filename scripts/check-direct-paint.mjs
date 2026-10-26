#!/usr/bin/env node
/**
 * 개발이 화면을 «직접 칠하는» 것을 막는다 — 디자이너가 쓴 줄은 막지 않는다 (2026-10-26 커트 지시).
 *
 * ## 무엇을 막는가
 *
 * - raw-color: CSS·JSX 에 색을 값으로 적는다 (`#2E90FA`, `rgba(…)`). 토큰(`var(--…)`)을 쓴다.
 *   `var(--x, #fff)` 처럼 토큰 뒤에 붙은 기본값, 토큰을 정의하는 줄(`--brand: #2dbd82`)은 안 센다.
 * - raw-spacing: margin·padding·gap 에 px 숫자를 적는다. 줄 사이는 Stack gap, 나머지는 `var(--spacing-*)`.
 * - native-button: 공용 Button 밖에서 `<button className=…>` 으로 버튼을 따로 그린다. 단 붙인 클래스가 전부
 *   디자이너가 CSS 에 정의한 것이면 디자이너 모양을 쓴 것이라 막지 않는다.
 *
 * ## 왜 필요한가 — 실제로 그렇게 쌓였다
 *
 * 2026-10-19~26 한 주에 «디자이너 모양과 달라 다시 고친» pivit-work 커밋이 30건을 넘었다. 버튼 약 80개를
 * hex·검은 바탕으로 따로 칠한 것(86df939ff), 개발이 넣은 색 점(dee087c03), 직접 칠한 드롭다운(c707d0618),
 * 「수습」을 경고 노랑으로 칠한 배지(75631a6d0)가 이 모양이다. 카드 게이트(pivit-work plan-gate.sh)는
 * 카드 없이 대화에서 고친 것을 못 보지만, 이 검사는 push·발행 때 돌아 누가 어디서 고쳤든 걸린다.
 *
 * ## 디자이너는 막지 않는다
 *
 * 걸린 줄마다 `git blame` 으로 그 줄을 쓴 사람을 찾는다. designers.json 의 이메일이면 세지 않는다 —
 * 디자이너가 적은 값은 그 자체가 정본이다. 아직 커밋 안 한 줄은 지금 커밋하는 사람(`git config user.email`)으로 본다.
 * 그래서 디자이너의 push·발행은 이 검사로 막히지 않는다. 개발이 디자이너 값을 복사해 다른 곳에 새로 적으면
 * 걸린다 — 값을 복사하지 말고 디자이너가 만든 클래스·토큰을 가져다 쓴다.
 *
 * 🔴 blame 은 전체 이력이 있어야 맞다. 얕은 clone(CI 기본 fetch-depth 1)에서는 모든 줄이 마지막 커밋
 *    작성자로 잡혀 판정이 통째로 틀린다. 그래서 얕은 clone 이면 판정하지 않고 실패한다(publish.yml 은 fetch-depth 0).
 *
 * ## 이미 있는 줄은 안 센다 — 이 검사가 main 에 들어온 뒤(START)에 개발이 쓴 줄만 센다
 *
 * 켜는 날 개발이 쓴 줄은 3,500줄이 넘었다. 그 줄은 막지 않고, START 뒤에 개발이 «새로 쓰거나 고친» 줄이 하나라도
 * 있으면 실패한다. 개발 줄을 고치면 그 줄은 새 줄이 되니, 손대는 줄부터 토큰·부품으로 바뀐다.
 * 건수 기준 파일을 두지 않은 까닭: 켜는 날 design-page 에 아직 안 합친 카드 작업이 다섯 갈래 있었고, 건수 기준은
 * 그 작업이 합쳐지는 순간 배포를 막았다. 배포 때 모으는 dp-collect.sh 는 cherry-pick 이라 처음 쓴 시각이 남는다 —
 * START 전에 쓴 커밋은 START 뒤에 합쳐져도 통과한다.
 *
 * 실행: npm run check:direct-paint  (lefthook pre-push · publish CI)
 *       node scripts/check-direct-paint.mjs --all      # 바뀐 파일만이 아니라 src 전부
 */
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DESIGNERS = join(root, 'scripts/designers.json');

// 공용 버튼 자신과, 앱이 아니라 미리보기 사이트의 개발 도구는 안 본다.
const SKIP = [/^src\/components\/shared\/Button\.jsx$/, /^src\/devtools\//];

/** `var(…)` 를 통째로 지운다 — 안에 든 기본값(#fff·rgba)은 토큰 뒤의 대비책이라 직접 칠한 것이 아니다. */
export function stripVars(s) {
  let out = s;
  for (;;) {
    const i = out.search(/var\(/);
    if (i < 0) return out;
    let depth = 0, j = i + 3;
    for (; j < out.length; j++) {
      if (out[j] === '(') depth++;
      else if (out[j] === ')') { depth--; if (depth === 0) break; }
    }
    out = out.slice(0, i) + 'var' + out.slice(j + 1);
  }
}

const COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;
const SPACING_PROP = /^(margin|padding)(-(top|bottom|left|right|inline|block)(-(start|end))?)?$|^(row-|column-)?gap$/;
const NONZERO_PX = /(^|[^\d.])(?!0px)(\d*\.?\d+)px\b/;

/** CSS 한 줄에서 걸리는 규칙들. 한 줄짜리 규칙(`.x { color: #f00; }`)도 선언마다 본다. */
export function cssRules(line) {
  const hit = new Set();
  for (const seg of line.replace(/\/\*.*?\*\//g, '').split(/[{};]/)) {
    const m = seg.match(/^\s*([a-zA-Z-]+)\s*:\s*(.+)$/);
    if (!m) continue;
    const [, prop, raw] = m;
    if (prop.startsWith('--')) continue;
    const v = stripVars(raw);
    if (COLOR.test(v)) hit.add('raw-color');
    if (SPACING_PROP.test(prop.toLowerCase()) && NONZERO_PX.test(v)) hit.add('raw-spacing');
  }
  return [...hit];
}

/** JSX 한 줄에서 걸리는 규칙들 (인라인 스타일 값). */
export function jsxLineRules(line) {
  if (/^\s*(\/\/|\*|\/\*)/.test(line)) return [];
  const s = stripVars(line);
  const hit = [];
  if (/['"`]\s*(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/.test(s)) hit.push('raw-color');
  if (/\b(margin|padding)(Top|Bottom|Left|Right|Inline|Block|InlineStart|InlineEnd|BlockStart|BlockEnd)?\s*:\s*['"]?[1-9]\d*(px)?\b|\b(row|column)?[gG]ap\s*:\s*['"]?[1-9]\d*(px)?\b/.test(s)) hit.push('raw-spacing');
  return hit;
}

/** className 값에서 클래스 이름들 — 따옴표·백틱 안의 낱말만 (`cx('a', on && 'b')` → a, b). */
export function classNamesOf(attrs) {
  const m = attrs.match(/\bclassName\s*=\s*("[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\})/);
  if (!m) return [];
  if (!m[1].startsWith('{')) return m[1].slice(1, -1).split(/\s+/).filter((w) => /^[a-zA-Z_][\w-]*$/.test(w));
  // 식이면: 백틱 안의 고정 글자 + 어디에 있든 따옴표 글자(`${on ? 'is-on' : ''}` 안의 것까지)
  const expr = m[1];
  const lits = [...expr.matchAll(/`((?:[^`\\]|\\.)*)`/g)].map((x) => x[1].replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, ' '));
  for (const x of expr.matchAll(/'([^']*)'|"([^"]*)"/g)) lits.push(x[1] ?? x[2]);
  return lits.join(' ').split(/\s+/).filter((w) => /^[a-zA-Z_][\w-]*$/.test(w));
}

/** JSX 파일에서 `<button … className=` 이 시작하는 줄 번호(1부터)와 그 클래스들. 여러 줄에 걸친 태그도 본다. */
export function nativeButtons(text) {
  const out = [];
  const re = /<button\b((?:[^>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*?)>/g;
  let m;
  while ((m = re.exec(text))) {
    if (/\bclassName\s*=/.test(m[1])) out.push({ line: text.slice(0, m.index).split('\n').length, classes: classNamesOf(m[1]) });
  }
  return out;
}
export const nativeButtonLines = (text) => nativeButtons(text).map((b) => b.line);

/** 파일 하나에서 [줄 번호, 규칙] 목록. */
export function scanText(file, text) {
  const hits = [];
  const lines = text.split('\n');
  if (file.endsWith('.css')) {
    let inComment = false;
    lines.forEach((l, i) => {
      let line = l;
      if (inComment) { const e = line.indexOf('*/'); if (e < 0) return; line = line.slice(e + 2); inComment = false; }
      const s = line.indexOf('/*');
      if (s >= 0 && line.indexOf('*/', s) < 0) { inComment = true; line = line.slice(0, s); }
      for (const r of cssRules(line)) hits.push([i + 1, r]);
    });
  } else {
    lines.forEach((l, i) => { for (const r of jsxLineRules(l)) hits.push([i + 1, r]); });
    for (const b of nativeButtons(text)) hits.push([b.line, 'native-button', b.classes]);
  }
  return hits;
}

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(css|jsx)$/.test(e.name)) acc.push(relative(root, p).split(sep).join('/'));
  }
  return acc;
}

const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
/**
 * 이 시각 뒤에 개발이 쓴 줄만 센다 — 이 검사가 main 에 들어온 시각(이 파일을 더한 커밋의 committer 시각).
 * 날짜를 박아 두면 그 날짜와 실제로 합쳐진 날 사이에 쓴 카드 작업이 배포 때 막힌다. 배포 때 모으는 dp-collect.sh 의
 * cherry-pick 은 committer 시각을 «합친 때»로 새로 찍으니, 이 값이 곧 켜진 때다. 시험에서는 DIRECT_PAINT_START.
 */
function startTime() {
  if (process.env.DIRECT_PAINT_START !== undefined) return Number(process.env.DIRECT_PAINT_START);
  const t = git('log', '--diff-filter=A', '--format=%ct', '--', 'scripts/check-direct-paint.mjs').trim().split('\n').pop();
  return t ? Number(t) : Math.floor(Date.now() / 1000);   // 아직 커밋 전이면 지금
}

const refExists = (ref) => { try { git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`); return true; } catch { return false; } };

/**
 * 비교 기준(DIRECT_PAINT_BASE, 없으면 origin/main)에서 갈라진 뒤 바뀐 src 파일 — 커밋 전·git add 전 포함.
 * 기준을 못 찾으면 null(전 파일). CI 는 push 직전 커밋(github.event.before)을 준다.
 */
function changedFiles() {
  // 값이 비었으면(CI 를 손으로 돌린 workflow_dispatch) 전 파일 — origin/main 이 곧 HEAD 라 비교할 차이가 없다.
  const base = process.env.DIRECT_PAINT_BASE ?? 'origin/main';
  if (!base || !/^[0-9a-zA-Z/._-]+$/.test(base) || /^0+$/.test(base) || !refExists(base)) return null;
  const mb = git('merge-base', 'HEAD', base).trim();
  const out = git('diff', '--name-only', mb, '--', 'src') + git('ls-files', '--others', '--exclude-standard', 'src');
  return new Set(out.split('\n').filter(Boolean));
}

/**
 * 파일 전체를 blame 해 줄 번호 → [쓴 사람 이메일, 쓴 시각]. 커밋 안 한 줄은 지금 커밋하는 사람·지금.
 * 🔴 걸린 줄만 `-L` 로 부르면 빠르지만 줄 옮김(-M)을 그 범위 안에서만 찾는다 — 개발이 디자이너 줄을 «옮기기만» 해도
 *    개발 줄로 잡혀 디자이너 값이 막혔다(manager.css 의 `padding: 60px 0`, 2026-10-26 실측). 그래서 파일 전체를 본다.
 */
const blameCache = new Map();
function blameLines(file, me) {
  if (blameCache.has(file)) return blameCache.get(file);
  const out = git('blame', '-w', '-M', '--line-porcelain', '--', file);
  const lines = new Map();
  let mail = null, time = 0, final = 0;
  for (const l of out.split('\n')) {
    const h = l.match(/^[0-9a-f]{40} \d+ (\d+)/);
    if (h) final = Number(h[1]);
    else if (l.startsWith('author-mail ')) mail = l.slice(12).replace(/[<>]/g, '').trim().toLowerCase();
    else if (l.startsWith('author-time ')) time = Number(l.slice(12));
    else if (l.startsWith('\t')) lines.set(final, mail === 'not.committed.yet' ? [me, Infinity] : [mail, time]);
  }
  blameCache.set(file, lines);
  return lines;
}

/**
 * 이 클래스를 디자이너가 CSS 에 정의했나. 버튼에 이런 클래스만 붙였으면 디자이너 모양을 쓴 것이라 막지 않는다.
 * 그 클래스가 선택자에 나오는 CSS 파일만 blame 한다(CSS 전부를 blame 하면 1분이 넘는다).
 */
const designerClassCache = new Map();
let cssFiles = null;
function isDesignerClass(cls, designers, me) {
  if (designerClassCache.has(cls)) return designerClassCache.get(cls);
  cssFiles ??= walk(join(root, 'src')).filter((f) => f.endsWith('.css')).map((f) => [f, readFileSync(join(root, f), 'utf8').split('\n')]);
  const re = new RegExp(`\\.${cls.replace(/[-]/g, '\\-')}(?![\\w-])`);
  let yes = false;
  for (const [file, lines] of cssFiles) {
    for (let i = 0; i < lines.length && !yes; i++) {
      const l = lines[i];
      const sel = l.includes('{') ? l.slice(0, l.indexOf('{')) : l.includes(':') ? '' : l;   // 선언 줄은 선택자가 아니다
      if (!re.test(sel)) continue;
      let who;
      try { who = blameLines(file, me); } catch { who = null; }   // 아직 커밋 안 한 파일 — 지금 쓰는 사람 것
      yes = designers.has(who ? who.get(i + 1)?.[0] : me);
    }
    if (yes) break;
  }
  designerClassCache.set(cls, yes);
  return yes;
}

/**
 * (파일 → 규칙 → START 뒤에 개발이 쓴 줄 번호들).
 * 평소에는 비교 기준에서 갈라진 뒤 바뀐 파일만 blame 한다 — blame 이 이 검사의 거의 모든 시간이다(전 파일 1분).
 * 안 바뀐 파일의 새 줄은 그 줄이 들어올 때 이미 이 검사를 거쳤다.
 */
export function collect({ all = false } = {}) {
  if (git('rev-parse', '--is-shallow-repository').trim() === 'true') {
    console.error('✗ [check:direct-paint] 얕은 clone 이라 누가 쓴 줄인지 알 수 없다 — 모든 줄이 마지막 커밋 작성자로 잡힌다.');
    console.error('  CI 는 actions/checkout 에 fetch-depth: 0 을 준다. 로컬이면 git fetch --unshallow.');
    process.exit(2);
  }
  const designers = new Set(JSON.parse(readFileSync(DESIGNERS, 'utf8')).emails.map((e) => e.toLowerCase()));
  let me = '';
  try { me = git('config', 'user.email').trim().toLowerCase(); } catch { /* 이메일이 없으면 개발로 본다 */ }
  const tracked = new Set(git('ls-files', 'src').split('\n'));
  const changed = all ? null : changedFiles();
  const START = startTime();
  const result = {};
  for (const file of walk(join(root, 'src'))) {
    if (SKIP.some((r) => r.test(file))) continue;
    if (changed && !changed.has(file)) continue;
    const hits = scanText(file, readFileSync(join(root, file), 'utf8'));
    if (!hits.length) continue;
    const who = tracked.has(file) ? blameLines(file, me) : null;
    for (const [n, rule, classes] of hits) {
      const [mail, time] = who?.get(n) ?? [me, Infinity];
      if (designers.has(mail) || time < START) continue;
      // 디자이너가 정의한 클래스만 붙인 버튼은 디자이너 모양을 쓴 것이다
      if (rule === 'native-button' && classes.length && classes.every((c) => isDesignerClass(c, designers, me))) continue;
      ((result[file] ??= {})[rule] ??= []).push(n);
    }
  }
  return result;
}

function main() {
  const now = collect({ all: process.argv.includes('--all') });
  const rows = Object.entries(now).flatMap(([f, rs]) => Object.entries(rs).map(([r, ns]) => ({ f, r, ns })));
  if (!rows.length) {
    console.log('[check:direct-paint] 통과 — 개발이 새로 직접 칠한 줄이 없다');
    return;
  }
  const why = { 'raw-color': '색을 값으로 적었다 → var(--…) 토큰', 'raw-spacing': '간격을 px 로 적었다 → Stack gap · var(--spacing-*)', 'native-button': '버튼을 따로 그렸다 → 공용 Button' };
  console.error('✗ [check:direct-paint] 개발이 화면을 직접 칠한 줄이 있다 — 디자이너가 만든 클래스·토큰·부품을 쓴다');
  for (const { f, r, ns } of rows) console.error(`  ${f} · ${why[r]} (줄 ${ns.join(', ')})`);
  console.error('  같은 용도의 디자이너 원본은 pivit-work .claude/skills/ticket-work/ui-check.md 정본표에서 찾는다.');
  console.error('  디자이너가 쓴 줄은 세지 않는다(scripts/designers.json). 옛 개발 줄을 고쳤다면 그 줄도 이번에 토큰·부품으로 바꾼다.');
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
