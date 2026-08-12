import { forwardRef } from 'react';
import {
  HOURS,
  HOUR_W,
  ROW_H,
  HEADER_H,
  SUBHEADER_H,
  BOTTOM_H,
  TODAY_STR,
  getTodayStr,
} from './constants.js';
import MeetingBlock from './MeetingBlock.jsx';
import SnippetBlock from './SnippetBlock.jsx';
import useTimelineData from './useTimelineData.js';

// 스니핏 블록 여백 — 시안(timeline-feed-view.jsx GanttView)의 주별 셀과 같은 비율.
const SNIPPET_INSET_X = 3;
const SNIPPET_INSET_Y = 8;

const TimelineGrid = forwardRef(function TimelineGrid(
  {
    onScroll,
    onMouseDown,
    groups,
    onMeetingClick,
    spacerH = BOTTOM_H,
    targetDate = TODAY_STR,
    // 빈 셀 클릭 — 본인(currentUserId) 행에서만 활성. (pos{x,y}, hour, date) 인자.
    onCellClick,
    // 스니핏 블록 클릭 — (snippet, rect). 미주입 시 블록은 그려지되 클릭은 no-op.
    onSnippetClick,
    currentUserId,
    collapsedGroups,
  },
  ref
) {
  const { members, meetings, snippets } = useTimelineData();
  // Build flat rows parallel to NameColumn — 접힌 그룹은 멤버 행을 생략해
  // NameColumn 과 동일한 Y 좌표를 유지한다(스크롤 미러·미팅 블록 정렬).
  const flatRows = [];
  groups.forEach((g) => {
    flatRows.push({ type: 'groupHeader', group: g });
    if (collapsedGroups?.has(g.id)) return;
    g.memberIds.forEach((mid) => {
      const m = members.find((x) => x.id === mid);
      if (m) flatRows.push({ type: 'member', member: m });
    });
  });

  // Compute Y positions per row
  const rowYs = [];
  let y = 0;
  flatRows.forEach((r) => {
    rowYs.push(y);
    y += r.type === 'groupHeader' ? SUBHEADER_H : ROW_H;
  });
  const totalBodyH = y;

  const totalInnerW = HOURS.length * HOUR_W;

  // Find row index for a memberId
  const memberRowIndex = (mid) =>
    flatRows.findIndex((r) => r.type === 'member' && r.member.id === mid);

  // Compute NOW vertical position — 현재 보고 있는 날짜(targetDate) 가 실제
  // 오늘일 때만 NOW 인디케이터 표시. 다른 날짜에 NOW 가 뜨는 건 의미 없음.
  const nowLine = (() => {
    if (targetDate !== getTodayStr()) return null;
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    const startH = HOURS[0];
    const endH = HOURS[HOURS.length - 1] + 1;
    if (h < startH || h > endH) return null;
    return (h - startH) * HOUR_W;
  })();

  return (
    <div className="tl-right">
      <div
        className="tl-right-scroll"
        ref={ref}
        onScroll={onScroll}
        onMouseDown={onMouseDown}
      >
        {/* 오른쪽 inner 바닥의 spacer — 왼쪽 mid 의 visible 영역보다 오른쪽
            scroll 영역이 더 크기 때문에, 오른쪽이 끝까지 스크롤됐을 때 왼쪽의
            마지막 멤버가 visible 하단에 정확히 걸리도록 계산된 spacer 를
            넣는다. TimelineCanvas 에서 ResizeObserver 로 측정해 넘겨준다. */}
        <div
          className="tl-right-inner"
          style={{ width: totalInnerW, height: HEADER_H + totalBodyH + spacerH }}
        >
          {/* Sticky hour header (40 px) — only the hour text row */}
          <div className="tl-right-header" style={{ width: totalInnerW, height: HEADER_H }}>
            {HOURS.map((h) => (
              <div key={h} className="tl-hour-cell" style={{ width: HOUR_W }}>
                {h}시
              </div>
            ))}
          </div>

          {/* Grid body */}
          <div className="tl-right-body" style={{ height: totalBodyH, width: totalInnerW }}>
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
              // 빈 셀 클릭은 본인 행에서만 — 시안 정책(m.id==="me" 에서만 crosshair).
              const cellClickable = !!onCellClick && r.member.id === currentUserId;
              return (
                <div
                  key={`grr-${i}`}
                  className="tl-grid-row"
                  style={{ top: rowY, height: ROW_H, width: totalInnerW }}
                >
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className={`tl-grid-cell${cellClickable ? ' is-clickable' : ''}`}
                      style={{ width: HOUR_W }}
                      {...(cellClickable
                        ? {
                            onClick: (e) =>
                              onCellClick({ x: e.clientX, y: e.clientY }, h, targetDate),
                          }
                        : null)}
                    />
                  ))}
                </div>
              );
            })}

            {/* Snippet blocks — "이 멤버가 이 시각에 스니핏을 썼다".
                미팅과 달리 구간이 아니라 한 시점이므로 블록 왼쪽 모서리를 작성
                시각에 맞추고 폭은 한 시간 칸으로 고정한다. hour 가 없는 스니핏
                (작성 시각을 모르는 데이터)은 시각을 지어내지 않고 건너뛴다.
                z-index 는 미팅(3)보다 아래(2) — 미팅 곡선·타이틀이 가려지지 않게. */}
            {(snippets || [])
              .filter((s) => s.date === targetDate && typeof s.hour === 'number')
              .map((s) => {
                const rowIdx = memberRowIndex(s.memberId);
                if (rowIdx < 0) return null;
                const member = members.find((m) => m.id === s.memberId);
                if (!member) return null;
                const width = HOUR_W - SNIPPET_INSET_X * 2;
                const rawLeft = (s.hour - HOURS[0]) * HOUR_W + SNIPPET_INSET_X;
                // 23시대에 쓴 스니핏이 마지막 칸을 넘어가지 않도록 클램프.
                const left = Math.max(
                  0,
                  Math.min(rawLeft, totalInnerW - width - SNIPPET_INSET_X)
                );
                return (
                  <SnippetBlock
                    key={s.id}
                    snippet={s}
                    member={member}
                    left={left}
                    top={rowYs[rowIdx] + SNIPPET_INSET_Y}
                    width={width}
                    height={ROW_H - SNIPPET_INSET_Y * 2}
                    onClick={onSnippetClick}
                  />
                );
              })}

            {/* Meeting blocks — POLICY: bezier curves only connect participants
                within the SAME group. We bucket each meeting's participants by
                their CURRENT group, then render one MeetingBlock instance per
                bucket. A member that's been moved to a different group becomes
                visually disconnected from the rest of the meeting. */}
            {meetings.filter((mt) => mt.date === targetDate).flatMap((mt) => {
              const originalLeft = (mt.startHour - HOURS[0]) * HOUR_W;
              const originalWidth = mt.durationH * HOUR_W;

              // Bucket participants by their current group
              const byGroup = new Map();
              mt.participants.forEach((pid) => {
                const rowIdx = memberRowIndex(pid);
                if (rowIdx < 0) return;
                const member = members.find((m) => m.id === pid);
                if (!member) return;
                const currentGroup = groups.find((g) => g.memberIds.includes(pid));
                if (!currentGroup) return;
                if (!byGroup.has(currentGroup.id)) byGroup.set(currentGroup.id, []);
                byGroup.get(currentGroup.id).push({
                  member,
                  rowCenterY: rowYs[rowIdx] + ROW_H / 2,
                });
              });

              // Render one block per group bucket. Skip groups that ended up
              // with zero participants for this meeting.
              return Array.from(byGroup.entries()).map(([groupId, parts]) => {
                if (parts.length === 0) return null;

                const sorted = [...parts].sort(
                  (a, b) => a.rowCenterY - b.rowCenterY
                );
                const firstCenterY = sorted[0].rowCenterY;
                const lastCenterY = sorted[sorted.length - 1].rowCenterY;

                // Same geometry as before — markers 6 px inside cell, gradient
                // extends 4 px outside markers on every side.
                const gradientLeft = originalLeft + 2;
                const gradientWidth = originalWidth - 4;
                const gradientTop = firstCenterY - 10;
                const gradientBottom = lastCenterY + 10;
                const gradientHeight = gradientBottom - gradientTop;
                const titleY = (firstCenterY + lastCenterY) / 2;

                return (
                  <MeetingBlock
                    key={`${mt.id}-${groupId}`}
                    meeting={mt}
                    left={gradientLeft}
                    width={gradientWidth}
                    gradientTop={gradientTop}
                    gradientHeight={gradientHeight}
                    titleY={titleY}
                    participants={sorted}
                    onTitleClick={onMeetingClick}
                  />
                );
              }).filter(Boolean);
            })}

            {/* NOW dashed line + label — rendered inside the body so they sit in
                the first group sub-header row (body local y 0–26). The line
                extends through the entire body height. */}
            {nowLine !== null && (
              <>
                <div
                  className="tl-now-line"
                  style={{ left: nowLine, top: 0, height: totalBodyH }}
                />
                <div
                  className="tl-now-label"
                  style={{ left: nowLine, top: SUBHEADER_H / 2 }}
                >
                  NOW
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default TimelineGrid;
