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

test('정의된 이름의 대체값 안에 든 이름·setProperty·[`--x`] 로 정의한 이름은 막지 않는다', () => {
  const files = [
    { path: 'a.css', src: '.x { --a: 1px; width: var(--a, var(--b)); }' },
    { path: 'b.jsx', src: "el.style.setProperty('--h', '3px');\nconst s = { [`--w`]: 1, height: 'var(--h)', width: 'var(--w)' };" },
  ];
  assert.deepEqual(findUndefined(files), []);
});

test('바깥 이름도 정의돼 있지 않으면 안쪽 이름을 막는다', () => {
  const files = [{ path: 'a.css', src: '.x { width: var(--none, var(--gone)); }' }];
  assert.deepEqual(findUndefined(files).map((b) => b.name), ['--gone']);
});
