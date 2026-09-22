#!/usr/bin/env node
/**
 * CSS 에 글씨체 이름을 직접 적지 않았는지, 미리보기 사이트가 그 이름을 불러오는지 검사한다 (PW-923).
 *
 * 왜 필요한가: 글씨체는 디자인 기준값 `--font-family-body` / `--font-family-display`
 * (디자이너 tokens.css 의 `Pretendard`) 하나에서 정해진다. 그런데 어드민·평가 화면을
 * 옮겨 만들면서 기획서 시안의 `'DM Mono', monospace`·`'Pretendard', 'Noto Sans KR'` 이
 * CSS 66줄에 따라 들어왔다. DM Mono 는 어디서도 불러오지 않아 실제로는 Courier(타자기체)로
 * 그려졌고, 아무 검사도 이것을 보지 않았다. JSX 쪽은 eslint 규칙
 * (eslint-rules/no-literal-font-family.js)이 막고, CSS 는 이 스크립트가 막는다.
 *
 * 허용하는 값:
 *   - `inherit`, `var(--font-family-body)`, `var(--font-family-display)` (폴백 `inherit` 까지)
 *   - 디자이너가 적은 줄: SUIT 자리(`'SUIT', var(--font-family-body)` — one_on_one.css·manager.css)와
 *     기준값 폴백 표기(`var(--font-family-display, 'Pretendard', sans-serif)`)
 * src/devtools/ 는 미리보기 사이트의 개발 도구 창이라 화면이 아니어서 뺀다.
 *
 * 실행: npm run check:font-families  (lefthook pre-push · publish CI 에서 자동 실행)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ALLOWED = [
  /^inherit$/,
  /^var\(--font-family-(body|display)\)$/,
  /^var\(--font-family-(body|display), (inherit|'Pretendard', sans-serif)\)$/,
];
const SUIT = /^'SUIT', var\(--font-family-body\)$/;
const SUIT_FILES = new Set(['src/one_on_one.css', 'src/manager.css']);

/** 미리보기 index.html 이 불러오는 글꼴 CSS 와 그 파일이 등록하는 이름 (2026-09-23 CDN 에서 확인). */
const FONT_STYLESHEETS = {
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css': ['Pretendard'],
  'https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2.0.5/fonts/static/woff2/SUIT.css': ['SUIT'],
};

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'devtools') continue;
      walk(full, out);
    } else if (entry.name.endsWith('.css')) {
      out.push(full);
    }
  }
  return out;
}

const problems = [];

for (const file of walk(join(root, 'src'))) {
  const rel = relative(root, file).split(sep).join('/');
  const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  for (const m of css.matchAll(/(?:^|[;{\s])(font-family|font)\s*:\s*([^;}]+)/g)) {
    const [, prop, raw] = m;
    const value = raw.trim();
    const line = css.slice(0, m.index).split('\n').length;
    if (prop === 'font') {
      if (value !== 'inherit') problems.push(`${rel}:${line}  font: ${value}`);
      continue;
    }
    if (ALLOWED.some((re) => re.test(value))) continue;
    if (SUIT.test(value) && SUIT_FILES.has(rel)) continue;
    problems.push(`${rel}:${line}  font-family: ${value}`);
  }
}

const html = readFileSync(join(root, 'index.html'), 'utf8');
const links = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
const unknown = links.filter((href) => href.startsWith('http') && !(href in FONT_STYLESHEETS));
if (unknown.length) {
  problems.push(`index.html 이 등록 이름을 모르는 CSS 를 불러옵니다 — FONT_STYLESHEETS 에 적으세요:\n  ${unknown.join('\n  ')}`);
}
const registered = new Set(links.flatMap((href) => FONT_STYLESHEETS[href] ?? []));
for (const name of ['Pretendard', 'SUIT']) {
  if (!registered.has(name)) problems.push(`index.html 이 '${name}' 을 등록하는 글꼴 CSS 를 불러오지 않습니다`);
}

if (problems.length) {
  console.error(
    `글씨체 검사 실패 ${problems.length}건 (PW-923) — 글씨체는 var(--font-family-body) 를 쓰고,\n` +
      `자릿수를 맞출 숫자는 font-variant-numeric: tabular-nums 를 쓴다:\n\n  ${problems.join('\n  ')}`,
  );
  process.exit(1);
}
console.log('글씨체 검사 통과 — CSS 에 직접 적은 글씨체 이름 없음, 미리보기가 Pretendard·SUIT 를 불러옴');
