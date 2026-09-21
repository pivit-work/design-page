#!/usr/bin/env node
/**
 * 화면이 탭 줄·창을 **따로 그리지 못하게** 막는다 (PW-836).
 *
 * ## 무엇을 막는가
 *
 * 이 저장소에는 여러 화면이 같이 쓰라고 만든 탭 줄(`shared/Tabs`·`shared/SegmentedControl`)과
 * 창 틀(`shared/ModalShell`·`shared/ConfirmModal`)이 있다. 두 부품의 주석에 「항상 이 컴포넌트를
 * 사용한다. 새로 만들지 말 것」이라고 적혀 있었지만 막는 것이 없어서, 2026-09 에 세어 보니
 * 공용 탭을 쓰는 화면은 타임라인·리포트 둘, 공용 창 틀을 쓰는 화면은 평가·타임라인 둘뿐이었다.
 * 나머지는 화면마다 탭과 창을 새로 그려 높이·간격·선택 표시가 제각각이었고, 창 뒤를 가리는
 * 막이 왼쪽 메뉴까지 덮는가를 화면 수만큼 따로 겪었다(PW-802 등).
 *
 * 그래서 아래 화면 폴더의 파일에서 네 가지를 센다 — 공용 부품 안에서만 나와야 하는 표시다.
 *
 *   tablist   `role="tablist"`                       → 공용 Tabs / SegmentedControl
 *   dialog    `role="dialog"`·`"alertdialog"`·`aria-modal` → 공용 ModalShell / ConfirmModal
 *   overlay   `…-overlay`·`…-backdrop`·`…-scrim` 으로 끝나는 클래스 이름 — role 을 안 달고
 *             막부터 그린 창도 잡으려고 본다
 *   tabclass  `…-tabs`·`…-tabbar`·`…-subtabs`·`…-viewtabs`·`tabs-row` 클래스 이름 — role 없이
 *             버튼을 늘어놓아 그린 탭 줄(OKR 하위 탭 등)을 잡는다. 공용 Tabs 의 `tl-` 이름은 뺀다
 *
 * ## 예외 목록 (`shared-frames-exceptions.json`)
 *
 * 공용 틀이 없는 종류(옆에서 미끄러져 나오는 패널, 떠 있는 작은 창)는 파일·종류·개수·사유로
 * 올린다. 개수가 **목록보다 많아도, 적어도** 실패한다 — 적어졌으면 목록도 줄여야 목록이
 * 「줄어들기만 한다」는 약속이 지켜진다.
 *
 * 소비자(pivit-work)는 설치된 이 패키지에 같은 함수를 돌리는 테스트를 둔다
 * (`frontend/src/designPageSharedFrames.guard.test.ts`) — 여기 푸시 전 검사를 건너뛰고
 * 나간 릴리스도 거기서 걸린다.
 *
 * 실행: `npm run check:shared-frames` (pre-push 훅, publish 워크플로)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** 검사하는 화면 폴더 (`src/components/` 아래). 타임라인은 이 카드의 «견줄 곳»이라 아직 뺀다. */
export const SCREEN_DIRS = [
  'admin',
  'eval',
  'manager',
  'meetings',
  'myprofile',
  'okr',
  'oneonone',
  'orgchart',
  'report',
  'resource',
  'settings',
];

const KINDS = {
  tablist: [/role=["']tablist["']/g, /role=\{[^}]*['"]tablist['"][^}]*\}/g],
  dialog: [
    /role=["'](?:alert)?dialog["']/g,
    /role=\{[^}]*['"](?:alert)?dialog['"][^}]*\}/g,
    /aria-modal(?=[\s=>/])/g,
  ],
};

const CLASS_ATTR = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\}|\{"([^"]*)"\})/g;
const OVERLAY_TOKEN = /-(?:overlay|backdrop|scrim)$/;
const TAB_TOKEN = /^(?!tl-)(?:.+-(?:tabs|tabbar|subtabs|viewtabs)|tabs-row)$/;

/** 주석은 빼고 센다 — 「왜 이렇게 했나」를 적은 글에 aria-modal 이 나와도 걸리면 안 된다. */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

