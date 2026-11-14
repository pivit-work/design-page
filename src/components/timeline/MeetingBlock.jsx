import { Fragment } from 'react';
import { memberPalette } from './constants.js';
import StatusBadge from '../shared/StatusBadge.jsx';

/**
 * MeetingBlock
 *
 * Layer stack (z-index low → high):
 *   0. gradient background — top color = first participant's color,
 *                            bottom color = last participant's color (both low alpha)
 *   1. SVG bezier curves (member-colored, from each marker to title center)
 *   2. chevron markers (left/right at each participant row edge)
 *   3. title pill + participant count (black pill | outside count)
 *
 * Coordinate system (gradient block local):
 *   Chevron markers sit 4 px inside every gradient block edge. The block itself
 *   is positioned 2 px inside the cell edges so the markers land 6 px inside the
 *   hour cell edges (2 + 4 = 6).
 *
 * Props:
 *   meeting       meeting object { id, title, participants, colorKey?, ... }
 *                 colorKey — palette key; 주면 참석자 색 대신 이 한 색으로 칠한다
 *   left          gradient block left (px)
 *   width         gradient block width (px)
 *   gradientTop   gradient block top (px)
 *   gradientHeight gradient block height (px)
 *   titleY        absolute Y of the title pill center (grid body coordinate)
 *   participants  [{ member, rowCenterY }, ...] — sorted by rowCenterY
 *   onTitleHover / onTitleHoverEnd  제목 알약에 마우스가 들어오고 나갈 때 — (meeting, rect) / () (pivit-work PW-2798 · 기획서 §13.3)
 *   onMinutesClick  meeting.minutes 가 있을 때 참석자 수 옆 «회의록» 딱지를 누르면 (meeting) (pivit-work PW-2798 · 기획서 §5-C)
 *                   meeting.minutes = { id, badge } — badge 는 딱지 글자(호스트가 준다)
 */
const MARKER = 12;       // chevron pill size
const MARKER_INSET = 4;  // 4 px padding from gradient block edges to markers

function hexToRgba(hex, alpha) {
  const h = (hex || '#000000').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function MeetingBlock({
  meeting,
  left,
  width,
  gradientTop,
  gradientHeight,
  titleY,
  participants,
  onTitleClick,
  onTitleHover,
  onTitleHoverEnd,
  onMinutesClick,
}) {
  const localTitleY = titleY - gradientTop;
  const centerX = width / 2;

  // Marker positions inside the gradient block
  const leftMarkerX = MARKER_INSET;                   // left edge of left marker
  const rightMarkerX = width - MARKER_INSET - MARKER; // left edge of right marker
  // Curve start X = marker centers
  const leftCurveX = leftMarkerX + MARKER / 2;
  const rightCurveX = rightMarkerX + MARKER / 2;

  // Dynamic gradient — top = first participant's color, bottom = last participant's color.
  // member.color 는 이제 palette key(예: 'brand') → solid(-600) hex 를 lookup.
  // meeting.colorKey 가 있으면 블록 전체(바탕·곡선·표식)를 그 한 색으로 칠한다 —
  // 사람 수가 많으면 사람별 색이 구분되지 않아 일정 종류 색으로 칠하는 경우 (PW-1924).
  const solidOf = (member) => memberPalette(meeting.colorKey || member).solid;
  const topColor = solidOf(participants[0].member);
  const bottomColor = solidOf(participants[participants.length - 1].member);
  const gradientStyle = {
    background: `linear-gradient(180deg, ${hexToRgba(topColor, 0.1)} 0%, ${hexToRgba(bottomColor, 0.1)} 100%)`,
  };

  return (
    <div
      className="tl-meeting-block"
      style={{
        left,
        top: gradientTop,
        width,
        height: gradientHeight,
      }}
    >
      {/* Layer 0: gradient background (dynamic per meeting) */}
      <div className="tl-meeting-gradient" style={gradientStyle} />

      {/* Layer 1: SVG curves */}
      <svg
        className="tl-meeting-svg"
        width={width}
        height={gradientHeight}
        viewBox={`0 0 ${width} ${gradientHeight}`}
        aria-hidden="true"
      >
        {participants.map((p) => {
          const localY = p.rowCenterY - gradientTop;
          const midY = (localY + localTitleY) / 2;
          const solid = solidOf(p.member);
          // Cubic bezier — starts vertical at the marker, ends horizontal into title center
          const leftPath = `M ${leftCurveX} ${localY} C ${leftCurveX} ${midY}, ${centerX} ${midY}, ${centerX} ${localTitleY}`;
          const rightPath = `M ${rightCurveX} ${localY} C ${rightCurveX} ${midY}, ${centerX} ${midY}, ${centerX} ${localTitleY}`;
          return (
            <g key={p.member.id}>
              <path
                d={leftPath}
                stroke={solid}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d={rightPath}
                stroke={solid}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </svg>

      {/* Layer 2: chevron markers */}
      {participants.map((p) => {
        const y = p.rowCenterY - gradientTop - MARKER / 2;
        const solid = solidOf(p.member);
        return (
          <Fragment key={p.member.id}>
            <div
              className="tl-chevron-marker"
              style={{ left: leftMarkerX, top: y, background: solid }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M7.25 3.5L4.75 6l2.5 2.5"
                  stroke="#fff"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div
              className="tl-chevron-marker"
              style={{ left: rightMarkerX, top: y, background: solid }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M4.75 3.5L7.25 6l-2.5 2.5"
                  stroke="#fff"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </Fragment>
        );
      })}

      {/* Layer 3: title pill + outside participant count */}
      <div
        className="tl-meeting-label"
        style={{
          left: '50%',
          top: localTitleY,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* noOpen — 열어 보일 내용이 없는 칸(동료의 구글 «비공개» 일정 = «바쁨», pivit-work PW-2641). 누를 수 없는 글자로 둔다. */}
        {meeting.noOpen ? (
          <span
            className="tl-meeting-title-pill"
            style={{ cursor: 'default' }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={(e) => onTitleHover?.(meeting, e.currentTarget.getBoundingClientRect())}
            onMouseLeave={() => onTitleHoverEnd?.()}
          >
            {meeting.title}
          </span>
        ) : (
          <button
            type="button"
            className="tl-meeting-title-pill"
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              onTitleClick?.(meeting, rect);
            }}
            onMouseEnter={(e) => onTitleHover?.(meeting, e.currentTarget.getBoundingClientRect())}
            onMouseLeave={() => onTitleHoverEnd?.()}
          >
            {meeting.title}
          </button>
        )}
        <div className="tl-meeting-count">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 1.333c-2.21 0-6 1.11-6 3.334V14h12v-1.333c0-2.224-3.79-3.334-6-3.334z" />
          </svg>
          <span>{meeting.participants.length}</span>
          {/* 회의록이 이어진 구글 일정 막대 — 그 회의 참석자에게만 호스트가 minutes 를 싣는다 (pivit-work PW-2798 · 기획서 §5-C).
              딱지 모양은 같은 일정의 호버 카드 «회의록 있음»과 같은 Weekly 태그(.tl-weekly-entry-tag). */}
          {meeting.minutes && (
            <StatusBadge
              as="button"
              type="button"
              className="tl-weekly-entry-tag tl-meeting-minutes-badge"
              data-testid="gantt-meeting-minutes-badge"
              onClick={(e) => {
                e.stopPropagation();
                onMinutesClick?.(meeting);
              }}
            >
              {meeting.minutes.badge}
            </StatusBadge>
          )}
        </div>
      </div>
    </div>
  );
}
