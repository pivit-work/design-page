/**
 * 리소스 투입 막대의 눈금 — 트랙 전체 = **125 고정**, 100 은 트랙 왼쪽에서 80% 자리
 * (pivit-work PW-3068 · 기획 screen-resource-allocation.policy.md v1.34 §5-9).
 * 종전에는 합계가 100 을 넘으면 막대 전체를 100 폭에 눌러 담아 100 · 140 · 150 이 같은 길이였다(2026-11-18 정기미팅).
 *
 * 100 을 넘은 몫은 항목 색 대신 빨간 빗금 — 조직도 스쿼드 뷰 캐파 게이지 초과 조각과 같은 무늬(§5-9 «빨간 빗금»).
 * 같은 무늬를 조직도 쪽(PW-3067 · `orgchart/squad-constants.js`)도 짓는 중이라, 두 카드가 겹치지 않게 여기에 따로 둔다.
 */
export const RS_BAR_SCALE = 125;
export const RS_BAR_CAP = 100;
/** «내 입력» 합산 게이지 아래 눈금 글자의 값 — 그 값 자리(트랙 0 · 40% · 80%)에 둔다. 125 에는 글자가 없다(§5-9 «눈금 글자»). */
export const RS_BAR_TICKS = [0, 50, RS_BAR_CAP];

/** 흰 줄은 `--bg-quaternary`(#fff) — 이 앱의 `--bg-primary` 는 회색 바탕이라 흰색이 아니다(PW-3067 브라우저 확인과 같다). */
export const RS_OVER_HATCH = 'repeating-linear-gradient(135deg, var(--utility-error-500) 0 2px, var(--bg-quaternary) 2px 4px)';

/** 값 → 트랙 폭 %. 125 를 넘으면 트랙 끝(100%)에서 멈춘다. */
export const rsBarPct = (v) => (Math.min(Math.max(v, 0), RS_BAR_SCALE) / RS_BAR_SCALE) * 100;

/**
 * 조각을 0 ~ 125 트랙에 놓는다 — 조각마다 100 아래 몫(fill) · 위 몫(over) · 폭(w), 단위는 값(%p).
 * 빗금 여부는 막대 옆 `%` 숫자(total)로만 정한다 — total 이 100 이하면 조각을 반올림해 쌓은 합이 100 을 넘어도
 * 빗금을 치지 않는다(§5-9 «100 눈금»). 125 를 넘는 몫은 잘리고, 125 밖에서 시작하는 조각은 폭 0 이라 빠진다.
 */
export function rsBarSegs(segments, total) {
  const over = total > RS_BAR_CAP;
  let start = 0;
  const out = [];
  for (const seg of segments || []) {
    const s = Math.min(start, RS_BAR_SCALE);
    const e = Math.min(start + seg.pct, RS_BAR_SCALE);
    start += seg.pct;
    if (e <= s) continue;
    const hatch = over ? Math.max(0, e - Math.max(s, RS_BAR_CAP)) : 0;
    out.push({ ...seg, s, w: e - s, fill: e - s - hatch, over: hatch });
  }
  return out;
}

/**
 * 조각 폭 — 조각은 트랙 안에 제 시작 값 자리(`rsSegLeft`)로 놓이고(absolute), 뒤에 조각이 오는 조각만 디자이너 조각 사이
 * 간격 10px 만큼 줄인다. flex 로 줄 세우면 간격이 % 폭 밖에서 더해져 막대 끝이 제 값 자리를 (n−1)×10px 넘는다.
 * 아주 작은 조각(트랙 700px 에서 약 1.8 이하)은 calc 가 0 이하가 되는데, CSS `.rsx-stackbar-seg.is-split` 의 min-width 2px 로
 * 남겨 막대와 말풍선에서 사라지지 않게 한다 — 자리가 absolute 라 뒤 조각이 밀리지 않는다.
 */
export const RS_SEG_GAP = '10px';
export const rsSegLeft = (s) => `${(s / RS_BAR_SCALE) * 100}%`;
export function rsSegWidth(w, followed) {
  const p = `${(w / RS_BAR_SCALE) * 100}%`;
  // 아주 작은 조각에서 calc 가 음수가 되면 브라우저가 폭을 0 으로 둔다(CSS 폭은 음수를 받지 않는다)
  return followed ? `calc(${p} - ${RS_SEG_GAP})` : p;
}

/**
 * 조각 안 100 아래 몫(항목 색)의 폭. 뒤에 조각이 오는 조각은 제 폭이 간격 10px 만큼 줄어 있으므로, 그 안에서 비율로만
 * 나누면 100 경계가 «줄어든 폭 × 비율»만큼 왼쪽으로 밀린다(60·50·10 이면 약 8px). 줄기 전 폭(= 조각 폭 + 10px)의 비율로
 * 잡아 빗금이 늘 트랙의 100 자리(80%)에서 시작하게 한다. 넘친 만큼은 조각의 overflow 가 자른다.
 */
export function rsFillWidth(fill, w, followed) {
  const f = (fill / w) * 100;
  return followed ? `calc(${f}% + ${(f * parseFloat(RS_SEG_GAP)) / 100}px)` : `${f}%`;
}
