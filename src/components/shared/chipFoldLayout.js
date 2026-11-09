/**
 * 칩 줄 접기 판정 (pivit-work PW-2570) — `ChipFold.jsx` 가 쓴다.
 *
 * 칩이 끝없이 늘어나는 줄(대상 조건 값·참석자·고른 회사…)을 «몇 줄까지만» 보이고 나머지를
 * 「더 보기 +N」으로 연다. 개수로 자르면 같은 8명이 넓은 칸에선 한 줄, 좁은 칸에선 세 줄이 되어
 * (커트 11-06 시안) 줄 수로 정한다 — 칸 폭과 칩 폭으로 줄바꿈을 그대로 세어 본다.
 *
 * 🔴 접어도 남기는 칩(`keep`)이 있다 — 고른 값·방금 더한 사람처럼 사라지면 할 일을 못 하는 칩이다.
 * 「+N」은 접었을 때 실제로 숨는 수다.
 */

/** flex-wrap 줄바꿈을 그대로 세어 몇 줄이 되는지. 칸보다 넓은 칩은 혼자 한 줄(잘려 보인다). */
export function countRows(widths, available, gap) {
  let rows = 0;
  let used = 0;
  for (const w of widths) {
    if (rows === 0 || used + gap + w > available + 0.5) {
      rows += 1;
      used = Math.min(w, available);
    } else {
      used += gap + w;
    }
  }
  return rows;
}

/**
 * 접었을 때 보일 칩을 고른다.
 *
 * @param {object} p
 * @param {number[]} p.widths 칩마다 폭(원래 순서)
 * @param {boolean[]} [p.keep] 접어도 남길 칩
 * @param {number} p.available 칸 안쪽 폭
 * @param {number} p.gap 칩 사이 간격
 * @param {number} p.buttonWidth 「더 보기 +N」 버튼 폭(가장 긴 문구로 잰 값)
 * @param {number} [p.trailingWidths] 버튼 뒤에 늘 붙는 것들(「팀원 추가」 등)의 폭
 * @param {number} p.maxRows 접었을 때 줄 수
 * @returns {{ visible: boolean[], hiddenCount: number, folds: boolean }}
 *   folds=false 면 접을 것이 없다(전부 들어감 — 버튼도 없다).
 */
export function fitChips({ widths, keep = [], available, gap, buttonWidth, trailingWidths = [], maxRows }) {
  const n = widths.length;
  const all = widths.map(() => true);
  if (!(available > 0)) return { visible: all, hiddenCount: 0, folds: false };
  if (countRows([...widths, ...trailingWidths], available, gap) <= maxRows) {
    return { visible: all, hiddenCount: 0, folds: false };
  }
  const free = [];
  for (let i = 0; i < n; i += 1) if (!keep[i]) free.push(i);
  // 남기지 않는 칩을 앞에서부터 k 개 보인다 — 버튼까지 줄 수 안에 드는 가장 큰 k.
  for (let k = free.length - 1; k >= 0; k -= 1) {
    const shown = new Set(free.slice(0, k));
    const visible = widths.map((_, i) => !!keep[i] || shown.has(i));
    const seq = widths.filter((_, i) => visible[i]);
    if (countRows([...seq, buttonWidth, ...trailingWidths], available, gap) <= maxRows) {
      return { visible, hiddenCount: n - seq.length, folds: true };
    }
  }
  const visible = widths.map((_, i) => !!keep[i]);
  const hiddenCount = n - visible.filter(Boolean).length;
  // 남길 칩만으로 줄이 넘쳐도 숨길 것이 없으면 버튼을 두지 않는다(「+0」 금지).
  if (hiddenCount === 0) return { visible: all, hiddenCount: 0, folds: false };
  return { visible, hiddenCount, folds: true };
}
