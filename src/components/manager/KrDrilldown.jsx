import { useState } from 'react';
import KrMemberCard from './KrMemberCard.jsx';
import KrContributionDetail from './KrContributionDetail.jsx';

/**
 * KrDrilldown — 매니저 KR 드릴다운 탭 본문.
 * Figma 17026:23299 / 17026:24830.
 *
 * data: {
 *   objective, krs: [{ id, title, percent, status: { label, tone } }],
 *   detail: { subtitle, trend: [{ label, value }] },
 *   contribution: [{ name, percent, color }],
 *   members: [KrMemberCard member + detail],
 * }
 * KR 선택 카드·팀원 선택은 UI 상태로 컴포넌트가 관리한다.
 */
export default function KrDrilldown({ data }) {
  const [selectedKrId, setSelectedKrId] = useState(data.krs[0]?.id);
  const [selectedMemberId, setSelectedMemberId] = useState(data.members[0]?.id);

  const selectedKr = data.krs.find((kr) => kr.id === selectedKrId) ?? data.krs[0];
  const selectedMember = data.members.find((m) => m.id === selectedMemberId) ?? data.members[0];
  const maxTrend = Math.max(...data.detail.trend.map((t) => t.value), 1);

  return (
    <div className="mgr-kr">
      {/* 팀 OKR — KR 선택 카드 */}
      <div className="mgr-kr-okr">
        <p className="mgr-kr-okr-label">팀 OKR</p>
        <p className="mgr-kr-okr-title">{data.objective}</p>
        <div className="mgr-kr-cards">
          {data.krs.map((kr) => (
            <div
              key={kr.id}
              className={`mgr-kr-card${kr.id === selectedKrId ? ' is-selected' : ''}`}
              onClick={() => setSelectedKrId(kr.id)}
            >
              <div className="mgr-kr-card-head">
                <span className="mgr-kr-card-id">{kr.id}</span>
                <span className="mgr-kr-card-percent">{kr.percent}%</span>
              </div>
              <div className="mgr-kr-card-title-row">
                <p className="mgr-kr-card-title">{kr.title}</p>
                <span className={`mgr-kr-status is-${kr.status.tone}`}>✓ {kr.status.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Result 헤더 + 진행/추이 */}
      <div className="mgr-kr-header">
        <p className="mgr-kr-eyebrow">
          Key Result
          <span className={`mgr-kr-status is-${selectedKr.status.tone}`}>✓ {selectedKr.status.label}</span>
        </p>
        <h2 className="mgr-kr-title">{selectedKr.title} · {selectedKr.percent}%</h2>
        <p className="mgr-kr-subtitle">{data.detail.subtitle}</p>
      </div>

      <div className="mgr-kr-progress-row">
        <div className="mgr-kr-progress">
          <div className="mgr-kr-progress-track">
            <div className="mgr-kr-progress-fill" style={{ width: `${selectedKr.percent}%` }} />
          </div>
          <span className="mgr-kr-progress-target">목표 100%</span>
        </div>
        <div className="mgr-kr-trend">
          <p className="mgr-kr-trend-label">달성도 추이</p>
          <div className="mgr-kr-trend-bars">
            {data.detail.trend.map((point) => (
              <div className="mgr-kr-trend-col" key={point.label}>
                <span className="mgr-kr-trend-value">{point.value}%</span>
                <div className="mgr-kr-trend-bar" style={{ height: `${Math.max((point.value / maxTrend) * 64, 6)}px` }} />
                <span className="mgr-kr-trend-date">{point.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 팀원별 기여 */}
      <div className="mgr-kr-contrib-head">
        <p className="mgr-kr-section-title">팀원별 기여 - {data.members.length}명</p>
        <p className="mgr-kr-contrib-caption">기여도 합계</p>
        <div className="mgr-kr-stackbar">
          {data.contribution.map((seg) => (
            <div
              key={seg.name}
              className={`mgr-kr-seg is-${seg.color}`}
              style={{ width: `${seg.percent}%` }}
            >
              {seg.name} {seg.percent}%
            </div>
          ))}
        </div>
      </div>

      <div className="mgr-kr-body">
        <div className="mgr-kr-members">
          {data.members.map((member) => (
            <KrMemberCard
              key={member.id}
              member={member}
              selected={member.id === selectedMemberId}
              onClick={() => setSelectedMemberId(member.id)}
            />
          ))}
        </div>
        {selectedMember && <KrContributionDetail key={selectedMember.id} member={selectedMember} />}
      </div>
    </div>
  );
}
