import { useState } from 'react';
import KrMemberCard from './KrMemberCard.jsx';
import KrContributionDetail from './KrContributionDetail.jsx';

/**
 * KrDrilldown — 매니저 KR 드릴다운 탭 본문.
 * Figma 17026:23299 / 17026:24830.
 *
 * data: {
 *   objective, krs: [{ id, title, percent, status: { label, tone } }],
 *   detail: { subtitle, trend: [{ label, value }], loading?, error? },
 *   contribution: [{ name, percent, color }],
 *   members: [KrMemberCard member + detail],
 * }
 *
 * 선택 상태는 기본적으로 컴포넌트가 들고 있지만(데모), `selectedKrId` /
 * `selectedMemberId` 를 주면 소비자가 제어한다 — 선택이 바뀔 때만 데이터를
 * 새로 불러오기 위해서다.
 *
 * 2026-08-13 PW-93 — 차트 온디맨드 렌더링 (policy §7-6).
 *   · 달성도 추이는 **선택된 KR 1개분만** 마운트한다. 비선택 KR 은 카드의 % 텍스트만.
 *   · Initiative 진행률 바는 **선택된 멤버 카드 1세트만** (KrMemberCard 참조).
 *   · 이미 선택된 항목을 다시 클릭하면 no-op — 콜백을 부르지 않아 재조회가 없다.
 *   · 로딩 중에는 차트와 같은 높이의 스켈레톤, 실패 시 인라인 에러 + [다시 시도].
 *     숫자·진행 바는 실패해도 그대로 보인다.
 */

const DEFAULT_LABELS = {
  objectiveLabel: '팀 OKR',
  trendLabel: '달성도 추이',
  goal: '목표 100%',
  contribTitle: (n) => `팀원별 기여 - ${n}명`,
  contribCaption: '기여도 합계',
  chartError: '차트를 불러오지 못했습니다.',
  retry: '다시 시도',
  krEmpty: '팀 KR이 설정되지 않았습니다.',
  membersEmpty: '이 KR에 연결된 팀원이 없습니다.',
};

