import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';
import { RsStatCard, RsStatusBadge, RsStackBar } from './OkrResourcePieces.jsx';

/**
 * OkrResourceTeamModal — 조직 현황의 팀 상세 모달.
 * Figma 17478:24115: 1070 폭 모달, 부문명(18 Bold) → 팀명(30 Display Bold) →
 * '조직 인원 n명' → 스탯 4 → 멤버 행(아바타·이름·직군·상태 배지·% + 스택 바).
 *
 * 사이드바(z 100) 위로 뜨도록 body 포탈. ESC/오버레이/X 로 닫는다.
 */
export default function OkrResourceTeamModal({ team, icons, baseUrl = '', onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!team) return null;

  return createPortal(
    <div className="okr-modal-overlay" onClick={onClose}>
      <div className="rsx-modal" onClick={(e) => e.stopPropagation()}>
        <button className="okr-modal-close" onClick={onClose}>
          <Icon src={icons.xClose} size={24} color="var(--text-secondary)" baseUrl={baseUrl} />
        </button>
        <div className="rsx-modal-body">
          <div className="rsx-modal-head">
            <p className="rsx-modal-org">{team.org}</p>
            <p className="rsx-modal-title">{team.name}</p>
            <p className="rsx-modal-size">조직 인원 {team.size}명</p>
          </div>
          <div className="rsx-stats">
            <RsStatCard label="조직 인원" value={`${team.size}명`} tone="brand" sub={team.sub} />
            <RsStatCard label="평균 투입" value={`${team.pct}%`} />
            <RsStatCard label="과부하 인원" value={team.overloaded} tone={team.overloaded > 0 ? 'bad' : ''} />
            <RsStatCard label="미입력" value={team.missing} />
          </div>
          <div className="rsx-modal-members">
            {team.members.map((member) => (
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
      </div>
    </div>,
    document.body,
  );
}
