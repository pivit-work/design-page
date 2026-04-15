import { forwardRef } from 'react';
import {
  GROUPS as DEFAULT_GROUPS,
  WEEKDAY_LABELS,
  WEEK_DAY_COL_W,
  ROW_H,
  HEADER_H,
  SUBHEADER_H,
  BOTTOM_H,
  TODAY_STR,
  formatIsoDate,
  memberPalette,
} from './constants.js';
import useTimelineData from './useTimelineData.js';


/**
 * WeekGrid — day 컬럼 × member row 기반 스니핏 그리드.
 *
 * 주별 / 월별 보기 공용. 컬럼 수는 `dates.length` 로 결정되며 주별은 7,
 * 월별은 28~31. 셀 사이즈/헤더/스니핏 블록 스타일은 동일.
 *
 * - 각 셀은 (day, member) 1쌍. snippet 이 있으면 내부에 rounded block 렌더.
 * - sticky 상단 header 는 요일 + 날짜. 오늘 날짜는 녹색 원형 배경.
 * - flatRows / rowYs 는 TimelineGrid(일별) 과 동일 구조이기 때문에
 *   왼쪽 NameColumn 의 행과 자동 정렬된다.
 */
const WeekGrid = forwardRef(function WeekGrid(
  {
    onScroll,
    onMouseDown,
    groups = DEFAULT_GROUPS,
    // 표시할 날짜 배열 — 호출자(TimelineCanvas) 가 viewUnit 에 맞춰 생성.
    // week → 7일(일~토), month → 28~31일(1일~말일).
    dates,
    spacerH = BOTTOM_H,
    // day 컬럼 폭 — TimelineCanvas 에서 container width 기반으로 측정해 전달.
    // 기본값은 상수(168) 이지만 실제 런타임에는 max(130, containerW/N) 로 세팅됨.
    dayColW = WEEK_DAY_COL_W,
  },
  ref
) {
  const { members, snippets } = useTimelineData();
  const flatRows = [];
  groups.forEach((g) => {
    flatRows.push({ type: 'groupHeader', group: g });
    g.memberIds.forEach((mid) => {
      const m = members.find((x) => x.id === mid);
      if (m) flatRows.push({ type: 'member', member: m });
    });
  });

  const rowYs = [];
  let y = 0;
  flatRows.forEach((r) => {
    rowYs.push(y);
    y += r.type === 'groupHeader' ? SUBHEADER_H : ROW_H;
  });
  const totalBodyH = y;

  const dayCount = dates.length;
  const totalInnerW = dayCount * dayColW;

  const dateIsoList = dates.map(formatIsoDate);
  const dateIsoSet = new Set(dateIsoList);

  const memberRowIndex = (mid) =>
    flatRows.findIndex((r) => r.type === 'member' && r.member.id === mid);

  const visibleSnippets = snippets.filter((sn) => dateIsoSet.has(sn.date));

  return (
    <div className="tl-right">
      <div
        className="tl-right-scroll"
        ref={ref}
        onScroll={onScroll}
        onMouseDown={onMouseDown}
      >
        <div
          className="tl-right-inner"
          style={{ width: totalInnerW, height: HEADER_H + totalBodyH + spacerH }}
        >
          {/* Sticky day-header row */}
          <div
            className="tl-right-header tl-week-header"
            style={{ width: totalInnerW, height: HEADER_H }}
          >
            {dates.map((d) => {
              const iso = formatIsoDate(d);
              const isToday = iso === TODAY_STR;
              return (
                <div
                  key={iso}
                  className="tl-week-header-cell"
                  style={{ width: dayColW }}
                >
                  <span className="tl-week-header-dow">
                    {WEEKDAY_LABELS[d.getDay()]}
                  </span>
                  <span
                    className={`tl-week-header-date ${isToday ? 'is-today' : ''}`}
                  >
                    {d.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Body */}
          <div
            className="tl-right-body"
            style={{ height: totalBodyH, width: totalInnerW }}
          >
            {/* Row backgrounds */}
            {flatRows.map((r, i) => {
              const rowY = rowYs[i];
              if (r.type === 'groupHeader') {
                return (
                  <div
                    key={`grh-${i}`}
                    className="tl-grid-group-header"
                    style={{ top: rowY, height: SUBHEADER_H, width: totalInnerW }}
                  />
                );
              }
              return (
                <div
                  key={`grr-${i}`}
                  className="tl-grid-row"
                  style={{ top: rowY, height: ROW_H, width: totalInnerW }}
                >
                  {dates.map((d) => (
                    <div
                      key={formatIsoDate(d)}
                      className="tl-grid-cell"
                      style={{ width: dayColW }}
                    />
                  ))}
                </div>
              );
            })}

            {/* Snippet blocks — 컬러는 "무조건" 해당 직원의 컬러를 따라감.
                sn.color 는 더이상 사용하지 않고 member.color 로 lookup. */}
            {visibleSnippets.map((sn) => {
              const rowIdx = memberRowIndex(sn.memberId);
              if (rowIdx < 0) return null;
              const colIdx = dateIsoList.indexOf(sn.date);
              if (colIdx < 0) return null;
              const member = flatRows[rowIdx].member;
              const palette = memberPalette(member);
              return (
                <div
                  key={sn.id}
                  className="tl-snippet"
                  style={{
                    left: colIdx * dayColW + 4,
                    top: rowYs[rowIdx] + 4,
                    width: dayColW - 8,
                    height: ROW_H - 8,
                    // hover 시 :hover 스타일이 var(--snip-bg-hover) 로 전환
                    '--snip-bg': palette.bg,
                    '--snip-bg-hover': palette.bgHover,
                    borderColor: palette.border,
                    color: palette.titleText,
                  }}
                >
                  <p className="tl-snippet-text">{sn.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

export default WeekGrid;
