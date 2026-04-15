import { memberPalette } from './constants.js';

// Floating drag preview — rendered at body level via fixed positioning.
// Fully solid (no opacity), follows the cursor, pointer-events:none so
// it doesn't interfere with elementFromPoint hit-testing.
export default function DragPreview({ member, x, y, width, height }) {
  return (
    <div
      className="tl-drag-preview"
      style={{ left: x, top: y, width, height }}
    >
      <div className="tl-drag-handle" aria-hidden="true">
        <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
          <circle cx="1.25" cy="1.25" r="1.25" fill="#D2D6DB" />
          <circle cx="4.75" cy="1.25" r="1.25" fill="#D2D6DB" />
          <circle cx="1.25" cy="5" r="1.25" fill="#D2D6DB" />
          <circle cx="4.75" cy="5" r="1.25" fill="#D2D6DB" />
          <circle cx="1.25" cy="8.75" r="1.25" fill="#D2D6DB" />
          <circle cx="4.75" cy="8.75" r="1.25" fill="#D2D6DB" />
        </svg>
      </div>
      <div className="tl-member-avatar">
        <img src={member.photo} alt="" draggable={false} />
      </div>
      <div className="tl-member-info">
        <div className="tl-member-name">{member.name}</div>
        <div className="tl-member-title">{member.title}</div>
      </div>
      <button
        type="button"
        className="tl-member-arrow"
        style={{ background: memberPalette(member).solid }}
        tabIndex={-1}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M6 4l4 4-4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
