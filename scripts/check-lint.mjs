#!/usr/bin/env node
/**
 * 게시 전에 코드 검사(eslint)를 저장소 전체에 돌리고, 검사가 실제로 무는지도 확인한다 (PW-906).
 *
 * 왜 필요한가: 2026-09-22 리포트 검수 화면이 「StatusBadge」로 들여온 배지를 두 자리에서
 * 「DpStatusBadge」로 써서, 그리는 순간 오류가 나 화면이 비는 판(0.1.630)이 게시됐다.
 * 두 카드(PW-711·PW-840)가 같은 파일을 따로 고친 판이 합쳐지며 생긴 것이라 각자의 커밋 전
 * 검사는 둘 다 통과했고, 게시 CI 는 코드 검사를 아예 돌리지 않았다. 게다가 그때 설정에는
 * JSX 안의 이름을 보는 규칙(react/jsx-no-undef)이 없었다.
 *
 * 하는 일:
 *   1. 저장소 전체 검사 — 오류가 하나라도 있으면 실패 (경고는 통과)
 *   2. 표본 검사 — eslint-rules/fixtures/jsx-no-undef.pw906.jsx (9/22 에 깨졌던 모양) 를
 *      넣어 react/jsx-no-undef 가 DpStatusBadge 를 잡는지 본다. 규칙이 빠지거나 꺼지면 실패
 *
 * 실행: npm run check:lint  (lefthook pre-push · publish CI 에서 자동 실행)
 */
import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = 'eslint-rules/fixtures/jsx-no-undef.pw906.jsx';

let failed = false;

const eslint = new ESLint({ cwd: root });
const results = await eslint.lintFiles(['.']);
const errorCount = results.reduce((n, r) => n + r.errorCount, 0);
if (errorCount > 0) {
  const formatter = await eslint.loadFormatter('stylish');
  console.error(formatter.format(results.filter((r) => r.errorCount > 0)));
  console.error(`✗ 코드 검사 오류 ${errorCount}건 — 고친 뒤 게시한다.`);
  failed = true;
} else {
  console.log(`✓ 코드 검사: 파일 ${results.length}개, 오류 0건`);
}

// 표본은 평소 검사에서 빠져 있으므로(eslint.config.js ignores) 무시 설정을 끄고 읽는다.
const probe = new ESLint({ cwd: root, ignore: false });
const [fixture] = await probe.lintFiles([FIXTURE]);
const hits = fixture.messages.filter((m) => m.ruleId === 'react/jsx-no-undef');
const others = fixture.messages.filter((m) => m.ruleId !== 'react/jsx-no-undef');
if (hits.length === 1 && hits[0].severity === 2 && /DpStatusBadge/.test(hits[0].message) && others.length === 0) {
  console.log('✓ 표본 검사: 들여오지 않은 <DpStatusBadge /> 를 오류로 잡는다');
} else {
  console.error(`✗ 표본 검사: ${FIXTURE} 에서 react/jsx-no-undef 오류 1건(DpStatusBadge)을 기대했는데 받은 것:`);
  for (const m of fixture.messages) console.error(`  ${m.line}:${m.column} ${m.ruleId ?? '(parse)'} ${m.message}`);
  console.error('  → eslint.config.js 에서 react/jsx-no-undef 가 빠졌거나 error 가 아니다.');
  failed = true;
}

process.exit(failed ? 1 : 0);
