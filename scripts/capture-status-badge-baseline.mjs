#!/usr/bin/env node
/**
 * 딱지 생김새 «기준»을 뜬다 (PW-840).
 *
 * 딱지를 공용 부품으로 모으기 **전** 화면에 보이던 모서리·글씨 크기·안쪽 여백·굵기·바탕색·
 * 글자색을 딱지마다 적어 `scripts/status-badge-baseline.json` 에 둔다. 모은 뒤 값이 하나라도
 * 달라지면 `check:status-badges` 가 그 딱지와 달라진 항목을 짚어 막는다 — 「모으기 전후 화면이
 * 같다」를 재는 자리다.
 *
 * 🔴 이 명령은 **모으기 전에 한 번** 돌린 것이다. 검사가 빨갛다고 다시 돌려 기준을 덮으면
 * 그 순간 검사가 아무것도 재지 않게 된다. 딱지 모양을 정말 바꾸는 카드는 바뀐 값만 골라
 * 손으로 고치고, 무엇을 왜 바꿨는지 그 카드에 남긴다.
 *
 * 실행: `node scripts/capture-status-badge-baseline.mjs [모으기 전 src 폴더]`
 *
 * 키의 앞머리는 **모으기 전에 그 딱지가 있던 파일**이다(`eval-cycle.css|.evc-status-badge`).
 * 지금은 전부 `status-badge.css` 에 있으므로 검사는 앞머리를 떼고 견준다 — 앞머리는 「원래
 * 어디 있었나」를 읽기 위해 남겨 둔다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureBaseline } from './status-badge-lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(HERE, '..', 'src');
const OUT = path.join(HERE, 'status-badge-baseline.json');

const baseline = captureBaseline(SRC);
const sort = (obj) => Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(
  OUT,
  `${JSON.stringify({ shapes: sort(baseline.shapes), variants: sort(baseline.variants) }, null, 1)}\n`,
);
console.log(
  `[status-badge-baseline] 바탕 규칙 ${Object.keys(baseline.shapes).length}개 · 색 갈래 ${Object.keys(baseline.variants).length}개 → ${path.relative(process.cwd(), OUT)}`,
);
