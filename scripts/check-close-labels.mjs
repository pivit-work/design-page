#!/usr/bin/env node
/**
 * 창 오른쪽 위 닫기 X 의 이름(`closeLabel` — 화면 읽기 프로그램·자동 시험이 부르는 이름)에 [취소]·[계속 작성] 같은
 * 아래 버튼 문구를 넘기지 않았는지 본다.
 *
 * 왜 필요한가: X 와 아래 [취소]가 둘 다 «취소»로 읽혀 화면 읽기 프로그램·자동 시험이 둘을 가르지 못했다.
 * «개인정보를 변경합니다» 창에서 찾았고(pivit-work PW-2744 · 2026-11-12), 같은 식으로 X 에 취소 문구를
 * 넘긴 창이 스무 곳 넘게 있었다. 공용 확인 창은 X 를 «닫기»로 부른다(pivit-work PW-2705).
 * X 는 창을 닫는 버튼이니 이름은 «닫기» 계열 문구(`L.close` 등)로 넘긴다.
 *
 * 무엇을 막나: `closeLabel={…}` 식 안에 cancel · Cancel · leaveStay 낱말이나 '취소' 글자가 있으면 실패.
 * 식만 보므로 닫기 문구를 담은 키 이름에 cancel 이 들어가면 걸린다 — 그때는 키 이름을 close 로 짓는다.
 *
 * 실행: npm run check:close-labels  (lefthook pre-push · publish CI 에서 자동 실행)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BAD = /cancel|Cancel|leaveStay|취소/;

/** 글에서 `closeLabel={식}` · `closeLabel="글"` 을 찾아 { line, expr } 로. 중괄호 짝을 센다. */
export function closeLabelExprs(src) {
  const out = [];
  const re = /closeLabel\s*=\s*/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length;
    let expr = '';
    if (src[i] === '{') {
      let depth = 0;
      const start = i;
      for (; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}' && --depth === 0) break;
      }
      expr = src.slice(start + 1, i);
    } else if (src[i] === '"' || src[i] === "'") {
      const q = src[i];
      const end = src.indexOf(q, i + 1);
      expr = src.slice(i, end + 1);
    } else continue;
    out.push({ line: src.slice(0, m.index).split('\n').length, expr: expr.trim() });
  }
  return out;
}

export function badCloseLabels(src) {
  return closeLabelExprs(src).filter((e) => BAD.test(e.expr));
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(jsx?|tsx?)$/.test(name) && !/\.test\./.test(name)) acc.push(p);
  }
  return acc;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fails = [];
  for (const file of walk(join(root, 'src'))) {
    // 주석 안의 예시(`@param closeLabel=…`)는 세지 않는다
    const src = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).replace(/\/\/[^\n]*/g, (c) => ' '.repeat(c.length));
    for (const b of badCloseLabels(src)) fails.push(`${relative(root, file)}:${b.line} closeLabel={${b.expr}}`);
  }
  if (fails.length) {
    console.error('✗ 닫기 X 의 이름에 취소 · 계속 작성 문구를 넘겼습니다 — X 와 아래 버튼이 같은 이름으로 읽힙니다.');
    console.error('  «닫기» 문구(L.close 등)로 넘기세요 (pivit-work PW-2744):');
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
  }
  console.log('✓ 닫기 X 이름 — 취소 문구를 넘긴 창 없음');
}
