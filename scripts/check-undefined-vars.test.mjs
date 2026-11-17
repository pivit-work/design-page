import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findUndefined } from './check-undefined-vars.mjs';

test('지워진 이름을 대체값 없이 쓰면 잡는다 (PW-2943 메일 칩)', () => {
  const files = [
    { path: 'a.css', src: '.x { --onb-brand-border: red; }' },
    { path: 'b.css', src: '.onb-tag {\n  border: 1px solid var(--onb-brand-pill-border);\n}' },
  ];
  assert.deepEqual(findUndefined(files).map((b) => [b.file, b.line, b.name]), [['b.css', 2, '--onb-brand-pill-border']]);
});

test('정의된 이름·대체값 있는 이름·주석 속 이름·JSX 인라인 정의는 통과한다', () => {
  const files = [
    { path: 'a.css', src: '.x { --a: 1px; color: var(--a); background: var(--nowhere, #fff); }\n/* var(--gone) */' },
    { path: 'b.jsx', src: "// mono 는 var(--font-mono) 토큰\nconst s = { '--w': '3px', width: 'var(--w)' };" },
  ];
  assert.deepEqual(findUndefined(files), []);
});
