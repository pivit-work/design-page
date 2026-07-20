import { useState } from 'react';
import SummaryCard from './SummaryCard.jsx';
import StatTile from './StatTile.jsx';
import SectionHeading from './SectionHeading.jsx';
import MemberCard from './MemberCard.jsx';
import ProfileModal from './ProfileModal.jsx';
import KrDrilldown from './KrDrilldown.jsx';
import TeamSnippets from './TeamSnippets.jsx';

/**
 * 매니저 페이지 Pure 컴포넌트.
 * 모든 데이터는 props 로 받는다 (page wrapper 가 데모/실데이터 소유).
 *
 * 멤버 카드 클릭 시 ProfileModal v2 가 열린다 (선택된 멤버 정보 + AI 브리핑/아젠다/지표).
 *
 * 멤버 카드 헥사는 `<Spline>` 컴포넌트로 부모 문서에 직접 렌더된다 (iframe 아님).
 * iframe 시절의 pause/resume·wheel-forward postMessage 핸들러는 더 이상 불필요.
 */
export default function ManagerCanvas({
  tabs = [],
  activeTab,
  onTabChange,
  krDrilldown,
  teamSnippets,
  teamMemberCount,
  summary,
  kpis = [],
  actionQueue = { title: '오늘의 액션 큐', count: 0, countColor: 'var(--colors-error-500)', subtitle: '', members: [] },
  teamStatus = { title: '팀원 현황', count: 0, countColor: 'var(--colors-foreground-fgSuccessPrimary)', subtitle: '', members: [] },
  splineScene,
  splineImage,
  icons,
  baseUrl = '',
  onMemberOneOnOne,
  onMemberMessage,
}) {
  const [openMember, setOpenMember] = useState(null);

  return (
    <main className={`manager-page ${openMember ? 'is-modal-open' : ''}`}>
      <header className="manager-page-header">
        <div className="manager-tabs">
          {tabs.map((tab) => (
            <span
              key={tab.label}
              className={`manager-tab ${(activeTab ? activeTab === tab.key : tab.active) ? 'active' : ''}`}
              onClick={() => onTabChange?.(tab.key)}
            >
              {tab.label}
            </span>
          ))}
        </div>
        {teamMemberCount != null && (
          <div className="manager-team-meta">
            <span className="manager-team-meta-label">팀원</span>
            <span className="manager-team-meta-divider">∙</span>
            <span className="manager-team-meta-count">{teamMemberCount}명</span>
          </div>
        )}
      </header>

      {activeTab === 'kr' && krDrilldown ? (
        <KrDrilldown data={krDrilldown} />
      ) : activeTab === 'snippets' && teamSnippets ? (
        <TeamSnippets data={teamSnippets} />
      ) : (
      <>
      <section className="manager-kpi-grid">
        {summary && <SummaryCard text={summary} />}
        {kpis.map((kpi) => (
          <StatTile key={kpi.label} label={kpi.label} value={kpi.value} />
        ))}
      </section>

      <section className="manager-section">
        <SectionHeading
          title={actionQueue.title}
          count={actionQueue.count}
          countColor={actionQueue.countColor}
          subtitle={actionQueue.subtitle}
        />
        <div className="manager-member-grid">
          {actionQueue.members.map((m, i) => (
            <MemberCard
              key={m.id}
              {...m}
              splineScene={m.splineScene ?? splineScene}
              splineImage={m.splineImage ?? splineImage}
              splineIndex={i}
              icons={icons}
              baseUrl={baseUrl}
              onCardClick={() => setOpenMember(m)}
              onOneOnOneClick={() => onMemberOneOnOne?.(m)}
              onMessageClick={() => onMemberMessage?.(m)}
            />
          ))}
        </div>
      </section>

      <section className="manager-section">
        <SectionHeading
          title={teamStatus.title}
          count={teamStatus.count}
          countColor={teamStatus.countColor}
          subtitle={teamStatus.subtitle}
        />
        <div className="manager-member-grid">
          {teamStatus.members.map((m, i) => (
            <MemberCard
              key={m.id}
              {...m}
              splineScene={m.splineScene ?? splineScene}
              splineImage={m.splineImage ?? splineImage}
              splineIndex={actionQueue.members.length + i}
              icons={icons}
              baseUrl={baseUrl}
              onCardClick={() => setOpenMember(m)}
              onOneOnOneClick={() => onMemberOneOnOne?.(m)}
              onMessageClick={() => onMemberMessage?.(m)}
            />
          ))}
        </div>
      </section>

      </>
      )}

      <ProfileModal
        member={openMember}
        onClose={() => setOpenMember(null)}
        baseUrl={baseUrl}
        icons={icons}
      />
    </main>
  );
}
