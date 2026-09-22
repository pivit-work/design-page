#!/usr/bin/env node
/**
 * 상태 딱지를 **따로 그리지 못하게** 막고, **모으기 전후 화면이 같은지** 잰다 (PW-840).
 *
 * ## 왜
 *
 * 「충족」·「시급」·「진행 중」처럼 색 배경에 둥근 모서리로 붙는 작은 딱지를 화면마다 따로
 * 그려서, 딱지 규칙이 20개 CSS 파일에 흩어져 있었다. 뜻과 색을 짝지은 표도 없어 같은
 * 「끝났다」가 화면마다 다른 초록이었고, 새 상태가 생기면 색을 고를 근거가 없었다
 * (PW-743 — 「수습」이 색이 없어 「휴직」 색을 쓰고 있다).
 *
 * ## 세 가지를 본다
 *
 * 1. **생김새 잠금** — 딱지마다 모으기 전 값(`status-badge-baseline.json`)과 지금 값이 같은가.
 *    모서리·글씨 크기·안쪽 여백·굵기·바탕색·글자색까지. 색은 이름이 달라도 **같은 색이면
 *    같다**고 본다(`var(--bg-brand-secondary)` = `var(--colors-background-bgBrandSecondary)`).
 * 2. **표가 한 곳인가** — `statusBadgeTones.js` 의 뜻→색 표와 `status-badge.css` 의
 *    `--dp-badge-*` 값이 같은가. 둘이 갈리면 표가 두 곳이 된다.
 * 3. **또 따로 그리지 않았나** — 화면 CSS 에 딱지 바탕 규칙이 새로 들어왔거나, 화면 JSX 가
 *    공용 부품 없이 딱지를 그렸는가.
 *
 * 소비자(pivit-work)는 설치된 이 패키지에 같은 함수를 돌리는 테스트를 둔다
 * (`frontend/src/designPageStatusBadges.guard.test.ts`).
 *
 * 실행: `npm run check:status-badges` (pre-push 훅, publish 워크플로)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { captureBaseline, collectBadges, diffShapes, leafClass } from './status-badge-lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** 딱지 생김새 값이 모여 사는 파일. 여기 밖에 딱지 바탕 규칙이 있으면 안 된다. */
export const HOME_CSS = 'status-badge.css';

/**
 * 딱지 «모양»이지만 딱지가 아닌 것 — 여기 밖으로 옮기지 않는다.
 *
 * 카드가 말한 딱지는 「색 배경에 둥근 모서리로 붙는 작은 딱지」, 즉 **읽기만 하는 것**이다.
 * 겉이 비슷해도 누르면 무언가 일어나는 것은 조작이라 공용 부품으로 옮기지 않았다 —
 * 옮기면 눌리는 동작까지 건드리게 되고, 카드가 푸는 문제(뜻과 색을 짝짓는 표가 없다)와도
 * 관계가 없다.
 *
 * 🔴 이 목록은 **줄어들기만 한다.** 새 딱지를 여기 올려 검사를 피하지 않는다.
 */
export const NOT_A_BADGE = {
  'admin.css|.admin-snap-chip': '누르는 것 — 조직 시점 고르기 버튼',
  'admin.css|.admin-notif-filter-chip': '쓰는 곳이 없다 — 화면에서 안 그린다',
  'eval-cycle.css|.evc-filter-chip': '누르는 것 — 필터 줄이 버튼과 한 규칙을 나눠 쓴다',
  'eval-cycle.css|.evs-cw-chip': '누르는 것 — 캘리브레이션 필터 버튼',
  'eval-cycle.css|.evs-cw-filter-preset-pill': '누르는 것 — 저장한 필터 고르기 버튼',
  'eval-cycle.css|.evs-cw-filter-excluded-pill': '누르는 것 — 제외 해제 버튼',
  'eval-cycle.css|.evc-wiz-calibscope-chip': '누르는 것 — 캘리 범위 고르기 버튼',
  'eval-cycle.css|.evc-tpl-grade-arrow': '누르는 것 — 등급 순서 옮기기 버튼',
  'eval-cycle.css|.evrs-chip': '고르는 칸 — 라디오를 감싼 라벨',
  'manager.css|.mgr-kr-obj-chip': '누르는 것 — 목표로 가는 버튼',
  'okr.css|.okr-s-ai-chip': '누르는 것 — 줄 단위 AI 자동완성 버튼',
  'okr.css|.okr-cf-init-status': '선택칸 — 상태를 고르는 select',
  'okr_resource.css|.rsx-suggest-chip': '누르는 것 — 추천 넣기 버튼',
  'okr_resource.css|.rsx-chip-btn': '누르는 것 — 칩 모양 버튼',
  'onboarding.css|.onb-btn-pill': '누르는 것 — 온보딩 버튼',
  'onboarding.css|.onb-chip': '누르는 것 — 선호 설정 고르기 버튼',
  'one_on_one.css|.tag': '누르는 것이 섞여 있다 — 지울 수 있는 태그와 읽기용 태그가 한 클래스다',
  'team-management.css|.tm-subteam-chip': '누르는 것 — 하위 팀으로 가는 버튼',
  'timeline.css|.tl-event-member-chip': '누르는 것 — 참석자 빼기 버튼',
  'timeline.css|.tl-snippet-tag-field': '입력 칸 틀 — 안에 태그 입력이 들어간다',
  'timeline.css|.tl-snippet-tag': '누르는 것이 섞여 있다 — 태그 입력 칸 안의 칩',
  'timeline.css|.tl-snippet-tag-x': '누르는 것 — 태그 지우기 버튼',
  'timeline.css|.tl-weekly-recommend-tag': '쓰는 곳이 없다 — 화면에서 안 그린다',
};

