#!/usr/bin/env node
/**
 * 쌓기 틀 `Stack` 이 «줄 사이는 틀이 띄운다»를 지키는지, 그리고 옮긴 칸이 다시 손 여백으로 돌아가지 않았는지 본다.
 *
 * ## 왜 필요한가
 *
 * 줄마다 위·아래 여백을 따로 적던 칸에 새 줄을 넣으면서 여백을 빼먹는 일이 되풀이됐다. 리마인더 편집 창의
 * 「일수를 바꿔 채널이 바뀌었습니다」 주황 줄이 바깥 여백 0 인 공용 안내 상자를 그대로 써서 위 입력줄에
 * 붙었고(2026-10-23), 같은 영역의 「회사 전체 리마인더 꺼짐」 경고도 같은 까닭으로 붙었었다(PW-1706).
 * 간격은 그려 봐야 보여서 eslint 도 소비자 유닛 테스트(jsdom 은 위치를 계산하지 않는다)도 모른다.
 *
 * ## 판정
 *
 * 1. stack.css — `.dp-stack` 이 세로 flex 이고, 줄의 위·아래 여백을 지우며, 간격 단계마다 디자인 간격 값
 *    (`var(--spacing-*)`)만 쓴다. stackGaps.js 의 STACK_GAPS 와 단계가 하나도 어긋나지 않는다.
 * 2. 배럴이 Stack 을 export 하고 index.css 가 stack.css 를 끌어온다 — 빠지면 소비자는 쓸 수 없거나 간격 없이 그려진다.
 * 3. JSX 의 `<Stack gap="…">` 이 STACK_GAPS 밖의 값을 쓰지 않는다 — 모르는 값은 조용히 기본값(md)이 된다.
 * 4. MIGRATED 의 칸이 지금도 `<Stack … testId=…>` 로 그려진다 — 누가 `<div>` 로 되돌리면 실패한다.
 * 5. 공용 안내 상자(`evx-notice`)에 `style` 로 여백을 붙이지 않는다. 바깥 여백 0 인 상자에 손 여백을 붙여 맞추던
 *    곳이 여섯이었고, 그중 평가 진행 현황의 「진행 멈춤」은 카드 목록의 간격(16px)에 손 여백 12px 가 더해져
 *    아래가 28px 로 벌어져 있었다. 간격은 놓인 칸(Stack · 카드 목록)이 준다.
 *
 * MIGRATED 에 줄을 더하는 것은 칸을 Stack 으로 옮겼을 때다. 한꺼번에 옮기지 않고 손대는 칸부터 옮긴다
 * (여백 설정이 이 저장소에 1,161곳이다 · 2026-10-23).
 *
 * 실행: npm run check:stacks  (lefthook pre-push · publish CI 에서 자동 실행)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

/** 옮긴 칸 — 파일 → 그 칸의 testId 앞부분(템플릿이면 `${` 앞까지). */
export const MIGRATED = [
  // 리마인더 편집 창 「언제 · 어느 채널로」 — 주황 안내 줄이 입력줄에 붙었다 (2026-10-23)
  { file: 'src/components/eval/EvalCycleWizard.jsx', testId: 'evc-rm-dsec-when-' },
  // 조직장 평가 작성 — 잠김·제출됨·자동저장 실패 안내가 줄마다 손 여백(12px)을 달고 있었다 (2026-10-23)
  { file: 'src/components/eval/EvalCycleLeaderCanvas.jsx', testId: 'evl-notices' },
];

const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** CSS 글에서 `selector { … }` 블록의 선언을 { 속성: 값 } 으로. */
export function declarations(css, selector) {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = stripComments(css).match(new RegExp(`(^|[}\\s])${esc}\\s*\\{([^}]*)\\}`, 'm'));
  if (!m) return null;
  const out = {};
  for (const part of m[2].split(';')) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim().replace(/\s+/g, ' ');
  }
  return out;
}

/** stackGaps.js 글에서 STACK_GAPS 배열. */
export function stackGaps(jsx) {
  const m = jsx.match(/STACK_GAPS\s*=\s*\[([^\]]*)\]/);
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : null;
}

