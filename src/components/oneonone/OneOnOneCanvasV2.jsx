import { useState } from 'react';
import Icon from '../shared/Icon.jsx';
import AddOneOnOneModal from './AddOneOnOneModal.jsx';
import StartOneOnOneView from './StartOneOnOneView.jsx';

/**
 * 1on1 페이지 v2 — Figma node 16816:33877.
 *
 * 구조:
 *  - 헤더: 타이틀 + 매니저/팀원 메타 + "1on1 일정 추가" 버튼
 *  - 브리핑 바 (border-bottom): "✨ 4/26 · 팀 현황 브리핑" + 우측 지표 3 (팀 헬스 평균/레드 플래그/1on1 평균)
 *  - 한줄 메시지
 *  - 코칭 지표 KPI 3-grid: 완료 횟수 / 액션 완료율 / 발화 비율
 *  - 섹션 (오늘 예정 / 주의 필요 / 양호) + 멤버 카드 그리드
 *
 * 외부 제어 props (pivit-work 등 실제 사용처용):
 *  - onScheduleSubmit(data): 일정 추가 모달의 onSubmit. data 에 { member, search, duration, ...}.
 *  - members: "1on1 일정 추가" 모달 검색 dropdown 에 노출할 팀원 이름 배열.
 *  - onStartMember(member): "1on1 진행" 버튼이 눌렸을 때의 외부 핸들러. 지정 시
 *    내부 StartOneOnOneView 전환 대신 외부 라우팅으로 위임한다.
 */
