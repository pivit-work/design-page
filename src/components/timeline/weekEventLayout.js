// 주간 캘린더 한 날짜 칸 안에서 겹치는 일정의 가로 위치·폭·쌓임 순서를 정한다 (PW-2128).
//
// 구글 캘린더 주간 화면 방식:
// - 겹치는 일정이 없으면 칸 전체 폭.
// - 먼저 놓인 줄의 첫 일정과 시작이 SIDE_BY_SIDE_MIN 분 미만 차이면 그 줄에 나란히 나눈다.
//   그보다 가까이 얹으면 앞 일정의 시각·제목 두 줄(≈42px)을 덮는다.
// - 그보다 늦게 시작하면 겹치는 일정 중 가장 깊은 단계 + 1 로 얹는다. 단계마다 왼쪽을
//   STACK_INDENT px 비우고 오른쪽 끝까지 쓴다 — 앞 일정의 시각·제목은 위쪽에 그대로 보인다.
// - SHORT_EVENT_MAX 분 이하 짧은 일정(점심·싱크)은 긴 일정보다 늘 위에 그린다.
// - 한 줄에 나란히 놓는 칸은 MAX_LANES 개까지. 넘치면 앞의 MAX_LANES-1 개만 두고 마지막 칸에
//   «+N» 하나(_more)를 둔다 — 4개부터는 칸이 37px 아래로 좁아져 제목이 안 읽힌다.
//   월 보기 «+N more» 와 같은 규칙(기획서 타임라인 §13.2, 2026-10-26 커트 결정).

export const SIDE_BY_SIDE_MIN = 45;
export const STACK_INDENT = 14;
export const SHORT_EVENT_MAX = 60;
export const LANE_GAP = 2;
export const MAX_LANES = 3;
// «+N» 칸의 높이(분). 숨긴 첫 일정이 이보다 짧으면 그 길이.
const MORE_SLOT_MIN = 30;
// 짧은 일정을 긴 일정 위로 올리는 폭 — 단계 수가 이만큼 깊어질 일은 없다.
const SHORT_Z_BOOST = 50;

const overlaps = (a, b) => a._start < b._end && b._start < a._end;

/**
 * @param {Array<{_start:number,_end:number}>} events 자정 기준 분으로 정규화된 일정
 * @returns 각 일정에 _left·_width(CSS 값), _z(쌓임 순서), _depth(얹힌 단계),
 *          _overlapped(다른 일정과 겹치나) 를 붙인 새 배열. 넘친 줄마다 끝에
 *          { id, _more: true, _hidden: 숨긴 일정들, ... } 칸이 하나씩 붙는다.
 */
export function layoutDayEvents(events) {
  // 같은 시각이면 긴 일정을 먼저 — 긴 일정이 왼쪽·아래에 깔린다.
  const sorted = [...events]
    .map((ev) => ({ ...ev }))
    .sort((a, b) => a._start - b._start || b._end - a._end);
  const rows = [];
  const placed = [];
  for (const ev of sorted) {
    const row = rows.find(
      (r) =>
        overlaps(r.items[0], ev) &&
        ev._start - r.items[0]._start < SIDE_BY_SIDE_MIN,
    );
    if (row) {
      ev._depth = row.depth;
      row.items.push(ev);
    } else {
      const hit = placed.filter((p) => overlaps(p, ev));
      ev._depth = hit.length ? Math.max(...hit.map((p) => p._depth)) + 1 : 0;
      rows.push({ depth: ev._depth, items: [ev] });
    }
    placed.push(ev);
  }

  const more = [];
  for (const r of rows) {
    if (r.items.length > MAX_LANES) {
      const hidden = r.items.splice(MAX_LANES - 1);
      for (const h of hidden) placed.splice(placed.indexOf(h), 1);
      const head = hidden[0];
      const chip = {
        id: `more-${head.id}`,
        _more: true,
        _hidden: hidden,
        _start: head._start,
        _end: Math.min(head._end, head._start + MORE_SLOT_MIN),
        _depth: r.depth,
      };
      r.items.push(chip);
      more.push(chip);
    }
    const n = r.items.length;
    const off = r.depth * STACK_INDENT;
    r.items.forEach((ev, i) => {
      ev._left = off === 0 ? `${(i / n) * 100}%` : `calc(${off}px + (100% - ${off}px) * ${i / n})`;
      ev._width = off === 0
        ? `calc(${100 / n}% - ${LANE_GAP}px)`
        : `calc((100% - ${off}px) / ${n} - ${LANE_GAP}px)`;
      ev._z = 1 + ev._depth + (ev._end - ev._start <= SHORT_EVENT_MAX ? SHORT_Z_BOOST : 0);
    });
  }
  for (const ev of placed) {
    ev._overlapped = placed.some((o) => o !== ev && overlaps(o, ev));
  }
  return [...placed, ...more];
}
