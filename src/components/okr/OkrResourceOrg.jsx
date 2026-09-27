import Icon from '../shared/Icon.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import { RsStatCard, RsStatusBadge, RsStackBar, RsBullets } from './OkrResourcePieces.jsx';
import rowKey from './rowKey.js';
import { OKR_RESOURCE_DEFAULT_LABELS } from './okrResourceLabels.js';

/**
 * OkrResourceOrg — 내 리소스 '조직 현황' 뷰 (부문장).
 * Figma 17478:23640.
 *
 * 스탯 4(조직 인원/평균 투입/과부하 인원/미입력) → 하위 팀 카드(팀명+[팀]태그+
 * 리드, 평균%, 스택 바 + 우측 '인원/입력/평균 투입' 메타, 색상 불릿, > 화살표
 * → onOpenTeam) → '직속 구성원' 섹션(간단 멤버 행: 이름·직함·배지·%·바).
 */
export default function OkrResourceOrg({ data, icons, baseUrl = '', onOpenTeam, labels: L = OKR_RESOURCE_DEFAULT_LABELS }) {
  const O = L.org;
  return (
    <div className="rsx-org">
      <p className="rsx-scope-label">{data.label}</p>
      <div className="rsx-stats">
        <RsStatCard label={O.total} value={L.people(data.stats.total)} tone="brand" sub={data.stats.sub} />
        <RsStatCard label={O.avg} value={`${data.stats.avg}%`} />
        <RsStatCard label={O.overloaded} value={data.stats.overloaded} tone={data.stats.overloaded > 0 ? 'bad' : ''} />
        <RsStatCard label={O.missing} value={data.stats.missing} empty={data.stats.missing === 0} />
      </div>

      {data.teams.map((team, i) => (
        <div className="rsx-member is-team" key={rowKey(team, i)}>
          <div className="rsx-member-main">
            <div className="rsx-member-head">
              <div className="rsx-member-who">
                <span className="rsx-member-name">{team.name}</span>
                <StatusBadge className="rsx-tag is-sm">{O.teamTag}</StatusBadge>
                <span className="rsx-member-role">{O.lead(team.lead)}</span>
              </div>
              <span className="rsx-member-pct">{team.pct}%</span>
            </div>
            <div className="rsx-member-bar-row">
              <RsStackBar segments={team.segments} />
              <div className="rsx-member-meta">
                <p>{O.size(team.size)}</p>
                <p>{O.entered(team.entered)}</p>
                <p>{O.avgMeta(team.pct)}</p>
              </div>
            </div>
            <RsBullets items={team.bullets} />
          </div>
          <button
            type="button"
            className="rsx-caret-btn is-forward"
            onClick={() => onOpenTeam?.(team)}
            aria-label={O.openTeamAria(team.name)}
          >
            <Icon src={icons.chevronDown} size={24} color="var(--text-tertiary)" baseUrl={baseUrl} />
          </button>
        </div>
      ))}

      <div className="rsx-directs">
        <p className="rsx-add-eyebrow">{O.directs}</p>
        {data.directs.map((member, i) => (
          <div className="rsx-member is-slim" key={rowKey(member, i)}>
            <div className="rsx-member-main">
              <div className="rsx-member-head">
                <div className="rsx-member-who">
                  <img className="rsx-avatar" src={member.avatar} alt={member.name} draggable={false} />
                  <span className="rsx-member-name">{member.name}</span>
                  <span className="rsx-member-role">{member.role}</span>
                  <RsStatusBadge status={member.status} labels={L} />
                </div>
                <span className="rsx-member-pct">{member.pct}%</span>
              </div>
              <div className="rsx-member-bar-row">
                <RsStackBar segments={member.segments} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
