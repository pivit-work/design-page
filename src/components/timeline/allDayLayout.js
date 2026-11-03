/**
 * 캘린더의 «종일» 일정 막대 자리 (pivit-work PW-2462 · 타임라인 정책서 §13.9).
 *
 * 한 주(일~토, 이어진 날짜 7개)에 걸친 종일 일정마다 줄(lane)을 정한다. 한 막대는 걸친 날마다 같은 줄에 있다.
 * 순서: 먼저 시작한 것이 위 → 같으면 긴 것이 위 → 같으면 그룹 목록에서 위에 있는 사람(`allDayOrder`)의 것이 위.
 * 일정은 호스트가 `getEventsForDate` 로 걸친 날마다 같은 id 로 주고, `allDay`·`allDayStart`·`allDayEnd`('YYYY-MM-DD', 둘 다 포함)를 싣는다.
 *
 * 돌려주는 막대: { ev, lane, startCol, endCol, cutLeft, cutRight }
 *   - startCol·endCol: 이 주 안에서 보이는 첫·끝 칸(0~6)
 *   - cutLeft·cutRight: 이 주 앞·뒤로 더 이어진다(앞 주에서 시작했거나 다음 주까지 간다)
 * byCol[c]: c 칸을 지나는 막대들(줄 순서).
 */
export function layoutAllDayWeek(isos, getEventsForDate) {
  const first = isos[0];
  const last = isos[isos.length - 1];
  const seen = new Map();
  for (const iso of isos) {
    for (const ev of getEventsForDate?.(iso) ?? []) {
      if (ev.allDay && !seen.has(ev.id)) seen.set(ev.id, ev);
    }
  }
  const items = [...seen.values()].map((ev) => {
    const start = ev.allDayStart ?? ev.date;
    const end = ev.allDayEnd && ev.allDayEnd >= start ? ev.allDayEnd : start;
    return {
      ev,
      start,
      end,
      startCol: Math.max(0, isos.findIndex((d) => d >= start)),
      endCol: findLastIndex(isos, (d) => d <= end),
      cutLeft: start < first,
      cutRight: end > last,
    };
  });
  items.sort(
    (a, b) =>
      cmp(a.start, b.start) ||
      cmp(b.end, a.end) ||
      (a.ev.allDayOrder ?? 0) - (b.ev.allDayOrder ?? 0) ||
      cmp(String(a.ev.id), String(b.ev.id)),
  );
  // 줄마다 마지막으로 차지한 칸 — 그 뒤 칸에서 시작하는 막대만 같은 줄에 들어간다
  const laneEnds = [];
  const bars = items.map(({ ev, startCol, endCol, cutLeft, cutRight }) => {
    let lane = laneEnds.findIndex((laneEnd) => laneEnd < startCol);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = endCol;
    return { ev, lane, startCol, endCol, cutLeft, cutRight };
  });
  const byCol = isos.map((_, c) =>
    bars.filter((b) => b.startCol <= c && c <= b.endCol).sort((a, b) => a.lane - b.lane),
  );
  return { bars, byCol };
}

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function findLastIndex(arr, pred) {
  for (let i = arr.length - 1; i >= 0; i -= 1) if (pred(arr[i])) return i;
  return -1;
}
