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
  /**
   * 팀 레벨 빈 상태 — 조회 범위 안 팀원이 **0명**일 때만 넘어온다
   * (`{ title, description, actionLabel?, onAction? }`). 없으면 아무것도 그리지 않는다.
   *
   * 아래 섹션들의 `emptyText`(= 「팀원은 있는데 이 분류가 비었다」)와 **층위가 다르다.**
   * 팀원이 0명이면 섹션 문구는 0명 상황을 설명하지 못하고 둘이 나란히 뜨면 서로
   * 모순돼 보이므로, 그때는 소비자가 `emptyText` 를 넘기지 않고 이 카드 한 장만 준다.
   *
   * 문구·라벨은 전부 소비자가 만든다 — 이 패키지는 i18n 을 모른다.
   */
  teamEmpty,
  actionQueue = { title: '오늘의 액션 큐', count: 0, countColor: 'var(--colors-error-500)', subtitle: '', members: [] },
  teamStatus = { title: '팀원 현황', count: 0, countColor: 'var(--colors-foreground-fgSuccessPrimary)', subtitle: '', members: [] },
  icons,
  baseUrl = '',
  onMemberOneOnOne,
  onMemberMessage,
  /**
   * 프로필 모달이 열리고 닫힐 때 알린다 (열림=member, 닫힘=null).
   *
   * 팀원 상세 패널의 「액션 아이템」 탭(PW-182)처럼 **열었을 때만** 부르면 되는
   * 데이터가 있어서다. 팀원 전원 것을 미리 받으면 팀 규모만큼 조회가 나가고
   * 대부분은 쓰이지 않는다.
   */
  onMemberOpen,
}) {
  // 🔴 열린 멤버는 **id 로** 기억하고 객체는 지금 props 에서 다시 찾는다.
  // 객체를 통째로 state 에 담아 두면, 모달이 열린 뒤 소비자가 그 멤버의 데이터를
  // 채워 넣어도(예: 「액션 아이템」 탭을 연 뒤에 읽어 오는 PW-182) 모달은 클릭 순간의
  // 낡은 객체를 계속 들고 있어 화면이 갱신되지 않는다.
  const [openMemberId, setOpenMemberId] = useState(null);
  const openMember =
    openMemberId == null
      ? null
      : [...(actionQueue?.members ?? []), ...(teamStatus?.members ?? [])].find(
          (m) => m.id === openMemberId,
        ) ?? null;
  const openProfile = (m) => { setOpenMemberId(m?.id ?? null); onMemberOpen?.(m); };
  const closeProfile = () => { setOpenMemberId(null); onMemberOpen?.(null); };

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

      {/* 팀 레벨 빈 상태 — KPI 그리드 바로 아래, 섹션들보다 위.
          0명의 사유는 화면에서 한 번만 말한다. */}
      {teamEmpty && (
        <section className="manager-section manager-team-empty-section">
          <div className="manager-team-empty" data-testid="manager-team-empty">
            <p className="manager-team-empty-title">{teamEmpty.title}</p>
            <p className="manager-team-empty-desc">{teamEmpty.description}</p>
            {teamEmpty.actionLabel && (
              <button
                type="button"
                className="manager-team-empty-action"
                onClick={teamEmpty.onAction}
              >
                {teamEmpty.actionLabel}
              </button>
            )}
          </div>
        </section>
      )}

      <section className="manager-section">
        <SectionHeading
          title={actionQueue.title}
          count={actionQueue.count}
          countColor={actionQueue.countColor}
          subtitle={actionQueue.subtitle}
        />
        {/* 섹션 레벨 빈 상태 — 「팀원은 있는데 이 분류가 비었다」.
            팀원 자체가 0명이면 소비자가 `emptyText` 를 넘기지 않는다(위 `teamEmpty` 참조).
            헤딩·카운트 0 은 어느 경우든 그대로 둔다 — 숨기면 고장난 것처럼 보인다. */}
        {actionQueue.members.length === 0 && actionQueue.emptyText ? (
          <p className="manager-section-empty">{actionQueue.emptyText}</p>
        ) : (
        <div className="manager-member-grid">
          {actionQueue.members.map((m) => (
            <MemberCard
              key={m.id}
              {...m}
              icons={icons}
              baseUrl={baseUrl}
              onCardClick={() => openProfile(m)}
              onOneOnOneClick={() => onMemberOneOnOne?.(m)}
              onMessageClick={() => onMemberMessage?.(m)}
            />
          ))}
        </div>
        )}
      </section>

      <section className="manager-section">
        <SectionHeading
          title={teamStatus.title}
          count={teamStatus.count}
          countColor={teamStatus.countColor}
          subtitle={teamStatus.subtitle}
        />
        {teamStatus.members.length === 0 && teamStatus.emptyText ? (
          <p className="manager-section-empty">{teamStatus.emptyText}</p>
        ) : (
        <div className="manager-member-grid">
          {teamStatus.members.map((m) => (
            <MemberCard
              key={m.id}
              {...m}
              icons={icons}
              baseUrl={baseUrl}
              onCardClick={() => openProfile(m)}
              onOneOnOneClick={() => onMemberOneOnOne?.(m)}
              onMessageClick={() => onMemberMessage?.(m)}
            />
          ))}
        </div>
        )}
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
        onClose={closeProfile}
        baseUrl={baseUrl}
        icons={icons}
        onOneOnOneClick={() => { const m = openMember; closeProfile(); onMemberOneOnOne?.(m); }}
        onMessageClick={() => { const m = openMember; closeProfile(); onMemberMessage?.(m); }}
      />
    </main>
  );
}
