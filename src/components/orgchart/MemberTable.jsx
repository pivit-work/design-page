import { useState, useRef, useEffect } from 'react';
import { MEMBERS, generateRandomMembers } from './project-constants.js';

function collectOrgMembers(node) {
  let result = [];
  if (node.members) {
    result.push(...node.members.map(m => ({
      name: m.name,
      email: `${m.name.toLowerCase().replace(/\s+/g, '.')}@pivit.work`,
      avatar: m.avatar,
      status: m.status || 'working',
      role: m.role,
      profile: m.profile,
      projects: {},
    })));
  }
  if (node.children) node.children.forEach(c => { result = result.concat(collectOrgMembers(c)); });
  return result;
}

export default function MemberTable({ projects, stickyTop = 0, onMemberClick, orgData }) {
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const titleRef = useRef(null);
  const [titleHeight, setTitleHeight] = useState(0);
  const syncingRef = useRef(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrolledEnd, setScrolledEnd] = useState(false);
  const [members, setMembers] = useState(() => {
    if (!orgData) return MEMBERS;
    const orgMembers = collectOrgMembers(orgData);
    orgMembers.forEach(m => {
      projects.forEach(p => { m.projects[p.id] = Math.random() < 0.25; });
    });
    const orgNames = new Set(orgMembers.map(m => m.name));
    const extra = MEMBERS.filter(m => !orgNames.has(m.name));
    return [...orgMembers, ...extra];
  });
  const [visibleCount, setVisibleCount] = useState(10);
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });

  const updateShadows = (el) => {
    if (!el) return;
    setScrolled(el.scrollLeft > 0);
    setScrolledEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };

  const onHeaderScroll = () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    const sl = headerScrollRef.current.scrollLeft;
    if (bodyScrollRef.current) bodyScrollRef.current.scrollLeft = sl;
    updateShadows(headerScrollRef.current);
    syncingRef.current = false;
  };

  const onBodyScroll = () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    const sl = bodyScrollRef.current.scrollLeft;
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = sl;
    updateShadows(bodyScrollRef.current);
    syncingRef.current = false;
  };

  useEffect(() => {
    updateShadows(headerScrollRef.current);
    if (titleRef.current) setTitleHeight(titleRef.current.offsetHeight);
  }, [projects]);

  const handleLoadMore = () => {
    const nextCount = visibleCount + 20;
    if (nextCount >= members.length) {
      const projectIds = projects.map(p => p.id);
      const newMembers = generateRandomMembers(20, projectIds);
      setMembers(prev => [...prev, ...newMembers]);
    }
    setVisibleCount(nextCount);
  };

  const onMouseDown = (e) => {
    const el = bodyScrollRef.current;
    dragState.current = { isDragging: true, startX: e.clientX, scrollLeft: el.scrollLeft };
    el.style.cursor = 'grabbing';
    el.style.userSelect = 'none';
  };
  const onMouseMove = (e) => {
    if (!dragState.current.isDragging) return;
    const dx = e.clientX - dragState.current.startX;
    bodyScrollRef.current.scrollLeft = dragState.current.scrollLeft - dx;
  };
  const onMouseUp = () => {
    dragState.current.isDragging = false;
    if (bodyScrollRef.current) {
      bodyScrollRef.current.style.cursor = '';
      bodyScrollRef.current.style.userSelect = '';
    }
  };

  const visibleMembers = members.slice(0, visibleCount);
  const memberTotals = visibleMembers.map(member =>
    projects.reduce((sum, p) => sum + (member.projects[p.id] ? 1 : 0), 0)
  );

  return (
    <div className="pj-table-section">
      <div className="pj-table-header-text" ref={titleRef} style={{ top: stickyTop }}>
        <p className="pj-table-title">프로젝트에 배치된 멤버 리스트</p>
        <p className="pj-table-subtitle">이름을 클릭하면 상세 정보를 보실 수 있어요.</p>
      </div>
        <div className="pj-table-sticky-header" style={{ top: stickyTop + titleHeight }}>
          <div className={`pj-sticky-name-hdr ${scrolled ? 'pj-name-shadow' : ''}`}>이름</div>
          <div className="pj-sticky-projects-hdr" ref={headerScrollRef} onScroll={onHeaderScroll}>
            {projects.map(p => (
              <div key={p.id} className="pj-sticky-th">
                <span className="pj-th-dot" style={{ background: p.color }} />
                <span className="pj-th-label">{p.name}</span>
              </div>
            ))}
          </div>
          <div className={`pj-sticky-sum-hdr ${scrolledEnd ? 'pj-sum-no-shadow' : ''}`}>총</div>
        </div>

        <div className="pj-table-outer">
          <div className={`pj-name-column ${scrolled ? 'pj-name-shadow' : ''}`}>
            {visibleMembers.map((member, i) => (
              <div key={i} className="pj-name-cell" onClick={() => onMemberClick && onMemberClick(member)} style={{ cursor: 'pointer' }}>
                <div className="pj-member-info">
                  {member.avatar ? (
                    <img src={member.avatar} alt="" className="pj-member-avatar" />
                  ) : (
                    <span className="pj-member-avatar pj-member-initials">{member.initials}</span>
                  )}
                  <div className="pj-member-text">
                    <span className="pj-member-name">{member.name}</span>
                    <span className="pj-member-email">{member.email}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div
            className="pj-table-wrap"
            ref={bodyScrollRef}
            onScroll={onBodyScroll}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <table className="pj-table">
              <tbody>
                {visibleMembers.map((member, i) => (
                  <tr key={i}>
                    {projects.map(p => (
                      <td key={p.id} className="pj-td pj-td-project">
                        <span
                          className={`pj-cell-dot ${member.projects[p.id] ? '' : 'pj-cell-dot-empty'}`}
                          style={member.projects[p.id] ? { background: p.color } : undefined}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`pj-sum-column ${scrolledEnd ? 'pj-sum-no-shadow' : ''}`}>
            {memberTotals.map((total, i) => (
              <div key={i} className="pj-sum-cell">{total}</div>
            ))}
          </div>
        </div>
      <div className="pj-table-footer">
        <button className="pj-btn-more" onClick={handleLoadMore}>더 보기</button>
      </div>
    </div>
  );
}