export default function KrDrilldown({
  data,
  selectedKrId,
  onSelectKr,
  selectedMemberId,
  onSelectMember,
  onRetryDetail,
  labels,
}) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const [innerKrId, setInnerKrId] = useState(data.krs[0]?.id);
  const [innerMemberId, setInnerMemberId] = useState(data.members[0]?.id);

  const krId = selectedKrId !== undefined ? selectedKrId : innerKrId;
  const memberId = selectedMemberId !== undefined ? selectedMemberId : innerMemberId;

  // 재클릭 no-op — 같은 id 면 콜백도 setState 도 하지 않아 재렌더·재조회가 없다 (§7-6).
  const selectKr = (id) => {
    if (id === krId) return;
    if (selectedKrId === undefined) setInnerKrId(id);
    onSelectKr?.(id);
  };
  const selectMember = (id) => {
    if (id === memberId) return;
    if (selectedMemberId === undefined) setInnerMemberId(id);
    onSelectMember?.(id);
  };

  if (data.krs.length === 0) {
    return <div className="mgr-kr"><p className="mgr-kr-empty">{l.krEmpty}</p></div>;
  }

  const selectedKr = data.krs.find((kr) => kr.id === krId) ?? data.krs[0];
  const selectedMember = data.members.find((m) => m.id === memberId) ?? data.members[0];
  const detail = data.detail ?? {};
  const trend = detail.trend ?? [];
  const maxTrend = Math.max(...trend.map((t) => t.value), 1);

  return (
    <div className="mgr-kr">
      {/* 팀 OKR — KR 선택 카드 */}
      <div className="mgr-kr-okr">
        <p className="mgr-kr-okr-label">{l.objectiveLabel}</p>
        <p className="mgr-kr-okr-title">{data.objective}</p>
        <div className="mgr-kr-cards">
          {data.krs.map((kr) => (
            <div
              key={kr.id}
              className={`mgr-kr-card${kr.id === selectedKr.id ? ' is-selected' : ''}`}
              onClick={() => selectKr(kr.id)}
            >
              <div className="mgr-kr-card-head">
                {/* id 는 실서비스에서 uuid 라 배지에 그대로 쓰면 안 된다 — label 우선. */}
                <span className="mgr-kr-card-id">{kr.label ?? kr.id}</span>
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

      {/* Key Result 히어로 — grid 로 서브텍스트와 '달성도 추이' 라벨을 같은 행에 정렬 (시안 y=421) */}
      <div className="mgr-kr-hero">
        <p className="mgr-kr-eyebrow">
          Key Result
          <span className={`mgr-kr-status is-${selectedKr.status.tone}`}>✓ {selectedKr.status.label}</span>
        </p>
        <h2 className="mgr-kr-title">{selectedKr.title} ･ {selectedKr.percent}%</h2>
        <p className="mgr-kr-subtitle">{detail.subtitle}</p>
        <p className="mgr-kr-trend-label">{l.trendLabel}</p>
        {/* 진행 바는 차트가 아니라 숫자 표현이라 로드 실패에도 계속 보인다 (§7-6 실패 처리) */}
        <div className="mgr-kr-progress">
          <div className="mgr-kr-progress-track">
            <div className="mgr-kr-progress-fill" style={{ width: `${selectedKr.percent}%` }} />
          </div>
          <div className="mgr-kr-progress-labels">
            <span>0%</span>
            <span>{l.goal}</span>
          </div>
        </div>
        {detail.loading ? (
          <div className="mgr-kr-trend-bars is-skeleton" data-testid="kr-trend-skeleton">
            {[0, 1, 2, 3, 4].map((i) => (
              <div className="mgr-kr-trend-col" key={i}>
                <span className="mgr-krm-skel mgr-krm-skel-percent" />
                <div className="mgr-kr-trend-bar" style={{ height: '40px' }} />
                <span className="mgr-krm-skel mgr-krm-skel-percent" />
              </div>
            ))}
          </div>
        ) : detail.error ? (
          <div className="mgr-kr-trend-error" data-testid="kr-trend-error" role="alert">
            <span className="mgr-kr-trend-error-text">{l.chartError}</span>
            {onRetryDetail && (
              <button type="button" className="mgr-kr-trend-retry" onClick={onRetryDetail}>
                {l.retry}
              </button>
            )}
          </div>
        ) : (
          <div className="mgr-kr-trend-bars" data-testid="kr-trend-chart">
            {trend.map((point) => (
              <div className="mgr-kr-trend-col" key={point.label}>
                <span className="mgr-kr-trend-value">{point.value}%</span>
                <div className="mgr-kr-trend-bar" style={{ height: `${Math.max((point.value / maxTrend) * 76, 8)}px` }} />
                <span className="mgr-kr-trend-date">{point.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 팀원별 기여 — 기여도 합계 StackBar 는 차트 라이브러리를 안 쓰는 정적 바라 항상 1개 */}
      <div className="mgr-kr-contrib-head">
        <p className="mgr-kr-section-title">{l.contribTitle(data.members.length)}</p>
        <p className="mgr-kr-contrib-caption">{l.contribCaption}</p>
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

      {data.members.length === 0 ? (
        <p className="mgr-kr-empty">{l.membersEmpty}</p>
      ) : (
        <div className="mgr-kr-body">
          <div className="mgr-kr-members">
            {data.members.map((member) => (
              <KrMemberCard
                key={member.id}
                member={member}
                selected={member.id === selectedMember?.id}
                onClick={() => selectMember(member.id)}
                labels={labels}
              />
            ))}
          </div>
          {selectedMember && <KrContributionDetail key={selectedMember.id} member={selectedMember} />}
        </div>
      )}
    </div>
  );
}
