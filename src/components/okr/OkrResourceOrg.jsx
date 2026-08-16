import Icon from '../shared/Icon.jsx';
import { RsStatCard, RsStatusBadge, RsStackBar, RsBullets } from './OkrResourcePieces.jsx';

/**
 * OkrResourceOrg — 내 리소스 '조직 현황' 뷰 (부문장).
 * Figma 17478:23640.
 *
 * 스탯 4(조직 인원/평균 투입/과부하 인원/미입력) → 하위 팀 카드(팀명+[팀]태그+
 * 리드, 평균%, 스택 바 + 우측 '인원/입력/평균 투입' 메타, 색상 불릿, > 화살표
 * → onOpenTeam) → '직속 구성원' 섹션(간단 멤버 행: 이름·직함·배지·%·바).
 */
export default function OkrResourceOrg({ data, icons, baseUrl = '', onOpenTeam }) {
  return (
    <div className="rsx-org">
      <p className="rsx-scope-label">{data.label}</p>
      <div className="rsx-stats">
        <RsStatCard label="조직 인원" value={`${data.stats.total}명`} tone="brand" sub={data.stats.sub} />
        <RsStatCard label="평균 투입" value={`${data.stats.avg}%`} />
        <RsStatCard label="과부하 인원" value={data.stats.overloaded} tone={data.stats.overloaded > 0 ? 'bad' : ''} />
        <RsStatCard label="미입력" value={data.stats.missing} empty={data.stats.missing === 0} />
      </div>

      {data.teams.map((team) => (
        <div className="rsx-member is-team" key={team.name}>
          <div className="rsx-member-main">
            <div className="rsx-member-head">
              <div className="rsx-member-who">
                <span className="rsx-member-name">{team.name}</span>
                <span className="rsx-tag is-sm">팀</span>
                <span className="rsx-member-role">리드 {team.lead}</span>
              </div>
              <span className="rsx-member-pct">{team.pct}%</span>
            </div>
            <div className="rsx-member-bar-row">
              <RsStackBar segments={team.segments} />
              <div className="rsx-member-meta">
                <p>인원 {team.size}</p>
                <p>입력 {team.entered}</p>
                <p>평균 투입 {team.pct}%</p>
              </div>
            </div>
            <RsBullets items={team.bullets} />
          </div>
          <button
            type="button"
            className="rsx-caret-btn is-forward"
            onClick={() => onOpenTeam?.(team)}
            aria-label={`${team.name} 상세 보기`}
          >
            <Icon src={icons.chevronDown} size={24} color="var(--text-tertiary)" baseUrl={baseUrl} />
          </button>
        </div>
      ))}

      <div className="rsx-directs">
        <p className="rsx-add-eyebrow">직속 구성원</p>
        {data.directs.map((member) => (
          <div className="rsx-member is-slim" key={member.name}>
            <div className="rsx-member-main">
              <div className="rsx-member-head">
                <div className="rsx-member-who">
                  <img className="rsx-avatar" src={member.avatar} alt={member.name} draggable={false} />
                  <span className="rsx-member-name">{member.name}</span>
                  <span className="rsx-member-role">{member.role}</span>
                  <RsStatusBadge status={member.status} />
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
