/**
 * 공용 틀(src/components/frames)을 design-page 화면 파일 자리에서 가져다 그릴 수 있는가 (PW-3139).
 *
 * 왜 필요한가: 틀은 원래 pivit-work 앱 폴더에만 있어(PW-2994) design-page 안의 어드민 화면은 틀을 부를 길이 없었다.
 * 그래서 PW-3121 은 틀 대신 같은 디자이너 클래스를 화면에 직접 붙였다. 틀을 이 저장소로 옮긴 뒤에는
 * «화면 폴더에서 상대 경로로 부른다 → 묶인다 → 그려진다»가 깨지지 않아야 다시 칠하기 카드들(PW-3125 …)이 틀을 쓴다.
 * 이 저장소에는 화면 단위 시험 틀이 없어, 미리보기 서버(vite)로 실제 변환 · 경로 풀이를 거쳐 서버 쪽에서 그려 본다.
 *
 * 실행: npm run check:frames-import  (publish CI — push 전 검사에는 안 넣었다: vite 서버를 띄워 push 마다 몇 초 늘어난다)
 */
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createServer } from 'vite';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let server;
let frames;

before(async () => {
  server = await createServer({ root, configFile: resolve(root, 'vite.config.js'), logLevel: 'silent', server: { middlewareMode: true, hmr: false } });
  frames = await server.ssrLoadModule('/src/components/frames/index.js');
});
after(async () => server?.close());

test('어드민 화면 폴더에서 «../frames/index.js» 가 틀 입구로 풀린다', async () => {
  const importer = resolve(root, 'src/components/admin/AdminRbacCanvas.jsx');
  const r = await server.pluginContainer.resolveId('../frames/index.js', importer);
  assert.equal(r?.id, resolve(root, 'src/components/frames/index.js'));
});

test('틀 여덟이 다 나온다', () => {
  for (const name of ['FormModal', 'Panel', 'NoticeLines', 'FrameTable', 'PanelSection', 'PageHead', 'SaveBar', 'StatStrip']) {
    assert.equal(typeof frames[name], 'function', name);
  }
  assert.equal(frames.Panel.Section, frames.PanelSection);
});

test('판 안 구역 — 디자이너 판 안에 구역 클래스 · 구역 제목 클래스로 그린다', () => {
  const { Panel } = frames;
  const html = renderToStaticMarkup(
    h(Panel, { title: '판' }, h(Panel.Section, { title: '구역 하나' }, '가'), h(Panel.Section, null, '나')),
  );
  assert.match(html, /class="okr-h-list"/);
  assert.equal((html.match(/class="dp-frame-section"/g) || []).length, 2);
  assert.match(html, /class="okr-s-title"[^>]*title="구역 하나"/);
});

test('페이지 머리 — 제목 · 설명 문장마다 한 줄 · 오른쪽 버튼 자리', () => {
  const html = renderToStaticMarkup(
    h(frames.PageHead, { title: '권한 기준정보', description: ['첫 문장.', '둘째 문장.'], actions: h('button', { type: 'button' }, '내보내기') }),
  );
  assert.match(html, /<h1 class="okr-h-label"[^>]*title="권한 기준정보"/);
  assert.equal((html.match(/class="tl-event-modal-subtitle"/g) || []).length, 2);
  assert.match(html, /내보내기/);
  const withAside = renderToStaticMarkup(h(frames.PageHead, { title: '권한 기준정보', titleAside: h('button', { type: 'button' }, '?') }));
  assert.match(withAside, /<div style="display:flex;align-items:center;gap:var\(--spacing-md\);min-width:0"><h1 class="okr-h-label"/);
});

test('권한 기준정보 화면이 틀로 그려진다 — 페이지 머리 · 흰 판 · 안내 줄 (PW-3139 ③)', async () => {
  const { default: AdminRbacCanvas } = await server.ssrLoadModule('/src/components/admin/AdminRbacCanvas.jsx');
  const html = renderToStaticMarkup(h(AdminRbacCanvas, {}));
  assert.match(html, /<header[^>]*><div[^>]*><h1 class="okr-h-label"/);
  assert.match(html, /<section class="okr-h-list"/);
  assert.doesNotMatch(html, /rbac-head|rbac-title|rbac-desc|is-nohead|rbac-note"/);
});

test('저장 줄 — 안내가 없으면 버튼만, 있으면 디자이너 발 줄 안내 클래스', () => {
  const withHint = renderToStaticMarkup(h(frames.SaveBar, { hint: '바뀐 칸 3개', actions: h('button', { type: 'button' }, '저장') }));
  assert.match(withHint, /class="okr-wz-footer-hint"[^>]*>바뀐 칸 3개/);
  const bare = renderToStaticMarkup(h(frames.SaveBar, { actions: h('button', { type: 'button' }, '저장') }));
  assert.doesNotMatch(bare, /okr-wz-footer-hint/);
});

test('숫자 칸 줄 — 칸마다 디자이너 숫자 칸 이름 · 값 클래스', () => {
  const html = renderToStaticMarkup(
    h(frames.StatStrip, { items: [{ key: 'a', label: '전체', value: 12 }, { key: 'b', label: '켜짐', value: '3' }] }),
  );
  assert.equal((html.match(/class="dp-frame-stat"/g) || []).length, 2);
  assert.equal((html.match(/class="manager-stat-value"/g) || []).length, 2);
  assert.match(html, /class="okr-h-list dp-frame-stats"/);
});