export default function OneOnOneCanvasV2({
  title = '1on1',
  managerName,
  teamCount,
  briefing,
  message,
  kpis,
  sections = [],
  icons,
  baseUrl = '',
  onAddClick,
  onScheduleSubmit,
  members,
  onStartMember,
  startOneOnOneData,
  aiDrafts,
  onGenerateDrafts,
  generatingDrafts,
  /** 멤버 카드의 아바타 렌더 콜백. 외부에서 호스트 앱의 Avatar 컴포넌트(이니셜
   *  fallback 등) 를 주입할 때 사용. 미지정 시 member.avatar URL 그대로 <img>. */
  renderMemberAvatar,
}) {
  const [addOpen, setAddOpen] = useState(false);
  // "1on1 잡기" 버튼이 눌린 멤버 — null 이면 예약 모달 닫힘.
  const [scheduleMember, setScheduleMember] = useState(null);
  // "1on1 진행" 버튼이 눌린 멤버 — null 이면 대시보드, 객체면 진행 준비 뷰.
  const [startMember, setStartMember] = useState(null);
  const handleAdd = () => {
    onAddClick?.();
    setAddOpen(true);
  };
  // 멤버 카드의 액션 버튼 클릭 핸들러.
  //   "1on1 잡기" → 예약 모달, "1on1 진행" → 외부 핸들러 우선, 그 외 → 데이터 onClick.
  const handleMemberAction = (m, action) => {
    if (action.label === '1on1 잡기') { setScheduleMember(m); return; }
    if (action.label === '1on1 진행') {
      if (onStartMember) { onStartMember(m); return; }
      setStartMember(m);
      return;
    }
    action.onClick?.();
  };
  return (
    <main className="ono-page">
      <header className="ono-page-header">
        <div className="ono-title-block">
          <h1 className="ono-title">{title}</h1>
          {managerName && (
            <div className="ono-meta">
              <span className="ono-meta-name">{managerName} 매니저</span>
              <span className="ono-meta-divider">∙</span>
              <span className="ono-meta-count">팀원 {teamCount}명</span>
            </div>
          )}
        </div>
        {!startMember && (
          <button type="button" className="ono-add-btn" onClick={handleAdd}>
            <Icon src={icons?.plus} size={20} color="var(--text-white)" baseUrl={baseUrl} />
            <span>1on1 일정 추가</span>
          </button>
        )}
      </header>

      {startMember ? (
        /* "1on1 진행" — 페이지 뷰로 전환 (외부 핸들러 미지정 시 내부 fallback) */
        <StartOneOnOneView
          member={startMember}
          onBack={() => setStartMember(null)}
          baseUrl={baseUrl}
          data={startOneOnOneData}
          aiDrafts={aiDrafts}
          onGenerateDrafts={onGenerateDrafts}
          generatingDrafts={generatingDrafts}
        />
      ) : (
        <>
          <AddOneOnOneModal
            open={addOpen}
            onClose={() => setAddOpen(false)}
            onSubmit={(data) => {
              if (onScheduleSubmit) onScheduleSubmit(data);
              setAddOpen(false);
            }}
            icons={icons}
            baseUrl={baseUrl}
            members={members}
          />

          {/* 멤버 카드 "1on1 잡기" → 멤버 고정 예약 모달 */}
          <AddOneOnOneModal
            open={!!scheduleMember}
            member={scheduleMember}
            onClose={() => setScheduleMember(null)}
            onSubmit={(data) => {
              if (onScheduleSubmit) onScheduleSubmit({ ...data, member: scheduleMember });
              setScheduleMember(null);
            }}
            icons={icons}
            baseUrl={baseUrl}
          />

          {briefing && (
            <BriefingBar briefing={briefing} icons={icons} baseUrl={baseUrl} />
          )}

          {message && <p className="ono-message">{message}</p>}

          {kpis && (
            <section className="ono-section">
              <h2 className="ono-section-heading">이번 달 내 1on1 코칭 지표</h2>
              <div className="ono-kpi-grid">
                <CompletionKpi data={kpis.completion} />
                <ActionRateKpi value={kpis.actionRate} />
                <SpeakRatioKpi data={kpis.speakRatio} />
              </div>
            </section>
          )}

          {sections.map((sec) => (
            <section key={sec.key} className="ono-section">
              <div className="ono-section-heading-row">
                <h2 className="ono-section-heading">{sec.title}</h2>
                <span className="ono-section-count" style={{ color: sec.countColor }}>
                  {sec.count}명
                </span>
              </div>
              <div className="ono-member-grid">
                {sec.members.map((m) => (
                  <MemberCard
                    key={m.id}
                    member={m}
                    icons={icons}
                    baseUrl={baseUrl}
                    onAction={handleMemberAction}
                    renderAvatar={renderMemberAvatar}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </main>
  );
}

function BriefingBar({ briefing, icons, baseUrl }) {
  return (
    <div className="ono-briefing-bar">
      <div className="ono-briefing-title">
        <Icon src={icons?.summarySparkle} size={18} color="var(--utility-purple-500)" baseUrl={baseUrl} />
        <span>{briefing.date}  •  {briefing.title}</span>
      </div>
      <div className="ono-briefing-metrics">
        {briefing.metrics?.teamHealth != null && (
          <span className="ono-briefing-metric">
            <Icon src={icons?.activityHeart} size={14} color="var(--utility-pink-500, #ee46bc)" baseUrl={baseUrl} />
            <span>팀 헬스 평균</span>
            <span>{briefing.metrics.teamHealth}</span>
          </span>
        )}
        {briefing.metrics?.redFlags != null && (
          <span className="ono-briefing-metric">
            <Icon src={icons?.alertTriangle} size={14} color="var(--colors-error-500)" baseUrl={baseUrl} />
            <span>레드 플래그</span>
            <span>{briefing.metrics.redFlags}</span>
          </span>
        )}
        {briefing.metrics?.oneOnOneAvg != null && (
          <span className="ono-briefing-metric">
            <Icon src={icons?.messageSmile} size={14} color="var(--colors-foreground-fgSuccessPrimary)" baseUrl={baseUrl} />
            <span>1on1 평균</span>
            <span>{briefing.metrics.oneOnOneAvg}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function CompletionKpi({ data }) {
  return (
    <div className="ono-kpi-card">
      <p className="ono-kpi-label">완료 횟수</p>
      <div className="ono-kpi-completion-row">
        <p className="ono-kpi-value-large">{data.current}/{data.total}</p>
        <p className="ono-kpi-side">{data.label}</p>
      </div>
    </div>
  );
}

function ActionRateKpi({ value }) {
  return (
    <div className="ono-kpi-card">
      <p className="ono-kpi-label">액션 완료율</p>
      <p className="ono-kpi-value-blue">{value}%</p>
      <div className="ono-kpi-bar">
        <div className="ono-kpi-bar-fill ono-kpi-bar-blue" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SpeakRatioKpi({ data }) {
  return (
    <div className="ono-kpi-card">
      <p className="ono-kpi-label">발화 비율</p>
      <SpeakRow label="매니저" value={data.manager} />
      <SpeakRow label="멤  버" value={data.member} />
    </div>
  );
}

function SpeakRow({ label, value }) {
  return (
    <div className="ono-kpi-speak-row">
      <span className="ono-kpi-speak-label">{label}</span>
      <span className="ono-kpi-value-blue">{value}%</span>
      <div className="ono-kpi-bar">
        <div className="ono-kpi-bar-fill ono-kpi-bar-blue" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const SEVERITY_BADGE = {
  urgent: { label: '긴급', bg: 'var(--utility-error-50)', color: 'var(--text-error-primary)', icon: '⚠' },
  warning: { label: '주의', bg: 'var(--componentColors-utility-warning-utilityWarning100, #fef0c7)', color: 'var(--colors-text-textWarningPrimary, #dc6803)', icon: '⚠' },
  good: { label: '양호', bg: 'var(--utility-green-100)', color: 'var(--utility-green-600)', icon: null },
  praise: { label: '칭찬', bg: 'var(--utility-blue-100)', color: 'var(--utility-blue-600)', icon: null },
};

const HEALTH_COLORS = {
  critical: { text: 'var(--text-error-primary)', bar: 'var(--utility-error-100)' },
  warning: { text: 'var(--text-error-primary)', bar: 'var(--utility-error-100)' },
  good: { text: 'var(--utility-green-600)', bar: 'var(--utility-green-100)' },
};

function MemberCard({ member, icons, baseUrl, onAction, renderAvatar }) {
  const badge = SEVERITY_BADGE[member.severity] ?? SEVERITY_BADGE.good;
  const healthConf = HEALTH_COLORS[member.healthSeverity] ?? HEALTH_COLORS.good;
  const healthPct = Math.max(0, Math.min(100, (parseFloat(member.healthScore) / 10) * 100));

  return (
    <div className="ono-member-card">
      <div className="ono-member-top">
        <div className="ono-member-identity">
          <div className="ono-member-avatar">
            {renderAvatar
              ? renderAvatar(member)
              : member.avatar && <img src={member.avatar} alt="" />}
          </div>
          <div className="ono-member-name-block">
            <p className="ono-member-name">{member.name}</p>
            <p className="ono-member-role">{member.role}</p>
          </div>
        </div>
        <div className="ono-member-badge" style={{ background: badge.bg, color: badge.color }}>
          {badge.icon && <span className="ono-member-badge-icon">{badge.icon}</span>}
          <span>{badge.label}</span>
        </div>
      </div>

      <div className="ono-member-body">
        <div className="ono-member-health">
          <div className="ono-member-health-row">
            <span className="ono-member-health-label">Health Check</span>
            <span className="ono-member-health-value" style={{ color: healthConf.text }}>
              {member.healthScore}
            </span>
          </div>
          <div className="ono-member-health-bar">
            <div
              className="ono-member-health-bar-fill"
              style={{ width: `${healthPct}%`, background: healthConf.bar }}
            />
          </div>
        </div>
        <p className="ono-member-comment">{member.comment}</p>
      </div>

      <div className="ono-member-footer">
        {member.schedule && (
          <div className="ono-member-schedule">
            <Icon src={icons?.clockCheck} size={16} color="var(--text-brand-tertiary)" baseUrl={baseUrl} />
            <span>1on1 : {member.schedule.date}</span>
            <span>•</span>
            <span>{member.schedule.time}</span>
            <span>•</span>
            <span>{member.schedule.duration}</span>
            {member.schedule.changeable && (
              <span className="ono-member-schedule-change">일정변경</span>
            )}
          </div>
        )}
        <div className="ono-member-actions">
          {member.actions?.map((a, i) => (
            <button
              key={i}
              type="button"
              className={`ono-member-btn ${a.variant === 'primary' ? 'ono-member-btn-primary' : ''}`}
              onClick={() => onAction?.(member, a)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
