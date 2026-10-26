// check-direct-paint.mjs 테스트 — node --test scripts/check-direct-paint.test.mjs
//
// 지키려는 것:
//   1) 디자이너가 쓴 줄은 세지 않는다 — 디자이너의 push·발행이 막히면 이 검사는 쓸 수 없다
//   2) 개발이 새로 칠한 줄은 기준을 넘으면 막는다 — 카드 없이 대화에서 고친 것도
//   3) 커밋 안 한 줄은 지금 커밋하는 사람으로 본다
//   4) 얕은 clone 에서는 판정하지 않는다 — 모든 줄이 마지막 작성자로 잡혀 통째로 틀린다
//   5) 토큰 뒤 기본값·토큰 정의·0 은 안 센다 (거짓 경보 금지)
//   6) 시작 시각 전에 쓴 개발 줄은 안 센다 — 늦게 합쳐지는 옛 카드 작업이 배포를 막지 않게(cherry-pick 은 쓴 시각을 남긴다)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cssRules, jsxLineRules, nativeButtonLines, stripVars, classNamesOf } from './check-direct-paint.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const DESIGNER = 'seongjul22@gmail.com';
const DEV = 'rkmwiaim1@gmail.com';

test('토큰 뒤 기본값·토큰 정의·0 은 안 센다', () => {
  assert.deepEqual(cssRules('  color: var(--text-primary, #596069);'), []);
  assert.deepEqual(cssRules('  background: var(--a, rgba(0, 0, 0, 0.03));'), []);
  assert.deepEqual(cssRules('  --brand: #2dbd82;'), []);
  assert.deepEqual(cssRules('  margin: 0;'), []);
  assert.deepEqual(cssRules('  padding: var(--spacing-lg) var(--spacing-xl);'), []);
  assert.deepEqual(cssRules('  width: 560px;'), [], '폭은 간격 규칙 대상이 아니다');
  assert.equal(stripVars('a var(--x, var(--y, #fff)) b'), 'a var b');
});

test('직접 칠한 색·간격을 잡는다', () => {
  assert.deepEqual(cssRules('  color: #dc6803;'), ['raw-color']);
  assert.deepEqual(cssRules('  box-shadow: 0 1px 2px rgba(0,0,0,.1);'), ['raw-color']);
  assert.deepEqual(cssRules('  margin-bottom: 12px;'), ['raw-spacing']);
  assert.deepEqual(cssRules('  gap: 0 8px;'), ['raw-spacing']);
  assert.deepEqual(jsxLineRules("  style={{ color: '#2E90FA' }}"), ['raw-color']);
  assert.deepEqual(jsxLineRules('  style={{ marginTop: 12 }}'), ['raw-spacing']);
  assert.deepEqual(jsxLineRules("  style={{ marginTop: 0, color: 'var(--a, #fff)' }}"), []);
  assert.deepEqual(jsxLineRules("  // 예전엔 '#fff' 였다"), [], '주석은 안 센다');
});

test('공용 Button 밖의 <button className> 을 잡는다 — 여러 줄 태그도', () => {
  const t = ['<Button variant="ghost">a</Button>', '<button type="button" onClick={() => go({ a: 1 })}', '  className="x">b</button>', '<button onClick={f}>c</button>'].join('\n');
  assert.deepEqual(nativeButtonLines(t), [2]);
});

// 가짜 design-page 저장소: 검사 스크립트·디자이너 목록을 복사하고 기준 파일은 비운다.
function repo() {
  const r = mkdtempSync(join(tmpdir(), 'dp-paint-'));
  mkdirSync(join(r, 'scripts')); mkdirSync(join(r, 'src'));
  copyFileSync(join(here, 'check-direct-paint.mjs'), join(r, 'scripts/check-direct-paint.mjs'));
  writeFileSync(join(r, 'scripts/designers.json'), JSON.stringify({ emails: [DESIGNER] }));
  const g = (...a) => execFileSync('git', a, { cwd: r });
  g('init', '-q', '-b', 'main');
  return { r, g };
}
// date: 쓴 시각(초). 안 주면 지금.
const commitAs = ({ r }, email, msg, date) => {
  const env = { ...process.env, ...(date ? { GIT_AUTHOR_DATE: `@${date} +0900`, GIT_COMMITTER_DATE: `@${date} +0900` } : {}) };
  execFileSync('git', ['add', '-A'], { cwd: r });
  execFileSync('git', ['-c', `user.email=${email}`, '-c', 'user.name=t', 'commit', '-qm', msg], { cwd: r, env });
};
// 기본은 시작 시각 0 — 모든 줄이 «시작 뒤» 다. 비교 기준이 없는 저장소라 전 파일을 본다.
const check = ({ r }, email, { start = 0, args = [] } = {}) => {
  execFileSync('git', ['config', 'user.email', email], { cwd: r });
  return spawnSync('node', ['scripts/check-direct-paint.mjs', ...args], { cwd: r, encoding: 'utf8', env: { ...process.env, DIRECT_PAINT_START: String(start) } });
};

