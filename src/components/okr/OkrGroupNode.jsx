import OkrGroupCard from './OkrGroupCard.jsx';
import ObjectiveRow from './ObjectiveRow.jsx';
import OkrMemberChip from './OkrMemberChip.jsx';
import { useOkrDrag } from './hooks.js';
import rowKey from './rowKey.js';

/**
 * «외 N개» 를 누른 채 이만큼 안에서 놓으면 누름으로 본다(PW-2214). 버튼 글자가 작아(기본 배율 26×9px)
 * 손이 조금만 떨려도 놓는 자리가 글자 밖이 되고, 그러면 브라우저가 click 을 안 낸다. 이 버튼은 아무것도
 * 끌지 않으므로(캔버스 끌기 제외) 카드 끌기 문턱(5px)보다 넉넉히 둔다.
 */
const MORE_CLICK_SLOP = 10;

/**
 * OkrGroupNode — 그룹(회사/조직 단위/개인) 서브트리 노드.
 *
 * 조직도 OrgNode 처럼 드래그 transform 을 노드 래퍼에 적용해, 헤드 카드를
 * 끌면 하위 블록(objective 행·구성원 칩·children)이 함께 움직인다.
 * 헤드 카드가 mousedown 을 시작하고, 제자리 클릭이면 onOpen(상세 모달).
 * children 은 루트 노드가 팀 노드들(.okr-teams-row)을 중첩할 때 쓴다.
 *
 * 🔴 Objective 가 0건이어도 **노드는 남는다** — 그 기간에 OKR 을 세우지 않은
 * 조직과 트리에서 빠진 조직이 화면에서 같아 보이면 안 된다
 * (`okr-policy.md §3.4-A T2`, PW-413). 빈 자리는 점선 플레이스홀더로 말한다.
 * 단 `progress` 가 null 인 칸(공개 범위로 가려진 개인)은 «없음»이 아니라 «못 봄»이라
 * 플레이스홀더를 그리지 않는다 — 「등록된 Objective 없음」은 사실이 아니다 (PW-1980).
 */
export default function OkrGroupNode({
  group,
  isRoot = false,
  onOpen,
  emptyObjectivesLabel = '등록된 Objective 없음',
  // 노드마다 Objective 는 3개(개인 2개)까지만 — 넘치면 이 문구 한 줄(okr-spec §9A.5 · PW-1503).
  moreObjectivesLabel = (n) => `외 ${n}개 …`,
  // false 면 Objective 요약(빈 자리 표시 포함)을 접는다 — 툴바 전체 접기(okr-policy.md §3.4, PW-1641).
  objectivesExpanded = true,
  children,
}) {
  const { isDragging, onDown, style } = useOkrDrag(group.id, () => onOpen(group.id));
  const objectives = group.objectives ?? [];
  const isPerson = group.type === 'person';
  const shown = objectives.slice(0, isPerson ? 2 : 3);
  const hiddenCount = objectives.length - shown.length;
  // 마우스는 누른 자리와 놓은 자리의 거리로 가르고, 키보드(Enter·Space — click.detail 0)는 onClick 으로 연다.
  const onMoreDown = (e) => {
    if (e.button !== 0) return;
    const sx = e.clientX;
    const sy = e.clientY;
    const up = (ev) => {
      window.removeEventListener('mouseup', up);
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < MORE_CLICK_SLOP) onOpen(group.id);
    };
    window.addEventListener('mouseup', up);
  };

  return (
    <div
      className={`okr-node ${isRoot ? 'okr-group-root' : isPerson ? 'okr-person-col' : 'okr-team-col'}${isDragging ? ' okr-node-dragging' : ''}`}
      style={style}
    >
      <OkrGroupCard group={group} onMouseDown={onDown} isDragging={isDragging} />
      {!objectivesExpanded ? null : objectives.length > 0 ? (
        <div className="okr-objective-list">
          {shown.map((objective, i) => (
            <ObjectiveRow
              key={rowKey(objective, i, 'title')}
              objective={objective}
              dragId={`${group.id}:obj:${i}`}
              onClick={() => onOpen(group.id)}
            />
          ))}
          {/* 나머지는 상세 창에서 본다 — 요약 줄을 누른 것과 같은 창이다. */}
          {hiddenCount > 0 && (
            <button
              type="button"
              className="okr-objective-more"
              onMouseDown={onMoreDown}
              onClick={(e) => { if (e.detail === 0) onOpen(group.id); }}
            >
              {moreObjectivesLabel(hiddenCount)}
            </button>
          )}
        </div>
      ) : group.progress == null ? null : (
        <div className="okr-objective-list okr-objective-empty">{emptyObjectivesLabel}</div>
      )}
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
