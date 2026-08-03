import { useState, useRef, useEffect } from 'react';
import {
  TeamIcon, ChevronRightIcon, ChevronDownIcon, MoreVerticalIcon,
  PencilIcon, PlusIcon, FolderInputIcon, Trash2Icon, UserIcon,
} from './teamIcons.jsx';

/**
 * TeamInsertZone — 형제 노드 사이의 얇은 드롭 존. 같은 부모(같은 depth)의 형제를
 * 드래그 중일 때만 활성화되어 삽입선을 그리고, 드롭 시 재정렬된 형제 id 순서를
 * onReorder 로 방출한다. 다른 그룹의 노드를 드래그할 때는 비활성(재부모지정은
 * 기존처럼 노드 행에 드롭). layout shift 를 막으려고 세로 음수 마진으로 겹친다.
 */
export function TeamInsertZone({ siblingIds, index, depth = 0, draggingId, onReorder }) {
  const [active, setActive] = useState(false);
  const isSameGroup = !!draggingId && siblingIds.includes(draggingId);

  const handleDragOver = (e) => {
    if (!isSameGroup) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDragEnter = (e) => {
    if (!isSameGroup) return;
    e.preventDefault();
    setActive(true);
  };
  const handleDragLeave = () => setActive(false);
  const handleDrop = (e) => {
    setActive(false);
    if (!isSameGroup) return;
    e.preventDefault();
    e.stopPropagation();
    const from = siblingIds.indexOf(draggingId);
    const without = siblingIds.filter((id) => id !== draggingId);
    // index 는 원본 형제 기준 삽입 슬롯(0..n). 드래그 대상이 그 앞이면 한 칸 보정.
    const insertAt = from < index ? index - 1 : index;
    const next = [...without.slice(0, insertAt), draggingId, ...without.slice(insertAt)];
    const unchanged =
      next.length === siblingIds.length && next.every((id, i) => id === siblingIds[i]);
    if (unchanged) return;
    onReorder?.(next);
  };

  return (
    <div
      className={`tm-node-insert-zone${active ? ' is-active' : ''}`}
      style={{ marginLeft: 10 + depth * 20, marginRight: 8 }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-hidden="true"
    />
  );
}

function subtreeHasId(node, id) {
  if (node.id === id) return true;
  return (node.children || []).some((c) => subtreeHasId(c, id));
}

/**
 * AdminTeamTreeNode — 팀 트리 노드(재귀). 확장/축소·DnD·컨텍스트 메뉴·인라인 생성.
 * 순수 표현: labels 로 문자열 주입, 콜백으로 상호작용 위임.
 */
export default function AdminTeamTreeNode({
  node, depth = 0, selectedId, labels, onSelect, onContextAction,
  onDragStart, onDragEnd, onDrop, onReorder, reorderEnabled = false, draggingId,
  inlineCreateParentId, inlineCreateValue, onInlineCreateChange,
  onInlineCreateConfirm, onInlineCreateCancel,
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [showMenu, setShowMenu] = useState(false);
  const [hov, setHov] = useState(false);
  const [isDragTarget, setIsDragTarget] = useState(false);
  const dragCounterRef = useRef(0);
  const rowRef = useRef(null);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;
  const isDragging = draggingId === node.id;

  // 선택된 팀이 이 노드의 **하위**에 있으면 자동 확장한다. 상세 패널의 하위 팀 칩처럼
  // 트리 밖에서 선택이 바뀌어도 좌측 트리가 그 위치를 드러내도록 동기화하는 장치
  // (기본 확장은 depth<2 라 3뎁스 이하 팀은 접힌 채로 남아 선택이 보이지 않았다).
  // "렌더 중 파생 상태 갱신"(React docs) — effect 내 setState 로 인한 연쇄 렌더 회피.
  // autoExpandedFor 로 선택 1건당 한 번만 펼쳐, 사용자가 직접 접은 것을 되돌리지 않는다.
  const hasSelectedDescendant =
    !!selectedId && selectedId !== node.id && hasChildren && subtreeHasId(node, selectedId);
  const [autoExpandedFor, setAutoExpandedFor] = useState(null);
  if (hasSelectedDescendant && autoExpandedFor !== selectedId) {
    setAutoExpandedFor(selectedId);
    setExpanded(true);
  }

  // 선택된 행을 뷰포트 안으로. 긴 트리에서 확장만으로는 화면 밖에 남을 수 있다.
  useEffect(() => {
    if (isSelected) rowRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [isSelected]);

  const handleDragStart = (e) => {
    if (node.isUnassigned) return;
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(node.id);
  };
  const handleDragOver = (e) => {
    if (!draggingId || draggingId === node.id || node.isUnassigned) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDragEnter = (e) => {
    if (!draggingId || draggingId === node.id || node.isUnassigned) return;
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDragTarget(true);
  };
  const handleDragLeave = () => {
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setIsDragTarget(false); }
  };
  const handleDrop = (e) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragTarget(false);
    if (!draggingId || draggingId === node.id || node.isUnassigned) return;
    onDrop?.(node.id);
  };
  const handleDragEnd = () => {
    dragCounterRef.current = 0;
    setIsDragTarget(false);
    onDragEnd?.(); // 캔버스 draggingId 해제(드래그중 opacity 잔상 제거).
  };

  const showInlineCreate = inlineCreateParentId === node.id;

  const rowClass = [
    'tm-node-row',
    node.isUnassigned ? 'is-unassigned' : '',
    isDragTarget ? 'is-drop-target' : isSelected ? 'is-selected' : hov ? 'is-hover' : '',
    isDragging ? 'is-dragging' : '',
  ].filter(Boolean).join(' ');

  const menuItems = [
    { action: 'edit', label: labels.editTeam, Icon: PencilIcon },
    { action: 'addSub', label: labels.addSubTeam, Icon: PlusIcon },
    { action: 'move', label: labels.moveTeam, Icon: FolderInputIcon },
    { action: 'delete', label: labels.deleteTeam, Icon: Trash2Icon, danger: true },
  ];

  return (
    <div>
      <div
        ref={rowRef}
        data-testid={`tm-node-${node.id}`}
        draggable={!node.isUnassigned}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onClick={() => onSelect(node.id)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => { setHov(false); setShowMenu(false); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onSelect(node.id); }}
        className={rowClass}
        style={{ paddingLeft: 10 + depth * 20 }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="tm-node-toggle"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />}
          </button>
        ) : (
          <span className="tm-node-toggle is-leaf" />
        )}

        <span className="tm-node-icon">
          {node.isUnassigned ? <UserIcon size={15} /> : <TeamIcon name={node.icon} size={15} />}
        </span>

        <span className={`tm-node-name${node.isUnassigned ? ' is-unassigned' : ''}`}>
          {node.isUnassigned ? labels.unassigned : node.name}
        </span>

        <span className="tm-node-count">{node.memberCount}</span>

        {hov && !node.isUnassigned && onContextAction && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="tm-node-menu-btn"
              aria-label={labels.openMenu}
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            >
              <MoreVerticalIcon size={15} />
            </button>
            {showMenu && (
              <div className="tm-menu" style={{ top: '100%', right: 0 }}>
                {menuItems.map(({ action, label, Icon, danger }) => (
                  <button
                    type="button"
                    key={action}
                    className={`tm-menu-item${danger ? ' is-danger' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onContextAction(action, node.id); setShowMenu(false); }}
                  >
                    <span className="tm-menu-item-icon"><Icon size={14} /></span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showInlineCreate && (
        <div className="tm-node-create" style={{ paddingLeft: 10 + (depth + 1) * 20 }}>
          <input
            autoFocus
            className="tm-inline-input"
            value={inlineCreateValue}
            onChange={(e) => onInlineCreateChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onInlineCreateConfirm?.();
              if (e.key === 'Escape') onInlineCreateCancel?.();
            }}
            onBlur={onInlineCreateCancel}
            placeholder={labels.newTeamName}
            data-testid="inline-create-input"
          />
        </div>
      )}

      {expanded && hasChildren && (() => {
        const childIds = node.children.map((c) => c.id);
        // 이 그룹의 형제를 드래그 중일 때만 삽입 존을 노출(같은 부모 내 재정렬).
        const showZones = reorderEnabled && !!draggingId && childIds.includes(draggingId);
        return (
          <div>
            {node.children.map((child, i) => (
              <div key={child.id}>
                {showZones && (
                  <TeamInsertZone
                    siblingIds={childIds}
                    index={i}
                    depth={depth + 1}
                    draggingId={draggingId}
                    onReorder={onReorder}
                  />
                )}
                <AdminTeamTreeNode
                  node={child}
                  depth={depth + 1}
                  selectedId={selectedId}
                  labels={labels}
                  onSelect={onSelect}
                  onContextAction={onContextAction}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDrop={onDrop}
                  onReorder={onReorder}
                  reorderEnabled={reorderEnabled}
                  draggingId={draggingId}
                  inlineCreateParentId={inlineCreateParentId}
                  inlineCreateValue={inlineCreateValue}
                  onInlineCreateChange={onInlineCreateChange}
                  onInlineCreateConfirm={onInlineCreateConfirm}
                  onInlineCreateCancel={onInlineCreateCancel}
                />
              </div>
            ))}
            {showZones && (
              <TeamInsertZone
                siblingIds={childIds}
                index={node.children.length}
                depth={depth + 1}
                draggingId={draggingId}
                onReorder={onReorder}
              />
            )}
          </div>
        );
      })()}
    </div>
  );
}
