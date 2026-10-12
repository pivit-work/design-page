#!/usr/bin/env node
/**
 * 글씨와 칸 공용 부품(shared-text.css)이 디자이너가 그린 원래 클래스와 같은 값인지 검사한다.
 *
 * 왜 필요한가: 이 부품들은 «새 모양»이 아니라 회의 화면에 디자이너가 이미 그린 모양을 꺼낸 것이라
 * 개발이 만들어도 됐다(2026-10-12 커트). 한쪽만 고쳐 값이 갈라지면 그 전제가 깨진다 — 부품이 지어낸
 * 모양이 되거나, 회의 화면만 다른 모양이 된다. 그래서 속성 하나하나를 원래 클래스와 맞대어 본다.
 *
 * HintText·KeyHint 는 디자이너 원본이 아니라 pivit-work 화면 값을 옮긴 것이라(디자이너 검수 필요) 견줄 원래
 * 클래스가 이 저장소에 없다 — export 만 본다.
 *
 * 그리고 부품이 배럴에서 export 되고 index.css 가 스타일을 끌어오는지도 본다 — 빠지면 소비자는
 * 부품을 쓸 수 없거나, 써도 브라우저 기본 글씨(16px 검정)로 나온다.
 *
 * 실행: npm run check:shared-text  (lefthook pre-push · publish CI 에서 자동 실행)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

/** CSS 글에서 `selector { … }` 첫 블록의 선언을 { 속성: 값 } 으로. 여러 셀렉터를 묶은 블록은 보지 않는다. */
export function declarations(css, selector) {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = noComments.match(new RegExp(`(^|[}\\s])${esc}\\s*\\{([^}]*)\\}`, 'm'));
  if (!m) return null;
  const out = {};
  for (const part of m[2].split(';')) {
    const i = part.indexOf(':');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim().replace(/\s+/g, ' ');
  }
  return out;
}

// 부품 클래스 → 원래 클래스와 «같아야 하는» 속성. 원래 쪽이 여러 클래스면 앞에서부터 덮어쓴 결과와 견준다.
// margin·display 같은 자리 값은 부품이 0/고정으로 두므로 여기서 견주지 않는다.
const PAIRS = [
  {
    part: '.dp-section-title',
    from: [['src/meetings.css', '.mtg-progress-section-label']],
    props: ['font-size', 'line-height', 'font-weight', 'color'],
  },
  {
    part: '.dp-meta-label',
    from: [['src/meetings.css', '.mtg-record-meta-label']],
    props: ['font-size', 'line-height', 'font-weight', 'color'],
  },
  {
    part: '.dp-note-text',
    from: [['src/meetings.css', '.mtg-record-summary-note']],
    props: ['font-size', 'line-height', 'color', 'overflow-wrap'],
  },
  {
    part: '.dp-readonly-box',
    from: [
      ['src/timeline.css', '.tl-snippet-textarea'],
      ['src/meetings.css', '.mtg-record-readonly'],
    ],
    props: [
      'width', 'padding', 'font-size', 'line-height', 'color', 'background',
      'border', 'border-radius', 'white-space', 'box-sizing',
    ],
  },
  {
    part: '.dp-notice-card',
    from: [['src/meetings.css', '.mtg-progress-rec-card']],
    props: ['background', 'border-radius', 'gap', 'flex-direction'],
  },
  {
    part: '.dp-modal-description',
    from: [['src/modal-shell.css', '.tl-group-modal-desc']],
    props: ['margin', 'font-size', 'line-height', 'font-weight', 'color'],
  },
];

const EXPORTS = ['SectionTitle', 'MetaLabel', 'NoteText', 'ReadonlyBox', 'NoticeCard', 'ModalDescription', 'HintText', 'KeyHint'];

export function check({ readFile = read } = {}) {
  const problems = [];
  const partCss = readFile('src/shared-text.css');
  for (const { part, from, props } of PAIRS) {
    const mine = declarations(partCss, part);
    if (!mine) {
      problems.push(`${part} 블록이 shared-text.css 에 없습니다`);
      continue;
    }
    const original = {};
    for (const [file, sel] of from) {
      const d = declarations(readFile(file), sel);
      if (!d) {
        problems.push(`원래 클래스 ${sel} 를 ${file} 에서 찾지 못했습니다`);
        continue;
      }
      Object.assign(original, d);
    }
    for (const p of props) {
      if (mine[p] !== original[p]) {
        problems.push(
          `${part} 의 ${p} 가 원래 모양(${from.map((f) => f[1]).join(' + ')})과 다릅니다: ${mine[p]} ≠ ${original[p]}`,
        );
      }
    }
  }
  const barrel = readFile('src/components/index.js');
  for (const name of EXPORTS) {
    if (!new RegExp(`\\b${name}\\b[\\s\\S]*?from './shared/SharedText\\.jsx'`).test(barrel)) {
      problems.push(`배럴(src/components/index.js)이 ${name} 를 export 하지 않습니다`);
    }
  }
  if (!/@import '\.\/shared-text\.css';/.test(readFile('src/index.css'))) {
    problems.push(`src/index.css 가 shared-text.css 를 끌어오지 않습니다 — 부품이 기본 글씨로 나옵니다`);
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = check();
  if (problems.length > 0) {
    console.error(`\n[check:shared-text] 실패\n\n${problems.map((p) => `  - ${p}`).join('\n')}\n`);
    process.exit(1);
  }
  console.log('[check:shared-text] 통과 — 디자이너 모양을 꺼낸 부품이 원래 클래스와 같고, 부품이 모두 export 된다');
}
