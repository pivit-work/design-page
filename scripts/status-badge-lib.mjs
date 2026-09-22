#!/usr/bin/env node
/**
 * 상태 딱지 검사·기준 뜨기가 함께 쓰는 해석기 (PW-840).
 *
 * 「충족」·「시급」·「진행 중」처럼 색 배경에 둥근 모서리로 붙는 작은 딱지를 화면마다 따로
 * 그려서, 뜻과 색을 짝지은 표가 어디에도 없었다. 이제 딱지는 `shared/StatusBadge` 하나가
 * 그리고 생김새 값은 `src/status-badge.css` 한 곳에 있다.
 *
 * 여기 있는 것은 그 판정에 쓰는 «CSS 읽기» 뿐이다. 무엇을 막는지·무엇과 견주는지는
 * `check-status-badges.mjs` 가 정한다. 소비자(pivit-work)도 설치된 패키지에 이 함수들을
 * 그대로 돌린다.
 */

import fs from 'node:fs';
import path from 'node:path';

/** 딱지로 볼 클래스 이름 조각. 선택자의 **마지막** 클래스가 이 중 하나를 품어야 한다. */
export const BADGE_WORDS = ['badge', 'pill', 'chip', 'tag', 'status', 'grade'];
const BADGE_RE = new RegExp(`(${BADGE_WORDS.join('|')})`, 'i');

/** 생김새로 견주는 항목. 이 여섯이 같으면 「같아 보인다」로 본다 — 나머지는 아래 EXTRA_PROPS. */
export const SHAPE_PROPS = ['border-radius', 'padding', 'font-size', 'font-weight', 'background', 'color'];

/** 생김새를 함께 흔드는 나머지 항목. 있던 것이 사라지거나 값이 달라지면 화면이 바뀐다. */
export const EXTRA_PROPS = [
  'display', 'align-items', 'justify-content', 'gap', 'line-height', 'white-space', 'font-family',
  'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'box-shadow',
  'height', 'min-height', 'width', 'min-width', 'max-width', 'letter-spacing', 'text-transform',
  'flex-shrink', 'flex', 'box-sizing', 'vertical-align', 'overflow', 'text-overflow', 'overflow-wrap',
];

export const ALL_PROPS = [...SHAPE_PROPS, ...EXTRA_PROPS];

/**
 * 뜻 이름을 붙이지 않은 색 토큰을 px·값으로 펼친다. 같은 8px 를 `8px`·`var(--radius-sm)`
 * 두 가지로 적어 둔 자리가 많아서, 펼쳐 보지 않으면 「같은 모양」이 다른 값으로 잡힌다.
 * 표의 값은 `src/index.css` 의 정의와 같아야 한다 — 어긋나면 `check:status-badges` 가 막는다.
 */
export const TOKEN_PX = {
  '--radius-4xl': '24px', '--radius-2xl': '16px', '--radius-xl': '14px', '--radius-lg': '12px',
  '--radius-md': '10px', '--radius-sm': '8px', '--radius-xs': '6px', '--radius-xxs': '4px',
  '--radius-full': '9999px', '--radius-none': '0',
  '--spacing-5xl': '40px', '--spacing-4xl': '32px', '--spacing-3xl': '24px', '--spacing-2xl': '20px',
  '--spacing-xl': '16px', '--spacing-lg': '12px', '--spacing-md': '8px', '--spacing-sm': '6px',
  '--spacing-xs': '4px', '--spacing-xxs': '2px', '--spacing-none': '0',
  '--font-size-text-md': '16px', '--font-size-text-sm': '14px', '--font-size-text-xs': '12px',
};

/** 주석을 걷는다 — 「예전엔 8px 였다」 같은 설명 글이 값으로 잡히면 안 된다. */
export function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * 값 하나를 견줄 수 있는 모양으로 편다.
 * - 길이 토큰을 px 로 펼친다 (`var(--radius-sm)` → `8px`)
 * - 모서리가 딱지 높이보다 크면 어차피 «알약»이라 한 값으로 본다 (`99px`·`999px`·`9999px`)
 * - 공백을 하나로 줄이고 `0px` 을 `0` 으로 맞춘다
 */
export function normalizeValue(value, { prop } = {}) {
  if (value == null) return '';
  let out = String(value).trim();
  for (let i = 0; i < 5; i += 1) {
    out = out.replace(/var\(\s*(--[a-zA-Z0-9-]+)\s*(?:,\s*[^()]*)?\)/g, (m, name) => TOKEN_PX[name] ?? m);
  }
  out = out.replace(/\s+/g, ' ').replace(/\b0px\b/g, '0').trim();
  if (prop === 'border-radius' && /^[\d.]+px$/.test(out) && parseFloat(out) >= 40) return 'pill';
  return out;
}

/** 선언 블록을 { prop: value } 로. 마지막에 적힌 값이 이긴다(CSS 와 같다). */
export function parseDeclarations(body) {
  const out = {};
  for (const chunk of body.split(';')) {
    const idx = chunk.indexOf(':');
    if (idx < 0) continue;
    const prop = chunk.slice(0, idx).trim().toLowerCase();
    const value = chunk.slice(idx + 1).trim();
    if (!prop || !value) continue;
    out[prop] = value;
  }
  return out;
}