/** `0` 도 길이로 읽는다 — `padding: 0 6px` 인 딱지가 여럿이다. */
function lengthPx(value) {
  if (value == null) return null;
  const text = String(value).trim();
  if (text === '0') return 0;
  const m = text.match(/^(-?[\d.]+)px$/);
  return m ? parseFloat(m[1]) : null;
}

/**
 * 「색 배경에 둥근 모서리로 붙는 **작은** 딱지」인가. 같은 낱말을 쓰지만 딱지가 아닌 것들
 * (동그란 셈 표시 · AI 안내 상자 · 등급 큰 판 · 태그 입력 칸)을 여기서 가른다.
 */
export function isSmallTextBadge(shape) {
  if (!shape) return false;
  if (shape['border-radius'] === '50%') return false;
  if (!shape.padding) return false;
  const top = lengthPx(shape.padding.split(' ')[0]);
  return top !== null && top <= 6;
}

/** ① 생김새 잠금 — 모으기 전 값과 지금 값을 견준다. 키의 파일 앞머리는 떼고 본다. */
export function shapeDrift(srcRoot, baseline) {
  const now = captureBaseline(srcRoot);
  const strip = (obj) => Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key.slice(key.indexOf('|') + 1), value]),
  );
  return [
    ...diffShapes(strip(baseline.shapes), strip(now.shapes)),
    ...diffShapes(strip(baseline.variants), strip(now.variants)),
  ];
}

