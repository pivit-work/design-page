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
 * 리스팅 카드의 헥사는 2D(CSS clip-path) 다 — `MemberHex` 주석 참조. 3D 는 한 번에
 * 하나만 뜨는 ProfileModal 에만 남아 있다.
 */
export default function ManagerCanvas({
  tabs = [],
  activeTab,
  onTabChange,
  krDrilldown,
  // KR 드릴다운 선택 제어 — 소비자가 선택된 KR/멤버 것만 불러오도록 위임한다 (§7-6).
  selectedKrId,
  onSelectKr,
  selectedMemberId,
  onSelectMember,
  onRetryDetail,
  krLabels,
  teamSnippets,
  // 팀 스니핏 본문을 소비자가 직접 그리고 싶을 때 넘기는 자리(슬롯). 넘어오면
  // `teamSnippets` 대신 이걸 그린다.
  //
  // 왜 필요한가: 이 탭의 컨트롤(기간 세그먼트·레드 플래그·팀원 선택)은 **데이터를
  // 실제로 걸러야** 의미가 있는데, 아래 `TeamSnippets` 는 기간 상태를 자기가 들고
  // 있으면서 어디에도 쓰지 않아 기간 칩이 장식이 된다. 조회 중·조회 실패·빈 상태도
  // 데이터를 가진 쪽만 구분할 수 있다. 그래서 실데이터를 붙이는 소비자는 필터를
  // 적용한 뒤의 화면을 통째로 넘긴다. `teamSnippets` 경로(데모/시안)는 그대로 둔다.
  teamSnippetsSlot,
  // 팀 스니핏 피드 카드의 [1on1] 버튼. 없으면 그 버튼이 눌러도 아무 일이 없다.
  onTeamSnippetOneOnOne,
  teamMemberCount,
  summary,
  kpis = [],
  actionQueue = { title: '오늘의 액션 큐', count: 0, countColor: 'var(--colors-error-500)', subtitle: '', members: [] },
  teamStatus = { title: '팀원 현황', count: 0, countColor: 'var(--colors-foreground-fgSuccessPrimary)', subtitle: '', members: [] },
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
        <KrDrilldown
          data={krDrilldown}
          selectedKrId={selectedKrId}
          onSelectKr={onSelectKr}
          selectedMemberId={selectedMemberId}
          onSelectMember={onSelectMember}
          onRetryDetail={onRetryDetail}
          labels={krLabels}
        />
      ) : activeTab === 'snippets' && (teamSnippetsSlot || teamSnippets) ? (
        teamSnippetsSlot || (
          <TeamSnippets
            data={teamSnippets}
            onOneOnOne={onTeamSnippetOneOnOne}
            icons={icons}
            baseUrl={baseUrl}
          />
        )
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
          {actionQueue.members.map((m) => (
            <MemberCard
              key={m.id}
              {...m}
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
          {teamStatus.members.map((m) => (
            <MemberCard
              key={m.id}
              {...m}
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

      {/*
        모달 헤더의 [1on1]·[메시지] 는 카드의 같은 버튼과 같은 핸들러로 간다.
        누르면 모달을 먼저 닫는다 — 두 동선 모두 이 화면을 떠나거나(1on1) 다른 모달을
        띄우므로(메시지), 프로필 모달을 남겨두면 모달이 겹친다.
      */}
      <ProfileModal
        member={openMember}
        onClose={() => setOpenMember(null)}
        baseUrl={baseUrl}
        icons={icons}
        onOneOnOneClick={() => { const m = openMember; setOpenMember(null); onMemberOneOnOne?.(m); }}
        onMessageClick={() => { const m = openMember; setOpenMember(null); onMemberMessage?.(m); }}
      />
    </main>
  );
}