test('🔴 디자이너가 쓴 줄은 세지 않는다 — 커밋한 것도, 커밋 전인 것도', () => {
  const x = repo();
  writeFileSync(join(x.r, 'src/a.css'), '.a {\n  color: #2dbd82;\n  padding: 12px;\n}\n');
  commitAs(x, DESIGNER, 'design');
  assert.equal(check(x, DESIGNER).status, 0, '디자이너 커밋이 막혔다');
  appendFileSync(join(x.r, 'src/a.css'), '.b { margin: 8px; }\n');
  assert.equal(check(x, DESIGNER).status, 0, '디자이너의 커밋 전 줄이 막혔다');
});

test('🔴 개발이 새로 칠하면 막는다 — 커밋 전 줄은 지금 커밋하는 사람으로 본다', () => {
  const x = repo();
  writeFileSync(join(x.r, 'src/a.css'), '.a {\n  color: #2dbd82;\n}\n');
  commitAs(x, DESIGNER, 'design');
  appendFileSync(join(x.r, 'src/a.css'), '.b { color: #ff0000; }\n');
  const out = check(x, DEV);
  assert.equal(out.status, 1, '개발의 커밋 전 줄이 통과했다');
  assert.match(out.stderr, /src\/a\.css .*\(줄 4\)/);
  commitAs(x, DEV, 'dev');
  assert.equal(check(x, DESIGNER).status, 1, '개발이 커밋한 줄은 디자이너가 push 해도 개발 줄이다');
});

test('🔴 시작 시각 전에 쓴 개발 줄은 안 센다 — 그 줄을 고치면 새 줄이라 센다', () => {
  const x = repo();
  const start = Math.floor(Date.now() / 1000) - 3600;
  writeFileSync(join(x.r, 'src/a.css'), '.a { color: #111; }\n.b { color: #222; }\n');
  commitAs(x, DEV, 'old dev', start - 86400);
  assert.equal(check(x, DEV, { start }).status, 0, '시작 전 개발 줄을 막았다 — 늦게 합쳐지는 카드 작업이 배포를 막는다');
  writeFileSync(join(x.r, 'src/a.css'), '.a { color: #111; }\n.b { color: #333; }\n');
  const out = check(x, DEV, { start });
  assert.equal(out.status, 1, '시작 뒤에 고친 개발 줄이 통과했다');
  assert.match(out.stderr, /\(줄 2\)/, '고친 줄만 짚어야 한다');
});

test('디자이너가 개발 줄을 고쳐 쓰면 그 줄은 디자이너 것이 되어 막히지 않는다', () => {
  const x = repo();
  writeFileSync(join(x.r, 'src/a.css'), '.a { color: #111; }\n');
  commitAs(x, DEV, 'dev');
  assert.equal(check(x, DESIGNER).status, 1, '전제: 개발 줄은 걸린다');
  writeFileSync(join(x.r, 'src/a.css'), '.a { color: #999; }\n.b { color: #888; }\n');
  commitAs(x, DESIGNER, 'redesign');
  assert.equal(check(x, DESIGNER).status, 0, '디자이너가 다시 그린 파일이 막혔다');
});

test('🔴 얕은 clone 에서는 판정하지 않는다', () => {
  const x = repo();
  writeFileSync(join(x.r, 'src/a.css'), '.a { color: #111; }\n');
  commitAs(x, DESIGNER, 'one');
  writeFileSync(join(x.r, 'src/b.css'), '.b { margin: 0; }\n');
  commitAs(x, DEV, 'two');
  const shallow = mkdtempSync(join(tmpdir(), 'dp-paint-shallow-'));
  execFileSync('git', ['clone', '-q', '--depth', '1', `file://${x.r}`, shallow]);
  const out = check({ r: shallow }, DEV);
  assert.equal(out.status, 2, '얕은 clone 에서 판정했다 — 디자이너 줄이 개발 줄로 잡힌다');
  assert.match(out.stderr, /fetch-depth: 0/);
});

