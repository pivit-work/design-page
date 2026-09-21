import { useState, useRef, useEffect, useMemo } from 'react';
import Tabs from '../shared/Tabs.jsx';
import ProfileModal from './ProfileModal.jsx';
import ProjectCardGrid from './ProjectCardGrid.jsx';
import MemberTable from './MemberTable.jsx';
import { PROJECTS, FILTER_TABS } from './project-constants.js';
import { OrgLabelsContext, makeOrgLabels } from './orgchart-labels.jsx';

export default function ProjectCanvas({ onSubTabChange, statIcons, baseUrl = '', findSubordinates, adminMode = false, orgData, labels }) {
  // 화면 문구 — OrgChartCanvas 와 같은 계약(PW-705). 안 넘기면 한국어 기본값.
  const L = useMemo(() => makeOrgLabels(labels), [labels]);
  const [activeTab, setActiveTab] = useState('all');
  const pageHeaderRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    if (pageHeaderRef.current) {
      setHeaderHeight(pageHeaderRef.current.offsetHeight);
    }
  }, []);

  const filteredProjects = activeTab === 'all'
    ? PROJECTS
    : PROJECTS.filter(p => p.status === activeTab);

  return (<OrgLabelsContext.Provider value={L}>
    <div className="content-area pj-content-area">
      <div className="content-canvas">
        <div className="pj-header" ref={pageHeaderRef}>
          <div className="tab-nav">
            <span className="tab-inactive" onClick={() => onSubTabChange && onSubTabChange('orgchart')}>{L('tab.orgchart')}</span>
            <span className="tab-active">{L('tab.project')}</span>
            <span className="tab-inactive" onClick={() => onSubTabChange && onSubTabChange('squad')}>{L('tab.squad')}</span>
          </div>
          <div className="header-subtitle">
            <b>{L('tab.project')}</b>
            <span className="dot">&#8729;</span>
            <span className="brand-count">{L('project.count', { count: PROJECTS.length })}</span>
          </div>
        </div>

        <div className="pj-body">
          <div className="tl-tabs-row pj-tabs-row">
            <Tabs
              items={FILTER_TABS.map((tab) => ({ value: tab.key, label: L(`project.filter.${tab.key}`) }))}
              value={activeTab}
              onChange={setActiveTab}
            />
          </div>

          <ProjectCardGrid projects={filteredProjects} />
          <MemberTable projects={PROJECTS} stickyTop={headerHeight} onMemberClick={setSelectedMember} orgData={orgData} />
        </div>
      </div>
    </div>
    <ProfileModal member={selectedMember} onClose={() => setSelectedMember(null)} statIcons={statIcons} baseUrl={baseUrl} findSubordinates={findSubordinates} adminMode={adminMode} />
  </OrgLabelsContext.Provider>);
}
