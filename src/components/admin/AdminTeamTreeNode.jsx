import { useState, useRef } from 'react';
import {
  TeamIcon, ChevronRightIcon, ChevronDownIcon, MoreVerticalIcon,
  PencilIcon, PlusIcon, FolderInputIcon, Trash2Icon, UserIcon,
} from './teamIcons.jsx';

/**
 * AdminTeamTreeNode — 팀 트리 노드(재귀). 확장/축소·DnD·컨텍스트 메뉴·인라인 생성.
 * 순수 표현: labels 로 문자열 주입, 콜백으로 상호작용 위임.
 */
export default function AdminTeamTreeNode({
  node, depth = 0, selectedId, labels, onSelect, onContextAction,
  onDragStart, onDrop, draggingId,
  inlineCreateParentId, inlineCreateValue, onInlineCreateChange,
  onInlineCreateConfirm, onInlineCreateCancel,
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const [showMenu, setShowMenu] = useState(false);
  const [hov, setHov] = useState(false);
  const [isDragTarget, setIsDragTarget] = useState(false);
  const dragCounterRef = useRef(0);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;
  const isDragging = draggingId === node.id;

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
  const handleDragEnd = () => { dragCounterRef.current = 0; setIsDragTarget(false); };

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

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <AdminTeamTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              labels={labels}
              onSelect={onSelect}
              onContextAction={onContextAction}
              onDragStart={onDragStart}
              onDrop={onDrop}
              draggingId={draggingId}
              inlineCreateParentId={inlineCreateParentId}
              inlineCreateValue={inlineCreateValue}
              onInlineCreateChange={onInlineCreateChange}
              onInlineCreateConfirm={onInlineCreateConfirm}
              onInlineCreateCancel={onInlineCreateCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
