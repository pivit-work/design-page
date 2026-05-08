import { useState, useEffect, useRef } from 'react';
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
 */
export default function ManagerCanvas({
  tabs = [],
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
  const pageRef = useRef(null);

  // 모달 열림/닫힘에 따라 카드 spline iframe 들에게 pause/resume 메시지 broadcast.
  // (모달 spline 이 GPU 자원을 모두 받아 정상 속도로 회전하도록 카드 spline 시간을 freeze)
  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    const iframes = root.querySelectorAll('.manager-spline-iframe');
    const type = openMember ? 'pause-spline' : 'resume-spline';
    iframes.forEach((f) => {
      try { f.contentWindow?.postMessage({ type }, '*'); } catch (e) { /* no-op */ }
    });
  }, [openMember]);

  // 카드 spline iframe 안에서 발생한 wheel 을 받아 페이지 스크롤로 전달.
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type !== 'spline-wheel') return;
      const root = pageRef.current;
      if (!root) return;
      root.scrollBy({ top: e.data.deltaY || 0, left: e.data.deltaX || 0, behavior: 'auto' });
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return (
    <main ref={pageRef} className={`manager-page ${openMember ? 'is-modal-open' : ''}`}>
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
          {actionQueue.members.map((m, i) => (
            <MemberCard
              key={m.id}
              {...m}
              splineScene={splineScene}
              splineImage={splineImage}
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
              splineScene={splineScene}
              splineImage={splineImage}
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

      <ProfileModal
        member={openMember}
        onClose={() => setOpenMember(null)}
        baseUrl={baseUrl}
        icons={icons}
      />
    </main>
  );
}
