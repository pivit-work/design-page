import Skeleton from '../shared/Skeleton.jsx';
/**
 * KrMemberCard — KR 드릴다운 좌측 팀원 기여 카드.
 * Figma 17026:23299.
 *
 * member: { id, name, role, percent, avatar,
 *   initiatives: [{ title, percent, status }],
 *   initiativesLoading?, stats: { snippets, actions, jira }, alert? }
 * 선택된 카드만 흰 배경 + 상세, 나머지는 회색 바탕에 머리줄만.
 *
 * 2026-08-13 PW-93 — 차트 온디맨드 렌더링 (policy §7-6 / §7-3).
 *   Initiative 진행률 바는 **선택된 카드 1세트만** 마운트한다. 팀원이 20명이면
 *   예전엔 카드 20개가 각자 바를 그려 마운트가 누적됐다.
 *
 * 2026-10-27 — 시안 17026:24830 개정분. 비선택 카드는 **머리줄(아바타·이름·역할·%)만** 그린다.
 *   Initiative 요약·셈·경고는 고른 카드에서만 보인다. 종전 「Initiative n건 · 평균 m%」 요약 줄은 뺐다.
 *
 * 2026-09-07 PW-604 — Initiative 바를 **상태별 색**으로 그린다 (policy §7-3).
 *   done 초록 · in_progress 파랑 · todo 회색. `status` 가 안 오면 종전 단색 그대로다.
 */

/** policy §7-3 의 3단 상태. 서버 `kr_initiatives.status` 와 같은 표기다. */
const INITIATIVE_STATUSES = ['todo', 'in_progress', 'done'];

const DEFAULT_LABELS = {
  initiativeCaption: '개인 Initiative 진행률',
  initiativeEmpty: '등록된 initiative가 없습니다.',
  statSnippets: '스니핏',
  statActions: '액션 아이템',
  statJira: 'Jira',
};

export default function KrMemberCard({ member, selected = false, onClick, labels }) {
  const l = { ...DEFAULT_LABELS, ...labels };
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

      {selected && (
        <>
          <div className="mgr-krm-block">
            <p className="mgr-krm-caption">{l.initiativeCaption}</p>
            {member.initiativesLoading ? (
              <div className="mgr-krm-initiatives" data-testid="kr-initiatives-skeleton">
                {[0, 1].map((i) => (
                  <div className="mgr-krm-initiative" key={i}>
                    <div className="mgr-krm-initiative-row">
                      <Skeleton inline width={96} height={14} radius={4} />
                      <Skeleton inline width={28} height={14} radius={4} />
                    </div>
                    <div className="mgr-krm-bar" />
                  </div>
                ))}
              </div>
            ) : initiatives.length > 0 ? (
              <div className="mgr-krm-initiatives" data-testid="kr-initiative-chart">
                {initiatives.map((item) => {
                  // 모르는 값이 오면 색을 지어내지 않고 기본(단색)으로 둔다.
                  const tone = INITIATIVE_STATUSES.includes(item.status) ? item.status : null;
                  return (
                    <div className="mgr-krm-initiative" key={item.title}>
                      <div className="mgr-krm-initiative-row">
                        <span>{item.title}</span>
                        <span>{item.percent}%</span>
                      </div>
                      <div className="mgr-krm-bar">
                        <div
                          className={`mgr-krm-bar-fill${tone ? ` is-${tone}` : ''}`}
                          data-status={tone ?? undefined}
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mgr-krm-empty">{l.initiativeEmpty}</p>
            )}
          </div>

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
            <div className="mgr-krm-alert">⚠ {member.alert}</div>
          )}
        </>
      )}
    </div>
  );
}
