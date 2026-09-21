import ModalShell from '../shared/ModalShell.jsx';
import { RsStatCard, RsStatusBadge, RsStackBar } from './OkrResourcePieces.jsx';
import rowKey from './rowKey.js';

/**
 * OkrResourceTeamModal — 조직 현황의 팀 상세 모달.
 * Figma 17478:24115: 1070 폭 모달, 부문명(18 Bold) → 팀명(30 Display Bold) →
 * '조직 인원 n명' → 스탯 4 → 멤버 행(아바타·이름·직군·상태 배지·% + 스택 바).
 *
 * 껍데기는 공용 창 틀(ModalShell · PW-836) — 사이드바(z 100) 위로 뜨도록 틀이 body 포털로
 * 그리고, ESC/오버레이/X 로 닫는다. 읽기만 하는 창이라 발(footer)이 없다. 부문명은 제목 위
 * 머리글(eyebrow)로 제목 칸 안에 둔다.
 */
export default function OkrResourceTeamModal({ team, onClose }) {
  if (!team) return null;

  return (
    <ModalShell
      title={(
        <>
          <span className="rsx-modal-org">{team.org}</span>
          {team.name}
        </>
      )}
      description={`조직 인원 ${team.size}명`}
      titleId="rsx-modal-title"
      onClose={onClose}
      zIndex={1000}
      className="okr-shell rsx-modal"
      bodyClassName="rsx-modal-body"
      footer={null}
    >
      <div className="rsx-stats">
        <RsStatCard label="조직 인원" value={`${team.size}명`} tone="brand" sub={team.sub} />
        <RsStatCard label="평균 투입" value={`${team.pct}%`} />
        <RsStatCard label="과부하 인원" value={team.overloaded} tone={team.overloaded > 0 ? 'bad' : ''} />
        <RsStatCard label="미입력" value={team.missing} />
      </div>
      <div className="rsx-modal-members">
        {team.members.map((member, i) => (
          <div className="rsx-member is-slim" key={rowKey(member, i)}>
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
    </ModalShell>
  );
}
