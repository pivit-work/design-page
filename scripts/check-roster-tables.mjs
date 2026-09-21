#!/usr/bin/env node
/**
 * 어드민·평가 화면이 명단 표를 **따로 그리지 못하게** 막는다 (PW-839).
 *
 * ## 무엇을 막는가
 *
 * 머리 행이 있고 한 줄에 한 사람(또는 한 건)이 오는 «명단 표»를 어드민·평가 화면이 화면마다
 * `<table>` 부터 새로 그려서, 2026-09 에 세어 보니 11개 화면에 17벌이 있었다. 줄 높이·머리 행
 * 색·구분선·열이 넘칠 때의 처리가 표마다 조금씩 달랐고 한 곳을 고쳐도 나머지는 그대로였다.
 * 그래서 공용 부품 `shared/RosterTable` 을 두고, 아래 화면 폴더에서는 표를 이루는 소문자 태그
 * (`<table>`·`<thead>`·`<tbody>`·`<tfoot>`·`<tr>`·`<th>`·`<td>`)가 **한 번도** 나오지 않게 한다.
 * 표의 칸·줄도 `RosterTable.Row`·`RosterTable.Cell` 같은 조각으로 쓴다.
 *
 * 예외 목록은 두지 않는다 — 옮기지 못한 표가 하나도 없이 시작했기 때문이다. 공용 부품으로 안
 * 되는 표가 생기면 목록을 만들기 전에 부품을 넓힌다.
 *
 * 소비자(pivit-work)는 설치된 이 패키지에 같은 함수를 돌리는 테스트를 둔다
 * (`frontend/src/designPageRosterTables.guard.test.ts`) — 여기 푸시 전 검사를 건너뛰고
 * 나간 릴리스도 거기서 걸린다.
 *
 * 실행: `npm run check:roster-tables` (pre-push 훅, publish 워크플로)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * 검사하는 화면 폴더 (`src/components/` 아래). 디자이너를 기다리지 않고 개발이 만드는 화면
 * 둘이다 — 다른 폴더는 디자이너 원본이라 이 카드가 손대지 않았다.
 */
export const SCREEN_DIRS = ['admin', 'eval'];

/** 표를 이루는 태그. 뒤가 공백·`>`·`/` 여야 한다 — `<thead` 가 `<th` 로 두 번 세이지 않게. */
export const TABLE_TAGS = ['table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td'];
const TAG_RE = new RegExp(`<(${TABLE_TAGS.join('|')})(?=[\\s/>])`, 'g');

/** 주석은 빼고 센다 — 「예전엔 <table> 로 그렸다」 같은 설명 글이 걸리면 안 된다. */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

/** 파일 한 개의 글에서 표 태그 개수를 센다. */
export function scanText(text) {
  return [...stripComments(text).matchAll(TAG_RE)].length;
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

/**
 * `srcRoot`(= 패키지의 `src`) 아래 화면 폴더를 훑어 표를 따로 그린 파일을 돌려준다.
 * 반환: [{ file, found }] — 비어 있으면 통과.
 */
export function findRosterTableViolations(srcRoot) {
  const out = [];
  for (const dir of SCREEN_DIRS) {
    for (const full of walk(path.join(srcRoot, 'components', dir))) {
      const found = scanText(fs.readFileSync(full, 'utf8'));
      if (found > 0) out.push({ file: path.relative(srcRoot, full).split(path.sep).join('/'), found });
    }
  }
  return out;
}

function main() {
  const src = path.resolve(HERE, '..', 'src');
  const violations = findRosterTableViolations(src);
  if (violations.length > 0) {
    console.error('\n[check-roster-tables] 어드민·평가 화면이 표를 따로 그렸다:\n');
    for (const v of violations) console.error(`  ${v.file} — 표 태그 ${v.found}개`);
    console.error('\n  shared/RosterTable 로 그린다 — 열 목록(columns)을 넘기거나, 줄·칸을');
    console.error('  RosterTable.Head / HeadCell / Row / Cell 조각으로 늘어놓는다. (PW-839)\n');
    process.exit(1);
  }
  console.log(`[check-roster-tables] OK — 화면 폴더 ${SCREEN_DIRS.length}곳, 따로 그린 표 0건`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
