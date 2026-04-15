import { forwardRef } from 'react';
import Icon from '../shared/Icon.jsx';
import { SUBHEADER_H, ROW_H, memberPalette } from './constants.js';
import useTimelineData from './useTimelineData.js';

function GroupHeader({ group }) {
  return (
    <div
      className="tl-group-header"
      style={{ height: SUBHEADER_H }}
      data-tl-group={group.id}
    >
      <div className="tl-group-header-label">
        <span className="tl-group-header-name">{group.label}</span>
        <span className="tl-group-header-count">{group.memberIds.length}</span>
      </div>
      <button type="button" className="tl-group-header-add" aria-label="멤버 추가">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2.5v7M2.5 6h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function MemberRow({ member, groupId, idx, filteredIdx, hidden, onMouseDown }) {
  return (
    <div
      className="tl-member-row"
      style={{ height: ROW_H, ...(hidden ? { display: 'none' } : null) }}
      data-tl-member={member.id}
      data-tl-group={groupId}
      data-tl-filtered-idx={filteredIdx}
      onMouseDown={(e) => {
        // Left button only
        if (e.button !== 0) return;
        // Avoid stealing clicks meant for the arrow button etc.
        if (e.target.closest('button')) return;
        onMouseDown(e, member, groupId, idx);
      }}
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
        {/* draggable=false prevents the native image drag from swallowing
            the mousedown that would otherwise start our custom drag */}
        <img src={member.photo} alt={member.name} draggable={false} />
      </div>
      <div className="tl-member-info">
        <div className="tl-member-name">{member.name}</div>
        <div className="tl-member-title">{member.title}</div>
      </div>
      <button
        type="button"
        className="tl-member-arrow"
        style={{ background: memberPalette(member).solid }}
        aria-label={`${member.name} 상세 보기`}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M6 4l4 4-4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

function PlaceholderRow({ groupId, index }) {
  return (
    <div
      className="tl-member-placeholder-wrap"
      style={{ height: ROW_H }}
      data-tl-group={groupId}
      data-tl-index={index}
    >
      <div className="tl-member-placeholder" />
    </div>
  );
}

function BottomButtons({ icons, baseUrl, onAddGroup, onAddInternalMember, onAddExternalMember }) {
  return (
    <div className="tl-left-bottom-inner">
      <button type="button" className="tl-btn-group-add" onClick={onAddGroup}>
        <span className="tl-btn-group-add-icon">
          <Icon src={icons.plus} size={14} color="var(--text-tertiary)" baseUrl={baseUrl} />
        </span>
        <span>그룹 추가</span>
      </button>
      <button type="button" className="tl-btn-add-member" onClick={onAddInternalMember}>
        <Icon src="/icons-solid/user-circle.svg" size={20} color="var(--colors-foreground-fgTertiary)" baseUrl={baseUrl} />
        <span>내부 직원 추가</span>
      </button>
      <button type="button" className="tl-btn-add-member" onClick={onAddExternalMember}>
        <Icon src="/icons-solid/user-plus-01.svg" size={20} color="var(--colors-foreground-fgTertiary)" baseUrl={baseUrl} />
        <span>외부 직원 추가</span>
      </button>
    </div>
  );
}

const NameColumn = forwardRef(function NameColumn(
  {
    icons,
    baseUrl,
    contentRef,
    groups,
    dragState,
    dragOver,
    onStartDrag,
    onAddGroup,
    onAddInternalMember,
    onAddExternalMember,
  },
  ref
) {
  const { members } = useTimelineData();
  // The dragged member is rendered with display:none so it collapses out of
  // layout (other rows shift up). The placeholder is inserted at dragOver.index
  // in FILTERED space (index ignores the dragged row).
  const flatRows = [];
  groups.forEach((g) => {
    flatRows.push({ type: 'groupHeader', group: g });

    const sourceIdx = dragState
      ? g.memberIds.indexOf(dragState.member.id)
      : -1;
    const visibleCount =
      sourceIdx >= 0 ? g.memberIds.length - 1 : g.memberIds.length;

    g.memberIds.forEach((mid, idx) => {
      const isDragged = dragState && mid === dragState.member.id;

      let filteredIdx = idx;
      if (sourceIdx >= 0 && idx > sourceIdx) filteredIdx = idx - 1;

      // Insert placeholder BEFORE this row (in filtered space)?
      if (
        !isDragged &&
        dragOver &&
        dragOver.groupId === g.id &&
        dragOver.index === filteredIdx
      ) {
        flatRows.push({
          type: 'placeholder',
          groupId: g.id,
          index: filteredIdx,
          key: `ph-${g.id}-${filteredIdx}`,
        });
      }

      const m = members.find((x) => x.id === mid);
      if (m) {
        flatRows.push({
          type: 'member',
          member: m,
          groupId: g.id,
          idx,
          filteredIdx: isDragged ? -1 : filteredIdx,
          hidden: isDragged,
        });
      }
    });

    // Placeholder at the END of this group?
    if (
      dragOver &&
      dragOver.groupId === g.id &&
      dragOver.index >= visibleCount
    ) {
      flatRows.push({
        type: 'placeholder',
        groupId: g.id,
        index: visibleCount,
        key: `ph-${g.id}-end`,
      });
    }
  });

  return (
    <div className="tl-left">
      <div className="tl-left-header">이름</div>
      {/* tl-left-mid: 자체 스크롤 없음 (overflow:hidden). 내부의
          tl-left-mid-content 가 transform: translateY 로 이동해 오른쪽
          scrollTop 을 mirror 한다. wheel 이벤트는 부모에서 native
          addEventListener(passive:false) 로 잡아 오른쪽 scrollTop 으로
          forward 한다. */}
      <div className="tl-left-mid" ref={ref}>
        <div className="tl-left-mid-content" ref={contentRef}>
          {flatRows.map((r) => {
            if (r.type === 'groupHeader') {
              return <GroupHeader key={`g-${r.group.id}`} group={r.group} />;
            }
            if (r.type === 'placeholder') {
              return (
                <PlaceholderRow
                  key={r.key}
                  groupId={r.groupId}
                  index={r.index}
                />
              );
            }
            // member row
            return (
              <MemberRow
                key={`m-${r.groupId}-${r.idx}-${r.member.id}`}
                member={r.member}
                groupId={r.groupId}
                idx={r.idx}
                filteredIdx={r.filteredIdx}
                hidden={r.hidden}
                onMouseDown={onStartDrag}
              />
            );
          })}
        </div>
      </div>
      <div className="tl-left-bottom">
        <BottomButtons
          icons={icons}
          baseUrl={baseUrl}
          onAddGroup={onAddGroup}
          onAddInternalMember={onAddInternalMember}
          onAddExternalMember={onAddExternalMember}
        />
      </div>
    </div>
  );
});

export default NameColumn;
