import OkrGroupCard from './OkrGroupCard.jsx';
import ObjectiveRow from './ObjectiveRow.jsx';
import OkrMemberChip from './OkrMemberChip.jsx';
import { useOkrDrag } from './hooks.js';
import rowKey from './rowKey.js';

/**
 * OkrGroupNode — 그룹(회사/팀) 서브트리 노드.
 *
 * 조직도 OrgNode 처럼 드래그 transform 을 노드 래퍼에 적용해, 헤드 카드를
 * 끌면 하위 블록(objective 행·구성원 칩·children)이 함께 움직인다.
 * 헤드 카드가 mousedown 을 시작하고, 제자리 클릭이면 onOpen(상세 모달).
 * children 은 루트 노드가 팀 노드들(.okr-teams-row)을 중첩할 때 쓴다.
 */
export default function OkrGroupNode({ group, isRoot = false, onOpen, children }) {
  const { isDragging, onDown, style } = useOkrDrag(group.id, () => onOpen(group.id));

  return (
    <div
      className={`okr-node ${isRoot ? 'okr-group-root' : 'okr-team-col'}${isDragging ? ' okr-node-dragging' : ''}`}
      style={style}
    >
      <OkrGroupCard group={group} onMouseDown={onDown} isDragging={isDragging} />
      <div className="okr-objective-list">
        {group.objectives.map((objective, i) => (
          <ObjectiveRow
            key={rowKey(objective, i, 'title')}
            objective={objective}
            dragId={`${group.id}:obj:${i}`}
            onClick={() => onOpen(group.id)}
          />
        ))}
      </div>
      {group.members?.length > 0 && (
        <div className="okr-members">
          {group.members.map((member, i) => (
            <OkrMemberChip
              key={rowKey(member, i)}
              member={member}
              dragId={`${group.id}:member:${rowKey(member, i)}`}
              onClick={() => onOpen(group.id)}
            />
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