/** 1. stack.css 판정. */
export function checkStackCss(css, gaps) {
  const errors = [];
  const base = declarations(css, '.dp-stack');
  if (!base || base.display !== 'flex' || base['flex-direction'] !== 'column') {
    errors.push('stack.css: .dp-stack 이 display:flex · flex-direction:column 이 아니다');
  }
  const child = declarations(css, '.dp-stack > *');
  if (!child || !/^0( 0)? !important$/.test(child['margin-block'] ?? '')) {
    errors.push('stack.css: .dp-stack > * 가 줄의 위·아래 여백을 지우지 않는다 (margin-block: 0 !important)');
  }
  const seen = [...stripComments(css).matchAll(/\.dp-stack--gap-([a-z0-9]+)\s*\{([^}]*)\}/g)];
  for (const [, name, body] of seen) {
    if (!gaps.includes(name)) errors.push(`stack.css: .dp-stack--gap-${name} 는 STACK_GAPS 에 없다`);
    const v = body.match(/gap\s*:\s*([^;]+)/)?.[1].trim();
    if (v !== `var(--spacing-${name})`) {
      errors.push(`stack.css: .dp-stack--gap-${name} 의 gap 이 var(--spacing-${name}) 가 아니다 (${v ?? '없음'})`);
    }
  }
  const names = seen.map((x) => x[1]);
  for (const g of gaps) if (!names.includes(g)) errors.push(`stack.css: STACK_GAPS 의 ${g} 단계 규칙이 없다`);
  return errors;
}

/** 3. JSX 한 파일의 `<Stack gap="…">` 값 판정. */
export function checkGapUsage(rel, jsx, gaps) {
  const errors = [];
  for (const m of jsx.matchAll(/<Stack\b([^>]*)>/g)) {
    const g = m[1].match(/\bgap=(?:"([^"]*)"|\{'([^']*)'\})/);
    const v = g && (g[1] ?? g[2]);
    if (v != null && !gaps.includes(v)) errors.push(`${rel}: <Stack gap="${v}"> — 쓸 수 있는 값은 ${gaps.join(' · ')}`);
  }
  return errors;
}

/** 4. 옮긴 칸이 아직 Stack 인지. */
export function checkMigrated(entry, jsx) {
  const tags = [...jsx.matchAll(/<([A-Za-z][\w.]*)\b([^>]*)>/g)];
  const hit = tags.find(([, , attrs]) => attrs.includes(entry.testId));
  if (!hit) return [`${entry.file}: 옮긴 칸 ${entry.testId}… 을 찾을 수 없다`];
  if (hit[1] !== 'Stack') return [`${entry.file}: 옮긴 칸 ${entry.testId}… 이 <Stack> 이 아니라 <${hit[1]}> 이다`];
  return [];
}

/** 5. JSX 한 파일에서 `evx-notice` 상자에 `style` 로 margin 을 붙인 곳. */
export function checkNoticeInlineMargin(rel, jsx) {
  const errors = [];
  for (const m of jsx.matchAll(/<[A-Za-z]+\b[^>]*?className=(?:"[^"]*"|\{[^}]*\})[^>]*>/g)) {
    const tag = m[0];
    if (!/\bevx-notice\b/.test(tag)) continue;
    if (/style=\{\{[^}]*\bmargin/.test(tag)) {
      const line = jsx.slice(0, m.index).split('\n').length;
      errors.push(`${rel}:${line}: 안내 상자(evx-notice)에 style 로 여백을 붙였다 — 놓인 칸을 Stack 으로 바꿔 간격을 준다`);
    }
  }
  return errors;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'devtools') walk(full, out);
    } else if (/\.(jsx|tsx)$/.test(entry.name)) {
      out.push(relative(root, full).split(sep).join('/'));
    }
  }
  return out;
}

export function runAll() {
  const gaps = stackGaps(read('src/components/shared/stackGaps.js'));
  if (!gaps) return ['stackGaps.js: STACK_GAPS 를 찾을 수 없다'];
  const errors = [...checkStackCss(read('src/stack.css'), gaps)];
  if (!/export\s*\{\s*default as Stack\b/.test(read('src/components/index.js'))) {
    errors.push('components/index.js: Stack 을 export 하지 않는다');
  }
  if (!/@import\s+['"]\.\/stack\.css['"]/.test(read('src/index.css'))) {
    errors.push('index.css: stack.css 를 끌어오지 않는다');
  }
  for (const rel of walk(join(root, 'src'))) {
    errors.push(...checkGapUsage(rel, read(rel), gaps), ...checkNoticeInlineMargin(rel, read(rel)));
  }
  for (const entry of MIGRATED) errors.push(...checkMigrated(entry, read(entry.file)));
  return errors;
}

function main() {
  const errors = runAll();
  if (errors.length) {
    console.error(`✗ 쌓기 틀 검사 실패 ${errors.length}건\n`);
    for (const e of errors) console.error(`  - ${e}`);
    console.error('\n  줄 사이 간격은 Stack 의 gap 하나로 정한다 — src/components/shared/Stack.jsx 머리말');
    process.exit(1);
  }
  console.log(`✓ 쌓기 틀 검사 통과 (옮긴 칸 ${MIGRATED.length}곳)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