test('디자이너가 정의한 클래스만 붙인 <button> 은 막지 않는다 — 개발이 만든 클래스가 하나라도 섞이면 막는다', () => {
  const x = repo();
  writeFileSync(join(x.r, 'src/a.css'), '.dz-btn {\n  font-weight: 600;\n}\n.dz-btn.is-on { font-weight: 700; }\n');
  commitAs(x, DESIGNER, 'design');
  writeFileSync(join(x.r, 'src/b.css'), '.dev-btn { font-weight: 500; }\n');
  writeFileSync(join(x.r, 'src/A.jsx'), 'export const A = ({ on }) => (\n  <button type="button" className={`dz-btn ${on ? \'is-on\' : \'\'}`}>a</button>\n);\n');
  commitAs(x, DEV, 'dev');
  assert.equal(check(x, DEV).status, 0, '디자이너 클래스를 쓴 버튼을 막았다');
  writeFileSync(join(x.r, 'src/A.jsx'), 'export const A = () => <button className="dz-btn dev-btn">a</button>;\n');
  const out = check(x, DEV);
  assert.equal(out.status, 1, '개발 클래스가 섞인 버튼이 통과했다');
  assert.match(out.stderr, /공용 Button/);
});

test('className 에서 클래스 이름을 뽑는다', () => {
  assert.deepEqual(classNamesOf('className="a b"'), ['a', 'b']);
  assert.deepEqual(classNamesOf("className={cx('a', on && 'b-c')}"), ['a', 'b-c']);
  assert.deepEqual(classNamesOf('className={`a ${on ? "is-on" : ""}`}'), ['a', 'is-on']);
});

test('🔴 개발이 디자이너 줄을 «옮기기만» 하면 디자이너 줄이다 — 실측: manager.css 의 padding: 60px 0 이 개발 줄로 잡혔다', () => {
  const x = repo();
  const block = (name, v) => `.${name} {\n  font-weight: 600;\n  line-height: 1.5;\n  padding: ${v};\n  letter-spacing: 0;\n}\n`;
  writeFileSync(join(x.r, 'src/a.css'), block('one', '60px 0') + block('two', '8px') + '.three { font-weight: 400; }\n'.repeat(30));
  commitAs(x, DESIGNER, 'design');
  // 개발이 블록 순서만 바꾸고(옮김) 다른 줄 하나를 고친다
  writeFileSync(join(x.r, 'src/a.css'), '.three { font-weight: 400; }\n'.repeat(30) + block('two', '8px') + block('one', '60px 0') + '.four { font-weight: 300; }\n');
  commitAs(x, DEV, 'move');
  const out = check(x, DEV);
  assert.equal(out.status, 0, `옮긴 디자이너 줄을 개발 줄로 잡았다: ${out.stderr}`);
});

test('🔴 시작 시각은 이 검사가 main 에 들어온 때 — 그 전에 쓰고 늦게 cherry-pick 된 카드 작업은 통과한다', () => {
  const x = repo();
  const now = Math.floor(Date.now() / 1000);
  const run = (args, env) => execFileSync('git', args, { cwd: x.r, env: { ...process.env, ...env } });
  // 검사가 main 에 들어온 커밋(committer 시각 = 1시간 전)
  run(['add', '-A']);
  run(['-c', `user.email=${DEV}`, '-c', 'user.name=t', 'commit', '-qm', 'guard'], { GIT_AUTHOR_DATE: `@${now - 3600} +0900`, GIT_COMMITTER_DATE: `@${now - 3600} +0900` });
  // 그 전날 쓴 카드 작업이 지금 cherry-pick 으로 합쳐졌다(작성 시각은 전날, committer 시각은 지금)
  writeFileSync(join(x.r, 'src/a.css'), '.a { color: #111; }\n');
  run(['add', '-A']);
  run(['-c', `user.email=${DEV}`, '-c', 'user.name=t', 'commit', '-qm', 'old card'], { GIT_AUTHOR_DATE: `@${now - 86400} +0900` });
  const env = { ...process.env }; delete env.DIRECT_PAINT_START;
  execFileSync('git', ['config', 'user.email', DEV], { cwd: x.r });
  const ok = spawnSync('node', ['scripts/check-direct-paint.mjs'], { cwd: x.r, encoding: 'utf8', env });
  assert.equal(ok.status, 0, `켜지기 전에 쓴 카드 작업을 막았다: ${ok.stderr}`);
  writeFileSync(join(x.r, 'src/a.css'), '.a { color: #222; }\n');
  const bad = spawnSync('node', ['scripts/check-direct-paint.mjs'], { cwd: x.r, encoding: 'utf8', env });
  assert.equal(bad.status, 1, '켜진 뒤에 고친 줄이 통과했다');
});
