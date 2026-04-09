import { useState, useEffect } from 'react';
import Icon from '../shared/Icon.jsx';
import { MEMBER_STATUSES } from './constants.js';

const DEFAULT_PROFILE = {
  title: '사원',
  dept: '경영지원본부',
  bio: '열정적으로 업무에 임하고 있습니다.',
  skills: '기획 • 매니징',
  contacts: '@user • user@pivit.com',
  links: ['https://pivit.com'],
  teamMembers: [],
};

const PROFILE_IMAGE = 'https://pivit-work.github.io/design-page/man.png';

export default function ProfileModal({ member, onClose, statIcons, baseUrl = '', renderAvatar }) {
  const [splineReady, setSplineReady] = useState(false);
  const [splineActive, setSplineActive] = useState(false);

  useEffect(() => {
    if (!member) { setSplineReady(false); setSplineActive(false); }
  }, [member]);

  if (!member) return null;
  const profile = member.profile || DEFAULT_PROFILE;

  return (
    <>
    <div className="modal-overlay" onClick={onClose} />
    <div className="modal-scroll-wrap" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <button className="modal-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {renderAvatar ? renderAvatar(member) : (
            <div
              className={`modal-spline-wrap ${splineActive ? 'spline-active' : ''}`}
              onClick={() => setSplineActive(true)}
              onMouseLeave={() => setSplineActive(false)}
            >
              <iframe src={`${baseUrl}spline-profile.html?img=${encodeURIComponent(PROFILE_IMAGE)}`} sandbox="allow-scripts" frameBorder="0" width="100%" height="100%" title="Spline 3D" style={{ border: 'none', opacity: splineReady ? 1 : 0, transition: 'opacity 0.5s ease' }} onLoad={() => setTimeout(() => setSplineReady(true), 1500)} />
            </div>
          )}
          <div className="modal-name">{member.name}</div>
          <div className="modal-title">{profile.title} · {profile.dept}</div>
          <div className="modal-bio">{profile.bio}</div>
          <span className="modal-status-badge">{(MEMBER_STATUSES[member.status] || MEMBER_STATUSES.working).label}</span>
        </div>

        {/* Stats Row */}
        {statIcons && (
          <div className="modal-stats">
            <div className="modal-stat">
              <div className="modal-stat-icon modal-stat-okr">
                <img src={statIcons.okr} alt="OKR" />
              </div>
              <div className="modal-stat-label">OKR</div>
              <div className="modal-stat-value">70%</div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-icon modal-stat-hc">
                <img src={statIcons.hc} alt="HC" />
              </div>
              <div className="modal-stat-label">HC</div>
              <div className="modal-stat-value">50%</div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-icon modal-stat-1on1">
                <img src={statIcons.oneOnOne} alt="1 on 1" />
              </div>
              <div className="modal-stat-label">1 on 1</div>
              <div className="modal-stat-value">완료</div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-icon modal-stat-hours">
                <img src={statIcons.workHours} alt="업무시간" />
              </div>
              <div className="modal-stat-label">업무시간</div>
              <div className="modal-stat-value">10-7</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {(() => {
          const isDisabled = member.status === 'resigned' || member.status === 'leave';
          return (
            <div className={`modal-actions ${isDisabled ? 'modal-actions-disabled' : ''}`}>
              <button className="modal-btn-feedback" disabled={isDisabled}>
                <Icon src="/icons-solid/send-03.svg" size={20} color="white" baseUrl={baseUrl} />
                피드백주기
              </button>
              <button className="modal-btn-meeting" disabled={isDisabled}>
                <Icon src="/icons-solid/calendar-heart-02.svg" size={20} color="#21a67a" baseUrl={baseUrl} />
                미팅잡기
              </button>
            </div>
          );
        })()}

        {/* Info Sections */}
        <div className="modal-info-sections">
          <div className="modal-info-section">
            <div className="modal-info-label">스킬</div>
            <div className="modal-info-content">{profile.skills}</div>
          </div>
          <div className="modal-info-section">
            <div className="modal-info-label">연락처</div>
            <div className="modal-info-content">{profile.contacts}</div>
          </div>
          <div className="modal-info-section">
            <div className="modal-info-label">링크</div>
            <div className="modal-info-content">
              {profile.links.map((link, i) => (
                <div key={i} className="modal-info-link">{link}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Team Members */}
        {profile.teamMembers && profile.teamMembers.length > 0 && (
          <div className="modal-team">
            <div className="modal-team-header">
              <span className="modal-team-title">직속팀원</span>
              <span className="modal-team-count">{profile.teamMembers.length}명</span>
            </div>
            <div className="modal-team-grid">
              {profile.teamMembers.map((tm, i) => (
                <div key={i} className="modal-team-member">
                  <div className="modal-team-avatar-wrap">
                    <img src={tm.avatar} alt="" className="modal-team-avatar" />
                    <span className={`modal-team-dot ${tm.online ? 'online' : 'offline'}`} />
                  </div>
                  <div className="modal-team-name">{tm.name}</div>
                  <div className="modal-team-role">{tm.role}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer">
          <span className="modal-footer-text">Get Communication with</span>
          <img src={`${baseUrl}logo.svg`} alt="Pivit" className="modal-footer-logo" />
        </div>
      </div>
    </div>
    </>
  );
}

export { DEFAULT_PROFILE };
