import { useState } from 'react';
import AssignmentGrid from './AssignmentGrid.jsx';
import { MEMBERS, generateRandomMembers } from './project-constants.js';
import { useOrgLabels } from './orgchart-labels.jsx';

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
  const L = useOrgLabels();
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

  const handleLoadMore = () => {
    const nextCount = visibleCount + 20;
    if (nextCount >= members.length) {
      const projectIds = projects.map(p => p.id);
      const newMembers = generateRandomMembers(20, projectIds);
      setMembers(prev => [...prev, ...newMembers]);
    }
    setVisibleCount(nextCount);
  };

  const visibleMembers = members.slice(0, visibleCount);

  // 바둑판 뼈대는 스쿼드 탭과 같은 AssignmentGrid 다(PW-838). 여기서는 칸 안의 모양만 정한다.
  return (
    <div className="pj-table-section">
      <div className="pj-table-header-text" style={{ top: stickyTop }}>
        <p className="pj-table-title">{L('project.tableTitle')}</p>
        <p className="pj-table-subtitle">{L('project.tableSubtitle')}</p>
      </div>
      <AssignmentGrid
        className="pj-grid"
        dragScroll
        columns={projects}
        rows={visibleMembers}
        rowKey={(member, i) => `${member.email}-${i}`}
        classes={{ colTh: 'pj-th-project', colTd: 'pj-td-project' }}
        onNameClick={onMemberClick}
        nameHeader={L('project.colName')}
        totalHeader={L('project.colTotal')}
        renderColumnHeader={(p) => (
          <span className="pj-grid-th">
            <span className="pj-th-dot" style={{ background: p.color }} />
            <span className="pj-th-label">{p.name}</span>
          </span>
        )}
        renderName={(member) => (
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
        )}
        renderCell={(member, p) => (
          <span
            className={`pj-cell-dot ${member.projects[p.id] ? '' : 'pj-cell-dot-empty'}`}
            style={member.projects[p.id] ? { background: p.color } : undefined}
          />
        )}
        renderTotal={(member) => (
          <span className="pj-grid-sum">
            {projects.reduce((sum, p) => sum + (member.projects[p.id] ? 1 : 0), 0)}
          </span>
        )}
      />
      <div className="pj-table-footer">
        <button className="pj-btn-more" onClick={handleLoadMore}>{L('project.more')}</button>
      </div>
    </div>
  );
}
