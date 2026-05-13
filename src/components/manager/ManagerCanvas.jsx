import { useState } from 'react';
import SummaryCard from './SummaryCard.jsx';
import StatTile from './StatTile.jsx';
import SectionHeading from './SectionHeading.jsx';
import MemberCard from './MemberCard.jsx';
import ProfileModal from './ProfileModal.jsx';

/**
 * 매니저 페이지 Pure 컴포넌트.
 * 모든 데이터는 props 로 받는다 (page wrapper 가 데모/실데이터 소유).
 *
 * 멤버 카드 클릭 시 ProfileModal v2 가 열린다 (선택된 멤버 정보 + AI 브리핑/아젠다/지표).
 *
 * `splineScene`, `splineImage` 는 0.1.97~0.1.129 까지 멤버 카드의 Spline iframe 텍스처로
 * 사용되었으나, 다수 iframe 동시 로딩의 첫 페인트 지연과 Spline runtime applyTexture
 * race 문제로 0.1.130 부터 멤버 카드는 CSS 헥사 + <img> 로 단순화. ProfileModal 의
 * 헤더 Spline 모델은 그대로 사용한다.
 *
 * 호환을 위해 props 시그니처는 유지하지만, 멤버 카드에는 더 이상 전달되지 않는다.
 * pivit-work 측이 멤버별 `m.splineImage` 로 아바타 URL 을 넘기면 그 값이 헥사 안 img 의
 * src 가 된다.
 */
export default function ManagerCanvas({
  tabs = [],
  teamMemberCount,
  summary,
  kpis = [],
  actionQueue = { title: '오늘의 액션 큐', count: 0, countColor: 'var(--colors-error-500)', subtitle: '', members: [] },
  teamStatus = { title: '팀원 현황', count: 0, countColor: 'var(--colors-foreground-fgSuccessPrimary)', subtitle: '', members: [] },
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
              className={`manager-tab ${tab.active ? 'active' : ''}`}
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
              splineImage={m.splineImage ?? splineImage}
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
              splineImage={m.splineImage ?? splineImage}
              icons={icons}
              baseUrl={baseUrl}
              onCardClick={() => setOpenMember(m)}
              onOneOnOneClick={() => onMemberOneOnOne?.(m)}
              onMessageClick={() => onMemberMessage?.(m)}
            />
          ))}
        </div>
      </section>

      <ProfileModal
        member={openMember}
        onClose={() => setOpenMember(null)}
        baseUrl={baseUrl}
        icons={icons}
      />
    </main>
  );
}