/** ② 표가 한 곳인가 — JS 의 뜻→색 표와 CSS 의 `--dp-badge-*` 가 같은 값인가. */
export function toneTableDrift(srcRoot, tones) {
  const css = fs.readFileSync(path.join(srcRoot, HOME_CSS), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = {};
  for (const m of css.matchAll(/(--dp-badge-[\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  const out = [];
  for (const [name, tone] of Object.entries(tones)) {
    for (const [side, value] of [['bg', tone.bg], ['fg', tone.fg]]) {
      const key = `--dp-badge-${name}-${side}`;
      if (vars[key] !== value) out.push({ tone: name, key, js: value, css: vars[key] ?? '(없음)' });
    }
  }
  for (const key of Object.keys(vars)) {
    const m = key.match(/^--dp-badge-([\w-]+)-(bg|fg)$/);
    if (m && !(m[1] in tones)) out.push({ tone: m[1], key, js: '(표에 없다)', css: vars[key] });
  }
  return out;
}

/** ③-가 화면 CSS 에 남은 딱지 바탕 규칙 (예외 목록 밖). */
export function strayBadgeCss(srcRoot) {
  const badges = collectBadges(srcRoot);
  const out = [];
  for (const [key, shape] of Object.entries(badges)) {
    if (key.startsWith(`${HOME_CSS}|`)) continue;
    if (!isSmallTextBadge(shape)) continue;
    if (key in NOT_A_BADGE) continue;
    out.push(key);
  }
  return out;
}

function walkJsx(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJsx(full, out);
    else if (/\.jsx$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** 공용 부품이 그리는 딱지 클래스 목록 — `status-badge.css` 의 바탕 규칙에서 읽는다. */
export function badgeClasses(srcRoot) {
  const out = new Set();
  for (const [key, shape] of Object.entries(collectBadges(srcRoot))) {
    if (!key.startsWith(`${HOME_CSS}|`)) continue;
    if (!isSmallTextBadge(shape)) continue;
    const selector = key.slice(key.indexOf('|') + 1);
    const first = selector.match(/^\.([\w-]+)/);
    if (first) out.add(first[1]);
  }
  return out;
}

/**
 * ③-나 화면 JSX 가 공용 부품 없이 딱지를 그린 자리.
 * 소문자 태그(`<span>`·`<div>`…)에 딱지 클래스를 붙였으면 걸린다 — `<StatusBadge>` 로 그린다.
 */
export function handDrawnBadgeJsx(srcRoot) {
  const classes = badgeClasses(srcRoot);
  const out = [];
  for (const full of walkJsx(path.join(srcRoot, 'components'))) {
    const text = fs.readFileSync(full, 'utf8');
    // 여는 태그 하나를 통째로 본다 — 속성이 여러 줄에 걸쳐 있는 자리가 많다.
    for (const tag of text.matchAll(/<([a-z][\w-]*)\b([^>]*?)\/?>/gs)) {
      const attrs = tag[2];
      const cls = attrs.match(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{([^}]*)\})/);
      if (!cls) continue;
      const raw = cls[1] ?? cls[2] ?? cls[3] ?? '';
      for (const word of raw.split(/[^\w-]+/)) {
        if (!classes.has(word)) continue;
        const before = text.slice(0, tag.index);
        out.push({
          file: path.relative(srcRoot, full).split(path.sep).join('/'),
          line: before.split('\n').length,
          tag: tag[1],
          badge: word,
        });
        break;
      }
    }
  }
  return out;
}

async function main() {
  const src = path.resolve(HERE, '..', 'src');
  const baseline = JSON.parse(fs.readFileSync(path.join(HERE, 'status-badge-baseline.json'), 'utf8'));
  const { TONES } = await import(pathToFileURL(path.join(src, 'components', 'shared', 'statusBadgeTones.js')).href);

  let failed = false;

  const drift = shapeDrift(src, baseline);
  if (drift.length > 0) {
    failed = true;
    console.error('\n[check-status-badges] 모으기 전과 딱지 생김새가 달라졌다:\n');
    for (const d of drift) console.error(`  ${d.key} — ${d.prop}: ${d.before} → ${d.after}`);
    console.error('\n  값을 되돌리거나, 모양을 정말 바꾸는 카드라면 scripts/status-badge-baseline.json 의');
    console.error('  그 값도 함께 고치고 무엇을 왜 바꿨는지 카드에 남긴다. (PW-840)\n');
  }

  const tone = toneTableDrift(src, TONES);
  if (tone.length > 0) {
    failed = true;
    console.error('\n[check-status-badges] 뜻→색 표가 두 곳으로 갈렸다:\n');
    for (const t of tone) console.error(`  ${t.key} — statusBadgeTones.js: ${t.js} / status-badge.css: ${t.css}`);
    console.error('');
  }

  const stray = strayBadgeCss(src);
  if (stray.length > 0) {
    failed = true;
    console.error('\n[check-status-badges] 화면 CSS 가 딱지를 따로 칠했다:\n');
    for (const s of stray) console.error(`  ${s}`);
    console.error('\n  딱지 생김새는 src/status-badge.css 한 곳에 둔다. 딱지가 아니면(누르는 것 등)');
    console.error('  scripts/check-status-badges.mjs 의 NOT_A_BADGE 에 이유와 함께 적는다. (PW-840)\n');
  }

  const hand = handDrawnBadgeJsx(src);
  if (hand.length > 0) {
    failed = true;
    console.error('\n[check-status-badges] 화면이 딱지를 공용 부품 없이 그렸다:\n');
    for (const h of hand) console.error(`  ${h.file}:${h.line} — <${h.tag}> 에 ${h.badge}`);
    console.error('\n  <StatusBadge tone="..." className="..."> 로 그린다. (PW-840)\n');
  }

  if (failed) process.exit(1);
  const total = Object.keys(baseline.shapes).length + Object.keys(baseline.variants).length;
  console.log(`[check-status-badges] OK — 잠근 딱지 규칙 ${total}개 · 뜻 ${Object.keys(TONES).length}가지 · 따로 그린 자리 0건`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
