#!/usr/bin/env node
/**
 * src/ 최상위 스타일시트가 전부 package.json 의 `exports` 에 실려 있는지 검사한다.
 *
 * 왜 필요한가: design-page 자기 App.jsx 는 `import './okr_resource.css'` 로 상대경로
 * 직행이라, exports 에 안 실려도 design-page 안에서는 멀쩡히 보인다. 반면 소비자
 * (pivit-work)는 `@pivit-work/design-page/styles/...` 로만 닿을 수 있어서, 누락되면
 * 그 CSS 에 접근할 경로 자체가 없다 — 화면이 스타일 없이 렌더된다. 새 CSS 파일이
 * 생길 때마다 반복된 실수라 자동 검사로 못박는다. (PW-294)
 *
 * 실행: npm run check:exports  (lefthook pre-push · publish CI 에서 자동 실행)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const exportsMap = pkg.exports ?? {};

const exportedTargets = new Set(
  Object.values(exportsMap)
    .filter((target) => typeof target === 'string' && target.endsWith('.css')),
);

const cssFiles = readdirSync(join(root, 'src'))
  .filter((name) => name.endsWith('.css'))
  .map((name) => `./src/${name}`)
  .sort();

const missing = cssFiles.filter((file) => !exportedTargets.has(file));
const dangling = [...exportedTargets]
  .filter((target) => !existsSync(join(root, target)))
  .sort();

const problems = [];

if (missing.length > 0) {
  problems.push(
    `exports 에 빠진 스타일시트 ${missing.length}건 — 소비자가 import 할 경로가 없습니다:\n` +
      missing
        .map((file) => {
          const key = `./styles/${file.replace('./src/', '').replace(/_/g, '-')}`;
          return `  package.json 의 "exports" 에 추가: "${key}": "${file}"`;
        })
        .join('\n'),
  );
}

if (dangling.length > 0) {
  problems.push(
    `exports 가 가리키는 파일이 없습니다 ${dangling.length}건:\n` +
      dangling.map((target) => `  ${target}`).join('\n'),
  );
}

if (problems.length > 0) {
  console.error(`\n[check:exports] 실패\n\n${problems.join('\n\n')}\n`);
  process.exit(1);
}

console.log(`[check:exports] OK — src/*.css ${cssFiles.length}건 모두 exports 에 있습니다.`);
