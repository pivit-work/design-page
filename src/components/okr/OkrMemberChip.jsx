import { useOkrDrag } from './hooks.js';

/**
 * OkrMemberChip — 아바타 + 이름 칩 (팀 하위 구성원).
 * 드래그로 자유 배치, 제자리 클릭이면 onClick(상세 모달).
 */
export default function OkrMemberChip({ member, dragId, onClick }) {
  const { isDragging, onDown, style } = useOkrDrag(dragId, onClick);
  return (
    <div
      className={`okr-member-chip${isDragging ? ' okr-block-dragging' : ''}`}
      style={style}
      onMouseDown={onDown}
    >
      <span className="okr-member-avatar">
        <img src={member.avatar} alt={member.name} draggable={false} />
        <span className="okr-member-online" />
      </span>
      <span className="okr-member-name">{member.name}</span>
    </div>
  );
}
