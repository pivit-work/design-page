import { memberPalette } from './constants.js';
import { ChevronRightGlyph, DragHandleGlyph } from '../shared/lineIcons.jsx';

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
        <DragHandleGlyph />
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
        <ChevronRightGlyph size={10} strokeWidth={3} color="#fff" />
      </button>
    </div>
  );
}