/** 파일 한 개의 글에서 종류별 개수를 센다. */
export function scanText(text) {
  const body = stripComments(text);
  const counts = { tablist: 0, dialog: 0, overlay: 0, tabclass: 0 };
  for (const [kind, patterns] of Object.entries(KINDS)) {
    for (const re of patterns) counts[kind] += [...body.matchAll(re)].length;
  }
  // 클래스 이름은 **소문자 태그**(= 화면이 직접 그린 요소)에 붙은 것만 센다. 공용 부품에 변형
  // 이름을 넘기는 것(`<SegmentedControl className="evs-exec-tabs">`)은 공용 틀을 쓴 것이다.
  for (const tag of body.matchAll(/<([a-z][\w-]*)(?=[\s/>])/g)) {
    const region = attrRegion(body, tag.index + tag[1].length + 1);
    for (const m of region.matchAll(CLASS_ATTR)) {
      const raw = m[1] ?? m[2] ?? m[3] ?? m[4] ?? '';
      for (const token of raw.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/)) {
        if (!token) continue;
        if (OVERLAY_TOKEN.test(token)) counts.overlay += 1;
        if (TAB_TOKEN.test(token)) counts.tabclass += 1;
      }
    }
  }
  return counts;
}

/**
 * 여는 태그의 속성 구간을 잘라 낸다 (`check-classnames.mjs` 와 같은 방식).
 * 속성에 화살표 함수(`onClick={() => …}`)가 있으면 그 `>` 에서 끊기지 않게 중괄호·따옴표를 센다.
 */
function attrRegion(text, start) {
  let depth = 0;
  let quote = null;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (ch === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === '>' && depth <= 0) return text.slice(start, i);
  }
  return text.slice(start);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.jsx?$/.test(entry.name) && !/\.test\.jsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

export function loadExceptions(file = path.join(HERE, 'shared-frames-exceptions.json')) {
  return JSON.parse(fs.readFileSync(file, 'utf8')).exceptions;
}

/**
 * `srcRoot`(= 패키지의 `src`) 아래 화면 폴더를 훑어 예외 목록과 어긋나는 자리를 돌려준다.
 * 반환: [{ file, kind, found, allowed }] — 비어 있으면 통과.
 */
export function findSharedFrameViolations(srcRoot, exceptions = loadExceptions()) {
  const allowed = new Map();
  for (const ex of exceptions) allowed.set(`${ex.file}::${ex.kind}`, ex.count);

  const seen = new Set();
  const out = [];
  for (const dir of SCREEN_DIRS) {
    for (const full of walk(path.join(srcRoot, 'components', dir))) {
      const file = path.relative(srcRoot, full).split(path.sep).join('/');
      const counts = scanText(fs.readFileSync(full, 'utf8'));
      for (const [kind, found] of Object.entries(counts)) {
        const key = `${file}::${kind}`;
        const limit = allowed.get(key) ?? 0;
        if (allowed.has(key)) seen.add(key);
        if (found !== limit) out.push({ file, kind, found, allowed: limit });
      }
    }
  }
  // 파일이 사라졌거나 폴더가 범위에서 빠진 예외 — 목록에 남겨 두면 다음 사람이 그 자리를 빈칸으로 쓴다.
  for (const key of allowed.keys()) {
    if (seen.has(key)) continue;
    const [file, kind] = key.split('::');
    if (!out.some((o) => o.file === file && o.kind === kind)) {
      out.push({ file, kind, found: 0, allowed: allowed.get(key) });
    }
  }
  return out;
}

function main() {
  const src = path.resolve(HERE, '..', 'src');
  const violations = findSharedFrameViolations(src);
  if (violations.length > 0) {
    console.error('\n[check-shared-frames] 화면이 탭 줄·창을 따로 그린 자리가 예외 목록과 어긋난다:\n');
    for (const v of violations) {
      console.error(`  ${v.file} — ${v.kind}: ${v.found}곳 (예외 목록 ${v.allowed})`);
    }
    console.error('\n  늘었으면: 탭 줄은 shared/Tabs(좌우 전환은 SegmentedControl), 창은 shared/ModalShell');
    console.error('  (짧은 확인은 ConfirmModal)로 그린다. 줄었으면: scripts/shared-frames-exceptions.json 의');
    console.error('  그 줄을 줄이거나 지운다 — 목록은 줄어들기만 한다. (PW-836)\n');
    process.exit(1);
  }
  console.log(`[check-shared-frames] OK — 화면 폴더 ${SCREEN_DIRS.length}곳, 예외 목록 밖 탭·창 0건`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
