/**
 * KrMemberCard — KR 드릴다운 좌측 팀원 기여 카드.
 * Figma 17026:23299.
 *
 * member: { id, name, role, percent, avatar,
 *   initiatives: [{ title, percent }], initiativeCount?, initiativeAvg?,
 *   initiativesLoading?, stats: { snippets, actions, jira }, alert? }
 * 선택된 카드만 흰 배경, 나머지는 회색 dim.
 *
 * 2026-08-13 PW-93 — 차트 온디맨드 렌더링 (policy §7-6 / §7-3).
 *   Initiative 진행률 바는 **선택된 카드 1세트만** 마운트한다. 팀원이 20명이면
 *   예전엔 카드 20개가 각자 바를 그려 마운트가 누적됐다.
 *   비선택 카드는 바 대신 "Initiative n건 · 평균 m%" 정적 요약 한 줄만 그린다.
 */

const DEFAULT_LABELS = {
  initiativeCaption: '개인 Initiative 진행률',
  initiativeSummary: (count, avg) => `Initiative ${count}건 · 평균 ${avg}%`,
  initiativeHint: '클릭 시 차트 표시',
  initiativeEmpty: '등록된 initiative가 없습니다.',
  statSnippets: '스니핏',
  statActions: '액션 아이템',
  statJira: 'Jira',
};

/** 비선택 카드의 요약값. 소비자가 안 주면 initiatives 배열에서 유도한다. */
function summarize(member) {
  const list = member.initiatives ?? [];
  const count = member.initiativeCount ?? list.length;
  if (count === 0) return { count: 0, avg: 0 };
  const avg = member.initiativeAvg ?? (
    list.length > 0
      ? Math.round(list.reduce((sum, it) => sum + (it.percent ?? 0), 0) / list.length)
      : 0
  );
  return { count, avg };
}

export default function KrMemberCard({ member, selected = false, onClick, labels }) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const { count, avg } = summarize(member);
  const initiatives = member.initiatives ?? [];

  return (
    <div className={`mgr-krm-card${selected ? ' is-selected' : ''}`} onClick={onClick}>
      <div className="mgr-krm-head">
        <img className="mgr-krm-avatar" src={member.avatar} alt={member.name} draggable={false} />
        <div className="mgr-krm-name-wrap">
          <p className="mgr-krm-name">{member.name}</p>
          <p className="mgr-krm-role">{member.role}</p>
        </div>
        <span className="mgr-krm-percent">{member.percent}%</span>
      </div>

      {selected ? (
        <>
          <p className="mgr-krm-caption">{l.initiativeCaption}</p>
          {member.initiativesLoading ? (
            <div className="mgr-krm-initiatives is-skeleton" data-testid="kr-initiatives-skeleton">
              {[0, 1].map((i) => (
                <div className="mgr-krm-initiative" key={i}>
                  <div className="mgr-krm-initiative-row">
                    <span className="mgr-krm-skel mgr-krm-skel-title" />
                    <span className="mgr-krm-skel mgr-krm-skel-percent" />
                  </div>
                  <div className="mgr-krm-bar" />
                </div>
              ))}
            </div>
          ) : initiatives.length > 0 ? (
            <div className="mgr-krm-initiatives" data-testid="kr-initiative-chart">
              {initiatives.map((item) => (
                <div className="mgr-krm-initiative" key={item.title}>
                  <div className="mgr-krm-initiative-row">
                    <span className="mgr-krm-initiative-title">{item.title}</span>
                    <span className="mgr-krm-initiative-percent">{item.percent}%</span>
                  </div>
                  <div className="mgr-krm-bar">
                    <div className="mgr-krm-bar-fill" style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mgr-krm-empty">{l.initiativeEmpty}</p>
          )}
        </>
      ) : count > 0 ? (
        <div className="mgr-krm-static" data-testid="kr-initiative-static">
          <span className="mgr-krm-static-summary">{l.initiativeSummary(count, avg)}</span>
          <span className="mgr-krm-static-hint">{l.initiativeHint}</span>
        </div>
      ) : (
        <p className="mgr-krm-empty">{l.initiativeEmpty}</p>
      )}

      <div className="mgr-krm-stats">
        <div className="mgr-krm-stat">
          <b>{member.stats.snippets}</b>
          <span>{l.statSnippets}</span>
        </div>
        <div className="mgr-krm-stat">
          <b>{member.stats.actions}</b>
          <span>{l.statActions}</span>
        </div>
        <div className="mgr-krm-stat">
          <b>{member.stats.jira}</b>
          <span>{l.statJira}</span>
        </div>
      </div>

      {member.alert && (
        <div className="mgr-krm-alert">▲ {member.alert}</div>
      )}
    </div>
  );
}