/** 선택자 하나에서 마지막 클래스 이름. `.a .b.c` → `c` */
export function leafClass(selector) {
  const classes = [...selector.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1]);
  return classes.length ? classes[classes.length - 1] : '';
}

/** CSS 글에서 규칙을 뽑는다. 미디어 쿼리 안쪽도 본다(중첩 블록을 한 겹 벗긴다). */
export function parseRules(css) {
  const text = stripComments(css);
  const rules = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(text))) {
    const selectorList = m[1].trim().replace(/\s+/g, ' ');
    if (!selectorList || selectorList.startsWith('@')) continue;
    for (const selector of selectorList.split(',')) {
      const sel = selector.trim();
      if (!sel) continue;
      rules.push({ selector: sel, declarations: parseDeclarations(m[2]) });
    }
  }
  return rules;
}

/**
 * 「딱지 바탕 규칙」인가 — 선택자의 마지막 클래스가 딱지 낱말을 품고, 모서리를 정하고,
 * 안쪽 여백이나 글씨 크기까지 정하는 규칙. 색만 바꾸는 갈래 규칙(`.x.is-warn`)은 아니다.
 */
export function isBadgeShapeRule({ selector, declarations }) {
  const leaf = leafClass(selector);
  if (!leaf || !BADGE_RE.test(leaf)) return false;
  if (/:(hover|focus|focus-visible|active|disabled|before|after|checked)/.test(selector)) return false;
  if (!declarations['border-radius']) return false;
  return Boolean(declarations.padding || declarations['font-size']);
}

/** 규칙에서 견줄 항목만 골라 편 값으로. 없는 항목은 키 자체를 넣지 않는다. */
export function shapeOf(declarations) {
  const out = {};
  for (const prop of ALL_PROPS) {
    const raw = declarations[prop] ?? (prop === 'background' ? declarations['background-color'] : undefined);
    if (raw == null) continue;
    out[prop] = normalizeValue(raw, { prop });
  }
  return out;
}

/** 파일 하나에서 딱지 바탕 규칙을 { 선택자 → 생김새 } 로. */
export function badgesInCss(css) {
  const out = {};
  for (const rule of parseRules(css)) {
    if (!isBadgeShapeRule(rule)) continue;
    out[rule.selector] = shapeOf(rule.declarations);
  }
  return out;
}

/** `src` 아래 CSS 파일 전부에서 딱지 바탕 규칙을 모은다 → { "파일|선택자" → 생김새 } */
export function collectBadges(srcRoot) {
  const out = {};
  for (const name of fs.readdirSync(srcRoot).sort()) {
    if (!name.endsWith('.css')) continue;
    const css = fs.readFileSync(path.join(srcRoot, name), 'utf8');
    for (const [selector, shape] of Object.entries(badgesInCss(css))) {
      out[`${name}|${selector}`] = shape;
    }
  }
  return out;
}

/** 두 생김새 표를 견준다 → [{ key, prop, before, after }] (비어 있으면 같다) */
export function diffShapes(before, after) {
  const diffs = [];
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const b = before[key] ?? {};
    const a = after[key] ?? {};
    for (const prop of new Set([...Object.keys(b), ...Object.keys(a)])) {
      if ((b[prop] ?? '(없음)') !== (a[prop] ?? '(없음)')) {
        diffs.push({ key, prop, before: b[prop] ?? '(없음)', after: a[prop] ?? '(없음)' });
      }
    }
  }
  return diffs;
}

/**
 * 딱지의 **색 갈래 규칙** — 바탕 규칙이 있는 클래스에 다른 클래스를 겹쳐 색만 바꾸는 규칙
 * (`.evc-status-badge.tone-success`). 옮긴 뒤 색이 달라지지 않았는지 견주려면 이것도 기준에
 * 들어가야 한다.
 */
export function collectBadgeVariants(srcRoot, shapeSelectors) {
  const shapeClasses = new Set(shapeSelectors.map((s) => leafClass(s.slice(s.indexOf('|') + 1))));
  const out = {};
  for (const name of fs.readdirSync(srcRoot).sort()) {
    if (!name.endsWith('.css')) continue;
    const css = fs.readFileSync(path.join(srcRoot, name), 'utf8');
    for (const rule of parseRules(css)) {
      const classes = [...rule.selector.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map((m) => m[1]);
      if (classes.length < 2) continue;
      if (!classes.some((c) => shapeClasses.has(c))) continue;
      const d = rule.declarations;
      if (!d.background && !d['background-color'] && !d.color) continue;
      out[`${name}|${rule.selector}`] = shapeOf(d);
    }
  }
  return out;
}

/** 기준 파일 한 장을 뜬다 — 바탕 규칙 + 색 갈래 규칙. */
export function captureBaseline(srcRoot) {
  const shapes = collectBadges(srcRoot);
  const variants = collectBadgeVariants(srcRoot, Object.keys(shapes));
  return { shapes, variants };
}
